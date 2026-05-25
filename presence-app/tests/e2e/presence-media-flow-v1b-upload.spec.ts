import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "playwright/test";

const evidenceDir = path.join(
  process.cwd(),
  "..",
  "docs",
  "program",
  "evidence",
  "presence-media-flow-v1b-upload-proof",
  "screenshots",
);

const uploadedSrc = "uploaded=v1b-proof";
const restrictedPublicHtmlTerms = [
  "editable_config",
  "asset_config",
  "content_config",
  "style_dna",
  "motion_config",
  "draft_config",
  "owner_user_id",
  "auth_subject",
  "platform_admin",
  "internal_lifetime_free",
  "preview_token",
  "bearer",
  "service_role",
];

test("owner uploads an image into the draft, previews it, and publishes intentionally", async ({ page, context, request }) => {
  mkdirSync(evidenceDir, { recursive: true });
  await request.post("http://127.0.0.1:5105/__test__/reset");
  await page.goto("/");
  await page.evaluate(() => window.localStorage.setItem("presence:e2e:access_token", "owner-test-token"));
  await page.goto("/studio/101/editor", { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "Images", exact: true }).click();
  const drawer = page.getByTestId("media-drawer");
  await drawer.getByRole("tab", { name: "+ Upload" }).click();
  await expect(drawer.getByTestId("media-upload-panel")).toContainText("Visitors will not see it in the room until you open the room");
  await drawer.getByLabel("Choose image file").setInputFiles({
    name: "v1b-cover.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
  });
  await expect(drawer.getByText("Image checked and ready to upload.")).toBeVisible();
  await drawer.getByLabel("Uploaded image alt text").fill("Uploaded cover image for the studio room.");
  await drawer.getByTestId("media-upload-panel").getByRole("button", { name: "Upload image" }).click();
  await expect(drawer).toContainText("Upload ready in your Draft room");
  await page.screenshot({ path: path.join(evidenceDir, "upload-ready-in-draft.png"), fullPage: true });

  await drawer.getByRole("button", { name: "Use this image" }).click();
  await expect(drawer).toContainText("Image updated - saved to draft");
  await page.screenshot({ path: path.join(evidenceDir, "uploaded-image-assigned-to-cover.png"), fullPage: true });

  const publicBefore = await context.newPage();
  await publicBefore.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await expect(publicBefore.locator(`img[src*="${uploadedSrc}"]`)).toHaveCount(0);
  await expectPublicHtmlClean(publicBefore);
  await publicBefore.close();

  await page.getByRole("link", { name: "Preview your draft" }).first().click();
  await expect(page.getByText("Draft preview - only you can see this")).toBeVisible();
  await expect(page.locator(`img[src*="${uploadedSrc}"]`).first()).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "private-preview-uploaded-image.png"), fullPage: true });

  await page.getByTestId("preview-open-to-visitors").click();
  await expect(page.getByRole("dialog", { name: "Open your room to visitors?" })).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "upload-publish-confirmation.png"), fullPage: true });
  await page.getByRole("dialog", { name: "Open your room to visitors?" }).getByRole("button", { name: "Open room to visitors" }).click();

  await page.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await expect(page.locator(`img[src*="${uploadedSrc}"]`).first()).toBeVisible();
  await expectPublicHtmlClean(page);
  await page.screenshot({ path: path.join(evidenceDir, "public-after-upload-publish.png"), fullPage: true });

  const roomKey = await context.newPage();
  await roomKey.goto("/r/test-room-key-token", { waitUntil: "networkidle" });
  await expect(roomKey.locator(`img[src*="${uploadedSrc}"]`).first()).toBeVisible();
  await expect(roomKey.getByText(/owner_user_id|auth_subject|platform_admin|internal_lifetime_free/i)).toHaveCount(0);
  await roomKey.close();
  await request.post("http://127.0.0.1:5105/__test__/reset");
});

async function expectPublicHtmlClean(page: import("playwright/test").Page) {
  const html = (await page.content()).toLowerCase();
  for (const term of restrictedPublicHtmlTerms) {
    expect(html, `anonymous public HTML exposed ${term}`).not.toContain(term);
  }
}
