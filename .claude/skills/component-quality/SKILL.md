---
name: component-quality
description: Enforce the 21st.dev quality guidelines on crafterui registry components — visual quality, component/demo separation, and theming. Use when adding a component to the registry, reviewing one, or auditing the whole registry for compliance. Triggers on "add a component", "review this component", "does this pass the guidelines", "audit the registry", "is this ready to publish".
allowed-tools:
  - Bash
  - Read
  - Edit
  - Write
  - Grep
  - Glob
---

# Component Quality

Gate for every component in `apps/web/registry/crafterui/`. Adapted from the
[21st.dev quality guidelines](https://github.com/serafimcloud/21st#quality-guidelines);
the three principles are theirs, the checks are how they're enforced here.

**Quality over quantity.** A component that fails any gate below does not ship.

---

## The three gates

### 1. Visual Quality

- Visually polished; provides real value. Not a variation on something already in the registry.
- Follows modern UI/UX practice: interruptible animation, `prefers-reduced-motion` honoured, focus-visible rings, no layout shift on hover.
- Renders correctly at every viewport the demo surface allows.

### 2. Code Structure

Follow shadcn/ui's split: **the component file contains only reusable functionality.**

- `ui/<name>.tsx` — the installable component. No demo scaffolding, no sample copy, no state-picker controls, no instructional captions. If a user installs it, everything they get should be something they want.
- `examples/<name>-demo.tsx` — **showcases the component through props, not hardcoded content.** If the demo renders `<Thing />` with no props, either the component has demo content baked in, or it isn't parameterised enough. Both are failures.
- Anything a demo needs to build its own controls (state unions, accent maps, item lists) is `export`ed from the component file.
- Sub-parts a consumer might want alone (individual icons, a single row) are exported, not private.

### 3. Theming

- Use the shadcn theme tokens from `app/globals.css`. Never a raw hex, `rgb()`, or `bg-black`/`text-white` for a themed surface.
- Both light and dark must work out of the box, with no `dark:` overrides needed at the call site.
- Canvas/WebGL components read the live value at draw time — `getComputedStyle(el).color` (preferred, follows `text-*` too) or `getPropertyValue("--foreground")`.

**Legitimate exceptions** — a surface that supplies its own background, and is therefore theme-independent:
- Fixed-palette brand replicas (the Dynamic Island's black pill and Apple system accents).
- Always-dark or always-light islands (a terminal block), where the paired foreground is also fixed.
- Colours exposed as an overridable prop with a documented default (`accentColor = "#ff3828"`).
- Mask/gradient stops where the colour is opacity, not paint (`rgba(255,255,255,0)`, `#000` in a `mask-image`).

Everything else is a violation.

> **Note on `hsl(var(--x))`:** the upstream 21st guideline predates Tailwind v4.
> This repo's tokens are `oklch` and are consumed as bare `var(--background)` or
> `bg-background` utilities. Use the repo's convention — the intent (never
> hardcode, always token) is what carries over.

---

## Running the audit

From `apps/web`:

Every grep below is a **triage aid, not a verdict** — each one has known false
positives, listed with it. Read the hit before you touch it.

```bash
# G3 — hardcoded colours. Check each hit against the exceptions above.
# Known-good today: dynamic-island (fixed Apple palette), countdown-timer:148
# (already pairs bg-black/[0.06] with dark:bg-white/10), hero-carousel (always-dark
# island - a full-bleed photograph is the background in every state, so the chrome
# is fixed light-on-dark; its black/white washes are opacity, not paint).
grep -rnE '(bg|text|border|fill|stroke|from|to|via)-\[#[0-9a-fA-F]{3,8}\]|bg-black|bg-white|text-black' \
  registry/crafterui/ui registry/crafterui/examples

# G2 — a demo rendering ITS OWN component with no props. Scoped to the slug, so
# local sub-components inside the demo don't trip it.
for f in registry/crafterui/examples/*-demo.tsx; do
  slug=$(basename "$f" -demo.tsx)
  comp=$(grep -oE "import \{[^}]*\} from \"@/registry/crafterui/ui/$slug\"" "$f" |
         grep -oE '\{[^}]*\}' | tr -d '{} ' | cut -d, -f1)
  [ -n "$comp" ] && grep -qE "<$comp ?/>" "$f" && echo "$slug: <$comp /> takes no props"
done
# False positive: compound parts that read from context (<ScrubBarProgress />).

# G2 — demo scaffolding inside a component: instructional copy, control strips.
# Read 3 lines of context: a11y text is REQUIRED by the accessibility gate and
# often sits on its own line under `aria-label={`.
grep -rniE -B3 '"(try |click |hover |tap |drag )' registry/crafterui/ui

# Repo invariants: name==slug==file==page, demo exists, showcase wired, descriptions present.
cd .. && pnpm check
```

### G1/G3 — the live dark-mode sweep

Static greps miss contrast. Build, serve, force dark, and probe each demo for
light-only surfaces. Uses the `browse` binary from the gstack browse skill.

```bash
pnpm build && (cd apps/web && npx next start -p 3461 &)
B="$HOME/.claude/skills/gstack/browse/dist/browse"
$B goto http://localhost:3461/components/letter-reveal
$B js "localStorage.setItem('theme','dark'); document.documentElement.classList.add('dark')"
```

Then for each slug, navigate and run `scripts/probe-dark.js` (below) via
`$B eval`. A non-empty result is a failure. Only meaningful with the page in
**dark** mode — in light mode every light surface is a false positive.

The probe resolves colours through a 1×1 canvas, because `getComputedStyle`
returns authored `oklch()` that naive RGB parsing silently mis-reads as
near-black. See `scripts/probe-dark.js`.

---

## Adding a component

Five files, in this order. `pnpm check` fails on any one missed.

1. `apps/web/registry/crafterui/ui/<name>.tsx` — the component. Gate 2 and 3 apply.
2. `apps/web/registry/crafterui/examples/<name>-demo.tsx` — the demo. Must pass props.
3. `apps/web/registry.json` — item with a **non-empty title and description**. `files[0].path` must be exactly `registry/crafterui/ui/<name>.tsx`.
4. `apps/web/src/catalog.ts` — the slug, under a category.
5. `apps/web/src/components/CrafterShowcase.tsx` — the `dynamic()` line.

Headless entries (hooks, controllers — e.g. `super-hover`) still need a title
and description in `registry.json`, but stay out of `catalog.ts` and the
showcase map: they have no visual demo. `check-registry.mjs` allows this.

Then `pnpm registry:build` to regenerate `public/r/*`.

## Prop conventions

- TypeScript throughout. Props interface named `<Component>Props`.
- Every prop carries a JSDoc line ending in `@default <value>` — these are read directly off the source on the component page.
- Meaningful defaults: the component should look right with zero props passed.
- Controlled/uncontrolled where state is involved: `state` + `onStateChange`, falling back to `defaultState`.
- `className` last in the interface, merged through `cn()` so callers can override.

## Accessibility

- Interactive elements are real `<button>`/`<a>`, with `aria-label` when the content is an icon.
- Toggles carry `aria-pressed`; disclosures `aria-expanded`.
- Visible `focus-visible` state on every control.
- Animation respects `prefers-reduced-motion`.
