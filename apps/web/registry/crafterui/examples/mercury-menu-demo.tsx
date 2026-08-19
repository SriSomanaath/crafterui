"use client"

import * as React from "react"
import { Image, Link2, Sparkles, Type } from "lucide-react"

import {
  MercuryMenu,
  type MercuryMenuItem,
} from "@/registry/crafterui/ui/mercury-menu"

// The panel grows a row taller for every item it is handed, and the goo canvas
// follows it - only the width is yours to set, because a squircle needs one.
const glyph = "size-3.5 opacity-70"

const ITEMS: MercuryMenuItem[] = [
  { label: "Image", icon: <Image className={glyph} aria-hidden="true" /> },
  { label: "Heading", icon: <Type className={glyph} aria-hidden="true" /> },
  { label: "Embed", icon: <Link2 className={glyph} aria-hidden="true" /> },
  { label: "Generate", icon: <Sparkles className={glyph} aria-hidden="true" /> },
]

export default function MercuryMenuDemo() {
  const [picked, setPicked] = React.useState<string | null>(null)

  return (
    // Anchored low on the stage: the panel pours upward, so the room has to be
    // above it.
    <div className="bg-background text-foreground flex h-full min-h-[24rem] w-full flex-col items-center justify-end gap-6 pb-16">
      <MercuryMenu
        items={ITEMS.map((item) => ({
          ...item,
          onSelect: () => setPicked(item.label),
        }))}
        size={80}
        panelWidth={168}
        label="Insert block"
      />
      <p className="text-muted-foreground h-5 text-sm">
        {picked ? `Inserted ${picked.toLowerCase()}` : null}
      </p>
    </div>
  )
}
