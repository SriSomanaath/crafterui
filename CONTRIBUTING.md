# Contributing

## What a component is

Every registry component is **one self-contained file** at
`apps/web/registry/crafterui/ui/<name>.tsx`, copied verbatim into a user's project.
So it must:

- import nothing from this repo except `@/lib/utils` (`cn`) and other registry
  items under `@/registry/crafterui/ui/*` — each of those must be listed in
  `registryDependencies`
- reference only shadcn semantic tokens (`bg-card`, `text-muted-foreground`,
  `border`), never raw grays or hexes, so it picks up the consumer's own theme
  including dark mode
- start with `"use client";` if it uses hooks, refs or event handlers
- animate with **[motion/react](https://motion.dev)** for anything state-driven,
  and list `"motion"` in `dependencies`

`apps/web/app/globals.css` is the site's only stylesheet: `@import`, `@source`,
`@custom-variant`, `@theme` (tokens + site-chrome keyframes) and `@layer base`
element/`:root` resets. `pnpm check` fails the build if a second stylesheet
appears or a custom class lands in it. A component may carry its own scoped
`<style>` block where a third-party widget needs one (Swiper, the matrix
keyframes) — that CSS ships with the component and never touches the site's.

## Animation policy

- **motion/react** for state-driven work: enters/exits (`AnimatePresence`),
  layout glides (`layout`), scroll-linked visuals (`useScroll` + `useTransform`),
  measured morphs (the imperative `animate()`).
- **CSS transitions** only for pure hover/focus styling (colors, box-shadow,
  background) — never for state-driven movement, opacity, or reveals.
- Respect `prefers-reduced-motion`: `motion-reduce:` utilities, or
  `useReducedMotion()` around imperative sequences.

## Adding one

1. `apps/web/registry/crafterui/ui/<name>.tsx` — the installable component, free of
   demo data
2. `apps/web/registry/crafterui/examples/<name>-demo.tsx` — the demo. Demo props and
   data live HERE. This exact file both ships in the registry payload and renders
   as the live playground on the component page, so show the real prop surface.
3. `apps/web/registry.json` — the item: `name`, `title`, one-line `description`
   (it's what the CLI, OG tags and `/r/<name>.md` show), `dependencies`,
   `registryDependencies`, and `files[0].path`
4. `apps/web/src/catalog.ts` — the slug under a category. Add `fullBleed: true` if
   the demo needs to escape the page column.
5. `apps/web/src/components/CrafterShowcase.tsx` — the `dynamic()` line in the demo
   map (`next/dynamic` needs a literal path, so it can't be derived)

No route edits — `/components/[slug]` and `registry-data.ts` pick it up from
there. If it gets a browse-wall clip, drop the `.mov` in `apps/web/public/crafter`
and add it to the `videos` map in `src/registry-data.ts`.

## Tailwind v4 gotchas

1. **`blur-0` does not exist** — it silently compiles to nothing, so a
   `hover:blur-0` "un-blur" never applies. Use `blur-[0px]` (which also
   interpolates cleanly in filter transitions).
2. **Tailwind v4 animates native `translate` / `scale` / `rotate`**, not
   `transform`. A `transition: transform` will NOT animate `-translate-x-1/2` or
   `scale-[…]`. When a transform changes and must animate, use one arbitrary
   transform: `[transform:translate(-50%,-50%)_scale(0.88)]` +
   `group-hover/x:[transform:translate(-50%,-50%)_scale(1)]` +
   `[transition:transform_300ms_var(--ease-smooth-out)]`. (A bare `rotate-180` on
   a static toggle is fine — transition `rotate`.)
3. **Gate hover to hover-capable devices.** Plain `hover:` already does this,
   `group-hover` does not — stack the media variant:
   `[@media(hover:hover)]:group-hover/card:opacity-100`.
4. **`backdrop-filter` with multiple functions** is cleaner as an arbitrary
   property: `[backdrop-filter:blur(16px)_saturate(1.7)]`, transitioned via
   `[transition:backdrop-filter_350ms_var(--ease-smooth-out)]`.

## Verify

```bash
pnpm check                     # one-stylesheet + registry invariants
pnpm --filter web typecheck
pnpm --filter web build
```

Then install it into a scratch Next.js + Tailwind v4 app from the local registry
to confirm the copied file renders on its own:

```bash
pnpm --filter web dev          # serves /r/<name>.json on :3001
npx shadcn@latest add http://localhost:3001/r/<name>.json
```
