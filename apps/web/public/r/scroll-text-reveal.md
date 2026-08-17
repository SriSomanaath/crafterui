# Scroll Text Reveal

A scroll-pinned paragraph where each word slides in from the right and brightens from dim to full, one by one, as it scrolls into view, built with Motion.

- Demo: https://crafterui.dev/components/scroll-text-reveal
- Install: `npx @crafterui/cli@latest components add scroll-text-reveal` - or `npx shadcn@latest add https://crafterui.dev/r/scroll-text-reveal.json`
- Dependencies: motion
- Installs to: `registry/crafterui/ui/scroll-text-reveal.tsx`

## Usage

```tsx
"use client"

import { ScrollTextReveal } from "@/registry/crafterui/ui/scroll-text-reveal"

const story =
  "Here our journey begins. From (2020 → 2024) we built something incredible. Starting with late-night coding sessions and ending with AI that actually understands you. Pretty cool right?"

export default function ScrollTextRevealDemo() {
  return (
    <div className="h-full w-full overflow-clip">
      <ScrollTextReveal text={story} side="left" />
    </div>
  )
}
```

## Source - `registry/crafterui/ui/scroll-text-reveal.tsx`

```tsx
"use client"

// A scroll-pinned, word-by-word reveal for the crafterui registry. Built on the
// same self-contained scroll plumbing as StickyCardStack: an internal scroll
// container (no window scroll / no Lenis), driven by Motion and sized in
// container-query units so it works inside the small gallery preview box just
// as well as full screen. As you scroll the tall track, a sticky inner panel
// pins a large paragraph to the center while each word, in turn, SLIDES IN FROM
// THE RIGHT and brightens from `dimOpacity` to full as its overlapping slice of
// scroll progress passes — so a few words are always mid-entrance, reading as a
// soft front of words flying in from the right rather than a hard cursor.
import * as React from "react"
import { motion, useScroll, useTransform, type MotionValue } from "motion/react"

import { cn } from "@/lib/utils"

export interface ScrollTextRevealProps {
  /** The paragraph to reveal word by word. */
  text: string
  /** Which side the text column sits on. @default "left" */
  side?: "left" | "right"
  /** Opacity of not-yet-revealed words. @default 0.18 */
  dimOpacity?: number
  /**
   * How far to the right each word starts before sliding into place, as a CSS
   * length (em scales with the type). Set to `"0em"` for a pure opacity reveal.
   * @default "1.2em"
   */
  slideDistance?: string
  /** Small caption + thread line at the top; pass `null` to hide. @default "Scroll to read" */
  label?: string | null
  /** Extra classes on the root surface. */
  className?: string
  /** Extra classes on the <p>. */
  textClassName?: string
}

function Word({
  word,
  index,
  total,
  progress,
  dimOpacity,
  slideDistance,
}: {
  word: string
  index: number
  total: number
  progress: MotionValue<number>
  dimOpacity: number
  slideDistance: string
}) {
  // Each word owns a slice of the first 85% of scroll, and its window overlaps
  // its neighbours (~3 word-slices wide) so several words animate at once —
  // that overlap is what makes the entrance read as a soft front of words
  // flying in rather than a hard on/off boundary. It finishes before progress 1.
  const start = (index / total) * 0.85
  const rawEnd = start + (1 / total) * 3
  // Guarantee a strictly-increasing range for useTransform, clamped to <= 1.
  const end = Math.min(1, Math.max(start + 1e-4, rawEnd))

  // Over its slice the word travels from `slideDistance` to the right back to 0
  // (sliding in from the right) while fading from dim to full.
  const opacity = useTransform(progress, [start, end], [dimOpacity, 1], {
    clamp: true,
  })
  const x = useTransform(progress, [start, end], [slideDistance, "0em"], {
    clamp: true,
  })

  return (
    <motion.span
      aria-hidden="true"
      style={{ opacity, x }}
      className="mr-[0.25em] inline-block"
    >
      {word}
    </motion.span>
  )
}

export function ScrollTextReveal({
  text,
  side = "left",
  dimOpacity = 0.18,
  slideDistance = "1.2em",
  label = "Scroll to read",
  className,
  textClassName,
}: ScrollTextRevealProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ container: scrollRef })

  // Deterministic, SSR-safe split — collapse runs of whitespace, drop empties.
  // No Math.random, no window access during render.
  const words = React.useMemo(() => text.split(/\s+/).filter(Boolean), [text])
  // Guard the slice math against an empty paragraph (avoids divide-by-zero).
  const total = Math.max(words.length, 1)

  const isRight = side === "right"

  return (
    <div
      className={cn(
        "bg-background text-foreground [container-type:size] relative h-full min-h-[24rem] w-full overflow-hidden",
        className
      )}
    >
      <div
        ref={scrollRef}
        className="relative h-full w-full [scrollbar-width:none] overflow-x-hidden overflow-y-auto [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* Tall scroll track gives the sticky panel something to travel across. */}
        <div className="relative h-[400cqh] w-full">
          <div
            className={cn(
              "sticky top-0 flex h-[100cqh] items-center px-[6cqw]",
              isRight ? "justify-end" : "justify-start"
            )}
          >
            <p
              role="text"
              aria-label={text}
              className={cn(
                "w-[62%] text-[5.5cqw] leading-[0.95] font-medium tracking-[-0.03em]",
                isRight ? "text-right" : "text-left",
                textClassName
              )}
            >
              {words.map((word, i) => (
                <Word
                  key={`${i}-${word}`}
                  word={word}
                  index={i}
                  total={total}
                  progress={scrollYProgress}
                  dimOpacity={dimOpacity}
                  slideDistance={slideDistance}
                />
              ))}
            </p>
          </div>
        </div>
      </div>

      {label !== null ? (
        <div className="pointer-events-none absolute inset-x-0 top-[7%] z-10 flex flex-col items-center text-center">
          <span className="text-muted-foreground text-xs leading-tight tracking-[0.22em] uppercase">
            {label}
          </span>
          <span className="bg-foreground/20 mt-3 h-10 w-px" />
        </div>
      ) : null}
    </div>
  )
}
```
