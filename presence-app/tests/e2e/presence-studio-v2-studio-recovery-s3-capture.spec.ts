import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type APIRequestContext, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";
const evidenceDir = process.env.PRESENCE_STUDIO_RECOVERY_S3_OUT
  ? path.resolve(process.cwd(), process.env.PRESENCE_STUDIO_RECOVERY_S3_OUT)
  : path.join(
      process.cwd(),
      "docs",
      "program",
      "evidence",
      "presence-studio-v2-studio-recovery-s3",
    );

test.skip(
  process.env.PRESENCE_STUDIO_RECOVERY_S3_CAPTURE !== "1",
  "Set PRESENCE_STUDIO_RECOVERY_S3_CAPTURE=1 to capture Studio Recovery S3 evidence.",
);

async function signInOwner(page: Page) {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.setItem("presence:e2e:access_token", "owner-test-token"));
}

async function openStudioV2Editor(page: Page, request: APIRequestContext) {
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
}

async function setRangeValue(page: Page, testId: string, value: string) {
  await page.getByTestId(testId).evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    input.value = String(nextValue);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

test("captures Studio Recovery S3 inspector and device-frame evidence", async ({ page, request }) => {
  await fs.mkdir(evidenceDir, { recursive: true });
  await openStudioV2Editor(page, request);

  await page.getByTestId("presence-studio-v2-outline-object").filter({ hasText: "Bridle Road" }).click();
  await expect(page.getByTestId("presence-studio-v2-inspector-image-preview")).toBeVisible();
  await page.getByTestId("presence-studio-v2-inspector").screenshot({
    path: path.join(evidenceDir, "01-inspector-content-image-preview.png"),
  });

  await page.getByTestId("presence-studio-v2-inspector-tab-style").click();
  await page.getByTestId("presence-studio-v2-inspector").screenshot({
    path: path.join(evidenceDir, "02-inspector-style-state-controls.png"),
  });

  await page.getByTestId("presence-studio-v2-outline-object").filter({ hasText: "Desktop-only proof" }).click();
  await page.getByTestId("presence-studio-v2-inspector-tab-motion").click();
  await page.getByRole("button", { name: "Wild" }).click();
  await page.getByTestId("presence-studio-v2-transform-x-plus").click();
  await setRangeValue(page, "presence-studio-v2-transform-scale-slider", "1.35");
  await setRangeValue(page, "presence-studio-v2-transform-rotation-slider", "24");
  await expect(page.getByTestId("presence-studio-v2-object-state-summary")).toContainText("Transformed");
  await page.getByTestId("presence-studio-v2-inspector").screenshot({
    path: path.join(evidenceDir, "03-inspector-motion-slider-controls.png"),
  });
  await page.screenshot({
    path: path.join(evidenceDir, "04-selected-transformed-object-state.png"),
    fullPage: true,
  });

  await page.getByTestId("presence-studio-v2-device-frame").screenshot({
    path: path.join(evidenceDir, "05-desktop-device-frame.png"),
  });
  await page.getByTestId("presence-studio-v2-viewport-mobile").click();
  await page.getByTestId("presence-studio-v2-device-frame").screenshot({
    path: path.join(evidenceDir, "06-mobile-device-frame.png"),
  });

  await page.keyboard.press("Escape");
  await page.getByTestId("presence-studio-v2-tab-threshold").click();
  await expect(page.getByTestId("presence-studio-v2-preview-confidence")).toBeVisible();
  await page.screenshot({
    path: path.join(evidenceDir, "07-preview-publish-confidence-area.png"),
    fullPage: true,
  });

  await page.setViewportSize({ width: 1080, height: 820 });
  await page.screenshot({
    path: path.join(evidenceDir, "08-compact-toolbar-mid-width.png"),
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("presence-studio-v2-outline-toggle")).toBeVisible();
  await page.getByTestId("presence-studio-v2-outline-toggle").click();
  await page.getByTestId("presence-studio-v2-inspector-toggle").click();
  await page.screenshot({
    path: path.join(evidenceDir, "09-narrow-layout-drawer-state.png"),
    fullPage: true,
  });
});
