"use client"

// Headline type that writes itself in as you scroll, one letter at a time, with
// a tick as each one lands.
//
// Layout: a letter that has not arrived yet takes up no room, so a centred line
// opens outward from the middle instead of fading up in place. Getting width to
// animate from zero to "however wide this glyph happens to be" normally means
// measuring every character and re-measuring on resize. It does not have to - an
// inline-grid whose one column runs 0fr -> 1fr collapses and restores its
// child's natural width by itself, so the type stays sized in container units
// and nothing needs measuring. Set `space="reserve"` for the other behaviour,
// where letters hold their final position and only fade.
//
// Timing: each letter owns one slice of scroll and nothing overlaps into the
// next, so only ever one letter is arriving. By default `snap` is 0, which makes
// that arrival a hard step - the glyph and the space it needs appear together in
// a single frame, with no interpolation between them at all.
//
// That is deliberately mechanical. A centred line has to shift sideways by half
// a letter every time one lands, and easing the width in hides that shift; a
// hard step lets you feel it, which is what makes the thing read as typing on a
// machine rather than text dissolving up. Raise `snap` to ease each letter in
// over that fraction of its slice instead - at 1 the slices touch and it becomes
// a continuous crossfade.
//
// Sound is synthesised, not a file: a registry component that shipped an .mp3
// would make the consumer copy the asset too, and this is smaller and tunable.
//
// It is a filtered noise burst, deliberately not a tone. A pitched oscillator
// per letter turns thirty-odd letters into a melody, and a melody you did not
// ask for and cannot skip is a ringtone. Real interface ticks are broadband and
// almost over before you place them: white noise through a bandpass, ~35ms, with
// the centre frequency knocked about a little each hit so a run of them does not
// sound looped.
//
// It starts muted behind a toggle for two reasons - nothing should make noise at
// someone unasked, and browsers refuse to start an AudioContext until a real
// gesture. Scrolling is not one in Chrome, so the toggle press doubles as the
// unlock.
import * as React from "react"
import { Volume2, VolumeX } from "lucide-react"
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react"

import { cn } from "@/lib/utils"

export type LetterRevealOrder = "forward" | "backward" | "center" | "random"

export interface LetterRevealSound {
  /** Peak gain of a single tick, 0-1. @default 0.11 */
  volume?: number
  /** Centre of the bandpass, in Hz. Lower is duller and woodier. @default 1900 */
  tone?: number
  /** How far the centre wanders per hit, 0-1, so repeats do not sound looped. @default 0.22 */
  spread?: number
  /** Tick length in seconds. @default 0.045 */
  decay?: number
  /** Weight under the click, 0-1. 0 is a dry tap. @default 0.35 */
  body?: number
  /** Shortest gap between two ticks in ms - a fast flick must not machine-gun. @default 45 */
  throttle?: number
}

export interface LetterRevealProps {
  /** Lines of the headline. Each fills across the same stretch of scroll. */
  lines: string[]
  /** Element to render the headline as. @default "h2" */
  as?: "h1" | "h2" | "h3" | "p" | "div"
  /** Whether a letter waits its turn taking no space, or holds its place and fades. @default "grow" */
  space?: "grow" | "reserve"
  /** Which end letters arrive from. @default "forward" */
  order?: LetterRevealOrder
  /** How far through the scroll the last letter lands. @default 0.8 */
  finish?: number
  /** Fraction of a letter's slice spent arriving. 0 is a hard step, 1 a crossfade. @default 0 */
  snap?: number
  /** How ragged the arriving edge is, as a fraction of the scroll. 0 keeps strict order. @default 0 */
  jitter?: number
  /** Height of the scroll track, in multiples of the panel. @default 300 */
  track?: number
  /** Tick config, or false for a silent component with no toggle. @default true */
  sound?: boolean | LetterRevealSound
  /** Called as each letter lands - hook up your own audio, haptics or analytics. @default undefined */
  onReveal?: (letter: { char: string; line: number; index: number }) => void
  /** Caption pinned under the type; pass `null` to hide it. @default "Scroll" */
  label?: string | null
  /** Extra classes on the root surface. @default undefined */
  className?: string
  /** Extra classes on the headline. @default undefined */
  textClassName?: string
}

