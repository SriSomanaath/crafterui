"use client"

// A continuous strip of work viewed through a thick optical element.
//
// The strip is unremarkable on its own: panels of equal height, each holding
// its source aspect, cycling so there is no end to arrive at. The interest is
// in the second stage. The strip is never rasterised to the display - it goes
// to an offscreen texture, and a fullscreen triangle pair samples that texture
// back through an optic that draws the image inward, separates it into colour
// channels toward its perimeter, and adds a bright core, a modulated ring and a
// perimeter that undulates as the strip travels behind it.
//
// Two stages, one canvas, no scene graph. Every term the optic needs is a
// function of radial position, so it fits in a page of shader code.
import * as React from "react"

import { cn } from "@/lib/utils"

export interface GlassLensItem {
  /** Cover art. Cross-origin sources must send CORS headers. */
  image: string
  /** Shown while this panel is centred. */
  title: string
  /** The line under the title. */
  caption?: string
}

export interface GlassLensCarouselProps
  extends Omit<React.ComponentPropsWithoutRef<"section">, "children"> {
  items: GlassLensItem[]
  /** Wordmark in the top-left. Omit to drop it. @default undefined */
  brand?: string
  /** Panel height, as a fraction of the stage. @default 0.62 */
  panelHeight?: number
  /** Space between panels, in px. @default 12 */
  gap?: number
  /** Panel corner radius, in px. @default 6 */
  radius?: number
  /** The lens ring and aura colour. @default "#009dff" */
  tint?: string
  /** Click a panel to centre and enlarge it. @default true */
  focusable?: boolean
  /** Label on the focused panel's dismiss control. @default "Close" */
  closeLabel?: string
  className?: string
}

/* Motion characteristics. The strip is deliberately weighty; a low convergence
   rate is most of what makes the optic register as a physical thickness rather
   than a filter applied over an ordinary carousel. */
const EASE = 0.09 // fraction of the remaining distance closed each frame
const SNAP_EASE = 0.05 // ... and once it is settling onto a panel
const DRAG_EASE = 0.24 // ... and while a finger or cursor is pulling it
const WHEEL = 1.4
const DRAG = 1.6
const FRICTION = 0.865 // flick decay after a drag release
const SNAP_IDLE = 120 // ms of quiet input before the row settles on a panel
const CLICK_SLOP = 6 // px of travel that still counts as a click

/* Panels contract as travel speed rises, which suggests resistance acting on
   something with mass. The threshold below is the per-frame speed at which the
   full contraction is reached. */
const SHRINK_MAX = 60
const SHRINK_ATTACK = 0.25
const SHRINK_DECAY = 0.06

/* Expanded view: the chosen panel enlarges and remains, the others withdraw
   from the centre outward, and the optic dissolves as they leave. */
const FOCUS_EASE = 0.085
const FOCUS_STAGGER = 0.055
const FOCUS_DROP = 1.4 // how far a panel falls, in stage heights
const FOCUS_GROW = 0.18

/* Introduction: panels rise into place from beneath at reduced size, beginning
   with the pair nearest the centre. */
const ENTRY_SECONDS = 1.15
const ENTRY_STAGGER = 0.07
const ENTRY_START = 0.22 // height they start at, of their final height

/** Interval, in frames, between palette reads. Resolving a token forces a style
    recalculation, and the palette only changes when someone toggles the theme. */
const THEME_EVERY = 20

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
/** Fifth-order ease-out. The extended tail lets a movement settle rather than
    terminate abruptly. */
const outQuint = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 5)

const PANEL_VERT = /* glsl */ `#version 300 es
in vec2 aPos;
uniform vec4 uRect;   // centre.xy, size.xy - px, origin at the stage centre
uniform vec2 uRes;
out vec2 vUv;
out vec2 vLocal;      // px from the panel centre, for the corner cut
void main() {
  vUv = vec2(aPos.x, 1.0 - aPos.y);
  vLocal = (aPos - 0.5) * uRect.zw;
  gl_Position = vec4((uRect.xy + vLocal) / (uRes * 0.5), 0.0, 1.0);
}`

