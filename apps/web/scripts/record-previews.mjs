#!/usr/bin/env node
/* Record the looping preview clips shown on /components.
 *
 *   node scripts/record-previews.mjs [slug ...] [--base=http://localhost:3000]
 *                                    [--theme=light,dark] [--keep-frames]
 *
 * For each catalogued component it opens /preview/<slug> in a headless Chromium
 * on a 1280x960 stage (the card's 4:3), plays that component's recipe from
 * scripts/preview-recipes.json, screencasts the result over CDP and hands the
 * frames to ffmpeg. Output lands in public/crafter/ as <slug>.mp4 (light),
 * <slug>.dark.mp4 and <slug>.jpg (the poster, which is frame 0 - so the card
 * shows the clip's own first frame until it plays).
 *
 * No dependencies: Chrome speaks CDP over Node's built-in WebSocket, and ffmpeg
 * does the encode. Nothing here ships to the browser or to a consumer's project.
 *
 * Every recipe is written to start at rest and end back at rest, so the loop's
 * jump-cut is invisible - that, not the codec, is what makes these read as
 * seamless.
 */

import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(appRoot, "public", "crafter");
const RECIPES = path.join(appRoot, "scripts", "preview-recipes.json");
const CLIPS_JSON = path.join(appRoot, "src", "preview-clips.json");

/* Every clip is captured at 1280x960 - the card's 4:3 - with the page rendered at
 * 2x and downscaled, so type is supersampled rather than upscaled.
 *
 * A recipe's `stage` says how wide the component should THINK the window is: 760
 * lays the demo out for a 760px viewport and paints it across the full frame, so
 * a tooltip grid or a 40px timer control is not left marooned in whitespace once
 * the browse grid shrinks the card to ~370px. That is a CSS zoom on the document
 * rather than a smaller viewport, because Chrome resizes the capture surface to
 * follow the emulated viewport and the frame would stop being 4:3. Recipe
 * coordinates therefore stay in the 1280x960 frame whatever the stage. */
const WIDTH = 1280;
const HEIGHT = 960;
const SCALE = 2;
const FPS = 30;
/* The zoom is a scale transform on a body sized to the stage, so the demo is laid
   out small and then painted across the whole frame.
   The two alternatives both fail: a genuinely smaller emulated viewport does not
   stretch to fill the window, it just paints in the corner and leaves the rest of
   the frame bare - invisible against a white page, an obvious dark band against a
   dark one. CSS `zoom` fills correctly but breaks anything positioned against a
   measured rect from outside the zoomed box. A transform is reflected in
   getBoundingClientRect and leaves the viewport at 1280x960, so component
   positioning, this script's hit-testing and recipe coordinates all still agree -
   with the exception of a portalled overlay placed by Floating UI, which lands
   off by the scale factor. Those components go unscaled (see arrow-tooltip). */
