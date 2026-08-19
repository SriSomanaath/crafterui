"use client"

// A speed dial that breaks into droplets.
//
// Press the trigger and it does not open a menu so much as burst: the button
// swells while the drops gather inside it, then each one oozes out to about
// 40% - heavy, hanging, all surface tension - before a pop spring fires it the
// rest of the way past full size and rings it still. Closing is authored, not
// reversed: every drop takes a blink of wind-up the wrong way and then dives
// back in, and the button takes the hit with a splat.
//
// The whole picture is drawn twice and exactly one copy is ever visible. At
// rest you are looking at real CSS circles with real borders and one real
// shadow each; the instant anything moves the goo layer takes the picture over,
// draws its own rim exactly where those borders were, and casts one shadow for
// the whole mass. No half-blended state - a sub-pixel of overlap reads as a
// doubled border.
//
// Hold and drag any drop and the same liquid answers: see mercury-surface.
import * as React from "react"
import { animate } from "motion/react"

import { cn } from "@/lib/utils"
import {
  EASE_ANTICIPATE,
  EASE_OUT_STRONG,
  GRAB_CHAIN,
  GooFilter,
  SPRING_HOUSE,
  SPRING_POP,
  setGooBlur,
  useMercuryStretch,
} from "@/registry/crafterui/ui/mercury-surface"

export interface MercuryDialItem {
  /** Stable key; falls back to the label. @default undefined */
  id?: string
  /** Names the drop for a screen reader, and the only text it carries. */
  label: string
  /** Glyph inside the drop. Sized by the caller - 14px reads best at size 32. */
  icon: React.ReactNode
  /** Fires when the drop is chosen. The dial closes either way. @default undefined */
  onSelect?: () => void
}

export interface MercuryDialProps
  extends Omit<React.ComponentPropsWithoutRef<"div">, "children" | "onSelect"> {
  /** Drops, fanned left to right across the arc. */
  items: MercuryDialItem[]
  /** Open state when controlled. Leave unset for internal state. @default undefined */
  open?: boolean
  /** Open on mount when uncontrolled. @default false */
  defaultOpen?: boolean
  /** Fires on every change, from click, Escape or an outside press. @default undefined */
  onOpenChange?: (open: boolean) => void
  /** Glyph on the trigger. Throws 135° into a cross as the dial opens. @default a plus */
  icon?: React.ReactNode
  /** Rendered width of the trigger, px. Everything scales off it. @default 32 */
  size?: number
  /** Names the menu for a screen reader. @default "Actions" */
  label?: string
}

/* Layout is authored at 32px and scaled as a whole, so the rim calibration -
   which is solved against a 32px disc - holds at every size. */
const BUTTON = 32
const HALF = BUTTON / 2

/* Resting scale: a shrunk drop must hide entirely inside the trigger's 16px
   radius, even while the press squash and the landing splat deform it. */
const REST_SCALE = 0.12
/* Degrees the fan spans, centred on straight up. */
const SWEEP = 135
const MIN_RADIUS = 52
/* Room past any body's edge for the longest thing the liquid can do: a finger
   pulled the full 44px, plus its head, plus three σ of blur tail. The canvas is
   what the browser rasterises into - anything past it is cut off with a straight
   edge and no rim. */
const GOO_PAD = 76

/* Just enough blur to bridge the fan gaps in flight; more reads soft, not
   liquid. Rest is non-zero so the threshold has a soft edge to bite on, and the
   grab needs less because its chain already overlaps geometrically. */
const BLUR_ACTIVE = 7
const BLUR_REST = 1
const BLUR_GRAB = 5

const rad = (deg: number) => (deg * Math.PI) / 180

