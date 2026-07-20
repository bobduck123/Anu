import { expect, test, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";
const roomId = 11;

async function signInFixtureOwner(page: Page) {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.setItem("presence:e2e:access_token", "owner-test-token"));
}

test.beforeEach(async ({ request }) => {
  await request.post(`${API_BASE}/__test__/reset`);
  await request.post(`${API_BASE}/__test__/state`, {
    data: { useGgmPrivateProof: true },
  });
});

test("local Room 11-shaped GGM fixture autosaves, reloads, restores, previews privately, and never publishes", async ({
  page,
  request,
}) => {
  const observedRequests: string[] = [];
  page.on("request", (entry) => observedRequests.push(entry.url()));
  await signInFixtureOwner(page);

  await page.goto(`/studio/${roomId}/editor`, { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-private-proof")).toContainText("Private working proof");
  await expect(page.getByTestId("presence-studio-v2-share-action")).toHaveCount(0);
  await expect(page.getByTestId("presence-studio-v2-publish-action")).toHaveCount(0);

  const object = page.getByTestId("presence-studio-v2-outline-object").filter({ hasText: "Private install note" });
  await object.click();
  const title = page.getByTestId("studio-v2-object-title");
  const originalTitle = await title.inputValue();
  const marker = `${originalTitle} private local proof`;

  const autosave = page.waitForResponse((response) =>
    response.url().includes(`/api/presence/owner/rooms/${roomId}/editor/draft`) &&
    ["POST", "PATCH"].includes(response.request().method()),
  );
  await title.fill(marker);
  expect((await autosave).ok()).toBeTruthy();
  await expect(page.getByTestId("presence-studio-v2-saved")).toContainText("Autosaved", { timeout: 10_000 });

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByText(marker).first()).toBeVisible();

  await page.getByTestId("presence-studio-v2-outline-object").filter({ hasText: marker }).click();
  const restoreSave = page.waitForResponse((response) =>
    response.url().includes(`/api/presence/owner/rooms/${roomId}/editor/draft`) &&
    ["POST", "PATCH"].includes(response.request().method()),
  );
  await page.getByTestId("studio-v2-object-title").fill(originalTitle);
  expect((await restoreSave).ok()).toBeTruthy();
  await expect(page.getByTestId("presence-studio-v2-saved")).toContainText("Autosaved", { timeout: 10_000 });

  await page.goto(`/studio/${roomId}/editor/preview`, { waitUntil: "networkidle" });
  await expect(page.getByText("Draft preview - only you can see this")).toBeVisible();
  await expect(page.getByTestId("preview-private-proof-notice")).toBeVisible();
  await expect(page.getByTestId("preview-open-to-visitors")).toHaveCount(0);

  const ownerNode = await request.get(`${API_BASE}/api/presence/owner/nodes/${roomId}`, {
    headers: { Authorization: "Bearer owner-test-token" },
  });
  expect(ownerNode.ok()).toBeTruthy();
  const nodePayload = await ownerNode.json();
  expect(nodePayload.data.status).toBe("draft");
  expect(nodePayload.data.visibility).toBe("private");
  expect(nodePayload.data.public_status).toBe("private");
  expect(observedRequests.some((url) => url.includes(`/api/presence/owner/rooms/${roomId}/editor/publish`))).toBe(false);
});
