"use client";

import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import dynamic from "next/dynamic";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import {
  CheckIcon,
  CodeIcon,
  CollapseIcon,
  CommandIcon,
  ExpandIcon,
  ReplayIcon,
} from "../lib/icons";

/* ─────────────────────────────────────────────────────────
 * SHOWCASE - the live demo on every component page
 *
 * The demo opens at full viewport size and shrinks into the
 * page column as you scroll the first 60svh: the section is a
 * tall runway with a sticky child, so the demo stays pinned
 * while it resizes and only then scrolls away.
 *
 * Four controls ride in the corner: collapse/expand (which
 * just drives scroll, so size stays a pure function of scroll
 * position), replay, jump-to-code and copy-install.
 *
 * One file for all of them: the demo that ships in the
 * registry IS the demo shown here, so there is nothing per
 * component to write. Each is code-split and client-only -
 * canvas, WebGL and mic access have no server render worth
 * paying for, and these pages are static either way.
 * ───────────────────────────────────────────────────────── */

// Placeholder while a demo chunk loads, on the shared shimmer token.
function DemoSkeleton() {
  return (
    <div
      className="animate-shimmer h-40 w-full rounded-xl bg-[linear-gradient(90deg,var(--color-muted)_0%,var(--color-background)_50%,var(--color-muted)_100%)] bg-[length:200%_100%]"
      aria-hidden="true"
    />
  );
}

// slug → demo. next/dynamic needs a literal import path per entry, so the map is
// written out rather than derived; `pnpm check` fails if a catalogued component is
// missing from it. Keys stay quoted - the check greps for them.
export const demos: Record<string, ComponentType> = {
  "arrow-tooltip": dynamic(() => import("@/registry/crafterui/examples/arrow-tooltip-demo"), { ssr: false, loading: DemoSkeleton }),
  "countdown-timer": dynamic(() => import("@/registry/crafterui/examples/countdown-timer-demo"), { ssr: false, loading: DemoSkeleton }),
  "dither-helix-carousel": dynamic(() => import("@/registry/crafterui/examples/dither-helix-carousel-demo"), { ssr: false, loading: DemoSkeleton }),
  "dynamic-island": dynamic(() => import("@/registry/crafterui/examples/dynamic-island-demo"), { ssr: false, loading: DemoSkeleton }),
  "glass-lens-carousel": dynamic(() => import("@/registry/crafterui/examples/glass-lens-carousel-demo"), { ssr: false, loading: DemoSkeleton }),
  "handwritten-response": dynamic(() => import("@/registry/crafterui/examples/handwritten-response-demo"), { ssr: false, loading: DemoSkeleton }),
  "hero-carousel": dynamic(() => import("@/registry/crafterui/examples/hero-carousel-demo"), { ssr: false, loading: DemoSkeleton }),
  "letter-reveal": dynamic(() => import("@/registry/crafterui/examples/letter-reveal-demo"), { ssr: false, loading: DemoSkeleton }),
  "mercury-dial": dynamic(() => import("@/registry/crafterui/examples/mercury-dial-demo"), { ssr: false, loading: DemoSkeleton }),
  "mercury-menu": dynamic(() => import("@/registry/crafterui/examples/mercury-menu-demo"), { ssr: false, loading: DemoSkeleton }),
  "molten-ring-carousel": dynamic(() => import("@/registry/crafterui/examples/molten-ring-carousel-demo"), { ssr: false, loading: DemoSkeleton }),
  "spine-accordion": dynamic(() => import("@/registry/crafterui/examples/spine-accordion-demo"), { ssr: false, loading: DemoSkeleton }),
  "super-hover-list": dynamic(() => import("@/registry/crafterui/examples/super-hover-list-demo"), { ssr: false, loading: DemoSkeleton }),
  "works-wheel": dynamic(() => import("@/registry/crafterui/examples/works-wheel-demo"), { ssr: false, loading: DemoSkeleton }),
  "username-reel": dynamic(() => import("@/registry/crafterui/examples/username-reel-demo"), { ssr: false, loading: DemoSkeleton }),
};

/** Scroll distance the shrink takes. */
const RUNWAY = "60svh";
/** The page column the demo lands in: max-w-3xl inside the page's px-6. */
const COLUMN = 768;
const GUTTER = 48;
/** Resting height, matching the old inline surface. */
const RESTING_PX = 600;
const RESTING_RATIO = 0.8;
const RESTING = `min(${RESTING_PX}px, ${RESTING_RATIO * 100}svh)`;

const SURFACE = "relative overflow-hidden border border-border bg-muted/60";
/** Corner inset of the controls when the demo is full bleed (Tailwind's `4`). */
const STAGE_PAD = 16;
/** Height of the control pill: size-8 button in a p-1 track. */
const CONTROL_H = 40;

