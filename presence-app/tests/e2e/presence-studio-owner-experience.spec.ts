import { expect, test, type APIRequestContext, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";
const roomId = 29;
const evidenceDir = "docs/program/evidence/presence-studio-owner-experience-overhaul";

async function openOwnerHome(page: Page, request: APIRequestContext) {
  await request.post(`${API_BASE}/__test__/reset`);
  await page.goto("/");
  await page.evaluate(() => window.localStorage.setItem("presence:e2e:access_token", "owner-test-token"));
  await page.goto(`/studio/${roomId}`, { waitUntil: "networkidle" });
}

test("BBB owner can understand the guided Studio flow without publishing or changing public output", async ({ page, request }) => {
  const publishRequests: string[] = [];
  page.on("request", (outgoing) => {
    if (outgoing.url().includes(`/rooms/${roomId}/editor/publish`)) publishRequests.push(outgoing.url());
  });

  await openOwnerHome(page, request);

  await expect(page.getByRole("heading", { name: "bbb.vision" }).first()).toBeVisible();
  await expect(page.getByText("Your digital home")).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit my Presence" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Preview as visitor" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Publish update" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Unpublish" })).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/01-new-studio-home.png`, fullPage: true });

  await page.getByRole("link", { name: "Edit my Presence" }).click();
  await expect(page).toHaveURL(new RegExp(`/studio/${roomId}/editor\\?step=rooms`));
  await expect(page.getByTestId("presence-studio-owner-journey")).toBeVisible();
  await expect(page.getByTestId("presence-studio-owner-rooms")).toBeVisible();
  await expect(page.getByText("Rooms inside bbb.vision")).toBeVisible();
  await expect(page.getByRole("button", { name: /Arrange this room/ }).first()).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/02-guided-owner-shell.png`, fullPage: true });
  await page.getByTestId("presence-studio-owner-rooms").screenshot({ path: `${evidenceDir}/03-rooms-step.png` });

  await page.getByTestId("presence-studio-owner-step-arrange").click();
  await expect(page.getByTestId("presence-studio-v2-layout-zone").first()).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-layout-composer")).toBeVisible();
  await expect(page.getByText("Arrangement", { exact: true })).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/04-arrange-step.png`, fullPage: true });

  await page.getByTestId("presence-studio-v2-outline-object").first().click();
  await expect(page.getByTestId("presence-studio-v2-placement-controls")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-placement-zone")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-placement-size")).toBeVisible();
  await page.getByTestId("presence-studio-v2-inspector").screenshot({ path: `${evidenceDir}/05-selected-piece-controls.png` });

  await page.getByTestId("presence-studio-owner-step-style").click();
  await expect(page.getByTestId("presence-studio-owner-style")).toBeVisible();
  await expect(page.getByTestId("presence-studio-look-mood")).toBeVisible();
  await expect(page.getByTestId("presence-studio-look-background")).toBeVisible();
  await expect(page.getByTestId("presence-studio-look-texture")).toBeVisible();
  await expect(page.getByTestId("presence-studio-look-motion")).toBeVisible();
  await expect(page.getByTestId("presence-studio-look-density")).toBeVisible();
  await expect(page.getByTestId("presence-studio-look-accent")).toBeVisible();
  await page.getByRole("button", { name: "Accent #ff6b9d" }).click();
  await expect(page.getByTestId("presence-studio-v2-dirty")).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/06-look-and-feel.png`, fullPage: true });

  await page.getByTestId("presence-studio-owner-step-preview").click();
  await expect(page.getByTestId("presence-studio-owner-preview")).toBeVisible();
  await expect(page.getByText("Editor controls, private pieces, and owner notes are not included.")).toBeVisible();
  await expect(page.getByTestId("presence-studio-owner-preview-blocked")).toBeVisible();
  await expect(page.getByTestId("presence-studio-owner-open-preview")).toHaveCount(0);
  await page.getByTestId("presence-studio-v2-save").click();
  await expect(page.getByTestId("presence-studio-v2-save")).toBeDisabled({ timeout: 15000 });
  await expect(page.getByTestId("presence-studio-owner-open-preview")).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/07-visitor-preview-step.png`, fullPage: true });
  await page.getByTestId("presence-studio-owner-open-preview").click();
  await expect(page).toHaveURL(new RegExp(`/studio/${roomId}/editor/preview`));
  await expect(page.getByTestId("visitor-preview-boundary")).toContainText("Visitor Preview");
  await expect(page.locator(".presence-studio-v2-public")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-inspector")).toHaveCount(0);
  await expect(page.getByTestId("presence-studio-owner-journey")).toHaveCount(0);
  await page.screenshot({ path: `${evidenceDir}/08-visitor-preview-clean.png`, fullPage: true });

  await page.getByRole("link", { name: "Back to Studio" }).click();
  await expect(page.getByTestId("presence-studio-owner-journey")).toBeVisible();
  await page.getByTestId("presence-studio-owner-step-publish").click();
  await expect(page.getByTestId("presence-studio-owner-publish")).toBeVisible();
  await expect(page.getByText("Public page has content")).toBeVisible();
  await expect(page.getByText("Mobile view checked")).toBeVisible();
  await expect(page.getByText("No private pieces visible")).toBeVisible();
  await expect(page.getByText("Rollback available")).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/09-publish-review.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId("presence-studio-owner-step-rooms").click();
  await expect(page.getByTestId("presence-studio-owner-rooms")).toBeVisible();
  await page.getByTestId("presence-studio-owner-step-arrange").click();
  await expect(page.getByTestId("presence-studio-v2-chamber-tabs")).toBeVisible();
  await page.getByTestId("presence-studio-v2-outline-object").first().click();
  await expect(page.getByTestId("presence-studio-v2-placement-controls")).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/10-mobile-owner-studio.png`, fullPage: true });

  await page.setViewportSize({ width: 1440, height: 1000 });
  const publicResponse = await page.goto("/p/bbbvision", { waitUntil: "networkidle" });
  expect(publicResponse?.status()).toBe(200);
  await expect(page.getByText("bbb.vision").first()).toBeVisible();
  await expect(page.getByTestId("presence-studio-owner-journey")).toHaveCount(0);
  await expect(page.getByTestId("presence-studio-v2-inspector")).toHaveCount(0);
  await page.screenshot({ path: `${evidenceDir}/11-bbb-public-unchanged.png`, fullPage: true });

  const requestLog = await (await request.get(`${API_BASE}/__test__/requests`)).json() as {
    requests: Array<{ method: string; path: string }>;
  };
  expect(publishRequests).toEqual([]);
  expect(requestLog.requests.some((entry) => entry.path.includes("/editor/publish"))).toBe(false);
});
