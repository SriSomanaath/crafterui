# Dynamic Island

An Apple-style Dynamic Island that morphs between idle, ring, silent, and timer states with spring physics and blurred content cross-fades using Motion.

- Demo: https://crafterui.com/components/dynamic-island
- Install: `npx @crafterui/cli@latest components add dynamic-island` - or `npx shadcn@latest add https://crafterui.com/r/dynamic-island.json`
- Dependencies: motion
- Installs to: `registry/crafterui/ui/dynamic-island.tsx`

## Usage

```tsx
"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  DynamicIsland,
  ISLAND_ACCENTS,
  ISLAND_STATES,
  type IslandState,
} from "@/registry/crafterui/ui/dynamic-island"

const LABELS: Record<IslandState, string> = {
  idle: "Idle",
  ring: "Ring",
  silent: "Silent",
  timer: "Timer",
}

export default function DynamicIslandDemo() {
  const [state, setState] = React.useState<IslandState>("silent")

  return (
    <div className="flex w-full flex-col items-center gap-12 py-12">
      <DynamicIsland state={state} onStateChange={setState} timerSeconds={30} />

      {/* Controls live in the demo, not the component: the island is driven
          entirely through the `state` / `onStateChange` props. */}
      <div className="flex items-center justify-center gap-7">
        {ISLAND_STATES.map((key) => {
          const isActive = key === state
          const accent = ISLAND_ACCENTS[key]
          return (
            <button
              key={key}
              type="button"
              onClick={() => setState(key)}
              aria-pressed={isActive}
              className={cn(
                "cursor-pointer text-sm font-medium transition-colors",
                "focus-visible:underline focus-visible:underline-offset-4 focus-visible:outline-none",
                isActive
                  ? accent
                    ? ""
                    : "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              style={isActive && accent ? { color: accent } : undefined}
            >
              {LABELS[key]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

## Source - `registry/crafterui/ui/dynamic-island.tsx`

```tsx
"use client"

import * as React from "react"
import {
  AnimatePresence,
  MotionConfig,
  motion,
  type Transition,
} from "motion/react"

import { cn } from "@/lib/utils"

/** The visual state the Dynamic Island can morph between. */
export type IslandState = "idle" | "ring" | "silent" | "timer"

/** Every state, in display order - handy for building your own controls. */
export const ISLAND_STATES: readonly IslandState[] = [
  "idle",
  "ring",
  "silent",
  "timer",
]

export interface DynamicIslandProps {
  /**
   * Drive the state from outside (controlled). Leave undefined to let the
   * island own its state and start from `defaultState`. @default undefined
   */
  state?: IslandState
  /** State to start in when uncontrolled. @default "silent" */
  defaultState?: IslandState
  /** Extra classes for the outer wrapper. @default undefined */
  className?: string
  /** Called whenever the state changes, from either the caller or the timer. @default undefined */
  onStateChange?: (state: IslandState) => void
  /**
   * Total seconds the timer state counts down from.
   * @default 30
   */
  timerSeconds?: number
}

/** Spring used for the island morph (size + radius) and the toggle thumb slide. */
const ISLAND_SPRING: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 30,
  mass: 0.9,
}

/** Tween for the content cross-fade. */
const CONTENT_TWEEN: Transition = {
  duration: 0.22,
  ease: "easeOut",
}

/** Per-state geometry of the pill. */
const GEOMETRY: Record<
  IslandState,
  { width: number; height: number; radius: number }
> = {
  idle: { width: 96, height: 28, radius: 32 },
  ring: { width: 148, height: 28, radius: 32 },
  silent: { width: 148, height: 28, radius: 32 },
  timer: { width: 264, height: 52, radius: 26 },
}

/**
 * Apple's system accents for each state. Exported so callers can colour their
 * own controls to match - these are the replica's fixed palette, not theme
 * tokens, because the island itself is always the device's black pill.
 */
export const ISLAND_ACCENTS: Partial<Record<IslandState, string>> = {
  ring: "#30D158",
  silent: "#FD4F30",
  timer: "#E9A23C",
}

const SILENT_RED = ISLAND_ACCENTS.silent!
const RING_GREEN = ISLAND_ACCENTS.ring!
const TIMER_AMBER = ISLAND_ACCENTS.timer!

