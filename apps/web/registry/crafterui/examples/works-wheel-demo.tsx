"use client"

import { WorksWheel, type WorksWheelItem } from "@/registry/crafterui/ui/works-wheel"

// Placeholder art served straight off the crafterui CDN so the demo works the
// moment it is installed - no assets to copy into your public/. Swap the names
// and the titles for your own index - the wheel sizes its ring to however many
// pieces it is handed.
const ART = (name: string) =>
  `/art/${name}.jpg`

const WORKS: WorksWheelItem[] = [
  { title: "Prismatic Rift", image: ART("prismatic-rift-anime"), href: "#prismatic-rift" },
  { title: "Ember Clouds", image: ART("black-hole-ember-clouds"), href: "#ember-clouds" },
  { title: "Neon Portal", image: ART("neon-cave-portal-silhouette"), href: "#neon-portal" },
  { title: "Red Ribbon", image: ART("red-ribbon-typography"), href: "#red-ribbon" },
  { title: "Celestial", image: ART("celestial-light-figure"), href: "#celestial" },
  { title: "Uplight", image: ART("neon-portrait-uplight"), href: "#uplight" },
  { title: "Indigo Marble", image: ART("indigo-liquid-marble"), href: "#indigo-marble" },
  { title: "Launch Window", image: ART("rocket-launch-gradient"), href: "#launch-window" },
  { title: "Cosmic Wave", image: ART("astronaut-cosmic-wave"), href: "#cosmic-wave" },
]

export default function WorksWheelDemo() {
  return <WorksWheel items={WORKS} label="Works '26" action="View" />
}
