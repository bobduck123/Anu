import { mkdirSync } from "node:fs";
import { expect, test, type APIRequestContext, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";
const evidenceDir = "docs/program/evidence/presence-studio-v3-p1-foundation/screenshots";
mkdirSync(evidenceDir, { recursive: true });
const forbiddenWritePatterns = [
  /\/api\/presence\/owner\/rooms\/29\/editor\/draft/,
  /\/api\/presence\/owner\/rooms\/29\/editor\/preview/,
  /\/api\/presence\/owner\/rooms\/29\/editor\/publish/,
  /\/api\/presence\/owner\/rooms\/29\/editor\/rollback/,
];

const allowedWritePatterns = [/^\/__test__\//];

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
  await page.goto("/p/bbbvision", { waitUntil: "networkidle" });
  await expect(page.getByText("bbb.vision").first()).toBeVisible();
  await expect(page.getByTestId("presence-studio-v3-shell")).toHaveCount(0);
  await expect(page.locator("main").first()).toContainText("bbb.vision");
  return {
    title: await page.getByText("bbb.vision").first().innerText(),
    bodyText: await page.locator("main").first().innerText(),
    studioV3Visible: await page.getByTestId("presence-studio-v3-shell").count(),
  };
}

async function expectUndefinedBridgeSpaceDoesNotActivateCanvas(page: Page) {
  await page.goto("/p/bbbvision", { waitUntil: "networkidle" });
  if (await page.getByTestId("presence-public-bbbvision-enter").count() === 0) return;
  await page.getByTestId("presence-public-bbbvision-enter").click();
  await expect(page.getByTestId("presence-public-bbbvision-gallery")).toBeVisible();
  await page.getByTestId("presence-public-bbbvision-constellation").focus();
  await page.keyboard.press("Space");
  await expect(page.getByTestId("presence-public-bbbvision-focus")).toHaveCount(0);
  await expect(page.getByTestId("presence-public-artwork-focus")).toHaveCount(0);
}

async function expectNoForbiddenWrites(request: APIRequestContext) {
  const requestLog = await (await request.get(`${API_BASE}/__test__/requests`)).json() as {
    requests: Array<{ method: string; path: string }>;
  };
  const forbidden = requestLog.requests.filter((entry) => {
    if (entry.method === "GET") return false;
    if (allowedWritePatterns.some((pattern) => pattern.test(entry.path))) return false;
    return true;
  });
  expect(forbidden.filter((entry) => forbiddenWritePatterns.some((pattern) => pattern.test(entry.path)))).toEqual([]);
  expect(forbidden).toEqual([]);
}

test("Studio V3 local changes do not alter BBB public output or public routes", async ({ page, request }) => {
  await signInOwnerAndEnableV3(page, request);

  await expectUndefinedBridgeSpaceDoesNotActivateCanvas(page);
  const before = await publicSignature(page);
  await page.screenshot({ path: `${evidenceDir}/00-public-before-p1-local-flow.png`, fullPage: true });

  await page.goto("/");
  await enableOwnerAccess(page);
  await page.goto("/studio/29/editor", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("presence-studio-v3-shell")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Home" }).click();
  await page.getByTestId("presence-studio-v3-shelf-trigger").click();
  await page.getByTestId("presence-studio-v3-place-piece").click();
  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-apply-soft-editorial").click();
  await page.getByTestId("presence-studio-v3-test-visitor").click();
  await expect(page.locator(".presence-studio-v2-public").first()).toBeVisible();
  await expect(page.locator(".studio-v3-topbar")).toHaveCount(0);
  await expect(page.locator(".studio-v3-action-bar")).toHaveCount(0);
  await expect(page.locator(".studio-v3-sheet")).toHaveCount(0);
  await expect(page.locator(".studio-v3-local-flag")).toHaveCount(0);
  await expect(page.getByTestId("presence-studio-v3-back-to-editor")).toBeVisible();
  await page.getByTestId("presence-studio-v3-back-to-editor").click();
  await expect(page.getByTestId("presence-studio-v3-shelf-trigger")).toBeVisible();
  await page.getByTestId("presence-studio-v3-test-visitor").click();
  await page.screenshot({ path: `${evidenceDir}/00-p0-regression-test-as-visitor.png`, fullPage: true });

  const after = await publicSignature(page);
  expect(after).toEqual(before);
  await page.screenshot({ path: `${evidenceDir}/14-public-p-bbbvision-unchanged.png`, fullPage: true });
  const publicApiText = await (await request.get(`${API_BASE}/api/presence/public/bbbvision`)).text();
  expect(publicApiText).not.toContain("owner_user_id");
  expect(publicApiText).not.toContain("work:");
  expect(publicApiText).not.toContain("collection:");
  expect(publicApiText).not.toContain("preview_expires_at");

  const legacyResponse = await page.goto("/presence/bbbvision", { waitUntil: "networkidle" });
  expect(legacyResponse?.status()).toBe(200);
  await expect(page.getByText("bbb.vision").first()).toBeVisible();
  await expect(page.getByTestId("presence-studio-v3-shell")).toHaveCount(0);
  await page.screenshot({ path: `${evidenceDir}/15-public-presence-bbbvision-unchanged.png`, fullPage: true });
  await expectNoForbiddenWrites(request);
});

test("no-bridge V2 rendering ignores P1 Film Strip layouts and experience facets", async ({ page, request }) => {
  await signInOwnerAndEnableV3(page, request);
  await page.goto("/studio/29/editor", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v3-shell")).toBeVisible();
  await page.getByRole("button", { name: "Home" }).click();

  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-look-option-zine-archive").click();
  await page.getByTestId("presence-studio-v3-room-style-film-strip-selected-works").click();
  await page.getByTestId("presence-studio-v3-structural-apply").click();
  await page.getByRole("button", { name: "Close sheet" }).click();

  const editorRoot = page.locator(".presence-studio-v2-public").first();
  await expect(editorRoot).toHaveAttribute("data-experience-density", "dense");
  await expect(editorRoot).toHaveClass(/experience-density-dense/);
  await expect(page.getByTestId("presence-public-film-strip")).toBeVisible();

  await page.getByTestId("presence-studio-v3-test-visitor").click();
  const visitorRoot = page.locator(".presence-studio-v2-public").first();
  await expect(visitorRoot).not.toHaveAttribute("data-experience-density", /.+/);
  await expect(visitorRoot).not.toHaveAttribute("data-experience-atmosphere", /.+/);
  await expect(visitorRoot).not.toHaveAttribute("data-experience-piece-treatment", /.+/);
  await expect(visitorRoot).not.toHaveAttribute("data-experience-journey", /.+/);
  await expect(visitorRoot).not.toHaveClass(/experience-(density|atmosphere|piece|journey)-/);
  await expect(page.getByTestId("presence-public-film-strip")).toHaveCount(0);
  await expect(visitorRoot.locator(".v2-public-layout.layout-gallery-wall").first()).toBeVisible();
  await expect(visitorRoot.locator(".v2-public-layout.layout-film-strip-selected-works")).toHaveCount(0);

  await page.getByTestId("presence-studio-v3-back-to-editor").click();
  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-look-option-nocturnal-gallery").click();
  await page.getByRole("button", { name: "Close sheet" }).click();
  await page.getByTestId("presence-public-bbbvision-enter").click();
  await expect(page.getByTestId("presence-public-bbbvision-gallery")).toBeVisible();
  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-room-style-film-strip-selected-works").click();
  await page.getByTestId("presence-studio-v3-structural-apply").click();
  await page.getByRole("button", { name: "Close sheet" }).click();
  await expect(page.getByTestId("presence-public-style-bbbvision-threshold-gallery")).toHaveAttribute(
    "data-experience-density",
    "focused",
  );
  await expect(page.getByTestId("presence-public-film-strip")).toBeVisible();

  await page.getByTestId("presence-studio-v3-test-visitor").click();
  const bbbVisitorRoot = page.getByTestId("presence-public-style-bbbvision-threshold-gallery");
  await expect(bbbVisitorRoot).not.toHaveAttribute("data-experience-density", /.+/);
  await expect(bbbVisitorRoot).not.toHaveClass(/experience-density-/);
  await expect(page.getByTestId("presence-public-film-strip")).toHaveCount(0);
  await expectNoForbiddenWrites(request);
});
