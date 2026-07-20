import { expect, test, type APIRequestContext, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";
const roomId = 11;

async function openStudio(page: Page, request: APIRequestContext) {
  await request.post(`${API_BASE}/__test__/reset`);
  await request.post(`${API_BASE}/__test__/state`, { data: { useGgmPrivateProof: true } });
  await page.goto("/");
  await page.evaluate(() => window.localStorage.setItem("presence:e2e:access_token", "owner-test-token"));
  await page.goto(`/studio/${roomId}/editor`, { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible();
}

test("registered Gallery Wall zones and safe placement controls remain available", async ({ page, request }) => {
  await openStudio(page, request);
  await expect(page.getByTestId("presence-studio-v2-layout-label").first()).toContainText("Gallery wall");
  await expect(page.getByTestId("presence-studio-v2-layout-zone").first()).toBeVisible();
  await page.getByTestId("presence-studio-v2-outline-object").filter({ hasText: "Private install note" }).click();
  await expect(page.getByTestId("presence-studio-v2-placement-controls")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-placement-zone")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-placement-size")).toBeVisible();
});

test("layout selection changes the room contract without a parallel preview renderer", async ({ page, request }) => {
  await openStudio(page, request);
  await page.getByTestId("presence-studio-v2-layout-select").selectOption("portal-threshold");
  await expect(page.getByTestId("presence-studio-v2-layout-label").first()).toContainText("Portal threshold");
  await page.goto(`/studio/${roomId}/editor/preview`, { waitUntil: "networkidle" });
  await expect(page.locator(".presence-studio-v2-public .v2-public-layout.layout-portal-threshold")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-inspector")).toHaveCount(0);
});
