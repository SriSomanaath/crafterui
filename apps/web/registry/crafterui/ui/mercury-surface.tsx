"use client"

// The engine behind the mercury family: a metaball filter whose border never
// swells, and the grab gesture that pulls a liquid finger out of any surface.
//
// Headless. It renders one <filter> and hands back a controller; the shapes,
// the choreography and the chrome all belong to whatever is built on top of it
// (see mercury-dial and mercury-menu). Nothing here draws a UI.
//
// Inspired by liquid-taffy by arknow91 (https://github.com/arknow91/liquid-taffy)
// - MIT licensed. Rewritten here on Motion springs and theme tokens.
import * as React from "react"
import { animate } from "motion/react"

/* ── The rim ──────────────────────────────────────────────────────────────
   A goo border is not a stroke. It is the sliver between two iso-alpha
   contours of the SAME blurred alpha, so how far apart those contours land in
   PIXELS is decided by the blur: one fixed threshold pair draws a different
   border at every σ, which is why gooey buttons in the wild visibly inflate
   the moment they start moving.

   Every working σ therefore carries its own pair, solved by rasterising the
   exact filter over a 32px disc so the rim's outer edge lands on the crisp
   border's outer edge and its weight stays 1px. Blur and thresholds are ONE
   setting - never change one without the other, and never in a later frame. */
export const GOO_THRESHOLDS = {
  1: [-14.5146, -24.6721],
  5: [-12.7296, -15.063],
  7: [-11.6925, -13.245],
} as const

/** The σ values the rim is solved for. Anything else draws a wrong border. */
export type GooBlur = keyof typeof GOO_THRESHOLDS

/* Alpha-only threshold: the RGB rows stay identity so the interior keeps the
   blurred source colours, which is what lets two fills blend into a gradient
   right at the neck where they merge. */
const thresholdMatrix = (offset: number) =>
  `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 30 ${offset}`

export interface GooFilterProps {
  /** Unique per instance - two filters sharing an id collide. */
  id: string
  /** Filter region, in the host <svg>'s user units. Must cover the whole canvas. */
  width: number
  height: number
  /** Resting blur. Non-zero, or the threshold has no soft edge to bite on. @default 1 */
  blur?: GooBlur
}

/**
 * The metaball filter, ready to drop in a host <svg>'s <defs>.
 *
 * The region is fixed in user units rather than a percentage of the group's
 * bounding box: a percentage region is measured off whatever the blobs occupy
 * right now, so it crops the blur's tail at rest and then crawls outward as a
 * finger extends.
 */
export function GooFilter({ id, width, height, blur = 1 }: GooFilterProps) {
  const [outer, inner] = GOO_THRESHOLDS[blur]
  return (
    <filter
      id={id}
      filterUnits="userSpaceOnUse"
      x="0"
      y="0"
      width={width}
      height={height}
      colorInterpolationFilters="sRGB"
    >
      <feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="blur" />
      {/* Outer contour: set below the half-way point by just enough to undo the
          curvature shrink a blur puts on a disc, so the liquid's edge lands
          where the crisp border's outer edge was. */}
      <feColorMatrix in="blur" type="matrix" values={thresholdMatrix(outer)} result="outer" />
      {/* Inner contour: a second, higher threshold of the same blur carves the
          interior out, and the rim is the sliver left between the two. */}
      <feColorMatrix in="blur" type="matrix" values={thresholdMatrix(inner)} result="inner" />
      {/* Painted in the same order a CSS border is: the surface fills the whole
          outer contour, the border colour lies over it, and the interior covers
          both everywhere except the sliver. Stacking it this way is what lets a
          translucent border token - which is what `--border` is in dark mode -
          read at exactly the weight it does on the crisp bodies. Flooding the
          rim alone would leave it lying on the page instead. */}
      <feFlood style={{ floodColor: "var(--background)" }} result="surface" />
      <feComposite in="surface" in2="outer" operator="in" result="surfaceShape" />
      <feFlood style={{ floodColor: "var(--border)" }} result="rim" />
      <feComposite in="rim" in2="outer" operator="in" result="rimShape" />
      <feMerge>
        <feMergeNode in="surfaceShape" />
        <feMergeNode in="rimShape" />
        <feMergeNode in="inner" />
      </feMerge>
    </filter>
  )
}

/**
 * Switch the blur and its matching thresholds together, in one frame. Reads the
 * primitives off the host <svg> rather than through three refs per consumer -
 * this runs a handful of times per gesture, never per frame.
 */
export function setGooBlur(host: SVGSVGElement | null, sigma: GooBlur) {
  const filter = host?.querySelector("filter")
  if (!filter) return
  const [outer, inner] = GOO_THRESHOLDS[sigma]
  filter.querySelector("feGaussianBlur")?.setAttribute("stdDeviation", String(sigma))
  const matrices = filter.querySelectorAll("feColorMatrix")
  matrices[0]?.setAttribute("values", thresholdMatrix(outer))
  matrices[1]?.setAttribute("values", thresholdMatrix(inner))
}

