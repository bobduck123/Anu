import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "playwright/test";

const hostedGate = process.env.PRESENCE_HOSTED_SMOKE === "1";
const requiredEnv = [
  "PRESENCE_E2E_BASE_URL",
  "PRESENCE_E2E_OWNER_EMAIL",
  "PRESENCE_E2E_OWNER_PASSWORD",
  "PRESENCE_STUDIO_V2_HOSTED_PILOT_ROOM_ID",
] as const;
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
const evidenceDir = path.join(process.cwd(), "docs", "program", "evidence", "presence-studio-v2-asset-library-s5-hosted");
const pilotSlug = process.env.PRESENCE_STUDIO_V2_HOSTED_PILOT_SLUG || "ggm-christina-goddard";
const legacySlug = process.env.PRESENCE_STUDIO_V2_HOSTED_LEGACY_SLUG || "hesmaddw";

const editorOnlyTerms = [
  "Room Assets",
  "Derived from current room objects",
  "Upload library later",
  "Media health",
  "Possible test asset",
  "Replace image URL",
  "presence-studio-v2-assets-panel",
  "presence-studio-v2-asset-card",
  "presence-studio-v2-media-health",
] as const;

test.describe("hosted Studio V2 S5 asset library smoke", () => {
  test.skip(!hostedGate, "Set PRESENCE_HOSTED_SMOKE=1 to run hosted S5 smoke.");
  test.skip(hostedGate && missingEnv.length > 0, `Missing hosted S5 smoke env vars: ${missingEnv.join(", ")}`);

  test("S5 asset management is editor-only and public-output safe on hosted Room 11", async ({ page }) => {
    test.setTimeout(120_000);
    await fs.mkdir(evidenceDir, { recursive: true });

    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      const text = message.text();
      if (message.type() === "error" && !text.includes("Failed to load resource: net::ERR_NAME_NOT_RESOLVED")) {
        consoleErrors.push(text);
      }
    });

    const roomId = required("PRESENCE_STUDIO_V2_HOSTED_PILOT_ROOM_ID");

    await signInHostedOwner(page, roomId);
    await page.goto(`/studio/${roomId}/editor`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("presence-studio-v2-top-chrome")).toBeVisible();
    await expect(page.getByTestId("presence-studio-v2-outline")).toBeVisible();
    await expect(page.getByTestId("presence-studio-v2-inspector")).toBeVisible();
    await expect(page.getByTestId("presence-studio-v2-tab-threshold")).toBeVisible();
    await expect(page.getByTestId("presence-studio-v2-tab-chamber")).toBeVisible();
    await expect(page.getByTestId("presence-studio-v2-tab-archive")).toBeVisible();

    const assetsPanel = page.getByTestId("presence-studio-v2-assets-panel");
    await expect(assetsPanel).toBeVisible();
    await expect(page.getByTestId("presence-studio-v2-media-health")).toBeVisible();
    await expect(page.getByTestId("presence-studio-v2-asset-card").first()).toBeVisible();
    await expect(page.getByText("Derived from objects in this room. Upload library later.")).toBeVisible();
    await screenshot(page, "01-hosted-room-assets-panel.png");
    await screenshot(page, "02-hosted-media-health-checklist.png");

    const possibleTestWarnings = await page.getByText("Possible test asset").count();
    expect(possibleTestWarnings, "Corrected hosted Room 11 should not show smoke/test asset warnings.").toBe(0);

    await page.getByTestId("presence-studio-v2-asset-thumbnail").first().click();
    await expect(page.getByTestId("presence-studio-v2-asset-replace-url")).toBeVisible();
    await expect(page.getByText("Derived from current room objects. Upload library arrives later.")).toBeVisible();
    await expect(page.getByRole("button", { name: /upload|crop|storage/i })).toHaveCount(0);
    await screenshot(page, "03-hosted-asset-detail-view.png");

    const selectedUrl = await page.getByTestId("presence-studio-v2-asset-replace-url").inputValue();
    if (selectedUrl.startsWith("//")) {
      await expect(page.getByText("Local/public asset path.")).toHaveCount(0);
    }

    const selectedDetail = page.getByTestId("presence-studio-v2-inspector");
    if (await selectedDetail.getByText("Missing URL").count()) {
      await expect(selectedDetail.getByText("Threshold/hero context")).toHaveCount(0);
    }

    await page.getByTestId("presence-studio-v2-asset-used-in").first().click();
    await expect(page.getByTestId("presence-studio-v2-selection-label")).toBeVisible();
    await screenshot(page, "04-hosted-used-in-state.png");

    await page.goto(`/studio/${roomId}/editor/preview`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".presence-studio-v2-public")).toBeVisible({ timeout: 30_000 });
    await assertNoEditorOnlyLeak(page);
    await screenshot(page, "05-owner-preview-clean.png");

    await page.goto(`/p/${pilotSlug}`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".presence-studio-v2-public")).toBeVisible({ timeout: 30_000 });
    await assertNoEditorOnlyLeak(page);
    const focusTrigger = page.getByTestId("presence-public-artwork-focus-trigger").first();
    await expect(focusTrigger).toBeVisible();
    await focusTrigger.scrollIntoViewIfNeeded();
    await focusTrigger.click();
    await expect(page.getByTestId("presence-public-artwork-focus")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("presence-public-artwork-focus")).toBeHidden();
    await screenshot(page, "06-public-gallery-clean.png");

    await page.goto(`/presence/${pilotSlug}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".presence-studio-v2-public")).toBeVisible({ timeout: 30_000 });
    await assertNoEditorOnlyLeak(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/p/${pilotSlug}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".presence-studio-v2-public")).toBeVisible({ timeout: 30_000 });
    await assertNoEditorOnlyLeak(page);
    await screenshot(page, "07-mobile-public-clean.png");

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`/p/${legacySlug}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".presence-studio-v2-public")).toHaveCount(0);
    await assertNoEditorOnlyLeak(page);
    await screenshot(page, "08-legacy-negative.png");

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});

async function signInHostedOwner(page: Page, roomId: string) {
  await page.goto(`/auth/sign-in?returnTo=${encodeURIComponent(`/studio/${roomId}/editor`)}`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByLabel("Email").fill(required("PRESENCE_E2E_OWNER_EMAIL"));
  await page.getByLabel("Password").fill(required("PRESENCE_E2E_OWNER_PASSWORD"));
  await page.getByRole("button", { name: /enter studio/i }).click();
  await expect(page).toHaveURL(/\/studio/, { timeout: 30_000 });
}

async function assertNoEditorOnlyLeak(page: Page) {
  const html = await page.content();
  const text = await page.locator("body").innerText();
  for (const term of editorOnlyTerms) {
    expect(html, `Hosted output should not include editor-only term ${term}`).not.toContain(term);
    expect(text, `Hosted output text should not include editor-only term ${term}`).not.toContain(term);
  }
}

async function screenshot(page: Page, fileName: string) {
  await page.screenshot({ path: path.join(evidenceDir, fileName), fullPage: false });
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required hosted S5 smoke env var: ${name}`);
  return value;
}
