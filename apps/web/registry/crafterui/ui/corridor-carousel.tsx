"use client"

// A gallery you fly down instead of scroll through.
//
// Four walls - left, right, ceiling, floor - are papered with the same run of
// pictures. The run drifts out of the vanishing point, swells as it reaches you
// and slips off the edges of the frame. Wheel, drag or arrow keys shove it
// faster; let go and it coasts back down to its drift.
//
// Nothing here is virtualised and nothing re-renders while it moves. Each wall
// carries one cycle of pictures MORE than the depth it has to cover, which
// makes the corridor periodic: travel exactly one cycle and the frame is, pixel
// for pixel, the one you started on. So the animation never recycles a panel -
// it advances one number, wraps it at the cycle length, and writes a single
// transform to the one element every panel hangs off. The panels themselves get
// static transforms the compositor is handed once.
//
// The camera is the section's own `perspective`, so the walls meet the frame's
// edges exactly at the near plane and converge from there - the corridor is
// always as wide as its container, at any size, with nothing to tune.
//
// Depth fog is one overlay: a radial wash of the page background centred on the
// vanishing point, sized off the corridor's own far cross-section. It hides the
// end of the run and does the shading that a per-panel filter would otherwise
// cost a repaint a frame.
import * as React from "react"

import { cn } from "@/lib/utils"

export interface CorridorCarouselItem {
  /** Art hung on the wall. Any src an <img> takes. */
  image: string
  /** Printed on the frame's label strip, and the picture's alt text. */
  title?: string
  /** Far end of the label strip - year, medium, city, whatever. */
  meta?: string
}

/** The four planes of the corridor, in the order they are papered. */
export const CORRIDOR_WALLS = ["left", "right", "ceiling", "floor"] as const

export type CorridorWall = (typeof CORRIDOR_WALLS)[number]

export interface CorridorCarouselProps
  extends Omit<React.ComponentPropsWithoutRef<"section">, "children"> {
  /**
   * Pictures, in the order they are hung. The run repeats down the corridor and
   * around all four walls. A dozen or so is what a corridor holds; a longer run
   * is trimmed to what its depth leaves room for.
   */
  items: CorridorCarouselItem[]
  /** Which planes are papered. @default ["left","right","ceiling","floor"] */
  walls?: readonly CorridorWall[]
  /** `out` brings the run toward you out of the vanishing point. @default "out" */
  flow?: "out" | "in"
  /** Drift, in corridor widths per second. @default 0.2 */
  speed?: number
  /** Depth of one frame, in corridor widths. @default 0.46 */
  tile?: number
  /** How far down the corridor is dressed, in corridor widths. @default 3.2 */
  depth?: number
  /** Seam between neighbouring frames, in corridor widths. @default 0.02 */
  gap?: number
  /** Camera distance, in corridor widths. Smaller is a wider lens. @default 0.82 */
  lens?: number
  /** How far the vanishing point follows the pointer, 0 to 1. @default 0.4 */
  sway?: number
  /** Wheel, drag and arrow keys drive the corridor. @default true */
  scrub?: boolean
  /** Print each picture's title and meta on its frame. @default true */
  labels?: boolean
  /** Extra classes on the corridor surface. @default undefined */
  className?: string
}

/* Panels per wall. The corridor has to carry one whole cycle of pictures MORE
   than the depth it shows - that surplus is what makes the wrap seamless - so
   this budget is what caps the run. Depth is served first and the cycle takes
   what is left, because a corridor with no distance to it is not a corridor.
   Four walls of 26 is already 104 layers for the compositor. */
const MAX_SLOTS = 26

