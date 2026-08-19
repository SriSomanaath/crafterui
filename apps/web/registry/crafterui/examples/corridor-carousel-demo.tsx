"use client"

import {
  CorridorCarousel,
  type CorridorCarouselItem,
} from "@/registry/crafterui/ui/corridor-carousel"

// Placeholder art served straight off the crafterui CDN so the demo works the
// moment it is installed - no assets to copy into your public/. Swap the names,
// titles and years for your own run; the corridor papers all four walls with
// however many pictures it is handed.
const ART = (name: string) =>
  `/art/${name}.jpg`

const RUN: CorridorCarouselItem[] = [
  { image: ART("prismatic-rift-anime"), title: "Prismatic Rift", meta: "0034" },
  { image: ART("black-hole-ember-clouds"), title: "Ember Clouds", meta: "0041" },
  { image: ART("neon-cave-portal-silhouette"), title: "Neon Portal", meta: "0056" },
  { image: ART("red-ribbon-typography"), title: "Red Ribbon", meta: "0063" },
  { image: ART("celestial-light-figure"), title: "Celestial", meta: "0072" },
  { image: ART("neon-portrait-uplight"), title: "Uplight", meta: "0080" },
  { image: ART("indigo-liquid-marble"), title: "Indigo Marble", meta: "0088" },
  { image: ART("rocket-launch-gradient"), title: "Launch Window", meta: "0095" },
  { image: ART("astronaut-cosmic-wave"), title: "Cosmic Wave", meta: "0102" },
]

export default function CorridorCarouselDemo() {
  // The run is periodic in depth, so the corridor repeats every `items.length x
  // tile` of travel. Drifting at exactly one tile a second puts it back on the
  // frame it started on every nine seconds - which is what makes the preview
  // clip on the browse wall loop with no cut to hide.
  return (
    <CorridorCarousel
      items={RUN}
      flow="out"
      speed={0.46}
      depth={3.4}
      aria-label="Studio archive, hung down a corridor"
    />
  )
}
