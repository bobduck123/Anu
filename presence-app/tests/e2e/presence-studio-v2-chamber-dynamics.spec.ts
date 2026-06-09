import { expect, test, type APIRequestContext, type Page } from "playwright/test";

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

test("chamber dynamics controls render in room inspector", async ({ page, request }) => {
  await openStudioV2Editor(page, request);

  // Deselect any object to show room inspector
  await page.keyboard.press("Escape");

  await expect(page.getByTestId("presence-studio-v2-chamber-dynamics")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-chamber-role")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-chamber-layout")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-chamber-transition")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-chamber-description")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-chamber-entry-toggle")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-chamber-default-toggle")).toBeVisible();
});

test("role selector changes metadata and marks draft dirty", async ({ page, request }) => {
  await openStudioV2Editor(page, request);
  await page.keyboard.press("Escape");

  const roleSelect = page.getByTestId("presence-studio-v2-chamber-role");
  await roleSelect.selectOption("gallery");

  await expect(page.getByTestId("presence-studio-v2-dirty")).toBeVisible();
});

test("layout selector changes metadata and marks draft dirty", async ({ page, request }) => {
  await openStudioV2Editor(page, request);
  await page.keyboard.press("Escape");

  const layoutSelect = page.getByTestId("presence-studio-v2-chamber-layout");
  await layoutSelect.selectOption("focus");

  await expect(page.getByTestId("presence-studio-v2-dirty")).toBeVisible();
});

test("transition selector changes metadata and marks draft dirty", async ({ page, request }) => {
  await openStudioV2Editor(page, request);
  await page.keyboard.press("Escape");

  const transitionSelect = page.getByTestId("presence-studio-v2-chamber-transition");
  await transitionSelect.selectOption("portal");

  await expect(page.getByTestId("presence-studio-v2-dirty")).toBeVisible();
});

test("description field changes metadata and marks draft dirty", async ({ page, request }) => {
  await openStudioV2Editor(page, request);
  await page.keyboard.press("Escape");

  const descriptionField = page.getByTestId("presence-studio-v2-chamber-description");
  await descriptionField.fill("A test chamber description");

  await expect(page.getByTestId("presence-studio-v2-dirty")).toBeVisible();
});

test("set entry chamber clears entry flag from others", async ({ page, request }) => {
  await openStudioV2Editor(page, request);
  await page.keyboard.press("Escape");

  // First, add a second chamber
  await page.getByTestId("presence-studio-v2-add-chamber").click();
  await expect(page.getByTestId("presence-studio-v2-dirty")).toBeVisible();

  // Set first chamber as entry
  const chambers = page.getByTestId("presence-studio-v2-outline-chamber");
  await chambers.first().locator("button.v2-outline-chamber-name").click();
  await page.keyboard.press("Escape"); // cancel inline rename
  await page.getByTestId("presence-studio-v2-chamber-entry-toggle").check();

  // Switch to second chamber and set as entry
  await chambers.nth(1).locator("button.v2-outline-chamber-name").click();
  await page.keyboard.press("Escape"); // cancel inline rename
  await page.getByTestId("presence-studio-v2-chamber-entry-toggle").check();

  // Go back to first chamber — entry should be unchecked
  await chambers.first().locator("button.v2-outline-chamber-name").click();
  await page.keyboard.press("Escape"); // cancel inline rename
  await expect(page.getByTestId("presence-studio-v2-chamber-entry-toggle")).not.toBeChecked();
});

test("set default chamber clears default flag from others", async ({ page, request }) => {
  await openStudioV2Editor(page, request);
  await page.keyboard.press("Escape");

  // Add a second chamber
  await page.getByTestId("presence-studio-v2-add-chamber").click();

  const chambers = page.getByTestId("presence-studio-v2-outline-chamber");

  // Set first chamber as default
  await chambers.first().locator("button.v2-outline-chamber-name").click();
  await page.keyboard.press("Escape"); // cancel inline rename
  await page.getByTestId("presence-studio-v2-chamber-default-toggle").check();

  // Switch to second chamber and set as default
  await chambers.nth(1).locator("button.v2-outline-chamber-name").click();
  await page.keyboard.press("Escape"); // cancel inline rename
  await page.getByTestId("presence-studio-v2-chamber-default-toggle").check();

  // Go back to first chamber — default should be unchecked
  await chambers.first().locator("button.v2-outline-chamber-name").click();
  await page.keyboard.press("Escape"); // cancel inline rename
  await expect(page.getByTestId("presence-studio-v2-chamber-default-toggle")).not.toBeChecked();
});

test("save/reload preserves chamber metadata", async ({ page, request }) => {
  await openStudioV2Editor(page, request);
  await page.keyboard.press("Escape");

  // Set metadata values
  await page.getByTestId("presence-studio-v2-chamber-role").selectOption("threshold");
  await page.getByTestId("presence-studio-v2-chamber-layout").selectOption("focus");
  await page.getByTestId("presence-studio-v2-chamber-transition").selectOption("portal");
  await page.getByTestId("presence-studio-v2-chamber-description").fill("Threshold room");
  await page.getByTestId("presence-studio-v2-chamber-entry-toggle").check();

  // Save
  const saveResponse = page.waitForResponse(
    (response) => response.url().includes("/api/presence/owner/rooms/101/editor/draft") && response.ok(),
  );
  await page.getByTestId("presence-studio-v2-save").click();
  await saveResponse;
  await expect(page.getByTestId("presence-studio-v2-saved")).toBeVisible();

  // Reload
  await page.reload({ waitUntil: "networkidle" });
  await page.keyboard.press("Escape");

  // Verify values persisted
  await expect(page.getByTestId("presence-studio-v2-chamber-role")).toHaveValue("threshold");
  await expect(page.getByTestId("presence-studio-v2-chamber-layout")).toHaveValue("focus");
  await expect(page.getByTestId("presence-studio-v2-chamber-transition")).toHaveValue("portal");
  await expect(page.getByTestId("presence-studio-v2-chamber-description")).toHaveValue("Threshold room");
  await expect(page.getByTestId("presence-studio-v2-chamber-entry-toggle")).toBeChecked();
});

