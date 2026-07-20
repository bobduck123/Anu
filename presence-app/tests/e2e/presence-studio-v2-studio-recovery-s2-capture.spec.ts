import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type APIRequestContext, type Locator, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";
const evidenceDir = process.env.PRESENCE_STUDIO_RECOVERY_S2_OUT
  ? path.resolve(process.cwd(), process.env.PRESENCE_STUDIO_RECOVERY_S2_OUT)
  : path.join(
      process.cwd(),
      "docs",
      "program",
      "evidence",
      "presence-studio-v2-studio-recovery-s2",
    );

test.skip(
  process.env.PRESENCE_STUDIO_RECOVERY_S2_CAPTURE !== "1",
  "Set PRESENCE_STUDIO_RECOVERY_S2_CAPTURE=1 to capture Studio Recovery S2 evidence.",
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

async function dragBy(page: Page, locator: Locator, deltaX: number, deltaY: number) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error("Cannot drag element without a bounding box.");
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 8 });
  await page.mouse.up();
}

test("captures Studio Recovery S2 direct manipulation evidence", async ({ page, request }) => {
  await fs.mkdir(evidenceDir, { recursive: true });
  await openStudioV2Editor(page, request);

  await page.getByTestId("presence-studio-v2-outline-object").filter({ hasText: "Desktop-only proof" }).click();
  await expect(page.getByTestId("presence-studio-v2-selection-frame")).toBeVisible();
  await page.screenshot({
    path: path.join(evidenceDir, "01-selected-object-frame.png"),
    fullPage: true,
  });

  await page.getByTestId("presence-studio-v2-inspector-tab-motion").click();
  await page.getByRole("button", { name: "Wild" }).click();
  const selectedObject = page.getByTestId("presence-studio-v2-draggable-object").filter({ hasText: "Desktop-only proof" }).first();
  await dragBy(page, selectedObject, 84, 42);
  await expect(page.getByTestId("presence-studio-v2-drag-readout")).toBeVisible();
  await page.screenshot({
    path: path.join(evidenceDir, "02-wild-drag-readout.png"),
    fullPage: true,
  });

  await dragBy(page, page.getByTestId("presence-studio-v2-resize-handle").nth(3), 58, 58);
  await page.screenshot({
    path: path.join(evidenceDir, "03-resized-object-scale-handle.png"),
    fullPage: true,
  });

  await dragBy(page, page.getByTestId("presence-studio-v2-rotate-handle"), 76, 44);
  await page.screenshot({
    path: path.join(evidenceDir, "04-rotated-object-handle.png"),
    fullPage: true,
  });

  await page.getByTestId("presence-studio-v2-inspector").screenshot({
    path: path.join(evidenceDir, "05-motion-tab-synced.png"),
  });

  await page.getByRole("button", { name: "Guided" }).click();
  await expect(page.getByTestId("presence-studio-v2-resize-handle").first()).toHaveAttribute("aria-disabled", "true");
  await page.screenshot({
    path: path.join(evidenceDir, "06-guided-mode-disabled-handles.png"),
    fullPage: true,
  });

  await page.getByTestId("presence-studio-v2-outline-object").filter({ hasText: "Bridle Road" }).click();
  await page.getByRole("button", { name: "Wild" }).click();
  await page.getByTestId("presence-studio-v2-inspector-tab-motion").click();
  await expect(page.getByTestId("presence-studio-v2-rotate-handle")).toHaveAttribute("aria-disabled", "true");
  await page.screenshot({
    path: path.join(evidenceDir, "07-locked-object-disabled-handles.png"),
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/studio/101/editor", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible();
  await page.screenshot({
    path: path.join(evidenceDir, "08-mobile-narrow-editor-safety.png"),
    fullPage: true,
  });
});
