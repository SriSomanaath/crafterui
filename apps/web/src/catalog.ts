// Browse-page grouping for the crafterui registry: which category a component
// sits in, and whether its demo renders edge-to-edge. Titles and descriptions
// come from registry.json - this file never repeats them.
// Mirrors lib/component-categories.ts on crafterui.com; regenerate when it changes.

export interface CatalogEntry {
  slug: string;
  /** Render the demo edge-to-edge, with no centered surface around it. */
  fullBleed?: boolean;
}

export interface CatalogCategory {
  slug: string;
  title: string;
  description: string;
  components: CatalogEntry[];
}

export const catalog: CatalogCategory[] = [
  {
    "slug": "frame-magic",
    "title": "Frame Magic",
    "description": "Galleries, filmstrips and image reveals",
    "components": [
      {
        "slug": "hero-carousel",
        "fullBleed": true
      },
      {
        "slug": "works-wheel",
        "fullBleed": true
      },
      {
        "slug": "glass-lens-carousel",
        "fullBleed": true
      },
      {
        "slug": "dither-helix-carousel",
        "fullBleed": true
      },
      {
        "slug": "molten-ring-carousel",
        "fullBleed": true
      },
      {
        "slug": "spine-accordion",
        "fullBleed": true
      }
    ]
  },
  {
    "slug": "liquid-metal",
    "title": "Liquid Metal",
    "description": "Gooey surfaces that fuse, stretch and snap back",
    "components": [
      {
        "slug": "mercury-dial",
        "fullBleed": true
      },
      {
        "slug": "mercury-menu",
        "fullBleed": true
      }
    ]
  },
  {
    "slug": "hover-theatre",
    "title": "Hover Theatre",
    "description": "Hover cards, cursor-tracked lists, tooltips",
    "components": [
      {
        "slug": "arrow-tooltip"
      },
      {
        "slug": "dynamic-island"
      },
      {
        "slug": "super-hover-list",
        "fullBleed": true
      }
    ]
  },
  {
    "slug": "scrollverse",
    "title": "Scrollverse",
    "description": "Scroll reveals and scroll-pinned type",
    "components": [
      {
        "slug": "letter-reveal",
        "fullBleed": true
      }
    ]
  },
  {
    "slug": "kinetic-type",
    "title": "Kinetic Type",
    "description": "Animated, rolling and handwritten text",
    "components": [
      {
        "slug": "countdown-timer",
        "fullBleed": true
      },
      {
        "slug": "username-reel",
        "fullBleed": true
      },
      {
        "slug": "handwritten-response",
        "fullBleed": true
      }
    ]
  }
];
