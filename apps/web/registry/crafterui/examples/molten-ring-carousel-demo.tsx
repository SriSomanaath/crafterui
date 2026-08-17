"use client"

import {
  MoltenRingCarousel,
  type MoltenRingItem,
} from "@/registry/crafterui/ui/molten-ring-carousel"

// Placeholder imagery collected from Pinterest, saved under public/work. Swap
// the paths and the copy for your own index - the list is the ring order, so
// reordering these rows reorders the arc and the numbering together.
const WORK: MoltenRingItem[] = [
  { image: "/work/verdant.jpg", title: "Verdant", meta: "Editorial · 2026" },
  { image: "/work/ember-field.jpg", title: "Ember Field", meta: "Campaign · 2026" },
  { image: "/work/northbound.jpg", title: "Northbound", meta: "Campaign · 2026" },
  { image: "/work/marigold.jpg", title: "Marigold", meta: "Editorial · 2025" },
  { image: "/work/signal-grid.jpg", title: "Signal Grid", meta: "Identity · 2025" },
  { image: "/work/riot-press.jpg", title: "Riot Press", meta: "Print · 2025" },
  { image: "/work/nightshift.jpg", title: "Nightshift", meta: "Automotive · 2025" },
  { image: "/work/cold-chrome.jpg", title: "Cold Chrome", meta: "Automotive · 2024" },
  { image: "/work/spectral.jpg", title: "Spectral", meta: "Motion · 2024" },
  { image: "/work/dune-study.jpg", title: "Dune Study", meta: "Art direction · 2024" },
  { image: "/work/afterlight.jpg", title: "Afterlight", meta: "Film · 2023" },
  { image: "/work/redstone.jpg", title: "Redstone", meta: "Campaign · 2023" },
]

export default function MoltenRingCarouselDemo() {
  return (
    <MoltenRingCarousel
      items={WORK}
      brand="crafterui"
      arc={1.05}
      cardSize={0.3}
      cardRatio={1.5}
      fuse={0.09}
    />
  )
}
