import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type APIRequestContext, type Locator, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";
const evidenceDir = path.join(process.cwd(), "docs", "program", "evidence", "presence-studio-v2-asset-library-s5");
const replacementUrl = "/ggm/works/willow-of-port-arthur-2019.webp";
const suspectedBrokenUrl = "/ggm/works/harmless-hosted-smoke-v1b-test.png";

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
  await fs.mkdir(evidenceDir, { recursive: true });
}

async function screenshot(page: Page, fileName: string) {
  await page.screenshot({ path: path.join(evidenceDir, fileName), fullPage: false });
}

async function selectDesktopProof(page: Page) {
  await page.getByTestId("presence-studio-v2-outline-object").filter({ hasText: "Desktop-only proof" }).click();
  await expect(page.getByTestId("presence-studio-v2-selection-label")).toContainText("Desktop-only proof");
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

test("Studio V2 S5 derives room assets, validates media health, and replaces image URLs through object state", async ({
  page,
  request,
}) => {
  await openStudioV2Editor(page, request);

  const assetsPanel = page.getByTestId("presence-studio-v2-assets-panel");
  await expect(assetsPanel).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-media-health")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-media-health-item").filter({ hasText: "Total media assets" })).toContainText("1");
  await expect(page.getByTestId("presence-studio-v2-asset-card")).toHaveCount(1);
  await expect(page.getByTestId("presence-studio-v2-asset-thumbnail")).toBeVisible();
  await screenshot(page, "01-asset-panel-overview.png");

  await page.getByTestId("presence-studio-v2-asset-thumbnail").first().click();
  await expect(page.getByTestId("presence-studio-v2-selection-label")).toContainText("Bridle Road, after rain");
  await expect(page.getByTestId("presence-studio-v2-asset-replace-url")).toHaveValue("/ggm/works/willow-of-port-arthur-2019.webp");
  await expect(page.getByText("Derived from current room objects. Upload library arrives later.")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-inspector")).toContainText("Current Works");
  await screenshot(page, "02-asset-detail-view.png");

  await page.getByTestId("presence-studio-v2-asset-used-in").first().click();
  await expect(page.getByTestId("presence-studio-v2-selection-label")).toContainText("Bridle Road, after rain");
  await screenshot(page, "03-asset-used-in-state.png");

  await selectDesktopProof(page);
  await page.getByTestId("studio-v2-object-type").selectOption("image");
  const proofCard = page.getByTestId("presence-studio-v2-asset-card").filter({ hasText: "Desktop-only proof" });
  await expect(proofCard.getByTestId("presence-studio-v2-asset-status")).toContainText("Missing URL");
  await proofCard.getByTestId("presence-studio-v2-asset-thumbnail").click();
  await expect(page.getByTestId("presence-studio-v2-asset-replace-url")).toHaveValue("");
  await expect(page.getByText("Missing image URL")).toBeVisible();
  await screenshot(page, "04-missing-image-state.png");

  await page.getByTestId("presence-studio-v2-asset-replace-url").fill(replacementUrl);
  await expect(page.getByTestId("studio-v2-object-image")).toHaveValue(replacementUrl);
  await expect(proofCard.getByText("Duplicate URL")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-media-health-item").filter({ hasText: "Duplicate URLs" })).toContainText("2");
  await expect(page.getByTestId("presence-studio-v2-dirty")).toBeVisible();
  await screenshot(page, "05-replace-url-flow.png");

  const saveResponse = page.waitForResponse(
    (response) => response.url().includes("/api/presence/owner/rooms/101/editor/draft") && response.ok(),
  );
  await page.getByTestId("presence-studio-v2-save").click();
  await saveResponse;
  await expect(page.getByTestId("presence-studio-v2-saved")).toBeVisible();

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible();
  await selectDesktopProof(page);
  await expect(page.getByTestId("studio-v2-object-type")).toHaveValue("image");
  await expect(page.getByTestId("studio-v2-object-image")).toHaveValue(replacementUrl);

  await page.getByTestId("studio-v2-object-image").fill(suspectedBrokenUrl);
  await expect(page.getByTestId("presence-studio-v2-dirty")).toBeVisible();
  const suspectedCard = page.getByTestId("presence-studio-v2-asset-card").filter({ hasText: "Desktop-only proof" });
  await suspectedCard.getByTestId("presence-studio-v2-asset-thumbnail").click();
  await expect(suspectedCard.getByText("Possible test asset")).toBeVisible();
  await expect(page.getByText("Possible test asset: URL includes smoke/test terms.")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-media-health-item").filter({ hasText: "Suspected test assets" })).toContainText("1");
  await expect(suspectedCard.getByText("Broken/unloaded")).toBeVisible();
  await screenshot(page, "06-suspected-test-asset-warning.png");

  await expect(page.getByTestId("presence-studio-v2-media-health")).toBeVisible();
  await screenshot(page, "07-media-health-checklist.png");

  await page.goto("/studio/101/editor/preview", { waitUntil: "networkidle" });
  await expect(page.locator(".presence-studio-v2-public")).toBeVisible();
  await expect(page.getByText("Possible test asset")).toHaveCount(0);
  await expect(page.getByText("Room Assets")).toHaveCount(0);
  await expect(page.getByText("Derived from current room objects")).toHaveCount(0);
  await screenshot(page, "08-owner-preview-clean.png");

  await page.goto("/p/v2-public-room", { waitUntil: "networkidle" });
  await expect(page.locator(".presence-studio-v2-public")).toBeVisible();
  await expect(page.getByText("Possible test asset")).toHaveCount(0);
  await expect(page.getByText("Room Assets")).toHaveCount(0);
  await expect(page.getByText("Derived from current room objects")).toHaveCount(0);
  await screenshot(page, "09-public-render-clean.png");

  await page.goto("/studio/101/editor", { waitUntil: "networkidle" });
  await selectDesktopProof(page);
  await page.getByRole("button", { name: "Wild" }).click();
  await page.getByTestId("presence-studio-v2-inspector-tab-motion").click();
  await expect(page.getByTestId("presence-studio-v2-resize-handle").first()).toHaveAttribute("aria-disabled", "false");
  await dragBy(page, page.getByTestId("presence-studio-v2-draggable-object").filter({ hasText: "Desktop-only proof" }).first(), 46, 28);
  await expect(page.getByTestId("presence-studio-v2-drag-readout")).toBeVisible();
});
