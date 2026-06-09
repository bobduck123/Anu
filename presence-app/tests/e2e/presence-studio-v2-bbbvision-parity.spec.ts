import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type APIRequestContext, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";
const evidenceDir = path.join(
  process.cwd(),
  "docs",
  "program",
  "evidence",
  "presence-v3-chamber-dynamics-p4-public-renderer",
);

const restrictedPublicTerms = [
  "editable_config",
  "draft",
  "hiddenpublic",
  "hiddenmobile",
  "locked",
  "pinned",
  "Room Assets",
  "Public output style",
  "Replace image URL",
  "presence-studio-v2-assets-panel",
  "presence-studio-v2-public-style-selector",
  "TemplateKit",
  "localStorage",
  "auth_token",
  "access_token",
  "service_role",
  "bearer ",
  "/api/presence/owner",
  "/studio/",
  "private_draft",
  "storage_key",
];

const restrictedPublicVisibleTerms = [
  "metadata",
  "isEntry",
  "isDefault",
  "role:",
  "chamber role",
  "chamber metadata",
  "data-chamber",
];

async function signInOwner(page: Page, token = "owner-test-token") {
  await page.goto("/");
  await page.evaluate((value) => window.localStorage.setItem("presence:e2e:access_token", value), token);
}

async function openBbbVisionStudio(page: Page, request: APIRequestContext) {
  await request.post(`${API_BASE}/__test__/reset`);
  await request.post(`${API_BASE}/__test__/state`, {
    data: { useBbbVisionPilot: true },
  });
  await signInOwner(page);
  await page.goto("/studio/101/editor", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible();
  await fs.mkdir(evidenceDir, { recursive: true });
}

async function saveDraft(page: Page) {
  const saveResponse = page.waitForResponse(
    (response) => response.url().includes("/api/presence/owner/rooms/101/editor/draft") && response.ok(),
  );
  await page.getByTestId("presence-studio-v2-save").click();
  await saveResponse;
  await expect(page.getByTestId("presence-studio-v2-saved")).toBeVisible();
}

async function publishDraft(request: APIRequestContext) {
  const response = await request.post(`${API_BASE}/api/presence/owner/rooms/101/editor/publish`, {
    headers: { Authorization: "Bearer owner-test-token" },
  });
  expect(response.ok()).toBeTruthy();
}

async function screenshot(page: Page, fileName: string) {
  await page.screenshot({ path: path.join(evidenceDir, fileName), fullPage: false });
}

async function expectThresholdOnly(page: Page) {
  await expect(page.getByTestId("presence-public-style-bbbvision-threshold-gallery")).toBeVisible();
  await expect(page.getByTestId("presence-public-bbbvision-threshold")).toBeVisible();
  await expect(page.getByTestId("presence-public-bbbvision-gallery")).toHaveCount(0);
  await expect(page.getByTestId("presence-public-bbbvision-practice")).toHaveCount(0);
  await expect(page.getByText(/\b\d+\s+objects?\b/i)).toHaveCount(0);
  await expect(page.getByText(/\bobject\s+count\b/i)).toHaveCount(0);
}

async function expectPublicHygiene(page: Page) {
  const html = (await page.content()).toLowerCase();
  const text = (await page.locator("body").innerText()).toLowerCase();
  for (const term of restrictedPublicTerms) {
    const lowered = term.toLowerCase();
    expect(html, `public HTML exposed ${term}`).not.toContain(lowered);
    expect(text, `public text exposed ${term}`).not.toContain(lowered);
  }
  for (const term of restrictedPublicVisibleTerms) {
    expect(text, `public visible text exposed ${term}`).not.toContain(term.toLowerCase());
  }
}

async function selectBbbVisionStyle(page: Page) {
  await page.getByTestId("presence-studio-v2-public-style-option").filter({ hasText: "bbb.vision / Threshold Gallery" }).click();
  await expect(page.getByTestId("presence-studio-v2-public-style-current")).toContainText("bbb.vision / Threshold Gallery");
}

async function selectChamber(page: Page, index: number) {
  const chamber = page.getByTestId("presence-studio-v2-outline-chamber").nth(index);
  await chamber.locator("button.v2-outline-chamber-name").click();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("presence-studio-v2-chamber-dynamics")).toBeVisible();
}

async function setChamberDynamics(
  page: Page,
  index: number,
  options: {
    role?: string;
    layout?: string;
    transition?: string;
    entry?: boolean;
    default?: boolean;
  },
) {
  await selectChamber(page, index);
  if (options.role) await page.getByTestId("presence-studio-v2-chamber-role").selectOption(options.role);
  if (options.layout) await page.getByTestId("presence-studio-v2-chamber-layout").selectOption(options.layout);
  if (options.transition) await page.getByTestId("presence-studio-v2-chamber-transition").selectOption(options.transition);
  if (options.entry) await page.getByTestId("presence-studio-v2-chamber-entry-toggle").check();
  if (options.default) await page.getByTestId("presence-studio-v2-chamber-default-toggle").check();
}

