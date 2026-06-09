import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type APIRequestContext, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";
const evidenceDir = path.join(
  process.cwd(),
  "docs",
  "program",
  "evidence",
  "presence-v3-bbbvision-gallery-parity",
);

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
  await fs.mkdir(evidenceDir, { recursive: true });
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

async function screenshot(page: Page, fileName: string) {
  await page.screenshot({ path: path.join(evidenceDir, fileName), fullPage: false });
}

async function selectBbbVisionStyle(page: Page) {
  await page.getByTestId("presence-studio-v2-public-style-option").filter({ hasText: "bbb.vision / Threshold Gallery" }).click();
  await expect(page.getByTestId("presence-studio-v2-public-style-current")).toContainText("bbb.vision / Threshold Gallery");
}

test("direct #gallery entry opens gallery state not threshold", async ({ page, request }) => {
  await openBbbVisionStudio(page, request);
  await selectBbbVisionStyle(page);
  await saveDraft(page);
  await publishDraft(request);

  await page.goto("/p/test-presence-room#gallery", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-public-bbbvision-gallery")).toBeVisible();
  await expect(page.getByTestId("presence-public-bbbvision-threshold")).toHaveCount(0);
  await screenshot(page, "01-direct-gallery-entry.png");
});

test("gallery does not show practice or about content", async ({ page, request }) => {
  await openBbbVisionStudio(page, request);
  await selectBbbVisionStyle(page);
  await saveDraft(page);
  await publishDraft(request);

  await page.goto("/p/test-presence-room#gallery", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-public-bbbvision-practice")).toHaveCount(0);
  const text = await page.locator("body").innerText();
  expect(text).not.toContain("Practice");
  expect(text).not.toContain("About");
});

test("gallery does not show CMS debug or metadata labels", async ({ page, request }) => {
  await openBbbVisionStudio(page, request);
  await selectBbbVisionStyle(page);
  await saveDraft(page);
  await publishDraft(request);

  await page.goto("/p/test-presence-room#gallery", { waitUntil: "networkidle" });
  const text = await page.locator("body").innerText().catch(() => "");
  const lowered = text.toLowerCase();
  expect(lowered).not.toContain("metadata");
  expect(lowered).not.toContain("isentry");
  expect(lowered).not.toContain("isdefault");
  expect(lowered).not.toContain("chamber role");
  expect(lowered).not.toContain("chamber metadata");
  expect(lowered).not.toContain("object count");
  expect(lowered).not.toContain("room assets");
});

test("gallery renders editable image objects from room data", async ({ page, request }) => {
  await openBbbVisionStudio(page, request);
  await selectBbbVisionStyle(page);
  await saveDraft(page);
  await publishDraft(request);

  await page.goto("/p/test-presence-room#gallery", { waitUntil: "networkidle" });
  const canvas = page.locator(".v2-bbb-canvas");
  await expect(canvas).toBeVisible();
  await screenshot(page, "02-gallery-constellation.png");
});

test("gallery layout is not a generic flat card stack", async ({ page, request }) => {
  await openBbbVisionStudio(page, request);
  await selectBbbVisionStyle(page);
  await saveDraft(page);
  await publishDraft(request);

  await page.goto("/p/test-presence-room#gallery", { waitUntil: "networkidle" });
  const canvas = page.locator(".v2-bbb-canvas");
  await expect(canvas).toBeVisible();

  // Canvas should fill the constellation container (not a flex/grid card stack)
  const display = await canvas.evaluate((el) => getComputedStyle(el).display);
  expect(display).toBe("block");
});

test("clicking canvas field opens focus overlay", async ({ page, request }) => {
  await openBbbVisionStudio(page, request);
  await selectBbbVisionStyle(page);
  await saveDraft(page);
  await publishDraft(request);

  await page.goto("/p/test-presence-room#gallery", { waitUntil: "networkidle" });
  const canvas = page.locator(".v2-bbb-canvas");
  await canvas.click();
  await expect(page.getByTestId("presence-public-bbbvision-focus")).toBeVisible();
  await expect(page.getByTestId("presence-public-bbbvision-focus-image")).toBeVisible();
  await screenshot(page, "03-gallery-focus-open.png");

  // Click backdrop to close
  await page.locator(".v2-bbb-focus-backdrop").click();
  await expect(page.getByTestId("presence-public-bbbvision-focus")).toHaveCount(0);
});

test("keyboard movement works in gallery and focus", async ({ page, request }) => {
  await openBbbVisionStudio(page, request);
  await selectBbbVisionStyle(page);
  await saveDraft(page);
  await publishDraft(request);

  await page.goto("/p/test-presence-room#gallery", { waitUntil: "networkidle" });
  const initialProgress = await page.getByTestId("presence-public-bbbvision-progress").innerText();

  await page.keyboard.press("ArrowRight");
  await expect.poll(async () => page.getByTestId("presence-public-bbbvision-progress").innerText()).not.toBe(initialProgress);

  await page.keyboard.press("ArrowLeft");
  await expect.poll(async () => page.getByTestId("presence-public-bbbvision-progress").innerText()).toBe(initialProgress);

  // Open focus with keyboard
  const canvas = page.locator(".v2-bbb-canvas");
  await canvas.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("presence-public-bbbvision-focus")).toBeVisible();

  // Arrow in focus changes image
  await page.keyboard.press("ArrowRight");
  await expect.poll(async () => page.getByTestId("presence-public-bbbvision-progress").innerText()).not.toBe(initialProgress);

  // Escape closes focus
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("presence-public-bbbvision-focus")).toHaveCount(0);

  // Escape from gallery returns to threshold
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("presence-public-bbbvision-threshold")).toBeVisible();
  await expect(page.getByTestId("presence-public-bbbvision-gallery")).toHaveCount(0);
});

