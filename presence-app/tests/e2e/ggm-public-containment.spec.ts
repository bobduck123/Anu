import { expect, test, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";
const GGM_SIGNAL = /ggm-christina-goddard|christina kerkvliet goddard|christina-goddard\.vercel\.app/i;

test.beforeEach(async ({ request }) => {
  await request.post(`${API_BASE}/__test__/reset`);
});

test("contained GGM routes resolve truthfully without a demo fallback", async ({ page }) => {
  for (const pathname of [
    "/p/ggm-christina-goddard",
    "/presence/ggm-christina-goddard",
    "/p/ggm-christina-goddard/works/willow-of-port-arthur-2019",
  ]) {
    const response = await page.goto(pathname, { waitUntil: "networkidle" });
    expect(response?.status(), `${pathname} must be not found when the backend omits GGM`).toBe(404);
    await expect(page.locator("body")).not.toContainText(GGM_SIGNAL);
  }
});

test("gallery relies on backend results across default, search, and filtered views", async ({ page }) => {
  for (const pathname of ["/gallery", "/gallery?q=ggm", "/gallery?filter=artist_gallery"]) {
    const response = await page.goto(pathname, { waitUntil: "networkidle" });
    expect(response?.status(), `${pathname} must remain available`).toBe(200);
    await expect(page.locator('a[href="/p/ggm-christina-goddard"]')).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(GGM_SIGNAL);
  }
});

test("unrelated demo and backend-public routes remain available", async ({ page }) => {
  await expectPublicRoute(page, "/p/rooms-underground-dj", /Mira K\./i);
  await expectPublicRoute(page, "/p/test-presence-room", /Mara Vale Test Room/i);
});

test("public containment leaves authenticated Studio source data unchanged", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.setItem("presence:e2e:access_token", "owner-test-token"));
  const response = await page.goto("/studio/101/editor", { waitUntil: "networkidle" });
  expect(response?.status()).toBe(200);
  await expect(page.locator('[data-canvas-id="hero-title"]')).toBeVisible();
});

async function expectPublicRoute(page: Page, pathname: string, content: RegExp) {
  const response = await page.goto(pathname, { waitUntil: "networkidle" });
  expect(response?.status(), `${pathname} must remain public`).toBe(200);
  await expect(page.locator("body")).toContainText(content);
}
