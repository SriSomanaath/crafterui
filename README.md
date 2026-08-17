<p align="center">
  <a href="https://crafterui.dev">
    <img width="120" alt="crafterui" src="https://crafterui.dev/crafterui.svg" />
  </a>
</p>

<h1 align="center">crafterui</h1>

<p align="center">
  <strong>Less is more.</strong> Open Source motion and interaction components you can
  customize, extend, and build on. React + Tailwind, on the shadcn registry.
</p>

<p align="center">
  <a href="https://crafterui.dev/components">Browse</a> ·
  <a href="https://github.com/crafterui/ui/issues/new">Report a bug</a> ·
  <a href="https://github.com/crafterui/ui/issues/new">Feature request</a>
</p>

## Features

- **Motion & interaction components** — scroll reveals, kinetic type, tooltips, toggles, AI composers; each built to do one thing well
- **Open, then install** — browse at [crafterui.dev/components](https://crafterui.dev/components); open any for the live demo and its source
- **shadcn registry** — install with `npx @crafterui/cli` or the shadcn CLI; you own the code, no runtime package
- **Fully Tailwind** — no CSS files to import; components carry their own scoped `<style>` only where a third-party widget needs it
- **Motion-first** — animations with [motion](https://motion.dev)/react; interruptible, layout-aware, reduced-motion aware

## Install a component

```bash
npx @crafterui/cli@latest components add letter-reveal
npx @crafterui/cli@latest components add all       # everything at once
```

Or use the shadcn CLI directly:

```bash
npx shadcn@latest add https://crafterui.dev/r/letter-reveal.json
npx shadcn@latest add https://crafterui.dev/r/all.json
```

Either way the component is copied into your project, with its registry
dependencies resolved.

### Requirements

- React 19
- Tailwind CSS v4
- shadcn/ui initialized (`npx shadcn@latest init`)
- Node.js 18+

## Turbo Monorepo

- Managed with Turborepo and pnpm workspaces
- Run tasks via `turbo run <script>` (e.g. `pnpm --filter web dev` for the showcase)
- Node.js 20+ is required for the monorepo tooling

```
apps/web                       Showcase site (Next.js App Router + React 19 + Tailwind v4)
  app/                         Routes: / (landing), /components, /components/[slug]
  registry/crafterui/ui/*        Installable component sources (one file each)
  registry/crafterui/examples/*  The demo beside each component - shipped AND rendered
  registry.json                Registry source of truth (metadata + files)
  src/catalog.ts               Browse-page grouping + the full-bleed flag
  src/components/CrafterShowcase  slug → demo map for the component pages
```

## Tech Stack

- [Turborepo](https://turbo.build/repo) + pnpm Workspaces
- [Next.js](https://nextjs.org) 15
- [React](https://react.dev) 19
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com) v4
- [motion](https://motion.dev)
- [shadcn/ui](https://ui.shadcn.com) registry format
- [Geist](https://vercel.com/font) (site typography)

## Getting Started

Install dependencies:

```bash
pnpm install
```

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser (web app port).

Useful scripts:

```bash
pnpm build          # build everything
pnpm check          # one-stylesheet + registry invariants
pnpm typecheck      # TypeScript across the monorepo
```

## Usage

Browse components at [crafterui.dev/components](https://crafterui.dev/components), open
any for the live demo, then install it into your app:

```bash
npx @crafterui/cli@latest components add letter-reveal arrow-tooltip
```

Component pages are statically generated from `registry.json`. Registry payloads at
`/r/*.json` are built on every deploy — the same file the site shows (highlighted)
and the CLI installs.

## Add a component

1. Drop the source at `apps/web/registry/crafterui/ui/<name>.tsx`
2. Drop its demo at `apps/web/registry/crafterui/examples/<name>-demo.tsx`
3. Add the item to `apps/web/registry.json`
4. Add the slug to `apps/web/src/catalog.ts` under a category
5. Add the `dynamic()` line to `apps/web/src/components/CrafterShowcase.tsx`

`pnpm check` fails on any of those being missed.

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md)
and [Code of Conduct](./CODE_OF_CONDUCT.md) before submitting pull requests.

## License

[MIT](./LICENSE) © CrafterUI. Site scaffold adapted from
[moumen-soliman/lab](https://github.com/moumen-soliman/lab) (MIT).
