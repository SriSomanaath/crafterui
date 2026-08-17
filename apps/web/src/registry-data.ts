import registry from "../registry.json";
import clips from "./preview-clips.json";
import { catalog } from "./catalog";

// Plain, serializable component metadata derived from registry.json (the single
// source of truth) joined with catalog.ts (grouping + the full-bleed flag). No
// React imports, so this is safe to use in Server Components and pass across the
// server/client boundary. The slug → live demo map lives in CrafterShowcase.tsx.

export interface CrafterVideo {
  src: string;
  /** The same clip recorded on a dark page - see PreviewClip. */
  darkSrc: string;
  /** Frame 0 of the light clip, so the card shows the loop's first frame before it plays. */
  poster: string;
  aspectRatio: string;
}

export interface CrafterComponent {
  slug: string;
  title: string;
  description: string;
  category: string;
  /** Render the demo edge-to-edge, with no centered surface around it. */
  fullBleed: boolean;
  /** A looping clip for the browse card. Cards fall back to a title tile without one. */
  video: CrafterVideo | null;
}

// Clips per slug, served from public/crafter. preview-clips.json is written by
// `pnpm record:previews`, so this map only ever names files that were actually
// recorded - a component without a clip keeps its title tile rather than
// rendering a <video> at a 404.
const videos: Record<string, CrafterVideo> = Object.fromEntries(
  clips.slugs.map((slug) => [
    slug,
    {
      src: `/crafter/${slug}.mp4`,
      darkSrc: `/crafter/${slug}.dark.mp4`,
      poster: `/crafter/${slug}.jpg`,
      aspectRatio: clips.aspectRatio,
    },
  ]),
);

const registryItems = new Map(registry.items.map((item) => [item.name, item]));

// Catalog order is the browse order. An entry with no registry item is a
// mistake `pnpm check` catches, so the map is safe to trust here.
export const components: CrafterComponent[] = catalog.flatMap((category) =>
  category.components.flatMap((entry) => {
    const item = registryItems.get(entry.slug);
    if (!item) return [];
    return [
      {
        slug: item.name,
        title: item.title,
        description: item.description,
        category: category.slug,
        fullBleed: entry.fullBleed ?? false,
        video: videos[item.name] ?? null,
      },
    ];
  }),
);

// The browse wall: every catalogued component, in catalog order.
export const bento = components;

export function getComponent(slug: string): CrafterComponent | null {
  return components.find((component) => component.slug === slug) ?? null;
}
