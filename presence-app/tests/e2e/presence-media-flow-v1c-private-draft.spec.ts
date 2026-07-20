import { expect, test } from "playwright/test";

const api = "http://127.0.0.1:5105";
const draftMarker = "draft-preview=v1c-proof";
const publicMarker = "published=v1c-proof";

test("protected upload is visible in private preview and promoted for visitors only on publish", async ({ page, context, request }) => {
  await request.post(`${api}/__test__/reset`);
  await request.post(`${api}/__test__/state`, { data: { privateDraftMedia: true } });
  await page.goto("/");
  await page.evaluate(() => window.localStorage.setItem("presence:e2e:access_token", "owner-test-token"));
  await page.goto("/studio/101/editor", { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "Images", exact: true }).click();
  const drawer = page.getByTestId("media-drawer");
  await drawer.getByRole("tab", { name: "+ Upload" }).click();
  await drawer.getByLabel("Choose image file").setInputFiles({
    name: "private-cover.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
  });
  await drawer.getByLabel("Uploaded image alt text").fill("Protected draft cover");
  await drawer.getByTestId("media-upload-panel").getByRole("button", { name: "Upload image" }).click();
  await expect(drawer).toContainText("Only you can see this image until you open the room");
  await drawer.getByRole("button", { name: "Use this image" }).click();

  const publicBefore = await context.newPage();
  await publicBefore.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await expect(publicBefore.locator(`img[src*="${draftMarker}"]`)).toHaveCount(0);
  await expect(publicBefore.locator(`img[src*="${publicMarker}"]`)).toHaveCount(0);
  await publicBefore.close();

  await page.getByRole("link", { name: "Preview your draft" }).first().click();
  await expect(page.locator(`img[src*="${draftMarker}"]`).first()).toBeVisible();
  await page.getByTestId("preview-open-to-visitors").click();
  await page.getByRole("dialog", { name: "Open your room to visitors?" }).getByRole("button", { name: "Open room to visitors" }).click();

  await page.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await expect(page.locator(`img[src*="${publicMarker}"]`).first()).toBeVisible();
  await expect(page.locator(`img[src*="${draftMarker}"]`)).toHaveCount(0);
});
