import { expect, test, type APIRequestContext, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";
const roomId = 11;

async function signInFixtureOwner(page: Page) {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.setItem("presence:e2e:access_token", "owner-test-token"));
}

async function openPrivateStudio(page: Page, request: APIRequestContext) {
  await request.post(`${API_BASE}/__test__/reset`);
  await request.post(`${API_BASE}/__test__/state`, { data: { useGgmPrivateProof: true } });
  await signInFixtureOwner(page);
  await page.goto(`/studio/${roomId}/editor`, { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible();
}

test("environment is a deterministic DOM layer that follows chamber and object focus", async ({ page, request }) => {
  await openPrivateStudio(page, request);
  const environment = page.getByTestId("presence-studio-v2-environment");
  await expect(environment).toHaveAttribute("data-environment-runtime", "dom");
  await expect(environment).toHaveAttribute("data-environment-depth", "3");

  await page.locator(".v2-room").click({ position: { x: 18, y: 18 } });
  await expect(environment).toHaveAttribute("data-environment-camera", "room");

  const tabs = page.getByTestId("presence-studio-v2-chamber-tab");
  await tabs.last().click();
  const chamberId = await tabs.last().evaluate((element) => {
    const target = element as HTMLButtonElement;
    return target.textContent;
  });
  await expect(environment).toHaveAttribute("data-environment-camera", "chamber");
  await expect(environment).toHaveAttribute("data-environment-chamber", /.+/);
  expect(chamberId).toBeTruthy();

  await page.getByTestId("presence-studio-v2-outline-object").filter({ hasText: "Private install note" }).click();
  await expect(environment).toHaveAttribute("data-environment-camera", "object");
  await expect(page.getByTestId("presence-studio-v2-inspector")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-selection-frame")).toBeVisible();
});

test("environment keeps full editing usable without WebGL and respects reduced motion", async ({ page, request }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPrivateStudio(page, request);

  const environment = page.getByTestId("presence-studio-v2-environment");
  await expect(environment).toHaveAttribute("data-environment-runtime", "dom");
  expect(parseFloat(await environment.locator(".v2-environment-depth-back").evaluate((element) => getComputedStyle(element).transitionDuration))).toBeLessThanOrEqual(0.01);

  await page.getByTestId("presence-studio-v2-outline-object").filter({ hasText: "Private install note" }).click();
  await page.getByTestId("studio-v2-object-title").fill("Private install note / environment fallback");
  await expect(page.getByTestId("presence-studio-v2-dirty")).toBeVisible();
  await page.getByTestId("presence-studio-v2-save").click();
  await expect(page.getByTestId("presence-studio-v2-saved")).toContainText("Saved", { timeout: 10_000 });
});

test("mobile uses a contextual inspector sheet and private preview has no editor instrumentation", async ({ page, request }) => {
  await openPrivateStudio(page, request);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId("presence-studio-v2-outline-object").filter({ hasText: "Private install note" }).click();
  await expect(page.getByTestId("presence-studio-v2-inspector")).toHaveCSS("position", "fixed");

  await page.goto(`/studio/${roomId}/editor/preview`, { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v2-preview-environment")).toHaveAttribute("data-environment-runtime", "dom");
  await expect(page.getByTestId("presence-studio-v2-selection-frame")).toHaveCount(0);
  await expect(page.getByTestId("presence-studio-v2-inspector")).toHaveCount(0);
  await expect(page.getByTestId("preview-private-proof-notice")).toBeVisible();
});
