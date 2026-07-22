import { mkdirSync } from "node:fs";
import { expect, test, type APIRequestContext, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";
const evidenceDir = "docs/program/evidence/presence-studio-v3-m1-functional-editing/screenshots";
mkdirSync(evidenceDir, { recursive: true });

const forbiddenWritePatterns = [
  /\/api\/presence\/owner\/rooms\/29\/editor\/(?:draft|preview|publish|rollback)/,
  /\/api\/presence\/owner\/nodes\/29\/(?:works|collections|media)/,
];

async function signInOwnerAndEnableV3(page: Page, request: APIRequestContext) {
  await request.post(`${API_BASE}/__test__/reset`);
  await page.goto("/");
  await enableOwnerAccess(page);
}

async function enableOwnerAccess(page: Page) {
  await page.evaluate(() => {
    window.localStorage.setItem("presence:e2e:access_token", "owner-test-token");
    window.localStorage.setItem("presence-studio-v3:bbb-pilot", "1");
  });
}

async function publicSignature(page: Page) {
  await page.evaluate(() => {
    window.localStorage.setItem("presence-onboarded:gallery-bbbvision", "1");
  });
  await page.goto("/p/bbbvision", { waitUntil: "networkidle" });
  await expect(page.getByText("bbb.vision").first()).toBeVisible();
  await expect(page.getByTestId("presence-studio-v3-shell")).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "Room navigation hints" })).toHaveCount(0);
  const root = page.locator("main").first();
  return {
    title: await page.getByText("bbb.vision").first().innerText(),
    bodyText: await root.innerText(),
    html: await root.innerHTML(),
    studioV3Visible: await page.getByTestId("presence-studio-v3-shell").count(),
  };
}

async function expectOnlyPrivateV3Writes(request: APIRequestContext, expectedCount: number) {
  const payload = await (await request.get(`${API_BASE}/__test__/requests`)).json() as {
    requests: Array<{ method: string; path: string; body?: unknown }>;
  };
  const writes = payload.requests.filter((entry) => entry.method !== "GET");
  expect(writes.filter((entry) => forbiddenWritePatterns.some((pattern) => pattern.test(entry.path)))).toEqual([]);
  expect(writes).toHaveLength(expectedCount);
  for (const write of writes) {
    expect({ method: write.method, path: write.path }).toEqual({
      method: "PUT",
      path: "/api/presence/owner/rooms/29/editor/v3/state",
    });
  }
}

