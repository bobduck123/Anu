import { expect, test, type APIRequestContext, type Page } from "playwright/test";
import fixtures from "../fixtures/presenceGraph.json";

const API_BASE = "http://127.0.0.1:5105";
const TEST_TOKEN = "presence-e2e-token";

test.beforeEach(async ({ request }) => {
  await request.post(`${API_BASE}/__test__/reset`);
});

test("RoomKey entry resolves, renders actions, and captures one encounter", async ({ page, request }) => {
  await page.goto("/r/test-room-key-token");

  // Tolerate both straight and curly apostrophe in the canonical "You've entered" copy.
  await expect(page.getByText(/You.?ve entered this Room\./)).toBeVisible();
  await expect(page.getByRole("heading", { name: fixtures.room.display_name })).toBeVisible();
  // Two Enter Room links exist after Pass 8.2 (sticky mobile bar + main column);
  // assert the FIRST link's destination so the test passes on every viewport.
  await expect(page.getByRole("link", { name: /Enter Room/i }).first()).toHaveAttribute("href", `/presence/${fixtures.room.slug}`);
  await expect(page.getByRole("button", { name: /Save Room/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Add to Mood Board/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Walk a Path/i })).toHaveAttribute("href", `/paths/from-room/${fixtures.room.id}`);

  await expect
    .poll(async () => countRequests(request, "POST", `/api/presence/rooms/${fixtures.room.id}/encounters`))
    .toBe(1);
});

test("invalid RoomKey shows safe inactive state", async ({ page, request }) => {
  await page.goto("/r/revoked-room-key-token");

  await expect(page.getByRole("heading", { name: "This Room Key is no longer active." })).toBeVisible();
  await expect(page.getByText(/stack|traceback|authorization|private analytics/i)).toHaveCount(0);
  await expect.poll(async () => countRequests(request, "POST", `/api/presence/rooms/${fixtures.room.id}/encounters`)).toBe(0);
});

test("guest save prompts Observer Mask without blocking Room entry", async ({ page }) => {
  await page.goto("/r/test-room-key-token");
  await expect(page.getByRole("heading", { name: fixtures.room.display_name })).toBeVisible();

  await page.getByRole("button", { name: /Save Room/i }).click();

  await expect(page.getByText("Create an Observer Mask to remember this Room.")).toBeVisible();
  await expect(page.getByText(/Observer mode lets you save Rooms/i).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Sign in/i })).toBeVisible();
});

test("Observer Mask creation can complete the save flow", async ({ page, request }) => {
  await authenticateObserver(page, request, { observerExists: false });
  await page.goto("/r/test-room-key-token");

  await page.getByRole("button", { name: /Save Room/i }).click();
  await page.getByPlaceholder(/quiet-walker/i).fill("test-observer-mask");
  await page.getByPlaceholder(/No links or promotion/i).fill("Collecting rooms and paths.");
  await page.getByRole("button", { name: "Create Observer Mask" }).click();
  await expect(page.getByText("Observer Mask ready.")).toBeVisible();

  await page.getByRole("button", { name: /Save Room/i }).click();
  await expect(page.getByText("Saved to your Passport.")).toBeVisible();
  await expect.poll(async () => countRequests(request, "POST", `/api/observer/rooms/${fixtures.room.id}/save`)).toBe(1);
});

test("Passport renders empty and saved memory states", async ({ page, request }) => {
  await authenticateObserver(page, request, { observerExists: true });
  await page.goto("/observer/passport");
  await expect(page.getByRole("heading", { name: "Your Passport is empty." })).toBeVisible();

  await request.post(`${API_BASE}/__test__/state`, { data: { observer: true, passportMode: "saved" } });
  await page.reload();

  await expect(page.getByRole("heading", { name: /Memory, not analytics/i })).toBeVisible();
  await expect(page.getByText("Mara Vale Test Room").first()).toBeVisible();
  await expect(page.getByText("Saved Rooms")).toBeVisible();
});

test("Mood Boards can be created and receive the current Room", async ({ page, request }) => {
  await authenticateObserver(page, request, { observerExists: true });
  await page.goto("/observer/mood-boards");

  await expect(page.getByRole("heading", { name: "Mood Boards are maps of taste." })).toBeVisible();
  await page.getByPlaceholder("Board title").fill("Materials board");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("link", { name: /Materials board/i })).toBeVisible();

  await page.goto("/r/test-room-key-token");
  await page.getByRole("button", { name: /Add to Mood Board/i }).click();
  await page.getByRole("button", { name: "Add Room" }).click();
  await expect(page.getByText("Added to Mood Board.")).toBeVisible();
  await expect.poll(async () => countRequests(request, "POST", /\/api\/observer\/mood-boards\/\d+\/items/)).toBe(1);
});

