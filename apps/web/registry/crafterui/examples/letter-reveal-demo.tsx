"use client"

import { LetterReveal } from "@/registry/crafterui/ui/letter-reveal"

export default function LetterRevealDemo() {
  return (
    <LetterReveal
      lines={["Craft is in the detail.", "Scroll to hear it land."]}
      className="bg-black text-white"
    />
  )
}
