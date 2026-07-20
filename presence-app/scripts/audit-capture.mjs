import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const evidenceDir = path.join(process.cwd(), "docs", "program", "evidence", "presence-v3-bbbvision-canvas-gallery-audit");
await fs.mkdir(evidenceDir, { recursive: true });

const originalURL = "https://bbbvision.vercel.app/gallery";
const presenceURL = "http://127.0.0.1:3100/p/test-presence-room";

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(evidenceDir, name), fullPage: false });
}

const browser = await chromium.launch();

// 1. Original gallery desktop
console.log("Capturing original gallery desktop...");
const ctx1 = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: evidenceDir, size: { width: 1440, height: 900 } } });
const p1 = await ctx1.newPage();
await p1.goto(originalURL, { waitUntil: "networkidle" });
await p1.waitForTimeout(2000);
await screenshot(p1, "01-original-gallery-desktop.png");
await ctx1.close();

// 2. Original gallery mobile
console.log("Capturing original gallery mobile...");
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, recordVideo: { dir: evidenceDir, size: { width: 390, height: 844 } } });
const p2 = await ctx2.newPage();
await p2.goto(originalURL, { waitUntil: "networkidle" });
await p2.waitForTimeout(2000);
await screenshot(p2, "02-original-gallery-mobile.png");
await ctx2.close();

// 3. Presence threshold desktop
console.log("Capturing Presence threshold desktop...");
const ctx3 = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: evidenceDir, size: { width: 1440, height: 900 } } });
const p3 = await ctx3.newPage();
await p3.goto(presenceURL, { waitUntil: "networkidle" });
await p3.waitForTimeout(2000);
await screenshot(p3, "03-presence-threshold-desktop.png");

// 4. Presence gallery desktop
console.log("Capturing Presence gallery desktop...");
await p3.getByTestId("presence-public-bbbvision-enter").click();
await p3.waitForTimeout(3000);
await screenshot(p3, "04-presence-gallery-desktop.png");

// 5. Presence focus overlay
console.log("Capturing Presence focus overlay...");
const canvas = p3.locator(".v2-bbb-canvas");
await canvas.click();
await p3.waitForTimeout(1000);
await screenshot(p3, "05-presence-focus-overlay.png");
await p3.keyboard.press("Escape");
await p3.waitForTimeout(500);

// 6. Presence direct #gallery entry
console.log("Capturing Presence direct #gallery entry...");
await p3.goto(`${presenceURL}#gallery`, { waitUntil: "networkidle" });
await p3.waitForTimeout(3000);
await screenshot(p3, "06-presence-direct-gallery.png");

// 7. Presence reduced motion
console.log("Capturing Presence reduced motion...");
const ctx4 = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const p4 = await ctx4.newPage();
await p4.goto(`${presenceURL}#gallery`, { waitUntil: "networkidle" });
await p4.waitForTimeout(2000);
await screenshot(p4, "07-presence-reduced-motion.png");
await ctx4.close();

// 8. Presence mobile gallery
console.log("Capturing Presence mobile gallery...");
const ctx5 = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
const p5 = await ctx5.newPage();
await p5.goto(presenceURL, { waitUntil: "networkidle" });
await p5.waitForTimeout(2000);
await p5.getByTestId("presence-public-bbbvision-enter").click();
await p5.waitForTimeout(3000);
await screenshot(p5, "08-presence-mobile-gallery.png");
await ctx5.close();

// 9. Presence first frame / black state
console.log("Capturing Presence first frame...");
const ctx6 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p6 = await ctx6.newPage();
await p6.goto(`${presenceURL}#gallery`, { waitUntil: "commit" });
await p6.waitForTimeout(100);
await screenshot(p6, "09-presence-first-frame.png");
await ctx6.close();

// 10. Gallery P2 regression
console.log("Checking Gallery P2 regression...");
const ctx7 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p7 = await ctx7.newPage();
await p7.goto("http://127.0.0.1:3100/p/rooms-gallery-painter", { waitUntil: "networkidle" });
await p7.waitForTimeout(2000);
await screenshot(p7, "10-regression-gallery-p2.png");
await ctx7.close();

// 11. Legacy negative
console.log("Checking legacy negative...");
const ctx8 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p8 = await ctx8.newPage();
await p8.goto("http://127.0.0.1:3100/p/hesmaddw", { waitUntil: "networkidle" });
await p8.waitForTimeout(2000);
await screenshot(p8, "11-legacy-negative.png");
await ctx8.close();

await ctx3.close();
await browser.close();

console.log("Capture complete. Evidence saved to:", evidenceDir);
