import Image from "next/image";
import Link from "next/link";
import { LabClipCard } from "./LabClipCard";
import { Divider, ThemeToggle } from "./navigation";
import { ArrowLeftIcon, GitHubIcon } from "../lib/icons";
import { catalog } from "../catalog";
import type { CrafterComponent } from "../registry-data";

const GITHUB_URL = "https://github.com/SriSomanaath/crafterui";

export function LabHome({ bento }: { bento: CrafterComponent[] }) {
  // The browse page is a three-up wall of cards, grouped in the registry's own
  // categories. Each card stages the component's name on a quiet surface;
  // hovering frosts it and floats a liquid-glass View button that routes to
  // /components/<slug>.
  const bySlug = new Map(bento.map((entry) => [entry.slug, entry]));
  let cardIndex = 0;

  return (
    <div className="min-h-screen flex flex-col items-center py-24 px-6 selection:bg-foreground selection:text-background">
      <main className="w-full max-w-5xl">
        <header className="mb-10 animate-fade-in">
          <div className="mb-8 flex items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-base font-medium"
            >
              <ArrowLeftIcon />
              <Image src="/logo.png" alt="" width={28} height={28} className="dark:invert" />
              crafterui.com
            </Link>
            <div className="flex items-center gap-3">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub repository"
                className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <GitHubIcon />
              </a>
              <ThemeToggle />
            </div>
          </div>
          <h1 className="text-xl font-medium tracking-tight text-foreground leading-snug text-balance">Components</h1>
          <p className="text-muted-foreground text-[0.9375rem] leading-relaxed mt-3 max-w-xl text-pretty">
            Motion and interaction components you can customize, extend, and build on. Open any for the live demo and the
            source you can copy or install with{" "}
            <code className="text-foreground">npx @crafterui/cli@latest components add</code>.
          </p>
        </header>

        <Divider delay={30} className="mb-8" />

        {bento.length > 0 ? (
          <div className="flex flex-col gap-12">
            {catalog.map((category) => {
              const entries = category.components
                .map((entry) => bySlug.get(entry.slug))
                .filter((entry): entry is CrafterComponent => Boolean(entry));
              if (!entries.length) return null;

              return (
                <section key={category.slug}>
                  {/* Same uppercase kicker every section label on this site uses. */}
                  <h2 className="animate-fade-in text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground select-none">
                    {category.title}
                  </h2>
                  <p className="animate-fade-in mt-1 mb-4 text-sm text-muted-foreground text-pretty">{category.description}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {entries.map((entry) => (
                      <LabClipCard key={entry.slug} entry={entry} index={cardIndex++} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <p className="animate-fade-in text-muted-foreground text-sm text-center py-16">More components landing soon.</p>
        )}

        <Divider delay={320} className="mt-10 mb-8" />

        <footer className="animate-fade-in text-center" style={{ animationDelay: "340ms" }}>
          <p className="text-muted-foreground text-sm">
            By{" "}
            <Link href="https://crafterui.com" className="hover:text-foreground transition-colors">
              crafterui
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}
