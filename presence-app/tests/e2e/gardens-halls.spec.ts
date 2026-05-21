import { expect, test, type APIRequestContext, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";

test.beforeEach(async ({ request }) => {
  await request.post(`${API_BASE}/__test__/reset`);
});

const TEST_TOKEN = "presence-e2e-token";

async function authenticateObserver(page: Page, request: APIRequestContext) {
  await request.post(`${API_BASE}/__test__/state`, { data: { observer: true } });
  await page.addInitScript((token) => {
    window.localStorage.setItem("presence:e2e:access_token", token);
  }, TEST_TOKEN);
}

test.describe("Presence Gardens", () => {
  test("Garden home prompts for Observer Mask when signed out", async ({ page }) => {
    await page.goto("/observer/garden");
    await expect(
      page.getByRole("heading", { name: /Create an Observer Mask/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Sign in/i })).toBeVisible();
  });

  test("Garden home renders structural empty sections when authenticated with no growth", async ({ page, request }) => {
    await authenticateObserver(page, request);
    await page.goto("/observer/garden");
    await expect(page.getByRole("heading", { name: /A Garden,/ })).toBeVisible();
    await expect(page.getByText(/Your Garden grows from Rooms/i)).toBeVisible();
    await expect(page.getByText("New Growth").first()).toBeVisible();
    await expect(page.getByText("Wilting Seeds").first()).toBeVisible();
  });

  test("Observation composer rejects self-promotion content", async ({ page, request }) => {
    await authenticateObserver(page, request);
    await page.goto("/observer/garden");
    const textarea = page.getByTestId("observation-composer-input");
    await textarea.fill("Book me at https://example.com");
    await page.getByTestId("observation-composer-submit").click();
    await expect(page.getByText(/sounds like a Presence Room/i)).toBeVisible();
  });

  test("Mask public page shows alias and guardrail copy", async ({ page }) => {
    await page.goto("/m/quiet-walker");
    await expect(page.getByRole("heading", { name: /quiet-walker/i }).first()).toBeVisible();
    await expect(page.getByText(/This looks like a Presence/).first()).toBeVisible();
  });
});

test.describe("Presence Halls", () => {
  test("Halls index renders live + upcoming Halls", async ({ page }) => {
    await page.goto("/halls");
    await expect(page.getByRole("heading", { name: /Where we/i })).toBeVisible();
    await expect(page.getByText(/Live now\./i)).toBeVisible();
    await expect(page.getByText("Open Studio Friday").first()).toBeVisible();
    await expect(page.getByText("Listening Hall — April").first()).toBeVisible();
  });

  test("Hall detail renders zones, stalls, and portals", async ({ page }) => {
    await page.goto("/halls/open-studio-friday");
    await expect(page.getByRole("heading", { name: "Open Studio Friday" })).toBeVisible();
    await expect(page.getByText("Lobby").first()).toBeVisible();
    await expect(page.getByText("Welcome Stage").first()).toBeVisible();
    await expect(page.getByText("Pigment Stall").first()).toBeVisible();
    await expect(page.getByText("To the Listening Hall").first()).toBeVisible();
  });

  test("Joining a Hall as a guest succeeds on a public Hall (canonical contract)", async ({ page }) => {
    await page.goto("/halls/open-studio-friday");
    await page.getByRole("button", { name: /Join Hall/i }).first().click();
    // Per the canonical contract guests can join public/unlisted Halls.
    // After joining, the action bar swaps to a Leave button.
    await expect(page.getByRole("button", { name: /Leave Hall/i }).first()).toBeVisible();
  });
});

test.describe("Existing surfaces still render", () => {
  test("World remains hidden/forming", async ({ page }) => {
    await page.goto("/world");
    await expect(page.getByRole("heading", { name: /The World is forming/i })).toBeVisible();
  });

  test("/r/[token] still resolves Room Key", async ({ page }) => {
    await page.goto("/r/test-room-key-token");
    await expect(page.getByText(/You.?ve entered this Room/)).toBeVisible();
  });

  test("/presence/[slug] still resolves Room", async ({ page }) => {
    await page.goto("/presence/test-presence-room");
    // Existing Room renderer presents the name in mixed elements depending on
    // theme; assert the text appears anywhere on the page.
    await expect(page.getByText("Mara Vale Test Room").first()).toBeVisible();
  });
});

test.describe("Teleport menu", () => {
  test("opens from Garden top frame and lists destinations", async ({ page, request }) => {
    await authenticateObserver(page, request);
    await page.goto("/observer/garden");
    await page.getByTestId("teleport-trigger").click();
    const sheet = page.getByTestId("teleport-sheet");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText("My Garden")).toBeVisible();
    await expect(sheet.getByText("Halls")).toBeVisible();
    await expect(sheet.getByText("Mood Boards")).toBeVisible();
  });
});

