# Theme Toggle

A theme switcher that reveals the incoming light/dark mode across the page with View Transitions — circle, rectangle, polygon, gif and blurred-edge wipes from any direction.

- Demo: https://crafterui.dev/components/theme-toggle
- Install: `npx @crafterui/cli@latest components add theme-toggle` - or `npx shadcn@latest add https://crafterui.dev/r/theme-toggle.json`
- Dependencies: next-themes
- Installs to: `registry/crafterui/ui/theme-toggle.tsx`

## Usage

```tsx
"use client"

import * as React from "react"
import { GripHorizontal } from "lucide-react"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"
import {
  AnimatedThemeToggler,
  type ThemeToggleDirection,
  type ThemeToggleVariant,
} from "@/registry/crafterui/ui/theme-toggle"

const VARIANTS: ThemeToggleVariant[] = [
  "circle",
  "rectangle",
  "gif",
  "polygon",
  "circle-blur",
]

const DIRECTIONS: ThemeToggleDirection[] = [
  "bottom-up",
  "top-down",
  "left-right",
  "right-left",
]

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly T[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <span className="w-12 shrink-0 text-sm opacity-50">{label} :</span>
      <div className="flex flex-wrap items-center justify-end gap-1">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              "hover:bg-foreground/10 cursor-pointer rounded px-1 text-sm transition-opacity hover:opacity-100",
              value === option ? "opacity-100" : "opacity-50"
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ThemeToggleDemo() {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [variant, setVariant] = React.useState<ThemeToggleVariant>("circle")
  const [direction, setDirection] =
    React.useState<ThemeToggleDirection>("bottom-up")
  const [blur, setBlur] = React.useState(false)

  return (
    <div
      ref={containerRef}
      className="bg-background text-foreground relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-6 text-center"
    >
      <div className="mx-auto max-w-xl space-y-4">
        <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">
          Animated theme toggle
          <br />
          <span className="text-muted-foreground">switch the whole page</span>
        </h2>
        <p className="text-muted-foreground mx-auto max-w-md text-sm leading-relaxed text-balance">
          A View Transitions reveal that wipes the new theme across the page in
          the shape and direction you pick.
        </p>
      </div>

      <div className="mt-12 grid justify-items-center gap-5">
        <span className="after:from-background after:to-foreground relative max-w-[12ch] text-xs leading-tight uppercase opacity-40 after:absolute after:top-full after:left-1/2 after:h-10 after:w-px after:bg-gradient-to-b after:content-['']">
          Click to toggle the theme
        </span>
        <AnimatedThemeToggler
          variant={variant}
          start={direction}
          blur={blur}
          className="size-12"
        />
      </div>

      <div className="mt-9 flex flex-wrap items-start justify-center gap-3">
        {VARIANTS.map((preset) => (
          <div key={preset} className="flex w-16 flex-col items-center gap-1.5">
            <AnimatedThemeToggler
              variant={preset}
              start={direction}
              blur={blur}
              aria-label={`Toggle theme with ${preset} reveal`}
              onClick={() => setVariant(preset)}
              className={cn(
                "size-9",
                variant !== preset && "bg-background text-foreground"
              )}
            />
            <span
              className={cn(
                "text-[0.65rem] tracking-tight transition-opacity",
                variant === preset ? "opacity-100" : "opacity-50"
              )}
            >
              {preset}
            </span>
          </div>
        ))}
      </div>

      <motion.div
        drag
        dragConstraints={containerRef}
        dragElastic={0.12}
        dragMomentum={false}
        className="border-border/60 bg-muted/60 absolute right-4 bottom-6 flex w-[210px] flex-col gap-1 rounded-2xl border p-3 text-left backdrop-blur-sm"
      >
        <div className="flex items-center justify-between pb-1">
          <GripHorizontal className="size-4 cursor-grab opacity-50 active:cursor-grabbing" />
          <span className="text-sm opacity-50">Options</span>
        </div>
        <Segmented
          label="blur"
          options={["off", "on"] as const}
          value={blur ? "on" : "off"}
          onChange={(value) => setBlur(value === "on")}
        />
        <Segmented
          label="start"
          options={DIRECTIONS}
          value={direction}
          onChange={setDirection}
        />
      </motion.div>
    </div>
  )
}
```

## Source - `registry/crafterui/ui/theme-toggle.tsx`

