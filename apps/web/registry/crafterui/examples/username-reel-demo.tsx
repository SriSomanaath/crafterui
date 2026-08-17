"use client"

import { UsernameReel } from "@/registry/crafterui/ui/username-reel"

const NAMES = [
  "adeline",
  "dennis",
  "michele",
  "eike",
  "may-li",
  "clara",
  "tito",
  "silvan",
  "noor",
  "ravi",
  "yuki",
  "mateo",
  "joon",
  "amara",
]

export default function UsernameReelDemo() {
  return (
    <div className="bg-background flex h-full min-h-[460px] w-full items-center justify-center">
      <UsernameReel
        names={NAMES}
        finalName="username"
        prefix="bento.me/"
        highlightColor="#6366f1"
        loop
      />
    </div>
  )
}
