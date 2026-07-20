import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type APIRequestContext, type Page } from "playwright/test";

const evidenceDir = path.join(
  process.cwd(),
  "docs",
  "program",
  "evidence",
  "presence-v3-bbbvision-canvas-conditional-reaudit",
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

async function preparePublishedBbbVision(page: Page, request: APIRequestContext) {
  await request.post(`${API_BASE}/__test__/reset`);
  await request.post(`${API_BASE}/__test__/state`, { data: { useBbbVisionPilot: true } });
  await signInOwner(page);
  await page.goto("/studio/101/editor", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible();
  await page.getByTestId("presence-studio-v2-public-style-option").filter({ hasText: "bbb.vision / Threshold Gallery" }).click();
  await expect(page.getByTestId("presence-studio-v2-public-style-current")).toContainText("bbb.vision / Threshold Gallery");
  const saveResponse = page.waitForResponse(
    (response) => response.url().includes("/api/presence/owner/rooms/101/editor/draft") && response.ok(),
  );
  await page.getByTestId("presence-studio-v2-save").click();
  await saveResponse;
  await expect(page.getByTestId("presence-studio-v2-saved")).toBeVisible();
  const publishResponse = await request.post(`${API_BASE}/api/presence/owner/rooms/101/editor/publish`, {
    headers: { Authorization: "Bearer owner-test-token" },
  });
  expect(publishResponse.ok()).toBeTruthy();
}

async function waitForCanvasReady(page: Page) {
  await expect(page.getByTestId("presence-public-bbbvision-canvas-shell")).toHaveAttribute(
    "data-loader-state",
    "ready",
    { timeout: 10_000 },
  );
}

// ── Original reference ──
test("capture original gallery desktop", async ({ page }) => {
  await page.goto(originalURL, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await screenshot(page, "01-original-gallery-desktop.png");
});

test("capture original gallery mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(originalURL, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await screenshot(page, "02-original-gallery-mobile.png");
});

// ── Presence candidate ──
test("capture Presence loader, ready, and gallery field", async ({ page, request }) => {
  await preparePublishedBbbVision(page, request);

  // Delay images so loader is visible
  await page.route("**/ggm/works/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.continue();
  });

  // Loader first frame
  await page.goto("/p/test-presence-room#gallery", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("presence-public-bbbvision-gallery")).toBeVisible();
  await expect(page.getByTestId("presence-public-bbbvision-loader")).toHaveAttribute("data-state", "loading");
  await screenshot(page, "03-presence-loader-first-frame.png");

  // Canvas ready
  await waitForCanvasReady(page);
  await page.waitForTimeout(400);
  await screenshot(page, "04-presence-canvas-ready.png");

  // Threshold → gallery via Enter
  await page.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await screenshot(page, "05-presence-threshold.png");
  await page.getByTestId("presence-public-bbbvision-enter").click();
  await expect(page.getByTestId("presence-public-bbbvision-gallery")).toBeVisible();
  await waitForCanvasReady(page);
  await page.waitForTimeout(800);
  await screenshot(page, "06-presence-threshold-enter-gallery.png");
});

test("capture Presence focus strip-burst sequence", async ({ page, request }) => {
  await preparePublishedBbbVision(page, request);
  await page.goto("/p/test-presence-room#gallery", { waitUntil: "networkidle" });
  await waitForCanvasReady(page);
  await page.waitForTimeout(600);
  await screenshot(page, "07-presence-gallery-pre-click.png");

  // Click to trigger strip burst (mid-transition at 140ms)
  await page.locator(".v2-bbb-canvas").click();
  await page.waitForTimeout(140);
  await screenshot(page, "08-presence-focus-strip-burst-mid.png");

  // Wait for transition to complete and focus overlay to appear
  await expect(page.getByTestId("presence-public-bbbvision-focus")).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId("presence-public-bbbvision-focus-image")).toBeVisible();
  await screenshot(page, "09-presence-focus-overlay-final.png");

  // Escape closes focus
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("presence-public-bbbvision-focus")).toHaveCount(0);
});

test("capture Presence reduced motion and mobile", async ({ page, request, context }) => {
  await preparePublishedBbbVision(page, request);

  // Reduced motion
  const reduced = await context.newPage();
  await reduced.emulateMedia({ reducedMotion: "reduce" });
  await reduced.goto("/p/test-presence-room#gallery", { waitUntil: "networkidle" });
  await expect(reduced.getByTestId("presence-public-bbbvision-constellation")).toBeVisible();
  await waitForCanvasReady(reduced);
  await reduced.waitForTimeout(600);
  await screenshot(reduced, "10-presence-reduced-motion-gallery.png");
  // Click in reduced motion should open focus immediately (no strip burst)
  await reduced.locator(".v2-bbb-canvas").click();
  await expect(reduced.getByTestId("presence-public-bbbvision-focus")).toBeVisible();
  await screenshot(reduced, "11-presence-reduced-motion-focus.png");
  await reduced.keyboard.press("Escape");
  await expect(reduced.getByTestId("presence-public-bbbvision-focus")).toHaveCount(0);
  await reduced.close();

  // Mobile
  const mobile = await context.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto("/p/test-presence-room#gallery", { waitUntil: "networkidle" });
  await expect(mobile.getByTestId("presence-public-bbbvision-gallery")).toBeVisible();
  await waitForCanvasReady(mobile);
  await mobile.waitForTimeout(800);
  await screenshot(mobile, "12-presence-mobile-gallery.png");
  await mobile.close();
});

test("capture regressions and legacy negative", async ({ page, request }) => {
  await request.post(`${API_BASE}/__test__/reset`);
  await request.post(`${API_BASE}/__test__/state`, { data: { useBbbVisionPilot: true } });

  // Gallery P2 regression
  await page.goto("/p/rooms-gallery-painter", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await screenshot(page, "13-regression-gallery-p2.png");

  // Christina regression (via public style preset test room)
  await request.post(`${API_BASE}/__test__/reset`);
  await request.post(`${API_BASE}/__test__/state`, { data: { useStudioV2DraftPreview: true } });
  await page.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await screenshot(page, "14-regression-christina.png");

  // Legacy negative
  await page.goto("/p/hesmaddw", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await screenshot(page, "15-legacy-negative.png");
});
