import { expect, test, type Page } from "playwright/test";

const MOCK_SERVER_ORIGIN = "http://127.0.0.1:5105";

async function signInOwner(page: Page, token = "owner-test-token") {
  await page.goto("/");
  await page.evaluate((value) => window.localStorage.setItem("presence:e2e:access_token", value), token);
}

test("room 29 bbbvision enters Studio V2 editor without changing public routes or writing drafts", async ({
  page,
  request,
}) => {
  await request.post(`${MOCK_SERVER_ORIGIN}/__test__/reset`);
  await signInOwner(page);

  await page.goto("/studio/29/editor", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-field-title").locator("input")).toHaveValue("bbb.vision");
  await expect(page.getByTestId("presence-studio-v2-layout-composer")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-preview-action")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-save")).toBeDisabled();

  await page.getByTestId("presence-studio-v2-preview-action").click();
  await expect(page).toHaveURL(/\/studio\/29\/editor\/preview/);
  await expect(page.getByText("Draft preview - only you can see this")).toBeVisible();
  await expect(page.locator(".presence-studio-v2-public").first()).toBeVisible();
  await expect(page.getByText("bbb.vision").first()).toBeVisible();

  const publicCanonical = await page.goto("/p/bbbvision", { waitUntil: "networkidle" });
  expect(publicCanonical?.status()).toBe(200);
  await expect(page.getByText("bbb.vision").first()).toBeVisible();

  const publicLegacy = await page.goto("/presence/bbbvision", { waitUntil: "networkidle" });
  expect(publicLegacy?.status()).toBe(200);
  await expect(page.getByText("bbb.vision").first()).toBeVisible();

  await page.goto("/studio/101/editor", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v2-root")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Mara Vale Test Room" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Preview draft room" })).toBeVisible();

  const requestLog = await (await request.get(`${MOCK_SERVER_ORIGIN}/__test__/requests`)).json() as {
    requests: Array<{ method: string; path: string }>;
  };
  expect(
    requestLog.requests.some((entry) => entry.path.includes("/editor/publish")),
    "eligibility proof must not publish",
  ).toBe(false);
  expect(
    requestLog.requests.some((entry) => entry.path.includes("/editor/draft") && entry.method !== "GET"),
    "eligibility proof must not write drafts",
  ).toBe(false);
});
