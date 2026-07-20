import { expect, test, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";

const restrictedPublicTerms = [
  "style_dna",
  "scene_config",
  "motion_config",
  "asset_config",
  "content_config",
  "roomkey_config",
  "enquiry_config",
  "editable_config",
  "owner_user_id",
  "auth_subject",
  "platform_admin",
  "internal_lifetime_free",
  "preview_token",
  "bearer",
  "service_role",
  "draft_storage_key",
  "signed_url",
  "preview_expires_at",
  "locked",
  "pinned",
  "wild transform suspended",
  "v2-toolbar",
  "v2-side-panel",
  "v2-float",
  "localstorage",
  "/api/presence/owner",
  "private_draft",
  "draft_uploaded",
  "storage_key",
  "templatekit",
  "hiddenpublic",
  "hiddenmobile",
];

test.beforeEach(async ({ request }) => {
  await request.post(`${API_BASE}/__test__/reset`);
});

test("published flagged Studio V2 room renders through public V2 renderer without editor chrome", async ({ page, request }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.goto("/p/v2-public-room", { waitUntil: "networkidle" });

  await expect(page.locator(".presence-studio-v2-public")).toBeVisible();
  await expect(page.getByText("Mara Vale Studio V2").first()).toBeVisible();
  await expect(page.getByText("Current Works").first()).toBeVisible();
  await expect(page.locator(".v2-public-object").getByRole("heading", { name: "Bridle Road, after rain" })).toBeVisible();
  await expect(page.locator(".v2-public-object").getByRole("heading", { name: "Desktop-only proof" })).toBeVisible();
  await expect(page.getByText("Creek road after 4pm")).toBeVisible();
  await expect(page.getByText("Demo traces")).toBeVisible();
  await expect(page.getByText("Request availability").first()).toBeVisible();

  await expect(page.getByText("Private install note")).toHaveCount(0);
  await expect(page.locator(".v2-toolbar")).toHaveCount(0);
  await expect(page.locator(".v2-side-panel")).toHaveCount(0);
  await expect(page.locator(".v2-float")).toHaveCount(0);
  await expect(page.locator(".v2-obj-badge")).toHaveCount(0);

  const html = (await page.content()).toLowerCase();
  for (const term of restrictedPublicTerms) {
    expect(html, `/p/v2-public-room exposed ${term}`).not.toContain(term);
  }

  const aliasResponse = await request.get("/presence/v2-public-room");
  expect(aliasResponse.ok()).toBeTruthy();
  const aliasHtml = (await aliasResponse.text()).toLowerCase();
  expect(aliasHtml).toContain("presence-studio-v2-public");
  expect(aliasHtml).toContain("mara vale studio v2");
  for (const term of restrictedPublicTerms) {
    expect(aliasHtml, `/presence/v2-public-room exposed ${term}`).not.toContain(term);
  }
  expect(runtimeErrors).toEqual([]);
});

test("public V2 renderer hides mobile-muted objects on narrow public viewports", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/p/v2-public-room", { waitUntil: "networkidle" });

  await expect(page.locator(".presence-studio-v2-public")).toBeVisible();
  await expect(page.locator(".v2-public-object").getByRole("heading", { name: "Bridle Road, after rain" })).toBeVisible();
  await expect(page.locator(".v2-public-object").getByRole("heading", { name: "Desktop-only proof" })).toBeHidden();
  expect(runtimeErrors).toEqual([]);
});

test("legacy public room continues through existing renderer when Studio V2 payload is absent", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.goto("/p/test-presence-room", { waitUntil: "networkidle" });

  await expect(page.getByText("Mara Vale Test Room").first()).toBeVisible();
  await expect(page.locator(".presence-studio-v2-public")).toHaveCount(0);
  expect(runtimeErrors).toEqual([]);
});

function collectRuntimeErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("net::ERR_NETWORK_ACCESS_DENIED")) errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}
