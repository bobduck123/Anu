import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";
const evidenceDir = process.env.PRESENCE_VISUAL_CAPTURE_OUT
  ? path.resolve(process.cwd(), process.env.PRESENCE_VISUAL_CAPTURE_OUT)
  : path.join(process.cwd(), "docs", "program", "evidence", "presence-public-output-recovery-p1");

test.skip(process.env.PRESENCE_VISUAL_CAPTURE !== "1", "Set PRESENCE_VISUAL_CAPTURE=1 to capture visual evidence.");

async function signInOwner(page: Page) {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.setItem("presence:e2e:access_token", "owner-test-token"));
}

test("captures Gallery public output recovery P1 evidence", async ({ page, request, context }) => {
  await fs.mkdir(evidenceDir, { recursive: true });
  await request.post(`${API_BASE}/__test__/reset`);
  await page.setViewportSize({ width: 1440, height: 950 });

  await page.goto("/p/v2-public-room", { waitUntil: "networkidle" });
  await expect(page.locator(".presence-studio-v2-public.world-gallery")).toBeVisible();
  await expect(page.locator(".v2-public-threshold-image-field img")).toBeVisible();
  await page.screenshot({
    path: path.join(evidenceDir, "01-gallery-threshold-desktop.png"),
    fullPage: false,
  });

  await page.locator(".v2-public-chamber").first().scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(evidenceDir, "02-gallery-chamber-desktop.png"),
    fullPage: false,
  });

  await page.locator(".v2-public-object-media-img").first().scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(evidenceDir, "03-artwork-image-treatment.png"),
    fullPage: false,
  });

  await page.locator(".v2-public-primary-cta").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(evidenceDir, "04-threshold-cta-portal-treatment.png"),
    fullPage: false,
  });

  await page.locator(".v2-public-influence").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(evidenceDir, "05-moodboard-influence-layer.png"),
    fullPage: false,
  });

  await page.locator(".v2-public-traces").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(evidenceDir, "06-traces-residue-treatment.png"),
    fullPage: false,
  });

  const mobile = await context.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto("/p/v2-public-room", { waitUntil: "networkidle" });
  await expect(mobile.locator(".presence-studio-v2-public.world-gallery")).toBeVisible();
  await mobile.screenshot({
    path: path.join(evidenceDir, "07-gallery-mobile-threshold.png"),
    fullPage: false,
  });
  await mobile.locator(".v2-public-chamber").first().scrollIntoViewIfNeeded();
  await mobile.screenshot({
    path: path.join(evidenceDir, "08-gallery-mobile-chamber.png"),
    fullPage: false,
  });
  await mobile.close();

  await request.post(`${API_BASE}/__test__/state`, {
    data: { useStudioV2DraftPreview: true },
  });
  await signInOwner(page);
  await page.goto("/studio/101/editor/preview", { waitUntil: "networkidle" });
  await expect(page.locator(".presence-studio-v2-public")).toBeVisible();
  await page.screenshot({
    path: path.join(evidenceDir, "09-owner-preview-clean.png"),
    fullPage: false,
  });

  await request.post(`${API_BASE}/__test__/reset`);
  await page.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await expect(page.locator(".presence-studio-v2-public")).toHaveCount(0);
  await page.screenshot({
    path: path.join(evidenceDir, "10-legacy-negative.png"),
    fullPage: false,
  });
});
