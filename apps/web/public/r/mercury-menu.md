# Mercury Menu

A dropdown the button pours out of itself. The trigger swells, the panel oozes up under its own weight and then fires into place on a pop spring with the rows condensing in bottom-up; closing crashes it back down in one dive and the button takes the hit with a splat. Press and drag the button or the open panel and a liquid finger stretches out of its rim.

- Demo: https://crafterui.com/components/mercury-menu
- Install: `npx shadcn@latest add https://crafterui.com/r/mercury-menu.json`
- Dependencies: motion
- Registry dependencies: https://crafterui.com/r/mercury-surface.json
- Installs to: `registry/crafterui/ui/mercury-menu.tsx`

## Usage

```tsx
"use client"

import * as React from "react"
import { Image, Link2, Sparkles, Type } from "lucide-react"

import {
  MercuryMenu,
  type MercuryMenuItem,
} from "@/registry/crafterui/ui/mercury-menu"

// The panel grows a row taller for every item it is handed, and the goo canvas
// follows it - only the width is yours to set, because a squircle needs one.
const glyph = "size-3.5 opacity-70"

const ITEMS: MercuryMenuItem[] = [
  { label: "Image", icon: <Image className={glyph} aria-hidden="true" /> },
  { label: "Heading", icon: <Type className={glyph} aria-hidden="true" /> },
  { label: "Embed", icon: <Link2 className={glyph} aria-hidden="true" /> },
  { label: "Generate", icon: <Sparkles className={glyph} aria-hidden="true" /> },
]

export default function MercuryMenuDemo() {
  const [picked, setPicked] = React.useState<string | null>(null)

  return (
    // Anchored low on the stage: the panel pours upward, so the room has to be
    // above it.
    <div className="bg-background text-foreground flex h-full min-h-[24rem] w-full flex-col items-center justify-end gap-6 pb-16">
      <MercuryMenu
        items={ITEMS.map((item) => ({
          ...item,
          onSelect: () => setPicked(item.label),
        }))}
        size={80}
        panelWidth={168}
        label="Insert block"
      />
      <p className="text-muted-foreground h-5 text-sm">
        {picked ? `Inserted ${picked.toLowerCase()}` : null}
      </p>
    </div>
  )
}
```

## Source - `registry/crafterui/ui/mercury-menu.tsx`

