import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "playwright/test";

const evidenceDir = path.join(
  process.cwd(),
  "..",
  "docs",
  "program",
  "evidence",
  "presence-canvas-builder-v2-wired-proof",
  "screenshots",
);

test("Canvas Builder resolves the draft and published room through one visible lifecycle", async ({ page, context, request }) => {
  mkdirSync(evidenceDir, { recursive: true });
  await request.post("http://127.0.0.1:5105/__test__/reset");
  await page.goto("/");
  await page.evaluate(() => window.localStorage.setItem("presence:e2e:access_token", "owner-test-token"));

  await page.goto("/studio/101/editor", { waitUntil: "networkidle" });
  await expect(page.getByTestId("pilot-banner")).toContainText("Pilot mode");
  await expect(page.locator('[data-canvas-id="hero-title"]')).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "canvas-default-resolver.png"), fullPage: true });

  await page.getByRole("button", { name: /Blocks in your room/ }).click();
  await expect(page.getByTestId("widget-library-drawer")).toContainText("In room");
  await page.screenshot({ path: path.join(evidenceDir, "widget-library-drawer.png"), fullPage: true });

  await page.locator('[data-canvas-id="hero-title"]').click();
  const inspector = page.getByTestId("desktop-canvas-inspector");
  await page.screenshot({ path: path.join(evidenceDir, "selected-title-inspector.png"), fullPage: true });
  await expect(page.getByTestId("font-picker")).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "font-picker-open.png"), fullPage: true });

  await page.getByTestId("canvas-mini-toolbar").getByRole("button", { name: "Edit text" }).click();
  await page.getByLabel("Edit Room title").fill("Parity Room - Visitor Truth");
  await page.getByLabel("Edit Room title").press("Enter");
  await expect(page.getByTestId("draft-save-feedback")).toContainText("All changes saved");

  await page.getByLabel("Heading font").selectOption("instrument-serif");
  await expect(page.getByTestId("draft-save-feedback")).toContainText("Font saved");
  await expect.poll(async () => page.locator('[data-canvas-id="hero-title"] p').evaluate((element) => (element as HTMLElement).style.fontFamily)).toContain("Instrument Serif");
  await page.screenshot({ path: path.join(evidenceDir, "font-change-reflected.png"), fullPage: true });

  await expect(page.getByTestId("palette-picker")).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "palette-picker-open.png"), fullPage: true });
  await page.getByLabel("Room background").fill("#181716");
  await expect(page.getByTestId("draft-save-feedback")).toContainText("Colours saved");
  await expect.poll(async () => page.getByTestId("presence-canvas-stage").evaluate((element) => (element as HTMLElement).style.background)).toBe("rgb(24, 23, 22)");
  await page.screenshot({ path: path.join(evidenceDir, "palette-reflected.png"), fullPage: true });

  await expect(page.getByTestId("option-pack-picker")).toBeVisible();
  await page.getByTestId("option-pack-picker").getByRole("button", { name: /Ink Room/ }).click();
  await expect(page.getByTestId("draft-save-feedback")).toContainText("Mood saved");
  await page.screenshot({ path: path.join(evidenceDir, "option-pack-applied.png"), fullPage: true });

  const publicBefore = await context.newPage();
  await publicBefore.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await expect(publicBefore.getByText("Parity Room - Visitor Truth")).toHaveCount(0);
  await publicBefore.close();

  await page.getByRole("button", { name: "Work wall" }).click();
  await page.locator('[data-canvas-id^="work-image:"]').first().click();
  await expect(page.getByTestId("gallery-layout-picker")).toContainText("Gallery wall - live");
  await page.screenshot({ path: path.join(evidenceDir, "gallery-layout-picker.png"), fullPage: true });
  await page.getByRole("button", { name: "Move work" }).first().click();
  await expect(page.getByTestId("work-wall-reorder")).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "work-reorder.png"), fullPage: true });
  await page.getByRole("button", { name: /Move Bridle Road up/ }).click();
  await page.getByRole("button", { name: "Save work order" }).click();

  await page.getByRole("link", { name: "Full preview" }).click();
  await expect(page.getByText("Draft preview not public")).toBeVisible();
  await expect(page.getByText("Parity Room - Visitor Truth")).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "full-preview-matches-draft.png"), fullPage: true });

  await page.getByRole("button", { name: "Open room to visitors" }).click();
  await page.screenshot({ path: path.join(evidenceDir, "publish-confirmation.png"), fullPage: true });
  await page.getByRole("button", { name: "Open room to visitors" }).last().click();

  await page.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await expect(page.getByText("Parity Room - Visitor Truth")).toBeVisible();
  await expect.poll(async () => page.locator("main").first().evaluate((element) => getComputedStyle(element).getPropertyValue("--ggm-bg").trim())).toBe("#141414");
  await page.screenshot({ path: path.join(evidenceDir, "public-after-publish.png"), fullPage: true });
});
