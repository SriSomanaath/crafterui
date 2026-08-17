"use client"

import {
  DitherHelixCarousel,
  type DitherHelixItem,
} from "@/registry/crafterui/ui/dither-helix-carousel"

// Placeholder imagery collected from Pinterest, saved under public/work. Swap
// the paths and the names for your own index. The art is cover-fitted into the
// card shape, so set `cardRatio` to whatever your own pictures are.
const WORK: DitherHelixItem[] = [
  { image: "/work/verdant.jpg", title: "Verdant" },
  { image: "/work/ember-field.jpg", title: "Ember Field" },
  { image: "/work/northbound.jpg", title: "Northbound" },
  { image: "/work/marigold.jpg", title: "Marigold" },
  { image: "/work/signal-grid.jpg", title: "Signal Grid" },
  { image: "/work/riot-press.jpg", title: "Riot Press" },
  { image: "/work/nightshift.jpg", title: "Nightshift" },
  { image: "/work/cold-chrome.jpg", title: "Cold Chrome" },
  { image: "/work/spectral.jpg", title: "Spectral" },
  { image: "/work/dune-study.jpg", title: "Dune Study" },
  { image: "/work/afterlight.jpg", title: "Afterlight" },
  { image: "/work/redstone.jpg", title: "Redstone" },
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
      cardRatio={1.7}
    />
  )
}
