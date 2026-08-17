"use client"

// Inspired by Super Hover by Daniel Petho (https://super-hover.danielpetho.com) — MIT licensed.
import * as React from "react"

import { cn } from "@/lib/utils"
import { createSuperHover } from "@/registry/crafterui/ui/super-hover"

export interface SuperHoverListItem {
  /** Stable key; falls back to the row index. @default undefined */
  id?: string | number
  /** Primary cell, e.g. an album / file title. */
  title: string
  /** Secondary cell, e.g. an artist or author. @default undefined */
  subtitle?: string
  /** Trailing cell, e.g. a year. @default undefined */
  meta?: string
  /** Image revealed while the row is active (any URL). @default undefined */
  image?: string
}

export interface SuperHoverListProps {
  /** Rows to render in the index. */
  items: SuperHoverListItem[]
  /**
   * `super` keeps the active row in sync while scrolling under a still cursor;
   * `native` uses the browser's `:hover` (only updates when the pointer moves).
   * @default "super"
   */
  mode?: "super" | "native"
  /**
   * Auto-scroll the list and walk the active row down it (great for previews and
   * showcasing the effect without a pointer). Pauses while hovered. @default false
   */
  autoplay?: boolean
  /** Auto-scroll speed in pixels per frame when `autoplay` is on. @default 0.35 */
  speed?: number
  /** Edge length of the revealed artwork in pixels. @default 112 */
  artworkSize?: number
  /** Extra classes for the outer container. @default undefined */
  className?: string
}

/** Fraction down the viewport the autoplay "playhead" sits at. */
const AUTOPLAY_ANCHOR = 0.42

