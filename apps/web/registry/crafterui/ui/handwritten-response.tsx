"use client"

// An answer in marker pen: handwriting, a highlighter, and annotations drawn
// over the words rather than typeset around them.
//
// Caveat on a 1.36 line, pure black ink,
// and a #f5e1a8 highlighter that sits low on the word and runs a little past
// both ends. The circle and the strikethrough are SVG - a CSS underline or a
// border-radius box reads as a shape, and the whole point is that they read as
// something drawn by hand a moment ago.
//
// Markup the text carries:
//   ==marked==     highlighter swipe
//   ((circled))    ring drawn round it
//   ~~struck~~     crossed out
//
// Nothing fades in. Every word is wiped on left to right at a steady nib speed,
// the highlighter travels under the words as they are written, and the ring and
// the strike are stroked on straight after the words they cover - so a streamed
// answer reads as one pen working its way down the page.
import * as React from "react"

import { cn } from "@/lib/utils"

export interface HandwrittenResponseProps {
  /** The answer. Understands ==mark==, ((circle)) and ~~strike~~. */
  children: string
  /** Seconds the pen takes to write an average (five-letter) word. @default 0.18 */
  duration?: number
  /** Skip the writing and show everything at once. @default false */
  instant?: boolean
  /** Extra classes for the block. @default undefined */
  className?: string
}

// The highlighter amber. The band is deliberately shorter than the cap height
// (see Swipe), so ascenders always sit on the page and never on the swipe -
// which means the ink has to stay the theme foreground and the BAND has to
// adapt instead. Thinned in dark mode: amber over near-black still reads as a
// marker and carries white ink at ~6:1.
const HIGHLIGHT = "bg-[#f5e1a8] dark:bg-[#f5e1a8]/40"

// Pen time is charged per character rather than per word, so the nib moves at
// one steady speed instead of racing through "extraordinarily" and crawling
// through "a" - the single thing that separates writing from stuff appearing.
const AVG_WORD = 5 // characters `duration` is quoted against
const OVERLAY_CHARS = 7 // pen time a ring or a strike costs, in characters
const MAX_SPREAD = 6 // seconds one arriving batch may take, however long it is

const SPACE = /^\s+$/

type Mark = "plain" | "mark" | "circle" | "strike"
type Token = { text: string; mark: Mark }

// One pass, so the marks cannot nest and cannot be mistaken for each other.
const SYNTAX = /==(.+?)==|\(\((.+?)\)\)|~~(.+?)~~/g