/** Cross-fade variants: blur + scale in/out, Apple-style. */
const fade = {
  initial: { opacity: 0, filter: "blur(4px)", scale: 0.9 },
  animate: { opacity: 1, filter: "blur(0px)", scale: 1 },
  exit: { opacity: 0, filter: "blur(4px)", scale: 0.9 },
}

function BellIcon() {
  return (
    <svg
      className="absolute inset-0"
      width="11.25"
      height="12.75"
      viewBox="0 0 15 17"
      fill="none"
    >
      <path
        d="M1.17969 13.3125H13.5625C14.2969 13.3125 14.7422 12.9375 14.7422 12.3672C14.7422 11.5859 13.9453 10.8828 13.2734 10.1875C12.7578 9.64844 12.6172 8.53906 12.5547 7.64062C12.5 4.64062 11.7031 2.57812 9.625 1.82812C9.32812 0.804688 8.52344 0 7.36719 0C6.21875 0 5.40625 0.804688 5.11719 1.82812C3.03906 2.57812 2.24219 4.64062 2.1875 7.64062C2.125 8.53906 1.98438 9.64844 1.46875 10.1875C0.789062 10.8828 0 11.5859 0 12.3672C0 12.9375 0.4375 13.3125 1.17969 13.3125ZM7.36719 16.4453C8.69531 16.4453 9.66406 15.4766 9.76562 14.3828H4.97656C5.07812 15.4766 6.04688 16.4453 7.36719 16.4453Z"
        fill="white"
      />
    </svg>
  )
}

