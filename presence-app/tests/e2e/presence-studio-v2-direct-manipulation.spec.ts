import { expect, test, type APIRequestContext, type Locator, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";

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

async function numberValue(locator: Locator): Promise<number> {
  return Number(await locator.inputValue());
}

test("Studio V2 S2 direct manipulation updates and persists transforms", async ({ page, request }) => {
  await openStudioV2Editor(page, request);

  await page.getByTestId("presence-studio-v2-outline-object").filter({ hasText: "Desktop-only proof" }).click();
  const selectedObject = page.getByTestId("presence-studio-v2-draggable-object").filter({ hasText: "Desktop-only proof" }).first();
  await expect(page.getByTestId("presence-studio-v2-selection-frame")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-selection-label")).toContainText("Desktop-only proof");
  await expect(page.getByTestId("presence-studio-v2-resize-handle")).toHaveCount(4);
  await expect(page.getByTestId("presence-studio-v2-rotate-handle")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-resize-handle").first()).toHaveAttribute("aria-disabled", "true");

  await page.getByTestId("presence-studio-v2-inspector-tab-motion").click();
  const xInput = page.getByTestId("presence-studio-v2-transform-x");
  const yInput = page.getByTestId("presence-studio-v2-transform-y");
  const scaleInput = page.getByTestId("presence-studio-v2-transform-scale");
  const rotationInput = page.getByTestId("presence-studio-v2-transform-rotation");

  await dragBy(page, selectedObject, 70, 36);
  await expect(xInput).toHaveValue("0");
  await expect(yInput).toHaveValue("0");

  await page.getByRole("button", { name: "Wild" }).click();
  await expect(page.getByTestId("presence-studio-v2-resize-handle").first()).toHaveAttribute("aria-disabled", "false");

  await dragBy(page, selectedObject, 84, 42);
  await expect(page.getByTestId("presence-studio-v2-drag-readout")).toBeVisible();
  await expect.poll(() => numberValue(xInput)).toBeGreaterThan(30);
  await expect.poll(() => numberValue(yInput)).toBeGreaterThan(20);

  await dragBy(page, page.getByTestId("presence-studio-v2-resize-handle").nth(3), 58, 58);
  await expect.poll(() => numberValue(scaleInput)).toBeGreaterThan(1.05);

  const rotateHandle = page.getByTestId("presence-studio-v2-rotate-handle");
  await dragBy(page, rotateHandle, 76, 44);
  await expect.poll(async () => Math.abs(await numberValue(rotationInput))).toBeGreaterThan(10);
  await expect(page.getByTestId("presence-studio-v2-dirty")).toBeVisible();
  const writesBeforeManualSave = await (await request.get(`${API_BASE}/__test__/requests`)).json();
  expect(
    writesBeforeManualSave.requests.filter(
      (entry: { method: string; path: string }) =>
        entry.path === "/api/presence/owner/rooms/101/editor/draft" && ["POST", "PATCH"].includes(entry.method),
    ),
  ).toHaveLength(0);
  const saveResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/presence/owner/rooms/101/editor/draft") &&
      ["POST", "PATCH"].includes(response.request().method()) &&
      response.ok(),
  );
  await page.getByTestId("presence-studio-v2-save").click();
  const persistedResponse = await saveResponse;
  const persistedPayload = await persistedResponse.json();
  const persistedStudio = persistedPayload.data.draft.scene_config.studio_v2;
  const persistedObject = persistedPayload.data.draft.content_config.studio_v2.objects.find(
    (object: { id: string; title: string }) => object.title === "Desktop-only proof",
  );
  expect(persistedObject).toBeTruthy();
  const savedTransform = persistedStudio.objectState[persistedObject.id].transform;
  expect(savedTransform.x).toBeGreaterThan(0);
  expect(savedTransform.y).toBeGreaterThan(0);
  expect(savedTransform.scale).not.toBe(1);
  expect(Math.abs(savedTransform.rotation)).toBeGreaterThan(0);
  const savedX = Math.round(savedTransform.x);
  const savedY = Math.round(savedTransform.y);
  const savedScale = savedTransform.scale;
  const savedRotation = Math.round(savedTransform.rotation);
  await expect(page.getByTestId("presence-studio-v2-saved")).toBeVisible();

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible();
  await page.getByTestId("presence-studio-v2-outline-object").filter({ hasText: "Desktop-only proof" }).click();
  await page.getByTestId("presence-studio-v2-inspector-tab-motion").click();

  await expect.poll(() => numberValue(page.getByTestId("presence-studio-v2-transform-x"))).toBe(savedX);
  await expect.poll(() => numberValue(page.getByTestId("presence-studio-v2-transform-y"))).toBe(savedY);
  await expect.poll(() => numberValue(page.getByTestId("presence-studio-v2-transform-scale"))).toBeCloseTo(savedScale, 1);
  await expect.poll(() => numberValue(page.getByTestId("presence-studio-v2-transform-rotation"))).toBe(savedRotation);
});

test("Studio V2 S2 keeps locked objects fixed even in Wild Mode", async ({ page, request }) => {
  await openStudioV2Editor(page, request);

  await page.getByTestId("presence-studio-v2-outline-object").filter({ hasText: "Bridle Road" }).click();
  const lockedObject = page.getByTestId("presence-studio-v2-draggable-object").filter({ hasText: "Bridle Road" }).first();
  await page.getByRole("button", { name: "Wild" }).click();
  await page.getByTestId("presence-studio-v2-inspector-tab-motion").click();

  await expect(page.getByTestId("presence-studio-v2-selection-frame")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-resize-handle").first()).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByTestId("presence-studio-v2-rotate-handle")).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByTestId("presence-studio-v2-transform-x")).toBeDisabled();
  await expect(page.getByTestId("presence-studio-v2-transform-scale")).toBeDisabled();
  await expect(page.getByText("Locked - handles disabled")).toBeVisible();

  const beforeX = await numberValue(page.getByTestId("presence-studio-v2-transform-x"));
  await dragBy(page, lockedObject, 90, 44);
  await expect(page.getByTestId("presence-studio-v2-transform-x")).toHaveValue(String(beforeX));
  await expect(page.getByTestId("presence-studio-v2-drag-readout")).toHaveCount(0);
});
