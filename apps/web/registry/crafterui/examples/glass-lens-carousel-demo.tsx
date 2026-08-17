"use client"

import {
  GlassLensCarousel,
  type GlassLensItem,
} from "@/registry/crafterui/ui/glass-lens-carousel"

// Placeholder imagery collected from Pinterest, saved under public/work. Swap
// the paths and the copy for your own index - the row sizes itself to however
// many pieces it is handed, and each panel keeps its picture's own aspect.
const WORK: GlassLensItem[] = [
  { image: "/work/verdant.jpg", title: "Verdant", caption: "Outerwear editorial" },
  { image: "/work/ember-field.jpg", title: "Ember Field", caption: "Colour campaign, stills" },
  { image: "/work/northbound.jpg", title: "Northbound", caption: "Winter collection campaign" },
  { image: "/work/marigold.jpg", title: "Marigold", caption: "Harvest editorial" },
  { image: "/work/signal-grid.jpg", title: "Signal Grid", caption: "Identity and type system" },
  { image: "/work/riot-press.jpg", title: "Riot Press", caption: "Print series, risograph" },
  { image: "/work/nightshift.jpg", title: "Nightshift", caption: "Automotive launch film" },
  { image: "/work/cold-chrome.jpg", title: "Cold Chrome", caption: "Showroom art direction" },
  { image: "/work/spectral.jpg", title: "Spectral", caption: "Motion identity" },
  { image: "/work/dune-study.jpg", title: "Dune Study", caption: "Art direction study" },
  { image: "/work/afterlight.jpg", title: "Afterlight", caption: "Short film, direction" },
  { image: "/work/redstone.jpg", title: "Redstone", caption: "Location campaign" },
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