test("Path from Room renders waypoints, reasons, choices, and records observer walk", async ({ page, request }) => {
  await authenticateObserver(page, request, { observerExists: true });
  await page.goto(`/paths/from-room/${fixtures.room.id}`);

  await expect(page.getByRole("heading", { name: fixtures.path.title })).toBeVisible();
  await expect(page.getByText("Choose a direction.").first()).toBeVisible();
  await expect(page.getByText("Trailhead Room from Test NFC Card.").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Follow the mood/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Surprise me/i })).toBeVisible();

  await page.getByRole("button", { name: /Start Path/i }).click();
  await expect(page.getByText("Path walk started.")).toBeVisible();
  await page.getByRole("button", { name: /Follow the mood/i }).click();
  await expect(page.getByText("Ochre and paper references").first()).toBeVisible();
  await expect.poll(async () => countRequests(request, "POST", `/api/observer/paths/${fixtures.path.id}/walks`)).toBe(1);
  await expect.poll(async () => countRequests(request, "POST", `/api/observer/paths/${fixtures.path.id}/choose`)).toBe(1);
});

test("Path from Mood Board renders board-derived path", async ({ page, request }) => {
  await authenticateObserver(page, request, { observerExists: true });
  await page.goto(`/paths/from-mood-board/${fixtures.moodBoard.id}`);

  await expect(page.getByRole("heading", { name: fixtures.path.title })).toBeVisible();
  await expect(page.getByText("Choose a direction.").first()).toBeVisible();
  await expect(page.getByText("Mara Vale Test Room").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Follow the mood/i })).toBeVisible();
});

test("owner Presence Pass and Room Key Studio supports create and copy-ready URLs", async ({ page, request }) => {
  await authenticateObserver(page, request, { observerExists: true });
  await page.goto(`/studio/${fixtures.room.id}/passes`);

  await expect(page.getByText("Your Presence Pass opens your Room from NFC")).toBeVisible();
  await expect(page.getByText("No Room Keys yet.")).toBeVisible();

  await page.getByRole("button", { name: "Create Pass" }).click();
  await expect(page.getByText("Presence Pass created.")).toBeVisible();
  await expect(page.getByText("Launch Presence Pass")).toBeVisible();

  await page.getByRole("button", { name: "Create Key" }).click();
  await expect(page.getByText("Room Key created.")).toBeVisible();
  await expect(page.getByText("First NFC card")).toBeVisible();
  await expect(page.getByText(/\/r\/created-room-key-/)).toBeVisible();
});

test("owner analytics shows aggregate graph activity without private observer identity", async ({ page, request }) => {
  await authenticateObserver(page, request, { observerExists: true });
  await page.goto(`/studio/${fixtures.room.id}/analytics`);

  await expect(page.getByText("Room entries")).toBeVisible();
  await expect(page.getByText("Rooms saved")).toBeVisible();
  await expect(page.getByText("Best performing Room Keys")).toBeVisible();
  await expect(page.getByText("Test NFC Card")).toBeVisible();
  await expect(page.getByText(/observer@example\.test/i)).toHaveCount(0);
});

test("World stays hidden/forming publicly", async ({ page }) => {
  await page.goto("/world");

  await expect(page.getByText("The World is forming. Rooms will open into a shared map once enough places, paths, and traces exist.")).toBeVisible();
  await expect(page.getByText("No fake map.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Create a Presence Room/i })).toHaveAttribute("href", "/presence-chooser");
  await expect(page.getByText(/open global map|world map canvas|leaflet/i)).toHaveCount(0);
});

test("existing public routes still render against stable fixtures", async ({ page }) => {
  await page.goto("/p/test-presence-room");
  await expect(page.getByText("Mara Vale Test Room").first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Internal Server Error");

  await page.goto("/presence/test-presence-room");
  await expect(page.getByText("Mara Vale Test Room").first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Internal Server Error");

  await page.goto("/presence-chooser");
  await expect(page.getByText(/Set the direction|Presence Studio|Welcome/i).first()).toBeVisible();
});

async function authenticateObserver(
  page: Page,
  request: APIRequestContext,
  options: { observerExists: boolean },
) {
  await request.post(`${API_BASE}/__test__/state`, { data: { observer: options.observerExists } });
  await page.addInitScript((token) => {
    window.localStorage.setItem("presence:e2e:access_token", token);
  }, TEST_TOKEN);
}

async function countRequests(
  request: APIRequestContext,
  method: string,
  path: string | RegExp,
) {
  const response = await request.get(`${API_BASE}/__test__/requests`);
  const data = await response.json() as { requests: Array<{ method: string; path: string }> };
  return data.requests.filter((entry) => {
    const pathMatches = typeof path === "string" ? entry.path === path : path.test(entry.path);
    return entry.method === method && pathMatches;
  }).length;
}
