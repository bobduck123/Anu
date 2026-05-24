import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "playwright/test";

const evidenceDir = path.join(
  process.cwd(),
  "..",
  "docs",
  "program",
  "evidence",
  "presence-canvas-direct-manipulation-v1-integration-proof",
  "screenshots",
);

test("pilot owner edits the draft room directly on Canvas and publishes intentionally", async ({ page, context, request }) => {
  mkdirSync(evidenceDir, { recursive: true });
  await request.post("http://127.0.0.1:5105/__test__/reset");
  await page.goto("/");
  await page.evaluate(() => window.localStorage.setItem("presence:e2e:access_token", "owner-test-token"));

  await page.goto("/studio/101/editor", { waitUntil: "networkidle" });
  await expect(page.getByTestId("pilot-banner")).toContainText("Pilot mode");
  await expect(page.getByRole("button", { name: "Scenes" })).toHaveCount(0);
  await expect(page.locator('[data-canvas-id="hero-title"]')).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "canvas-default-view.png"), fullPage: true });
  await page.screenshot({ path: path.join(evidenceDir, "pilot-advanced-controls-demoted.png"), fullPage: true });

  await page.locator('[data-canvas-id="hero-title"]').click();
  await expect(page.getByTestId("canvas-mini-toolbar")).toContainText("Room title");
  await page.screenshot({ path: path.join(evidenceDir, "selected-title-mini-toolbar.png"), fullPage: true });

  await page.getByTestId("canvas-mini-toolbar").getByRole("button", { name: "Edit text" }).click();
  const titleInput = page.getByLabel("Edit Room title");
  await expect(titleInput).toBeVisible();
  await titleInput.fill("Colour as Memory - Canvas Draft");
  await page.screenshot({ path: path.join(evidenceDir, "inline-edit-active.png"), fullPage: true });
  await titleInput.press("Enter");
  await expect(page.getByTestId("draft-save-feedback")).toContainText("All changes saved");
  await page.screenshot({ path: path.join(evidenceDir, "saved-to-draft-feedback.png"), fullPage: true });

  const inspector = page.getByTestId("desktop-canvas-inspector");
  await inspector.getByRole("button", { name: "Feature" }).click();
  await expect(page.getByTestId("draft-save-feedback")).toContainText("Style saved");
  await page.getByRole("button", { name: "Practice" }).click();
  await page.locator('[data-canvas-id="main-statement"]').click();
  await inspector.getByRole("button", { name: "Accent" }).click();
  await page.getByTestId("canvas-mood-controls").getByRole("button", { name: "Warm", exact: true }).click();
  await expect(page.getByTestId("draft-save-feedback")).toContainText("Mood saved");
  await page.screenshot({ path: path.join(evidenceDir, "mood-and-text-style-on-canvas.png"), fullPage: true });

  const publicBeforePublish = await context.newPage();
  await publicBeforePublish.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await expect(publicBeforePublish.getByText("Colour as Memory")).toBeVisible();
  await expect(publicBeforePublish.getByText("Colour as Memory - Canvas Draft")).toHaveCount(0);
  await publicBeforePublish.close();

  await page.getByRole("button", { name: "Entrance" }).click();
  await page.locator('[data-canvas-id="hero-image"]').click();
  await page.getByTestId("canvas-mini-toolbar").getByRole("button", { name: "Change image" }).click();
  await expect(page.getByTestId("canvas-asset-picker")).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "selected-image-asset-picker.png"), fullPage: true });
  await page.getByTestId("canvas-asset-picker").getByRole("button", { name: /Bridle Road/ }).first().click();
  await expect(page.getByTestId("desktop-canvas-inspector").getByLabel("Alt text")).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "alt-text-editor.png"), fullPage: true });

  const altField = page.getByTestId("desktop-canvas-inspector").getByLabel("Alt text");
  await altField.fill("");
  await page.getByTestId("desktop-canvas-inspector").getByRole("button", { name: "Add alt text" }).click();
  await expect(page.getByTestId("readiness-chip-hero-image")).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "readiness-chip-on-image.png"), fullPage: true });
  await page.getByTestId("readiness-chip-hero-image").click();
  await altField.fill("Bridle Road watercolour detail");
  await page.getByTestId("desktop-canvas-inspector").getByRole("button", { name: "Add alt text" }).click();
  await expect(page.getByTestId("readiness-chip-hero-image")).toHaveCount(0);

  await page.getByRole("button", { name: "Work wall" }).click();
  await page.getByRole("button", { name: "Move work" }).first().click();
  await expect(page.getByTestId("work-wall-reorder")).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "work-reorder-before.png"), fullPage: true });
  await page.getByRole("button", { name: "Move Bridle Road up" }).click();
  await page.getByRole("button", { name: "Save work order" }).click();
  await expect(page.getByTestId("work-wall-reorder")).toHaveCount(0);
  await page.screenshot({ path: path.join(evidenceDir, "work-reorder-after.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 900 });
  await page.getByRole("button", { name: "Entrance" }).click();
  await page.locator('[data-canvas-id="hero-title"]').click();
  await expect(page.getByTestId("mobile-bottom-sheet-inspector")).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "mobile-bottom-sheet-inspector.png"), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.getByRole("link", { name: "Full preview" }).click();
  await expect(page.getByText("Draft preview not public")).toBeVisible();
  await expect(page.getByText("Colour as Memory - Canvas Draft")).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "full-preview-after-canvas-edits.png"), fullPage: true });

  await page.getByRole("button", { name: "Open room to visitors" }).click();
  await expect(page.getByText("Open this draft room?")).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "publish-open-to-visitors-confirmation.png"), fullPage: true });
  await page.getByRole("button", { name: "Open room to visitors" }).last().click();

  await page.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await expect(page.getByText("Colour as Memory - Canvas Draft")).toBeVisible();
});
