import { expect, test, type APIRequestContext, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";
const evidenceDir = "docs/program/evidence/presence-studio-v3-p0-prototype/screenshots";
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

test("BBB local Studio V3 prototype loads, places Pieces, edits Looks, and stays browser-local", async ({ page, request }) => {
  await signInOwnerAndEnableV3(page, request);

  await page.goto("/studio/29/editor", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v3-shell")).toBeVisible();
  await expect(page.getByRole("button", { name: "Visitor Preview" })).toBeDisabled();
  await expect(page.getByText("browser-local")).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/01-studio-v3-home-local.png`, fullPage: true });

  await page.getByRole("button", { name: "Home" }).click();
  await expect(page.getByTestId("presence-public-bbbvision-threshold")).toBeVisible();
  await page.getByTestId("presence-public-bbbvision-enter").click();
  await expect(page.getByTestId("presence-public-bbbvision-threshold")).toBeVisible();
  await expect(page.getByText(/Selected Room/)).toBeVisible();
  const thresholdDots = page.locator(".v2-bbb-dot-nav button");
  if (await thresholdDots.count() > 1) {
    await thresholdDots.nth(1).click();
    await expect(page.getByText("Visitor chrome suppressed in editor")).toBeVisible();
  }
  await page.getByTestId("presence-studio-v3-shelf-trigger").click();
  await expect(page.getByTestId("presence-studio-v3-piece-shelf")).toBeVisible();
  await page.getByTestId("presence-studio-v3-place-piece").click();
  await expect(page.getByTestId("presence-studio-v3-placement-summary")).toContainText("1 placed");
  await page.getByTestId("presence-studio-v3-place-collection").click();
  await expect(page.getByTestId("presence-studio-v3-placement-summary")).toContainText("duplicate");

  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-apply-soft-editorial").click();
  await expect(page.getByText("Soft Editorial applied locally")).toBeVisible();
  await page.getByRole("button", { name: "Close sheet" }).click();
  const galleryRoomLinks = page.locator(".v2-public-threshold-index a[href^='#v2-public-room-']", { hasText: "Gallery" });
  const genericRoomLink = await galleryRoomLinks.count() > 0
    ? galleryRoomLinks.first()
    : page.locator(".v2-public-threshold-index a[href^='#v2-public-room-']").first();
  await genericRoomLink.click();
  await expect(page.getByText(/Selected Room/)).toBeVisible();
  const placedObject = page.locator("[id^='v2-public-object-studio-v3']").first();
  await expect(placedObject).toBeVisible();
  await placedObject.click();
  await expect(page.getByTestId("presence-studio-v3-action-bar")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v3-more-action")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("presence-studio-v3-action-bar")).toHaveCount(0);
  await placedObject.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("presence-studio-v3-action-bar")).toBeVisible();
  await page.keyboard.press("Escape");
  await placedObject.focus();
  await page.keyboard.press("Space");
  await expect(page.getByTestId("presence-studio-v3-action-bar")).toBeVisible();
  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-lock-layer").click();
  await expect(page.getByText("locked locally")).toBeVisible();
  await page.getByTestId("presence-studio-v3-named-look-name").fill("Owner Soft Editorial");
  await page.getByTestId("presence-studio-v3-save-named-look").click();
  await page.getByTestId("presence-studio-v3-apply-nocturnal-gallery").click();
  await page.getByTestId("presence-studio-v3-restore-named-look").click();
  await expect(page.getByText("Named Look restored locally")).toBeVisible();
  await page.getByTestId("presence-studio-v3-shelf-trigger").click();
  await page.getByTestId("presence-studio-v3-place-piece").click();
  await expect(page.getByTestId("presence-studio-v3-placement-summary")).toContainText("1 placed");
  await expect(page.getByTestId("presence-studio-v3-retained-placements")).toContainText("Retained Pieces");
  await page.screenshot({ path: `${evidenceDir}/02-studio-v3-local-look-loop.png`, fullPage: true });

  await expect.poll(async () => page.evaluate(() => Object.keys(window.localStorage).filter((key) => key.startsWith("presence-studio-v3:prototype")).length)).toBeGreaterThan(0);
  await page.goto("/");
  await enableOwnerAccess(page);
  await page.goto("/studio/29/editor", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("presence-studio-v3-shell")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Restored browser-local changes")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("presence-studio-v3-shelf-trigger").click();
  await expect(page.getByTestId("presence-studio-v3-placement-summary")).toContainText("1 placed");
  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await expect(page.getByText("Owner Soft Editorial")).toBeVisible();
  await expectNoForbiddenWrites(request);
});

test("Studio V3 clears its active local partition and in-memory document on authenticated sign-out", async ({ page, request }) => {
  await signInOwnerAndEnableV3(page, request);
  await page.goto("/studio/29/editor", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v3-shell")).toBeVisible();
  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-apply-soft-editorial").click();
  await expect.poll(async () => page.evaluate(() => Object.keys(window.localStorage)
    .filter((key) => key.startsWith("presence-studio-v3:prototype")).length)).toBeGreaterThan(0);

  await page.evaluate(() => {
    window.localStorage.removeItem("presence:e2e:access_token");
    window.dispatchEvent(new CustomEvent("presence:e2e:auth-state", { detail: { event: "SIGNED_OUT", session: null } }));
  });

  await expect(page.getByText("Sign in required.")).toBeVisible();
  await expect.poll(async () => page.evaluate(() => Object.keys(window.localStorage)
    .filter((key) => key.startsWith("presence-studio-v3:prototype")).length)).toBe(0);
  await expectNoForbiddenWrites(request);
});
