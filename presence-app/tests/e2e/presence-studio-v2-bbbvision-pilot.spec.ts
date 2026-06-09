import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type APIRequestContext, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";
const evidenceDir = path.join(process.cwd(), "docs", "program", "evidence", "presence-studio-v2-bbbvision-pilot");

const restrictedPublicTerms = [
  "Public output style",
  "presence-studio-v2-public-style-selector",
  "presence-studio-v2-public-style-option",
  "Room Assets",
  "Media health",
  "Possible test asset",
  "Replace image URL",
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
  "owner-test-token",
  "non-owner-token",
  "presence-studio-v2-toolbar",
  "presence-studio-v2-panel",
  "presence-studio-v2-selection-frame",
  "presence-studio-v2-resize-handle",
  "presence-studio-v2-rotate-handle",
  "localstorage",
  "templatekit",
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
  await expect(page.getByTestId("presence-studio-v2-field-title").locator("input")).toHaveValue("bbb.vision");
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

async function expectPublicHygiene(page: Page) {
  const html = (await page.content()).toLowerCase();
  const text = (await page.locator("body").innerText()).toLowerCase();
  for (const term of restrictedPublicTerms) {
    const lowered = term.toLowerCase();
    expect(html, `public HTML exposed ${term}`).not.toContain(lowered);
    expect(text, `public text exposed ${term}`).not.toContain(lowered);
  }
  await expect(page.getByText(/\b\d+\s+objects?\b/i)).toHaveCount(0);
  await expect(page.getByText(/\bobject\s+count\b/i)).toHaveCount(0);
}

test("bbbvision threshold gallery is selectable, editable, persistent, public-safe, and reversible", async ({
  page,
  request,
  context,
}) => {
  await openBbbVisionStudio(page, request);

  await expect(page.getByTestId("presence-studio-v2-public-style-selector")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-public-style-option")).toHaveCount(3);
  await expect(page.getByTestId("presence-studio-v2-public-style-option").filter({ hasText: "Gallery P2" })).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-public-style-option").filter({ hasText: "Christina / Liquid Gallery" })).toBeVisible();
  const bbbOption = page.getByTestId("presence-studio-v2-public-style-option").filter({ hasText: "bbb.vision / Threshold Gallery" });
  await expect(bbbOption).toBeVisible();
  await screenshot(page, "01-studio-style-selector-bbbvision-option.png");

  await bbbOption.click();
  await expect(page.getByTestId("presence-studio-v2-public-style-current")).toContainText("bbb.vision / Threshold Gallery");
  await expect(page.getByTestId("presence-studio-v2-dirty")).toBeVisible();
  await screenshot(page, "02-studio-bbbvision-selected-dirty.png");

  await saveDraft(page);
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-public-style-current")).toContainText("bbb.vision / Threshold Gallery");

  await page.goto("/studio/101/editor/preview", { waitUntil: "networkidle" });
  await expect(page.getByText("Draft preview - only you can see this")).toBeVisible();
  await expect(page.getByTestId("presence-public-style-bbbvision-threshold-gallery")).toBeVisible();
  await expect(page.getByTestId("presence-public-bbbvision-threshold")).toBeVisible();
  await expect(page.getByTestId("presence-public-bbbvision-enter")).toBeVisible();
  await screenshot(page, "03-owner-preview-bbbvision-threshold.png");

  await page.getByTestId("presence-public-bbbvision-enter").click();
  await expect(page.getByTestId("presence-public-bbbvision-gallery")).toBeVisible();
  await expect(page.getByTestId("presence-public-bbbvision-next")).toBeVisible();
  await page.waitForTimeout(650);
  await screenshot(page, "04-owner-preview-bbbvision-gallery.png");

  await page.getByTestId("presence-public-bbbvision-next").click();
  await page.waitForTimeout(650);
  await page.locator(".v2-bbb-stage-button").click();
  await expect(page.getByTestId("presence-public-artwork-focus")).toBeVisible();
  await screenshot(page, "05-owner-preview-bbbvision-focus.png");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("presence-public-artwork-focus")).toHaveCount(0);

  await publishDraft(request);
  await page.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-public-style-bbbvision-threshold-gallery")).toBeVisible();
  await expect(page.getByTestId("presence-public-bbbvision-threshold")).toBeVisible();
  await expect(page.getByTestId("presence-public-bbbvision-gallery")).toHaveCount(0);
  await expect(page.getByText("Room Assets")).toHaveCount(0);
  await expect(page.getByText("Public output style")).toHaveCount(0);
  await expectPublicHygiene(page);
  await screenshot(page, "06-public-bbbvision-threshold-local.png");

  await page.getByTestId("presence-public-bbbvision-enter").click();
  await expect(page.getByTestId("presence-public-bbbvision-gallery")).toBeVisible();
  await page.waitForTimeout(650);
  await screenshot(page, "07-public-bbbvision-gallery-local.png");

  const mobile = await context.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await expect(mobile.getByTestId("presence-public-style-bbbvision-threshold-gallery")).toBeVisible();
  await expect(mobile.getByTestId("presence-public-bbbvision-enter")).toBeVisible();
  await expectPublicHygiene(mobile);
  await mobile.screenshot({ path: path.join(evidenceDir, "08-mobile-bbbvision-threshold.png"), fullPage: false });
  await mobile.getByTestId("presence-public-bbbvision-enter").click();
  await expect(mobile.getByTestId("presence-public-bbbvision-gallery")).toBeVisible();
  await mobile.waitForTimeout(650);
  await mobile.screenshot({ path: path.join(evidenceDir, "09-mobile-bbbvision-gallery.png"), fullPage: false });
  await mobile.close();

  await page.goto("/studio/101/editor", { waitUntil: "networkidle" });
  await page.getByTestId("presence-studio-v2-public-style-option").filter({ hasText: "Gallery P2" }).click();
  await expect(page.getByTestId("presence-studio-v2-public-style-current")).toContainText("Gallery P2");
  await saveDraft(page);
  await publishDraft(request);
  await screenshot(page, "10-switch-back-gallery-p2.png");

  await page.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await expect(page.locator(".presence-studio-v2-public.world-gallery")).toBeVisible();
  await expect(page.getByTestId("presence-public-style-bbbvision-threshold-gallery")).toHaveCount(0);
  await screenshot(page, "11-public-gallery-p2-restored.png");

  await page.goto("/studio/101/editor", { waitUntil: "networkidle" });
  await page.getByTestId("presence-studio-v2-public-style-option").filter({ hasText: "Christina / Liquid Gallery" }).click();
  await expect(page.getByTestId("presence-studio-v2-public-style-current")).toContainText("Christina / Liquid Gallery");
  await saveDraft(page);
  await publishDraft(request);
  await page.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-public-style-christina-liquid-gallery")).toBeVisible();
  await screenshot(page, "12-public-christina-switch-proof.png");

  await page.goto("/p/rooms-gallery-painter", { waitUntil: "networkidle" });
  await expect(page.getByText("Gallery Painter Fixture").first()).toBeVisible();
  await expect(page.locator(".presence-studio-v2-public")).toHaveCount(0);
  await screenshot(page, "13-legacy-negative.png");

  const otherOwner = await context.newPage();
  await signInOwner(otherOwner, "non-owner-token");
  await otherOwner.goto("/studio/101/editor", { waitUntil: "networkidle" });
  await expect(otherOwner.getByText("You do not have access to this Room.")).toBeVisible();
  await otherOwner.screenshot({ path: path.join(evidenceDir, "14-owner-rbac-negative.png"), fullPage: false });
  await otherOwner.close();
});
