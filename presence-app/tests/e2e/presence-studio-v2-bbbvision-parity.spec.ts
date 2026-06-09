import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type APIRequestContext, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";
const evidenceDir = path.join(
  process.cwd(),
  "docs",
  "program",
  "evidence",
  "presence-studio-v2-bbbvision-parity-recovery",
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
}

test("bbbvision public output opens as a threshold and moves into a distinct gallery state", async ({
  page,
  request,
  context,
}) => {
  await openBbbVisionStudio(page, request);

  await page.getByTestId("presence-studio-v2-public-style-option").filter({ hasText: "bbb.vision / Threshold Gallery" }).click();
  await expect(page.getByTestId("presence-studio-v2-public-style-current")).toContainText("bbb.vision / Threshold Gallery");
  await saveDraft(page);
  await screenshot(page, "01-studio-style-selector-bbbvision.png");

  await page.goto("/studio/101/editor/preview", { waitUntil: "networkidle" });
  await expect(page.getByText("Draft preview - only you can see this")).toBeVisible();
  await expectThresholdOnly(page);
  await screenshot(page, "02-owner-preview-threshold.png");

  await page.getByTestId("presence-public-bbbvision-enter").click();
  await expect(page.getByTestId("presence-public-bbbvision-gallery")).toBeVisible();
  await expect(page.getByTestId("presence-public-bbbvision-threshold")).toHaveCount(0);
  await expect(page.getByTestId("presence-public-bbbvision-active-image")).toBeVisible();
  await page.waitForTimeout(650);
  const initialProgress = await page.getByTestId("presence-public-bbbvision-progress").innerText();
  const initialTitle = await page.getByTestId("presence-public-bbbvision-active-title").innerText();
  await screenshot(page, "03-owner-preview-gallery-active.png");

  await page.getByTestId("presence-public-bbbvision-next").click();
  await expect.poll(async () => page.getByTestId("presence-public-bbbvision-progress").innerText()).not.toBe(initialProgress);
  await expect.poll(async () => page.getByTestId("presence-public-bbbvision-active-title").innerText()).not.toBe(initialTitle);
  await page.waitForTimeout(650);
  await screenshot(page, "04-owner-preview-gallery-next.png");

  await page.getByTestId("presence-public-bbbvision-prev").click();
  await expect.poll(async () => page.getByTestId("presence-public-bbbvision-progress").innerText()).toBe(initialProgress);
  await page.waitForTimeout(650);
  await screenshot(page, "05-owner-preview-gallery-prev.png");

  await page.keyboard.press("ArrowRight");
  await expect.poll(async () => page.getByTestId("presence-public-bbbvision-progress").innerText()).not.toBe(initialProgress);
  await page.getByTestId("presence-public-bbbvision-practice-link").click();
  await expect(page.getByTestId("presence-public-bbbvision-practice")).toBeVisible();
  await expect(page.getByTestId("presence-public-bbbvision-gallery")).toHaveCount(0);
  await screenshot(page, "06-owner-preview-practice.png");

  await publishDraft(request);
  await page.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await expectThresholdOnly(page);
  await expect(page.getByText("Editable practice note")).toHaveCount(0);
  await expectPublicHygiene(page);
  await screenshot(page, "07-public-p-threshold.png");

  await page.getByTestId("presence-public-bbbvision-enter").click();
  await expect(page.getByTestId("presence-public-bbbvision-gallery")).toBeVisible();
  await expect(page.getByTestId("presence-public-bbbvision-active-image")).toBeVisible();
  await page.waitForTimeout(650);
  await screenshot(page, "08-public-p-gallery.png");
  await page.goBack();
  await expectThresholdOnly(page);

  await page.goto("/presence/test-presence-room", { waitUntil: "networkidle" });
  await expectThresholdOnly(page);
  await screenshot(page, "09-public-presence-threshold.png");

  const mobile = await context.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await expectThresholdOnly(mobile);
  await screenshot(mobile, "10-mobile-threshold.png");
  await mobile.getByTestId("presence-public-bbbvision-enter").click();
  await expect(mobile.getByTestId("presence-public-bbbvision-gallery")).toBeVisible();
  await expect(mobile.getByTestId("presence-public-bbbvision-next")).toBeVisible();
  await mobile.waitForTimeout(650);
  await screenshot(mobile, "11-mobile-gallery.png");
  await mobile.close();

  const reducedMotion = await context.newPage();
  await reducedMotion.emulateMedia({ reducedMotion: "reduce" });
  await reducedMotion.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await expectThresholdOnly(reducedMotion);
  await reducedMotion.getByTestId("presence-public-bbbvision-enter").click();
  await expect(reducedMotion.getByTestId("presence-public-bbbvision-gallery")).toBeVisible();
  await reducedMotion.waitForTimeout(100);
  await screenshot(reducedMotion, "12-reduced-motion-gallery.png");
  await reducedMotion.close();

  await page.goto("/p/rooms-gallery-painter", { waitUntil: "networkidle" });
  await expect(page.locator(".presence-studio-v2-public")).toHaveCount(0);
  await screenshot(page, "13-legacy-negative.png");
});
