import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type APIRequestContext, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";
const roomId = 11;
const evidenceDir = path.join(
  process.cwd(),
  "docs",
  "program",
  "evidence",
  "presence-studio-working-state",
  "screenshots",
);

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
  await expect(page.getByTestId("presence-studio-v2-private-proof")).toBeVisible();
}

test("Studio V2 guide, supported Style DNA, and mobile room dock are truthful", async ({ page, request }) => {
  await openPrivateStudio(page, request);

  const guide = page.getByTestId("presence-studio-v2-guide");
  await expect(guide).toContainText("Choose a chamber or an object");

  await page.getByTestId("presence-studio-v2-outline-object").filter({ hasText: "Private install note" }).click();
  await expect(guide).toContainText("private to this room");

  await page.getByTestId("studio-v2-open-skin").click();
  await expect(page.getByTestId("studio-v2-skin-sheet")).toBeVisible();
  await expect(page.getByText("Aura Intensity")).toHaveCount(0);
  await expect(page.getByText("Display Type")).toHaveCount(0);
  await expect(page.getByText("Borders", { exact: true })).toHaveCount(0);
  await expect(page.getByTestId("studio-v2-skin-shadowDepth")).toHaveAttribute("max", "1");

  const background = page.getByRole("button", { name: "Background #0a0a0a" });
  await background.click();
  await expect(page.locator(".v2-room")).toHaveCSS("--v2-room-background", "#0a0a0a");
  await page.locator(".v2-skin-choice").filter({ hasText: "timber" }).click();
  await expect(page.locator(".v2-room")).toHaveClass(/texture-timber/);
  await page.locator(".v2-skin-choice").filter({ hasText: "gentle" }).click();
  await expect(page.locator(".v2-room")).toHaveClass(/motion-gentle/);
  expect(await page.locator(".v2-room").evaluate((element) => getComputedStyle(element, "::before").animationName)).toContain("v2-studio-atmosphere-drift");
  await page.getByTestId("studio-v2-sheet-close").click();
  await page.getByTestId("presence-studio-v2-save").click();
  await expect(page.getByTestId("presence-studio-v2-saved")).toContainText("Saved", { timeout: 10_000 });
  await page.goto(`/studio/${roomId}/editor/preview`, { waitUntil: "networkidle" });
  await expect(page.locator(".presence-studio-v2-public")).toHaveCSS("--v2-public-bg", "#0a0a0a");
  await expect(page.locator(".presence-studio-v2-public")).toHaveClass(/texture-timber/);
  await expect(page.locator(".presence-studio-v2-public")).toHaveClass(/motion-gentle/);
  await page.goto(`/studio/${roomId}/editor`, { waitUntil: "networkidle" });

  await page.setViewportSize({ width: 390, height: 844 });
  const chrome = page.getByTestId("presence-studio-v2-top-chrome");
  await expect(chrome).toHaveCSS("overflow-x", "auto");
  await page.getByTestId("presence-studio-v2-preview-action").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("presence-studio-v2-preview-action")).toBeVisible();
  await page.getByTestId("presence-studio-v2-inspector-toggle").scrollIntoViewIfNeeded();
  await page.getByTestId("presence-studio-v2-inspector-toggle").click();
  await expect(page.getByTestId("presence-studio-v2-inspector")).toBeHidden();
});

test("captures authorised local Room 11 Studio working-state evidence", async ({ page, request }) => {
  await fs.mkdir(evidenceDir, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openPrivateStudio(page, request);

  await page.screenshot({ path: path.join(evidenceDir, "01-initial-studio-load-desktop.png"), fullPage: false });
  await page.locator(".v2-stage-shell").screenshot({ path: path.join(evidenceDir, "02-canvas-no-selection-desktop.png") });

  await page.getByTestId("presence-studio-v2-chamber-tab").last().click();
  await page.locator(".v2-stage-shell").screenshot({ path: path.join(evidenceDir, "03-chamber-selected-desktop.png") });

  await page.getByTestId("presence-studio-v2-outline-object").filter({ hasText: "Private install note" }).click();
  await page.screenshot({ path: path.join(evidenceDir, "04-object-selected-contextual-inspector.png"), fullPage: false });

  const title = page.getByTestId("studio-v2-object-title");
  const originalTitle = await title.inputValue();
  await title.fill(`${originalTitle} local evidence`);
  await page.getByTestId("presence-studio-v2-inspector").screenshot({ path: path.join(evidenceDir, "05-active-text-edit.png") });

  await page.route(`**/api/presence/owner/rooms/${roomId}/editor/draft`, async (route) => {
    const response = await route.fetch();
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.fulfill({ response });
  });
  await page.getByTestId("presence-studio-v2-save").click();
  await expect(page.getByTestId("presence-studio-v2-save-status")).toContainText("Saving draft");
  await page.screenshot({ path: path.join(evidenceDir, "06-saving-state.png"), fullPage: false });
  await expect(page.getByTestId("presence-studio-v2-saved")).toContainText("Saved", { timeout: 10_000 });
  await page.unroute(`**/api/presence/owner/rooms/${roomId}/editor/draft`);
  await page.screenshot({ path: path.join(evidenceDir, "07-saved-state.png"), fullPage: false });

  await page.goto(`/studio/${roomId}/editor/preview`, { waitUntil: "networkidle" });
  await expect(page.getByTestId("preview-private-proof-notice")).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "08-private-preview.png"), fullPage: false });

  await page.goto(`/studio/${roomId}/editor`, { waitUntil: "networkidle" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible();
  await page.locator(".v2-stage-shell").screenshot({ path: path.join(evidenceDir, "09-mobile-canvas.png") });
  await page.getByTestId("presence-studio-v2-outline-object").filter({ hasText: "Private install note" }).click();
  await page.getByTestId("presence-studio-v2-inspector-toggle").scrollIntoViewIfNeeded();
  await page.getByTestId("presence-studio-v2-inspector-toggle").click();
  await page.getByTestId("presence-studio-v2-inspector-toggle").click();
  await page.getByTestId("presence-studio-v2-inspector").screenshot({ path: path.join(evidenceDir, "10-mobile-contextual-controls.png") });

  await page.setViewportSize({ width: 1180, height: 820 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(evidenceDir, "11-laptop-constrained-layout.png"), fullPage: false });
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(evidenceDir, "12-tablet-portrait-layout.png"), fullPage: false });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(evidenceDir, "13-mobile-landscape-roomdock.png"), fullPage: false });
});
