import { expect, test, type Page } from "playwright/test";

const backendURL = new URL(process.env.PRESENCE_PILOT_GGM_BACKEND_URL!);
const roomSlug = process.env.PRESENCE_PILOT_GGM_ROOM_SLUG ?? "";
const roomId = process.env.PRESENCE_PILOT_GGM_ROOM_ID ?? "";
const roomKeyToken = process.env.PRESENCE_PILOT_GGM_ROOMKEY_TOKEN ?? "";

test("GGM first pilot public routes and World posture stay deployed", async ({
  page,
}) => {
  required(roomSlug, "PRESENCE_PILOT_GGM_ROOM_SLUG");
  await probe(page, "/", /Presence/i);
  await probe(page, `/presence/${encodeURIComponent(roomSlug)}`, /Christina|Room/i);
  await probe(page, "/world", /The World is forming/i);
  await expect(page.locator("body")).not.toContainText(
    /world map canvas|open global map|realtime multiplayer/i,
  );
});

test("GGM RoomKey entry is a deployed guest path", async ({ page }) => {
  required(roomKeyToken, "PRESENCE_PILOT_GGM_ROOMKEY_TOKEN");
  await probe(
    page,
    `/r/${encodeURIComponent(roomKeyToken)}`,
    /Opened via|Selected portfolio|Watercolour as site, memory/i,
  );
  await expect(page.locator("body")).not.toContainText(
    /mock-presence-api|localhost:5105|Traceback|Step into the gallery|Use the arrow keys, click the HUD/i,
  );
});

test("GGM Studio analytics stays owner-gated in browser proof", async ({
  page,
}) => {
  required(roomId, "PRESENCE_PILOT_GGM_ROOM_ID");
  await probe(
    page,
    `/studio/${encodeURIComponent(roomId)}/analytics`,
    /Presence|Studio|Sign in/i,
  );
  await expect(page.locator("body")).not.toContainText(/Traceback/i);
});

test("GGM public Room and RoomKey use hosted backend API", async ({ page }) => {
  required(roomSlug, "PRESENCE_PILOT_GGM_ROOM_SLUG");
  required(roomKeyToken, "PRESENCE_PILOT_GGM_ROOMKEY_TOKEN");
  const apiRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/")) apiRequests.push(url.href);
  });

  await page.goto(`/presence/${encodeURIComponent(roomSlug)}`, {
    waitUntil: "networkidle",
  });
  await page.goto(`/r/${encodeURIComponent(roomKeyToken)}`, {
    waitUntil: "networkidle",
  });

  expect(apiRequests.length).toBeGreaterThan(0);
  for (const href of apiRequests) {
    const url = new URL(href);
    expect(url.origin).toBe(backendURL.origin);
    expect(url.origin).not.toMatch(/localhost|127\.0\.0\.1/i);
  }
});

test("GGM faithful hosted surfaces stay scoped to the pilot Room", async ({
  page,
}) => {
  required(roomSlug, "PRESENCE_PILOT_GGM_ROOM_SLUG");

  await probe(
    page,
    `/p/${encodeURIComponent(roomSlug)}`,
    /Selected portfolio|Watercolour as site, memory/i,
  );
  await expect(page.locator("body")).not.toContainText(
    /Step into the gallery|Use the arrow keys, click the HUD/i,
  );

  await probe(
    page,
    `/p/${encodeURIComponent(roomSlug)}/works/willow-of-port-arthur-2019`,
    /Willow of Port Arthur/i,
  );
  await expect(page.locator("body")).toContainText(/Memory prompt overlay/i);

  await page.goto("/gallery", { waitUntil: "networkidle" });
  const ggmCard = page.locator(`a[href="/p/${roomSlug}"]`).first();
  await expect(ggmCard).toBeVisible();
  await expect(ggmCard).toContainText(/Christina|First pilot/i);

  await probe(page, "/p/rooms-independent-artist", /Mara Vale/i);
  await expect(page.locator("body")).not.toContainText(
    /Christina Kerkvliet Goddard|Memory prompt overlay/i,
  );
});

async function probe(page: Page, path: string, bodyText: RegExp) {
  const consoleErrors: string[] = [];
  const uncaught: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => uncaught.push(error.message));

  const response = await page.goto(path, { waitUntil: "networkidle" });
  expect(response?.status(), `${path} must not be a fatal route`).toBeLessThan(
    500,
  );
  await expect(page.locator("body")).toContainText(bodyText);
  await expect.poll(() => horizontalOverflow(page)).toBeLessThanOrEqual(1);
  expect(uncaught).toEqual([]);
  expect(
    consoleErrors.filter((line) => /hydration|uncaught|fatal|traceback/i.test(line)),
  ).toEqual([]);
}

async function horizontalOverflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

function required(value: string, envName: string) {
  expect(value, `${envName} is required for GGM first-pilot browser proof`).not.toBe(
    "",
  );
}
