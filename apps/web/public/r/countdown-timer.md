# Countdown Timer

A full-screen countdown with fluid rolling digits, play/pause and reset controls, and auto-loop, built with NumberFlow and Motion.

- Demo: https://crafterui.dev/components/countdown-timer
- Install: `npx @crafterui/cli@latest components add countdown-timer` - or `npx shadcn@latest add https://crafterui.dev/r/countdown-timer.json`
- Dependencies: @number-flow/react, motion, lucide-react
- Installs to: `registry/crafterui/ui/countdown-timer.tsx`

## Usage

```tsx
"use client"

import { CountdownTimer } from "@/registry/crafterui/ui/countdown-timer"

export default function CountdownTimerDemo() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background text-foreground">
      <CountdownTimer
        duration={33}
        autoStart
        loop
        label="Countdown with Number Flow"
        accentColor="#ff3828"
        digitClassName="font-bebas-neue"
      />
    </div>
  )
}
```

## Source - `registry/crafterui/ui/countdown-timer.tsx`

```tsx
"use client"

import * as React from "react"
import NumberFlow, { NumberFlowGroup } from "@number-flow/react"
import { Pause, Play, RotateCcw } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import { cn } from "@/lib/utils"

interface CountdownTimerProps {
  /** Starting time in seconds. */
  duration?: number
  /** Begin counting down immediately on mount. */
  autoStart?: boolean
  /** Restart automatically when the timer reaches zero. */
  loop?: boolean
  /** Render the play/pause and reset controls. */
  showControls?: boolean
  /** Small uppercase caption shown above the numerals with a connector line. */
  label?: string
  /** Accent color used for the primary play/pause control. */
  accentColor?: string
  /** Called once the timer reaches zero (not fired while looping). */
  onComplete?: () => void
  /** Classes for the root element. */
  className?: string
  /** Classes applied to the numerals — set the display font here. */
  digitClassName?: string
}

export function CountdownTimer({
  duration = 33,
  autoStart = true,
  loop = false,
  showControls = true,
  label,
  accentColor = "#ff3828",
  onComplete,
  className,
  digitClassName,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = React.useState(duration)
  const [running, setRunning] = React.useState(autoStart)

  // Reset when the configured duration changes.
  React.useEffect(() => {
    setTimeLeft(duration)
  }, [duration])

  React.useEffect(() => {
    if (!running) return

    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (loop) return duration
          setRunning(false)
          return 0
        }
        return t - 1
      })
    }, 1000)

    return () => clearInterval(id)
  }, [running, loop, duration])

  React.useEffect(() => {
    if (timeLeft === 0 && !loop) onComplete?.()
  }, [timeLeft, loop, onComplete])

  const toggle = () => {
    // Restart from the top if toggled after completion.
    if (timeLeft === 0) setTimeLeft(duration)
    setRunning((r) => !r)
  }

  const reset = () => {
    setRunning(false)
    setTimeLeft(duration)
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <div
      className={cn(
        "[container-type:size] relative flex h-full w-full flex-col items-center justify-center gap-8",
        className
      )}
    >
      {label ? (
        <div className="absolute top-[11%] left-1/2 grid -translate-x-1/2 justify-items-center text-center">
          <span className="relative max-w-[12ch] text-[0.7rem] leading-tight tracking-wide uppercase opacity-40 after:absolute after:top-full after:left-1/2 after:h-16 after:w-px after:bg-gradient-to-b after:from-transparent after:to-current after:content-['']">
            {label}
          </span>
        </div>
      ) : null}

      <NumberFlowGroup>
        <div
          className={cn(
            "flex items-baseline leading-none font-bold tracking-tight tabular-nums",
            "text-[clamp(2rem,min(26cqw,40cqh),16rem)]",
            digitClassName
          )}
        >
          <NumberFlow value={minutes} trend={-1} />
          <span className="px-[0.04em]">:</span>
          <NumberFlow
            value={seconds}
            trend={-1}
            format={{ minimumIntegerDigits: 2 }}
          />
        </div>
      </NumberFlowGroup>

      {showControls ? (
        <div className="flex w-fit items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            aria-label={running ? "Pause timer" : "Start timer"}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-transform active:scale-90"
            style={{ backgroundColor: accentColor }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={running ? "pause" : "play"}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.15 }}
              >
                {running ? (
                  <Pause className="h-4 w-4 fill-current" />
                ) : (
                  <Play className="h-4 w-4 fill-current" />
                )}
              </motion.span>
            </AnimatePresence>
          </button>

          <button
            type="button"
            onClick={reset}
            aria-label="Reset timer"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.06] shadow-sm transition-transform active:scale-90 dark:bg-white/10"
            style={{ color: accentColor }}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  )
}
```
