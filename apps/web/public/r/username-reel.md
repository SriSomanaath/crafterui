# Username Reel

A slot-machine handle picker that spins a vertical reel of names past a fixed prefix, highlighting the centered one, then decelerates and lands on a final username, built with Motion.

- Demo: https://crafterui.com/components/username-reel
- Install: `npx @crafterui/cli@latest components add username-reel` - or `npx shadcn@latest add https://crafterui.com/r/username-reel.json`
- Dependencies: motion
- Installs to: `registry/crafterui/ui/username-reel.tsx`

## Usage

```tsx
"use client"

import { UsernameReel } from "@/registry/crafterui/ui/username-reel"

const NAMES = [
  "adeline",
  "dennis",
  "michele",
  "eike",
  "may-li",
  "clara",
  "tito",
  "silvan",
  "noor",
  "ravi",
  "yuki",
  "mateo",
  "joon",
  "amara",
]

export default function UsernameReelDemo() {
  return (
    <div className="bg-background flex h-full min-h-[460px] w-full items-center justify-center">
      <UsernameReel
        names={NAMES}
        finalName="username"
        prefix="bento.me/"
        highlightColor="#6366f1"
        loop
      />
    </div>
  )
}
```

## Source - `registry/crafterui/ui/username-reel.tsx`

```tsx
"use client"

// Inspired by the bento.me username picker hero animation.
import * as React from "react"
import { animate, motion, useMotionValue } from "motion/react"

import { cn } from "@/lib/utils"

const DEFAULT_NAMES = [
  "adeline",
  "dennis",
  "michele",
  "eike",
  "may-li",
  "clara",
  "tito",
  "silvan",
  "noor",
  "ravi",
  "yuki",
  "mateo",
]

type Phase = "spinning" | "landed" | "done"

export interface UsernameReelProps {
  /** Names that scroll past in the reel. @default a built-in sample set */
  names?: string[]
  /** The handle the reel lands on. @default "username" */
  finalName?: string
  /** Static prefix shown before the reel, e.g. a domain. @default "bento.me/" */
  prefix?: string
  /** Visible rows in the reel viewport (odd numbers center cleanly). @default 7 */
  rows?: number
  /** How many times `names` repeats before the final handle (more = longer scroll). @default 3 */
  cycles?: number
  /** Scroll duration in seconds before it settles. @default 4.5 */
  spinDuration?: number
  /** Color the final handle pulses to as it lands (any CSS color). @default "#6366f1" */
  highlightColor?: string
  /** Color of the names while scrolling. @default "var(--muted-foreground)" */
  placeholderColor?: string
  /** Replay the whole scroll on a loop (great for previews). @default false */
  loop?: boolean
  /** Pause in ms on the final handle before replaying when `loop`. @default 2000 */
  loopDelay?: number
  /** Extra classes for the outer container. @default undefined */
  className?: string
}

function shuffle<T>(input: T[]): T[] {
  const arr = [...input]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function UsernameReel({
  names = DEFAULT_NAMES,
  finalName = "username",
  prefix = "bento.me/",
  rows = 7,
  cycles = 3,
  spinDuration = 4.5,
  highlightColor = "#6366f1",
  placeholderColor = "var(--muted-foreground)",
  loop = false,
  loopDelay = 2000,
  className,
}: UsernameReelProps) {
  const [runId, setRunId] = React.useState(0)
  const [rowH, setRowH] = React.useState(0)
  const [phase, setPhase] = React.useState<Phase>("spinning")

  const y = useMotionValue(0)
  const measureRef = React.useRef<HTMLDivElement>(null)

  // The handle sits just below the cycles (with a little filler beneath it so the
  // viewport stays full). The scroll runs DOWN the reel and settles onto it last,
  // so the username descends from the top and lands at the very end.
  const half = Math.floor(rows / 2)
  const reel = React.useMemo(() => {
    const filler = shuffle(names).slice(0, half)
    const list: string[] = [...filler, finalName]
    for (let c = 0; c < Math.max(1, cycles); c++) list.push(...shuffle(names))
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [names, finalName, cycles, half, runId])

  const finalIndex = half
  const lastIndex = reel.length - 1
  const startIndex = Math.max(finalIndex + 1, lastIndex - half)
  const viewportH = rowH * rows

  const offsetFor = React.useCallback(
    (i: number) => viewportH / 2 - (i * rowH + rowH / 2),
    [viewportH, rowH]
  )

  // Measure one row so the geometry is font-size agnostic.
  React.useLayoutEffect(() => {
    const h = measureRef.current?.offsetHeight ?? 0
    if (h && h !== rowH) setRowH(h)
  }, [rowH])

  // Drive the scroll: start on the last row, glide down, settle on the handle.
  React.useEffect(() => {
    if (!rowH) return
    setPhase("spinning")

    const prefersReduced =
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

    let landTimer: number | undefined
    let loopTimer: number | undefined

    if (prefersReduced) {
      y.set(offsetFor(finalIndex))
      setPhase("done")
      return
    }

    y.set(offsetFor(startIndex))
    const controls = animate(y, offsetFor(finalIndex), {
      duration: spinDuration,
      // Gentle ease-in-out — smooth start, smooth stop, no whip.
      ease: [0.65, 0, 0.35, 1],
      onComplete: () => {
        setPhase("landed") // username pulses to the highlight color
        landTimer = window.setTimeout(() => {
          setPhase("done") // then eases back to the normal color
          if (loop) {
            loopTimer = window.setTimeout(
              () => setRunId((r) => r + 1),
              loopDelay
            )
          }
        }, 850)
      },
    })

    return () => {
      controls.stop()
      window.clearTimeout(landTimer)
      window.clearTimeout(loopTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowH, runId])

  const finalColor =
    phase === "landed"
      ? highlightColor
      : phase === "done"
        ? "var(--foreground)"
        : placeholderColor

  return (
    <div
      className={cn(
        "bg-background text-foreground flex h-full w-full items-center justify-center overflow-hidden px-6",
        className
      )}
    >
      <div className="flex items-center text-4xl font-medium tracking-tight sm:text-6xl">
        <span className="text-muted-foreground shrink-0 whitespace-nowrap">
          {prefix}
        </span>

        <div className="relative overflow-hidden" style={{ height: viewportH }}>
          {/* Hidden probe to measure a single row's height. */}
          <div
            ref={measureRef}
            aria-hidden
            className="pointer-events-none invisible absolute leading-[1.2] whitespace-nowrap"
          >
            {finalName}
          </div>

          <motion.div
            style={{ y }}
            className={cn(
              "transform-gpu will-change-transform",
              rowH ? "" : "opacity-0"
            )}
          >
            {reel.map((name, i) => {
              const isFinal = i === finalIndex
              return (
                <div
                  key={i}
                  className="leading-[1.2] whitespace-nowrap transition-[color,opacity] duration-500 ease-out"
                  style={{
                    color: isFinal ? finalColor : placeholderColor,
                    opacity: !isFinal && phase !== "spinning" ? 0 : 1,
                  }}
                >
                  {name}
                </div>
              )
            })}
          </motion.div>

          {/* Clean edge fades (background overlays — cheaper than a mask). */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0"
            style={{
              height: rowH * 1.5,
              background:
                "linear-gradient(to bottom, var(--background), transparent)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0"
            style={{
              height: rowH * 1.5,
              background:
                "linear-gradient(to top, var(--background), transparent)",
            }}
          />
        </div>
      </div>
    </div>
  )
}
```
