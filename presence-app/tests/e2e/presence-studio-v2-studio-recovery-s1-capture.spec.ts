import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";
const evidenceDir = process.env.PRESENCE_STUDIO_RECOVERY_S1_OUT
  ? path.resolve(process.cwd(), process.env.PRESENCE_STUDIO_RECOVERY_S1_OUT)
  : path.join(
      process.cwd(),
      "docs",
      "program",
      "evidence",
      "presence-studio-v2-studio-recovery-s1",
    );

test.skip(
  process.env.PRESENCE_STUDIO_RECOVERY_S1_CAPTURE !== "1",
  "Set PRESENCE_STUDIO_RECOVERY_S1_CAPTURE=1 to capture Studio Recovery S1 evidence.",
);

async function signInOwner(page: Page) {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.setItem("presence:e2e:access_token", "owner-test-token"));
}

test("captures Studio Recovery S1 cockpit evidence", async ({ page, request }) => {
  await fs.mkdir(evidenceDir, { recursive: true });
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
  await expect(page.getByTestId("presence-studio-v2-outline")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-inspector")).toBeVisible();

  await page.screenshot({
    path: path.join(evidenceDir, "01-full-three-pane-studio-cockpit.png"),
    fullPage: true,
  });

  await page.getByTestId("presence-studio-v2-outline").screenshot({
    path: path.join(evidenceDir, "02-left-outline-assets-rail.png"),
  });

  await page.getByTestId("presence-studio-v2-outline-object").first().click();
  await expect(page.getByTestId("studio-v2-object-title")).toBeVisible();
  await page.getByTestId("presence-studio-v2-inspector").screenshot({
    path: path.join(evidenceDir, "03-right-inspector-content-tab.png"),
  });

  await page.getByTestId("presence-studio-v2-inspector-tab-style").click();
  await page.getByTestId("presence-studio-v2-inspector").screenshot({
    path: path.join(evidenceDir, "04-right-inspector-style-tab.png"),
  });

  await page.getByTestId("presence-studio-v2-inspector-tab-motion").click();
  await page.getByTestId("presence-studio-v2-inspector").screenshot({
    path: path.join(evidenceDir, "05-right-inspector-motion-tab.png"),
  });

  await page.getByTestId("presence-studio-v2-tab-threshold").click();
  await page.screenshot({
    path: path.join(evidenceDir, "06-threshold-tab.png"),
    fullPage: true,
  });

  await page.getByTestId("presence-studio-v2-tab-chamber").click();
  await page.getByTestId("presence-studio-v2-chamber-tab").first().click();
  await page.screenshot({
    path: path.join(evidenceDir, "07-chamber-tab-selected-object-state.png"),
    fullPage: true,
  });

  await page.getByTestId("presence-studio-v2-tab-archive").click();
  await page.screenshot({
    path: path.join(evidenceDir, "08-studio-archive-tab.png"),
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/studio/101/editor", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible();
  await page.screenshot({
    path: path.join(evidenceDir, "09-mobile-narrow-editor-state.png"),
    fullPage: true,
  });
});