export function SuperHoverList({
  items,
  mode = "super",
  autoplay = false,
  speed = 0.35,
  artworkSize = 112,
  className,
}: SuperHoverListProps) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const rowRefs = React.useRef<(HTMLDivElement | null)[]>([])
  const hoveringRef = React.useRef(false)
  const autoActiveRef = React.useRef<HTMLElement | null>(null)

  // Double the rows for a seamless autoplay loop; render once otherwise.
  const rows = React.useMemo(
    () => (autoplay ? [...items, ...items] : items),
    [items, autoplay]
  )

  // Flip the artwork below its row when revealing it above would clip the top edge.
  const placeArtwork = React.useCallback(
    (row: HTMLElement | null) => {
      const root = rootRef.current
      if (!row || !root || !root.contains(row)) return
      const rootRect = root.getBoundingClientRect()
      const rowRect = row.getBoundingClientRect()
      const wouldClipTop = rowRect.bottom - artworkSize < rootRect.top
      row.toggleAttribute("data-artwork-below", wouldClipTop)
    },
    [artworkSize]
  )

  // Super Hover controller + artwork placement on the events it dispatches.
  React.useEffect(() => {
    const root = rootRef.current
    if (!root || mode !== "super") return

    const ctrl = createSuperHover({ root })
    const onActive = (e: Event) => {
      const target = e.target
      if (target instanceof Element) {
        placeArtwork(target.closest<HTMLElement>("[data-super-hover]"))
      }
    }
    root.addEventListener("superhoverenter", onActive)
    root.addEventListener("superhovermove", onActive)
    return () => {
      root.removeEventListener("superhoverenter", onActive)
      root.removeEventListener("superhovermove", onActive)
      ctrl.destroy()
    }
  }, [mode, placeArtwork])

  // Native mode: place artwork on plain mouseover.
  React.useEffect(() => {
    const root = rootRef.current
    if (!root || mode !== "native") return
    const onOver = (e: MouseEvent) => {
      if (e.target instanceof Element) {
        placeArtwork(e.target.closest<HTMLElement>("[data-super-hover]"))
      }
    }
    root.addEventListener("mouseover", onOver)
    return () => root.removeEventListener("mouseover", onOver)
  }, [mode, placeArtwork])

  // Autoplay: scroll the list and keep the row nearest the playhead active.
  React.useEffect(() => {
    const root = rootRef.current
    if (!root || !autoplay) return

    const prefersReduced =
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    if (prefersReduced) return

    let raf = 0
    const setAutoActive = (row: HTMLElement | null) => {
      if (autoActiveRef.current === row) return
      autoActiveRef.current?.removeAttribute("data-autoplay-active")
      autoActiveRef.current = row
      if (row) {
        row.setAttribute("data-autoplay-active", "")
        placeArtwork(row)
      }
    }

    const frame = () => {
      if (!hoveringRef.current) {
        // Wrap by the height of ONE copy (top of the first duplicated row minus
        // the first row), not scrollHeight/2 — the latter folds in the scroll
        // container's vertical padding and makes the loop jump each cycle.
        const first = rowRefs.current[0]
        const mid = rowRefs.current[items.length]
        const period = first && mid ? mid.offsetTop - first.offsetTop : 0
        if (period > 0 && root.scrollTop >= period) root.scrollTop -= period
        root.scrollTop += speed

        const box = root.getBoundingClientRect()
        const anchor = box.top + box.height * AUTOPLAY_ANCHOR
        let best: HTMLElement | null = null
        let bestDist = Infinity
        for (const row of rowRefs.current) {
          if (!row) continue
          const rect = row.getBoundingClientRect()
          if (rect.bottom < box.top || rect.top > box.bottom) continue
          const dist = Math.abs(rect.top + rect.height / 2 - anchor)
          if (dist < bestDist) {
            bestDist = dist
            best = row
          }
        }
        setAutoActive(best)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      setAutoActive(null)
    }
  }, [autoplay, speed, placeArtwork, items.length])

  const revealSelector =
    mode === "super"
      ? "[&[data-super-hover-active]_.sh-art]:opacity-100 [&[data-super-hover-active]]:border-b-current [&[data-autoplay-active]_.sh-art]:opacity-100 [&[data-autoplay-active]]:border-b-current"
      : "[&:hover_.sh-art]:opacity-100 hover:border-b-current [&[data-autoplay-active]_.sh-art]:opacity-100 [&[data-autoplay-active]]:border-b-current"

  return (
    <div
      className={cn(
        "bg-background text-foreground relative h-full w-full overflow-hidden font-mono uppercase",
        className
      )}
    >
      <div
        ref={rootRef}
        onPointerEnter={() => {
          hoveringRef.current = true
          autoActiveRef.current?.removeAttribute("data-autoplay-active")
          autoActiveRef.current = null
        }}
        onPointerLeave={() => {
          hoveringRef.current = false
        }}
        className="h-full cursor-pointer [scrollbar-width:none] overflow-x-hidden overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,transparent,#000_12%,#000_88%,transparent)] px-4 py-6 sm:px-8 [&::-webkit-scrollbar]:hidden"
      >
        <div className="mx-auto grid w-full max-w-5xl grid-cols-[3rem_minmax(0,42%)_minmax(0,1fr)_minmax(3.5rem,16%)_3.5rem] text-xs sm:text-sm">
          {rows.map((item, i) => (
            <div
              key={item.id != null ? `${item.id}-${i}` : i}
              data-super-hover
              ref={(el) => {
                rowRefs.current[i] = el
              }}
              className={cn(
                "col-span-5 grid grid-cols-subgrid items-center gap-x-2 border-b border-transparent py-1.5 transition-colors duration-150",
                "[&[data-artwork-below]_.sh-art]:top-[calc(100%+0.5rem)] [&[data-artwork-below]_.sh-art]:bottom-auto",
                revealSelector
              )}
            >
              <div className="tabular-nums opacity-60">
                {String((i % items.length) + 1).padStart(3, "0")}
              </div>
              <div className="min-w-0 truncate">{item.title}</div>
              <div className="min-w-0 truncate opacity-70">{item.subtitle}</div>
              <div className="relative h-full min-w-0">
                {item.image ? (
                  <div
                    aria-hidden
                    className="sh-art pointer-events-none absolute bottom-0 left-1/2 z-20 -translate-x-1/2 bg-cover bg-center opacity-0 shadow-lg transition-opacity duration-200 ease-out"
                    style={{
                      width: artworkSize,
                      height: artworkSize,
                      backgroundImage: `url(${item.image})`,
                    }}
                  />
                ) : null}
              </div>
              <div className="text-right tabular-nums opacity-60">
                {item.meta ?? "—"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