function stageCss(recipe) {
  if (!recipe.stage) return "";
  const zoom = WIDTH / recipe.stage;
  return `body{width:${WIDTH / zoom}px;height:${HEIGHT / zoom}px;transform:scale(${zoom});transform-origin:0 0}`;
}

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  path.join(
    os.homedir(),
    "Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  ),
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

// ── args ────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const BASE = flag("base", process.env.PREVIEW_BASE || "http://localhost:3000").replace(/\/$/, "");
const THEMES = flag("theme", "light,dark").split(",").filter(Boolean);
const KEEP_FRAMES = argv.includes("--keep-frames");
const only = argv.filter((a) => !a.startsWith("--"));

// ── tiny CDP client over the built-in WebSocket ─────────────────────────────
class CDP {
  constructor(ws) {
    this.ws = ws;
    this.seq = 0;
    this.pending = new Map();
    this.handlers = new Set();
    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      const waiter = message.id && this.pending.get(message.id);
      if (waiter) {
        this.pending.delete(message.id);
        message.error ? waiter.reject(new Error(message.error.message)) : waiter.resolve(message.result);
        return;
      }
      for (const handler of this.handlers) handler(message);
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  on(handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
}

async function launchChrome() {
  const bin = CHROME_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!bin) throw new Error(`no Chrome found. Set CHROME_PATH. Tried:\n  ${CHROME_CANDIDATES.join("\n  ")}`);

  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "crafter-record-"));
  const child = spawn(
    bin,
    [
      "--headless=new",
      "--remote-debugging-port=0",
      `--user-data-dir=${userDataDir}`,
      `--window-size=${WIDTH},${HEIGHT}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--hide-scrollbars",
      "--mute-audio",
      "--force-color-profile=srgb",
      "--autoplay-policy=no-user-gesture-required",
      // Headless Chrome parks timers and rAF for anything it thinks is in the
      // background; without these a clip records a frozen component.
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-features=CalculateNativeWinOcclusion",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );

  // Chrome prints the port it chose on stderr, then writes it to the profile.
  const portFile = path.join(userDataDir, "DevToolsActivePort");
  let port = null;
  for (let attempt = 0; attempt < 100 && port === null; attempt++) {
    await sleep(100);
    try {
      port = (await fs.readFile(portFile, "utf8")).split("\n")[0].trim();
    } catch {
      /* not up yet */
    }
  }
  if (!port) throw new Error("Chrome never reported a debugging port");

  const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await once(ws, "open");

  return {
    cdp: new CDP(ws),
    async close() {
      ws.close();
      child.kill();
      await fs.rm(userDataDir, { recursive: true, force: true });
    },
  };
}

/* The screencast captures the WINDOW's content area, not the emulated viewport -
   and a headless window is some tens of pixels shorter than the size you ask for.
   Left uncorrected that silently crops the bottom of every clip and stretches the
   rest back to 4:3. So measure the inset against a throwaway target and size every
   real window by it; the number differs by Chrome build and platform, which is
   exactly why it is measured rather than written down.

   Sizing the window (not the viewport) is also what makes a recipe's `stage`
   work: Chrome scales the emulated viewport to fill the window surface, so a
   narrower stage lands as a zoom rather than a smaller picture. */
async function measureWindowInset(cdp) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const { windowId } = await cdp.send("Browser.getWindowForTarget", { targetId });
  await cdp.send("Browser.setWindowBounds", { windowId, bounds: { width: WIDTH, height: HEIGHT, windowState: "normal" } });
  await cdp.send("Page.enable", {}, sessionId);

  const frame = await new Promise(async (resolve) => {
    const off = cdp.on((message) => {
      if (message.method === "Page.screencastFrame" && message.sessionId === sessionId) {
        off();
        resolve(message.params.metadata);
      }
    });
    await cdp.send("Page.startScreencast", { format: "jpeg", quality: 20, everyNthFrame: 1 }, sessionId);
  });

  await cdp.send("Target.closeTarget", { targetId });
  return { width: WIDTH - frame.deviceWidth, height: HEIGHT - frame.deviceHeight };
}

// ── page-side helpers, injected as expressions ──────────────────────────────
/* Selector support is deliberately small: plain CSS, `text=Exact label`, and
   `css:has-text(label)`. Enough for every recipe, and it keeps Playwright (and
   its 130MB browser download) out of this repo's dependencies. */
const PICK = `
function __pick(sel, nth) {
  const byText = (root, label) =>
    Array.from(root.querySelectorAll("*")).filter(
      (el) => el.childElementCount === 0 && el.textContent.trim() === label
    );
  let els;
  const has = sel.match(/^(.*?):has-text\\((?:"|')?(.*?)(?:"|')?\\)$/);
  if (sel.startsWith("text=")) {
    const label = sel.slice(5).replace(/^["']|["']$/g, "");
    els = byText(document, label);
    if (!els.length)
      els = Array.from(document.querySelectorAll("*")).filter((el) => el.textContent.trim() === label).slice(-1);
  } else if (has) {
    const label = has[2];
    els = Array.from(document.querySelectorAll(has[1] || "*")).filter((el) => el.textContent.trim().includes(label));
  } else {
    els = Array.from(document.querySelectorAll(sel));
  }
  return els[nth || 0] || null;
}`;

const READY = `(() => {
  const stage = document.querySelector("[data-preview]");
  if (!stage) return "no stage";
  if (stage.querySelector(".animate-shimmer")) return "demo chunk loading";
  if (!stage.firstElementChild || stage.firstElementChild.childElementCount === 0) return "demo not mounted";
  const images = Array.from(document.images);
  if (images.some((img) => !img.complete)) return "images loading";
  return "ready";
})()`;

// ── input ───────────────────────────────────────────────────────────────────
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* Gestures are driven off the wall clock, not off a step counter. Each CDP
   round-trip costs a few ms, so a 60-step loop with a 16ms sleep overshoots its
   duration by a fifth - enough to walk a recipe's later beats out of sync with
   the animation they were timed against. */
async function ramp(durationMs, onFrame) {
  if (durationMs <= 16) return onFrame(1);
  const start = Date.now();
  for (;;) {
    const progress = Math.min(1, (Date.now() - start) / durationMs);
    await onFrame(easeInOut(progress));
    if (progress >= 1) return;
    await sleep(8);
  }
}

/** CDP's modifier bitmask. `ControlOrMeta` follows the host, as in a recipe. */
const MODIFIERS = { Alt: 1, Control: 2, Meta: 4, Shift: 8 };

class Page {
  constructor(cdp, sessionId, stage) {
    this.cdp = cdp;
    this.sessionId = sessionId;
    this.stage = stage;
    this.cursor = { x: stage.width / 2, y: stage.height + 40 }; // parked off-stage: nothing hovered at rest
  }

  send(method, params) {
    return this.cdp.send(method, params, this.sessionId);
  }

  async evaluate(expression) {
    const { result, exceptionDetails } = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (exceptionDetails) throw new Error(exceptionDetails.text || "evaluate failed");
    return result.value;
  }

  /** Viewport centre of a recipe selector, or null when it does not resolve. */
  async locate(selector, nth, dx = 0, dy = 0) {
    return this.evaluate(`(() => {
      ${PICK}
      const el = __pick(${JSON.stringify(selector)}, ${nth || 0});
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return null;
      return { x: r.x + r.width / 2 + ${dx}, y: r.y + r.height / 2 + ${dy} };
    })()`);
  }

  async mouse(type, x, y, extra = {}) {
    await this.send("Input.dispatchMouseEvent", { type, x, y, button: "none", buttons: 0, ...extra });
  }

  /** Eased pointer travel. A teleporting cursor reads as a glitch in a 5s clip -
      except where a recipe asks for one (durationMs 0), which is how a hover walk
      avoids grazing a neighbour on the way past and popping a stray tooltip. */
  async moveTo(x, y, durationMs = 600) {
    const from = { ...this.cursor };
    this.cursor = { x, y };
    await ramp(durationMs, (e) => this.mouse("mouseMoved", from.x + (x - from.x) * e, from.y + (y - from.y) * e));
  }

  async click(x, y) {
    const at = { clickCount: 1, button: "left" };
    await this.mouse("mousePressed", x, y, { ...at, buttons: 1 });
    await sleep(60);
    await this.mouse("mouseReleased", x, y, { ...at, buttons: 0 });
  }

  /** Wheel, delivered in small increments so the target scrolls smoothly. Only the
      sum matters to the components that listen for it; the easing is what makes
      the resulting motion look like a hand rather than a jump. */
  async wheel(x, y, dy, durationMs = 900) {
    let sent = 0;
    await ramp(durationMs, async (e) => {
      const delta = dy * e - sent;
      sent = dy * e;
      if (Math.abs(delta) > 0.01) await this.mouse("mouseWheel", x, y, { deltaX: 0, deltaY: delta });
    });
  }

  async drag(x, y, dx, dy, durationMs = 900) {
    await this.mouse("mousePressed", x, y, { button: "left", buttons: 1, clickCount: 1 });
    await ramp(durationMs, (e) => this.mouse("mouseMoved", x + dx * e, y + dy * e, { button: "left", buttons: 1 }));
    await this.mouse("mouseReleased", x + dx, y + dy, { button: "left", buttons: 0, clickCount: 1 });
    this.cursor = { x: x + dx, y: y + dy };
  }

  async type(text, delayMs = 55) {
    for (const char of text) {
      await this.send("Input.insertText", { text: char });
      await sleep(delayMs);
    }
  }

  /* "Backspace", "Enter", or a combo like "ControlOrMeta+a". `commands` carries
     Chrome's own editing commands (["selectAll"], ["undo"]...); a bare modified
     keystroke is delivered as a keystroke and a textarea will simply ignore it,
     so anything that edits needs the command spelled out. */
  async key(combo, commands) {
    const parts = combo.split("+");
    const key = parts.pop();
    const modifiers = parts.reduce((bits, part) => {
      const name = part === "ControlOrMeta" ? (process.platform === "darwin" ? "Meta" : "Control") : part;
      return bits | (MODIFIERS[name] ?? 0);
    }, 0);

    const named = { Enter: 13, Escape: 27, Tab: 9, Backspace: 8, " ": 32 };
    const code = named[key] ?? (key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0);
    const event = {
      key,
      code: key === " " ? "Space" : key.length === 1 ? `Key${key.toUpperCase()}` : key,
      windowsVirtualKeyCode: code,
      nativeVirtualKeyCode: code,
      modifiers,
    };
    await this.send("Input.dispatchKeyEvent", {
      type: "rawKeyDown",
      ...event,
      ...(commands ? { commands } : {}),
    });
    await sleep(40);
    await this.send("Input.dispatchKeyEvent", { type: "keyUp", ...event });
  }
}

/** Play one recipe's timeline. `t` is ms from the start of the recording. */
async function playSteps(page, steps, warnings) {
  const started = Date.now();
  for (const step of [...steps].sort((a, b) => a.t - b.t)) {
    const wait = step.t - (Date.now() - started);
    if (wait > 0) await sleep(wait);

    // On a pointer step dx/dy nudge the aim off the element's centre; on a
    // gesture step they ARE the gesture, and must not move where it starts.
    const aims = step.action !== "scroll" && step.action !== "drag";

    let point = { x: step.x ?? page.cursor.x, y: step.y ?? page.cursor.y };
    if (step.selector) {
      const found = await page.locate(step.selector, step.nth, aims ? (step.dx ?? 0) : 0, aims ? (step.dy ?? 0) : 0);
      if (!found) {
        warnings.push(`selector did not resolve: ${step.selector}${step.nth ? ` [${step.nth}]` : ""}`);
        continue;
      }
      point = found;
    }

    switch (step.action) {
      case "move":
      case "moveTo":
        await page.moveTo(point.x, point.y, step.durationMs ?? 550);
        break;
      case "click":
        if (step.selector || step.x !== undefined) await page.moveTo(point.x, point.y, step.durationMs ?? 450);
        await page.click(point.x, point.y);
        break;
      case "scroll":
        if (step.selector) await page.moveTo(point.x, point.y, 1);
        await page.wheel(point.x, point.y, step.dy ?? 400, step.durationMs ?? 900);
        break;
      case "drag":
        await page.moveTo(point.x, point.y, 300);
        await page.drag(point.x, point.y, step.dx ?? 0, step.dy ?? 0, step.durationMs ?? 900);
        break;
      case "type":
        if (step.selector) {
          await page.moveTo(point.x, point.y, step.durationMs ?? 400);
          await page.click(point.x, point.y);
        }
        await page.type(step.text ?? "", step.delayMs ?? 55);
        break;
      case "key":
        await page.key(step.key ?? "Enter", step.commands);
        break;
      default:
        warnings.push(`unknown action: ${step.action}`);
    }
  }
}

// ── encode ──────────────────────────────────────────────────────────────────
function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} failed:\n${stderr.slice(-2000)}`));
    });
  });
}

/* Frames arrive when Chrome paints, not on a clock, so the concat demuxer gets
   each frame's real duration. Encoding at a flat 30fps instead would slew any
   clip whose capture rate wobbled. */
/** Whatever is left of the recipe's runtime after the last frame Chrome painted. */
const tailOf = (frames, durationMs) =>
  Math.max(0, durationMs / 1000 - (frames[frames.length - 1].ts - frames[0].ts));

async function encode(frames, dir, mp4, poster, durationMs, crf) {
  const list = [];
  for (let i = 0; i < frames.length; i++) {
    const name = `${String(i).padStart(5, "0")}.jpg`;
    await fs.writeFile(path.join(dir, name), Buffer.from(frames[i].data, "base64"));
    const next = frames[i + 1];
    /* Chrome only emits a frame when something repaints, so a clip that comes to
       rest simply stops producing them: a held beat is a gap between timestamps,
       and the final hold is no frames at all. Both have to be paid for here, or
       every still stretch plays at 2x and the loop restarts the instant the last
       movement stops. The 3s ceiling is only a guard against a pathological gap;
       no recipe holds a pose longer than that. */
    const duration = next ? Math.min(Math.max(next.ts - frames[i].ts, 1 / 120), 3) : 1 / FPS;
    list.push(`file '${name}'`, `duration ${duration.toFixed(5)}`);
  }
  await fs.writeFile(path.join(dir, "list.ffconcat"), `ffconcat version 1.0\n${list.join("\n")}\n`);

  await run("ffmpeg", [
    "-y", "-f", "concat", "-safe", "0", "-i", path.join(dir, "list.ffconcat"),
    // tpad clones the last frame out to the recipe's full runtime. The concat
    // demuxer drops the duration of its final entry, so the closing hold cannot
    // be expressed there; this is the part of the clip where nothing is moving
    // and the eye is meant to settle before the cut.
    "-vf", `fps=${FPS},tpad=stop_mode=clone:stop_duration=${tailOf(frames, durationMs).toFixed(3)},scale=${WIDTH}:${HEIGHT}:flags=lanczos,format=yuv420p`,
    "-c:v", "libx264", "-preset", "slow", "-crf", String(crf), "-profile:v", "high", "-level", "4.0",
    "-movflags", "+faststart", "-an", mp4,
  ]);

  if (poster) {
    await run("ffmpeg", ["-y", "-i", path.join(dir, "00000.jpg"), "-vf", `scale=${WIDTH}:-1`, "-q:v", "6", poster]);
  }
}

// ── one take ────────────────────────────────────────────────────────────────
async function record(cdp, slug, recipe, theme, inset) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const page = new Page(cdp, sessionId, { width: WIDTH, height: HEIGHT });
  const warnings = [];

  /* The window is what the screencast actually captures, so it stays at the
     frame's 4:3 no matter how small the stage viewport is. Chrome quietly
     resizes it back to the emulated viewport across a navigation, which is why
     this is re-asserted after the page has loaded rather than only here. */
  const { windowId } = await cdp.send("Browser.getWindowForTarget", { targetId });
  const frameWindow = () =>
    cdp.send("Browser.setWindowBounds", {
      windowId,
      bounds: { width: WIDTH + inset.width, height: HEIGHT + inset.height, windowState: "normal" },
    });
  await frameWindow();

  await page.send("Page.enable");
  await page.send("Runtime.enable");
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: SCALE,
    mobile: false,
  });
  await page.send("Emulation.setEmulatedMedia", {
    features: [
      { name: "prefers-reduced-motion", value: "no-preference" },
      { name: "prefers-color-scheme", value: theme },
    ],
  });
  // next-themes reads this key before first paint, so the clip never opens on a
  // flash of the wrong theme. The second rule keeps Next's dev-mode badge out of
  // frame when recording against `next dev` rather than a production build.
  await page.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      try { localStorage.setItem("theme", ${JSON.stringify(theme)}); } catch {}
      document.addEventListener("DOMContentLoaded", () => {
        const style = document.createElement("style");
        style.textContent = ${JSON.stringify(stageCss(recipe))} +
          "nextjs-portal,[data-nextjs-toast]{display:none!important}";
        document.head.appendChild(style);
      });`,
  });

  const url = `${BASE}/preview/${slug}`;
  const goto = async () => {
    await page.send("Page.navigate", { url });
    for (let attempt = 0; attempt < 300; attempt++) {
      await sleep(100);
      let state;
      try {
        state = await page.evaluate(READY);
      } catch {
        continue; // navigation tore the context down mid-poll
      }
      if (state === "ready") return;
    }
    warnings.push("never reported ready; recorded anyway");
  };

  /* Warm the route with a plain request rather than a throwaway navigation: a
     cold `next dev` route compiles on first hit and that wait would land in the
     clip, but navigating the recording target twice makes Chrome resize the
     capture surface down to the stage viewport and the frame stops being 4:3. */
  await fetch(url).catch(() => {});
  await goto();

  /* A demo that runs on its own clock only has one frame worth opening on. The
     reel, for instance, re-shuffles its names every cycle, so the only state
     that repeats is the moment after a name lands - `waitFor` holds until the
     page says it is there, which no fixed sleep can promise. */
  if (recipe.waitFor) {
    let arrived = false;
    for (let attempt = 0; attempt < 300 && !arrived; attempt++) {
      arrived = await page.evaluate(`Boolean(${recipe.waitFor})`).catch(() => false);
      if (!arrived) await sleep(100);
    }
    if (!arrived) warnings.push("waitFor never became true; recorded anyway");
  }

  /* Steps at a negative `t` play before the camera rolls. That is how a clip
     opens on a state the component only reaches by being used - a paused timer,
     a list already under the cursor - without the setup gesture appearing in
     the loop. */
  const scheduled = recipe.steps ?? [];
  const preroll = scheduled.filter((step) => step.t < 0).sort((a, b) => a.t - b.t);
  if (preroll.length) {
    const base = preroll[0].t;
    await playSteps(page, preroll.map((step) => ({ ...step, t: step.t - base })), warnings);
  }

  await sleep(recipe.settleMs ?? 800);

  const frames = [];
  const off = cdp.on((message) => {
    if (message.method !== "Page.screencastFrame" || message.sessionId !== sessionId) return;
    const { deviceWidth, deviceHeight, timestamp } = message.params.metadata;
    // The one check worth keeping: a surface that is not the card's 4:3 means the
    // clip is being cropped and stretched, which is invisible in a still.
    if (!frames.length && (deviceWidth !== WIDTH || deviceHeight !== HEIGHT)) {
      warnings.push(`captured ${deviceWidth}x${deviceHeight}, expected ${WIDTH}x${HEIGHT} - clip will be distorted`);
    }
    frames.push({ data: message.params.data, ts: timestamp });
    page.send("Page.screencastFrameAck", { sessionId: message.params.sessionId }).catch(() => {});
  });

  await page.send("Page.startScreencast", {
    format: "jpeg",
    quality: 95,
    maxWidth: WIDTH,
    maxHeight: HEIGHT,
    everyNthFrame: 1,
  });

  const timeline = playSteps(page, scheduled.filter((step) => step.t >= 0), warnings);
  await Promise.all([timeline, sleep(recipe.durationMs ?? 6000)]);

  await page.send("Page.stopScreencast");
  off();
  await cdp.send("Target.closeTarget", { targetId });

  return { frames, warnings };
}

// ── main ────────────────────────────────────────────────────────────────────
const recipes = JSON.parse(await fs.readFile(RECIPES, "utf8"));
const slugs = (only.length ? only : Object.keys(recipes).filter((key) => !key.startsWith("_"))).filter((slug) => {
  if (recipes[slug]) return true;
  console.error(`  ! no recipe for "${slug}"`);
  return false;
});

await fs.mkdir(OUT_DIR, { recursive: true });
const framesRoot = path.join(os.tmpdir(), "crafter-frames");
await fs.rm(framesRoot, { recursive: true, force: true });

const chrome = await launchChrome();
const inset = await measureWindowInset(chrome.cdp);
const done = [];

const clipPath = (slug, theme) => path.join(OUT_DIR, `${slug}${theme === "light" ? "" : `.${theme}`}.mp4`);

try {
  for (const slug of slugs) {
    const recipe = recipes[slug];
    /* A component that paints its own colours rather than the theme's - the
       letter reveal is black whatever the page is - would only get a washed-out
       second take. Record it once in the theme it was designed for and hand the
       same file to both. Its locked theme goes first so there is something to
       copy from. */
    const lock = recipe.lockTheme;
    const themes = lock ? [lock, ...THEMES.filter((theme) => theme !== lock)] : THEMES;

    for (const theme of themes) {
      const label = `${slug}${theme === "light" ? "" : `.${theme}`}`;

      if (lock && theme !== lock) {
        await fs.copyFile(clipPath(slug, lock), clipPath(slug, theme));
        console.log(`  ${label} ... = ${slug}.${lock} (lockTheme)`);
        continue;
      }

      process.stdout.write(`  ${label} ... `);
      const { frames, warnings } = await record(chrome.cdp, slug, recipe, theme, inset);

      if (frames.length < 2) {
        console.log(`✗ only ${frames.length} frames`);
        continue;
      }

      const dir = path.join(framesRoot, label);
      await fs.mkdir(dir, { recursive: true });
      await encode(
        frames,
        dir,
        clipPath(slug, theme),
        theme === themes[0] ? path.join(OUT_DIR, `${slug}.jpg`) : null,
        recipe.durationMs ?? 6000,
        /* 26 suits a clip that is mostly still: only the moving part of the
           frame costs bits. A recipe where every pixel moves - a corridor of
           photographs flying past the camera - pays that rate over the whole
           frame for the whole clip and lands at 4MB, three times the next
           heaviest card. Those recipes name their own number; the card paints
           at ~370px, where the difference does not survive the downscale. */
        recipe.crf ?? 26,
      );
      if (!KEEP_FRAMES) await fs.rm(dir, { recursive: true, force: true });

      const span = frames[frames.length - 1].ts - frames[0].ts;
      const { size } = await fs.stat(clipPath(slug, theme));
      console.log(
        `✓ ${frames.length}f / ${span.toFixed(1)}s / ${Math.round(frames.length / span)}fps / ${Math.round(size / 1024)}KB`,
      );
      for (const warning of warnings) console.log(`      ! ${warning}`);
      if (theme === themes[0]) done.push(slug);
    }
  }
} finally {
  await chrome.close();
}

// The browse wall reads this rather than guessing which clips exist, so a slug
// without a recording keeps its title tile instead of a broken <video>.
if (!only.length && done.length) {
  await fs.writeFile(CLIPS_JSON, `${JSON.stringify({ aspectRatio: "4 / 3", slugs: done }, null, 2)}\n`);
  console.log(`\nwrote src/preview-clips.json (${done.length} clips)`);
}
