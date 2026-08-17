import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { components, getComponent } from "@/src/registry-data";
import { PreviewStage } from "@/src/components/PreviewStage";

// The bare stage scripts/record-previews.mjs records the browse-wall clips from.
// Not linked from anywhere and kept out of search results; it exists so a clip
// is always a re-run away from matching the component it advertises.
export const dynamicParams = false;

export const metadata: Metadata = { robots: { index: false, follow: false } };

export function generateStaticParams() {
  return components.map((component) => ({ slug: component.slug }));
}

export default async function PreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const component = getComponent(slug);
  if (!component) notFound();

  return <PreviewStage slug={slug} fullBleed={component.fullBleed} />;
}
