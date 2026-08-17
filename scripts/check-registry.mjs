// Validate the registry invariants that keep "add a component" cheap and safe:
// item name == slug == file == page path, every referenced file exists, and every
// component on the browse wall has a demo beside it and an entry in the showcase's
// slug → demo map. Run from the repo root.

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const appRoot = resolve(repoRoot, "apps/web");
const registry = JSON.parse(readFileSync(resolve(appRoot, "registry.json"), "utf8"));
const errors = [];

const names = new Set();
for (const item of registry.items) {
  if (names.has(item.name)) errors.push(`duplicate item name "${item.name}"`);
  names.add(item.name);
  if (!item.title || !item.description) errors.push(`item "${item.name}" is missing title/description`);

  const expectedPath = `registry/crafterui/ui/${item.name}.tsx`;
  const file = item.files?.[0];
  if (!file || file.path !== expectedPath) {
    errors.push(`item "${item.name}" files[0].path must be "${expectedPath}"`);
  }
  if (file && !existsSync(resolve(appRoot, file.path))) {
    errors.push(`item "${item.name}" source missing: ${file.path}`);
  }
}

// The browse catalog drives the site, so every entry in it needs a registry item,
// a demo beside the component, and a line in the showcase's demo map. Read as text
// rather than imported - these scripts stay dependency-free and TS-free.
const catalog = readFileSync(resolve(appRoot, "src/catalog.ts"), "utf8");
const showcase = readFileSync(resolve(appRoot, "src/components/CrafterShowcase.tsx"), "utf8");

// Slugs inside a "components": [...] block - the category slugs sit outside it.
const catalogued = [...catalog.matchAll(/"components":\s*\[([^\]]*)\]/g)].flatMap((block) =>
  [...block[1].matchAll(/"slug":\s*"([a-z0-9-]+)"/g)].map((match) => match[1]),
);

if (!catalogued.length) errors.push("src/catalog.ts lists no components");

for (const slug of catalogued) {
  if (!names.has(slug)) errors.push(`catalogued component "${slug}" has no registry item`);
  if (!existsSync(resolve(appRoot, "registry/crafterui/examples", `${slug}-demo.tsx`))) {
    errors.push(`component "${slug}" demo missing: registry/crafterui/examples/${slug}-demo.tsx`);
  }
  if (!showcase.includes(`"${slug}": dynamic(`)) {
    errors.push(`component "${slug}" is missing from the CrafterShowcase demo map`);
  }
}

if (errors.length) {
  console.error("✗ registry check failed:\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log(`✓ registry valid (${registry.items.length} items, ${catalogued.length} on the browse wall)`);