export function MercuryDial({
  items,
  open,
  defaultOpen = false,
  onOpenChange,
  icon,
  size = BUTTON,
  label = "Actions",
  className,
  ...props
}: MercuryDialProps) {
  const reactId = React.useId()
  const menuId = `mercury-dial-menu-${reactId.replace(/:/g, "")}`
  const gooId = `mercury-dial-goo-${reactId.replace(/:/g, "")}`

  const rootRef = React.useRef<HTMLDivElement>(null)
  const gooRef = React.useRef<SVGSVGElement>(null)
  const bodiesRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const triggerBodyRef = React.useRef<HTMLDivElement>(null)
  const triggerBlobRef = React.useRef<SVGCircleElement>(null)
  const iconRef = React.useRef<HTMLSpanElement>(null)
  const chainRefs = React.useRef<(SVGCircleElement | null)[]>([])
  const bodyRefs = React.useRef<(HTMLDivElement | null)[]>([])
  const blobRefs = React.useRef<(SVGCircleElement | null)[]>([])
  const dropRefs = React.useRef<(HTMLButtonElement | null)[]>([])

  const [internal, setInternal] = React.useState(defaultOpen)
  const isOpen = open ?? internal
  /* The stretch host is built once and must not read a stale render's state. */
  const openRef = React.useRef(isOpen)
  openRef.current = isOpen

  /* Geometry: the fan opens wider as it is given more drops, so the arc always
     has room for them rather than fusing them into one puddle. */
  const fan = React.useMemo(() => {
    const count = items.length
    const arc = rad(SWEEP)
    const radius = Math.max(MIN_RADIUS, (count * (BUTTON + 2)) / arc)
    const drops = items.map((_item, i) => {
      const angle = count > 1 ? -90 + (i / (count - 1) - 0.5) * SWEEP : -90
      return {
        dx: Math.cos(rad(angle)) * radius,
        dy: Math.sin(rad(angle)) * radius,
        /* Each drop rests tilted toward its own flight path, so the pop also
           swings it upright. */
        rest: (angle + 90) * 0.18,
      }
    })
    const cx = radius + HALF + GOO_PAD
    return { drops, cx, cy: cx, width: cx * 2, height: cx + HALF + GOO_PAD }
  }, [items.length])

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
  const dropBits = React.useCallback(
    (i: number) => [blobRefs.current[i], bodyRefs.current[i], dropRefs.current[i]].filter(isEl),
    [],
  )
  /* The crisp halves fade as one; the goo blob never fades, it hides by scale. */
  const dropFade = React.useCallback(
    (i: number) => [bodyRefs.current[i], dropRefs.current[i]].filter(isEl),
    [],
  )

  /* Every blob carries the held tint while it is grabbed; a full open or close
     is always plain liquid, so the tint is cleared before either runs. */
  const clearTint = React.useCallback(() => {
    ;[triggerBlobRef.current, ...blobRefs.current, ...chainRefs.current].forEach((blob) =>
      blob?.style.removeProperty("fill"),
    )
  }, [])

  const goLiquid = React.useCallback(
    (blur: 1 | 5 | 7) => {
      rootRef.current?.setAttribute("data-liquid", "")
      if (gooRef.current) gooRef.current.style.opacity = "1"
      if (bodiesRef.current) bodiesRef.current.style.opacity = "0"
      blobRefs.current.forEach((blob) => blob?.style.setProperty("opacity", "1"))
      setGooBlur(gooRef.current, blur)
    },
    [],
  )

  /* Cross-fade back to the identical crisp picture while the blur is still at
     its working width: thinning the rim on screen blinks every border, so the
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
    auxLean: 0.22,
    root: () => rootRef.current,
    triggerBits: bits,
    triggerStretchBits: stretchBits,
    triggerIcon: () => iconRef.current,
    chain: () => chainRefs.current,
    auxBits: dropBits,
    liquidOn: (target) => {
      /* Every blob stays in the goo, so a finger pulled into a neighbouring
         drop merges with it. */
      goLiquid(BLUR_GRAB)
      const held =
        target === "trigger" ? triggerBlobRef.current : blobRefs.current[target as number]
      /* The held piece and its finger wear the button's own hover tint, mixed
         rather than taken from a token: `--muted` is a whole step lighter than
         the surface in dark mode, which turns a 5% wash into a grey slug and
         swallows the rim along with it. */
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
      fan.drops.forEach((drop, i) => {
        animate(
          dropBits(i),
          {
            scaleX: opened ? 1 : REST_SCALE,
            scaleY: opened ? 1 : REST_SCALE,
            rotate: opened ? 0 : drop.rest,
            x: 0,
            y: 0,
          },
          { duration: instant ? 0 : 0.2 },
        )
        dropFade(i).forEach((el) => {
          ;(el as HTMLElement).style.opacity = opened ? "1" : "0"
        })
      })
      animate(bits(), { scaleX: 1, scaleY: 1, x: 0, y: 0 }, { duration: instant ? 0 : 0.2 })
      animate(chainRefs.current.filter(isEl), { scale: 0, x: 0, y: 0 }, { duration: 0 })
      if (iconRef.current) {
        animate(iconRef.current, { rotate: opened ? 135 : 0 }, { duration: instant ? 0 : 0.2 })
      }
      if (gooRef.current) gooRef.current.style.opacity = "0"
      if (bodiesRef.current) bodiesRef.current.style.opacity = "1"
      rootRef.current?.removeAttribute("data-liquid")
    },
    [bits, dropBits, dropFade, fan.drops],
  )

  /* One layout pass on mount, and again only when the number of drops changes.
     Keyed on anything finer, an incidental re-render - and mapping `items`
     inline in JSX causes one on every state change - would re-run this, snap a
     choreography mid-flight back to its rest pose and kill the animations
     carrying it. `layout` is read through a ref so it can stay out of the deps. */
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
    /* The trigger swells and HOLDS while the drops gather - pressure building -
       and only lets go once the first one has fired. x/y come home too, in case
       the click landed at the end of a sponge stretch. */
    play(
      animate(bits(), { x: 0, y: 0, scaleX: 1.16, scaleY: 1.16 }, { duration: 0.17, ease: EASE_OUT_STRONG }),
      animate(bits(), { scaleX: 1, scaleY: 1 }, { ...SPRING_HOUSE, delay: 0.2 }),
      animate(stretchBits(), { rotate: 0 }, { duration: 0 }),
      animate(chainRefs.current.filter(isEl), { x: 0, y: 0, scale: 0 }, { duration: 0.2, ease: EASE_OUT_STRONG }),
      /* The plus spins itself into a cross: a 135° throw that overshoots and
         rings back into place with everything else. */
      iconRef.current && animate(iconRef.current, { rotate: 135 }, { ...SPRING_HOUSE, delay: 0.04 }),
    )

    fan.drops.forEach((_drop, i) => {
      const start = 0.03 + i * 0.045
      play(
        animate(dropBits(i), { scaleX: 0.42, scaleY: 0.42 }, { duration: 0.16, ease: "easeInOut", delay: start }),
        /* The two axes ride the same spring 30ms out of phase - height leads,
           width lags - which is the whole squash-and-stretch of a drop. */
        animate(dropBits(i), { scaleY: 1, rotate: 0 }, { ...SPRING_POP, delay: start + 0.16 }),
        animate(dropBits(i), { scaleX: 1 }, { ...SPRING_POP, delay: start + 0.19 }),
        animate(dropFade(i), { opacity: [0, 1] }, { duration: 0.13, ease: EASE_OUT_STRONG, delay: start + 0.18 }),
      )
    })

    handoff(0.56, 0.22)
  }, [bits, clearTint, commit, dropBits, dropFade, fan.drops, goLiquid, handoff, killRun, layout, stretch, stretchBits])

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
      play(
        animate(bits(), { x: 0, y: 0 }, { duration: 0.18, ease: EASE_OUT_STRONG }),
        animate(stretchBits(), { rotate: 0 }, { duration: 0 }),
        animate(chainRefs.current.filter(isEl), { x: 0, y: 0, scale: 0 }, { duration: 0.2, ease: EASE_OUT_STRONG }),
        iconRef.current && animate(iconRef.current, { rotate: 0 }, SPRING_HOUSE),
        /* Carry the pressed squash back up first when the close came from the
           button itself. */
        fromTrigger ? animate(bits(), { scaleX: 1, scaleY: 1 }, { ...SPRING_HOUSE, delay: 0 }) : undefined,
      )

      /* Last out, first in: a blink of wind-up, then a plunge into the button,
         width leading and height trailing. The glyph dissolves INTO the plunge
         once the drop is visibly deforming, never leaving an empty ring. */
      fan.drops.forEach((drop, i) => {
        const start = 0.1 + (fan.drops.length - 1 - i) * 0.04
        play(
          animate(dropBits(i), { scaleX: REST_SCALE }, { duration: 0.18, ease: EASE_ANTICIPATE, delay: start }),
          animate(
            dropBits(i),
            { scaleY: REST_SCALE, rotate: drop.rest },
            { duration: 0.18, ease: EASE_ANTICIPATE, delay: start + 0.04 },
          ),
          animate(dropFade(i), { opacity: [1, 0] }, { duration: 0.1, ease: "easeIn", delay: start + 0.06 }),
        )
      })

      /* The drops land IN the button and the button is liquid too: a splat, a
         slosh back, then it rings itself round again. */
      play(
        animate(
          bits(),
          { scaleX: [1.16, 0.96, 1], scaleY: [0.86, 1.05, 1] },
          { duration: 0.54, times: [0.15, 0.35, 1], ease: "easeOut", delay: 0.32 },
        ),
      )

      handoff(0.46)
    },
    [bits, clearTint, commit, dropBits, dropFade, fan.drops, goLiquid, handoff, killRun, layout, stretch, stretchBits],
  )

  const toggle = () => {
    if (stretch.consumeClick()) return
    if (isOpen) runClose(true)
    else runOpen()
  }

  /* Outside press and Escape close, and Escape puts focus back on the trigger. */
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
  const surface =
    "bg-background border-border rounded-full border shadow-[0_3px_6px_-1px_rgb(0_0_0/0.10)]"
  /* While the liquid owns the picture the crisp hover discs step aside: painted
     over the moving goo they read as a second border. */
  const hit =
    "text-foreground/80 hover:text-foreground hover:bg-foreground/5 [[data-liquid]_&]:bg-transparent focus-visible:outline-foreground absolute grid place-items-center rounded-full outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-1"

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
            className={cn("absolute", surface)}
            style={{ width: BUTTON, height: BUTTON, left: 0, top: 0 }}
          />
          {fan.drops.map((drop, i) => (
            <div
              key={items[i].id ?? items[i].label}
              ref={(el) => {
                bodyRefs.current[i] = el
              }}
              className={cn("absolute", surface)}
              style={{
                width: BUTTON,
                height: BUTTON,
                left: drop.dx,
                top: drop.dy,
                /* Scaling around the trigger's centre is what makes a drop grow
                   out of the button rather than out of thin air. */
                transformOrigin: `${HALF - drop.dx}px ${HALF - drop.dy}px`,
              }}
            />
          ))}
        </div>

        {/* Layer 2 - the liquid. A real <svg>, because Safari will not reliably
            repaint a CSS `filter: url()` on an HTML element whose children
            animate. It draws its own rim and one shadow for the whole mass. */}
        <svg
          ref={gooRef}
          width={fan.width}
          height={fan.height}
          viewBox={`0 0 ${fan.width} ${fan.height}`}
          className="pointer-events-none absolute overflow-visible opacity-0"
          style={{
            left: HALF - fan.cx,
            top: HALF - fan.cy,
            filter: "drop-shadow(0 3px 6px rgb(0 0 0 / 0.10))",
          }}
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <GooFilter id={gooId} width={fan.width} height={fan.height} blur={BLUR_REST} />
          </defs>
          <g filter={`url(#${gooId})`}>
            <circle
              ref={triggerBlobRef}
              cx={fan.cx}
              cy={fan.cy}
              r={HALF}
              className="fill-background [transform-box:fill-box] [transform-origin:50%_50%]"
            />
            {GRAB_CHAIN.map((link, i) => (
              <circle
                key={link.follow}
                ref={(el) => {
                  chainRefs.current[i] = el
                }}
                cx={fan.cx}
                cy={fan.cy}
                r={11}
                className="fill-background [transform-box:fill-box] [transform-origin:50%_50%]"
              />
            ))}
            {fan.drops.map((drop, i) => (
              <circle
                key={items[i].id ?? items[i].label}
                ref={(el) => {
                  blobRefs.current[i] = el
                }}
                cx={fan.cx + drop.dx}
                cy={fan.cy + drop.dy}
                r={HALF}
                className="fill-background [transform-box:fill-box]"
                style={{ transformOrigin: `${HALF - drop.dx}px ${HALF - drop.dy}px` }}
              />
            ))}
          </g>
        </svg>

        {/* Layer 3 - glyphs and hit areas, riding the same tweens above the
            liquid, so the icons stay crisp and the accessibility lives in real
            DOM buttons. */}
        <div id={menuId} role="menu" aria-label={label} inert={!isOpen} className="absolute inset-0">
          {fan.drops.map((drop, i) => (
            <button
              key={items[i].id ?? items[i].label}
              ref={(el) => {
                dropRefs.current[i] = el
              }}
              type="button"
              role="menuitem"
              aria-label={items[i].label}
              className={cn(hit, "opacity-0")}
              style={{
                width: BUTTON,
                height: BUTTON,
                left: drop.dx,
                top: drop.dy,
                transformOrigin: `${HALF - drop.dx}px ${HALF - drop.dy}px`,
              }}
              onClick={() => {
                if (stretch.consumeClick()) return
                items[i].onSelect?.()
                runClose(false)
              }}
              onPointerDown={(event) => stretch.beginGrab(i, event, { x: drop.dx, y: drop.dy })}
              onPointerMove={(event) => stretch.pointerMove(event)}
              onPointerUp={() => stretch.release()}
              onPointerCancel={() => stretch.release()}
            >
              {items[i].icon}
            </button>
          ))}
        </div>

        <button
          ref={triggerRef}
          type="button"
          className={cn(hit, "inset-0")}
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
export function PlusGlyph() {
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
