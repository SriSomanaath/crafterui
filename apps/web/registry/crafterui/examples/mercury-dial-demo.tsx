"use client"

import * as React from "react"
import { Image, Square, Type } from "lucide-react"

import {
  MercuryDial,
  type MercuryDialItem,
} from "@/registry/crafterui/ui/mercury-dial"

// The dial fans however many drops it is handed - the arc widens to keep them
// from fusing - so an insert menu is just a list. Icons are yours; these are
// lucide at the size the 32px geometry expects, scaled with everything else.
const glyph = "size-3.5"

const ITEMS: MercuryDialItem[] = [
  { label: "Image", icon: <Image className={glyph} aria-hidden="true" /> },
  { label: "Text", icon: <Type className={glyph} aria-hidden="true" /> },
  { label: "Shape", icon: <Square className={glyph} aria-hidden="true" /> },
]

export default function MercuryDialDemo() {
  const [picked, setPicked] = React.useState<string | null>(null)

  return (
    // Anchored low on the stage: everything the dial opens goes upward, so the
    // room has to be above it.
    <div className="bg-background text-foreground flex h-full min-h-[24rem] w-full flex-col items-center justify-end gap-6 pb-16">
      <MercuryDial
        items={ITEMS.map((item) => ({
          ...item,
          onSelect: () => setPicked(item.label),
        }))}
        size={96}
        label="Insert"
      />
      <p className="text-muted-foreground h-5 text-sm">
        {picked ? `Inserted ${picked.toLowerCase()}` : null}
      </p>
    </div>
  )
}
