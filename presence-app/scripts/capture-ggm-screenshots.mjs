// Captures source-vs-Presence parity screenshots for the GGM faithful
// recreation evidence pack. Runs locally against:
//   - the Presence app at http://localhost:3001 (or PRESENCE_QA_BASE)
//   - the live demo at https://christina-goddard.vercel.app/
//
// Saves under docs/program/evidence/presence-ggm-faithful-recreation-proof/screenshots.

import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const PRESENCE_BASE = process.env.PRESENCE_QA_BASE || "http://localhost:3001";
const SOURCE_BASE = process.env.GGM_SOURCE_BASE || "https://christina-goddard.vercel.app";
const OUT = process.env.PRESENCE_QA_OUT ||
  "C:/Dev/Flora_fauna/docs/program/evidence/presence-ggm-faithful-recreation-proof/screenshots";

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { id: "desktop", width: 1440, height: 900 },
  { id: "mobile", width: 390, height: 844 },
];

const TARGETS = [
  // GGM faithful Presence Room — first viewport (hero parity).
  { id: "presence-ggm-room", url: `${PRESENCE_BASE}/p/ggm`, waitFor: 1800 },
  // Full page scroll-through so the practice intro, featured strip,
  // work index, and about sections are all in evidence.
  { id: "presence-ggm-room-full", url: `${PRESENCE_BASE}/p/ggm`, waitFor: 2200, fullPage: true },
  { id: "presence-ggm-work-detail", url: `${PRESENCE_BASE}/p/ggm/works/willow-of-port-arthur-2019`, waitFor: 1500 },
  { id: "presence-ggm-work-detail-full", url: `${PRESENCE_BASE}/p/ggm/works/willow-of-port-arthur-2019`, waitFor: 2200, fullPage: true },
  { id: "presence-ggm-gallery", url: `${PRESENCE_BASE}/gallery`, waitFor: 1200 },
  // Scroll the gallery so the GGM card area is on screen.
  { id: "presence-ggm-gallery-card", url: `${PRESENCE_BASE}/gallery`, waitFor: 1600, scrollY: 900 },
  // GGM RoomKey entry — uses a deliberately invalid token; the faithful
  // renderer falls through to the GGM page when the backend resolves the
  // Room. Here we capture the loader/guest state so the entry surface
  // shape is documented even without a real token.
  { id: "presence-ggm-roomkey-entry", url: `${PRESENCE_BASE}/r/ggm-pilot-stub`, waitFor: 1200 },
  // Source site (live demo) — the source uses an Osmo loader + Three.js
  // WebGL slideshow which takes ~6s to fully resolve before the artwork
  // is visible. We give the home page extra wait time.
  { id: "source-ggm-home", url: `${SOURCE_BASE}/`, waitFor: 6500 },
  { id: "source-ggm-home-late", url: `${SOURCE_BASE}/`, waitFor: 11000 },
  { id: "source-ggm-work", url: `${SOURCE_BASE}/work/`, waitFor: 3500 },
  { id: "source-ggm-about", url: `${SOURCE_BASE}/about/`, waitFor: 3500 },
];

async function capture(browser, target, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: "no-preference",
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on("pageerror", (err) => console.error(`! ${target.id} ${viewport.id}: ${err.message}`));
  try {
    await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(target.waitFor ?? 1200);
    if (typeof target.scrollY === "number") {
      await page.evaluate((y) => window.scrollTo(0, y), target.scrollY);
      await page.waitForTimeout(500);
    }
    const file = path.join(OUT, `${target.id}-${viewport.id}.png`);
    await page.screenshot({ path: file, fullPage: !!target.fullPage });
    console.log(`ok ${file}`);
  } catch (err) {
    console.error(`x ${target.id} ${viewport.id}: ${err.message}`);
  } finally {
    await context.close();
  }
}

(async () => {
  const browser = await chromium.launch();
  for (const target of TARGETS) {
    for (const viewport of VIEWPORTS) {
      await capture(browser, target, viewport);
    }
  }
  await browser.close();
})();
