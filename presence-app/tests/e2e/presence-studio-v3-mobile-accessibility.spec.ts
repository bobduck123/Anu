import { mkdirSync } from "node:fs";
import { expect, test, type APIRequestContext, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";
const evidenceDir = "docs/program/evidence/presence-studio-v3-p1-foundation/screenshots";
mkdirSync(evidenceDir, { recursive: true });
const allowedWritePatterns = [/^\/__test__\//];

async function signInOwnerAndEnableV3(page: Page, request: APIRequestContext) {
  await request.post(`${API_BASE}/__test__/reset`);
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.setItem("presence:e2e:access_token", "owner-test-token");
    window.localStorage.setItem("presence-studio-v3:bbb-pilot", "1");
  });
}

test("Studio V3 local prototype remains usable on mobile and exposes keyboard-accessible core controls", async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInOwnerAndEnableV3(page, request);

  await page.goto("/studio/29/editor", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v3-shell")).toBeVisible();
  await expect(page.getByRole("button", { name: "Home" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pieces" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Look" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Visitor Preview" })).toBeDisabled();
  await page.screenshot({ path: `${evidenceDir}/00-p0-regression-mobile-home.png`, fullPage: true });

  await page.getByRole("button", { name: "Pieces" }).focus();
  await expect(page.getByRole("button", { name: "Pieces" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("presence-studio-v3-piece-shelf")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v3-bottom-sheet")).toHaveAttribute("aria-label", "Studio V3 bottom sheet");

  await page.getByTestId("presence-studio-v3-place-piece").click();
  await expect(page.getByTestId("presence-studio-v3-placement-summary")).toContainText("1 placed");
  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-apply-soft-editorial").click();
  await expect(page.getByText("Soft Editorial applied locally")).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/00-p0-regression-mobile-sheet.png`, fullPage: true });

  await page.getByTestId("presence-studio-v3-test-visitor").click();
  await expect(page.locator(".presence-studio-v2-public").first()).toBeVisible();
  await expect(page.getByTestId("presence-studio-v3-bottom-sheet")).toHaveCount(0);
  await expect(page.locator(".studio-v3-topbar")).toHaveCount(0);
  await page.screenshot({ path: `${evidenceDir}/00-p0-regression-mobile-test-as-visitor.png`, fullPage: true });
  await page.getByTestId("presence-studio-v3-back-to-editor").click();
  await expect(page.getByRole("button", { name: "Pieces" })).toBeVisible();

  const requestLog = await (await request.get(`${API_BASE}/__test__/requests`)).json() as {
    requests: Array<{ method: string; path: string }>;
  };
  const unexpectedWrites = requestLog.requests.filter((entry) => (
    entry.method !== "GET" && !allowedWritePatterns.some((pattern) => pattern.test(entry.path))
  ));
  expect(unexpectedWrites).toEqual([]);
});

test("P1 Look and Film Strip controls remain canvas-primary, reduced-motion-safe, and editor-scoped in visitor mode", async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signInOwnerAndEnableV3(page, request);
  await page.goto("/studio/29/editor", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Home" }).click();
  await page.getByTestId("presence-studio-v3-look-trigger").click();

  await page.getByTestId("presence-studio-v3-look-option-zine-archive").click();
  await expect(page.getByText("Zine Archive applied locally")).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/11-mobile-zine-archive-look.png`, fullPage: true });

  await page.getByTestId("presence-studio-v3-room-style-film-strip-selected-works").click();
  await expect(page.getByTestId("presence-studio-v3-structural-preview")).toContainText("Previewing");
  await page.getByTestId("presence-studio-v3-structural-apply").click();
  await page.getByRole("button", { name: "Close sheet" }).click();

  const filmStrip = page.getByTestId("presence-public-film-strip");
  await expect(filmStrip).toBeVisible();
  const canvasBox = await page.getByTestId("presence-studio-v3-public-room-canvas").boundingBox();
  expect(canvasBox?.width).toBe(390);

  for (const button of [
    page.getByTestId("presence-public-film-strip-prev"),
    page.getByTestId("presence-public-film-strip-next"),
    page.getByTestId("presence-studio-v3-look-trigger"),
    page.getByTestId("presence-studio-v3-test-visitor"),
  ]) {
    const box = await button.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }

  const progress = page.getByTestId("presence-public-film-strip-progress");
  const initialProgress = await progress.textContent() ?? "";
  await filmStrip.focus();
  await page.keyboard.press("ArrowRight");
  await expect(progress).not.toHaveText(initialProgress);
  await filmStrip.evaluate((element) => {
    const start = new Touch({ identifier: 1, target: element, clientX: 72, clientY: 320 });
    const end = new Touch({ identifier: 1, target: element, clientX: 232, clientY: 324 });
    element.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, changedTouches: [start] }));
    element.dispatchEvent(new TouchEvent("touchend", { bubbles: true, changedTouches: [end] }));
  });
  await expect(progress).toHaveText(initialProgress);
  const stageTransition = await page.locator(".v2-film-strip-stage-track").evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(Number.parseFloat(stageTransition)).toBeLessThanOrEqual(0.001);
  await page.screenshot({ path: `${evidenceDir}/12-mobile-film-strip-selected-works.png`, fullPage: true });

  await page.getByTestId("presence-studio-v3-test-visitor").click();
  await expect(page.getByTestId("presence-public-film-strip")).toHaveCount(0);
  await expect(page.locator(".presence-studio-v2-public").first()).not.toHaveAttribute("data-experience-density", /.+/);
  await expect(page.locator(".presence-studio-v2-public").first()).not.toHaveClass(/experience-density-/);
  await expect(page.locator(".studio-v3-topbar, .studio-v3-action-bar, .studio-v3-sheet, .studio-v3-local-flag")).toHaveCount(0);
  await expect(page.getByTestId("presence-studio-v3-back-to-editor")).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/13-test-as-visitor-after-p1.png`, fullPage: true });

  const requestLog = await (await request.get(`${API_BASE}/__test__/requests`)).json() as {
    requests: Array<{ method: string; path: string }>;
  };
  const unexpectedWrites = requestLog.requests.filter((entry) => (
    entry.method !== "GET" && !allowedWritePatterns.some((pattern) => pattern.test(entry.path))
  ));
  expect(unexpectedWrites).toEqual([]);
});
