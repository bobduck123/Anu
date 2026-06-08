import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "playwright/test";

const hostedGate = process.env.PRESENCE_HOSTED_SMOKE === "1";
const baseURL = trimTrailingSlash(process.env.PRESENCE_E2E_BASE_URL || "https://your-presence.vercel.app");
const roomId = process.env.PRESENCE_STUDIO_V2_HOSTED_PILOT_ROOM_ID || "11";
const slug = process.env.PRESENCE_STUDIO_V2_HOSTED_PILOT_SLUG || "ggm-christina-goddard";
const legacySlug = process.env.PRESENCE_STUDIO_V2_HOSTED_LEGACY_SLUG || "hesmaddw";
const evidenceDir = path.join(process.cwd(), "docs", "program", "evidence", "presence-studio-v2-public-style-presets-s6a-hosted");

const requiredAuthEnv = ["PRESENCE_E2E_OWNER_EMAIL", "PRESENCE_E2E_OWNER_PASSWORD"] as const;
const missingAuthEnv = requiredAuthEnv.filter((key) => !process.env[key]);

const publicLeakTerms = [
  "Public output style",
  "presence-studio-v2-public-style-selector",
  "presence-studio-v2-public-style-option",
  "Room Assets",
  "Media health",
  "Replace image URL",
  "Possible test asset",
  "style_dna",
  "scene_config",
  "motion_config",
  "asset_config",
  "content_config",
  "roomkey_config",
  "enquiry_config",
  "editable_config",
  "hiddenpublic",
  "hiddenmobile",
  "locked",
  "pinned",
  "presence-studio-v2-toolbar",
  "presence-studio-v2-panel",
  "presence-studio-v2-selection-frame",
  "presence-studio-v2-resize-handle",
  "presence-studio-v2-rotate-handle",
  "localstorage",
  "templatekit",
  "/api/presence/owner",
  "access_token",
  "refresh_token",
  "service_role",
  "bearer ",
] as const;

test.describe("hosted Studio V2 S6A public style presets smoke", () => {
  test.skip(!hostedGate, "Set PRESENCE_HOSTED_SMOKE=1 to run hosted S6A smoke.");
  test.skip(hostedGate && missingAuthEnv.length > 0, `Missing hosted owner auth env vars: ${missingAuthEnv.join(", ")}`);

  test("S6A public style selector is hosted and public output remains clean after public-status gate", async ({
    page,
    context,
  }) => {
    test.setTimeout(150_000);
    await fs.mkdir(evidenceDir, { recursive: true });
    const runtimeErrors = collectRuntimeErrors(page);

    await signInHostedOwner(page);
    await page.goto(`${baseURL}/studio/${roomId}/editor`, { waitUntil: "networkidle" });
    await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("presence-studio-v2-public-style-selector")).toBeVisible();
    await expect(page.getByTestId("presence-studio-v2-public-style-current")).toContainText(/Gallery P2|Christina \/ Liquid Gallery/);
    await expect(page.getByTestId("presence-studio-v2-public-style-option").filter({ hasText: "Gallery P2" })).toBeVisible();
    await expect(page.getByTestId("presence-studio-v2-public-style-option").filter({ hasText: "Christina / Liquid Gallery" })).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "01-hosted-studio-style-selector.png"), fullPage: false });

    await page.goto(`${baseURL}/studio/${roomId}/editor/preview`, { waitUntil: "networkidle" });
    await expect(page.getByText("Draft preview - only you can see this")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".presence-studio-v2-public.world-gallery")).toBeVisible();
    await assertNoPublicLeaks(page, "hosted owner preview");
    await page.screenshot({ path: path.join(evidenceDir, "02-hosted-owner-preview-gallery-p2-clean.png"), fullPage: false });

    await page.goto(`${baseURL}/p/${slug}`, { waitUntil: "networkidle" });
    const publicRoom = page.locator(".presence-studio-v2-public.world-gallery");
    await expect(publicRoom).toBeVisible({ timeout: 30_000 });
    await expect(publicRoom.locator(".v2-public-threshold-transition")).toBeVisible();
    await expect(page.getByTestId("presence-public-style-christina-liquid-gallery")).toHaveCount(0);
    await assertNoPublicLeaks(page, "hosted /p public output");
    await page.screenshot({ path: path.join(evidenceDir, "03-hosted-public-gallery-p2-clean.png"), fullPage: false });

    const focusTrigger = page.getByTestId("presence-public-artwork-focus-trigger").first();
    await expect(focusTrigger).toBeVisible();
    await focusTrigger.click();
    await expect(page.getByTestId("presence-public-artwork-focus")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("presence-public-artwork-focus")).toBeHidden();
    await page.screenshot({ path: path.join(evidenceDir, "04-hosted-public-lightbox-clean.png"), fullPage: false });

    await page.goto(`${baseURL}/presence/${slug}`, { waitUntil: "networkidle" });
    await expect(page.locator(".presence-studio-v2-public.world-gallery")).toBeVisible({ timeout: 30_000 });
    await assertNoPublicLeaks(page, "hosted /presence public output");
    await page.screenshot({ path: path.join(evidenceDir, "05-hosted-presence-alias-clean.png"), fullPage: false });

    const mobile = await context.newPage();
    const mobileErrors = collectRuntimeErrors(mobile);
    await mobile.setViewportSize({ width: 390, height: 844 });
    await mobile.goto(`${baseURL}/p/${slug}`, { waitUntil: "networkidle" });
    await expect(mobile.locator(".presence-studio-v2-public.world-gallery")).toBeVisible({ timeout: 30_000 });
    await assertNoPublicLeaks(mobile, "hosted mobile public output");
    await mobile.screenshot({ path: path.join(evidenceDir, "06-hosted-mobile-gallery-p2-clean.png"), fullPage: false });
    expect(mobileErrors).toEqual([]);
    await mobile.close();

    await page.goto(`${baseURL}/p/${legacySlug}`, { waitUntil: "networkidle" });
    await expect(page.locator(".presence-studio-v2-public")).toHaveCount(0);
    await assertNoPublicLeaks(page, "hosted legacy public output");
    await page.screenshot({ path: path.join(evidenceDir, "07-hosted-legacy-negative.png"), fullPage: false });

    expect(runtimeErrors).toEqual([]);
  });
});

async function signInHostedOwner(page: Page) {
  await page.goto(`${baseURL}/auth/sign-in?returnTo=${encodeURIComponent(`/studio/${roomId}/editor`)}`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByLabel("Email").fill(required("PRESENCE_E2E_OWNER_EMAIL"));
  await page.getByLabel("Password").fill(required("PRESENCE_E2E_OWNER_PASSWORD"));
  await page.getByRole("button", { name: /enter studio/i }).click();
  await expect(page).toHaveURL(/\/studio/, { timeout: 30_000 });
}

async function assertNoPublicLeaks(page: Page, label: string) {
  const html = (await page.content()).toLowerCase();
  const text = (await page.locator("body").innerText()).toLowerCase();
  for (const term of publicLeakTerms) {
    const lowered = term.toLowerCase();
    expect(html, `${label} HTML exposed ${term}`).not.toContain(lowered);
    expect(text, `${label} text exposed ${term}`).not.toContain(lowered);
  }
}

function collectRuntimeErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error" && !text.includes("Failed to load resource: net::ERR_NAME_NOT_RESOLVED")) {
      errors.push(text);
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required hosted smoke env var: ${name}`);
  return value;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
