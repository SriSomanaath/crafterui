import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@/src/lib/icons";

/* ─────────────────────────────────────────────────────────
 * ENTRANCE STORYBOARD
 *
 *    0ms   wordmark kicker fades in
 *   50ms   headline lands
 *  100ms   paragraph settles
 *  150ms   CTA arrives
 * ───────────────────────────────────────────────────────── */

// The landing: one quiet statement, dead-center in the window. The registry
// itself lives at /components.
export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 selection:bg-foreground selection:text-background">
      <main className="max-w-md text-center">
        {/* The mark is a solid black glyph on transparency - no tile - so it vanishes
            against the dark page. invert() flips RGB and leaves alpha alone, which
            turns it white and keeps the antialiased edges clean. */}
        <div className="animate-fade-in flex items-center justify-center gap-3 select-none">
          <Image src="/logo.png" alt="" width={44} height={44} className="dark:invert" priority />
          <p className="font-mono text-lg tracking-wide text-foreground">crafterui</p>
        </div>

        <h1
          className="animate-fade-in mt-3 text-2xl font-medium tracking-tight leading-[1.1] text-foreground text-balance"
          style={{ animationDelay: "50ms" }}
        >
          Less is more
        </h1>

        {/* One sentence, no bolded fragments - the emphasis speckling made this
            read as a wall. Install details live on each component page. */}
        <p
          className="animate-fade-in mt-4 text-muted-foreground text-[0.9375rem] leading-relaxed text-pretty"
          style={{ animationDelay: "100ms" }}
        >
          Open source motion and interaction components for React and Tailwind, on the shadcn registry.
        </p>

        <div className="animate-fade-in mt-8 flex items-center justify-center gap-5" style={{ animationDelay: "150ms" }}>
          <Link
            href="/components"
            className="group inline-flex items-center gap-2 rounded-full bg-foreground py-2.5 pl-5 pr-4 text-sm font-medium text-background select-none transition-[background-color,scale] hover:opacity-90 active:scale-[0.96]"
          >
            Browse components
            {/* The arrow leans into the journey on hover; translate only, so the
                nudge is interruptible and never shifts the label. */}
            <span className="inline-flex transition-[translate] duration-200 ease-icon group-hover:translate-x-0.5">
              <ArrowRightIcon />
            </span>
          </Link>
          <a
            href="https://github.com/SriSomanaath/crafterui"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            GitHub
          </a>
        </div>
      </main>
    </div>
  );
}
