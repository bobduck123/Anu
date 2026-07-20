import fs from "node:fs/promises";
import { join } from "node:path";
import { expect, test, type Locator, type Page } from "playwright/test";

const hostedGate = process.env.PRESENCE_HOSTED_SMOKE === "1";
const requiredEnv = [
  "PRESENCE_E2E_BASE_URL",
  "PRESENCE_E2E_OWNER_EMAIL",
  "PRESENCE_E2E_OWNER_PASSWORD",
  "PRESENCE_STUDIO_V2_HOSTED_PILOT_ROOM_ID",
] as const;
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

const BASE = process.env.PRESENCE_E2E_BASE_URL || "https://your-presence.vercel.app";
const ROOM_ID = Number(process.env.PRESENCE_STUDIO_V2_HOSTED_PILOT_ROOM_ID || "11");
const SLUG = process.env.PRESENCE_STUDIO_V2_HOSTED_PILOT_SLUG || "ggm-christina-goddard";
const LEGACY_ROOM_ID = Number(process.env.PRESENCE_STUDIO_V2_HOSTED_LEGACY_ROOM_ID || "1");
const EVIDENCE_DIR = join(
  process.cwd(),
  "docs",
  "program",
  "evidence",
  "presence-studio-v2-studio-recovery-s3-hosted",
);

const restrictedHostedTerms = [
  "style_dna",
  "scene_config",
  "motion_config",
  "asset_config",
  "content_config",
  "roomkey_config",
  "enquiry_config",
  "editable_config",
  "hiddenPublic",
  "hiddenMobile",
  "WILD TRANSFORM SUSPENDED",
  "localStorage",
  "TemplateKit",
  "presence-studio-v2-toolbar",
  "presence-studio-v2-panel",
  "presence-studio-v2-selection-frame",
  "presence-studio-v2-resize-handle",
  "presence-studio-v2-rotate-handle",
  "presence-studio-v2-drag-readout",
  "Object inspector",
  "Room inspector",
  "Hidden from public",
  "Hidden on mobile",
] as const;

test.use({ baseURL: BASE });
test.skip(!hostedGate, "Set PRESENCE_HOSTED_SMOKE=1 to run the hosted Studio V2 S3 smoke.");
test.skip(
  hostedGate && missingEnv.length > 0,
  `Missing hosted Studio V2 S3 env vars: ${missingEnv.join(", ")}`,
);
test.setTimeout(180_000);