/** The diagonal slash that "draws" across the bell to mean silent. */
function BellSlash({ visible }: { visible: boolean }) {
  return (
    <div className="absolute inset-0">
      <div className="h-5 translate-x-[5.25px] -translate-y-[5px] rotate-[-40deg]">
        <motion.div
          className="w-fit overflow-hidden rounded-full"
          initial={false}
          animate={{ height: visible ? 16 : 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
        >
          <div className="flex h-4 w-[3px] items-center justify-center rounded-full bg-[#FD4F30]">
            <div className="h-full w-[0.75px] rounded-full bg-white" />
          </div>
        </motion.div>
      </div>
    </div>
  )
}

/**
 * Compact ring/silent display. A single colored thumb slides between the
 * bell (left) and the label (right), recoloring red<->green, while the bell
 * gains/loses its slash and the label swaps Silent<->Ring.
 */
function CompactContent({ state }: { state: "ring" | "silent" }) {
  const silent = state === "silent"
  return (
    <div className="relative h-[28px]" style={{ width: 148 }}>
      {/* Sliding thumb: left+red+narrow for Silent, right+green+wide for Ring. */}
      <motion.div
        className="absolute top-1/2 left-[5px] h-[18px] -translate-y-1/2 rounded-full"
        initial={false}
        animate={{
          width: silent ? 40 : 52,
          x: silent ? 0 : 82,
          backgroundColor: silent ? SILENT_RED : RING_GREEN,
        }}
        transition={ISLAND_SPRING}
      />

      {/* Bell, fixed on the left. Sits on the red thumb when silent. */}
      <span
        className="absolute top-1/2 left-[15px] block h-[12.75px] w-[11.25px] -translate-y-1/2"
        aria-hidden
      >
        <BellIcon />
        <BellSlash visible={silent} />
      </span>

      {/* Label, fixed on the right. Sits on the green thumb when ringing. */}
      <div className="absolute top-1/2 right-[18px] flex -translate-y-1/2 justify-end">
        <AnimatePresence initial={false} mode="popLayout">
          {silent ? (
            <motion.span
              key="silent"
              className="block text-xs font-semibold whitespace-nowrap text-[#FD4F30]"
              variants={fade}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={CONTENT_TWEEN}
            >
              Silent
            </motion.span>
          ) : (
            <motion.span
              key="ring"
              className="block text-xs font-semibold whitespace-nowrap text-white"
              variants={fade}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={CONTENT_TWEEN}
            >
              Ring
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function PauseGlyph() {
  return (
    <svg width="10" height="12" viewBox="0 0 10 12" fill="white">
      <rect x="0" width="3" height="12" rx="1.2" />
      <rect x="7" width="3" height="12" rx="1.2" />
    </svg>
  )
}

function PlayGlyph() {
  return (
    <svg width="11" height="12" viewBox="0 0 11 12" fill="white">
      <path d="M1 1L10 6L1 11Z" />
    </svg>
  )
}

function CloseGlyph() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 11 11"
      fill="none"
      stroke="white"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M1 1L10 10M10 1L1 10" />
    </svg>
  )
}

/** Timer content: amber pause + gray cancel controls and an amber countdown. */
function TimerContent({
  seconds,
  onCancel,
}: {
  seconds: number
  onCancel: () => void
}) {
  const [remaining, setRemaining] = React.useState(seconds)
  const [paused, setPaused] = React.useState(false)

  React.useEffect(() => {
    setRemaining(seconds)
    setPaused(false)
  }, [seconds])

  React.useEffect(() => {
    if (paused) return
    const id = window.setInterval(() => {
      setRemaining((r) => (r <= 0 ? 0 : r - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [paused])

  const mm = Math.floor(remaining / 60)
  const ss = remaining % 60

  return (
    <div
      className="flex h-[52px] items-center gap-2.5 pr-5 pl-2.5"
      style={{ width: 264 }}
    >
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-label={paused ? "Resume timer" : "Pause timer"}
        // White ring, not the theme's: these sit on the pill's fixed black, where
        // outline-foreground would be near-black on black under the light theme.
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95"
        style={{ backgroundColor: TIMER_AMBER }}
      >
        {paused ? <PlayGlyph /> : <PauseGlyph />}
      </button>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel timer"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#5A5A5E] transition-transform outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95"
      >
        <CloseGlyph />
      </button>
      <div className="ml-auto flex items-baseline gap-1.5">
        <span className="text-sm font-semibold" style={{ color: TIMER_AMBER }}>
          Timer
        </span>
        <span
          className="text-2xl font-semibold tabular-nums"
          style={{ color: TIMER_AMBER }}
        >
          {mm}:{ss.toString().padStart(2, "0")}
        </span>
      </div>
    </div>
  )
}

/**
 * An Apple "Dynamic Island": a pure-black pill that morphs its size,
 * radius and content between idle / ring / silent / timer states with
 * spring physics and blurred content cross-fades.
 *
 * Works uncontrolled (`defaultState`) or controlled (`state` + `onStateChange`).
 * It renders only the pill - drive it from your own UI, or copy the control
 * strip out of the demo.
 */
export function DynamicIsland({
  state: controlledState,
  defaultState = "silent",
  className,
  onStateChange,
  timerSeconds = 30,
}: DynamicIslandProps) {
  const [uncontrolled, setUncontrolled] =
    React.useState<IslandState>(defaultState)
  const state = controlledState ?? uncontrolled

  const setState = React.useCallback(
    (next: IslandState) => {
      if (controlledState === undefined) setUncontrolled(next)
      onStateChange?.(next)
    },
    [controlledState, onStateChange]
  )

  const geo = GEOMETRY[state]

  return (
    // One provider rather than a reduced-motion branch on each of the eight
    // transitions below: `user` keeps the opacity cross-fades and drops the
    // spring-driven size and radius morph, which is the part that moves.
    <MotionConfig reducedMotion="user">
    <div className={cn("relative w-fit", className)}>
      <motion.div
        className="w-fit overflow-hidden bg-black"
        initial={false}
        animate={{
          width: geo.width,
          height: geo.height,
          borderRadius: geo.radius,
        }}
        transition={ISLAND_SPRING}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {state === "idle" && (
            <motion.div
              key="idle"
              variants={fade}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={CONTENT_TWEEN}
              className="h-[28px] w-[96px]"
            />
          )}
          {state === "timer" && (
            <motion.div
              key="timer"
              variants={fade}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={CONTENT_TWEEN}
            >
              <TimerContent
                seconds={timerSeconds}
                onCancel={() => setState("idle")}
              />
            </motion.div>
          )}
          {(state === "ring" || state === "silent") && (
            <motion.div
              key="compact"
              variants={fade}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={CONTENT_TWEEN}
            >
              <CompactContent state={state} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
    </MotionConfig>
  )
}
```
