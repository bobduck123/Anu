import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "playwright/test";

const evidenceDir = path.join(
  process.cwd(),
  "..",
  "docs",
  "program",
  "evidence",
  "presence-canvas-builder-v2-p0-preview-publish-fix",
  "screenshots",
);

const marker = "P0 Publish Marker - Local Proof";

async function signInOwner(page: Page) {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.setItem("presence:e2e:access_token", "owner-test-token"));
}

test("owner draft preview survives a legacy node hydration failure while anonymous preview remains private", async ({ page, browser, request }) => {
  mkdirSync(evidenceDir, { recursive: true });
  await request.post("http://127.0.0.1:5105/__test__/reset");
  await signInOwner(page);

  await page.goto("/studio/101/editor", { waitUntil: "networkidle" });
  await page.locator('[data-canvas-id="hero-title"]').click();
  await page.getByTestId("canvas-mini-toolbar").getByRole("button", { name: "Edit text" }).click();
  await page.getByLabel("Edit Room title").fill(marker);
  await page.getByLabel("Edit Room title").press("Enter");
  await expect(page.getByTestId("draft-save-feedback")).toContainText("All changes saved");

  await page.route("**/api/presence/owner/nodes/101", async (route) => {
    await route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "forbidden", message: "Legacy node hydration denied." } }),
    });
  });
  await page.goto("/studio/101/editor/preview", { waitUntil: "networkidle" });
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByText("Draft preview not public")).toBeVisible();
  await expect(page.getByText(marker)).toBeVisible();
  await expect(page.getByText("Sign in to open this Presence")).toHaveCount(0);
  await page.screenshot({ path: path.join(evidenceDir, "owner-preview-renders-draft.png"), fullPage: true });

  const anonymousContext = await browser.newContext({ baseURL: "http://127.0.0.1:3100" });
  const anonymous = await anonymousContext.newPage();
  await anonymous.goto("/studio/101/editor/preview", { waitUntil: "networkidle" });
  await expect(anonymous.getByText("Sign in to open this Presence")).toBeVisible();
  await expect(anonymous.getByText(marker)).toHaveCount(0);
  await anonymous.screenshot({ path: path.join(evidenceDir, "anonymous-preview-denial.png"), fullPage: true });
  await anonymousContext.close();

  const otherOwnerContext = await browser.newContext({ baseURL: "http://127.0.0.1:3100" });
  const otherOwner = await otherOwnerContext.newPage();
  await otherOwner.goto("/");
  await otherOwner.evaluate(() => window.localStorage.setItem("presence:e2e:access_token", "non-owner-token"));
  await otherOwner.goto("/studio/101/editor/preview", { waitUntil: "networkidle" });
  await expect(otherOwner.getByText("Draft preview is available only to the owner of this Room.")).toBeVisible();
  await expect(otherOwner.getByText(marker)).toHaveCount(0);
  await otherOwnerContext.close();
});

test("the primary visible publish action opens confirmation and publishes only after confirmation", async ({ page, context, request }) => {
  mkdirSync(evidenceDir, { recursive: true });
  await request.post("http://127.0.0.1:5105/__test__/reset");
  await request.post("http://127.0.0.1:5105/__test__/state", { data: { clearEditorPublished: true } });
  await signInOwner(page);

  await page.goto("/studio/101/editor", { waitUntil: "networkidle" });
  await page.locator('[data-canvas-id="hero-title"]').click();
  await page.getByTestId("canvas-mini-toolbar").getByRole("button", { name: "Edit text" }).click();
  await page.getByLabel("Edit Room title").fill(marker);
  await page.getByLabel("Edit Room title").press("Enter");
  await expect(page.getByTestId("draft-save-feedback")).toContainText("All changes saved");
  await page.screenshot({ path: path.join(evidenceDir, "owner-editor-draft-saved.png"), fullPage: true });

  const publicBefore = await context.newPage();
  await publicBefore.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await expect(publicBefore.getByText(marker)).toHaveCount(0);
  await publicBefore.screenshot({ path: path.join(evidenceDir, "public-before-publish.png"), fullPage: true });
  await publicBefore.close();

  const publishButton = page.getByTestId("open-to-visitors-primary");
  await expect(publishButton).toBeEnabled();
  await expect(page.getByTestId("publish-blocked-reason")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open to visitors", exact: true })).toHaveCount(0);
  await publishButton.click();
  const dialog = page.getByRole("dialog", { name: "Open this draft room?" });
  await expect(dialog).toContainText("Your draft will become the live room.");
  await page.screenshot({ path: path.join(evidenceDir, "publish-confirmation-dialog.png"), fullPage: true });

  const publishRequest = page.waitForResponse((response) =>
    response.url().includes("/api/presence/owner/rooms/101/editor/publish") &&
    response.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: "Open to visitors" }).click();
  await expect((await publishRequest).ok()).toBeTruthy();
  await expect(page.getByText("Your live room is open to visitors.")).toBeVisible();

  const publicAfter = await context.newPage();
  await publicAfter.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await expect(publicAfter.getByText(marker)).toBeVisible();
  await publicAfter.screenshot({ path: path.join(evidenceDir, "public-after-publish.png"), fullPage: true });
  await publicAfter.close();

  const roomKey = await context.newPage();
  await roomKey.goto("/r/test-room-key-token", { waitUntil: "networkidle" });
  await expect(roomKey.getByText(marker)).toBeVisible();
  await roomKey.screenshot({ path: path.join(evidenceDir, "roomkey-after-publish.png"), fullPage: true });
  await roomKey.close();
});