test("hosted S3 editor, direct manipulation sanity, preview/public hygiene, and evidence", async ({ page, context }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await fs.mkdir(EVIDENCE_DIR, { recursive: true });
  await signInHostedOwner(page);

  await test.step("read-only S3 editor verification", async () => {
    await page.goto(`/studio/${ROOM_ID}/editor`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("presence-studio-v2-top-chrome")).toBeVisible();
    await expect(page.getByTestId("presence-studio-v2-outline")).toBeVisible();
    await expect(page.getByTestId("presence-studio-v2-inspector")).toBeVisible();
    await expect(page.getByTestId("presence-studio-v2-device-frame")).toBeVisible();
    await expect(page.getByTestId("presence-studio-v2-preview-confidence")).toBeVisible();
    await expect(page.getByTestId("studio-room-owner-editor-shell")).toHaveCount(0);
    await page.screenshot({ path: join(EVIDENCE_DIR, "01-full-s3-editor-cockpit.png"), fullPage: true });
  });

  await test.step("content inspector image preview or empty state", async () => {
    const asset = page.getByTestId("presence-studio-v2-asset").first();
    if ((await asset.count()) > 0) {
      await asset.click();
      await expect(page.getByTestId("presence-studio-v2-inspector-image-preview")).toBeVisible();
    } else {
      await page.getByTestId("presence-studio-v2-outline-object").first().click();
      await expect(page.getByTestId("presence-studio-v2-inspector-image-empty")).toBeVisible();
    }
    await expect(page.getByTestId("presence-studio-v2-inspector-link-status")).toBeVisible();
    await page.getByTestId("presence-studio-v2-inspector").screenshot({
      path: join(EVIDENCE_DIR, "02-content-tab-image-preview.png"),
    });
  });

  await test.step("style inspector state badges and delete confirmation", async () => {
    await page.getByTestId("presence-studio-v2-inspector-tab-style").click();
    await expect(page.getByTestId("presence-studio-v2-object-state-summary")).toBeVisible();
    await expect(page.getByText("Layer position")).toBeVisible();
    await page.getByRole("button", { name: "Delete object" }).click();
    await expect(page.getByRole("button", { name: "Confirm delete object" })).toBeVisible();
    await page.getByTestId("presence-studio-v2-inspector").screenshot({
      path: join(EVIDENCE_DIR, "03-style-tab-state-delete-confirm.png"),
    });
    await page.getByRole("button", { name: "Cancel" }).click();
  });

  await test.step("S2/S3 interaction sanity with restoration", async () => {
    const movableIndex = await selectFirstMovableObject(page);
    await page.getByTestId("presence-studio-v2-inspector-tab-motion").click();
    await expect(page.getByTestId("presence-studio-v2-transform-x-plus")).toBeVisible();
    await expect(page.getByTestId("presence-studio-v2-transform-scale-slider")).toBeVisible();
    await expect(page.getByTestId("presence-studio-v2-transform-rotation-slider")).toBeVisible();
    await page.getByTestId("presence-studio-v2-inspector").screenshot({
      path: join(EVIDENCE_DIR, "04-motion-tab-sliders-steppers.png"),
    });

    const xInput = page.getByTestId("presence-studio-v2-transform-x");
    const yInput = page.getByTestId("presence-studio-v2-transform-y");
    const scaleInput = page.getByTestId("presence-studio-v2-transform-scale");
    const rotationInput = page.getByTestId("presence-studio-v2-transform-rotation");
    const originalValues = {
      x: await numberValue(xInput),
      y: await numberValue(yInput),
      scale: await numberValue(scaleInput),
      rotation: await numberValue(rotationInput),
    };

    await page.getByRole("button", { name: "Wild" }).click();
    await expect(page.getByTestId("presence-studio-v2-selection-frame")).toBeVisible();
    await expect(page.getByTestId("presence-studio-v2-resize-handle").first()).toHaveAttribute("aria-disabled", "false");
    await page.screenshot({ path: join(EVIDENCE_DIR, "05-selected-object-with-s2-frame.png"), fullPage: true });

    const selectedObject = page.getByTestId("presence-studio-v2-draggable-object").filter({ has: page.getByTestId("presence-studio-v2-selection-frame") }).first();
    await dragBy(page, selectedObject, 22, 14);
    await expect(page.getByTestId("presence-studio-v2-drag-readout")).toBeVisible();
    await expect.poll(() => numberValue(xInput)).not.toBe(originalValues.x);
    await expect.poll(() => numberValue(yInput)).not.toBe(originalValues.y);

    const nextScale = roundToStep(clamp(originalValues.scale + 0.1, 0.55, 2.35), 0.05);
    await page.getByTestId("presence-studio-v2-transform-scale-slider").fill(String(nextScale));
    await expect.poll(() => numberValue(scaleInput)).toBeCloseTo(nextScale, 2);

    const nextRotation = clamp(originalValues.rotation + 8, -170, 170);
    await page.getByTestId("presence-studio-v2-transform-rotation-slider").fill(String(nextRotation));
    await expect.poll(() => numberValue(rotationInput)).toBeCloseTo(nextRotation, 1);

    await page.getByRole("button", { name: "Guided" }).click();
    await expect(page.getByTestId("presence-studio-v2-resize-handle").first()).toHaveAttribute("aria-disabled", "true");

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("presence-studio-v2-preview-confidence")).toContainText("Save before sharing");
    await page.screenshot({ path: join(EVIDENCE_DIR, "06-preview-publish-confidence-checklist.png"), fullPage: true });

    await page.getByTestId("presence-studio-v2-outline-object").nth(movableIndex).click();
    await page.getByTestId("presence-studio-v2-inspector-tab-motion").click();
    await page.getByTestId("presence-studio-v2-transform-x").fill(String(originalValues.x));
    await page.getByTestId("presence-studio-v2-transform-y").fill(String(originalValues.y));
    await page.getByTestId("presence-studio-v2-transform-scale").fill(String(originalValues.scale));
    await page.getByTestId("presence-studio-v2-transform-rotation").fill(String(originalValues.rotation));
    const save = page.getByTestId("presence-studio-v2-save");
    if (await save.isEnabled()) {
      await save.click();
      await expect(page.getByTestId("presence-studio-v2-saved")).toBeVisible({ timeout: 20_000 });
    }
  });

  await test.step("desktop/mobile device frames and narrow toggles", async () => {
    await page.getByTestId("presence-studio-v2-tab-chamber").click();
    await expect(page.getByTestId("presence-studio-v2-device-label")).toContainText("Desktop public room preview");
    await page.getByTestId("presence-studio-v2-device-frame").screenshot({
      path: join(EVIDENCE_DIR, "07-desktop-device-frame.png"),
    });
    await page.getByTestId("presence-studio-v2-viewport-mobile").click();
    await expect(page.getByTestId("presence-studio-v2-device-label")).toContainText("Mobile public room preview");
    await page.getByTestId("presence-studio-v2-device-frame").screenshot({
      path: join(EVIDENCE_DIR, "08-mobile-device-frame.png"),
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId("presence-studio-v2-outline-toggle")).toBeVisible();
    await expect(page.getByTestId("presence-studio-v2-inspector-toggle")).toBeVisible();
    await page.screenshot({ path: join(EVIDENCE_DIR, "09-narrow-outline-inspector-toggles.png"), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
  });

  await test.step("owner preview and anonymous public routes stay clean", async () => {
    await page.goto(`/studio/${ROOM_ID}/editor/preview`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".presence-studio-v2-public")).toBeVisible({ timeout: 30_000 });
    const previewHtml = await page.content();
    assertNoRestrictedTerms(previewHtml, restrictedHostedTerms);
    await page.screenshot({ path: join(EVIDENCE_DIR, "10-owner-preview-clean.png"), fullPage: true });

    const anon = await context.browser()!.newContext({ baseURL: BASE });
    const publicPage = await anon.newPage();
    await publicPage.goto(`/p/${SLUG}`, { waitUntil: "domcontentloaded" });
    await expect(publicPage.locator(".presence-studio-v2-public")).toBeVisible({ timeout: 30_000 });
    assertNoRestrictedTerms(await publicPage.content(), restrictedHostedTerms);
    await publicPage.screenshot({ path: join(EVIDENCE_DIR, "11-public-desktop-clean.png"), fullPage: true });

    await publicPage.setViewportSize({ width: 390, height: 844 });
    await publicPage.goto(`/p/${SLUG}`, { waitUntil: "domcontentloaded" });
    await expect(publicPage.locator(".presence-studio-v2-public")).toBeVisible({ timeout: 30_000 });
    assertNoRestrictedTerms(await publicPage.content(), restrictedHostedTerms);
    await publicPage.screenshot({ path: join(EVIDENCE_DIR, "12-public-mobile-clean.png"), fullPage: true });

    await publicPage.goto(`/presence/${SLUG}`, { waitUntil: "domcontentloaded" });
    await expect(publicPage.locator(".presence-studio-v2-public")).toBeVisible({ timeout: 30_000 });
    assertNoRestrictedTerms(await publicPage.content(), restrictedHostedTerms);
    await anon.close();
  });

  await test.step("legacy editor remains legacy", async () => {
    await page.goto(`/studio/${LEGACY_ROOM_ID}/editor`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("presence-studio-v2-root")).toHaveCount(0);
    await page.screenshot({ path: join(EVIDENCE_DIR, "13-legacy-room-negative.png"), fullPage: true });
  });

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

async function signInHostedOwner(page: Page) {
  await page.goto("/auth/sign-in?returnTo=" + encodeURIComponent(`/studio/${ROOM_ID}/editor`), {
    waitUntil: "domcontentloaded",
  });
  await page.getByLabel("Email").fill(required("PRESENCE_E2E_OWNER_EMAIL"));
  await page.getByLabel("Password").fill(required("PRESENCE_E2E_OWNER_PASSWORD"));
  await page.getByRole("button", { name: /enter studio/i }).click();
  await page.waitForURL(/\/studio/, { timeout: 30_000 });
}

async function selectFirstMovableObject(page: Page): Promise<number> {
  const objects = page.getByTestId("presence-studio-v2-outline-object");
  const count = await objects.count();
  for (let index = 0; index < count; index += 1) {
    await objects.nth(index).click();
    await page.getByTestId("presence-studio-v2-inspector-tab-motion").click();
    if (!(await page.getByTestId("presence-studio-v2-transform-x").isDisabled())) return index;
  }
  throw new Error("No unlocked Studio V2 object was available for hosted S3 interaction sanity.");
}

async function dragBy(page: Page, locator: Locator, deltaX: number, deltaY: number) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error("Cannot drag element without a bounding box.");
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 8 });
  await page.mouse.up();
}

async function numberValue(locator: Locator): Promise<number> {
  return Number(await locator.inputValue());
}

function assertNoRestrictedTerms(html: string, terms: readonly string[]) {
  const lower = html.toLowerCase();
  for (const term of terms) {
    expect(lower, `Hosted public/preview HTML exposed ${term}`).not.toContain(term.toLowerCase());
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is required`);
  return value;
}
