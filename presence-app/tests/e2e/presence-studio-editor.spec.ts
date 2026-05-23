import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "playwright/test";

const evidenceDir = path.join(process.cwd(), "..", "docs", "program", "evidence", "presence-studio-editor-app-upgrade-proof", "screenshots");

test("Presence Studio editor owner cockpit loads and supports draft preview controls", async ({ page }) => {
  mkdirSync(evidenceDir, { recursive: true });
  await page.goto("/");
  await page.evaluate(() => window.localStorage.setItem("presence:e2e:access_token", "owner-test-token"));

  await page.goto("/studio/101/editor", { waitUntil: "networkidle" });
  await expect(page.getByText("Presence Studio Editor")).toBeVisible();
  await expect(page.getByText("Owner-only creative control plane")).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "studio-editor-overview.png"), fullPage: true });

  await page.getByRole("button", { name: "Scenes" }).click();
  await expect(page.getByText("Scene 01 - Artwork Field")).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "studio-editor-scenes.png"), fullPage: true });

  await page.getByRole("button", { name: /Save Draft|Create Draft/ }).first().click();
  await expect(page.getByText(/Draft saved|Draft created/)).toBeVisible();

  await page.getByRole("button", { name: "Preview" }).first().click();
  await expect(page.getByText("Draft preview generated")).toBeVisible();
  await expect(page.locator("span").filter({ hasText: "Draft preview" })).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "studio-editor-preview.png"), fullPage: true });
});
