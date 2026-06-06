import { expect, test, type APIRequestContext, type Locator, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";

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
}

async function setRangeValue(locator: Locator, value: string) {
  await locator.fill(value);
}

test("Studio V2 S3 inspector shows image, link, and public visibility context", async ({ page, request }) => {
  await openStudioV2Editor(page, request);

  await page.getByTestId("presence-studio-v2-outline-object").filter({ hasText: "Bridle Road" }).click();
  await expect(page.getByTestId("presence-studio-v2-inspector-image-preview")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-object-state-summary")).toContainText("Locked");
  await expect(page.getByTestId("presence-studio-v2-inspector-link-status")).toContainText("No link target set");
  await expect(page.getByText("Visible in the public room. Included on mobile.")).toBeVisible();

  await page.getByTestId("presence-studio-v2-outline-object").filter({ hasText: "Desktop-only proof" }).click();
  await expect(page.getByTestId("presence-studio-v2-inspector-image-empty")).toBeVisible();
  await page.getByTestId("studio-v2-object-link").fill("https://example.com/studio");
  await expect(page.getByTestId("presence-studio-v2-inspector-link-status")).toContainText("example.com");
  await expect(page.getByText("Upload and crop tools are not part of this build.")).toBeVisible();
});

test("Studio V2 S3 motion controls stay synced with direct-manipulation transform fields", async ({ page, request }) => {
  await openStudioV2Editor(page, request);

  await page.getByTestId("presence-studio-v2-outline-object").filter({ hasText: "Desktop-only proof" }).click();
  await page.getByTestId("presence-studio-v2-inspector-tab-motion").click();
  await expect(page.getByTestId("presence-studio-v2-motion-mode-note")).toContainText("Guided Mode protects the layout");

  await page.getByRole("button", { name: "Wild" }).click();
  await expect(page.getByTestId("presence-studio-v2-motion-mode-note")).toContainText("Drag the selected object on the canvas");

  await page.getByTestId("presence-studio-v2-transform-x-plus").click();
  await expect(page.getByTestId("presence-studio-v2-transform-x")).toHaveValue("10");

  await setRangeValue(page.getByTestId("presence-studio-v2-transform-scale-slider"), "1.5");
  await expect(page.getByTestId("presence-studio-v2-transform-scale")).toHaveValue("1.5");

  await setRangeValue(page.getByTestId("presence-studio-v2-transform-rotation-slider"), "32");
  await expect(page.getByTestId("presence-studio-v2-transform-rotation")).toHaveValue("32");
  await expect(page.getByTestId("presence-studio-v2-object-state-summary")).toContainText("Transformed");
});

test("Studio V2 S3 device frames and compact layout controls remain usable", async ({ page, request }) => {
  await openStudioV2Editor(page, request);

  await expect(page.getByTestId("presence-studio-v2-device-frame")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-device-label")).toContainText("Desktop public room preview");

  await page.getByTestId("presence-studio-v2-viewport-mobile").click();
  await expect(page.getByTestId("presence-studio-v2-device-label")).toContainText("Mobile public room preview");

  await page.setViewportSize({ width: 1080, height: 820 });
  await expect(page.getByTestId("presence-studio-v2-save")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-outline-toggle")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-inspector-toggle")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("presence-studio-v2-save")).toBeVisible();
  await page.getByTestId("presence-studio-v2-inspector-toggle").click();
  await expect(page.getByTestId("presence-studio-v2-inspector")).toBeHidden();
  await page.getByTestId("presence-studio-v2-inspector-toggle").click();
  await expect(page.getByTestId("presence-studio-v2-inspector")).toBeVisible();
});

test("Studio V2 S3 preview confidence is honest and editor state stays out of public render", async ({ page, request }) => {
  await openStudioV2Editor(page, request);

  await expect(page.getByTestId("presence-studio-v2-preview-confidence")).toContainText("Ready to preview");
  await expect(page.getByTestId("presence-studio-v2-preview-confidence")).toContainText("Publishing still happens through the real preview and publish flow");
  await page.getByTestId("presence-studio-v2-field-title").locator("input").fill("Mara Vale Studio V2 Draft S3");
  await expect(page.getByTestId("presence-studio-v2-dirty")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-preview-confidence")).toContainText("Save before sharing");

  await page.goto("/p/v2-public-room", { waitUntil: "networkidle" });
  await expect(page.locator(".presence-studio-v2-public")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-inspector")).toHaveCount(0);
  await expect(page.getByTestId("presence-studio-v2-device-frame")).toHaveCount(0);
  await expect(page.getByText("Hidden from public")).toHaveCount(0);
  await expect(page.getByText("Unsaved draft")).toHaveCount(0);
});
