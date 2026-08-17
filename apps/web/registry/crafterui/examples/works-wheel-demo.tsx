"use client"

import { WorksWheel, type WorksWheelItem } from "@/registry/crafterui/ui/works-wheel"

// Placeholder photography from Unsplash, saved under public/gallery. Swap the
// paths and the names for your own index - the wheel sizes its ring to however
// many pieces it is handed.
const WORKS: WorksWheelItem[] = [
  { title: "Deep Signal", image: "/gallery/look-01.jpg", href: "#deep-signal" },
  { title: "Paper Rose", image: "/gallery/look-02.jpg", href: "#paper-rose" },
  { title: "White Noise", image: "/gallery/look-03.jpg", href: "#white-noise" },
  { title: "Golden Hour", image: "/gallery/look-04.jpg", href: "#golden-hour" },
  { title: "Neon Horizon", image: "/gallery/look-05.jpg", href: "#neon-horizon" },
  { title: "Terra Cotta", image: "/gallery/look-06.jpg", href: "#terra-cotta" },
  { title: "Burnt Umber", image: "/gallery/look-07.jpg", href: "#burnt-umber" },
  { title: "Slate Field", image: "/gallery/look-08.jpg", href: "#slate-field" },
  { title: "Low Tide", image: "/gallery/look-09.jpg", href: "#low-tide" },
]

export default function WorksWheelDemo() {
  return <WorksWheel items={WORKS} label="Works '26" action="View" />
}
