import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type APIRequestContext, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";
const evidenceDir = path.join(process.cwd(), "docs", "program", "evidence", "presence-studio-v2-public-style-presets-s6a");

const restrictedPublicTerms = [
  "style_dna",
  "scene_config",
  "motion_config",
  "asset_config",
  "content_config",
  "roomkey_config",
  "enquiry_config",
  "editable_config",
  "room assets",
  "media health",
  "possible test asset",
  "replace image url",
  "public output style",
  "v2-toolbar",
  "v2-side-panel",
  "v2-float",
  "localstorage",
  "hiddenpublic",
  "hiddenmobile",
  "locked",
  "pinned",
];

async function signInOwner(page: Page) {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.setItem("presence:e2e:access_token", "owner-test-token"));
}

async function openStudioV2Editor(page: Page, request: APIRequestContext) {
  await request.post(`${API_BASE}/__test__/reset`);
  await request.post(`${API_BASE}/__test__/state`, {
    data: { useStudioV2DraftPreview: true },
  });
  await request.post(`${API_BASE}/api/presence/owner/rooms/101/editor/publish`, {
    headers: { Authorization: "Bearer owner-test-token" },
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

async function expectPublicHygiene(page: Page) {
  const html = (await page.content()).toLowerCase();
  for (const term of restrictedPublicTerms) {
    expect(html, `public render exposed ${term}`).not.toContain(term);
  }
}

test("Studio V2 public style presets persist and switch the public renderer safely", async ({ page, request }) => {
  await openStudioV2Editor(page, request);

  const selector = page.getByTestId("presence-studio-v2-public-style-selector");
  await expect(selector).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-public-style-current")).toContainText("Gallery P2");
  await expect(page.getByTestId("presence-studio-v2-public-style-option")).toHaveCount(3);
  await expect(page.getByTestId("presence-studio-v2-public-style-option").filter({ hasText: "bbb.vision / Threshold Gallery" })).toBeVisible();
  await screenshot(page, "01-studio-style-selector-gallery-p2.png");

  await page.getByTestId("presence-studio-v2-public-style-option").filter({ hasText: "Christina / Liquid Gallery" }).click();
  await expect(page.getByTestId("presence-studio-v2-public-style-current")).toContainText("Christina / Liquid Gallery");
  await expect(page.getByTestId("presence-studio-v2-dirty")).toBeVisible();
  await screenshot(page, "02-studio-style-selector-christina.png");

  await saveDraft(page);
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-public-style-current")).toContainText("Christina / Liquid Gallery");

  await page.goto("/studio/101/editor/preview", { waitUntil: "networkidle" });
  await expect(page.getByText("Draft preview - only you can see this")).toBeVisible();
  await expect(page.getByTestId("presence-public-style-christina-liquid-gallery")).toBeVisible();
  await expect(page.getByTestId("presence-public-liquid-sequence")).toBeVisible();
  await expect(page.getByTestId("presence-public-liquid-progress")).toContainText("01 / 01");
  await expect(page.getByTestId("presence-public-liquid-prev")).toBeVisible();
  await expect(page.getByTestId("presence-public-liquid-next")).toBeVisible();
  await screenshot(page, "03-owner-preview-christina-sequence.png");

  await page.locator(".v2-liquid-stage-image").click();
  await expect(page.getByTestId("presence-public-artwork-focus")).toBeVisible();
  await screenshot(page, "04-owner-preview-christina-focus.png");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("presence-public-artwork-focus")).toHaveCount(0);

  await publishDraft(request);
  await page.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-public-style-christina-liquid-gallery")).toBeVisible();
  await expect(page.getByText("Selected works pathway")).toBeVisible();
  await expect(page.getByText("Practice / about")).toBeVisible();
  await expect(page.getByText("Room Assets")).toHaveCount(0);
  await expect(page.getByText("Media health")).toHaveCount(0);
  await expect(page.getByText("Public output style")).toHaveCount(0);
  await expectPublicHygiene(page);
  await screenshot(page, "05-public-christina-clean.png");

  await page.goto("/presence/test-presence-room", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-public-style-christina-liquid-gallery")).toBeVisible();
  await expectPublicHygiene(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-public-style-christina-liquid-gallery")).toBeVisible();
  await expect(page.getByTestId("presence-public-liquid-sequence")).toBeVisible();
  await screenshot(page, "06-public-christina-mobile.png");

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/studio/101/editor", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible();
  await page.getByTestId("presence-studio-v2-public-style-option").filter({ hasText: "Gallery P2" }).click();
  await expect(page.getByTestId("presence-studio-v2-public-style-current")).toContainText("Gallery P2");
  await saveDraft(page);
  await publishDraft(request);
  await screenshot(page, "07-studio-style-switch-back-gallery-p2.png");

  await page.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await expect(page.locator(".presence-studio-v2-public.world-gallery")).toBeVisible();
  await expect(page.getByTestId("presence-public-style-christina-liquid-gallery")).toHaveCount(0);
  await expect(page.getByTestId("presence-public-liquid-progress")).toHaveCount(0);
  await screenshot(page, "08-public-gallery-p2-restored.png");

  await page.goto("/p/rooms-gallery-painter", { waitUntil: "networkidle" });
  await expect(page.getByText("Gallery Painter Fixture").first()).toBeVisible();
  await expect(page.locator(".presence-studio-v2-public")).toHaveCount(0);
  await screenshot(page, "09-legacy-negative.png");
});
