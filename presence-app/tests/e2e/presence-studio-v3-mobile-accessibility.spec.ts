import { mkdirSync } from "node:fs";
import { expect, test, type APIRequestContext, type Locator, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";
const evidenceDir = "docs/program/evidence/presence-studio-v3-m1-functional-editing/screenshots";
mkdirSync(evidenceDir, { recursive: true });
test.use({ hasTouch: true });

async function signInOwnerAndEnableV3(page: Page, request: APIRequestContext) {
  await request.post(`${API_BASE}/__test__/reset`);
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.setItem("presence:e2e:access_token", "owner-test-token");
    window.localStorage.setItem("presence-studio-v3:bbb-pilot", "1");
  });
}

async function openEditor(page: Page) {
  await page.goto("/studio/29/editor", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v3-shell")).toBeVisible();
}

function roomNativeCard(page: Page, title: string): Locator {
  return page.locator(".studio-v3-library-sections section")
    .filter({ hasText: "Room-native BBB Pieces" })
    .locator(".studio-v3-library-card")
    .filter({ hasText: title })
    .first();
}

async function expectZeroProductWrites(request: APIRequestContext) {
  const payload = await (await request.get(`${API_BASE}/__test__/requests`)).json() as {
    requests: Array<{ method: string; path: string }>;
  };
  expect(payload.requests.filter((entry) => entry.method !== "GET")).toEqual([]);
}

test("mobile bottom bar supports tap and keyboard editing/arranging with exact Escape restore and focus return", async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInOwnerAndEnableV3(page, request);
  await openEditor(page);

  await page.getByTestId("presence-studio-v3-shelf-trigger").click();
  await expect(page.getByTestId("presence-studio-v3-bottom-sheet")).toHaveAttribute("aria-label", "Studio V3 bottom sheet");
  const card = roomNativeCard(page, "Editable practice note");
  await card.getByRole("button", { name: "Inspect / edit" }).click();
  const actionBar = page.getByTestId("presence-studio-v3-action-bar");
  await expect(actionBar).toBeVisible();
  await expect(page.getByTestId("presence-public-bbbvision-loader")).toHaveAttribute("data-state", "ready");
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${evidenceDir}/14-mobile-bottom-bar.png` });

  for (const button of [
    page.getByTestId("presence-studio-v3-edit-action"),
    page.getByTestId("presence-studio-v3-arrange-action"),
    page.getByTestId("presence-studio-v3-look-trigger"),
    page.getByTestId("presence-studio-v3-test-visitor"),
  ]) {
    const box = await button.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }

  const editAction = page.getByTestId("presence-studio-v3-edit-action");
  await editAction.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("presence-studio-v3-piece-editor")).toBeVisible();
  await page.getByTestId("presence-studio-v3-piece-title").fill("Mobile private note");
  await page.getByTestId("presence-studio-v3-piece-body").fill("Edited with the mobile sheet and keyboard fallback.");
  await page.screenshot({ path: `${evidenceDir}/15-mobile-edit-flow.png`, fullPage: true });
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("presence-studio-v3-bottom-sheet")).toHaveCount(0);
  await expect(editAction).toBeFocused();

  await editAction.click();
  await expect(page.getByTestId("presence-studio-v3-piece-title")).toHaveValue("Editable practice note");
  await page.getByTestId("presence-studio-v3-piece-cancel").click();

  const arrangeAction = page.getByTestId("presence-studio-v3-arrange-action");
  await arrangeAction.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("presence-studio-v3-arrange-controls")).toBeVisible();
  const enabledZone = page.locator('[data-testid^="presence-studio-v3-zone-"]:not([disabled])').first();
  await expect(enabledZone).toBeVisible();
  await enabledZone.tap();
  await page.getByTestId("presence-studio-v3-move-later").tap();
  await page.getByTestId("presence-studio-v3-toggle-feature").tap();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("presence-studio-v3-bottom-sheet")).toHaveCount(0);
  await expect(arrangeAction).toBeFocused();
  await expect(page.getByTestId("presence-studio-v3-status")).toContainText("exact prior state restored");

  const visitorTrigger = page.getByTestId("presence-studio-v3-test-visitor");
  await visitorTrigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".presence-studio-v2-public").first()).toBeVisible();
  await expect(page.locator(".studio-v3-topbar, .studio-v3-action-bar, .studio-v3-sheet, .studio-v3-local-flag")).toHaveCount(0);
  const visitorExit = page.getByTestId("presence-studio-v3-back-to-editor");
  await expect(visitorExit).toBeVisible();
  await expect(visitorExit).toBeFocused();
  await expect(page.getByTestId("presence-public-bbbvision-threshold")).toBeVisible();
  await page.getByTestId("presence-public-bbbvision-enter").click();
  await expect(page.getByTestId("presence-public-bbbvision-gallery")).toBeVisible();
  await page.getByTestId("presence-public-bbbvision-constellation").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("presence-public-bbbvision-focus")).toBeVisible();
  await visitorExit.focus();
  await page.keyboard.press("Enter");
  await expect(visitorTrigger).toBeFocused();
  await expect(actionBar).toBeVisible();
  await expect(actionBar).toContainText("Editable practice note");
  await expectZeroProductWrites(request);
});

test("mobile visual controls remain reduced-motion-safe and Room Style preview stays editor-scoped", async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signInOwnerAndEnableV3(page, request);
  await openEditor(page);
  await page.getByRole("button", { name: "Studio Home" }).click();
  await page.getByTestId("presence-studio-v3-look-trigger").click();

  await page.getByTestId("presence-studio-v3-look-option-zine-archive").click();
  await expect(page.getByTestId("presence-studio-v3-look-option-zine-archive")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("presence-studio-v3-facet-motion-living").scrollIntoViewIfNeeded();
  await page.getByTestId("presence-studio-v3-facet-motion-living").click();
  await expect(page.getByTestId("presence-studio-v3-facet-motion-living")).toHaveAttribute("aria-pressed", "true");

  await page.getByTestId("presence-studio-v3-room-style-film-strip-selected-works").scrollIntoViewIfNeeded();
  await page.getByTestId("presence-studio-v3-room-style-film-strip-selected-works").click();
  await expect(page.getByTestId("presence-studio-v3-structural-preview")).toContainText("Previewing");
  await page.getByTestId("presence-studio-v3-structural-apply").click();
  await expect(page.getByTestId("presence-public-film-strip")).toBeVisible();
  await page.getByRole("button", { name: "Close sheet" }).click();

  const filmStrip = page.getByTestId("presence-public-film-strip");
  const transition = await page.locator(".v2-film-strip-stage-track").evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(Number.parseFloat(transition)).toBeLessThanOrEqual(0.001);
  const canvasBox = await page.getByTestId("presence-studio-v3-public-room-canvas").boundingBox();
  expect(canvasBox?.width).toBe(390);

  await page.getByTestId("presence-studio-v3-test-visitor").click();
  await expect(page.getByTestId("presence-public-film-strip")).toBeVisible();
  const visitorRoot = page.locator(".presence-studio-v2-public").first();
  await expect(visitorRoot).toHaveAttribute("data-experience-density", /.+/);
  await expect(visitorRoot).toHaveClass(/experience-density-/);
  await expectZeroProductWrites(request);
});
