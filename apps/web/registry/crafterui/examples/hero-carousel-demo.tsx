"use client"

import {
  HeroCarousel,
  type HeroCarouselItem,
} from "@/registry/crafterui/ui/hero-carousel"

// Placeholder photography from Unsplash, saved under public/gallery. Swap the
// paths for your own art direction - each item's `accent` is the hue the whole
// backdrop grades to when that card takes focus.
const LOOKS: HeroCarouselItem[] = [
  {
    title: "Deep\nSignal",
    image: "/gallery/look-01.jpg",
    credit: "BY AURELIA STUDIO.",
    meta: ["SAT NOV 15", "5-10 PM", "MIAMI"],
    accent: "#00798c",
  },
  {
    title: "Paper\nRose",
    image: "/gallery/look-02.jpg",
    credit: "BY MAISON DELACROIX.",
    meta: ["SUN NOV 16", "2-6 PM", "PARIS"],
    accent: "#c2a98a",
  },
  {
    title: "White\nNoise",
    image: "/gallery/look-03.jpg",
    credit: "BY STUDIO VANTA.",
    meta: ["THU NOV 20", "8-11 PM", "BERLIN"],
    accent: "#8d94a6",
  },
  {
    title: "Golden\nHour",
    image: "/gallery/look-04.jpg",
    credit: "BY CASA SOLARA.",
    meta: ["FRI NOV 21", "6-9 PM", "LISBON"],
    accent: "#fbad28",
  },
  {
    title: "Neon\nHorizon",
    image: "/gallery/look-05.jpg",
    credit: "BY AURELIA STUDIO.",
    meta: ["SAT NOV 22", "5-10 PM", "MIAMI"],
    accent: "#f61c00",
  },
  {
    title: "Terra\nCotta",
    image: "/gallery/look-06.jpg",
    credit: "BY ATELIER SUD.",
    meta: ["SUN NOV 23", "4-8 PM", "MARRAKECH"],
    accent: "#cf7e53",
  },
  {
    title: "Burnt\nUmber",
    image: "/gallery/look-07.jpg",
    credit: "BY OCHRE COLLECTIVE.",
    meta: ["WED NOV 26", "7-11 PM", "LAGOS"],
    accent: "#8c430b",
  },
  {
    title: "Cobalt\nDrift",
    image: "/gallery/look-08.jpg",
    credit: "BY STUDIO NORTE.",
    meta: ["FRI NOV 28", "9 PM-2 AM", "SÃO PAULO"],
    accent: "#0087cf",
  },
  {
    title: "After\nDark",
    image: "/gallery/look-09.jpg",
    credit: "BY NOIR ET CIE.",
    meta: ["SAT NOV 29", "10 PM-4 AM", "TOKYO"],
    accent: "#5b6478",
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
