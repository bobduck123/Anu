import { expect, test, type Page } from "playwright/test";

const backendURL = new URL(
  process.env.PRESENCE_CONTROLLED_LAUNCH_BACKEND_URL ??
    process.env.PRESENCE_HOSTED_BACKEND_URL!,
);
const roomKeyToken =
  process.env.PRESENCE_CONTROLLED_LAUNCH_ROOM_KEY_TOKEN ??
  process.env.PRESENCE_HOSTED_ROOM_KEY_TOKEN ??
  process.env.PRESENCE_HOSTED_ROOMKEY_TOKEN ??
  "";
const publicRoomSlug =
  process.env.PRESENCE_CONTROLLED_LAUNCH_PUBLIC_ROOM_SLUG ??
  process.env.PRESENCE_HOSTED_PUBLIC_ROOM_SLUG ??
  "";
const maskAlias =
  process.env.PRESENCE_CONTROLLED_LAUNCH_MASK_ALIAS ??
  process.env.PRESENCE_HOSTED_MASK_ALIAS ??
  "";
const hallSlug =
  process.env.PRESENCE_CONTROLLED_LAUNCH_HALL_SLUG ??
  process.env.PRESENCE_HOSTED_HALL_SLUG ??
  "";
const hallId =
  process.env.PRESENCE_CONTROLLED_LAUNCH_HALL_ID ??
  process.env.PRESENCE_HOSTED_HALL_ID ??
  "";
const ownerRoomId =
  process.env.PRESENCE_CONTROLLED_LAUNCH_OWNER_ROOM_ID ??
  process.env.PRESENCE_HOSTED_OWNER_ROOM_ID ??
  "";

type RouteProbe = {
  path: string;
  heading?: RegExp;
  bodyText?: RegExp;
};

test("landing, gallery, Halls, and World stay usable on deployed frontend", async ({
  page,
}) => {
  await probeRoute(page, {
    path: "/",
    bodyText: /Presence/i,
  });
  await probeRoute(page, {
    path: "/gallery",
    bodyText: /Presence|Gallery/i,
  });
  await probeRoute(page, {
    path: "/halls",
    heading: /Where we|Halls/i,
  });
  await probeRoute(page, {
    path: "/world",
    heading: /The World is forming/i,
  });
  await expect(page.getByText(/No fake map/i)).toBeVisible();
  await expect(page.locator("body")).not.toContainText(
    /world map canvas|open global map|realtime multiplayer/i,
  );
});

test("Garden route stays Observer-gated without hosted auth", async ({ page }) => {
  await probeRoute(page, {
    path: "/observer/garden",
    bodyText: /Observer|Garden/i,
  });
  await expect(page.locator("body")).not.toContainText(
    /Internal Server Error|Traceback/i,
  );
});

test("RoomKey fixture renders from hosted contracts", async ({ page }) => {
  requiredFixture(
    roomKeyToken,
    "PRESENCE_CONTROLLED_LAUNCH_ROOM_KEY_TOKEN",
  );
  await probeRoute(page, {
    path: `/r/${encodeURIComponent(roomKeyToken)}`,
    bodyText: /Room|entered|Key/i,
  });
});

test("public Room fixture renders from hosted contracts", async ({ page }) => {
  requiredFixture(
    publicRoomSlug,
    "PRESENCE_CONTROLLED_LAUNCH_PUBLIC_ROOM_SLUG",
  );

  await probeRoute(page, {
    path: `/presence/${encodeURIComponent(publicRoomSlug)}`,
    bodyText: /Presence|Room/i,
  });
});

test("public Mask fixture renders", async ({ page }) => {
  requiredFixture(maskAlias, "PRESENCE_CONTROLLED_LAUNCH_MASK_ALIAS");
  await probeRoute(page, {
    path: `/m/${encodeURIComponent(maskAlias)}`,
    bodyText: /Mask|Garden|Observer/i,
  });
});

test("Hall detail fixture renders", async ({ page }) => {
  requiredFixture(hallSlug, "PRESENCE_CONTROLLED_LAUNCH_HALL_SLUG");
  await probeRoute(page, {
    path: `/halls/${encodeURIComponent(hallSlug)}`,
    bodyText: /Hall|Zone|Gather/i,
  });
});

test("Hall path fixture renders", async ({ page }) => {
  requiredFixture(hallId, "PRESENCE_CONTROLLED_LAUNCH_HALL_ID");
  await probeRoute(page, {
    path: `/paths/from-hall/${encodeURIComponent(hallId)}`,
    bodyText: /Path|Choose|Hall/i,
  });
});

test("owner Hall Studio route is not faked for signed-out hosted proof", async ({
  page,
}) => {
  requiredFixture(
    ownerRoomId,
    "PRESENCE_CONTROLLED_LAUNCH_OWNER_ROOM_ID",
  );
  await probeRoute(page, {
    path: `/studio/${encodeURIComponent(ownerRoomId)}/halls`,
    bodyText: /Studio|Hall|Sign in|Presence/i,
  });
  await expect(page.locator("body")).not.toContainText(
    /mock-presence-api|localhost:5105|Traceback/i,
  );
});

test("deployed Halls client points API traffic at expected hosted backend", async ({
  page,
}) => {
  const apiRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/")) {
      apiRequests.push(url.href);
    }
  });

  await page.goto("/halls", { waitUntil: "networkidle" });
  expect(apiRequests.length, "Halls page should issue hosted API traffic").toBeGreaterThan(0);
  for (const href of apiRequests) {
    const url = new URL(href);
    expect(url.origin).toBe(backendURL.origin);
    expect(url.origin).not.toMatch(/localhost|127\.0\.0\.1/i);
  }
});

async function probeRoute(page: Page, route: RouteProbe) {
  const consoleErrors: string[] = [];
  const uncaught: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    uncaught.push(error.message);
  });

  const response = await page.goto(route.path, { waitUntil: "networkidle" });
  expect(response?.status(), `${route.path} must not be a fatal hosted route`).toBeLessThan(500);
  if (route.heading) {
    await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible();
  }
  if (route.bodyText) {
    await expect(page.locator("body")).toContainText(route.bodyText);
  }
  await expect.poll(() => horizontalOverflow(page)).toBeLessThanOrEqual(1);
  expect(uncaught, `${route.path} must not have uncaught page errors`).toEqual([]);
  expect(
    consoleErrors.filter((line) => /hydration|uncaught|fatal|traceback/i.test(line)),
    `${route.path} must not emit fatal console errors`,
  ).toEqual([]);
}

async function horizontalOverflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

function requiredFixture(value: string, envName: string) {
  expect(value, `${envName} is required for hosted controlled-launch proof`).not.toBe("");
}
