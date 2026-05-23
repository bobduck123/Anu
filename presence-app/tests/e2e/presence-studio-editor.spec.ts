import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "playwright/test";

const evidenceDir = path.join(process.cwd(), "..", "docs", "program", "evidence", "presence-studio-editor-kimi-salvage-integration-proof", "screenshots");

test("Presence Studio editor owner cockpit supports self-serve beta controls", async ({ page }) => {
  mkdirSync(evidenceDir, { recursive: true });
  await page.goto("/");
  await page.evaluate(() => window.localStorage.setItem("presence:e2e:access_token", "owner-test-token"));

  await page.goto("/studio/101/editor", { waitUntil: "networkidle" });
  await expect(page.getByText("Presence Studio Editor")).toBeVisible();
  await expect(page.getByText("Owner-only creative control plane")).toBeVisible();
  await expect(page.getByText(/Readiness \d+%/)).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "editor-overview-readiness.png"), fullPage: true });

  await page.getByRole("button", { name: "Scenes" }).click();
  await expect(page.getByText("Scene 01 - Artwork Field")).toBeVisible();
  await page.getByLabel("Title").first().fill("Colour as Memory - Beta Draft");

  await page.getByRole("button", { name: /Save Draft|Create Draft/ }).first().click();
  await expect(page.getByText(/Draft saved|Draft created/)).toBeVisible();

  await page.getByRole("button", { name: "Preview panel" }).first().click();
  await expect(page.getByText("Draft preview generated")).toBeVisible();
  await expect(page.getByText("Draft vs published comparison")).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "draft-vs-published-comparison.png"), fullPage: true });

  await page.getByRole("button", { name: "Assets" }).click();
  await page.getByLabel("Public URL or asset path").fill("file://blocked-private-image.png");
  await expect(page.getByText(/file: URLs are blocked|Local filesystem paths/)).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "assets-unsafe-warning.png"), fullPage: true });

  await page.getByRole("button", { name: "Motion / Texture" }).click();
  await expect(page.getByText("Custom cursor (coming soon)")).toBeVisible();
  await expect(page.getByText("Reduced-motion fallback")).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "style-motion-disabled-controls.png"), fullPage: true });

  await page.getByRole("button", { name: "Preview / Publish" }).click();
  await page.getByRole("button", { name: "Open room to visitors" }).first().click();
  await expect(page.getByText("Publish this draft?")).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "publish-confirmation.png"), fullPage: true });
  await page.getByRole("button", { name: "Open room to visitors" }).last().click();
  await expect(page.getByText("Publish this draft?")).toBeHidden();

  await page.goto("/studio/101/editor/preview", { waitUntil: "networkidle" });
  await expect(page.getByText("Draft preview not public")).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "fullscreen-draft-preview.png"), fullPage: true });
  await page.getByRole("button", { name: "Mobile" }).click();
  await page.screenshot({ path: path.join(evidenceDir, "mobile-draft-preview.png"), fullPage: true });

  await page.goto("/p/test-presence-room", { waitUntil: "networkidle" });
  await expect(page.getByText(/Colour as Memory - Beta Draft|Christina Kerkvliet Goddard/)).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "public-room-after-publish.png"), fullPage: true });

  await page.goto("/");
  await page.evaluate(() => window.localStorage.setItem("presence:e2e:access_token", "non-owner-token"));
  await page.goto("/studio/101/editor", { waitUntil: "networkidle" });
  await expect(page.getByText(/do not have editor access|You do not own this Presence Room|could not be loaded/i)).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "forbidden-non-owner-state.png"), fullPage: true });
});
