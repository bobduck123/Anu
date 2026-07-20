import { expect, test, type APIRequestContext, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";
const roomId = 11;

async function openStudio(page: Page, request: APIRequestContext) {
  await request.post(`${API_BASE}/__test__/reset`);
  await request.post(`${API_BASE}/__test__/state`, { data: { useGgmPrivateProof: true } });
  await page.goto("/");
  await page.evaluate(() => window.localStorage.setItem("presence:e2e:access_token", "owner-test-token"));
  await page.goto(`/studio/${roomId}/editor`, { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible();
}

async function saveDraft(page: Page) {
  const save = page.waitForResponse((response) =>
    response.url().includes(`/api/presence/owner/rooms/${roomId}/editor/draft`) &&
    ["POST", "PATCH"].includes(response.request().method()),
  );
  await page.getByTestId("presence-studio-v2-save").click();
  expect((await save).ok()).toBeTruthy();
  await expect(page.getByTestId("presence-studio-v2-saved")).toContainText("Saved", { timeout: 10_000 });
}

async function titlesInEditorZone(page: Page, zoneId: string): Promise<string[]> {
  return page.locator(`[data-testid="presence-studio-v2-layout-zone"][data-zone-id="${zoneId}"] .v2-obj-title`).evaluateAll((items) =>
    items.map((item) => item.textContent?.trim() ?? "").filter(Boolean),
  );
}

async function titlesInPreviewZone(page: Page, zoneId: string): Promise<string[]> {
  return page.locator(`.v2-public-layout-zone[data-zone-id="${zoneId}"] .v2-public-object h3`).evaluateAll((items) =>
    items.map((item) => item.textContent?.trim() ?? "").filter(Boolean),
  );
}

test("registered Gallery Wall zones and safe placement controls remain available", async ({ page, request }) => {
  await openStudio(page, request);
  await expect(page.getByTestId("presence-studio-v2-layout-label").first()).toContainText("Gallery wall");
  await expect(page.getByTestId("presence-studio-v2-layout-zone").first()).toBeVisible();
  await page.getByTestId("presence-studio-v2-outline-object").filter({ hasText: "Private install note" }).click();
  await expect(page.getByTestId("presence-studio-v2-placement-controls")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-placement-zone")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-placement-size")).toBeVisible();
});

test("layout selection changes the room contract without a parallel preview renderer", async ({ page, request }) => {
  await openStudio(page, request);
  await page.getByTestId("presence-studio-v2-layout-select").selectOption("portal-threshold");
  await expect(page.getByTestId("presence-studio-v2-layout-label").first()).toContainText("Portal threshold");
  await page.getByTestId("presence-studio-v2-save").click();
  await expect(page.getByTestId("presence-studio-v2-saved")).toContainText("Saved");
  await page.goto(`/studio/${roomId}/editor/preview`, { waitUntil: "networkidle" });
  await expect(page.locator(".presence-studio-v2-public .v2-public-layout.layout-portal-threshold")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-inspector")).toHaveCount(0);
});

test("pointer arrangement uses the same guarded placement contract as controls", async ({ page, request }) => {
  await openStudio(page, request);
  await page.getByTestId("presence-studio-v2-outline-object").filter({ hasText: "Private install note" }).click();
  const dragHandle = page.getByTestId("presence-studio-v2-layout-drag-handle");
  const validZone = page.locator('[data-testid="presence-studio-v2-layout-zone"][data-zone-id="influence-layer"]');
  const invalidZone = page.locator('[data-testid="presence-studio-v2-layout-zone"][data-zone-id="opening-work"]');
  await dragHandle.scrollIntoViewIfNeeded();
  const handleBox = await dragHandle.boundingBox();
  const validBox = await validZone.boundingBox();
  expect(handleBox).toBeTruthy();
  expect(validBox).toBeTruthy();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
  await expect(validZone).toHaveClass(/is-layout-drop-active/);
  await expect(invalidZone).not.toHaveClass(/is-layout-drop-active/);
  await page.mouse.move(validBox!.x + validBox!.width / 2, validBox!.y + validBox!.height / 2);
  await page.mouse.up();
  await expect(page.getByTestId("presence-studio-v2-layout-notice")).toContainText("Placed in the selected part of the room.");

  await dragHandle.dispatchEvent("pointerdown", { pointerType: "mouse", button: 0 });
  await invalidZone.dispatchEvent("pointerup", { pointerType: "mouse", button: 0 });
  await expect(page.getByTestId("presence-studio-v2-layout-notice")).toContainText("This object belongs in a different part of this chamber.");
});

test("reorder updates resolved composition and survives local draft save, reload, and private preview", async ({ page, request }) => {
  await openStudio(page, request);

  await page.getByTestId("presence-studio-v2-outline-object").filter({ hasText: "Private install note" }).click();
  await page.getByLabel("Shown in public room").check();
  await expect(page.getByTestId("presence-studio-v2-object-state-summary").first()).not.toContainText("Hidden from public");

  await expect.poll(() => titlesInEditorZone(page, "supporting-notes")).toEqual([
    "Private install note",
    "Desktop-only proof",
  ]);

  await page.getByRole("button", { name: "Move down" }).click();
  await expect.poll(() => titlesInEditorZone(page, "supporting-notes")).toEqual([
    "Desktop-only proof",
    "Private install note",
  ]);

  await saveDraft(page);
  await page.reload({ waitUntil: "networkidle" });
  await expect.poll(() => titlesInEditorZone(page, "supporting-notes")).toEqual([
    "Desktop-only proof",
    "Private install note",
  ]);

  await page.goto(`/studio/${roomId}/editor/preview`, { waitUntil: "networkidle" });
  await expect(page.locator(".presence-studio-v2-public")).toBeVisible();
  await expect.poll(() => titlesInPreviewZone(page, "supporting-notes")).toEqual([
    "Desktop-only proof",
    "Private install note",
  ]);
  await expect(page.getByTestId("presence-studio-v2-inspector")).toHaveCount(0);
});

test("hidden-on-mobile remains authoritative across layout placement and mobile private preview", async ({ page, request }) => {
  await openStudio(page, request);
  await page.setViewportSize({ width: 390, height: 844 });

  await page.getByTestId("presence-studio-v2-outline-object").filter({ hasText: "Desktop-only proof" }).click();
  await expect(page.getByTestId("presence-studio-v2-inspector")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-object-state-summary").first()).toContainText("Hidden on mobile");

  await page.getByTestId("presence-studio-v2-placement-zone").selectOption("influence-layer");
  await expect.poll(() => titlesInEditorZone(page, "influence-layer")).toContain("Desktop-only proof");
  await saveDraft(page);

  await page.goto(`/studio/${roomId}/editor/preview`, { waitUntil: "networkidle" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".presence-studio-v2-public")).toBeVisible();
  await expect(page.locator(".v2-public-object").getByRole("heading", { name: "Desktop-only proof" })).toBeHidden();
  await expect.poll(() => titlesInPreviewZone(page, "influence-layer")).toContain("Desktop-only proof");
});