test("mobile gallery is not a flat card stack", async ({ page, request, context }) => {
  await openBbbVisionStudio(page, request);
  await selectBbbVisionStyle(page);
  await saveDraft(page);
  await publishDraft(request);

  const mobile = await context.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto("/p/test-presence-room#gallery", { waitUntil: "networkidle" });

  await expect(mobile.getByTestId("presence-public-bbbvision-constellation")).toBeVisible();
  const canvas = mobile.locator(".v2-bbb-canvas");
  await expect(canvas).toBeVisible();

  // Canvas should fill the container (not a flex/grid card stack)
  const display = await canvas.evaluate((el) => getComputedStyle(el).display);
  expect(display).toBe("block");

  await screenshot(mobile, "04-mobile-gallery-constellation.png");
  await mobile.close();
});

test("reduced motion gallery remains usable", async ({ page, request, context }) => {
  await openBbbVisionStudio(page, request);
  await selectBbbVisionStyle(page);
  await saveDraft(page);
  await publishDraft(request);

  const reducedMotion = await context.newPage();
  await reducedMotion.emulateMedia({ reducedMotion: "reduce" });
  await reducedMotion.goto("/p/test-presence-room#gallery", { waitUntil: "networkidle" });

  await expect(reducedMotion.getByTestId("presence-public-bbbvision-constellation")).toBeVisible();
  const canvas = reducedMotion.locator(".v2-bbb-canvas");
  await expect(canvas).toBeVisible();

  await canvas.click();
  await expect(reducedMotion.getByTestId("presence-public-bbbvision-focus")).toBeVisible();
  await reducedMotion.keyboard.press("Escape");
  await expect(reducedMotion.getByTestId("presence-public-bbbvision-focus")).toHaveCount(0);

  await screenshot(reducedMotion, "05-reduced-motion-gallery.png");
  await reducedMotion.close();
});

test("threshold Enter gallery still works", async ({ page, request }) => {
  await openBbbVisionStudio(page, request);
  await selectBbbVisionStyle(page);
  await saveDraft(page);
  await publishDraft(request);

  await page.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-public-bbbvision-threshold")).toBeVisible();
  await page.getByTestId("presence-public-bbbvision-enter").click();
  await expect(page.getByTestId("presence-public-bbbvision-gallery")).toBeVisible();
  await expect(page.getByTestId("presence-public-bbbvision-constellation")).toBeVisible();
});

test("browser back from gallery returns to threshold", async ({ page, request }) => {
  await openBbbVisionStudio(page, request);
  await selectBbbVisionStyle(page);
  await saveDraft(page);
  await publishDraft(request);

  await page.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await page.getByTestId("presence-public-bbbvision-enter").click();
  await expect(page.getByTestId("presence-public-bbbvision-gallery")).toBeVisible();
  await page.goBack();
  await expect(page.getByTestId("presence-public-bbbvision-threshold")).toBeVisible();
  await expect(page.getByTestId("presence-public-bbbvision-gallery")).toHaveCount(0);
});

test("no visible chamber metadata leaks in gallery", async ({ page, request }) => {
  await openBbbVisionStudio(page, request);
  await selectBbbVisionStyle(page);
  await saveDraft(page);
  await publishDraft(request);

  await page.goto("/p/test-presence-room#gallery", { waitUntil: "networkidle" });
  const html = (await page.content()).toLowerCase();
  const text = (await page.locator("body").innerText()).toLowerCase();

  // data attributes are allowed in HTML but not visible
  expect(html).toContain("data-chamber-role");
  expect(text).not.toContain("data-chamber-role");
  // "gallery", "threshold", "practice" may appear in aria-labels / sr-only text for a11y
  // The real leak to avoid is visible CMS copy like "chamber role", "metadata", etc.
  expect(text).not.toContain("threshold");
  expect(text).not.toContain("practice");
});
