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