function ControlButton({
  label,
  onClick,
  href,
  children,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  children: ReactNode;
}) {
  const className =
    "grid size-8 place-items-center rounded-full text-muted-foreground transition-[color,background-color,scale] hover:bg-muted hover:text-foreground active:scale-[0.92] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
  if (href) {
    return (
      <a href={href} aria-label={label} title={label} className={className}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={className}>
      {children}
    </button>
  );
}

export function CrafterShowcase({
  slug,
  title,
  fullBleed = false,
  chrome,
}: {
  slug: string;
  title: string;
  /** Render the demo edge-to-edge, with no centered surface around it. */
  fullBleed?: boolean;
  /** Floated into the demo's top-left corner - the back link and theme toggle. */
  chrome?: ReactNode;
}) {
  const Demo = demos[slug];
  const runwayRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [stage, setStage] = useState({ w: 0, h: 0 });
  // Bumping the key remounts the demo, which is what "replay" means for a
  // component whose animation runs on mount.
  const [take, setTake] = useState(0);
  const [copied, setCopied] = useState(false);
  const [shrunk, setShrunk] = useState(false);

  const { scrollYProgress } = useScroll({
    target: runwayRef,
    offset: ["start start", "end end"],
  });
  useMotionValueEvent(scrollYProgress, "change", (p) => setShrunk(p > 0.5));

  // Sizes are interpolated as plain pixels off a measured stage. The tidier
  // pure-CSS version - one calc per axis driven by a motion value - miscomputes
  // to zero at exactly p=1 in Chromium whenever a min() is multiplied inside it.
  useEffect(() => {
    const sticky = stickyRef.current;
    if (!sticky) return;
    const read = () => setStage({ w: sticky.clientWidth, h: sticky.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(sticky);
    return () => ro.disconnect();
  }, [reduced]);

  const measured = stage.w > 0;
  const width = useTransform(scrollYProgress, [0, 1], [stage.w, Math.min(COLUMN, stage.w - GUTTER)]);
  const height = useTransform(
    scrollYProgress,
    [0, 1],
    [stage.h, Math.min(RESTING_PX, stage.h * RESTING_RATIO)]
  );
  const radius = useTransform(scrollYProgress, [0, 1], [0, 16]);

  // The controls ride on the stage, not on the surface, so they end up outside
  // the shrunken card rather than sitting on top of the demo. Their inset is the
  // margin the surface has left around itself: at full bleed there is none and
  // they rest in the viewport corners exactly as before, and as the card pulls
  // in they track its edges and lift clear of its top.
  const inset = (span: number, size: number, lift: number) =>
    Math.max(STAGE_PAD, (span - size) / 2 - lift);
  const padX = useTransform(width, (w) => inset(stage.w, w, 0));
  const padY = useTransform(height, (h) => inset(stage.h, h, CONTROL_H + STAGE_PAD - 4));

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  const controls = (
    // A full-stage layer rather than two corner-pinned boxes, so one pair of
    // paddings places both groups. It spans the whole stage, so it has to let
    // clicks through to the demo underneath.
    <motion.div
      className="pointer-events-none absolute inset-0 z-10 flex items-start"
      style={{ paddingLeft: padX, paddingRight: padX, paddingTop: padY }}
    >
      {chrome ? <div className="pointer-events-auto flex items-center gap-3">{chrome}</div> : null}
      <div className="pointer-events-auto ml-auto flex items-center gap-0.5 rounded-full bg-background/75 p-1 shadow-border backdrop-blur-md">
        {/* Size is a function of scroll position, so this scrolls rather than
            keeping a second source of truth for "is it expanded". */}
        <ControlButton
          label={shrunk ? "Expand preview" : "Collapse preview"}
          onClick={() => {
            const runway = runwayRef.current;
            if (!runway) return;
            const top = shrunk ? runway.offsetTop : runway.offsetTop + runway.offsetHeight - window.innerHeight;
            window.scrollTo({ top, behavior: "smooth" });
          }}
        >
          {shrunk ? <ExpandIcon /> : <CollapseIcon />}
        </ControlButton>

        <ControlButton label="Replay demo" onClick={() => setTake((t) => t + 1)}>
          <ReplayIcon />
        </ControlButton>

        {/* A plain anchor: the browser does the smooth scroll (globals.css) and
            the hash is what tells the code section to unfold its source. */}
        <ControlButton label="Jump to code" href="#code">
          <CodeIcon />
        </ControlButton>

        <ControlButton
          label="Copy install command"
          onClick={() => {
            navigator.clipboard
              .writeText(`npx shadcn@latest add "https://crafterui.com/r/${slug}.json"`)
              .then(() => setCopied(true))
              .catch(() => setCopied(false));
          }}
        >
          {copied ? <CheckIcon /> : <CommandIcon />}
        </ControlButton>
      </div>
    </motion.div>
  );

  const body = (
    <div className={fullBleed ? "h-full w-full" : "my-auto w-full px-6 py-8"}>
      {Demo ? <Demo key={take} /> : <DemoSkeleton />}
    </div>
  );

  // Reduced motion: no scroll-linked resize at all, just the resting surface.
  if (reduced) {
    return (
      <section
        aria-label={`${title} demo`}
        className={`animate-fade-in mx-auto flex w-full max-w-3xl rounded-2xl ${SURFACE}`}
        style={{ height: RESTING }}
      >
        {controls}
        {body}
      </section>
    );
  }

  return (
    <section
      ref={runwayRef}
      aria-label={`${title} demo`}
      style={{ height: `calc(100svh + ${RUNWAY})` }}
    >
      <div ref={stickyRef} className="sticky top-0 flex h-svh w-full items-center justify-center">
        <motion.div
          className={`flex ${SURFACE}`}
          // Until the stage is measured the demo is full size, which is exactly
          // where the scroll starts - so there is nothing to see resize.
          style={{
            width: measured ? width : "100%",
            height: measured ? height : "100%",
            borderRadius: radius,
          }}
        >
          {body}
        </motion.div>
        {controls}
      </div>
    </section>
  );
}
