// Shiki, fine-grained and server-side: only the tsx grammar, the two github
// themes, and the JavaScript regex engine (no wasm). Highlighting happens at
// build/render time in Server Components, so no highlighter ships to the client.
//
// Both themes are baked into one payload as CSS variables (`defaultColor:
// false`), so the site's theme toggle re-colours the block with no re-render and
// no second highlight pass - see the .shiki rules in globals.css.
import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import tsx from "shiki/langs/tsx.mjs";
import githubDark from "shiki/themes/github-dark.mjs";
import githubLight from "shiki/themes/github-light.mjs";

let highlighterPromise: Promise<HighlighterCore> | null = null;

function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [githubLight, githubDark],
      langs: [tsx],
      engine: createJavaScriptRegexEngine(),
    });
  }
  return highlighterPromise;
}

export async function highlight(code: string): Promise<string> {
  const highlighter = await getHighlighter();
  return highlighter.codeToHtml(code, {
    lang: "tsx",
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
  });
}
