"use client"

import { CountdownTimer } from "@/registry/crafterui/ui/countdown-timer"

export default function CountdownTimerDemo() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background text-foreground">
      <CountdownTimer
        duration={33}
        autoStart
        loop
        label="Countdown with Number Flow"
        accentColor="#ff3828"
        digitClassName="font-bebas-neue"
      />
    </div>
  )
}