test("M1 private edits and Test as visitor leave both BBB public routes and payload unchanged", async ({ page, request }) => {
  await signInOwnerAndEnableV3(page, request);
  const before = await publicSignature(page);

  await page.goto("/");
  await enableOwnerAccess(page);
  await page.goto("/studio/29/editor", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v3-shell")).toBeVisible();
  await page.getByRole("button", { name: "Studio Home" }).click();

  await page.getByTestId("presence-studio-v3-shelf-trigger").click();
  const noteCard = page.locator(".studio-v3-library-sections section")
    .filter({ hasText: "Room-native BBB Pieces" })
    .locator(".studio-v3-library-card")
    .filter({ hasText: "Editable practice note" })
    .first();
  await noteCard.getByRole("button", { name: "Inspect / edit" }).click();
  await page.getByTestId("presence-studio-v3-edit-action").click();
  await page.getByTestId("presence-studio-v3-piece-title").fill("Private M1 visitor rehearsal");
  await page.getByTestId("presence-studio-v3-piece-body").fill("This copy is visible only in the owner rehearsal until publish is separately approved.");
  await page.getByTestId("presence-studio-v3-piece-done").click();

  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-facet-background-night").click();
  await page.getByTestId("presence-studio-v3-facet-treatment-luminous").click();
  await page.getByRole("button", { name: "Close sheet" }).click();
  await page.getByTestId("presence-studio-v3-save-private-state").click();
  await expect(page.getByTestId("presence-studio-v3-save-status")).toHaveAttribute("data-save-phase", "saved");

  await page.getByTestId("presence-studio-v3-test-visitor").click();
  await page.getByTestId("presence-public-bbbvision-enter").click();
  await expect(page.getByTestId("presence-public-bbbvision-gallery")).toBeVisible();
  await page.getByTestId("presence-public-bbbvision-practice-link").click();
  const practice = page.getByTestId("presence-public-bbbvision-practice");
  await expect(practice).toBeVisible();
  await expect(practice).toHaveCSS("opacity", "1");
  const rehearsal = practice.getByText("Private M1 visitor rehearsal", { exact: false });
  await expect(rehearsal).toBeVisible();
  await rehearsal.scrollIntoViewIfNeeded();
  await expect(page.locator(".studio-v3-topbar, .studio-v3-action-bar, .studio-v3-sheet, .studio-v3-local-flag")).toHaveCount(0);
  await expect(page.getByTestId("presence-studio-v3-back-to-editor")).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/16-test-as-visitor-after-edits.png`, fullPage: true });

  const after = await publicSignature(page);
  expect(after).toEqual(before);
  await page.screenshot({ path: `${evidenceDir}/17-public-p-bbbvision-unchanged.png`, fullPage: true });
  const publicApiText = await (await request.get(`${API_BASE}/api/presence/public/bbbvision`)).text();
  expect(publicApiText).not.toContain("owner_user_id");
  expect(publicApiText).not.toContain("object_edits");
  expect(publicApiText).not.toContain("layer_values");
  expect(publicApiText).not.toContain("mediaId");
  expect(publicApiText).not.toContain("Private M1 visitor rehearsal");

  const legacyResponse = await page.goto("/presence/bbbvision", { waitUntil: "networkidle" });
  expect(legacyResponse?.status()).toBe(200);
  await expect(page.getByText("bbb.vision").first()).toBeVisible();
  await expect(page.getByTestId("presence-studio-v3-shell")).toHaveCount(0);
  await expect(page.locator("main").first()).not.toContainText("Private M1 visitor rehearsal");
  await page.screenshot({ path: `${evidenceDir}/18-public-presence-bbbvision-unchanged.png`, fullPage: true });
  await expectOnlyPrivateV3Writes(request, 1);
});

test("bridge-free Test as visitor preserves current M1 visuals without editor state", async ({ page, request }) => {
  await signInOwnerAndEnableV3(page, request);
  await page.goto("/studio/29/editor", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v3-shell")).toBeVisible();
  await page.getByRole("button", { name: "Studio Home" }).click();

  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-look-option-zine-archive").click();
  await page.getByTestId("presence-studio-v3-facet-background-ledger").click();
  await page.getByTestId("presence-studio-v3-facet-treatment-captioned").click();
  await page.getByTestId("presence-studio-v3-room-style-film-strip-selected-works").click();
  await page.getByTestId("presence-studio-v3-structural-apply").click();
  await page.getByRole("button", { name: "Close sheet" }).click();

  const editorRoot = page.locator(".presence-studio-v2-public").first();
  await expect(editorRoot).toHaveAttribute("data-experience-atmosphere", "ledger-scan");
  await expect(editorRoot).toHaveAttribute("data-experience-piece-treatment", "captioned-ledger");
  await expect(page.getByTestId("presence-public-film-strip")).toBeVisible();

  await page.getByTestId("presence-studio-v3-test-visitor").click();
  const visitorRoot = page.locator(".presence-studio-v2-public").first();
  await expect(visitorRoot).toHaveAttribute("data-experience-atmosphere", "ledger-scan");
  await expect(visitorRoot).toHaveAttribute("data-experience-piece-treatment", "captioned-ledger");
  await expect(visitorRoot).toHaveClass(/experience-atmosphere-ledger-scan/);
  await expect(visitorRoot).toHaveClass(/experience-piece-captioned-ledger/);
  await expect(page.getByTestId("presence-public-film-strip")).toBeVisible();
  await expect(page.locator(".studio-v3-topbar, .studio-v3-action-bar, .studio-v3-sheet, .studio-v3-local-flag")).toHaveCount(0);
  await expectOnlyPrivateV3Writes(request, 0);
});
