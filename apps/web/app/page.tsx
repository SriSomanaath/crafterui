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
        <p className="animate-fade-in font-mono text-xs tracking-wide text-muted-foreground select-none">crafterui</p>

        <h1
          className="animate-fade-in mt-3 text-2xl font-medium tracking-tight leading-[1.1] text-foreground text-balance"
          style={{ animationDelay: "50ms" }}
        >
          Less is more
        </h1>

        <p
          className="animate-fade-in mt-4 text-muted-foreground text-[0.9375rem] leading-relaxed text-pretty"
          style={{ animationDelay: "100ms" }}
        >
          Open Source <span className="font-medium text-foreground">motion and interaction components</span> you can{" "}
          <span className="font-medium text-foreground">customize, extend, and build on</span>. Scroll reveals, kinetic
          type, tooltips and toggles, built in React and fully Tailwind, and available in the{" "}
          <span className="font-medium text-foreground">shadcn registry</span> - copy the source, install it with{" "}
          <code className="whitespace-nowrap text-foreground">npx @crafterui/cli</code>, or star it on{" "}
          <a
            href="https://github.com/crafterui/ui"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
          >
            GitHub
          </a>
          .
        </p>

        <div className="animate-fade-in mt-8" style={{ animationDelay: "150ms" }}>
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
        </div>
      </main>
    </div>
  );
}
