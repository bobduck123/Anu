import { expect, test } from "playwright/test";

test("Presence Studio preserves advanced controls and owner-only boundaries", async ({ page, request }) => {
  await request.post("http://127.0.0.1:5105/__test__/reset");
  await page.goto("/");
  await page.evaluate(() => window.localStorage.setItem("presence:e2e:access_token", "owner-test-token"));

  await page.goto("/studio/101/editor", { waitUntil: "networkidle" });
  await expect(page.getByTestId("pilot-banner")).toBeVisible();
  await expect(page.getByRole("button", { name: "Advanced controls" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Scenes" })).toHaveCount(0);

  await page.getByRole("button", { name: "Advanced controls" }).first().click();
  await expect(page.getByText("Detailed controls for staff and power users")).toBeVisible();
  await page.getByRole("button", { name: "Assets" }).click();
  await page.getByLabel("Public URL or asset path").fill("file://blocked-private-image.png");
  await expect(page.getByText(/file: URLs are blocked|Local filesystem paths/)).toBeVisible();

  await page.goto("/");
  await page.evaluate(() => window.localStorage.setItem("presence:e2e:access_token", "non-owner-token"));
  await page.goto("/studio/101/editor", { waitUntil: "networkidle" });
  await expect(page.getByText(/do not have access to this Room|do not have editor access|You do not own this Presence Room|could not be loaded/i)).toBeVisible();
});
