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
