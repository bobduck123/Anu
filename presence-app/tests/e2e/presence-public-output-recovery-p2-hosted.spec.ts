import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "playwright/test";

const hostedGate = process.env.PRESENCE_HOSTED_SMOKE === "1";
const baseURL = trimTrailingSlash(process.env.PRESENCE_E2E_BASE_URL || "https://your-presence.vercel.app");
const roomId = process.env.PRESENCE_STUDIO_V2_HOSTED_PILOT_ROOM_ID || "11";
const slug = process.env.PRESENCE_STUDIO_V2_HOSTED_PILOT_SLUG || "ggm-christina-goddard";
const legacySlug = process.env.PRESENCE_STUDIO_V2_HOSTED_LEGACY_SLUG || "hesmaddw";
const evidenceDir = path.join(process.cwd(), "docs", "program", "evidence", "presence-public-output-recovery-p2-hosted");

const requiredAuthEnv = ["PRESENCE_E2E_OWNER_EMAIL", "PRESENCE_E2E_OWNER_PASSWORD"] as const;
const missingAuthEnv = requiredAuthEnv.filter((key) => !process.env[key]);

const restrictedRendererTerms = [
  "style_dna",
  "scene_config",
  "motion_config",
  "asset_config",
  "content_config",
  "roomkey_config",
  "enquiry_config",
  "editable_config",
  "owner",
  "draft",
  "locked",
  "pinned",
  "hiddenpublic",
  "hiddenmobile",
  "wild transform suspended",
  "localstorage",
  "templatekit",
  "presence-studio-v2-toolbar",
  "presence-studio-v2-panel",
  "presence-studio-v2-selection-frame",
  "presence-studio-v2-resize-handle",
  "presence-studio-v2-rotate-handle",
  "presence-studio-v2-drag-readout",
  "access_token",
  "refresh_token",
  "auth-token",
  "service_role",
  "bearer ",
  "signed_url",
  "preview_token",
  "storage_key",
  "/api/presence/owner",
] as const;

const restrictedDocumentTerms = restrictedRendererTerms.filter((term) => !["owner", "draft"].includes(term));