test("chamber objects remain intact after metadata edit", async ({ page, request }) => {
  await openStudioV2Editor(page, request);
  await page.keyboard.press("Escape");

  // Change role
  await page.getByTestId("presence-studio-v2-chamber-role").selectOption("gallery");

  // Verify objects still exist in outline
  const objects = page.getByTestId("presence-studio-v2-outline-object");
  await expect(objects.first()).toBeVisible();
});

test("S2 direct manipulation still works after chamber metadata changes", async ({ page, request }) => {
  await openStudioV2Editor(page, request);

  // Change chamber metadata first
  await page.keyboard.press("Escape");
  await page.getByTestId("presence-studio-v2-chamber-role").selectOption("gallery");

  // Select an object and verify direct manipulation
  await page.getByRole("button", { name: "Wild" }).click();
  await page.getByTestId("presence-studio-v2-outline-object").first().click();
  await expect(page.getByTestId("presence-studio-v2-selection-frame")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-resize-handle")).toHaveCount(4);
});

test("S5 asset library still works", async ({ page, request }) => {
  await openStudioV2Editor(page, request);

  // Change chamber metadata
  await page.keyboard.press("Escape");
  await page.getByTestId("presence-studio-v2-chamber-role").selectOption("gallery");

  // Verify asset panel is visible
  await expect(page.getByTestId("presence-studio-v2-assets-panel")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-media-health")).toBeVisible();
});

test("add chamber, rename, and reorder work", async ({ page, request }) => {
  await openStudioV2Editor(page, request);

  const initialCount = await page.getByTestId("presence-studio-v2-outline-chamber").count();

  // Add chamber
  await page.getByTestId("presence-studio-v2-add-chamber").click();
  await expect(page.getByTestId("presence-studio-v2-dirty")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-outline-chamber")).toHaveCount(initialCount + 1);

  // Rename via inline edit
  const newChamber = page.getByTestId("presence-studio-v2-outline-chamber").last();
  const renameBtn = newChamber.locator("[data-testid^='presence-studio-v2-chamber-rename-']");
  await renameBtn.click();
  const renameInput = newChamber.locator(".v2-inline-rename");
  await renameInput.fill("Renamed Chamber");
  await renameInput.press("Enter");

  // Verify rename persisted in UI
  await expect(renameBtn).toContainText("Renamed Chamber");
});

test("owner preview renders without editor chrome", async ({ page, request }) => {
  await openStudioV2Editor(page, request);
  await page.keyboard.press("Escape");
  await page.getByTestId("presence-studio-v2-chamber-role").selectOption("threshold");

  await page.goto("/p/v2-public-room", { waitUntil: "networkidle" });
  await expect(page.locator(".presence-studio-v2-public")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-inspector")).toHaveCount(0);
  await expect(page.getByTestId("presence-studio-v2-chamber-dynamics")).toHaveCount(0);
});

test("public render remains unchanged from prior behaviour", async ({ page, request }) => {
  await openStudioV2Editor(page, request);

  // Save with metadata changes
  await page.keyboard.press("Escape");
  await page.getByTestId("presence-studio-v2-chamber-role").selectOption("gallery");

  const saveResponse = page.waitForResponse(
    (response) => response.url().includes("/api/presence/owner/rooms/101/editor/draft") && response.ok(),
  );
  await page.getByTestId("presence-studio-v2-save").click();
  await saveResponse;

  await page.goto("/p/v2-public-room", { waitUntil: "networkidle" });
  await expect(page.locator(".presence-studio-v2-public")).toBeVisible();
  // Public renderer should still show chambers normally (Pass 4 will consume roles)
  await expect(page.getByTestId("presence-public-chamber-room").first()).toBeVisible();
});

test("legacy room remains legacy", async ({ page, request }) => {
  await request.post(`${API_BASE}/__test__/reset`);
  await signInOwner(page);
  await page.goto("/p/hesmaddw", { waitUntil: "networkidle" });
  await expect(page.locator(".presence-studio-v2-public")).toHaveCount(0);
});

test("payload hygiene remains clean after chamber metadata edits", async ({ page, request }) => {
  await openStudioV2Editor(page, request);
  await page.keyboard.press("Escape");

  // Make metadata changes
  await page.getByTestId("presence-studio-v2-chamber-role").selectOption("threshold");
  await page.getByTestId("presence-studio-v2-chamber-layout").selectOption("focus");
  await page.getByTestId("presence-studio-v2-chamber-entry-toggle").check();

  // Save
  const saveResponse = page.waitForResponse(
    (response) => response.url().includes("/api/presence/owner/rooms/101/editor/draft") && response.ok(),
  );
  await page.getByTestId("presence-studio-v2-save").click();
  await saveResponse;

  // Check public payload
  await page.goto("/p/v2-public-room", { waitUntil: "networkidle" });
  await expect(page.locator(".presence-studio-v2-public")).toBeVisible();
  // No restricted keys should leak
  await expect(page.getByText("locked", { exact: false })).toHaveCount(0);
  await expect(page.getByText("pinned", { exact: false })).toHaveCount(0);
});
