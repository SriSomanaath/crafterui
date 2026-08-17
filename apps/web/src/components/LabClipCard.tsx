import Link from "next/link";
import { PreviewClip } from "./PreviewClip";
import type { CrafterComponent } from "../registry-data";

// Frost veil between the card face and the pill. Blur is transitioned on the
// backdrop-filter itself (backdrop effects don't fade reliably via opacity), so
// the face melts out of focus. Revealed on pointer hover (gated to hover-capable
// devices) or keyboard focus landing on the card link.
const FROST =
  "absolute inset-0 z-[2] rounded-[inherit] pointer-events-none bg-white/0 [backdrop-filter:blur(0px)] " +
  "[transition:background-color_350ms_var(--ease-smooth-out),backdrop-filter_350ms_var(--ease-smooth-out)] " +
  "motion-reduce:[transition:background-color_150ms_linear] " +
  "[@media(hover:hover)]:group-hover/card:bg-white/[0.28] [@media(hover:hover)]:group-hover/card:[backdrop-filter:blur(10px)] " +
  "group-focus-within/card:bg-white/[0.28] group-focus-within/card:[backdrop-filter:blur(10px)]";

// Liquid glass: translucent white over the frosted face, boosted saturation, a
// specular top edge (inset highlight) and a soft drop. Rests scaled-down and
// hidden; the reveal scales it to 1.
const VIEW =
  "absolute left-1/2 top-1/2 z-[3] px-5 py-[0.4375rem] rounded-full text-[0.8125rem] font-medium text-[#111] pointer-events-none opacity-0 " +
  "[transform:translate(-50%,-50%)_scale(0.88)] " +
  "bg-white/[0.42] [backdrop-filter:blur(16px)_saturate(1.7)] border border-white/70 " +
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.85),inset_0_-1px_1px_rgba(255,255,255,0.2),0_10px_28px_rgba(17,17,17,0.16),0_1px_2px_rgba(17,17,17,0.08)] " +
  "[transition:opacity_250ms_var(--ease-smooth-out),transform_300ms_var(--ease-smooth-out),background-color_200ms_var(--ease-smooth-out)] " +
  "motion-reduce:[transition:opacity_150ms_linear] " +
  "[@media(hover:hover)]:group-hover/card:opacity-100 [@media(hover:hover)]:group-hover/card:[transform:translate(-50%,-50%)_scale(1)] [@media(hover:hover)]:group-hover/card:pointer-events-auto " +
  "group-focus-within/card:opacity-100 group-focus-within/card:[transform:translate(-50%,-50%)_scale(1)] group-focus-within/card:pointer-events-auto";

interface LabClipCardProps {
  entry: CrafterComponent;
  index: number;
}

export function LabClipCard({ entry, index }: LabClipCardProps) {
  const { slug, title, video } = entry;

  return (
    <figure className="animate-fade-in" style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}>
      <div
        className="group/card relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-muted/60"
        data-slug={slug}
      >
        {video ? (
          <PreviewClip video={video} title={title} />
        ) : (
          // No clip: the card face is the name itself, on the same quiet surface
          // every playground on this site uses. The section heading above the
          // grid already says which category it belongs to.
          <div className="absolute inset-0 grid place-items-center px-5">
            <span className="text-base font-medium tracking-tight text-foreground text-balance text-center">{title}</span>
          </div>
        )}
        <div className={FROST} aria-hidden="true" />
        <span className={VIEW} aria-hidden="true">
          View
        </span>
        {/* Stretched link over the whole card: a tap anywhere navigates, so the
            View pill can stay a hover/focus-only affordance (hidden on touch). */}
        <Link
          href={`/components/${slug}`}
          className="absolute inset-0 z-[4] rounded-[inherit] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          aria-label={`View ${title}`}
        />
      </div>
    </figure>
  );
}