test.describe("hosted Public Output Recovery P2 smoke", () => {
  test.skip(!hostedGate, "Set PRESENCE_HOSTED_SMOKE=1 to run hosted Public Output Recovery P2 smoke.");
  test.skip(hostedGate && missingAuthEnv.length > 0, `Missing hosted owner auth env vars: ${missingAuthEnv.join(", ")}`);

  test("hosted Gallery/GGM P2 output, owner preview, Studio regression, and legacy isolation stay clean", async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000);
    await fs.mkdir(evidenceDir, { recursive: true });
    const runtimeErrors = collectRuntimeErrors(page);

    await test.step("public Gallery/GGM desktop P2 visual smoke", async () => {
      await page.setViewportSize({ width: 1440, height: 950 });
      await page.goto(`${baseURL}/p/${slug}`, { waitUntil: "networkidle" });

      const room = page.locator(".presence-studio-v2-public.world-gallery");
      const threshold = room.locator(".v2-public-threshold");
      const transition = room.locator(".v2-public-threshold-transition");
      const cta = threshold.locator(".v2-public-primary-cta");
      const index = threshold.locator(".v2-public-threshold-index");
      const firstChamber = room.locator(".v2-public-chamber").first();
      const firstArtwork = firstChamber.locator(".v2-public-object.is-artwork").first();

      await expect(room).toBeVisible({ timeout: 30_000 });
      await expect(threshold.locator(".v2-public-threshold-image-field img")).toBeVisible();
      await expect(transition).toBeVisible();
      await expect(cta).toBeVisible();
      await expect(firstChamber).toBeVisible();
      await expect(firstArtwork.locator(".v2-public-object-media-img")).toBeVisible();

      await page.screenshot({ path: path.join(evidenceDir, "01-hosted-gallery-threshold-desktop.png"), fullPage: false });

      await transition.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(evidenceDir, "02-hosted-threshold-to-chamber-bridge.png"), fullPage: false });
      const transitionHeight = await transition.evaluate((element) => element.getBoundingClientRect().height);
      expect(transitionHeight, "hosted threshold should bridge into the chamber wall").toBeGreaterThan(60);

      await firstChamber.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(evidenceDir, "03-hosted-chamber-gallery-placards.png"), fullPage: false });
      const chamberLabel = await firstChamber.locator(".v2-public-chamber-head h2").evaluate((element) => {
        const style = getComputedStyle(element as HTMLElement);
        return {
          borderTopWidth: style.borderTopWidth,
          fontSize: Number.parseFloat(style.fontSize),
          textTransform: style.textTransform,
        };
      });
      expect(chamberLabel.fontSize, "hosted chamber heading should read as a placard").toBeLessThan(32);
      expect(chamberLabel.textTransform).toBe("uppercase");
      expect(chamberLabel.borderTopWidth).not.toBe("0px");

      await firstArtwork.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(evidenceDir, "04-hosted-wall-label-artwork-treatment.png"), fullPage: false });
      await page.screenshot({ path: path.join(evidenceDir, "05-hosted-lead-artwork-hierarchy.png"), fullPage: false });
      const wallLabel = await firstArtwork.locator(".v2-public-object-copy").evaluate((element) => {
        const style = getComputedStyle(element as HTMLElement);
        return { borderTopWidth: style.borderTopWidth, paddingTop: Number.parseFloat(style.paddingTop) };
      });
      expect(wallLabel.borderTopWidth).not.toBe("0px");
      expect(wallLabel.paddingTop).toBeGreaterThan(0);

      await cta.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(evidenceDir, "06-hosted-cta-portal-mark.png"), fullPage: false });
      const ctaStyle = await cta.evaluate((element) => {
        const style = getComputedStyle(element as HTMLElement);
        const box = element.getBoundingClientRect();
        return { backgroundColor: style.backgroundColor, borderRadius: style.borderRadius, height: box.height };
      });
      expect(ctaStyle.backgroundColor).toBe("rgba(0, 0, 0, 0)");
      expect(ctaStyle.borderRadius).toBe("0px");
      expect(ctaStyle.height, "hosted CTA should keep an accessible tap target").toBeGreaterThanOrEqual(44);

      const indexText = (await index.textContent()) ?? "";
      expect(indexText).not.toMatch(/\b0[1-9]\b/);

      await firstArtwork.hover();
      await page.screenshot({ path: path.join(evidenceDir, "07-hosted-hover-focus-state.png"), fullPage: false });
      await firstArtwork.getByTestId("presence-public-artwork-focus-trigger").click();
      const focus = room.getByTestId("presence-public-artwork-focus");
      await expect(focus).toBeVisible();
      await expect(focus.getByTestId("presence-public-artwork-focus-image")).toBeVisible();
      await focus.screenshot({ path: path.join(evidenceDir, "08-hosted-lightbox-open-state.png") });
      await page.keyboard.press("Escape");
      await expect(focus).toBeHidden();

      const rendererHtml = await room.evaluate((element) => element.outerHTML);
      assertNoRestrictedTerms(rendererHtml, restrictedRendererTerms, "hosted public renderer");
      assertNoRestrictedTerms(await page.content(), restrictedDocumentTerms, "hosted public document");
      assertNoFakeLiveClaims(await page.locator("body").innerText());
    });

    await test.step("presence alias route renders the same clean P2 public output", async () => {
      await page.goto(`${baseURL}/presence/${slug}`, { waitUntil: "networkidle" });
      const room = page.locator(".presence-studio-v2-public.world-gallery");
      await expect(room).toBeVisible({ timeout: 30_000 });
      await expect(room.locator(".v2-public-threshold-transition")).toBeVisible();
      assertNoRestrictedTerms(await room.evaluate((element) => element.outerHTML), restrictedRendererTerms, "hosted /presence renderer");
    });

    await test.step("mobile threshold and chamber remain strong", async () => {
      const mobile = await context.newPage();
      const mobileErrors = collectRuntimeErrors(mobile);
      await mobile.setViewportSize({ width: 390, height: 844 });
      await mobile.goto(`${baseURL}/p/${slug}`, { waitUntil: "networkidle" });
      const mobileRoom = mobile.locator(".presence-studio-v2-public.world-gallery");
      await expect(mobileRoom.locator(".v2-public-threshold")).toBeVisible({ timeout: 30_000 });
      await mobile.screenshot({ path: path.join(evidenceDir, "09-hosted-mobile-threshold.png"), fullPage: false });
      await mobileRoom.locator(".v2-public-chamber").first().scrollIntoViewIfNeeded();
      await mobile.screenshot({ path: path.join(evidenceDir, "10-hosted-mobile-chamber.png"), fullPage: false });
      await expect(mobileRoom.getByTestId("presence-public-artwork-focus")).toHaveCount(0);
      expect(mobileErrors).toEqual([]);
      await mobile.close();
    });

    await test.step("owner preview renders upgraded P2 output without editor chrome", async () => {
      await signInHostedOwner(page);
      await page.goto(`${baseURL}/studio/${roomId}/editor/preview`, { waitUntil: "networkidle" });
      await expect(page.getByText("Draft preview - only you can see this")).toBeVisible({ timeout: 30_000 });
      const previewRoom = page.locator(".presence-studio-v2-public.world-gallery");
      await expect(previewRoom).toBeVisible();
      await expect(previewRoom.locator(".v2-public-threshold-transition")).toBeVisible();
      await page.screenshot({ path: path.join(evidenceDir, "11-hosted-owner-preview-clean.png"), fullPage: false });
      const previewRendererHtml = await previewRoom.evaluate((element) => element.outerHTML);
      assertNoRestrictedTerms(previewRendererHtml, restrictedRendererTerms, "hosted owner preview public renderer");
    });

    await test.step("Studio V2 editor regression still mounts", async () => {
      await page.goto(`${baseURL}/studio/${roomId}/editor`, { waitUntil: "networkidle" });
      await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId("presence-studio-v2-top-chrome")).toBeVisible();
      await expect(page.getByTestId("presence-studio-v2-outline")).toBeVisible();
      await expect(page.getByTestId("presence-studio-v2-inspector")).toBeVisible();
      await expect(page.getByTestId("presence-studio-v2-tab-threshold")).toBeVisible();
      await expect(page.getByTestId("presence-studio-v2-tab-chamber")).toBeVisible();
      await expect(page.getByTestId("presence-studio-v2-tab-archive")).toBeVisible();
      await expect(page.getByTestId("presence-studio-v2-chamber-tabs")).toBeVisible();
      await expect(page.getByTestId("studio-room-owner-editor-shell")).toHaveCount(0);
      await page.screenshot({ path: path.join(evidenceDir, "12-hosted-studio-regression.png"), fullPage: false });
    });

    await test.step("legacy public room remains outside V2 renderer", async () => {
      await page.goto(`${baseURL}/p/${legacySlug}`, { waitUntil: "networkidle" });
      await expect(page.locator(".presence-studio-v2-public")).toHaveCount(0);
      await expect(page.locator(".v2-public-threshold-transition")).toHaveCount(0);
      await page.screenshot({ path: path.join(evidenceDir, "13-hosted-legacy-negative.png"), fullPage: false });
      test.info().annotations.push({ type: "legacy-negative-url", description: `${baseURL}/p/${legacySlug}` });
    });

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

function assertNoRestrictedTerms(value: string, terms: readonly string[], label: string) {
  const lowered = value.toLowerCase();
  for (const term of terms) {
    expect(lowered, `${label} exposed ${term}`).not.toContain(term.toLowerCase());
  }
}

function assertNoFakeLiveClaims(value: string) {
  const lowered = value.toLowerCase();
  for (const term of ["live viewers", "people viewing", "book now", "checkout", "sold out", "recent purchase"]) {
    expect(lowered, `hosted public output should not include fake live/social/commerce claim: ${term}`).not.toContain(term);
  }
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required hosted smoke env var: ${name}`);
  return value;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