/* ── Springs ──────────────────────────────────────────────────────────────
   The family's two curves, as physics rather than sampled polylines: at unit
   mass a spring of ζ, ω is stiffness ω², damping 2ζω. */
/** ζ=0.434, ω=22.46 - 22% overshoot. Everything that pops in or springs back. */
export const SPRING_HOUSE = { type: "spring", stiffness: 505, damping: 19.5 } as const
/** ζ=0.479, ω=18.09 - 18% overshoot. The louder curve that carries a leap. */
export const SPRING_POP = { type: "spring", stiffness: 327, damping: 17.3 } as const
/** Micro state and the press squash. */
export const EASE_OUT_STRONG = [0.23, 1, 0.32, 1] as const
/** Exits wind up ~10% the wrong way before they collapse. */
export const EASE_ANTICIPATE = [0.36, 0, 0.66, -0.56] as const

/**
 * Apple's continuous corner (the iOS squircle), as a path. A panel draws its
 * crisp body and its goo blob from this same call, so the two pictures share
 * one silhouette and the handoff between them is invisible.
 */
export function squirclePath(x: number, y: number, w: number, h: number, r: number) {
  const s = Math.min(r * 1.528665, w / 2, h / 2)
  const u = (k: number) => s * (k / 1.528665)
  const [c0, c1, c2, c3, c4, c5, c6] = [
    1.528665, 1.08849, 0.8684, 0.63149, 0.37283, 0.16906, 0.07491,
  ].map(u)
  return [
    `M ${x + c0} ${y}`,
    `L ${x + w - c0} ${y}`,
    `C ${x + w - c1} ${y} ${x + w - c2} ${y} ${x + w - c3} ${y + c6}`,
    `C ${x + w - c4} ${y + c5} ${x + w - c5} ${y + c4} ${x + w - c6} ${y + c3}`,
    `C ${x + w} ${y + c2} ${x + w} ${y + c1} ${x + w} ${y + c0}`,
    `L ${x + w} ${y + h - c0}`,
    `C ${x + w} ${y + h - c1} ${x + w} ${y + h - c2} ${x + w - c6} ${y + h - c3}`,
    `C ${x + w - c5} ${y + h - c4} ${x + w - c4} ${y + h - c5} ${x + w - c3} ${y + h - c6}`,
    `C ${x + w - c2} ${y + h} ${x + w - c1} ${y + h} ${x + w - c0} ${y + h}`,
    `L ${x + c0} ${y + h}`,
    `C ${x + c1} ${y + h} ${x + c2} ${y + h} ${x + c3} ${y + h - c6}`,
    `C ${x + c4} ${y + h - c5} ${x + c5} ${y + h - c4} ${x + c6} ${y + h - c3}`,
    `C ${x} ${y + h - c2} ${x} ${y + h - c1} ${x} ${y + h - c0}`,
    `L ${x} ${y + c0}`,
    `C ${x} ${y + c1} ${x} ${y + c2} ${x + c6} ${y + c3}`,
    `C ${x + c5} ${y + c4} ${x + c4} ${y + c5} ${x + c3} ${y + c6}`,
    `C ${x + c2} ${y} ${x + c1} ${y} ${x + c0} ${y}`,
    "Z",
  ].join(" ")
}

/* ── The grab ─────────────────────────────────────────────────────────────
   Press any body and drag: a chain of beads is drawn out of its rim as a
   liquid finger, the grabbed body leans after it, and the release whips the
   whole thing home on the house spring. */

/** How far from the grabbed body's centre the edge gives before the sponge stops. */
export const GRAB_MAX = 44

/* Four beads shaped like a real finger: THICK at the root so it melts into the
   body it is pulled from, THINNEST through the middle, a modest bulb at the
   head. `thin` is how much a bead narrows at full tension; `lag` grows down the
   chain so the beads trail the head and keep the bridge unbroken. */
export const GRAB_CHAIN = [
  { follow: 1, size: 0.85, thin: 0.06, lag: 0.16 },
  { follow: 0.76, size: 0.62, thin: 0.2, lag: 0.19 },
  { follow: 0.52, size: 0.66, thin: 0.18, lag: 0.22 },
  { follow: 0.28, size: 0.82, thin: 0.1, lag: 0.25 },
] as const

/** The trigger, or the index of one of the host's auxiliary bodies. */
export type StretchTarget = "trigger" | number

type Bit = Element | null

/** The slice of a pointer event the controller needs - React's synthetic event
    satisfies it structurally, so nothing here is bound to React. */
