"use client"

import {
  DitherHelixCarousel,
  type DitherHelixItem,
} from "@/registry/crafterui/ui/dither-helix-carousel"

// Placeholder art served straight off the crafterui CDN so the demo works the
// moment it is installed - no assets to copy into your public/. Swap the names
// and the titles for your own index. The art is cover-fitted into the card
// shape, so set `cardRatio` to whatever your own pictures are (these are 9:16).
const ART = (name: string) =>
  `/art/${name}.jpg`

const WORK: DitherHelixItem[] = [
  { image: ART("prismatic-rift-anime"), title: "Prismatic Rift" },
  { image: ART("black-hole-ember-clouds"), title: "Ember Clouds" },
  { image: ART("neon-cave-portal-silhouette"), title: "Neon Portal" },
  { image: ART("red-ribbon-typography"), title: "Red Ribbon" },
  { image: ART("celestial-light-figure"), title: "Celestial" },
  { image: ART("neon-portrait-uplight"), title: "Uplight" },
  { image: ART("indigo-liquid-marble"), title: "Indigo Marble" },
  { image: ART("rocket-launch-gradient"), title: "Launch Window" },
  { image: ART("astronaut-cosmic-wave"), title: "Cosmic Wave" },
]

export default function DitherHelixCarouselDemo() {
  return (
    <DitherHelixCarousel
      items={WORK}
      brand="crafterui"
      cell={7.5}
      focusBand={0.28}
      twist={0.8}
      rise={0.79}
      cardRatio={0.56}
    />
  )
}
