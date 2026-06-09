import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type APIRequestContext, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";
const evidenceDir = path.join(
  process.cwd(),
  "docs",
  "program",
  "evidence",
  "presence-v3-bbbvision-canvas-conditional-fixes",
);

function collectRuntimeErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("Failed to load resource")) {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function useBbbVisionPilot(request: APIRequestContext) {
  await request.post(`${API_BASE}/__test__/reset`);
  await request.post(`${API_BASE}/__test__/state`, {
    data: { useBbbVisionPilot: true },
  });
}

async function signInOwner(page: Page, token = "owner-test-token") {
  await page.goto("/");
  await page.evaluate((value) => window.localStorage.setItem("presence:e2e:access_token", value), token);
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

async function preparePublishedBbbVision(page: Page, request: APIRequestContext) {
  await useBbbVisionPilot(request);
  await signInOwner(page);
  await page.goto("/studio/101/editor", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible();
  await page.getByTestId("presence-studio-v2-public-style-option").filter({ hasText: "bbb.vision / Threshold Gallery" }).click();
  await expect(page.getByTestId("presence-studio-v2-public-style-current")).toContainText("bbb.vision / Threshold Gallery");
  await saveDraft(page);
  await publishDraft(request);
}

async function delayWorkImages(page: Page, delayMs = 450) {
  await page.route("**/ggm/works/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.continue();
  });
}

async function screenshot(page: Page, fileName: string) {
  await fs.mkdir(evidenceDir, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDir, fileName), fullPage: false });
}

async function waitForCanvasReady(page: Page) {
  await expect(page.getByTestId("presence-public-bbbvision-canvas-shell")).toHaveAttribute(
    "data-loader-state",
    "ready",
    { timeout: 10_000 },
  );
}

test("loader covers the first frame and fades once canvas thumbnails are ready", async ({ page, request }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await preparePublishedBbbVision(page, request);
  await delayWorkImages(page);

  await page.goto("/p/test-presence-room#gallery", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("presence-public-bbbvision-gallery")).toBeVisible();
  await expect(page.getByTestId("presence-public-bbbvision-constellation")).toBeVisible();
  await expect(page.getByTestId("presence-public-bbbvision-loader")).toHaveAttribute("data-state", "loading");
  await expect(page.getByText("Loading field")).toBeVisible();
  await screenshot(page, "01-loader-first-frame.png");

  await waitForCanvasReady(page);
  await expect(page.getByTestId("presence-public-bbbvision-loader")).toHaveAttribute("data-state", "ready");
  await page.waitForTimeout(350);
  await screenshot(page, "02-canvas-ready-state.png");
  expect(runtimeErrors).toEqual([]);
});

test("focus selection runs through canvas transition and Escape/back behaviour remains intact", async ({ page, request }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await preparePublishedBbbVision(page, request);

  await page.goto("/p/test-presence-room#gallery", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-public-bbbvision-gallery")).toBeVisible();
  await waitForCanvasReady(page);
  await screenshot(page, "03-desktop-gallery-field.png");

  await page.locator(".v2-bbb-canvas").click();
  await page.waitForTimeout(140);
  await screenshot(page, "04-focus-strip-transition.png");
  await expect(page.getByTestId("presence-public-bbbvision-focus")).toBeVisible();
  await expect(page.getByTestId("presence-public-bbbvision-focus-image")).toBeVisible();
  await screenshot(page, "05-focus-overlay-final.png");

  await page.keyboard.press("Escape");
  await expect(page.getByTestId("presence-public-bbbvision-focus")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("presence-public-bbbvision-threshold")).toBeVisible();
  await page.goBack();
  await expect(page.getByTestId("presence-public-bbbvision-gallery")).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test("threshold entry, reduced motion, and mobile canvas remain usable", async ({ page, request, context }) => {
  await preparePublishedBbbVision(page, request);

  await page.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-public-bbbvision-threshold")).toBeVisible();
  await page.getByTestId("presence-public-bbbvision-enter").click();
  await expect(page.getByTestId("presence-public-bbbvision-gallery")).toBeVisible();
  await waitForCanvasReady(page);

  const reduced = await context.newPage();
  const reducedErrors = collectRuntimeErrors(reduced);
  await reduced.emulateMedia({ reducedMotion: "reduce" });
  await reduced.goto("/p/test-presence-room#gallery", { waitUntil: "networkidle" });
  await expect(reduced.getByTestId("presence-public-bbbvision-constellation")).toBeVisible();
  await waitForCanvasReady(reduced);
  await reduced.locator(".v2-bbb-canvas").click();
  await expect(reduced.getByTestId("presence-public-bbbvision-focus")).toBeVisible();
  await screenshot(reduced, "06-reduced-motion-focus.png");
  await reduced.keyboard.press("Escape");
  await expect(reduced.getByTestId("presence-public-bbbvision-focus")).toHaveCount(0);
  expect(reducedErrors).toEqual([]);
  await reduced.close();

  const mobile = await context.newPage();
  const mobileErrors = collectRuntimeErrors(mobile);
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto("/p/test-presence-room#gallery", { waitUntil: "networkidle" });
  await expect(mobile.getByTestId("presence-public-bbbvision-gallery")).toBeVisible();
  await expect(mobile.getByTestId("presence-public-bbbvision-constellation")).toBeVisible();
  await waitForCanvasReady(mobile);
  await screenshot(mobile, "07-mobile-gallery-field.png");
  expect(mobileErrors).toEqual([]);
  await mobile.close();
});

test("canvas scatter remains deterministic, editable-room driven, and free of hardcoded image pools", async () => {
  const component = await fs.readFile(
    path.join(process.cwd(), "components", "presence-studio-v2", "BbbVisionCanvasGallery.tsx"),
    "utf8",
  );
  const smoke = await fs.readFile(path.join(process.cwd(), "scripts", "hosted-bbbvision-migration-smoke.mjs"), "utf8");

  expect(component).toContain("stableWorkSeed");
  expect(component).toContain("buildWorkAssignments");
  expect(component).toContain("work.object.id");
  expect(component).toContain("work.object.image?.src");
  expect(component).not.toContain("bbbvision.vercel.app/assets");
  expect(component).not.toContain("const bbbvisionImages");
  expect(component).not.toContain("% 20");
  expect(smoke).toContain("presence-public-bbbvision-constellation");
  expect(smoke).not.toContain(".v2-bbb-star");
});

test("Gallery P2 and legacy rooms remain outside the bbbvision canvas renderer", async ({ page, request }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await useBbbVisionPilot(request);

  await page.goto("/p/rooms-gallery-painter", { waitUntil: "networkidle" });
  await expect(page.locator(".presence-studio-v2-public")).toHaveCount(0);
  await screenshot(page, "08-gallery-p2-regression.png");

  await page.goto("/p/hesmaddw", { waitUntil: "networkidle" });
  await expect(page.locator(".presence-studio-v2-public")).toHaveCount(0);
  await screenshot(page, "09-legacy-negative.png");
  expect(runtimeErrors).toEqual([]);
});
