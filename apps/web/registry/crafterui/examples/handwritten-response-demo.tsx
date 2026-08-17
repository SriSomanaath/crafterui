"use client"

import * as React from "react"

import { HandwrittenResponse } from "@/registry/crafterui/ui/handwritten-response"

const ANSWER =
  "Five years side by side - ==NVIDIA== is up ((+874%)) and ==AMD== +453%. " +
  "But since ~~Januar~~ January AMD has more than ==doubled.=="

export default function HandwrittenResponseDemo() {
  const [key, setKey] = React.useState(0)

  return (
    <div className="bg-background flex h-full min-h-[460px] w-full flex-col items-center justify-center gap-6 p-8 text-center">
      <HandwrittenResponse key={key} className="max-w-[560px] text-balance">
        {ANSWER}
      </HandwrittenResponse>
      <button
        type="button"
        onClick={() => setKey((k) => k + 1)}
        className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4"
      >
        Write it again
      </button>
    </div>
  )
}
