"use client"

import {
  SpineAccordion,
  type SpineAccordionItem,
} from "@/registry/crafterui/ui/spine-accordion"

// Placeholder art served straight off the crafterui CDN so the demo works the
// moment it is installed - no assets to copy into your public/. Swap the names,
// titles and year ranges for your own index; the shelf sizes itself to however
// many pieces it is handed.
const ART = (name: string) =>
  `/art/${name}.jpg`

const SHELF: SpineAccordionItem[] = [
  { title: "Prismatic Rift", image: ART("prismatic-rift-anime"), meta: "2025—2026" },
  { title: "Ember Clouds", image: ART("black-hole-ember-clouds"), meta: "2025—2026" },
  { title: "Neon Portal", image: ART("neon-cave-portal-silhouette"), meta: "2024—2026" },
  { title: "Red Ribbon", image: ART("red-ribbon-typography"), meta: "2024—2025" },
  { title: "Celestial Light", image: ART("celestial-light-figure"), meta: "2024—2025" },
  { title: "Neon Uplight", image: ART("neon-portrait-uplight"), meta: "2023—2025" },
  { title: "Indigo Marble", image: ART("indigo-liquid-marble"), meta: "2023—2024" },
  { title: "Launch Window", image: ART("rocket-launch-gradient"), meta: "2022—2024" },
  { title: "Cosmic Wave", image: ART("astronaut-cosmic-wave"), meta: "2022—2023" },
]

export default function SpineAccordionDemo() {
  return <SpineAccordion items={SHELF} defaultIndex={7} />
}
