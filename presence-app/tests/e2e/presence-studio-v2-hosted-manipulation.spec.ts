import { expect, test, type Page, type Locator } from "playwright/test";
import { join } from "node:path";

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
const EMAIL = process.env.PRESENCE_E2E_OWNER_EMAIL || "";
const PASSWORD = process.env.PRESENCE_E2E_OWNER_PASSWORD || "";

const EVIDENCE_DIR = join(
  process.cwd(),
  "docs", "program", "evidence",
  "presence-studio-v2-studio-recovery-s2-hosted"
);

test.use({ baseURL: BASE });
test.skip(!hostedGate, "Set PRESENCE_HOSTED_SMOKE=1 to run the hosted Studio V2 S2 manipulation audit.");
test.skip(
  hostedGate && missingEnv.length > 0,
  `Missing hosted Studio V2 S2 env vars: ${missingEnv.join(", ")}`,
);

async function signInHostedOwner(page: Page) {
  await page.goto("/auth/sign-in?returnTo=" + encodeURIComponent(`/studio/${ROOM_ID}/editor`), {
    waitUntil: "domcontentloaded",
  });
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /enter studio/i }).click();
  await page.waitForURL(/\/studio/, { timeout: 30_000 });
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

test.setTimeout(180_000);

test("hosted S2 direct manipulation audit", async ({ page }) => {
  // ── Setup ──
  await signInHostedOwner(page);
  await page.goto(`/studio/${ROOM_ID}/editor`, { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible();

  // ── Stage 1: Select first object ──
  const firstOutline = page.getByTestId("presence-studio-v2-outline-object").first();
  await firstOutline.click();

  const selectedObject = page.getByTestId("presence-studio-v2-draggable-object").first();
  await expect(page.getByTestId("presence-studio-v2-selection-frame")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-resize-handle")).toHaveCount(4);
  await expect(page.getByTestId("presence-studio-v2-rotate-handle")).toBeVisible();

  // ── Stage 2: Motion tab + Guided mode ──
  await page.getByTestId("presence-studio-v2-inspector-tab-motion").click();
  const xInput = page.getByTestId("presence-studio-v2-transform-x");
  const yInput = page.getByTestId("presence-studio-v2-transform-y");
  const scaleInput = page.getByTestId("presence-studio-v2-transform-scale");
  const rotationInput = page.getByTestId("presence-studio-v2-transform-rotation");

  // Guided mode: handles disabled
  await expect(page.getByTestId("presence-studio-v2-resize-handle").first())
    .toHaveAttribute("aria-disabled", "true");

  // Guided drag should NOT change transforms
  const guidedX = await numberValue(xInput);
  const guidedY = await numberValue(yInput);
  await dragBy(page, selectedObject, 70, 36);
  await expect.poll(() => numberValue(xInput)).toBe(guidedX);
  await expect.poll(() => numberValue(yInput)).toBe(guidedY);
  await expect(page.getByTestId("presence-studio-v2-drag-readout")).toHaveCount(0);

  await page.screenshot({ path: join(EVIDENCE_DIR, "hosted-s2-guided-mode.png"), fullPage: true });

  // ── Stage 3: Wild mode drag ──
  await page.getByRole("button", { name: "Wild" }).click();
  await expect(page.getByTestId("presence-studio-v2-resize-handle").first())
    .toHaveAttribute("aria-disabled", "false");

  const wildBeforeX = await numberValue(xInput);
  const wildBeforeY = await numberValue(yInput);

  await dragBy(page, selectedObject, 84, 42);
  await expect(page.getByTestId("presence-studio-v2-drag-readout")).toBeVisible();

  const wildAfterX = await numberValue(xInput);
  const wildAfterY = await numberValue(yInput);
  expect(wildAfterX).not.toBe(wildBeforeX);
  expect(wildAfterY).not.toBe(wildBeforeY);

  await page.screenshot({ path: join(EVIDENCE_DIR, "hosted-s2-wild-drag.png"), fullPage: true });

  // ── Stage 4: Resize ──
  const beforeScale = await numberValue(scaleInput);
  await dragBy(page, page.getByTestId("presence-studio-v2-resize-handle").nth(3), 58, 58);
  const afterScale = await numberValue(scaleInput);
  expect(afterScale).toBeGreaterThan(beforeScale);

  await page.screenshot({ path: join(EVIDENCE_DIR, "hosted-s2-resize.png"), fullPage: true });

  // ── Stage 5: Rotate ──
  const beforeRot = await numberValue(rotationInput);
  await dragBy(page, page.getByTestId("presence-studio-v2-rotate-handle"), 76, 44);
  const afterRot = await numberValue(rotationInput);
  expect(Math.abs(afterRot)).toBeGreaterThan(Math.abs(beforeRot) + 5);

  await page.screenshot({ path: join(EVIDENCE_DIR, "hosted-s2-rotate.png"), fullPage: true });

  // ── Stage 6: Save + persistence ──
  const savedX = Math.round(await numberValue(xInput));
  const savedY = Math.round(await numberValue(yInput));
  const savedScale = await numberValue(scaleInput);
  const savedRotation = Math.round(await numberValue(rotationInput));

  await page.getByTestId("presence-studio-v2-save").click();
  await expect(page.getByTestId("presence-studio-v2-saved")).toBeVisible({ timeout: 20_000 });

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible();
  await page.getByTestId("presence-studio-v2-outline-object").first().click();
  await page.getByTestId("presence-studio-v2-inspector-tab-motion").click();
  await page.getByRole("button", { name: "Wild" }).click();

  await expect.poll(() => numberValue(page.getByTestId("presence-studio-v2-transform-x"))).toBe(savedX);
  await expect.poll(() => numberValue(page.getByTestId("presence-studio-v2-transform-y"))).toBe(savedY);
  await expect.poll(() => numberValue(page.getByTestId("presence-studio-v2-transform-scale"))).toBeCloseTo(savedScale, 1);
  await expect.poll(() => numberValue(page.getByTestId("presence-studio-v2-transform-rotation"))).toBe(savedRotation);

  await page.screenshot({ path: join(EVIDENCE_DIR, "hosted-s2-after-reload.png"), fullPage: true });

  // ── Stage 7: Preview hygiene ──
  await page.goto(`/studio/${ROOM_ID}/editor/preview`, { waitUntil: "networkidle" });
  await page.waitForSelector(".presence-studio-v2-public", { timeout: 30_000 });

  await expect(page.locator(".v2-selection-frame")).toHaveCount(0);
  await expect(page.locator(".v2-resize-handle")).toHaveCount(0);
  await expect(page.locator(".v2-rotate-handle")).toHaveCount(0);
  await expect(page.getByTestId("presence-studio-v2-drag-readout")).toHaveCount(0);

  const previewHtml = await page.content();
  const restricted = [
    "style_dna", "scene_config", "motion_config", "asset_config", "content_config",
    "roomkey_config", "enquiry_config", "editable_config", "hiddenPublic", "hiddenMobile",
    "WILD TRANSFORM SUSPENDED", "localStorage", "TemplateKit",
    "presence-studio-v2-toolbar", "presence-studio-v2-panel",
    "presence-studio-v2-selection-frame", "presence-studio-v2-resize-handle",
    "presence-studio-v2-rotate-handle", "presence-studio-v2-drag-readout",
  ];
  for (const term of restricted) {
    expect(previewHtml.toLowerCase()).not.toContain(term.toLowerCase());
  }

  await page.screenshot({ path: join(EVIDENCE_DIR, "hosted-s2-preview.png"), fullPage: true });

  // ── Stage 8: Public hygiene ──
  const anonContext = await page.context().browser()!.newContext({ baseURL: BASE });
  const publicPage = await anonContext.newPage();
  await publicPage.goto(`/p/${SLUG}`, { waitUntil: "networkidle" });
  await publicPage.waitForSelector(".presence-studio-v2-public", { timeout: 30_000 });

  await expect(publicPage.locator(".v2-selection-frame")).toHaveCount(0);
  const publicHtml = await publicPage.content();
  for (const term of restricted) {
    expect(publicHtml.toLowerCase()).not.toContain(term.toLowerCase());
  }

  await publicPage.screenshot({ path: join(EVIDENCE_DIR, "hosted-s2-public.png"), fullPage: true });
  await anonContext.close();

  // ── Stage 9: Cleanup — reset transform to 0,0,1,0 ──
  await page.goto(`/studio/${ROOM_ID}/editor`, { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible();
  await page.getByTestId("presence-studio-v2-outline-object").first().click();
  await page.getByTestId("presence-studio-v2-inspector-tab-motion").click();
  await page.getByRole("button", { name: "Wild" }).click();

  await xInput.fill("0");
  await yInput.fill("0");
  await scaleInput.fill("1");
  await rotationInput.fill("0");

  await page.getByTestId("presence-studio-v2-save").click();
  await expect(page.getByTestId("presence-studio-v2-saved")).toBeVisible({ timeout: 20_000 });

  // Verify cleanup persisted
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible();
  await page.getByTestId("presence-studio-v2-outline-object").first().click();
  await page.getByTestId("presence-studio-v2-inspector-tab-motion").click();

  await expect.poll(() => numberValue(page.getByTestId("presence-studio-v2-transform-x"))).toBe(0);
  await expect.poll(() => numberValue(page.getByTestId("presence-studio-v2-transform-y"))).toBe(0);
  await expect.poll(() => numberValue(page.getByTestId("presence-studio-v2-transform-scale"))).toBeCloseTo(1, 1);
  await expect.poll(() => numberValue(page.getByTestId("presence-studio-v2-transform-rotation"))).toBe(0);

  await page.screenshot({ path: join(EVIDENCE_DIR, "hosted-s2-after-cleanup.png"), fullPage: true });
});
