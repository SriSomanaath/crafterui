"use client"

import { WorksWheel, type WorksWheelItem } from "@/registry/crafterui/ui/works-wheel"

// Placeholder photography served straight off the Unsplash CDN so the demo
// works the moment it is installed - no assets to copy into your public/. Swap
// the ids and the names for your own index - the wheel sizes its ring to
// however many pieces it is handed.
const UNSPLASH = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1000&h=1400&fit=crop&crop=faces&q=80&auto=format`

const WORKS: WorksWheelItem[] = [
  { title: "Deep Signal", image: UNSPLASH("1509631179647-0177331693ae"), href: "#deep-signal" },
  { title: "Paper Rose", image: UNSPLASH("1496747611176-843222e1e57c"), href: "#paper-rose" },
  { title: "White Noise", image: UNSPLASH("1539109136881-3be0616acf4b"), href: "#white-noise" },
  { title: "Golden Hour", image: UNSPLASH("1515886657613-9f3515b0c78f"), href: "#golden-hour" },
  { title: "Neon Horizon", image: UNSPLASH("1494790108377-be9c29b29330"), href: "#neon-horizon" },
  { title: "Terra Cotta", image: UNSPLASH("1483985988355-763728e1935b"), href: "#terra-cotta" },
  { title: "Burnt Umber", image: UNSPLASH("1506794778202-cad84cf45f1d"), href: "#burnt-umber" },
  { title: "Slate Field", image: UNSPLASH("1517841905240-472988babdf9"), href: "#slate-field" },
  { title: "Low Tide", image: UNSPLASH("1534528741775-53994a69daeb"), href: "#low-tide" },
]

export default function WorksWheelDemo() {
  return <WorksWheel items={WORKS} label="Works '26" action="View" />
}
