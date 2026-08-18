"use client"

import { LetterReveal } from "@/registry/crafterui/ui/letter-reveal"

export default function LetterRevealDemo() {
  return (
    // No surface override: the component paints bg-background/text-foreground, and
    // its caption and hairline read from the same tokens. Forcing a black panel
    // here left those near-invisible under the light theme.
    <LetterReveal lines={["Craft is in the detail.", "Scroll to hear it land."]} />
  )
}