test("bbbvision public output opens as a threshold and moves into a distinct gallery state", async ({
  page,
  request,
  context,
}) => {
  await openBbbVisionStudio(page, request);

  await selectBbbVisionStyle(page);
  await saveDraft(page);
  await screenshot(page, "01-studio-style-selector-bbbvision.png");

  await page.goto("/studio/101/editor/preview", { waitUntil: "networkidle" });
  await expect(page.getByText("Draft preview - only you can see this")).toBeVisible();
  await expectThresholdOnly(page);
  await expect(page.getByTestId("presence-public-bbbvision-threshold")).toHaveAttribute("data-chamber-role", "fallback");
  await screenshot(page, "02-owner-preview-threshold.png");

  await page.getByTestId("presence-public-bbbvision-enter").click();
  await expect(page.getByTestId("presence-public-bbbvision-gallery")).toBeVisible();
  await expect(page.getByTestId("presence-public-bbbvision-gallery")).toHaveAttribute("data-chamber-role", "fallback");
  await expect(page.getByTestId("presence-public-bbbvision-threshold")).toHaveCount(0);
  await expect(page.getByTestId("presence-public-bbbvision-constellation")).toBeVisible();
  await expect(page.locator(".v2-bbb-star")).toHaveCount(4);
  await page.waitForTimeout(650);
  const initialProgress = await page.getByTestId("presence-public-bbbvision-progress").innerText();
  await screenshot(page, "03-owner-preview-gallery-active.png");

  // Keyboard navigate right
  await page.keyboard.press("ArrowRight");
  await expect.poll(async () => page.getByTestId("presence-public-bbbvision-progress").innerText()).not.toBe(initialProgress);
  const afterRightProgress = await page.getByTestId("presence-public-bbbvision-progress").innerText();
  await page.waitForTimeout(300);
  await screenshot(page, "04-owner-preview-gallery-next.png");

  // Keyboard navigate left back to initial
  await page.keyboard.press("ArrowLeft");
  await expect.poll(async () => page.getByTestId("presence-public-bbbvision-progress").innerText()).toBe(initialProgress);
  await page.waitForTimeout(300);
  await screenshot(page, "05-owner-preview-gallery-prev.png");

  // Click a constellation star to open focus overlay
  const stars = page.locator(".v2-bbb-star");
  await stars.nth(1).click({ force: true });
  await expect(page.getByTestId("presence-public-bbbvision-focus")).toBeVisible();
  await expect(page.getByTestId("presence-public-bbbvision-focus-image")).toBeVisible();
  await page.waitForTimeout(300);
  await screenshot(page, "06-owner-preview-gallery-focus.png");

  // Close focus with Escape
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("presence-public-bbbvision-focus")).toHaveCount(0);

  await page.getByTestId("presence-public-bbbvision-practice-link").click();
  await expect(page.getByTestId("presence-public-bbbvision-practice")).toBeVisible();
  await expect(page.getByTestId("presence-public-bbbvision-gallery")).toHaveCount(0);
  await screenshot(page, "07-owner-preview-practice.png");

  await publishDraft(request);
  await page.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await expectThresholdOnly(page);
  await expect(page.getByTestId("presence-public-bbbvision-threshold")).toHaveAttribute("data-chamber-role", "fallback");
  await expect(page.getByText("Editable practice note")).toHaveCount(0);
  await expectPublicHygiene(page);
  await screenshot(page, "08-public-p-threshold.png");

  await page.getByTestId("presence-public-bbbvision-enter").click();
  await expect(page.getByTestId("presence-public-bbbvision-gallery")).toBeVisible();
  await expect(page.getByTestId("presence-public-bbbvision-constellation")).toBeVisible();
  await page.waitForTimeout(650);
  await screenshot(page, "09-public-p-gallery.png");
  await page.goBack();
  await expectThresholdOnly(page);

  await page.goto("/presence/test-presence-room", { waitUntil: "networkidle" });
  await expectThresholdOnly(page);
  await screenshot(page, "10-public-presence-threshold.png");

  const mobile = await context.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await expectThresholdOnly(mobile);
  await screenshot(mobile, "11-mobile-threshold.png");
  await mobile.getByTestId("presence-public-bbbvision-enter").click();
  await expect(mobile.getByTestId("presence-public-bbbvision-gallery")).toBeVisible();
  await expect(mobile.getByTestId("presence-public-bbbvision-constellation")).toBeVisible();
  await expect(mobile.locator(".v2-bbb-star")).toHaveCount(4);
  await mobile.waitForTimeout(650);
  await screenshot(mobile, "12-mobile-gallery.png");
  await mobile.close();

  const reducedMotion = await context.newPage();
  await reducedMotion.emulateMedia({ reducedMotion: "reduce" });
  await reducedMotion.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await expectThresholdOnly(reducedMotion);
  await reducedMotion.getByTestId("presence-public-bbbvision-enter").click();
  await expect(reducedMotion.getByTestId("presence-public-bbbvision-gallery")).toBeVisible();
  await expect(reducedMotion.getByTestId("presence-public-bbbvision-constellation")).toBeVisible();
  await reducedMotion.waitForTimeout(100);
  await screenshot(reducedMotion, "13-reduced-motion-gallery.png");
  await reducedMotion.close();

  await page.goto("/p/rooms-gallery-painter", { waitUntil: "networkidle" });
  await expect(page.locator(".presence-studio-v2-public")).toHaveCount(0);
  await screenshot(page, "14-legacy-negative.png");
});

