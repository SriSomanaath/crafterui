// Enforce the hard rule: one stylesheet, and no custom CSS classes in it.
//
//   1. Exactly one .css file exists (apps/web/app/globals.css).
//   2. That file contains no class selectors and no @utility/@apply - only
//      @import / @source / @custom-variant / @theme / @layer base with element
//      and :root selectors.
//
// The site chrome is Tailwind utilities in JSX only. Registry components may
// carry their own scoped <style> block where a third-party widget or keyframe
// needs one - that CSS ships with the component and never touches the site's
// stylesheet. Run from the repo root.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const IGNORE = new Set(["node_modules", "dist", ".turbo", ".git", ".next", ".next-dev", "out", "r"]);
const errors = [];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (IGNORE.has(name)) continue;
    const full = resolve(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const files = walk(repoRoot);
const rel = (p) => relative(repoRoot, p);

// 1 + 2 - the single stylesheet.
const cssFiles = files.filter((f) => extname(f) === ".css");
const allowed = resolve(repoRoot, "apps/web/app/globals.css");
for (const css of cssFiles) {
  if (css !== allowed) errors.push(`Unexpected CSS file: ${rel(css)} (only apps/web/app/globals.css is allowed)`);
}
if (cssFiles.includes(allowed)) {
  const lines = readFileSync(allowed, "utf8").split("\n");
  let inComment = false;
  lines.forEach((line, i) => {
    let text = line;
    if (inComment) {
      if (text.includes("*/")) {
        text = text.slice(text.indexOf("*/") + 2);
        inComment = false;
      } else return;
    }
    text = text.replace(/\/\*.*?\*\//g, "");
    if (text.includes("/*")) {
      inComment = true;
      text = text.slice(0, text.indexOf("/*"));
    }
    const trimmed = text.trim();
    if (/^\.[a-zA-Z]/.test(trimmed)) errors.push(`globals.css:${i + 1} class selector "${trimmed}"`);
    if (/@utility\b/.test(trimmed)) errors.push(`globals.css:${i + 1} @utility is not allowed`);
    if (/@apply\b/.test(trimmed)) errors.push(`globals.css:${i + 1} @apply is not allowed`);
  });
}

if (errors.length) {
  console.error("✗ custom-CSS check failed:\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log("✓ one stylesheet, no custom CSS classes");
