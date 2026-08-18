"use client"

import {
  HeroCarousel,
  type HeroCarouselItem,
} from "@/registry/crafterui/ui/hero-carousel"

// Placeholder art served straight off the crafterui CDN so the demo works the
// moment it is installed - no assets to copy into your public/. Swap the names
// for your own art direction; each item's `accent` is the hue the whole
// backdrop grades to when that card takes focus.
const ART = (name: string) =>
  `/art/${name}.jpg`

const LOOKS: HeroCarouselItem[] = [
  {
    title: "Prismatic\nRift",
    image: ART("prismatic-rift-anime"),
    credit: "BY AURELIA STUDIO.",
    meta: ["SAT NOV 15", "5-10 PM", "MIAMI"],
    accent: "#7b61ff",
  },
  {
    title: "Ember\nClouds",
    image: ART("black-hole-ember-clouds"),
    credit: "BY MAISON DELACROIX.",
    meta: ["SUN NOV 16", "2-6 PM", "PARIS"],
    accent: "#ff4114",
  },
  {
    title: "Neon\nPortal",
    image: ART("neon-cave-portal-silhouette"),
    credit: "BY STUDIO VANTA.",
    meta: ["THU NOV 20", "8-11 PM", "BERLIN"],
    accent: "#00c8ff",
  },
  {
    title: "Red\nRibbon",
    image: ART("red-ribbon-typography"),
    credit: "BY CASA SOLARA.",
    meta: ["FRI NOV 21", "6-9 PM", "LISBON"],
    accent: "#e5231b",
  },
  {
    title: "Celestial\nLight",
    image: ART("celestial-light-figure"),
    credit: "BY AURELIA STUDIO.",
    meta: ["SAT NOV 22", "5-10 PM", "MIAMI"],
    accent: "#2f7bff",
  },
  {
    title: "Neon\nUplight",
    image: ART("neon-portrait-uplight"),
    credit: "BY ATELIER SUD.",
    meta: ["SUN NOV 23", "4-8 PM", "MARRAKECH"],
    accent: "#ff2f9c",
  },
  {
    title: "Indigo\nMarble",
    image: ART("indigo-liquid-marble"),
    credit: "BY OCHRE COLLECTIVE.",
    meta: ["WED NOV 26", "7-11 PM", "LAGOS"],
    accent: "#4356c8",
  },
  {
    title: "Launch\nWindow",
    image: ART("rocket-launch-gradient"),
    credit: "BY STUDIO NORTE.",
    meta: ["FRI NOV 28", "9 PM-2 AM", "SÃO PAULO"],
    accent: "#14307a",
  },
  {
    title: "Cosmic\nWave",
    image: ART("astronaut-cosmic-wave"),
    credit: "BY NOIR ET CIE.",
    meta: ["SAT NOV 29", "10 PM-4 AM", "TOKYO"],
    accent: "#ff3b6b",
  },
]

export default function HeroCarouselDemo() {
  return (
    <HeroCarousel
      items={LOOKS}
      defaultIndex={4}
      brand="MONTRA"
      onBack={() => {}}
      onMenu={() => {}}
    />
  )
}
