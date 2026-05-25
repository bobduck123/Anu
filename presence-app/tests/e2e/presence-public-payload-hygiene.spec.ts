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