```tsx
"use client"

// A dropdown the button pours out of itself.
//
// The trigger stays where it is. It swells, and a panel is drawn up out of it -
// oozing to about 40% under its own weight before a pop spring fires it the
// rest of the way to the gap above the button, overshooting and ringing still.
// The rows condense in behind it, bottom-up, the direction the drop grew.
//
// Closing is not the opening reversed. The panel dives in one fast crash: it
// necks, the rows blink out, the mass is drunk back into the circle, and the
// button takes the hit with a splat. Around 90ms of that dive the two are one
// merged shape - the only frames where the whole trick is visible.
//
// The picture is drawn twice and exactly one copy is ever on screen: real CSS
// bodies at rest, and while anything moves a goo layer that draws its own rim
// exactly where those borders were. Grab either body and drag - see
// mercury-surface for the gesture.
import * as React from "react"
import { animate } from "motion/react"

import { cn } from "@/lib/utils"
import {
  EASE_OUT_STRONG,
  GRAB_CHAIN,
  GooFilter,
  SPRING_HOUSE,
  SPRING_POP,
  setGooBlur,
  squirclePath,
  useMercuryStretch,
} from "@/registry/crafterui/ui/mercury-surface"

export interface MercuryMenuItem {
  /** Stable key; falls back to the label. @default undefined */
  id?: string
  /** Row text. */
  label: string
  /** Glyph before the label. @default undefined */
  icon?: React.ReactNode
  /** Fires when the row is chosen. The menu closes either way. @default undefined */
  onSelect?: () => void
}

export interface MercuryMenuProps
  extends Omit<React.ComponentPropsWithoutRef<"div">, "children" | "onSelect"> {
  /** Rows, top to bottom. */
  items: MercuryMenuItem[]
  /** Open state when controlled. Leave unset for internal state. @default undefined */
  open?: boolean
  /** Open on mount when uncontrolled. @default false */
  defaultOpen?: boolean
  /** Fires on every change, from click, Escape or an outside press. @default undefined */
  onOpenChange?: (open: boolean) => void
  /** Glyph on the trigger. Throws 135° into a cross as the menu opens. @default a plus */
  icon?: React.ReactNode
  /** Panel width in 32px-trigger units - the squircle needs a fixed one. @default 156 */
  panelWidth?: number
  /** Rendered width of the trigger, px. Everything scales off it. @default 32 */
  size?: number
  /** Names the menu for a screen reader. @default "Menu" */
  label?: string
}

/* Layout is authored at 32px and scaled as a whole, so the rim calibration -
   solved against a 32px disc - holds at every size. */
const BUTTON = 32
const HALF = BUTTON / 2
const ROW = 30
const PANEL_PAD = 7
const PANEL_GAP = 14
const PANEL_RADIUS = 16
/* Resting scale: the shrunk panel must hide entirely inside the trigger's 16px
   radius. Its farthest corner is ~151px from the origin, so 0.08 leaves ~12. */
const REST_SCALE = 0.08
/* A panel at rest sits very slightly off-square, so the pop has a tilt to swing
   out of rather than only a size to grow through. */
const REST_TILT = -3
/* Room past any body's edge for the longest thing the liquid can do: a 44px
   pull, plus the finger's head, plus three σ of blur tail. */
const GOO_PAD = 76

/* The panel grows out of, and dives into, the button it overlaps - one mass, no
   far necks - so a light blur carries the whole look. */
const BLUR_ACTIVE = 5
const BLUR_REST = 1
const BLUR_GRAB = 5

export function MercuryMenu({
  items,
  open,
  defaultOpen = false,
  onOpenChange,
  icon,
  panelWidth = 156,
  size = BUTTON,
  label = "Menu",
  className,
  ...props
}: MercuryMenuProps) {
  const reactId = React.useId()
  const menuId = `mercury-menu-${reactId.replace(/:/g, "")}`
  const gooId = `mercury-menu-goo-${reactId.replace(/:/g, "")}`

  const rootRef = React.useRef<HTMLDivElement>(null)
  const gooRef = React.useRef<SVGSVGElement>(null)
  const bodiesRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const triggerBodyRef = React.useRef<HTMLDivElement>(null)
  const triggerBlobRef = React.useRef<SVGCircleElement>(null)
  const iconRef = React.useRef<HTMLSpanElement>(null)
  const chainRefs = React.useRef<(SVGCircleElement | null)[]>([])
  const panelBodyRef = React.useRef<SVGSVGElement>(null)
  const panelBlobRef = React.useRef<SVGPathElement>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)
  const rowRefs = React.useRef<(HTMLButtonElement | null)[]>([])

  const [internal, setInternal] = React.useState(defaultOpen)
  const isOpen = open ?? internal
  /* The stretch host is built once and must not read a stale render's state. */
  const openRef = React.useRef(isOpen)
  openRef.current = isOpen

  const geo = React.useMemo(() => {
    const height = PANEL_PAD * 2 + items.length * ROW
    /* The button's centre in the panel's own coordinates - scaling around it is
       what makes the panel grow out of the button rather than out of the air. */
    const originY = height + PANEL_GAP + HALF
    const cx = Math.max(panelWidth / 2, HALF) + GOO_PAD
    const cy = originY + GOO_PAD
    return {
      height,
      originX: panelWidth / 2,
      originY,
      left: (BUTTON - panelWidth) / 2,
      top: -(height + PANEL_GAP),
      cx,
      cy,
      width: cx * 2,
      canvasHeight: cy + HALF + GOO_PAD,
      path: squirclePath(0, 0, panelWidth, height, PANEL_RADIUS),
      /* The same squircle again, placed in the goo canvas. (cx, cy) there is
         the button's CENTRE, while the panel's left/top are measured from the
         anchor's corner - hence the half-button shift, without which the goo
         panel sits 16 units off the crisp one it is supposed to replace. */
      blobPath: squirclePath(
        cx - HALF + (BUTTON - panelWidth) / 2,
        cy - HALF - (height + PANEL_GAP),
        panelWidth,
        height,
        PANEL_RADIUS,
      ),
    }
  }, [items.length, panelWidth])

  const run = React.useRef<{ stop(): void }[]>([])
  const timers = React.useRef<number[]>([])
  const killRun = React.useCallback(() => {
    run.current.forEach((animation) => animation.stop())
    run.current = []
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current = []
  }, [])
  const play = (...animations: ({ stop(): void } | null | undefined)[]) => {
    animations.forEach((animation) => animation && run.current.push(animation))
  }
  const at = (delay: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, delay * 1000))
  }

  const bits = React.useCallback(
    () => [triggerBlobRef.current, triggerBodyRef.current, iconRef.current].filter(isEl),
    [],
  )
  const stretchBits = React.useCallback(
    () => [triggerBlobRef.current, triggerBodyRef.current].filter(isEl),
    [],
  )
  const panelBits = React.useCallback(
    () => [panelBlobRef.current, panelBodyRef.current, panelRef.current].filter(isEl),
    [],
  )
  const rows = React.useCallback(() => rowRefs.current.filter(isEl), [])

  const clearTint = React.useCallback(() => {
    ;[triggerBlobRef.current, panelBlobRef.current, ...chainRefs.current].forEach((blob) =>
      blob?.style.removeProperty("fill"),
    )
  }, [])

  const goLiquid = React.useCallback((blur: 1 | 5 | 7) => {
    rootRef.current?.setAttribute("data-liquid", "")
    if (gooRef.current) gooRef.current.style.opacity = "1"
    if (bodiesRef.current) bodiesRef.current.style.opacity = "0"
    setGooBlur(gooRef.current, blur)
  }, [])

  /* Cross-fade back to the identical crisp picture while the blur is still at
     its working width - thinning the rim on screen blinks every border, so the
     blur only resets once the goo is already hidden. */
  const handoff = React.useCallback(
    (delay: number, fade = 0.15) => {
      /* Explicit start values, not just targets: the instant states below are
         written straight to style.opacity, which Motion does not see - it keeps
         its own cached value per element and would read this fade as "already
         at 0" and skip it, leaving the goo painted over the crisp picture. */
      play(
        animate(gooRef.current!, { opacity: [1, 0] }, { duration: fade, ease: "easeOut", delay }),
        animate(bodiesRef.current!, { opacity: [0, 1] }, { duration: fade, ease: "easeOut", delay }),
      )
      at(delay + fade, () => {
        setGooBlur(gooRef.current, BLUR_REST)
        rootRef.current?.removeAttribute("data-liquid")
        clearTint()
      })
    },
    [clearTint],
  )

  const stretch = useMercuryStretch({
    buttonSize: BUTTON,
    scale: size / BUTTON,
    auxLean: 0.14,
    root: () => rootRef.current,
    triggerBits: bits,
    triggerStretchBits: stretchBits,
    triggerIcon: () => iconRef.current,
    chain: () => chainRefs.current,
    auxBits: panelBits,
    liquidOn: (target) => {
      goLiquid(BLUR_GRAB)
      /* While the menu is closed the shrunk panel is parked INSIDE the circle,
         and it has to sit the grab out: it cannot ride the trigger's lean, so
         left in the goo it pokes out of the moving silhouette as a hump. */
      panelBlobRef.current?.style.setProperty(
        "opacity",
        target === "trigger" && !openRef.current ? "0" : "1",
      )
      const held = target === "trigger" ? triggerBlobRef.current : panelBlobRef.current
      /* The held piece and its finger wear the button's own hover tint, mixed
         rather than taken from a token: `--muted` is a whole step lighter than
         the surface in dark mode, which turns a 5% wash into a grey slug. */
      ;[held, ...chainRefs.current].forEach((blob) =>
        blob?.style.setProperty(
          "fill",
          "color-mix(in oklab, var(--foreground) 5%, var(--background))",
        ),
      )
    },
    handoff: (delay) => handoff(delay),
  })

  /* Rest layout. Written through Motion rather than as a style string: Motion
     owns each transform component separately and cannot read one back out of a
     `transform` something else authored. */
  const layout = React.useCallback(
    (opened: boolean, instant: boolean) => {
      const options = { duration: instant ? 0 : 0.2 }
      animate(
        panelBits(),
        {
          scaleX: opened ? 1 : REST_SCALE,
          scaleY: opened ? 1 : REST_SCALE,
          rotate: opened ? 0 : REST_TILT,
          x: 0,
          y: 0,
        },
        options,
      )
      animate(bits(), { scaleX: 1, scaleY: 1, x: 0, y: 0 }, options)
      animate(rows(), { opacity: opened ? 1 : 0, y: 0 }, options)
      animate(chainRefs.current.filter(isEl), { scale: 0, x: 0, y: 0 }, { duration: 0 })
      if (iconRef.current) animate(iconRef.current, { rotate: opened ? 135 : 0 }, options)
      ;[panelBodyRef.current, panelRef.current].forEach((el) => {
        if (el) el.style.opacity = opened ? "1" : "0"
      })
      panelBlobRef.current?.style.setProperty("opacity", "1")
      if (gooRef.current) gooRef.current.style.opacity = "0"
      if (bodiesRef.current) bodiesRef.current.style.opacity = "1"
      rootRef.current?.removeAttribute("data-liquid")
    },
    [bits, panelBits, rows],
  )

  /* One layout pass on mount, and again only when the row count changes - see
     mercury-dial: keyed any finer, an incidental re-render snaps a running
     choreography back to its rest pose. */
  const layoutRef = React.useRef(layout)
  layoutRef.current = layout
  React.useEffect(() => {
    layoutRef.current(openRef.current, true)
  }, [items.length])
  React.useEffect(() => killRun, [killRun])

  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

  const commit = React.useCallback(
    (next: boolean) => {
      if (open === undefined) setInternal(next)
      onOpenChange?.(next)
    },
    [onOpenChange, open],
  )

  const runOpen = React.useCallback(() => {
    killRun()
    stretch.kill()
    commit(true)
    if (reduced()) {
      layout(true, true)
      return
    }

    clearTint()
    goLiquid(BLUR_ACTIVE)
    ;[panelBodyRef.current, panelRef.current].forEach((el) => {
      if (el) el.style.opacity = "1"
    })
    /* Re-arm the panel blob a closed-state grab may have hidden. */
    panelBlobRef.current?.style.setProperty("opacity", "1")

    play(
      /* The button swells as the drop gathers, then shakes it off. */
      animate(bits(), { x: 0, y: 0, scaleX: 1.16, scaleY: 1.16 }, { duration: 0.13, ease: EASE_OUT_STRONG }),
      animate(bits(), { scaleX: 1, scaleY: 1 }, { ...SPRING_HOUSE, delay: 0.15 }),
      animate(stretchBits(), { rotate: 0 }, { duration: 0 }),
      animate(chainRefs.current.filter(isEl), { x: 0, y: 0, scale: 0 }, { duration: 0.14, ease: EASE_OUT_STRONG }),
      iconRef.current && animate(iconRef.current, { rotate: 135 }, { ...SPRING_HOUSE, delay: 0.02 }),
      /* The panel oozes out, then fires on the pop spring - swinging upright
         from its rest tilt, the two axes 30ms out of phase so it lands with a
         jelly wobble rather than as a rectangle that grew. */
      animate(panelBits(), { x: 0, y: 0 }, { duration: 0 }),
      animate(panelBits(), { scaleX: 0.42, scaleY: 0.42 }, { duration: 0.14, ease: "easeInOut", delay: 0.03 }),
      animate(panelBits(), { scaleY: 1, rotate: 0 }, { ...SPRING_POP, delay: 0.17 }),
      animate(panelBits(), { scaleX: 1 }, { ...SPRING_POP, delay: 0.2 }),
    )

    /* Rows condense bottom-up - the direction the drop grew. */
    const list = rows()
    list.forEach((row, i) => {
      const reverse = list.length - 1 - i
      play(
        animate(
          row,
          { opacity: [0, 1], y: [12, 0] },
          { duration: 0.19, ease: [0.34, 1.6, 0.64, 1], delay: 0.2 + reverse * 0.03 },
        ),
      )
    })

    handoff(0.47, 0.16)
  }, [bits, clearTint, commit, goLiquid, handoff, killRun, layout, panelBits, rows, stretch, stretchBits])

  const runClose = React.useCallback(
    (fromTrigger: boolean) => {
      killRun()
      stretch.kill()
      commit(false)
      if (reduced()) {
        layout(false, true)
        return
      }

      clearTint()
      goLiquid(BLUR_ACTIVE)
      panelBlobRef.current?.style.setProperty("opacity", "1")

      play(
        iconRef.current && animate(iconRef.current, { rotate: 0 }, { ...SPRING_HOUSE, duration: 0.22 }),
        animate(stretchBits(), { rotate: 0 }, { duration: 0 }),
        animate(bits(), { x: 0, y: 0 }, { duration: 0.1, ease: EASE_OUT_STRONG }),
        animate(chainRefs.current.filter(isEl), { x: 0, y: 0, scale: 0 }, { duration: 0.1, ease: EASE_OUT_STRONG }),
        /* One fast dive: the panel necks, crashes ONTO the button - a flash of
           merged mass around 90ms in - and is drunk straight back down. */
        animate(panelBits(), { x: 0, y: 0 }, { duration: 0.1, ease: EASE_OUT_STRONG }),
        animate(panelBits(), { scaleX: 0.35 }, { duration: 0.08, ease: [0.5, 0, 0.1, 1] }),
        animate(panelBits(), { scaleY: 0.35, rotate: REST_TILT }, { duration: 0.08, ease: [0.5, 0, 0.1, 1], delay: 0.015 }),
        animate(rows(), { opacity: [1, 0], y: [0, 4] }, { duration: 0.05, ease: "easeIn" }),
        animate(
          panelBits(),
          { scaleX: REST_SCALE, scaleY: REST_SCALE },
          { duration: 0.06, ease: "easeIn", delay: 0.1 },
        ),
        fromTrigger ? animate(bits(), { scaleX: 1, scaleY: 1 }, { ...SPRING_HOUSE, duration: 0.1 }) : undefined,
        /* The splat carries the rest of the story. */
        animate(
          bits(),
          { scaleX: [1.18, 0.95, 1], scaleY: [0.84, 1.06, 1] },
          { duration: 0.36, times: [0.14, 0.33, 1], ease: "easeOut", delay: 0.14 },
        ),
      )

      at(0.17, () => {
        ;[panelBodyRef.current, panelRef.current].forEach((el) => {
          if (el) el.style.opacity = "0"
        })
      })

      handoff(0.22, 0.1)
    },
    [bits, clearTint, commit, goLiquid, handoff, killRun, layout, panelBits, rows, stretch, stretchBits],
  )

  const toggle = () => {
    if (stretch.consumeClick()) return
    if (isOpen) runClose(true)
    else runOpen()
  }

  React.useEffect(() => {
    if (!isOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) runClose(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      runClose(false)
      triggerRef.current?.focus()
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [isOpen, runClose])

  const scale = size / BUTTON
  const panelBox: React.CSSProperties = {
    width: panelWidth,
    height: geo.height,
    left: geo.left,
    top: geo.top,
    transformOrigin: `${geo.originX}px ${geo.originY}px`,
  }

  return (
    <div
      className={cn("relative select-none", className)}
      style={{ width: size, height: size }}
      {...props}
    >
      <div
        ref={rootRef}
        className="relative"
        style={{
          width: BUTTON,
          height: BUTTON,
          transform: scale === 1 ? undefined : `scale(${scale})`,
          transformOrigin: "0 0",
        }}
      >
        {/* Layer 1 - the resting picture: real borders, real shadows. */}
        <div ref={bodiesRef} className="absolute inset-0" aria-hidden="true">
          <div
            ref={triggerBodyRef}
            className="bg-background border-border absolute rounded-full border shadow-[0_3px_6px_-1px_rgb(0_0_0/0.10)]"
            style={{ width: BUTTON, height: BUTTON, left: 0, top: 0 }}
          />
          {/* The crisp panel is the SAME squircle the goo blob draws, so the two
              pictures share one silhouette and the handoff has nothing to see. */}
          <svg
            ref={panelBodyRef}
            className="absolute overflow-visible opacity-0"
            style={{ ...panelBox, filter: "drop-shadow(0 3px 6px rgb(0 0 0 / 0.10))" }}
            width={panelWidth}
            height={geo.height}
            viewBox={`0 0 ${panelWidth} ${geo.height}`}
          >
            <path d={geo.path} className="fill-background stroke-border" strokeWidth={1} />
          </svg>
        </div>

        {/* Layer 2 - the liquid. A real <svg>, because Safari will not reliably
            repaint a CSS `filter: url()` on an HTML element whose children
            animate. It draws its own rim and one shadow for the whole mass. */}
        <svg
          ref={gooRef}
          width={geo.width}
          height={geo.canvasHeight}
          viewBox={`0 0 ${geo.width} ${geo.canvasHeight}`}
          className="pointer-events-none absolute overflow-visible opacity-0"
          style={{
            left: HALF - geo.cx,
            top: HALF - geo.cy,
            filter: "drop-shadow(0 3px 6px rgb(0 0 0 / 0.10))",
          }}
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <GooFilter id={gooId} width={geo.width} height={geo.canvasHeight} blur={BLUR_REST} />
          </defs>
          <g filter={`url(#${gooId})`}>
            <path
              ref={panelBlobRef}
              d={geo.blobPath}
              className="fill-background [transform-box:fill-box]"
              style={{ transformOrigin: `${geo.originX}px ${geo.originY}px` }}
            />
            <circle
              ref={triggerBlobRef}
              cx={geo.cx}
              cy={geo.cy}
              r={HALF}
              className="fill-background [transform-box:fill-box] [transform-origin:50%_50%]"
            />
            {GRAB_CHAIN.map((link, i) => (
              <circle
                key={link.follow}
                ref={(el) => {
                  chainRefs.current[i] = el
                }}
                cx={geo.cx}
                cy={geo.cy}
                r={11}
                className="fill-background [transform-box:fill-box] [transform-origin:50%_50%]"
              />
            ))}
          </g>
        </svg>

        {/* Layer 3 - rows and hit areas, riding the same tweens above the
            liquid, so the text stays crisp and accessibility lives in real
            DOM buttons. */}
        <div
          ref={panelRef}
          id={menuId}
          role="menu"
          aria-label={label}
          inert={!isOpen}
          className="absolute opacity-0"
          style={{ ...panelBox, padding: PANEL_PAD }}
          onPointerDown={(event) => {
            /* The finger comes out of the edge you actually pressed, not out of
               the panel's middle - from the middle it would be drawn entirely
               inside a body 168 units wide and never show at all. */
            if (!isOpen) return
            const rect = rootRef.current?.getBoundingClientRect()
            if (!rect) return
            stretch.beginGrab(0, event, {
              x: (event.clientX - rect.left) / (size / BUTTON) - HALF,
              y: (event.clientY - rect.top) / (size / BUTTON) - HALF,
            })
          }}
          onPointerMove={(event) => stretch.pointerMove(event)}
          onPointerUp={() => stretch.release()}
          onPointerCancel={() => stretch.release()}
        >
          {items.map((item, i) => (
            <button
              key={item.id ?? item.label}
              ref={(el) => {
                rowRefs.current[i] = el
              }}
              type="button"
              role="menuitem"
              className="text-foreground/85 hover:text-foreground hover:bg-foreground/5 focus-visible:outline-foreground flex w-full items-center gap-2 rounded-[10px] px-2 text-left text-[13px] outline-none transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2"
              style={{ height: ROW }}
              onClick={() => {
                if (stretch.consumeClick()) return
                item.onSelect?.()
                runClose(false)
              }}
            >
              {item.icon ? <span className="flex shrink-0">{item.icon}</span> : null}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>

        <button
          ref={triggerRef}
          type="button"
          className="text-foreground/80 hover:text-foreground hover:bg-foreground/5 [[data-liquid]_&]:bg-transparent focus-visible:outline-foreground absolute inset-0 grid place-items-center rounded-full outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-1"
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-controls={menuId}
          aria-label={label}
          onClick={toggle}
          onPointerDown={(event) => stretch.beginGrab("trigger", event, { x: 0, y: 0 })}
          onPointerMove={(event) => stretch.pointerMove(event)}
          onPointerUp={() => stretch.release()}
          onPointerCancel={() => stretch.release()}
        >
          <span ref={iconRef} className="flex">
            {icon ?? <PlusGlyph />}
          </span>
        </button>
      </div>
    </div>
  )
}

/** The default trigger glyph. A plus, so the 135° throw lands it as a cross. */
function PlusGlyph() {
  return (
    <svg viewBox="0 0 14 14" className="size-3.5" aria-hidden="true">
      <path
        d="M7 1.5v11M1.5 7h11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

const isEl = <T,>(el: T | null): el is T => el !== null
```
