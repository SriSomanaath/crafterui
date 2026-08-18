"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  SuperHoverList,
  type SuperHoverListItem,
} from "@/registry/crafterui/ui/super-hover-list"

// Placeholder cover art served straight off the crafterui CDN so the demo
// works the moment it is installed - no assets to copy into your public/.
const ART = (name: string) =>
  `/art/${name}.jpg`

const COVERS = [
  ART("prismatic-rift-anime"),
  ART("black-hole-ember-clouds"),
  ART("neon-cave-portal-silhouette"),
  ART("red-ribbon-typography"),
  ART("celestial-light-figure"),
  ART("neon-portrait-uplight"),
  ART("indigo-liquid-marble"),
  ART("rocket-launch-gradient"),
  ART("astronaut-cosmic-wave"),
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