const PANEL_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vLocal;
uniform sampler2D uTex;
uniform vec4 uRect;
uniform vec3 uBg;
uniform float uFade;    // still loading -> the panel is only its own shadow
uniform float uRadius;
out vec4 fragColor;

float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

void main() {
  // Corners are clipped rather than alpha-blended. The strip is opaque and the
  // surface behind it is the identical colour, so there is nothing to blend.
  float d = sdRoundBox(vLocal, uRect.zw * 0.5, min(uRadius, min(uRect.z, uRect.w) * 0.5));
  if (d > 0.0) discard;
  fragColor = vec4(mix(uBg, texture(uTex, vUv).rgb, uFade), 1.0);
}`

const LENS_VERT = /* glsl */ `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos;
  gl_Position = vec4(aPos * 2.0 - 1.0, 0.0, 1.0);
}`

/* The optic. A single elliptical region, rotated away from vertical and
   extending past the frame vertically, so it presents as a diagonal band across
   the view rather than a bubble within it. The normalised radius runs from 0 at
   the centre to 1 at the boundary, and every term that follows - perimeter
   undulation, channel separation, core, ring, boundary highlight - is a function
   of that one quantity. Beyond the boundary the strip is passed through
   unaltered, which is what gives the element a locatable edge.

   A single scalar attenuates the entire effect, letting the introduction bring
   it up and the expanded view take it away without a second code path. */
const LENS_FRAG = /* glsl */ `#version 300 es
precision highp float;
#define SAMPLES 12

in vec2 vUv;
uniform sampler2D uTex;
uniform float uAspect;
uniform float uTime;
uniform float uStrength;
uniform vec3 uTint;
out vec4 fragColor;

const float SIZE_X = 0.565;     // half-width, in screen-height units
const float SIZE_Y = 1.0;       // half-height - past the frame, so it never closes
const float ROTATION = 1.13446; // 65 degrees
const float DISPERSION = 11.0;
const float GLOW = 4.2;
const float WHITE_GLOW = 0.24;
const float NOVA_SIZE = 12.0;
const float RING = 6.0;
const float RING_RADIUS = 0.49;
const float RING_WIDTH = 0.014;
const float SHIMMER_FREQ = 12.0;
const float SHIMMER_SPEED = 3.5;
const float SHIMMER_DEPTH = 0.12;
const float RIM_START = 0.578;
const float RIM_TANGENTIAL = 0.6;
const float RIM_FREQ_1 = 2.0;
const float RIM_FREQ_2 = 1.0;
const float RIM_LINE = 1.4;
const float RIM_LINE_POS = 0.488;
const float RIM_LINE_WIDTH = 0.003;

