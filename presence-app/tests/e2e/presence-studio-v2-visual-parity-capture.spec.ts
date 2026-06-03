import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";
const evidenceDir = path.join(
  process.cwd(),
  "docs",
  "program",
  "evidence",
  "presence-studio-v2-visual-parity",
);

test.skip(process.env.PRESENCE_VISUAL_CAPTURE !== "1", "Set PRESENCE_VISUAL_CAPTURE=1 to capture visual evidence.");

async function signInOwner(page: Page) {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.setItem("presence:e2e:access_token", "owner-test-token"));
}

test("captures Studio V2 visual parity evidence", async ({ page, request, context }) => {
  await fs.mkdir(evidenceDir, { recursive: true });
  await request.post(`${API_BASE}/__test__/reset`);
  await request.post(`${API_BASE}/__test__/state`, {
    data: { useStudioV2DraftPreview: true },
  });
  await request.post(`${API_BASE}/api/presence/owner/rooms/101/editor/publish`, {
    headers: { Authorization: "Bearer owner-test-token" },
  });

  await signInOwner(page);
  await page.goto("/studio/101/editor", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible();
  await page.locator(".v2-obj").first().click();
  await page.screenshot({
    path: path.join(evidenceDir, "local-room-101-v2-editor-selected-object.png"),
    fullPage: true,
  });

  await page.goto("/p/v2-public-room", { waitUntil: "networkidle" });
  await expect(page.locator(".presence-studio-v2-public")).toBeVisible();
  await page.screenshot({
    path: path.join(evidenceDir, "local-v2-public-gallery-threshold-desktop.png"),
    fullPage: false,
  });
  await page.locator(".v2-public-chamber").first().scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(evidenceDir, "local-v2-public-gallery-chamber-objects.png"),
    fullPage: false,
  });

  const mobile = await context.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto("/p/v2-public-room", { waitUntil: "networkidle" });
  await expect(mobile.locator(".presence-studio-v2-public")).toBeVisible();
  await mobile.screenshot({
    path: path.join(evidenceDir, "local-v2-public-gallery-mobile.png"),
    fullPage: true,
  });
  await mobile.close();

  await request.post(`${API_BASE}/__test__/state`, {
    data: { useStudioV2DraftPreview: true },
  });
  await page.goto("/studio/101/editor/preview", { waitUntil: "networkidle" });
  await expect(page.locator(".presence-studio-v2-public")).toBeVisible();
  await page.screenshot({
    path: path.join(evidenceDir, "local-v2-owner-draft-preview.png"),
    fullPage: false,
  });

  await request.post(`${API_BASE}/__test__/reset`);
  await page.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await expect(page.locator(".presence-studio-v2-public")).toHaveCount(0);
  await page.screenshot({
    path: path.join(evidenceDir, "local-legacy-public-regression-comparison.png"),
    fullPage: false,
  });
});
