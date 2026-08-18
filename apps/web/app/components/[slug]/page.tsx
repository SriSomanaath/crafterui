import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { components, getComponent } from "@/src/registry-data";
import { highlight } from "@/src/lib/highlight";
import { CodeSection } from "@/src/components/CodeSection";
import { CrafterShowcase } from "@/src/components/CrafterShowcase";
import { ShowcaseIntro } from "@/src/components/ShowcaseIntro";
import { BackLink, Divider, ThemeToggle } from "@/src/components/navigation";

/* ─────────────────────────────────────────────────────────
 * ENTRANCE STORYBOARD (every component page shares this)
 *
 *    0ms   the live demo, opening at full viewport size
 *   40ms   component title + intro (ShowcaseIntro delay=40)
 *  100ms   Install / Usage / Source block
 *  120ms   divider
 *  140ms   footer byline
 *
 * The demo leads: it fills the window, then shrinks into the
 * column as you scroll past it. Everything else is below.
 * ───────────────────────────────────────────────────────── */

// Only the known slugs are valid pages; anything else 404s.
export const dynamicParams = false;

export function generateStaticParams() {
  return components.map((component) => ({ slug: component.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const component = getComponent(slug);
  if (!component) return {};

  const title = `${component.title} | crafterui`;
  const description = component.description;
  const ogImage = `/og?component=${slug}&v=1`;

  return {
    title: component.title,
    description,
    alternates: { canonical: `/components/${slug}` },
    openGraph: {
      title,
      description,
      url: `/components/${slug}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

// The exact file the registry serves is the file shown here; the usage box shows
// the demo that ships beside it - the same one rendered above.
function readRegistryFile(relative: string): string | null {
  const abs = path.join(process.cwd(), "registry", "crafterui", relative);
  return fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : null;
}

// The AI document build-registry.mjs generates (predev/prebuild, so it exists
// before any page render). Served at /r/<slug>.md; copied by "Copy .md".
function readGeneratedMd(slug: string): string | null {
  const abs = path.join(process.cwd(), "public", "r", `${slug}.md`);
  return fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : null;
}

export default async function ComponentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const component = getComponent(slug);
  if (!component) notFound();

  const source = readRegistryFile(`ui/${slug}.tsx`);
  if (!source) notFound();
  const usage = readRegistryFile(`examples/${slug}-demo.tsx`);
  const markdown = readGeneratedMd(slug);
  const highlightedHtml = await highlight(source);
  const usageHtml = usage ? await highlight(usage) : null;

  return (
    <div className="min-h-screen selection:bg-foreground selection:text-background">
      <CrafterShowcase
        slug={slug}
        title={component.title}
        fullBleed={component.fullBleed}
        chrome={
          <>
            <BackLink href="/components" label="Components" />
            <ThemeToggle />
          </>
        }
      />

      <main className="mx-auto w-full max-w-3xl px-6 pt-10 pb-24">
        <ShowcaseIntro title={component.title} delay={40} defaultOpen>
          {component.description}
        </ShowcaseIntro>

        {/* The preview's code control links here, and the hash unfolds Source. */}
        <div id="code" className="scroll-mt-6">
          <CodeSection
            slug={slug}
            source={source}
            highlightedHtml={highlightedHtml}
            usage={usage}
            usageHtml={usageHtml}
            markdown={markdown}
          />
        </div>

        <Divider delay={120} className="mt-10 mb-8" />

        <footer className="animate-fade-in text-center" style={{ animationDelay: "140ms" }}>
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