test("bbbvision public state flow consumes chamber metadata when authored", async ({ page, request }) => {
  await openBbbVisionStudio(page, request);

  await selectBbbVisionStyle(page);
  await setChamberDynamics(page, 0, {
    role: "threshold",
    layout: "focus",
    transition: "recede",
    entry: true,
  });
  await setChamberDynamics(page, 1, {
    role: "gallery",
    layout: "field",
    transition: "fade",
    default: true,
  });
  await page.getByTestId("presence-studio-v2-add-chamber").click();
  await setChamberDynamics(page, 2, {
    role: "practice",
    layout: "stack",
    transition: "fade",
  });
  await saveDraft(page);
  await screenshot(page, "15-studio-metadata-authored-chambers.png");

  await page.goto("/studio/101/editor/preview", { waitUntil: "networkidle" });
  await expectThresholdOnly(page);
  const previewThreshold = page.getByTestId("presence-public-bbbvision-threshold");
  await expect(previewThreshold).toHaveAttribute("data-chamber-role", "threshold");
  await expect(previewThreshold).toHaveAttribute("data-chamber-layout", "focus");
  await expect(previewThreshold).toHaveAttribute("data-chamber-transition", "recede");
  await expect(page.locator(".v2-bbb-dot-nav button")).toHaveCount(2);
  await screenshot(page, "16-preview-metadata-threshold.png");

  await page.getByTestId("presence-public-bbbvision-enter").click();
  const previewGallery = page.getByTestId("presence-public-bbbvision-gallery");
  await expect(previewGallery).toBeVisible();
  await expect(previewGallery).toHaveAttribute("data-chamber-role", "gallery");
  await expect(previewGallery).toHaveAttribute("data-chamber-layout", "field");
  await expect(previewGallery).toHaveAttribute("data-chamber-transition", "fade");
  await expect(page.getByTestId("presence-public-bbbvision-constellation")).toBeVisible();
  await expect(page.locator(".v2-bbb-star")).toHaveCount(2);
  await expect(page.getByTestId("presence-public-bbbvision-progress")).toContainText("01 / 02");
  await screenshot(page, "17-preview-metadata-gallery.png");

  await page.getByTestId("presence-public-bbbvision-practice-link").click();
  const previewPractice = page.getByTestId("presence-public-bbbvision-practice");
  await expect(previewPractice).toBeVisible();
  await expect(previewPractice).toHaveAttribute("data-chamber-role", "practice");
  await expect(previewPractice).toHaveAttribute("data-chamber-layout", "stack");
  await screenshot(page, "18-preview-metadata-practice.png");

  await publishDraft(request);
  await page.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await expectThresholdOnly(page);
  await expect(page.getByTestId("presence-public-bbbvision-threshold")).toHaveAttribute("data-chamber-role", "threshold");
  await expect(page.locator(".v2-bbb-dot-nav button")).toHaveCount(2);
  await expectPublicHygiene(page);
  await screenshot(page, "19-public-metadata-threshold.png");

  await page.getByTestId("presence-public-bbbvision-enter").click();
  await expect(page.getByTestId("presence-public-bbbvision-gallery")).toBeVisible();
  await expect(page.getByTestId("presence-public-bbbvision-gallery")).toHaveAttribute("data-chamber-role", "gallery");
  await expect(page.getByTestId("presence-public-bbbvision-constellation")).toBeVisible();
  await expect(page.getByTestId("presence-public-bbbvision-progress")).toContainText("01 / 02");
  await screenshot(page, "20-public-metadata-gallery.png");

  await page.getByTestId("presence-public-bbbvision-practice-link").click();
  await expect(page.getByTestId("presence-public-bbbvision-practice")).toBeVisible();
  await expect(page.getByTestId("presence-public-bbbvision-practice")).toHaveAttribute("data-chamber-role", "practice");
  await expectPublicHygiene(page);
  await screenshot(page, "21-public-metadata-practice.png");
});
