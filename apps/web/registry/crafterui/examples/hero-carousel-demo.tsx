"use client"

import {
  HeroCarousel,
  type HeroCarouselItem,
} from "@/registry/crafterui/ui/hero-carousel"

// Placeholder photography served straight off the Unsplash CDN so the demo
// works the moment it is installed - no assets to copy into your public/.
// Swap the ids for your own art direction; each item's `accent` is the hue the
// whole backdrop grades to when that card takes focus.
const UNSPLASH = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1000&h=1400&fit=crop&crop=faces&q=80&auto=format`

const LOOKS: HeroCarouselItem[] = [
  {
    title: "Deep\nSignal",
    image: UNSPLASH("1509631179647-0177331693ae"),
    credit: "BY AURELIA STUDIO.",
    meta: ["SAT NOV 15", "5-10 PM", "MIAMI"],
    accent: "#00798c",
  },
  {
    title: "Paper\nRose",
    image: UNSPLASH("1496747611176-843222e1e57c"),
    credit: "BY MAISON DELACROIX.",
    meta: ["SUN NOV 16", "2-6 PM", "PARIS"],
    accent: "#c2a98a",
  },
  {
    title: "White\nNoise",
    image: UNSPLASH("1539109136881-3be0616acf4b"),
    credit: "BY STUDIO VANTA.",
    meta: ["THU NOV 20", "8-11 PM", "BERLIN"],
    accent: "#8d94a6",
  },
  {
    title: "Golden\nHour",
    image: UNSPLASH("1515886657613-9f3515b0c78f"),
    credit: "BY CASA SOLARA.",
    meta: ["FRI NOV 21", "6-9 PM", "LISBON"],
    accent: "#fbad28",
  },
  {
    title: "Neon\nHorizon",
    image: UNSPLASH("1494790108377-be9c29b29330"),
    credit: "BY AURELIA STUDIO.",
    meta: ["SAT NOV 22", "5-10 PM", "MIAMI"],
    accent: "#f61c00",
  },
  {
    title: "Terra\nCotta",
    image: UNSPLASH("1483985988355-763728e1935b"),
    credit: "BY ATELIER SUD.",
    meta: ["SUN NOV 23", "4-8 PM", "MARRAKECH"],
    accent: "#cf7e53",
  },
  {
    title: "Burnt\nUmber",
    image: UNSPLASH("1506794778202-cad84cf45f1d"),
    credit: "BY OCHRE COLLECTIVE.",
    meta: ["WED NOV 26", "7-11 PM", "LAGOS"],
    accent: "#8c430b",
  },
  {
    title: "Cobalt\nDrift",
    image: UNSPLASH("1517841905240-472988babdf9"),
    credit: "BY STUDIO NORTE.",
    meta: ["FRI NOV 28", "9 PM-2 AM", "SÃO PAULO"],
    accent: "#0087cf",
  },
  {
    title: "After\nDark",
    image: UNSPLASH("1534528741775-53994a69daeb"),
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
