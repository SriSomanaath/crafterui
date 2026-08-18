"use client"

import {
  GlassLensCarousel,
  type GlassLensItem,
} from "@/registry/crafterui/ui/glass-lens-carousel"

// Placeholder art served straight off the crafterui CDN so the demo works the
// moment it is installed - no assets to copy into your public/. Swap the names
// and the copy for your own index - the row sizes itself to however many pieces
// it is handed, and each panel keeps its picture's own aspect.
const ART = (name: string) =>
  `/art/${name}.jpg`

const WORK: GlassLensItem[] = [
  { image: ART("prismatic-rift-anime"), title: "Prismatic Rift", caption: "Refraction study, stills" },
  { image: ART("black-hole-ember-clouds"), title: "Ember Clouds", caption: "Colour campaign" },
  { image: ART("neon-cave-portal-silhouette"), title: "Neon Portal", caption: "Key art, launch film" },
  { image: ART("red-ribbon-typography"), title: "Red Ribbon", caption: "Type in motion" },
  { image: ART("celestial-light-figure"), title: "Celestial", caption: "Editorial cover" },
  { image: ART("neon-portrait-uplight"), title: "Uplight", caption: "Portrait series" },
  { image: ART("indigo-liquid-marble"), title: "Indigo Marble", caption: "Identity and surface" },
  { image: ART("rocket-launch-gradient"), title: "Launch Window", caption: "Title sequence" },
  { image: ART("astronaut-cosmic-wave"), title: "Cosmic Wave", caption: "Campaign, art direction" },
]

export default function GlassLensCarouselDemo() {
  return (
    <GlassLensCarousel
      items={WORK}
      brand="crafterui"
      panelHeight={0.58}
      gap={14}
      radius={8}
      tint="#009dff"
      closeLabel="Close"
    />
  )
}
