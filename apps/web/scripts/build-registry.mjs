// Build the shadcn-format registry payloads that crafterui.com/r/*.json serves.
//
// Reads registry.json (the source of truth), inlines each item's file contents,
// and writes one JSON per item plus an index. This is what `npx shadcn add <url>`
// consume. Deterministic, no external
// CLI - the output is schema-conformant registry-item JSON.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const registryPath = resolve(appRoot, "registry.json");
const outDir = resolve(appRoot, "public/r");
const ITEM_SCHEMA = "https://ui.shadcn.com/schema/registry-item.json";

const SITE = "https://crafterui.com";

const registry = JSON.parse(readFileSync(registryPath, "utf8"));
mkdirSync(outDir, { recursive: true });

// The demo that ships beside a component - the same file the site renders.
const demoPath = (name) => resolve(appRoot, "registry/crafterui/examples", `${name}-demo.tsx`);

// One markdown per item - the whole component as a single AI-ready document:
// description, install commands, the usage example and the full source. This is
// what /r/<name>.md serves, what llms.txt points at, and what the "Copy .md"
// action on each component page copies.
function itemMarkdown(item, files) {
  const demo = demoPath(item.name);
  const hasDemo = existsSync(demo);
  const lines = [`# ${item.title}`, "", item.description, ""];
  if (hasDemo) lines.push(`- Demo: ${SITE}/components/${item.name}`);
  lines.push(
    `- Install: \`npx shadcn@latest add ${SITE}/r/${item.name}.json\``,
  );
  if (item.dependencies?.length) lines.push(`- Dependencies: ${item.dependencies.join(", ")}`);
  if (item.registryDependencies?.length) lines.push(`- Registry dependencies: ${item.registryDependencies.join(", ")}`);
  for (const file of files) lines.push(`- Installs to: \`${file.target ?? file.path}\``);

  if (hasDemo) {
    lines.push("", "## Usage", "", "```tsx", readFileSync(demo, "utf8").trim(), "```");
  }
  for (const file of files) {
    lines.push("", `## Source - \`${file.target ?? file.path}\``, "", "```tsx", file.content.trim(), "```");
  }
  return `${lines.join("\n")}\n`;
}

for (const item of registry.items) {
  const files = (item.files ?? []).map((file) => {
    const abs = resolve(appRoot, file.path);
    if (!existsSync(abs)) throw new Error(`Registry file missing: ${file.path}`);
    return { ...file, content: readFileSync(abs, "utf8") };
  });
  const payload = { $schema: ITEM_SCHEMA, ...item, files };
  writeFileSync(resolve(outDir, `${item.name}.json`), `${JSON.stringify(payload, null, 2)}\n`);
  writeFileSync(resolve(outDir, `${item.name}.md`), itemMarkdown(item, files));
}

// One payload that installs everything, matching crafterui.com/r/all.json.
const all = {
  $schema: ITEM_SCHEMA,
  name: "all",
  type: "registry:ui",
  title: "All crafterui components",
  description: registry.items.map((item) => item.title).join(", "),
  registryDependencies: registry.items.map((item) => `${SITE}/r/${item.name}.json`),
};
writeFileSync(resolve(outDir, "all.json"), `${JSON.stringify(all, null, 2)}\n`);

// The index the CLI's `list` command and discovery read.
writeFileSync(resolve(outDir, "registry.json"), `${JSON.stringify(registry, null, 2)}\n`);

// /llms.txt - the AI-discovery index (llmstxt.org): what this site is, and one
// line per component pointing at its self-contained markdown doc.
const documented = registry.items.filter((item) => existsSync(demoPath(item.name)));
const llms = [
  `# ${registry.name ?? "crafterui"}`,
  "",
  "> Open Source motion and interaction components - Tailwind CSS + motion/react, installable with the shadcn CLI. Scroll reveals, kinetic type, tooltips, toggles and more.",
  "",
  "Each component has a single-file markdown doc - description, install command, usage example and full source - at /r/<name>.md. Fetch that one file for complete context on a component.",
  "",
  "## Components",
  "",
  ...documented.map((item) => `- [${item.title}](${SITE}/r/${item.name}.md): ${item.description}`),
  "",
  "## Registry",
  "",
  `- [registry.json](${SITE}/r/registry.json): shadcn-format registry index (per-item payloads at /r/<name>.json, everything at /r/all.json)`,
];
writeFileSync(resolve(appRoot, "public/llms.txt"), `${llms.join("\n")}\n`);

console.log(`registry: wrote ${registry.items.length} item(s) (.json + .md) + all.json + llms.txt → public/`);
