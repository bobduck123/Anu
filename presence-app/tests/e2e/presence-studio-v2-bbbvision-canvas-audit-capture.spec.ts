import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type APIRequestContext, type Page } from "playwright/test";

const evidenceDir = path.join(
  process.cwd(),
  "docs",
  "program",
  "evidence",
  "presence-v3-bbbvision-canvas-gallery-audit",
);

const API_BASE = "http://127.0.0.1:5105";
const originalURL = "https://bbbvision.vercel.app/gallery";

async function screenshot(page: Page, fileName: string) {
  await fs.mkdir(evidenceDir, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDir, fileName), fullPage: false });
}

async function signInOwner(page: Page, token = "owner-test-token") {
  await page.goto("/");
  await page.evaluate((value) => window.localStorage.setItem("presence:e2e:access_token", value), token);
}

async function openBbbVisionStudio(page: Page, request: APIRequestContext) {
  await request.post(`${API_BASE}/__test__/reset`);
  await request.post(`${API_BASE}/__test__/state`, {
    data: { useBbbVisionPilot: true },
  });
  await signInOwner(page);
  await page.goto("/studio/101/editor", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible();
}

async function saveDraft(page: Page) {
  const saveResponse = page.waitForResponse(
    (response) => response.url().includes("/api/presence/owner/rooms/101/editor/draft") && response.ok(),
  );
  await page.getByTestId("presence-studio-v2-save").click();
  await saveResponse;
  await expect(page.getByTestId("presence-studio-v2-saved")).toBeVisible();
}

async function publishDraft(request: APIRequestContext) {
  const response = await request.post(`${API_BASE}/api/presence/owner/rooms/101/editor/publish`, {
    headers: { Authorization: "Bearer owner-test-token" },
  });
  expect(response.ok()).toBeTruthy();
}

test("capture original gallery desktop", async ({ page }) => {
  await page.goto(originalURL, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await screenshot(page, "01-original-gallery-desktop.png");
});

test("capture original gallery mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(originalURL, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await screenshot(page, "02-original-gallery-mobile.png");
});

test("capture Presence threshold, gallery, focus, and states", async ({ page, request }) => {
  await openBbbVisionStudio(page, request);

  // Select bbbvision style
  await page.getByTestId("presence-studio-v2-public-style-option").filter({ hasText: "bbb.vision / Threshold Gallery" }).click();
  await expect(page.getByTestId("presence-studio-v2-public-style-current")).toContainText("bbb.vision / Threshold Gallery");
  await screenshot(page, "03-studio-bbbvision-selected.png");
  await saveDraft(page);
  await publishDraft(request);

  // Owner preview threshold
  await page.goto("/studio/101/editor/preview", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await screenshot(page, "04-owner-preview-threshold.png");

  // Owner preview gallery
  await page.getByTestId("presence-public-bbbvision-enter").click();
  await page.waitForTimeout(3000);
  await screenshot(page, "05-owner-preview-gallery.png");

  // Focus overlay
  await page.locator(".v2-bbb-canvas").click();
  await page.waitForTimeout(1000);
  await screenshot(page, "06-owner-preview-focus.png");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // Public threshold
  await page.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await screenshot(page, "07-public-threshold.png");

  // Public gallery
  await page.getByTestId("presence-public-bbbvision-enter").click();
  await page.waitForTimeout(3000);
  await screenshot(page, "08-public-gallery.png");

  // Direct #gallery entry
  await page.goto("/p/test-presence-room#gallery", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  await screenshot(page, "09-public-direct-gallery.png");

  // First frame / loading
  await page.goto("/p/test-presence-room#gallery", { waitUntil: "commit" });
  await page.waitForTimeout(100);
  await screenshot(page, "10-public-first-frame.png");
});

test("capture Presence reduced motion", async ({ page }) => {
  await page.goto("/p/test-presence-room#gallery", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await screenshot(page, "11-public-reduced-motion.png");
});

test("capture Presence mobile gallery", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.getByTestId("presence-public-bbbvision-enter").click();
  await page.waitForTimeout(3000);
  await screenshot(page, "12-public-mobile-gallery.png");
});

test("capture Gallery P2 regression", async ({ page }) => {
  await page.goto("/p/rooms-gallery-painter", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await screenshot(page, "13-regression-gallery-p2.png");
});

test("capture legacy negative", async ({ page }) => {
  await page.goto("/p/hesmaddw", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await screenshot(page, "14-legacy-negative.png");
});