```tsx
"use client"

// A theme toggle for crafterui built on the View Transitions API.
import * as React from "react"
import { useTheme } from "next-themes"
import { flushSync } from "react-dom"

import { cn } from "@/lib/utils"

export type ThemeToggleVariant =
  | "circle"
  | "circle-blur"
  | "rectangle"
  | "polygon"
  | "gif"

export type ThemeToggleDirection =
  | "center"
  | "top-down"
  | "bottom-up"
  | "left-right"
  | "right-left"

interface AnimatedThemeTogglerProps extends Omit<
  React.ComponentPropsWithoutRef<"button">,
  "children"
> {
  /** Shape of the theme reveal animation. */
  variant?: ThemeToggleVariant
  /** Where the reveal originates. "center" expands from the button. */
  start?: ThemeToggleDirection
  /** Add a soft fading blur to the incoming theme for a dreamy bloom. */
  blur?: boolean
  /** Reveal duration in milliseconds. */
  duration?: number
  /** CSS easing function for the reveal. */
  easing?: string
  /** Mask GIF url for the "gif" variant; falls back to a circle when omitted. */
  gifUrl?: string
  /** Custom icon. Defaults to a contrast glyph that flips with the theme. */
  children?: React.ReactNode
}

type ViewTransition = { ready: Promise<void>; finished: Promise<void> }
type DocumentVT = Document & {
  startViewTransition?: (callback: () => void) => ViewTransition
}

const STYLE_ID = "crafter-theme-toggle-vt"

// Disable the browser's default cross-fade so our clip/mask reveal stays crisp.
// Injected once by the component so it installs standalone (no manual CSS step).
const VT_CSS = `
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}
::view-transition-new(root) { z-index: 1; }
::view-transition-old(root) { z-index: 0; }
`

function ensureGlobalStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) {
    return
  }
  const style = document.createElement("style")
  style.id = STYLE_ID
  style.textContent = VT_CSS
  document.head.appendChild(style)
}

function originFor(
  direction: ThemeToggleDirection,
  rect: DOMRect,
  w: number,
  h: number
) {
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  switch (direction) {
    case "bottom-up":
      return { x: cx, y: h }
    case "top-down":
      return { x: cx, y: 0 }
    case "left-right":
      return { x: 0, y: cy }
    case "right-left":
      return { x: w, y: cy }
    default:
      return { x: cx, y: cy }
  }
}

function rectangleClip(direction: ThemeToggleDirection) {
  // inset(top right bottom left) — collapse onto the origin edge, expand to fill.
  switch (direction) {
    case "bottom-up":
      return "inset(100% 0 0 0)"
    case "top-down":
      return "inset(0 0 100% 0)"
    case "left-right":
      return "inset(0 100% 0 0)"
    case "right-left":
      return "inset(0 0 0 100%)"
    default:
      return "inset(50% 50% 50% 50%)"
  }
}

function polygonClip(direction: ThemeToggleDirection): [string, string] {
  // from/to must share the same vertex count + order to interpolate smoothly.
  const full = "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)"
  switch (direction) {
    case "bottom-up":
      return ["polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)", full]
    case "top-down":
      return ["polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)", full]
    case "left-right":
      return ["polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)", full]
    case "right-left":
      return ["polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)", full]
    default:
      // Diamond from the center, over-sized so it clears every corner.
      return [
        "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)",
        "polygon(50% -71%, 171% 50%, 50% 171%, -71% 50%)",
      ]
  }
}

function buildKeyframes(
  variant: ThemeToggleVariant,
  direction: ThemeToggleDirection,
  x: number,
  y: number,
  r: number,
  w: number,
  h: number,
  gifUrl?: string
): { keyframes: PropertyIndexedKeyframes; options?: KeyframeAnimationOptions } {
  const at = `${x}px ${y}px`
  // A growing mask box is anchored by its top-left corner, so the origin has to
  // slide by half the size at every step or the reveal crawls out of the corner
  // instead of radiating from (x, y). Both interpolate linearly, so two
  // endpoints keep it exactly centred for the whole animation.
  const centered = (sizes: number[], boxW: number, boxH: number) => ({
    size: sizes.map((s) => `${boxW * s}px ${boxH * s}px`),
    position: sizes.map((s) => `${x - (boxW * s) / 2}px ${y - (boxH * s) / 2}px`),
  })

  switch (variant) {
    case "rectangle":
      return {
        keyframes: { clipPath: [rectangleClip(direction), "inset(0px)"] },
      }

    case "polygon": {
      const [from, to] = polygonClip(direction)
      return { keyframes: { clipPath: [from, to] } }
    }

    case "circle-blur": {
      // A soft feathered edge needs a mask — clip-path can't blur its boundary.
      // The gradient is centred in its own box; the box is what moves and grows.
      const mask = "radial-gradient(circle at center, #000 55%, transparent 100%)"
      const { size, position } = centered([0, 4], w, h)
      return {
        keyframes: {
          maskImage: [mask, mask],
          WebkitMaskImage: [mask, mask],
          maskPosition: position,
          WebkitMaskPosition: position,
          maskRepeat: ["no-repeat", "no-repeat"],
          WebkitMaskRepeat: ["no-repeat", "no-repeat"],
          maskSize: size,
          WebkitMaskSize: size,
        },
      }
    }

    case "gif": {
      if (!gifUrl) break // graceful fallback to the circle reveal below
      const mask = `url("${gifUrl}")`
      // Let the gif play in place, then explode to flood the viewport.
      const vmax = Math.max(w, h) / 100
      const { size, position } = centered([0, 60 * vmax, 60 * vmax, 2000 * vmax], 1, 1)
      return {
        keyframes: {
          maskImage: [mask, mask, mask, mask],
          WebkitMaskImage: [mask, mask, mask, mask],
          maskPosition: position,
          WebkitMaskPosition: position,
          maskRepeat: ["no-repeat", "no-repeat", "no-repeat", "no-repeat"],
          WebkitMaskRepeat: [
            "no-repeat",
            "no-repeat",
            "no-repeat",
            "no-repeat",
          ],
          maskSize: size,
          WebkitMaskSize: size,
          offset: [0, 0.12, 0.85, 1],
        },
        options: { duration: 2400 },
      }
    }
  }

  // circle (default) and gif fallback.
  return {
    keyframes: {
      clipPath: [`circle(0px at ${at})`, `circle(${r}px at ${at})`],
    },
  }
}

export function AnimatedThemeToggler({
  variant = "circle",
  start = "center",
  blur = false,
  duration = 700,
  easing = "ease-in-out",
  gifUrl,
  children,
  className,
  onClick,
  ...props
}: AnimatedThemeTogglerProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  const animating = React.useRef(false)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    ensureGlobalStyles()
  }, [])

  // Read the theme only after mount so the icon doesn't mismatch on hydration.
  const isDark = mounted && resolvedTheme === "dark"

  const toggle = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event)

      const next = resolvedTheme === "dark" ? "light" : "dark"
      const doc =
        typeof document === "undefined" ? null : (document as DocumentVT)
      const reduceMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches

      // Fallback: no View Transitions, reduced motion, or already animating.
      if (
        !doc?.startViewTransition ||
        reduceMotion ||
        !buttonRef.current ||
        animating.current
      ) {
        setTheme(next)
        return
      }

      // Capture the origin before the snapshot invalidates layout.
      const w = window.innerWidth
      const h = window.innerHeight
      const { x, y } = originFor(
        start,
        buttonRef.current.getBoundingClientRect(),
        w,
        h
      )

      animating.current = true
      const transition = doc.startViewTransition(() => {
        // flushSync commits the theme class synchronously before the snapshot.
        flushSync(() => setTheme(next))
      })

      transition.ready.then(() => {
        // Farthest-corner radius reaches every corner from any origin.
        const r = Math.hypot(Math.max(x, w - x), Math.max(y, h - y))
        const { keyframes, options } = buildKeyframes(
          variant,
          start,
          x,
          y,
          r,
          w,
          h,
          gifUrl
        )
        const timing: KeyframeAnimationOptions = {
          duration,
          easing,
          pseudoElement: "::view-transition-new(root)",
          ...options,
        }

        document.documentElement.animate(keyframes, timing)
        if (blur) {
          document.documentElement.animate(
            { filter: ["blur(12px)", "blur(0px)"] },
            timing
          )
        }
      })

      transition.finished.finally(() => {
        animating.current = false
      })
    },
    [
      resolvedTheme,
      setTheme,
      variant,
      start,
      blur,
      duration,
      easing,
      gifUrl,
      onClick,
    ]
  )

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label="Toggle theme"
      onClick={toggle}
      className={cn(
        "border-border bg-foreground text-background focus-visible:ring-ring inline-flex size-10 items-center justify-center rounded-full border transition outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-95",
        className
      )}
      {...props}
    >
      {children ?? (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={cn(
            "size-[1.15em] transition-transform duration-700",
            isDark && "rotate-180"
          )}
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" />
        </svg>
      )}
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}
```
