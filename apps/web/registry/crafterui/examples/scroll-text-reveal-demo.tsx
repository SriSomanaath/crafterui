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