// Every complete pair is consumed by SYNTAX, so anything of this shape left in a
// plain run is an opener whose closer has not streamed in yet. Showing it would
// put a literal "==" on the page mid-answer; the word underneath is shown plain
// instead and picks up its mark when the pair completes.
const DANGLING = /==|\(\(|~~|[=(~]$/g

function plain(text: string): Token {
  return { text: text.replace(DANGLING, ""), mark: "plain" }
}

function parse(src: string): Token[] {
  const out: Token[] = []
  let last = 0
  for (const m of src.matchAll(SYNTAX)) {
    if (m.index > last) out.push(plain(src.slice(last, m.index)))
    const mark: Mark = m[1] !== undefined ? "mark" : m[2] !== undefined ? "circle" : "strike"
    out.push({ text: (m[1] ?? m[2] ?? m[3]) as string, mark })
    last = m.index + m[0].length
  }
  if (last < src.length) out.push(plain(src.slice(last)))
  return out.filter((t) => t.text.length > 0)
}

// When the overlay is being drawn, and for how long. Both undefined means the
// words were already on the page, so the overlay is simply there.
type Drawn = { delay?: number; dur?: number }

// pathLength normalises the dash units to 1, so the sweep needs no measuring of
// the path and no ref. `offset` and `scale` are fractions of `dur`, for the
// second strike pass that trails the first.
function stroke(
  { delay, dur }: Drawn,
  offset = 0,
  scale = 1
): React.CSSProperties | undefined {
  if (delay === undefined || dur === undefined) return undefined
  return {
    animation: `crafterui-draw ${dur * scale}s ease-out both`,
    animationDelay: `${delay + dur * offset}s`,
  }
}

/* Hand-drawn overlays. Both stretch to whatever they wrap: the viewBox is
   normalised and preserveAspectRatio is off, while non-scaling-stroke keeps the
   pen the same weight however far the box is pulled. */
function Ring(drawn: Drawn) {
  return (
    <svg
      className="pointer-events-none absolute top-[0.04em] left-[-0.26em] h-[calc(100%-0.08em)] w-[calc(100%+0.52em)] overflow-visible"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        // Not a perfect ellipse - it starts low-left, comes round, and overshoots
        // the closure the way a real pen does.
        d="M8 54 C6 26 30 8 52 7 C76 6 95 20 95 46 C95 74 72 93 48 93 C24 93 7 78 6 52 C6 34 16 20 34 12"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        data-draw=""
        pathLength={1}
        strokeDasharray={1}
        style={stroke(drawn)}
      />
    </svg>
  )
}

function Strike(drawn: Drawn) {
  return (
    <svg
      // w-full, not left-0 right-0: an <svg> is a replaced element, so when it
      // is absolutely positioned with width:auto the browser takes its intrinsic
      // width and ignores `right` - the line then runs on past the word.
      className="pointer-events-none absolute bottom-[0.30em] left-0 h-[0.34em] w-full overflow-visible"
      viewBox="0 0 100 10"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {/* Two passes at slightly different heights - one stroke looks typeset.
          The second trails the first, because two in lockstep look printed. */}
      <path
        d="M1 4 C24 2 46 7 68 4 C82 2 92 6 99 4"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        data-draw=""
        pathLength={1}
        strokeDasharray={1}
        style={stroke(drawn, 0, 0.7)}
      />
      <path
        d="M2 7 C26 5 44 9 66 6 C80 4 92 8 98 6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.3}
        strokeLinecap="round"
        opacity={0.8}
        vectorEffect="non-scaling-stroke"
        data-draw=""
        pathLength={1}
        strokeDasharray={1}
        style={stroke(drawn, 0.3, 0.7)}
      />
    </svg>
  )
}

/* The highlighter. A rounded band sized in em and anchored above the baseline,
   because a padded background box grows to the whole line and reads as a label
   rather than as one swipe of a marker. It takes the same left-to-right wipe as
   the words, over the same window, so the amber is always already under the ink
   - drawing it afterwards would show the words before their marker. */
function Swipe({ delay, dur }: Drawn) {
  return (
    <span
      aria-hidden="true"
      data-ink=""
      style={{
        ...(dur === undefined
          ? null
          : {
              animation: `crafterui-write ${dur}s linear both`,
              animationDelay: `${delay}s`,
            }),
      }}
      className={cn(
        "absolute right-[-0.24em] bottom-[0.12em] left-[-0.24em] h-[0.6em] rounded-full",
        HIGHLIGHT
      )}
    />
  )
}

export function HandwrittenResponse({
  children,
  duration = 0.18,
  instant = false,
  className,
}: HandwrittenResponseProps) {
  const { tokens, total } = React.useMemo(() => {
    const tokens = parse(children ?? "").map((tk) => ({
      ...tk,
      parts: tk.text.split(/(\s+)/).filter(Boolean),
    }))
    const total = tokens.reduce(
      (n, tk) => n + tk.parts.filter((p) => !SPACE.test(p)).length,
      0
    )
    return { tokens, total }
  }, [children])

  // How many words were already on the page at the last commit. Two things
  // depend on it, and both were wrong before:
  //
  //   A word animates only the first time it appears. Closing a ==pair== renests
  //   the words it wraps, which remounts them - without this they would flash a
  //   second time, after they had already settled.
  //
  //   Its delay is measured from the batch it arrived in, never from its index
  //   in the answer. Index-based delay compounds: the 80th word ends up waiting
  //   seconds, and because the animation fills backwards it holds its layout at
  //   zero opacity the whole time. The text finishes arriving and then keeps
  //   surfacing long after the stream has stopped.
  const revealed = React.useRef(0)
  const start = revealed.current

  React.useEffect(() => {
    revealed.current = total
  }, [total])

  // Cost the arriving batch before rendering it: the nib runs at `duration` per
  // average word unless that would drag the batch past MAX_SPREAD, in which case
  // everything is compressed evenly rather than the tail being cut off.
  let pending = 0
  for (let w = 0, i = 0; i < tokens.length; i++) {
    const tk = tokens[i]
    let fresh = false
    for (const part of tk.parts) {
      const space = SPACE.test(part)
      if (w >= start) {
        pending += part.length
        if (!space) fresh = true
      }
      if (!space) w++
    }
    // A ring or a strike is a separate stroke of the pen; the swipe rides along
    // with the words and so costs nothing extra.
    if (fresh && (tk.mark === "circle" || tk.mark === "strike")) {
      pending += OVERLAY_CHARS
    }
  }
  const perChar = Math.min(duration / AVG_WORD, MAX_SPREAD / Math.max(1, pending))

  let word = 0
  let cursor = 0 // characters of pen time already spent in this batch

  return (
    <div
      className={cn(
        "font-[Caveat] text-[1.75rem] leading-[2.375rem] text-foreground",
        className
      )}
    >
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@500&display=swap');
          /* The nib, not a fade. inset() is (top right bottom left) and each
             value cuts in from its own edge, so writing left to right means
             opening the RIGHT inset - driving the left one would uncover the end
             of the word first. The other three stay negative so Caveat's tails
             and ascenders are never squared off by the box, and the closed state
             overshoots 100% by that same overhang so no sliver of the glyph is
             left showing before the word is written. */
          @keyframes crafterui-write {
            from { clip-path: inset(-0.4em calc(100% + 0.25em) -0.4em -0.25em) }
            to   { clip-path: inset(-0.4em -0.25em -0.4em -0.25em) }
          }
          @keyframes crafterui-draw { from { stroke-dashoffset: 1 } to { stroke-dashoffset: 0 } }
          @media (prefers-reduced-motion: reduce) {
            [data-ink], [data-draw] {
              animation: none !important;
              clip-path: none !important;
              stroke-dashoffset: 0 !important;
            }
          }`}
      </style>

      {tokens.map((token, t) => {
        const from = cursor
        let animated = false

        const inked = token.parts.map((part, i) => {
          if (SPACE.test(part)) {
            // The gap between words is pen travel, so it is charged for too.
            if (!instant && word >= start) cursor += part.length
            return <React.Fragment key={`s${t}-${i}`}>{part}</React.Fragment>
          }

          const index = word++
          const fresh = !instant && index >= start
          const style = fresh
            ? {
                animation: `crafterui-write ${part.length * perChar}s linear both`,
                animationDelay: `${cursor * perChar}s`,
              }
            : undefined

          if (fresh) {
            animated = true
            cursor += part.length
          }

          return (
            <span
              key={index}
              data-ink=""
              className="inline-block whitespace-pre"
              style={style}
            >
              {part}
            </span>
          )
        })

        if (token.mark === "plain")
          return <React.Fragment key={t}>{inked}</React.Fragment>

        // The swipe runs with the words; the ring and the strike are drawn once
        // the words are down, and take pen time of their own so the next word
        // waits for the marker instead of racing it.
        const swipe: Drawn = animated
          ? { delay: from * perChar, dur: Math.max(cursor - from, 1) * perChar }
          : {}
        const after: Drawn = animated
          ? { delay: cursor * perChar, dur: OVERLAY_CHARS * perChar }
          : {}
        if (animated && token.mark !== "mark") cursor += OVERLAY_CHARS

        return (
          <span key={t} className="relative inline-block">
            {token.mark === "mark" ? <Swipe {...swipe} /> : null}
            <span className="relative">{inked}</span>
            {token.mark === "circle" ? <Ring {...after} /> : null}
            {token.mark === "strike" ? <Strike {...after} /> : null}
          </span>
        )
      })}
    </div>
  )
}
