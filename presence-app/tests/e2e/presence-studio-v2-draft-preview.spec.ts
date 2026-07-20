import { expect, test, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";

const restrictedPreviewTerms = [
  "style_dna",
  "scene_config",
  "motion_config",
  "asset_config",
  "content_config",
  "roomkey_config",
  "enquiry_config",
  "editable_config",
  "hiddenpublic",
  "hiddenmobile",
  "wild transform suspended",
  "localstorage",
  "templatekit",
  "v2-toolbar",
  "v2-side-panel",
  "v2-float",
  "v2-obj-badge",
];
const restrictedPreviewWords = ["locked", "pinned"];

async function signInOwner(page: Page) {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.setItem("presence:e2e:access_token", "owner-test-token"));
}

test.beforeEach(async ({ request }) => {
  await request.post(`${API_BASE}/__test__/reset`);
});

test("owner draft preview renders V2 drafts through the sanitized public V2 renderer", async ({ page, request }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  const stateResponse = await request.post(`${API_BASE}/__test__/state`, {
    data: { useStudioV2DraftPreview: true },
  });
  expect(stateResponse.ok()).toBeTruthy();
  const statePayload = await stateResponse.json();
  expect(statePayload.state.editorDraftRenderer).toBe("presence-studio-v2-room");
  expect(statePayload.state.editorDraftTitle).toBe("Mara Vale Studio V2 Draft");
  await signInOwner(page);

  await page.goto("/studio/101/editor/preview", { waitUntil: "networkidle" });

  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByText("Draft preview - only you can see this")).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".presence-studio-v2-public")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Mara Vale Studio V2 Draft").first()).toBeVisible();
  await expect(page.getByText("Current Works").first()).toBeVisible();
  await expect(page.locator(".v2-public-object").getByRole("heading", { name: "Bridle Road, after rain" })).toBeVisible();
  await expect(page.locator(".v2-public-object").getByRole("heading", { name: "Desktop-only proof" })).toBeVisible();
  await expect(page.getByText("Creek road after 4pm")).toBeVisible();
  await expect(page.getByText("Demo traces")).toBeVisible();

  await expect(page.getByText("Private install note")).toHaveCount(0);
  await expect(page.locator(".v2-toolbar")).toHaveCount(0);
  await expect(page.locator(".v2-side-panel")).toHaveCount(0);
  await expect(page.locator(".v2-float")).toHaveCount(0);
  await expect(page.locator(".v2-obj-badge")).toHaveCount(0);

  const html = (await page.content()).toLowerCase();
  for (const term of restrictedPreviewTerms) {
    expect(html, `draft preview exposed ${term}`).not.toContain(term);
  }
  for (const term of restrictedPreviewWords) {
    expect(html, `draft preview exposed ${term}`).not.toMatch(new RegExp(`\\b${term}\\b`));
  }
  expect(runtimeErrors).toEqual([]);
});

test("legacy owner draft preview remains on the existing renderer path when V2 payload is absent", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await signInOwner(page);

  await page.goto("/studio/101/editor/preview", { waitUntil: "networkidle" });

  await expect(page.getByText("Draft preview - only you can see this")).toBeVisible();
  await expect(page.getByText("Mara Vale Test Room").first()).toBeVisible();
  await expect(page.locator(".presence-studio-v2-public")).toHaveCount(0);
  expect(runtimeErrors).toEqual([]);
});

function collectRuntimeErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error" && !text.includes("Failed to load resource: net::ERR_NAME_NOT_RESOLVED")) {
      errors.push(text);
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}