export interface StretchPointerEvent {
  button: number
  pointerId: number
  clientX: number
  clientY: number
  currentTarget: { setPointerCapture(pointerId: number): void }
}

/**
 * What a component must tell the controller about its own picture. The
 * controller decides WHEN things move; the host knows HOW its goo is wired.
 */
export interface StretchHost {
  /** Diameter of the trigger, in the units the geometry is authored in. */
  buttonSize: number
  /** Rendered size ÷ authored size. Pointer deltas arrive in rendered pixels
      while every length here is an authored unit, so a host that scales itself
      has to say by how much or the pull runs long and off-axis. @default 1 */
  scale?: number
  /** How far a pulled aux body leans after the finger. 0.22 for a droplet,
      0.14 for a heavier panel. */
  auxLean: number
  /** The positioned root every pull is measured against. */
  root(): HTMLElement | null
  /** Blob, crisp body and glyph - everything that squashes together, or the
      trigger visibly tears apart. */
  triggerBits(): Bit[]
  /** Blob and crisp body only: these additionally wear the rotated directional
      stretch, which must not reach the glyph. */
  triggerStretchBits(): Bit[]
  triggerIcon(): Bit
  chain(): (SVGCircleElement | null)[]
  /** A pulled aux body's blob, crisp body and hit area. */
  auxBits(index: number): Bit[]
  /** Go liquid at the grab blur. Also the host's chance to hide any mass parked
      inside the trigger: a hidden body that cannot ride the trigger's lean pokes
      out of the moving silhouette as a hump. */
  liquidOn(target: StretchTarget): void
  /** Hand the picture back to the crisp bodies, `delay` seconds from now. */
  handoff(delay: number): void
}

export interface MercuryStretch {
  /** Begin a grab. `base` is the grabbed body's centre, in the root's space. */
  beginGrab(target: StretchTarget, event: StretchPointerEvent, base: { x: number; y: number }): void
  pointerMove(event: { clientX: number; clientY: number }): void
  release(): void
  /** For click handlers: reports whether this click is the tail of a stretch
      and must be swallowed instead of toggling anything. */
  consumeClick(): boolean
  /** Kill the release choreography - call before any full open/close run. */
  kill(): void
}

/* A pull under this many px is an un-press, not a snap-back. */
const STRETCH_FLOOR = 12
/* Dead zone before the finger starts to follow. */
const GRAB_DEADZONE = 6

/**
 * The grab gesture. One controller per component instance; it owns the maths,
 * the tweens and the press bookkeeping, and calls back into the host for
 * everything that is that component's own picture.
 */
export function useMercuryStretch(host: StretchHost): MercuryStretch {
  const hostRef = React.useRef(host)
  hostRef.current = host

  const ref = React.useRef<MercuryStretch | null>(null)
  if (ref.current === null) ref.current = createStretch(() => hostRef.current)

  React.useEffect(() => {
    const stretch = ref.current
    return () => stretch?.kill()
  }, [])

  return ref.current
}