// Deterministic stand-in for Math.random: the same value on the server and the
// client, so the arrival order never differs between the two renders.
function noise(i: number) {
  const x = Math.sin((i + 1) * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

// Recovers the amplitude the bandpass costs, so `volume` means peak amplitude.
const BANDPASS_MAKEUP = 2.1

// Most ticks one scroll event may fire. Past this it stops reading as typing.
const MAX_BURST = 6

/** Position in the queue for each letter of a line, by arrival order. */
function ranks(n: number, order: LetterRevealOrder, seed: number): number[] {
  const idx = Array.from({ length: n }, (_, i) => i)
  if (order === "forward") return idx
  if (order === "backward") return idx.map((i) => n - 1 - i)

  const by =
    order === "center"
      ? (i: number) => Math.abs(i - (n - 1) / 2)
      : (i: number) => noise(i + seed)

  const queue = [...idx].sort((a, b) => by(a) - by(b))
  const out = new Array<number>(n)
  queue.forEach((letter, place) => {
    out[letter] = place
  })
  return out
}

type Planned = {
  char: string
  line: number
  index: number
  from: number
  to: number
  audible: boolean
}

function Letter({
  char,
  from,
  to,
  snap,
  space,
  progress,
}: {
  char: string
  from: number
  to: number
  snap: number
  space: "grow" | "reserve"
  progress: MotionValue<number>
}) {
  const p = useTransform(progress, (v) => clamp((v - from) / (to - from)))

  // One value drives the glyph and the room it takes, so they land together. At
  // snap 0 it is a step function - there is no in-between frame to catch.
  const enter = 1 - clamp(snap)
  const landed = useTransform(p, (v) =>
    snap <= 0 ? (v >= 1 ? 1 : 0) : clamp((v - enter) / (1 - enter))
  )

  const column = useTransform(landed, (v) =>
    space === "grow" ? `${v}fr` : "1fr"
  )

  return (
    <motion.span
      aria-hidden="true"
      style={{ gridTemplateColumns: column }}
      className="inline-grid align-baseline"
    >
      <motion.span style={{ opacity: landed }} className="min-w-0 overflow-hidden">
        {char}
      </motion.span>
    </motion.span>
  )
}

export function LetterReveal({
  lines,
  as: Tag = "h2",
  space = "grow",
  order = "forward",
  finish = 0.8,
  snap = 0,
  jitter = 0,
  track = 300,
  sound = true,
  onReveal,
  label = "Scroll",
  className,
  textClassName,
}: LetterRevealProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ container: scrollRef })

  const tone: Required<LetterRevealSound> = {
    volume: 0.11,
    tone: 1900,
    spread: 0.22,
    decay: 0.045,
    body: 0.35,
    throttle: 45,
    ...(typeof sound === "object" ? sound : {}),
  }

  const [muted, setMuted] = React.useState(true)
  const audio = React.useRef<{
    ctx: AudioContext
    noise: AudioBuffer
    out: GainNode
  } | null>(null)
  const lastTick = React.useRef(0)

  // One flat plan drives both the render and the tick, so a letter can never
  // sound at a different moment than it appears.
  const plan = React.useMemo<Planned[]>(() => {
    const out: Planned[] = []
    lines.forEach((line, l) => {
      const chars = [...line]
      const n = Math.max(chars.length, 1)
      const place = ranks(n, order, l * 97)
      // One slice each, butted end to end. Any overlap here and two letters are
      // always mid-flight, which is what turns typing into a dissolve.
      const slice = finish / n
      chars.forEach((char, i) => {
        const from = clamp(place[i] * slice + (noise(i + l * 97) - 0.5) * jitter)
        out.push({
          char,
          line: l,
          index: i,
          from,
          to: from + slice,
          audible: char.trim().length > 0,
        })
      })
    })
    return out
  }, [lines, order, finish, jitter])

  React.useEffect(() => {
    return () => {
      void audio.current?.ctx.close()
      audio.current = null
    }
  }, [])

  function tick(delay = 0) {
    const rig = audio.current
    if (!rig || rig.ctx.state !== "running") return

    const { ctx, noise: buffer, out } = rig
    const now = ctx.currentTime + delay

    const src = ctx.createBufferSource()
    src.buffer = buffer

    const band = ctx.createBiquadFilter()
    band.type = "bandpass"
    band.frequency.value = tone.tone * (1 + (Math.random() - 0.5) * tone.spread)
    band.Q.value = 0.9

    // Takes the fizz off the top of the noise; without it the tick reads as a
    // hiss rather than as a tap.
    const soften = ctx.createBiquadFilter()
    soften.type = "lowpass"
    soften.frequency.value = 7000

    // A bandpass throws away most of the noise's energy, so without makeup a
    // `volume` of 0.11 actually peaks around 0.05 and the knob lies about what
    // it does. This puts peak amplitude back in step with the number asked for.
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(tone.volume * BANDPASS_MAKEUP, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.decay)

    src.connect(band)
    band.connect(soften)
    soften.connect(gain)
    gain.connect(out)
    src.start(now)
    src.stop(now + tone.decay + 0.02)

    if (tone.body <= 0) return
    // A little low weight under the click so it lands rather than just hisses.
    const thud = ctx.createOscillator()
    const thudGain = ctx.createGain()
    thud.type = "sine"
    thud.frequency.setValueAtTime(190, now)
    thud.frequency.exponentialRampToValueAtTime(120, now + tone.decay * 1.6)
    thudGain.gain.setValueAtTime(tone.volume * tone.body, now)
    thudGain.gain.exponentialRampToValueAtTime(0.0001, now + tone.decay * 1.6)
    thud.connect(thudGain)
    thudGain.connect(out)
    thud.start(now)
    thud.stop(now + tone.decay * 1.6 + 0.02)
  }

  // Letters already landed. Scrubbing back up rewinds it without sounding, so
  // dragging the scrollbar to and fro cannot retrigger the same letter.
  const landed = React.useRef(0)

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    let count = 0
    for (const letter of plan) if (v >= letter.to) count++
    if (count === landed.current) return

    if (count < landed.current) {
      landed.current = count
      return
    }

    const fresh = plan.slice(landed.current, count)
    landed.current = count

    for (const letter of fresh) onReveal?.(letter)

    const audible = fresh.reduce((n, l) => n + (l.audible ? 1 : 0), 0)
    if (muted || audible === 0) return

    const now = performance.now()
    if (now - lastTick.current < tone.throttle) return

    // One scroll event can land several letters. Fire them as a short run of
    // separate ticks rather than a single click, so a quick flick still sounds
    // like typing - capped, because a whole line at once would machine-gun.
    const burst = Math.min(audible, MAX_BURST)
    for (let i = 0; i < burst; i++) tick((i * tone.throttle) / 1000)
    lastTick.current = now + (burst - 1) * tone.throttle
  })

  async function toggleSound() {
    if (!muted) {
      setMuted(true)
      return
    }
    // The click is the gesture the AudioContext needs; a scroll is not one.
    try {
      if (!audio.current) {
        const ctx = new AudioContext()
        // One short buffer of white noise, reused by every tick.
        const frames = Math.floor(ctx.sampleRate * 0.08)
        const noise = ctx.createBuffer(1, frames, ctx.sampleRate)
        const channel = noise.getChannelData(0)
        for (let i = 0; i < frames; i++) channel[i] = Math.random() * 2 - 1
        const out = ctx.createGain()
        out.gain.value = 0.9
        out.connect(ctx.destination)
        audio.current = { ctx, noise, out }
      }
      if (audio.current.ctx.state === "suspended") {
        await audio.current.ctx.resume()
      }
      setMuted(false)
    } catch {
      // No audio available - stay muted rather than break the reveal.
    }
  }

  return (
    <div
      className={cn(
        "bg-background text-foreground [container-type:size] relative h-full min-h-[24rem] w-full overflow-hidden",
        className
      )}
    >
      <div
        ref={scrollRef}
        className="relative h-full w-full overflow-x-hidden overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* Tall track for the pinned panel to travel across. */}
        <div className="relative w-full" style={{ height: `${track}cqh` }}>
          <div className="sticky top-0 flex h-[100cqh] flex-col items-center justify-center px-[4cqw]">
            <Tag
              aria-label={lines.join(" ")}
              className={cn(
                "text-center text-[9cqw] leading-[0.98] font-medium tracking-[-0.035em]",
                textClassName
              )}
            >
              {lines.map((line, l) => (
                <span key={l} className="block whitespace-pre">
                  {plan
                    .filter((letter) => letter.line === l)
                    .map((letter) => (
                      <Letter
                        key={`${l}-${letter.index}`}
                        char={letter.char}
                        from={letter.from}
                        to={letter.to}
                        snap={snap}
                        space={space}
                        progress={scrollYProgress}
                      />
                    ))}
                </span>
              ))}
            </Tag>
          </div>
        </div>
      </div>

      {sound !== false ? (
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={!muted}
          aria-label={muted ? "Turn tick sound on" : "Turn tick sound off"}
          className={cn(
            "text-muted-foreground hover:text-foreground hover:bg-foreground/10",
            "absolute top-[4cqh] right-[4cqw] z-10 grid size-8 place-items-center rounded-full",
            "transition-colors duration-150 ease-smooth-out",
            "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]"
          )}
        >
          {muted ? (
            <VolumeX className="size-4" />
          ) : (
            <Volume2 className="size-4" />
          )}
        </button>
      ) : null}

      {label !== null ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-[7%] z-10 flex flex-col items-center">
          <span className="bg-foreground/20 mb-3 h-10 w-px" />
          <span className="text-muted-foreground text-xs leading-tight tracking-[0.22em] uppercase">
            {label}
          </span>
        </div>
      ) : null}
    </div>
  )
}
