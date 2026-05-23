// Capture the hosted GGM cutover screenshots without writing RoomKey
// tokens to filenames or console output.

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "..");
const REPO_ROOT = path.resolve(APP_ROOT, "..");
loadEnv(path.join(REPO_ROOT, ".env.presence-first-pilot-ggm.local"));

const frontend = required("PRESENCE_PILOT_GGM_FRONTEND_URL").replace(/\/$/, "");
const slug = required("PRESENCE_PILOT_GGM_ROOM_SLUG");
const roomKey = required("PRESENCE_PILOT_GGM_ROOMKEY_TOKEN");
const out = path.join(
  REPO_ROOT,
  "docs/program/evidence/presence-ggm-hosted-cutover-proof/screenshots",
);

fs.mkdirSync(out, { recursive: true });

const viewports = [
  { id: "desktop", width: 1440, height: 900 },
  { id: "mobile", width: 390, height: 844 },
];

const targets = [
  { id: "hosted-ggm-room", route: `/p/${encodeURIComponent(slug)}` },
  {
    id: "hosted-ggm-work-detail",
    route: `/p/${encodeURIComponent(slug)}/works/willow-of-port-arthur-2019`,
  },
  { id: "hosted-ggm-roomkey-entry", route: `/r/${encodeURIComponent(roomKey)}` },
  {
    id: "hosted-gallery-card",
    route: "/gallery",
    scrollTo: `a[href="/p/${slug}"]`,
  },
  { id: "hosted-non-ggm-room-regression", route: "/p/rooms-independent-artist" },
  { id: "hosted-world-forming", route: "/world" },
];

const browser = await chromium.launch();
for (const target of targets) {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    try {
      await page.goto(`${frontend}${target.route}`, {
        waitUntil: "networkidle",
        timeout: 60000,
      });
      if (target.scrollTo) {
        await page.locator(target.scrollTo).first().scrollIntoViewIfNeeded();
      }
      await page.waitForTimeout(700);
      const file = path.join(out, `${target.id}-${viewport.id}.png`);
      await page.screenshot({ path: file, fullPage: false });
      console.log(`ok ${path.basename(file)}`);
    } finally {
      await context.close();
    }
  }
}
await browser.close();

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const split = line.indexOf("=");
    const name = line.slice(0, split).trim();
    const value = line.slice(split + 1).trim().replace(/^"|"$/g, "");
    if (!process.env[name]) process.env[name] = value;
  }
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for hosted GGM screenshot capture.`);
  return value;
}
