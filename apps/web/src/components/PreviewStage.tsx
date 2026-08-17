"use client";

import { demos } from "./CrafterShowcase";

/* The recording stage for the browse-wall clips.
 *
 * One demo, alone, filling the viewport at the card's 4:3 - no page chrome, no
 * scroll runway, no controls. scripts/record-previews.mjs points a headless
 * Chromium at /preview/<slug>, drives it, and screencasts the result into
 * public/crafter/<slug>.mp4.
 *
 * The surround matches CrafterShowcase's resting surface so a clip cut here
 * sits on the browse card without a seam. Every scroll-driven component in the
 * registry scrolls its OWN container (useScroll({ container })), so the stage
 * never scrolls: a wheel event over the demo drives the demo. */
export function PreviewStage({ slug, fullBleed }: { slug: string; fullBleed: boolean }) {
  const Demo = demos[slug];

  return (
    <div
      data-preview={slug}
      className="fixed inset-0 flex overflow-hidden bg-muted/60"
    >
      <div className={fullBleed ? "h-full w-full" : "my-auto w-full px-6 py-8"}>
        {Demo ? <Demo /> : null}
      </div>
    </div>
  );
}