const DRAG = 2.2 // corridor widths travelled per width dragged
const FLICK = 0.45 // ... and how much of a drag's speed carries on after release
const WHEEL = 0.02 // widths per second added per pixel of wheel
const KEY = 1.4 // ... per arrow press
const DECAY = 3.4 // e-folds per second a shove dies away over
const MAX_PUSH = 7 // widths per second, however hard it is shoved
const SWAY_EASE = 5 // e-folds per second the vanishing point chases the pointer

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function CorridorCarousel({
  items,
  walls = CORRIDOR_WALLS,
  flow = "out",
  speed = 0.2,
  tile = 0.46,
  depth = 3.2,
  gap = 0.02,
  lens = 0.82,
  sway = 0.4,
  scrub = true,
  labels = true,
  className,
  style,
  ...props
}: CorridorCarouselProps) {
  const rootRef = React.useRef<HTMLElement | null>(null)
  const trackRef = React.useRef<HTMLDivElement | null>(null)
  const hazeRef = React.useRef<HTMLDivElement | null>(null)

  // Everything is measured against the container, never the viewport: the
  // corridor is the same corridor in a page column and full bleed.
  const [size, setSize] = React.useState({ w: 0, h: 0 })
  React.useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize((prev) =>
        prev.w === width && prev.h === height ? prev : { w: width, h: height }
      )
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const stage = React.useMemo(() => {
    const w = size.w
    const h = size.h
    const TILE = tile * w
    const GAP = gap * w
    // Slots of dressed depth, then the cycle of pictures that repeats through
    // them. The cycle is what the wrap is measured in, so it has to fit inside
    // the panel budget alongside the depth.
    const reach = Math.max(2, Math.ceil(depth / tile))
    const cycle = Math.max(1, Math.min(items.length, MAX_SLOTS - reach - 2))
    const slots = Math.min(MAX_SLOTS, cycle + reach + 2)

    // Half-width of the corridor where the run runs out, projected - measured
    // off the slots actually hung, not the depth asked for, since the wrap
    // leaves the far end a cycle shallower at its worst. The fog is opaque out
    // to there and clear again long before the near frames reach it.
    const vanish = (0.5 * lens) / (lens + reach * tile)
    const haze = Math.max(vanish * 3.2, 0.22) * w
    const solid = haze > 0 ? Math.round((vanish * 1.02 * w * 100) / haze) : 0
    const fog =
      `radial-gradient(circle ${haze.toFixed(1)}px at var(--corridor-x, 50%) var(--corridor-y, 50%),` +
      ` var(--background) 0%, var(--background) ${solid}%, transparent 100%)`

    const face = {
      left: {
        width: TILE - GAP,
        height: h - GAP,
        at: (z: number) => `translate3d(${-w / 2}px, 0px, ${z}px) rotateY(90deg)`,
      },
      right: {
        width: TILE - GAP,
        height: h - GAP,
        at: (z: number) => `translate3d(${w / 2}px, 0px, ${z}px) rotateY(-90deg)`,
      },
      ceiling: {
        width: w - GAP,
        height: TILE - GAP,
        at: (z: number) => `translate3d(0px, ${-h / 2}px, ${z}px) rotateX(-90deg)`,
      },
      floor: {
        width: w - GAP,
        height: TILE - GAP,
        at: (z: number) => `translate3d(0px, ${h / 2}px, ${z}px) rotateX(90deg)`,
      },
    } as const

    const panels: {
      key: string
      item: CorridorCarouselItem
      lead: boolean
      style: React.CSSProperties
    }[] = []

    if (w > 0 && h > 0 && items.length > 0) {
      walls.forEach((wall, index) => {
        // Opposite walls neither line up nor show the same picture, or the
        // corridor reads as one image in a mirror box. Both offsets are
        // constant per wall, so the run stays periodic.
        const phase = (index / walls.length) * TILE
        const shift = Math.round((index * cycle) / walls.length)
        const plane = face[wall]
        // Counting from -1 hangs one frame in FRONT of the corridor mouth. A
        // wall whose phase has pushed its first frame back off the near plane
        // would otherwise be bare there at low travel and dressed at high, and
        // that difference - a band of background sliding in along one edge - is
        // the one thing that would give the wrap away.
        for (let k = -1; k < slots - 1; k++) {
          panels.push({
            key: `${wall}-${k}`,
            item: items[(((k + shift) % cycle) + cycle) % cycle],
            // One wall's first cycle carries the alt text; the rest of the
            // corridor is the same pictures again, and is hidden from readers.
            lead: index === 0 && k >= 0 && k < cycle,
            style: {
              width: `${plane.width}px`,
              height: `${plane.height}px`,
              transform: plane.at(-k * TILE - phase),
            },
          })
        }
      })
    }

    return {
      w,
      panels,
      fog,
      /** Travel that returns the corridor to the frame it started on. */
      period: cycle * tile,
      perspective: Math.max(1, lens * w),
      // Type is set on the frame, so it recedes with the picture it labels.
      fontSize: Math.max(8, TILE * 0.085),
    }
  }, [size.w, size.h, items, walls, tile, depth, gap, lens])

  // Read by the frame loop, which is mounted once and never re-subscribed. Set
  // after the commit rather than during the render, so a render React throws
  // away cannot leave the loop running on props that never reached the DOM.
  const view = React.useRef({ speed, flow, sway, w: stage.w, period: stage.period })
  React.useEffect(() => {
    view.current = { speed, flow, sway, w: stage.w, period: stage.period }
  })

  const run = React.useRef({
    travel: 0, // corridor widths, wrapped at one cycle
    push: 0, // widths per second, on top of the drift
    nudge: 0, // widths handed over by a drag since the last frame
    rate: 0, // ... as a speed, which is what a release throws
    grab: 0,
    dragging: false,
    ox: 0,
    oy: 0,
    tx: 0,
    ty: 0,
  })

  React.useEffect(() => {
    const root = rootRef.current
    const track = trackRef.current
    const haze = hazeRef.current
    if (!root || !track) return

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")
    let onscreen = true
    let previous = 0
    let frame = requestAnimationFrame(function tick(now) {
      frame = requestAnimationFrame(tick)
      const dt = previous ? Math.min(0.05, (now - previous) / 1000) : 0
      previous = now
      if (!onscreen) return

      const v = view.current
      const r = run.current
      r.push = clamp(r.push * Math.exp(-DECAY * dt), -MAX_PUSH, MAX_PUSH)
      const drift = reduce.matches ? 0 : v.speed * (v.flow === "in" ? -1 : 1)
      const step = (drift + r.push) * dt + r.nudge
      // The drag's speed, measured over the frame rather than over one pointer
      // event: a 240Hz pointer reports a third of the movement per event that a
      // 60Hz one does, and a finger held still reports none at all.
      r.rate = dt > 0 ? r.nudge / dt : 0
      r.nudge = 0
      if (v.period > 0) {
        r.travel = (((r.travel + step) % v.period) + v.period) % v.period
      }
      track.style.transform = `translate3d(0px, 0px, ${(r.travel * v.w).toFixed(2)}px)`

      // The vanishing point leans toward the pointer. Written straight onto the
      // section and onto the fog - never as an inherited custom property on the
      // root, which would dirty the style of all ninety-odd panels under it.
      const ease = 1 - Math.exp(-SWAY_EASE * dt)
      r.ox += (r.tx - r.ox) * ease
      r.oy += (r.ty - r.oy) * ease
      const ox = `${(50 + r.ox * v.sway * 50).toFixed(2)}%`
      const oy = `${(50 + r.oy * v.sway * 50).toFixed(2)}%`
      root.style.perspectiveOrigin = `${ox} ${oy}`
      if (haze) {
        haze.style.setProperty("--corridor-x", ox)
        haze.style.setProperty("--corridor-y", oy)
      }
    })

    // Eighty-odd composited panels are not worth a frame while off screen.
    const watcher = new IntersectionObserver(
      ([entry]) => {
        onscreen = entry.isIntersecting
        previous = 0
        if (!onscreen) run.current.push = 0
      },
      { threshold: 0 }
    )
    watcher.observe(root)

    return () => {
      cancelAnimationFrame(frame)
      watcher.disconnect()
    }
  }, [])

  React.useEffect(() => {
    const el = rootRef.current
    if (!el || !scrub) return
    // Passive on purpose: the page keeps its scroll, and the wheel that scrolls
    // it flies you down the corridor on the way past.
    const onWheel = (event: WheelEvent) => {
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
      run.current.push += delta * WHEEL
    }
    el.addEventListener("wheel", onWheel, { passive: true })
    return () => el.removeEventListener("wheel", onWheel)
  }, [scrub])

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const r = run.current
    const box = event.currentTarget.getBoundingClientRect()
    r.tx = clamp(((event.clientX - box.left) / box.width - 0.5) * 2, -1, 1)
    r.ty = clamp(((event.clientY - box.top) / box.height - 0.5) * 2, -1, 1)
    if (!r.dragging || !stage.w) return
    const dx = event.clientX - r.grab
    r.grab = event.clientX
    r.nudge += (-dx / stage.w) * DRAG
  }

  const stopDrag = (event: React.PointerEvent<HTMLElement>) => {
    const r = run.current
    if (!r.dragging) return
    r.dragging = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    r.push += r.rate * FLICK
    r.rate = 0
  }

  return (
    <section
      ref={rootRef}
      aria-label="Picture corridor"
      tabIndex={scrub ? 0 : undefined}
      className={cn(
        "bg-background text-foreground relative h-full min-h-[24rem] w-full touch-pan-y overflow-hidden outline-none select-none",
        "focus-visible:outline-foreground focus-visible:outline-2 focus-visible:-outline-offset-4",
        scrub && "cursor-grab active:cursor-grabbing",
        className
      )}
      style={{
        perspective: `${stage.perspective}px`,
        perspectiveOrigin: "50% 50%",
        ...style,
      }}
      onPointerDown={(event) => {
        if (!scrub || !event.isPrimary) return
        event.currentTarget.setPointerCapture(event.pointerId)
        const r = run.current
        r.dragging = true
        r.grab = event.clientX
        r.push = 0
        r.rate = 0
      }}
      onPointerMove={onPointerMove}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onPointerLeave={(event) => {
        stopDrag(event)
        run.current.tx = 0
        run.current.ty = 0
      }}
      onKeyDown={(event) => {
        if (!scrub) return
        const back = event.key === "ArrowLeft" || event.key === "ArrowUp"
        const on = event.key === "ArrowRight" || event.key === "ArrowDown"
        if (!back && !on) return
        event.preventDefault()
        run.current.push += on ? KEY : -KEY
      }}
      {...props}
    >
      {/* The one moving element. Every panel hangs off it with a static
          transform, so a frame costs one matrix, not eighty-eight. */}
      <div
        ref={trackRef}
        className="absolute inset-0 [transform-style:preserve-3d] [will-change:transform]"
      >
        {stage.panels.map((panel) => (
          <figure
            key={panel.key}
            aria-hidden={!panel.lead}
            className="bg-muted absolute inset-0 m-auto overflow-hidden"
            style={{ ...panel.style, fontSize: `${stage.fontSize}px` }}
          >
            <img
              src={panel.item.image}
              alt={panel.lead ? (panel.item.title ?? "") : ""}
              draggable={false}
              decoding="async"
              className="size-full object-cover"
            />
            {labels && (panel.item.title || panel.item.meta) ? (
              <figcaption className="bg-background/85 absolute inset-x-0 bottom-0 flex items-baseline justify-between gap-[0.7em] px-[0.9em] py-[0.55em]">
                <span className="truncate font-medium tracking-tight">
                  {panel.item.title}
                </span>
                {panel.item.meta ? (
                  <span className="text-muted-foreground shrink-0 tabular-nums">
                    {panel.item.meta}
                  </span>
                ) : null}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>

      {/* Depth fog. Painted over the corridor rather than into it: the walls
          never cross the axis, so the only thing under the wash is distance. */}
      <div
        ref={hazeRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: stage.fog }}
      />
    </section>
  )
}
