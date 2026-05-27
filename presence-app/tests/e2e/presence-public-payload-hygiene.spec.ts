import { expect, test } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";
const restrictedPublicHtmlTerms = [
  "editable_config",
  "asset_config",
  "content_config",
  "style_dna",
  "motion_config",
  "draft_config",
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
];

test.beforeEach(async ({ request }) => {
  await request.post(`${API_BASE}/__test__/reset`);
});

test("anonymous public room HTML serialises visible room data without internal editor fields", async ({ request }) => {
  for (const route of ["/p/test-presence-room", "/presence/test-presence-room"]) {
    const response = await request.get(route);
    expect(response.ok(), `${route} should render`).toBeTruthy();
    const html = (await response.text()).toLowerCase();
    expect(html).toContain("mara vale test room");
    for (const term of restrictedPublicHtmlTerms) {
      expect(html, `${route} exposed ${term}`).not.toContain(term);
    }
  }
});

test("published room-id entry API and redirected room omit internal editor fields", async ({ page, request }) => {
  const entryResponse = await request.get(`${API_BASE}/api/presence/rooms/101/key-entry`);
  expect(entryResponse.ok()).toBeTruthy();
  const entryPayload = JSON.stringify(await entryResponse.json()).toLowerCase();
  for (const term of restrictedPublicHtmlTerms) {
    expect(entryPayload, `/api/presence/rooms/101/key-entry exposed ${term}`).not.toContain(term);
  }

  await page.goto("/room/101/key", { waitUntil: "networkidle" });
  await expect(page.getByText("Mara Vale Test Room").first()).toBeVisible();
  const html = (await page.content()).toLowerCase();
  for (const term of restrictedPublicHtmlTerms) {
    expect(html, `/room/101/key exposed ${term}`).not.toContain(term);
  }
});
