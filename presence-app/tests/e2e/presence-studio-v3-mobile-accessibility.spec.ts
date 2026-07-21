import { expect, test, type APIRequestContext, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";
const evidenceDir = "docs/program/evidence/presence-studio-v3-p0-prototype/screenshots";
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
  await page.screenshot({ path: `${evidenceDir}/05-mobile-studio-v3-home.png`, fullPage: true });

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
  await page.screenshot({ path: `${evidenceDir}/06-mobile-studio-v3-bottom-sheet.png`, fullPage: true });

  await page.getByTestId("presence-studio-v3-test-visitor").click();
  await expect(page.locator(".presence-studio-v2-public").first()).toBeVisible();
  await expect(page.getByTestId("presence-studio-v3-bottom-sheet")).toHaveCount(0);
  await expect(page.locator(".studio-v3-topbar")).toHaveCount(0);
  await page.screenshot({ path: `${evidenceDir}/07-mobile-test-as-visitor.png`, fullPage: true });
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
