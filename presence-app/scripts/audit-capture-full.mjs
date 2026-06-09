import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const evidenceDir = path.join(process.cwd(), "docs", "program", "evidence", "presence-v3-bbbvision-canvas-gallery-audit");
await fs.mkdir(evidenceDir, { recursive: true });

const API_BASE = "http://127.0.0.1:5105";
const originalURL = "https://bbbvision.vercel.app/gallery";
const presenceURL = "http://127.0.0.1:3100/p/test-presence-room";

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(evidenceDir, name), fullPage: false });
}

async function resetAndPublish(request) {
  await request.post(`${API_BASE}/__test__/reset`);
  await request.post(`${API_BASE}/__test__/state`, {
    data: { useBbbVisionPilot: true },
  });
}

async function publishDraft(request) {
  const response = await request.post(`${API_BASE}/api/presence/owner/rooms/101/editor/publish`, {
    headers: { Authorization: "Bearer owner-test-token" },
  });
  if (!response.ok()) throw new Error(`publishDraft failed: ${response.status()}`);
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

// Sign in as owner
await page.goto("http://127.0.0.1:3100/");
await page.evaluate((value) => window.localStorage.setItem("presence:e2e:access_token", value), "owner-test-token");

// Set up mock API state
const request = context.request;
await resetAndPublish(request);

// 1. Original gallery desktop
console.log("1. Original gallery desktop...");
await page.goto(originalURL, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
await screenshot(page, "01-original-gallery-desktop.png");

// 2. Original gallery mobile
console.log("2. Original gallery mobile...");
const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
const mobilePage = await mobileCtx.newPage();
await mobilePage.goto(originalURL, { waitUntil: "networkidle" });
await mobilePage.waitForTimeout(2000);
await mobilePage.screenshot({ path: path.join(evidenceDir, "02-original-gallery-mobile.png"), fullPage: false });
await mobileCtx.close();

// 3. Studio: select bbbvision style
console.log("3. Studio bbbvision style selection...");
await page.goto("http://127.0.0.1:3100/studio/101/editor", { waitUntil: "networkidle", timeout: 120000 });
await page.waitForSelector('[data-testid="presence-studio-v2-root"]', { timeout: 30000 });
await page.getByTestId("presence-studio-v2-public-style-option").filter({ hasText: "bbb.vision / Threshold Gallery" }).click();
await page.waitForTimeout(500);
await screenshot(page, "03-studio-bbbvision-selected.png");

// Save draft
const saveResponse = page.waitForResponse(
  (response) => response.url().includes("/api/presence/owner/rooms/101/editor/draft") && response.ok(),
);
await page.getByTestId("presence-studio-v2-save").click();
await saveResponse;
await page.waitForSelector('[data-testid="presence-studio-v2-saved"]');

// Publish
await publishDraft(request);

// 4. Owner preview threshold
console.log("4. Owner preview threshold...");
await page.goto("http://127.0.0.1:3100/studio/101/editor/preview", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
await screenshot(page, "04-owner-preview-threshold.png");

// 5. Owner preview gallery
console.log("5. Owner preview gallery...");
await page.getByTestId("presence-public-bbbvision-enter").click();
await page.waitForTimeout(3000);
await screenshot(page, "05-owner-preview-gallery.png");

// 6. Focus overlay
console.log("6. Focus overlay...");
const canvas = page.locator(".v2-bbb-canvas");
await canvas.click();
await page.waitForTimeout(1000);
await screenshot(page, "06-owner-preview-focus.png");
await page.keyboard.press("Escape");
await page.waitForTimeout(500);

// 7. Public threshold
console.log("7. Public threshold...");
await page.goto(presenceURL, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
await screenshot(page, "07-public-threshold.png");

// 8. Public gallery
console.log("8. Public gallery...");
await page.getByTestId("presence-public-bbbvision-enter").click();
await page.waitForTimeout(3000);
await screenshot(page, "08-public-gallery.png");

// 9. Direct #gallery entry
console.log("9. Direct #gallery entry...");
await page.goto(`${presenceURL}#gallery`, { waitUntil: "networkidle" });
await page.waitForTimeout(3000);
await screenshot(page, "09-public-direct-gallery.png");

// 10. First frame / loading
console.log("10. First frame...");
await page.goto(`${presenceURL}#gallery`, { waitUntil: "commit" });
await page.waitForTimeout(100);
await screenshot(page, "10-public-first-frame.png");

// 11. Reduced motion
console.log("11. Reduced motion...");
const rmCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const rmPage = await rmCtx.newPage();
await rmPage.goto(`${presenceURL}#gallery`, { waitUntil: "networkidle" });
await rmPage.waitForTimeout(2000);
await rmPage.screenshot({ path: path.join(evidenceDir, "11-public-reduced-motion.png"), fullPage: false });
await rmCtx.close();

// 12. Mobile gallery
console.log("12. Mobile gallery...");
const mobCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
const mobPage = await mobCtx.newPage();
await mobPage.goto(presenceURL, { waitUntil: "networkidle" });
await mobPage.waitForTimeout(2000);
await mobPage.getByTestId("presence-public-bbbvision-enter").click();
await mobPage.waitForTimeout(3000);
await mobPage.screenshot({ path: path.join(evidenceDir, "12-public-mobile-gallery.png"), fullPage: false });
await mobCtx.close();

// 13. Gallery P2 regression
console.log("13. Gallery P2 regression...");
await page.goto("http://127.0.0.1:3100/p/rooms-gallery-painter", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
await screenshot(page, "13-regression-gallery-p2.png");

// 14. Legacy negative
console.log("14. Legacy negative...");
await page.goto("http://127.0.0.1:3100/p/hesmaddw", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
await screenshot(page, "14-legacy-negative.png");

await context.close();
await browser.close();

console.log("Capture complete. Evidence saved to:", evidenceDir);
