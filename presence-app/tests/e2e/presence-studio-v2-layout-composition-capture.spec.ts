import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type APIRequestContext, type Page } from "playwright/test";

const api = "http://127.0.0.1:5105";
const dir = path.join(process.cwd(), "docs", "program", "evidence", "presence-studio-layout-composition", "screenshots");

async function open(page: Page, request: APIRequestContext) {
  await request.post(`${api}/__test__/reset`);
  await request.post(`${api}/__test__/state`, { data: { useGgmPrivateProof: true } });
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("presence:e2e:access_token", "owner-test-token"));
  await page.goto("/studio/11/editor", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible();
}

async function save(page: Page) {
  await page.getByTestId("presence-studio-v2-save").click();
  await expect(page.getByTestId("presence-studio-v2-saved")).toContainText("Saved", { timeout: 10_000 });
}

test("captures private local layout-composition proof", async ({ page, request }) => {
  await fs.mkdir(dir, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page, request);
  await page.screenshot({ path: path.join(dir, "01-layout-selection-and-zones.png"), fullPage: false });
  await page.getByTestId("presence-studio-v2-outline-object").filter({ hasText: "Private install note" }).click();
  await page.screenshot({ path: path.join(dir, "02-zone-size-treatment-controls.png"), fullPage: false });
  const handle = page.getByTestId("presence-studio-v2-layout-drag-handle");
  const valid = page.locator('[data-zone-id="influence-layer"]');
  await handle.dispatchEvent("pointerdown", { pointerType: "mouse" });
  await valid.dispatchEvent("pointerup", { pointerType: "mouse" });
  await page.screenshot({ path: path.join(dir, "03-valid-drag-arrange.png"), fullPage: false });
  await handle.dispatchEvent("pointerdown", { pointerType: "mouse" });
  await page.locator('[data-zone-id="opening-work"]').dispatchEvent("pointerup", { pointerType: "mouse" });
  await page.screenshot({ path: path.join(dir, "04-invalid-placement-guardrail.png"), fullPage: false });
  await page.getByTestId("presence-studio-v2-layout-select").selectOption("portal-threshold");
  await save(page);
  await page.screenshot({ path: path.join(dir, "05-portal-threshold-layout.png"), fullPage: false });
  await page.goto("/studio/11/editor/preview", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(dir, "06-private-preview-parity.png"), fullPage: false });

  await open(page, request);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId("presence-studio-v2-outline-object").filter({ hasText: "Private install note" }).click();
  await page.screenshot({ path: path.join(dir, "07-mobile-placement-controls.png"), fullPage: false });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.screenshot({ path: path.join(dir, "08-reduced-motion-dom-fallback.png"), fullPage: false });

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page, request);
  await page.getByTestId("presence-studio-v2-outline-object").filter({ hasText: "Private install note" }).click();
  await page.getByLabel("Shown in public room").check();
  await page.screenshot({ path: path.join(dir, "09-reorder-before-controls.png"), fullPage: false });
  await page.getByRole("button", { name: "Move down" }).click();
  await save(page);
  await page.reload({ waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(dir, "10-reorder-after-save-reload.png"), fullPage: false });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId("presence-studio-v2-outline-object").filter({ hasText: "Desktop-only proof" }).click();
  await page.getByTestId("presence-studio-v2-placement-zone").selectOption("influence-layer");
  await save(page);
  await page.screenshot({ path: path.join(dir, "11-hidden-mobile-editor-manageable.png"), fullPage: false });
  await page.goto("/studio/11/editor/preview", { waitUntil: "networkidle" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(dir, "12-hidden-mobile-private-preview.png"), fullPage: false });
});
