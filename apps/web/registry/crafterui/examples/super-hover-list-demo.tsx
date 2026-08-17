"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  SuperHoverList,
  type SuperHoverListItem,
} from "@/registry/crafterui/ui/super-hover-list"

const COVERS = [
  "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=300&h=300&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=300&h=300&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?w=300&h=300&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1486718448742-163732cd1544?w=300&h=300&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1448375240586-882707db888b?w=300&h=300&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=300&h=300&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?w=300&h=300&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=300&h=300&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=300&h=300&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=300&h=300&q=80&auto=format&fit=crop",
]

const TITLES = [
  "Selected Ambient Works 85-92",
  "Ambient 1 (Music For Airports)",
  "Ambient 4 (On Land)",
  "Slave Ambient",
  "Ambient Black Magic",
  "Pop Ambient 2015",
  "Hostile Ambient Takeover",
  "The Ambient Collection",
  "Ambient Senses",
  "Ambient Intermix",
  "Ambient Systems II",
  "Ambient 2 (The Plateaux Of Mirror)",
]
const ARTISTS = [
  "Aphex Twin",
  "Brian Eno",
  "Various",
  "The War On Drugs",
  "Moby",
  "Melvins",
  "Art Of Noise",
  "Laraaji",
]
const YEARS = [
  "1992",
  "1979",
  "1982",
  "2011",
  "2017",
  "2015",
  "2021",
  "1990",
  "1994",
  "1995",
  "1996",
  "1980",
]

const ITEMS: SuperHoverListItem[] = Array.from({ length: 36 }, (_, i) => ({
  id: i,
  title: TITLES[i % TITLES.length],
  subtitle: ARTISTS[i % ARTISTS.length],
  meta: YEARS[i % YEARS.length],
  image: COVERS[i % COVERS.length],
}))

export default function SuperHoverListDemo() {
  const [mode, setMode] = React.useState<"super" | "native">("super")

  return (
    <div className="bg-background relative flex h-full min-h-[460px] w-full flex-col">
      <ModeToggle mode={mode} onChange={setMode} />
      <div className="min-h-0 flex-1">
        <SuperHoverList items={ITEMS} mode={mode} autoplay speed={0.3} />
      </div>
    </div>
  )
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: "super" | "native"
  onChange: (mode: "super" | "native") => void
}) {
  return (
    <div className="flex shrink-0 items-center justify-center gap-1 pt-5 pb-1 text-sm">
      {(["super", "native"] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={cn(
            "rounded-full px-3 py-1 capitalize transition-colors",
            mode === value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {value} hover
        </button>
      ))}
    </div>
  )
}