test.describe("Hall analytics — canonical metrics", () => {
  test("Owner analytics renders most_visited_stall and most_used_portal when present", async ({ page, request }) => {
    await authenticateObserver(page, request);
    await page.goto("/studio/101/halls/1/analytics");

    // Canonical metrics (people_gathered, observations_shared, paths_opened)
    // and singletons (most_visited_stall, most_used_portal) should render
    // with real labels.
    await expect(page.getByText(/People gathered/i)).toBeVisible();
    // The tile for the canonical aliases is data-marker-tagged; assert on
    // the data-metric attribute to avoid matching plural-vs-singular copy.
    await expect(page.locator("[data-metric=\"most_visited_stall\"]")).toBeVisible();
    await expect(page.locator("[data-metric=\"most_used_portal\"]")).toBeVisible();
    // The "Most used Portal" label is unique to the new section.
    await expect(page.getByText(/Most used Portal/i)).toBeVisible();
  });
});

test.describe("Echo composer", () => {
  test("opens Echo composer modal with source attribution", async ({ page, request }) => {
    await authenticateObserver(page, request);
    await page.goto("/m/quiet-walker");
    // The mock seeds the Mask with one recent Observation. Click its Echo
    // action to open the composer modal.
    const echo = page.locator("[data-action=\"echo\"]").first();
    await expect(echo).toBeVisible();
    await echo.click();
    await expect(page.getByTestId("echo-composer")).toBeVisible();
    await expect(page.getByTestId("echo-source-attribution")).toBeVisible();
  });

  test("Echo composer rejects self-promotion commentary and shows upgrade CTA", async ({ page, request }) => {
    await authenticateObserver(page, request);
    await page.goto("/m/quiet-walker");
    await page.locator("[data-action=\"echo\"]").first().click();
    const input = page.getByTestId("echo-composer-input");
    await input.fill("Hire me at https://example.com");
    await page.getByTestId("echo-composer-submit").click();
    await expect(page.getByText(/cannot include commercial links/i)).toBeVisible();
    await expect(page.getByTestId("echo-upgrade-cta")).toBeVisible();
  });
});

test.describe("Mood Board → Seed", () => {
  test("Plant in Garden action is available on Mood Board items", async ({ page, request }) => {
    await authenticateObserver(page, request);
    // The mock returns a board with one room item by id 802 / item 902.
    await page.goto("/observer/mood-boards/801");
    // We may need to wait for the board to load; the action button is the
    // canonical UI surface.
    const plant = page.locator("[data-action=\"plant-in-garden\"]").first();
    await expect(plant).toBeVisible();
    await plant.click();
    await expect(page.getByText(/Planted in Garden/i)).toBeVisible();
    await expect(page.getByText(/This Seed grew from your Mood Board/i)).toBeVisible();
  });
});

test.describe("Hall portal click + stall visit (contract events)", () => {
  test("Hall portal click fires the contract endpoint", async ({ page, request }) => {
    await page.goto("/halls/open-studio-friday");
    // Open the network log via a sentinel: portal/stall click triggers a
    // POST to /api/halls/:slug/portals/:portal_id/click which the mock now
    // returns 201 for. We tap into the mock's request log to confirm.
    const portal = page.locator("[data-kind=\"portal\"]").first();
    await expect(portal).toBeVisible();
    // Intercept the navigation so we can read whether the event fired.
    const eventPromise = page.waitForRequest((req) =>
      /\/api\/halls\/[^/]+\/portals\/\d+\/click$/.test(req.url()) && req.method() === "POST",
      { timeout: 5_000 },
    ).catch(() => null);
    await portal.click({ button: "left" }).catch(() => {});
    const evt = await eventPromise;
    expect(evt, "portal_click POST must fire on portal navigation").not.toBeNull();
  });
});