function createStretch(getHost: () => StretchHost): MercuryStretch {
  let pressed = false
  /* Cursor distance from the grab base during a hold - decides whether the
     release is a plain un-press or a sponge snap-back. */
  let stretchDist = 0
  let suppressClick = false
  let target: StretchTarget | null = null
  let base = { x: 0, y: 0 }
  /* The release runs on its own list: killing a component's open/close from a
     mere release would freeze its drops mid-flight. */
  let running: { stop(): void }[] = []

  const stop = () => {
    running.forEach((animation) => animation.stop())
    running = []
  }

  const play = (...animations: { stop(): void }[]) => {
    running.push(...animations)
  }

  const reduced = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches

  const release = () => {
    if (!pressed) return
    pressed = false

    const host = getHost()
    const grabbed = target
    target = null
    const home = base
    const wasStretched = stretchDist > STRETCH_FLOOR
    suppressClick = wasStretched
    stretchDist = 0

    stop()

    if (wasStretched) {
      /* The chain whips home head-first, each bead a breath behind, and
         dissolves into the rim as it lands. */
      GRAB_CHAIN.forEach((_link, index) => {
        const bead = host.chain()[index]
        if (!bead) return
        play(
          animate(bead, { x: home.x, y: home.y }, { ...SPRING_HOUSE, delay: index * 0.025 }),
          animate(bead, { scale: 0 }, { duration: 0.2, ease: "easeIn", delay: 0.16 + index * 0.025 }),
        )
      })
    }

    if (typeof grabbed === "number") {
      /* A pulled aux body rides its position spring home - the ring IS the
         shake. (A scale wobble would orbit its remote transform origin.) */
      play(animate(host.auxBits(grabbed).filter(isEl), { x: 0, y: 0 }, SPRING_HOUSE))
    } else {
      /* Rotation springs home with the position rather than being zeroed after
         the handoff: the circle hides its own rotation but its shadow does not,
         and a set() made that shadow visibly jump as the crisp body took over. */
      play(
        animate(
          host.triggerStretchBits().filter(isEl),
          { x: 0, y: 0, rotate: 0 },
          SPRING_HOUSE,
        ),
      )
      const icon = host.triggerIcon()
      if (icon) play(animate(icon, { x: 0, y: 0 }, SPRING_HOUSE))
      const bits = host.triggerBits().filter(isEl)
      play(
        wasStretched
          ? animate(
              bits,
              { scaleX: [1.2, 0.93, 1], scaleY: [0.82, 1.09, 1] },
              { duration: 0.6, times: [0.15, 0.33, 1], ease: "easeOut", delay: 0.12 },
            )
          : animate(bits, { scaleX: 1, scaleY: 1 }, SPRING_HOUSE),
      )
    }

    host.handoff(wasStretched ? 0.45 : 0.3)
  }

  const beginGrab = (
    next: StretchTarget,
    event: StretchPointerEvent,
    from: { x: number; y: number },
  ) => {
    if (reduced() || event.button !== 0) return
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // The pointer may already be gone; the stretch just will not follow.
    }
    const host = getHost()
    pressed = true
    stretchDist = 0
    target = next
    base = { x: from.x, y: from.y }
    /* Clear a stale suppression, or this gesture's click eats the last one's. */
    suppressClick = false

    host.liquidOn(next)
    host.chain().forEach((bead) => {
      if (bead) animate(bead, { x: from.x, y: from.y, scale: 0.4 }, { duration: 0 })
    })
    /* Capture can fail silently; a window-level backstop guarantees the release
       lands even if the pointer lets go far outside the button. */
    window.addEventListener("pointerup", release, { once: true })

    if (next === "trigger") {
      stop()
      play(
        animate(host.triggerBits().filter(isEl), { scaleX: 0.85, scaleY: 0.85 }, {
          duration: 0.1,
          ease: EASE_OUT_STRONG,
        }),
      )
    }
  }

  /* Hold and drag: only the grabbed PIECE of the edge stretches. The head
     chases the cursor a clamped distance, the beads trail at fractions of the
     pull, and the goo renders the lot as one finger drawn out of the rim. */
  const pointerMove = (event: { clientX: number; clientY: number }) => {
    if (!pressed || target === null || reduced()) return
    const host = getHost()
    const rect = host.root()?.getBoundingClientRect()
    if (!rect) return

    const scale = host.scale ?? 1
    const half = host.buttonSize / 2
    const dx = (event.clientX - rect.left) / scale - (half + base.x)
    const dy = (event.clientY - rect.top) / scale - (half + base.y)
    const dist = Math.hypot(dx, dy)
    stretchDist = dist
    const pull = Math.min(Math.max(0, dist - GRAB_DEADZONE) * 0.7, GRAB_MAX)
    const tension = pull / GRAB_MAX
    const ux = dist > 0 ? dx / dist : 0
    const uy = dist > 0 ? dy / dist : 0

    GRAB_CHAIN.forEach((link, index) => {
      const bead = host.chain()[index]
      if (!bead) return
      animate(
        bead,
        {
          x: base.x + ux * pull * link.follow,
          y: base.y + uy * pull * link.follow,
          scale: link.size * (1 - tension * link.thin),
        },
        { duration: link.lag, ease: "easeOut" },
      )
    })

    if (typeof target === "number") {
      /* The pulled body leans after the finger; its shape stays put, because a
         scale would orbit its remote transform origin. */
      animate(host.auxBits(target).filter(isEl), {
        x: ux * pull * host.auxLean,
        y: uy * pull * host.auxLean,
      }, { duration: 0.25, ease: "easeOut" })
      return
    }

    /* The trigger leans into the pull and stretches a touch along it, so the
       mass visibly follows the grabbed piece. */
    animate(
      host.triggerStretchBits().filter(isEl),
      {
        x: ux * pull * 0.18,
        y: uy * pull * 0.18,
        rotate: (Math.atan2(dy, dx) * 180) / Math.PI,
        scaleX: (1 + tension * 0.12) * 0.85,
        scaleY: (1 - tension * 0.06) * 0.85,
      },
      { duration: 0.25, ease: "easeOut" },
    )
    const icon = host.triggerIcon()
    if (icon) {
      animate(icon, { x: ux * pull * 0.28, y: uy * pull * 0.28 }, { duration: 0.25, ease: "easeOut" })
    }
  }

  const consumeClick = () => {
    pressed = false
    if (!suppressClick) return false
    suppressClick = false
    return true
  }

  return { beginGrab, pointerMove, release, consumeClick, kill: stop }
}

const isEl = (el: Bit): el is Element => el !== null
