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
  "presence-studio-environmental-engine",
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

test("captures private local environmental-engine proof frames", async ({ page, request }) => {
  await fs.mkdir(evidenceDir, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openPrivateStudio(page, request);

  await page.screenshot({ path: path.join(evidenceDir, "01-room-overview-desktop.png"), fullPage: false });
  await page.locator(".v2-stage-shell").screenshot({ path: path.join(evidenceDir, "02-room-focus-frame.png") });

  await page.getByTestId("presence-studio-v2-chamber-tab").last().click();
  await page.locator(".v2-stage-shell").screenshot({ path: path.join(evidenceDir, "03-chamber-focus-frame.png") });

  await page.getByTestId("presence-studio-v2-outline-object").filter({ hasText: "Private install note" }).click();
  await page.screenshot({ path: path.join(evidenceDir, "04-object-focus-inspector.png"), fullPage: false });

  await page.getByTestId("studio-v2-open-skin").click();
  await page.getByRole("button", { name: "Background #0a0a0a" }).click();
  await page.locator(".v2-skin-choice").filter({ hasText: "timber" }).click();
  await page.locator(".v2-skin-choice").filter({ hasText: "gentle" }).click();
  await page.getByTestId("studio-v2-sheet-close").click();
  await page.locator(".v2-stage-shell").screenshot({ path: path.join(evidenceDir, "05-style-dna-environment.png") });

  await page.goto(`/studio/${roomId}/editor/preview`, { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v2-preview-environment")).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "06-private-preview-parity.png"), fullPage: false });

  await page.goto(`/studio/${roomId}/editor`, { waitUntil: "networkidle" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId("presence-studio-v2-outline-object").filter({ hasText: "Private install note" }).click();
  await expect(page.getByTestId("presence-studio-v2-inspector")).toHaveCSS("position", "fixed");
  await page.screenshot({ path: path.join(evidenceDir, "07-mobile-contextual-inspector.png"), fullPage: false });
});

test("captures reduced-motion and no-WebGL-safe private frames", async ({ page, request }) => {
  await fs.mkdir(evidenceDir, { recursive: true });
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 900 });
  await openPrivateStudio(page, request);
  await expect(page.getByTestId("presence-studio-v2-environment")).toHaveAttribute("data-environment-runtime", "dom");
  await page.getByTestId("presence-studio-v2-outline-object").filter({ hasText: "Private install note" }).click();
  await page.screenshot({ path: path.join(evidenceDir, "08-reduced-motion-no-webgl.png"), fullPage: false });
});
