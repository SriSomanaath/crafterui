"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import type { CrafterVideo } from "../registry-data";

/* The moving face of a browse card.
 *
 * Two things keep a wall of twelve clips civil:
 *  - only the cards on screen decode. `preload="none"` plus an observer means a
 *    visitor who never scrolls past Hover Theatre downloads three clips, not
 *    twelve, and no off-screen card burns CPU.
 *  - the clip follows the theme. Each component is recorded twice; a light clip
 *    left on a dark page is a glowing white rectangle, which is exactly what the
 *    browse wall must not have. Until next-themes has resolved on the client the
 *    light clip stands in, matching the site's own default. */
export function PreviewClip({ video, title }: { video: CrafterVideo; title: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const src = mounted && resolvedTheme === "dark" ? video.darkSrc : video.src;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        // play() rejects if the element is torn down mid-promise; nothing to do.
        if (entry.isIntersecting) element.play().catch(() => {});
        else element.pause();
      },
      { rootMargin: "200px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
    // Re-observed on a theme flip so the swapped-in clip starts playing too.
  }, [src]);

  return (
    <video
      ref={ref}
      className="absolute inset-0 h-full w-full object-cover"
      src={src}
      poster={video.poster}
      style={{ aspectRatio: video.aspectRatio }}
      loop
      muted
      playsInline
      preload="none"
      aria-label={title}
    />
  );
}