void main() {
  vec3 base = texture(uTex, vUv).rgb;

  // Converted to local coordinates, corrected for aspect, then rotated, so the
  // region and all of its internal structure turn as one.
  vec2 offset = vUv - 0.5;
  vec2 p = vec2(offset.x * uAspect, offset.y);
  float ca = cos(ROTATION), sa = sin(ROTATION);
  p = mat2(ca, -sa, sa, ca) * p;

  float nd = length(p / vec2(SIZE_X, SIZE_Y));
  if (nd > 1.0 || uStrength < 0.001) {
    fragColor = vec4(base, 1.0);
    return;
  }
  float shape = clamp(nd, 0.0, 1.0);

  vec2 radial = normalize(offset + 1e-6);
  vec2 tangent = vec2(-radial.y, radial.x);
  float angle = atan(p.y, p.x);

  // Perimeter undulation, applied tangentially so the strip travels along the
  // boundary rather than being displaced outward through it.
  float rim = smoothstep(RIM_START, 1.0, nd);
  float wave = sin(angle * RIM_FREQ_1) * 0.55 + sin(angle * RIM_FREQ_2) * 0.25;
  vec2 baseUV = 0.5 + offset
    + tangent * wave * rim * (SIZE_X + SIZE_Y) * 0.5 * RIM_TANGENTIAL * uStrength;

  // Channel separation: a single run of taps along the radial direction, each
  // weighted per channel and normalised afterwards, so the interior stays
  // neutral and only the perimeter resolves into colour.
  vec2 dispDir = offset * DISPERSION * 0.004 * smoothstep(0.55, 1.0, nd) * uStrength;
  vec3 col = vec3(0.0);
  vec3 weight = vec3(0.0);
  for (int i = 0; i < SAMPLES; i++) {
    float t = float(i) / float(SAMPLES - 1);
    vec3 w = vec3(
      exp(-pow((t - 0.0) / 0.38, 2.0)),
      exp(-pow((t - 0.5) / 0.38, 2.0)),
      exp(-pow((t - 1.0) / 0.38, 2.0))
    );
    col += texture(uTex, baseUV + dispDir * (t - 0.5)).rgb * w;
    weight += w;
  }
  col /= max(weight, vec3(0.001));

  // Slight darkening toward the interior - the only indication that the centre
  // looks through more material than the boundary does.
  col *= mix(0.91, 1.0, smoothstep(0.0, 0.38, shape));

  float r2 = shape * shape * 0.25;
  float gs = max(NOVA_SIZE * GLOW * 0.003, 0.004);
  float nova = (exp(-r2 / gs) + exp(-r2 / (gs * 7.0)) * 0.18)
             * WHITE_GLOW * (GLOW / 17.0) * 1.15;
  col += vec3(nova * uStrength);

  float dC = shape * 0.5;
  float ring = exp(-pow((dC - RING_RADIUS) / RING_WIDTH, 2.0)) * RING * (GLOW / 17.0) * 1.8;
  ring *= sin(angle * SHIMMER_FREQ + uTime * SHIMMER_SPEED) * SHIMMER_DEPTH + (1.0 - SHIMMER_DEPTH);
  float aura = exp(-pow((dC - RING_RADIUS) / (RING_WIDTH * 6.0), 2.0)) * 0.28 * RING * (GLOW / 17.0);
  col += uTint * (ring + aura) * uStrength;
  col += vec3(exp(-pow((dC - RIM_LINE_POS) / RIM_LINE_WIDTH, 2.0)) * RIM_LINE * uStrength);

  fragColor = vec4(mix(base, col, smoothstep(1.0, 0.93, nd)), 1.0);
}`

function build(gl: WebGL2RenderingContext, vert: string, frag: string) {
  const program = gl.createProgram()
  if (!program) return null
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vert],
    [gl.FRAGMENT_SHADER, frag],
  ] as const) {
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader))
      return null
    }
    gl.attachShader(program, shader)
    gl.deleteShader(shader)
  }
  gl.bindAttribLocation(program, 0, "aPos")
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program))
    return null
  }
  return program
}

/** Cached uniform handles. getUniformLocation performs a string lookup on every
    call, and this sits inside the per-frame path. */
function uniforms(gl: WebGL2RenderingContext, program: WebGLProgram) {
  const cache = new Map<string, WebGLUniformLocation | null>()
  return (name: string) => {
    let loc = cache.get(name)
    if (loc === undefined) {
      loc = gl.getUniformLocation(program, name)
      cache.set(name, loc)
    }
    return loc
  }
}

/** Resolves any CSS colour to 0-1 RGB by asking the browser instead of parsing
    it. Theme tokens here are written in oklch, and naive comma-splitting of the
    computed string yields a confidently incorrect near-black. */
function colorReader() {
  const probe = document.createElement("canvas")
  probe.width = probe.height = 1
  const ctx = probe.getContext("2d", { willReadFrequently: true })
  return (css: string): [number, number, number] => {
    if (!ctx) return [0, 0, 0]
    ctx.fillStyle = "#000"
    ctx.fillStyle = css // left at black if the browser cannot parse it
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
    return [r / 255, g / 255, b / 255]
  }
}

type Panel = { texture: WebGLTexture | null; aspect: number; fade: number }

export function GlassLensCarousel({
  items,
  brand,
  panelHeight = 0.62,
  gap = 12,
  radius = 6,
  tint = "#009dff",
  focusable = true,
  closeLabel = "Close",
  className,
  ...props
}: GlassLensCarouselProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [active, setActive] = React.useState(0)
  const [focused, setFocused] = React.useState<number | null>(null)
  const [reduced, setReduced] = React.useState(false)
  const [supported, setSupported] = React.useState(true)

  // The frame loop reads these. They are refs so that changing a label or a
  // tint does not tear the loop down and drop the row back to its entry state.
  const settings = React.useRef({ panelHeight, gap, radius, tint, focusable })
  settings.current = { panelHeight, gap, radius, tint, focusable }
  const focusRef = React.useRef<number | null>(null)
  focusRef.current = focused
  /** Populated by the render loop so keyboard input drives the same travel the
      wheel does. */
  const step = React.useRef<(by: number) => void>(() => {})

  const count = items.length
  // The loop owns the textures, so it rebuilds when the pictures change - and
  // must not when only a caption does.
  const sources = items.map((item) => item.image).join(" ")

  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const read = () => setReduced(query.matches)
    read()
    query.addEventListener("change", read)
    return () => query.removeEventListener("change", read)
  }, [])

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !count) return
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false })
    if (!gl) {
      setSupported(false)
      return
    }

    const readColor = colorReader()
    const panelProgram = build(gl, PANEL_VERT, PANEL_FRAG)
    const lensProgram = build(gl, LENS_VERT, LENS_FRAG)
    if (!panelProgram || !lensProgram) return
    const panelU = uniforms(gl, panelProgram)
    const lensU = uniforms(gl, lensProgram)

    const quad = gl.createVertexArray()
    gl.bindVertexArray(quad)
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]),
      gl.STATIC_DRAW
    )
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

    // The strip is rendered here at device resolution. Allocating this in CSS
    // pixels and letting the optic magnify it is the difference between a clear
    // element and a soft one.
    const target = gl.createFramebuffer()
    const rowTexture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, rowTexture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.bindFramebuffer(gl.FRAMEBUFFER, target)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rowTexture, 0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    const panels: Panel[] = items.map(() => ({ texture: null, aspect: 1.5, fade: 0 }))
    const images = items.map((item, i) => {
      const image = new Image()
      image.crossOrigin = "anonymous"
      image.decoding = "async"
      image.onload = () => {
        const texture = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.generateMipmap(gl.TEXTURE_2D)
        panels[i].texture = texture
        panels[i].aspect = image.naturalWidth / Math.max(image.naturalHeight, 1)
      }
      image.src = item.image
      return image
    })

    // --- state ------------------------------------------------------------
    let width = 0
    let height = 0
    let scroll = 0
    let goal = 0
    let velocity = 0
    let energy = 0 // smoothed scroll activity, 0..1
    let lastInput = 0
    let snapped = true
    let entry = 0
    let focus = 0
    let focusIndex = 0
    let clock = 0
    let previous = 0
    let ticks = 0
    let frame = 0
    let background: [number, number, number] = [0, 0, 0]
    let tintRgb: [number, number, number] = [0, 0.6, 1]

    const widths = new Float32Array(count)
    const centers = new Float32Array(count)
    const screenX = new Float32Array(count)
    let total = 1
    let panelPx = 1

    /** Each width derives from its own source aspect, so nothing is cropped. */
    const measure = () => {
      panelPx = height * settings.current.panelHeight
      let x = 0
      for (let i = 0; i < count; i++) {
        widths[i] = panelPx * panels[i].aspect
        centers[i] = x + widths[i] / 2
        x += widths[i] + settings.current.gap
      }
      total = Math.max(x, 1)
    }

    /** Strip offset that places a given panel at centre, resolved along whichever
        direction round the cycle is shorter, so settling never unwinds the whole
        sequence. */
    const centerFor = (i: number, from: number) =>
      centers[i] + Math.round((from - centers[i]) / total) * total

    const nearest = (from: number) => {
      let best = 0
      let bestGap = Infinity
      for (let i = 0; i < count; i++) {
        const distance = Math.abs(centerFor(i, from) - from)
        if (distance < bestGap) {
          bestGap = distance
          best = i
        }
      }
      return best
    }

    const resize = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (!w || !h) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = w
      height = h
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      gl.bindTexture(gl.TEXTURE_2D, rowTexture)
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0,
        gl.RGBA, gl.UNSIGNED_BYTE, null
      )
      measure()
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    // --- input ------------------------------------------------------------
    const push = (delta: number) => {
      goal += delta
      lastInput = performance.now()
      snapped = false
    }
    step.current = (by: number) => {
      if (focusRef.current !== null) return
      const from = nearest(goal)
      const next = ((from + by) % count + count) % count
      goal = centerFor(next, goal)
      lastInput = performance.now()
      snapped = true
      velocity = 0
    }

    const onWheel = (event: WheelEvent) => {
      if (focusRef.current !== null) return
      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      event.preventDefault()
      push(delta * WHEEL)
      velocity = 0
    }
    canvas.addEventListener("wheel", onWheel, { passive: false })

    let dragFrom: number | null = null
    let dragTravel = 0
    let dragLast = 0
    let dragStep = 0
    let dragging = false

    const onDown = (event: PointerEvent) => {
      if (focusRef.current !== null) return
      dragFrom = event.clientX
      dragTravel = 0
      dragStep = 0
      dragging = true
      dragLast = performance.now()
      velocity = 0
      canvas.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => {
      if (dragFrom === null) return
      // Touch input tracks one-to-one; pointer input carries the weighted rate.
      const travel = dragFrom - event.clientX
      dragStep = travel * (event.pointerType === "touch" ? 1 : DRAG)
      dragTravel += Math.abs(travel)
      dragFrom = event.clientX
      dragLast = performance.now()
      push(dragStep)
    }
    const onUp = (event: PointerEvent) => {
      if (dragFrom === null) return
      const slop = event.pointerType === "touch" ? 12 : CLICK_SLOP
      const wasClick = dragTravel < slop
      dragFrom = null
      dragging = false
      // A pointer at rest before release was positioning the strip rather than
      // launching it, so momentum is granted only to movement still in progress.
      if (!wasClick && performance.now() - dragLast < 90) velocity = dragStep
      if (wasClick && settings.current.focusable) {
        const hit = pick(event.clientX)
        if (hit >= 0) {
          goal = centerFor(hit, goal)
          setFocused(hit)
        }
      }
    }

    /** Identifies the panel beneath a client x-coordinate. Positions are taken
        from the frame currently on screen, so this queries what is displayed
        rather than recomputing the layout. */
    const pick = (clientX: number) => {
      const x = clientX - canvas.getBoundingClientRect().left - width / 2
      const scale = 1 - 0.25 * energy
      for (let i = 0; i < count; i++) {
        if (Math.abs(x - screenX[i]) <= (widths[i] * scale) / 2) return i
      }
      return -1
    }

    canvas.addEventListener("pointerdown", onDown)
    canvas.addEventListener("pointermove", onMove)
    canvas.addEventListener("pointerup", onUp)
    canvas.addEventListener("pointercancel", onUp)

    // --- frame ------------------------------------------------------------
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw)
      if (!width || !height) return
      const dt = previous ? Math.min((now - previous) / 1000, 1 / 20) : 0
      previous = now
      clock += dt
      measure()

      if (ticks++ % THEME_EVERY === 0) {
        background = readColor(getComputedStyle(canvas).backgroundColor)
        tintRgb = readColor(settings.current.tint)
      }

      // Runs a single time on an independent clock, and only once there is
      // artwork to show - the sequence is wasted on empty rectangles.
      if (panels.some((panel) => panel.texture)) {
        entry = reduced ? 1 : Math.min(1, entry + dt / ENTRY_SECONDS)
      }

      // The expanded view supersedes everything else: input is suspended, the
      // chosen panel holds position and enlarges, the rest withdraw.
      const wanted = focusRef.current
      if (wanted !== null) focusIndex = wanted
      const focusGoal = wanted === null ? 0 : 1
      focus = reduced ? focusGoal : focus + (focusGoal - focus) * FOCUS_EASE
      if (Math.abs(focus - focusGoal) < 0.002) focus = focusGoal

      if (Math.abs(velocity) > 0.4) {
        goal += velocity
        velocity *= FRICTION
        lastInput = now
        snapped = false
      } else velocity = 0

      // Settling is triggered by elapsed quiet rather than by remaining
      // distance. A slow scroll and a fast flick both fall silent identically,
      // whereas any speed threshold would treat them differently.
      if (!snapped && !dragging && now - lastInput > SNAP_IDLE && !velocity) {
        goal = centerFor(nearest(goal), goal)
        snapped = true
      }

      const before = scroll
      const ease = dragging ? DRAG_EASE : snapped ? SNAP_EASE : EASE
      scroll += (goal - scroll) * (reduced ? 1 : ease)
      const speed = Math.abs(scroll - before)
      const want = clamp(speed / SHRINK_MAX, 0, 1)
      energy += (want - energy) * (want > energy ? SHRINK_ATTACK : SHRINK_DECAY)

      const near = nearest(scroll)
      setActive((prev) => (prev === near ? prev : near))

      // --- pass one: the row, into a texture -----------------------------
      gl.bindFramebuffer(gl.FRAMEBUFFER, target)
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clearColor(background[0], background[1], background[2], 1)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(panelProgram)
      gl.bindVertexArray(quad)
      gl.uniform2f(panelU("uRes"), width, height)
      gl.uniform3fv(panelU("uBg"), background)
      gl.uniform1i(panelU("uTex"), 0)
      gl.uniform1f(panelU("uRadius"), settings.current.radius)
      gl.activeTexture(gl.TEXTURE0)

      const shrink = 1 - 0.25 * energy
      const half = width / 2
      const copies = Math.ceil(width / total) + 2

      for (let i = 0; i < count; i++) {
        const panel = panels[i]
        panel.fade = Math.min(1, panel.fade + (panel.texture ? dt * 5 : 0))
        screenX[i] = Infinity

        // Folded into a window centred on the stage, then stepped outward on
        // both sides - the sequence has no terminus, so a panel can appear twice.
        const x = (((centers[i] - scroll) % total) + total * 1.5) % total - total / 2
        const rank = Math.abs(i - near)
        const grow = outQuint(
          clamp(entry * (1 + ENTRY_STAGGER * count) - rank * ENTRY_STAGGER, 0, 1)
        )
        const scale = lerp(ENTRY_START, 1, grow) * shrink
        let w = widths[i] * scale
        let h = panelPx * scale
        let y = (1 - grow) * height * 0.55

        if (focus > 0) {
          if (i === focusIndex) {
            w *= 1 + FOCUS_GROW * focus
            h *= 1 + FOCUS_GROW * focus
          } else {
            // Offset from the centre outward: adjacent panels leave first, the
            // extremes last.
            const fall = outQuint(
              clamp(
                focus * (1 + FOCUS_STAGGER * count) -
                  Math.abs(i - focusIndex) * FOCUS_STAGGER,
                0,
                1
              )
            )
            y -= fall * height * FOCUS_DROP
          }
        }

        for (let c = 0; c < copies; c++) {
          const px = x + (c - Math.floor(copies / 2)) * total
          if (px < -half - w || px > half + w) continue
          if (Math.abs(px) < Math.abs(screenX[i])) screenX[i] = px
          if (!panel.texture) continue
          gl.bindTexture(gl.TEXTURE_2D, panel.texture)
          gl.uniform4f(panelU("uRect"), px, y, w, h)
          gl.uniform1f(panelU("uFade"), panel.fade)
          gl.drawArrays(gl.TRIANGLES, 0, 6)
        }
      }

      // --- pass two: read it back through the glass ----------------------
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.useProgram(lensProgram)
      gl.bindVertexArray(quad)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, rowTexture)
      gl.uniform1i(lensU("uTex"), 0)
      gl.uniform1f(lensU("uAspect"), width / height)
      gl.uniform1f(lensU("uTime"), reduced ? 0 : clock)
      gl.uniform1f(lensU("uStrength"), outQuint(entry) * (1 - focus))
      gl.uniform3fv(lensU("uTint"), tintRgb)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    }
    frame = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      canvas.removeEventListener("wheel", onWheel)
      canvas.removeEventListener("pointerdown", onDown)
      canvas.removeEventListener("pointermove", onMove)
      canvas.removeEventListener("pointerup", onUp)
      canvas.removeEventListener("pointercancel", onUp)
      for (const image of images) image.onload = null
      for (const panel of panels) if (panel.texture) gl.deleteTexture(panel.texture)
      gl.deleteTexture(rowTexture)
      gl.deleteFramebuffer(target)
      gl.deleteBuffer(buffer)
      gl.deleteVertexArray(quad)
      gl.deleteProgram(panelProgram)
      gl.deleteProgram(lensProgram)
    }
    // `sources` stands in for `items` - see the note beside it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources, count, reduced])

  const item = items[active]
  const open = focused !== null

  // No WebGL2 - a blank rectangle is the one outcome worse than no effect. The
  // row without its glass is still the row: a native snap scroller of the same
  // pictures, in the same order.
  if (!supported) {
    return (
      <section
        aria-roledescription="carousel"
        aria-label={brand ?? "Gallery"}
        className={cn("bg-background text-foreground relative h-full w-full", className)}
        {...props}
      >
        <ul className="flex h-full snap-x snap-mandatory items-center gap-3 overflow-x-auto px-[5%]">
          {items.map((entry) => (
            <li key={entry.image} className="h-[58%] shrink-0 snap-center">
              <img
                src={entry.image}
                alt={entry.title}
                className="bg-muted h-full w-auto rounded-lg object-cover"
              />
            </li>
          ))}
        </ul>
      </section>
    )
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label={brand ?? "Gallery"}
      className={cn(
        "bg-background text-foreground relative h-full w-full overflow-hidden select-none",
        className
      )}
      {...props}
    >
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="listbox"
        aria-label={brand ?? "Gallery"}
        aria-activedescendant={`glass-lens-${active}`}
        className={cn(
          "bg-background focus-visible:outline-foreground absolute inset-0 h-full w-full touch-pan-y outline-none focus-visible:outline-2 focus-visible:-outline-offset-4",
          open ? "cursor-default" : "cursor-grab active:cursor-grabbing"
        )}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") step.current(1)
          else if (event.key === "ArrowLeft") step.current(-1)
          else if (event.key === "Escape") setFocused(null)
          else if (focusable && (event.key === "Enter" || event.key === " ")) {
            setFocused((prev) => (prev === null ? active : null))
          } else return
          event.preventDefault()
        }}
      />

      {/* Everything visible is painted into the canvas, so assistive technology
          and keyboard users receive this equivalent instead: the same entries in
          the same sequence. */}
      <ul className="sr-only">
        {items.map((entry, i) => (
          <li key={entry.image} id={`glass-lens-${i}`} role="option" aria-selected={i === active}>
            {entry.title}
            {entry.caption ? `. ${entry.caption}` : ""}
          </li>
        ))}
      </ul>

      {brand ? (
        <div className="pointer-events-none absolute top-[6%] left-[5%] text-sm font-medium tracking-tight">
          {brand}
        </div>
      ) : null}

      <div
        className={cn(
          "pointer-events-none absolute bottom-[7%] left-[5%] max-w-[70%] transition-opacity duration-500",
          open ? "opacity-0" : "opacity-100"
        )}
      >
        <div className="text-2xl leading-none font-medium tracking-tight">{item?.title}</div>
        {item?.caption ? (
          <div className="text-muted-foreground mt-1.5 text-sm">{item.caption}</div>
        ) : null}
      </div>

      <div className="text-muted-foreground pointer-events-none absolute right-[5%] bottom-[7%] text-sm tabular-nums">
        {String(active + 1).padStart(2, "0")}
        <span className="opacity-50"> / {String(count).padStart(2, "0")}</span>
      </div>

      {focusable ? (
        <button
          type="button"
          onClick={() => setFocused(null)}
          className={cn(
            "border-border bg-background/70 text-foreground focus-visible:outline-foreground absolute top-[6%] right-[5%] cursor-pointer rounded-full border px-3.5 py-1.5 text-xs backdrop-blur-sm transition outline-none focus-visible:outline-2 focus-visible:outline-offset-2",
            open ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        >
          {closeLabel}
        </button>
      ) : null}
    </section>
  )
}
