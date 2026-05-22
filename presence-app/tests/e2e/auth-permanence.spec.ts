import { expect, test, type Page } from "playwright/test";

const ggmRoomId = process.env.PRESENCE_AUTH_GGM_ROOM_ID ?? "";

test.describe("real Supabase session permanence", () => {
  test.skip(
    !ggmRoomId,
    "Set PRESENCE_AUTH_GGM_ROOM_ID and load authenticated storage state for hosted auth proof.",
  );

  test("owner session survives Studio navigation, refresh, and logout", async ({
    page,
  }) => {
    await openOwnerRoute(page, "/studio", /Choose your Presence|Studio/i);
    await openOwnerRoute(
      page,
      `/studio/${encodeURIComponent(ggmRoomId)}/analytics`,
      /Analytics|Studio|Presence/i,
    );

    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator("body")).toContainText(/Analytics|Studio|Presence/i);
    await expect(page.locator("body")).not.toContainText(/Sign in required|Enter Studio/i);

    await openOwnerRoute(
      page,
      `/studio/${encodeURIComponent(ggmRoomId)}/passes`,
      /Pass|RoomKey|Studio|Presence/i,
    );
    await openOwnerRoute(page, "/", /Presence/i);
    await openOwnerRoute(
      page,
      `/studio/${encodeURIComponent(ggmRoomId)}/analytics`,
      /Analytics|Studio|Presence/i,
    );

    await page.goto("/auth/sign-out", { waitUntil: "networkidle" });
    await page.goto(`/studio/${encodeURIComponent(ggmRoomId)}/analytics`, {
      waitUntil: "networkidle",
    });
    await expect(page.locator("body")).toContainText(/Sign in|Enter Studio/i);
  });
});

async function openOwnerRoute(page: Page, path: string, text: RegExp) {
  const response = await page.goto(path, { waitUntil: "networkidle" });
  expect(response?.status(), `${path} must not be a fatal owner route`).toBeLessThan(
    500,
  );
  await expect(page.locator("body")).toContainText(text);
  await expect(page.locator("body")).not.toContainText(/Sign in required|Enter Studio/i);
}
