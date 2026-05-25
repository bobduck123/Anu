import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "playwright/test";

const evidenceDir = path.join(
  process.cwd(),
  "..",
  "docs",
  "program",
  "evidence",
  "presence-media-flow-v1-editor-ux-v1-5-integration-proof",
  "screenshots",
);

const titleMarker = "UX V1.5 Draft Room - Local Proof";

test("owner uses the simplified Studio and honest Media Flow without breaking draft to live boundaries", async ({ page, context, request }) => {
  mkdirSync(evidenceDir, { recursive: true });
  await request.post("http://127.0.0.1:5105/__test__/reset");
  await page.goto("/");
  await page.evaluate(() => window.localStorage.setItem("presence:e2e:access_token", "owner-test-token"));

  await page.goto("/studio/101/editor", { waitUntil: "networkidle" });
  await expect(page.getByRole("button", { name: "Build", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Look", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Images", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Preview", exact: true })).toBeVisible();
  await expect(page.getByTestId("draft-live-status-strip")).toContainText("Live room");
  await expect(page.getByRole("button", { name: "Assets" })).toHaveCount(0);
  await expect(page.getByText("Renderer")).toHaveCount(0);
  await expect(
    page.getByText(/editable_config|asset_config|content_config|style_dna|motion_config|payload|schema/i),
  ).toHaveCount(0);
  await page.screenshot({ path: path.join(evidenceDir, "build-mode-default.png"), fullPage: true });
  await page.screenshot({ path: path.join(evidenceDir, "advanced-controls-demoted.png"), fullPage: true });

  await page.locator('[data-canvas-id="hero-title"]').click();
  await page.getByTestId("canvas-mini-toolbar").getByRole("button", { name: "Edit text" }).click();
  await page.getByLabel("Edit Room title").fill(titleMarker);
  await page.getByLabel("Edit Room title").press("Enter");
  await expect(page.getByTestId("draft-save-feedback")).toContainText("All changes saved");
  await page.screenshot({ path: path.join(evidenceDir, "selected-element-inspector.png"), fullPage: true });

  await page.getByRole("button", { name: "Look", exact: true }).click();
  await expect(page.getByTestId("look-panel")).toBeVisible();
  await expect(page.getByTestId("font-picker")).toBeVisible();
  await page.getByLabel("Heading font").selectOption("instrument-serif");
  await expect(page.getByText("All changes saved to your draft room.")).toBeVisible();
  await page.getByTestId("option-pack-picker").getByRole("button", { name: /Ink Room/ }).click();
  await expect(page.getByText("All changes saved to your draft room.")).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "look-font-palette-controls.png"), fullPage: true });

  await page.getByRole("button", { name: "Images", exact: true }).click();
  const drawer = page.getByTestId("media-drawer");
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText("Your room");
  await page.screenshot({ path: path.join(evidenceDir, "images-media-drawer.png"), fullPage: true });
  await drawer.getByRole("tab", { name: "+ Upload" }).click();
  await expect(drawer.getByTestId("media-upload-deferred")).toContainText("Upload coming soon");
  await page.screenshot({ path: path.join(evidenceDir, "upload-honest-deferral.png"), fullPage: true });

  await drawer.getByRole("tab", { name: "Your room" }).click();
  await drawer.getByRole("button", { name: /Bridle Road/ }).first().click();
  await drawer.getByRole("button", { name: "Use this image" }).click();
  await expect(drawer).toContainText("Image updated - saved to draft");
  await drawer.getByLabel("Media alt text").fill("");
  await drawer.getByRole("button", { name: "Save alt text" }).click();
  await expect(drawer).toContainText("Alt text saved to draft");
  await page.getByRole("button", { name: "Build", exact: true }).click();
  await expect(page.getByText("Add alt text")).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "inline-readiness-chip.png"), fullPage: true });

  await page.getByRole("button", { name: "Images", exact: true }).click();
  await drawer.getByLabel("Media alt text").fill("Bridle Road in layered watercolour");
  await drawer.getByRole("button", { name: "Save alt text" }).click();
  await expect(drawer).toContainText("Alt text saved to draft");
  await page.screenshot({ path: path.join(evidenceDir, "image-detail-alt-text.png"), fullPage: true });

  const publicBefore = await context.newPage();
  await publicBefore.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await expect(publicBefore.getByText(titleMarker)).toHaveCount(0);
  await publicBefore.close();

  await page.getByRole("link", { name: "Preview your draft" }).first().click();
  await expect(page.getByText("Draft preview - only you can see this")).toBeVisible();
  await expect(page.getByText(titleMarker)).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "private-preview.png"), fullPage: true });

  await page.getByTestId("preview-open-to-visitors").click();
  await expect(page.getByRole("dialog", { name: "Open your room to visitors?" })).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "publish-confirmation.png"), fullPage: true });
  await page.getByRole("dialog", { name: "Open your room to visitors?" }).getByRole("button", { name: "Open room to visitors" }).click();

  await page.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await expect(page.getByText(titleMarker)).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "public-after-open.png"), fullPage: true });

  const roomKey = await context.newPage();
  await roomKey.goto("/r/test-room-key-token", { waitUntil: "networkidle" });
  await expect(roomKey.getByText(titleMarker)).toBeVisible();
  await roomKey.close();

  await request.post("http://127.0.0.1:5105/__test__/reset");
});
