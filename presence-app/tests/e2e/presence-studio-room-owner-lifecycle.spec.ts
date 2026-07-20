import { expect, test, type Page } from "playwright/test";

const api = "http://127.0.0.1:5105";
const ownerToken = "owner-test-token";
const marker = "Browser lifecycle archive proof";
const primaryKitIds = [
  "gallery-artist",
  "cultural-community-artist",
  "material-tradie-proof-card",
  "healing-practitioner",
  "consultant-contractor",
];

async function signInOwner(page: Page) {
  await page.goto("/");
  await page.evaluate((token) => {
    window.localStorage.setItem("presence:e2e:access_token", token);
  }, ownerToken);
}

test("owner creates, edits, saves, reloads, and keeps a TemplateKit Studio Room draft private", async ({
  page,
  context,
  request,
}) => {
  await request.post(`${api}/__test__/reset`);
  await signInOwner(page);

  await page.goto("/studio/template-kits", { waitUntil: "networkidle" });
  await expect(page.getByTestId("template-kit-starter")).toBeVisible();
  await expect(page.locator('[data-testid^="template-kit-card-"]')).toHaveCount(5);
  for (const kitId of primaryKitIds) {
    await expect(page.getByTestId(`template-kit-card-${kitId}`)).toBeVisible();
  }
  await expect(page.getByTestId("template-kit-card-underground-dj-portal")).toHaveCount(0);
  await expect(page.getByText("Underground DJ / Minimal Performer Portal")).toHaveCount(0);

  await page.getByTestId("template-kit-select-cultural-community-artist").click();
  const createResponse = page.waitForResponse((response) =>
    response.url().includes("/api/presence/owner/studio-rooms/from-template-kit") &&
    response.request().method() === "POST",
  );
  await page.getByTestId("template-kit-create-draft").click();
  const created = await createResponse;
  expect(created.status()).toBe(201);
  const createdBody = await created.json();
  expect(createdBody.data).toMatchObject({
    template_kit_id: "cultural-community-artist",
    support_state: "primary",
    status: "draft",
    visibility: "private",
    public_status: "draft",
    published: null,
    published_at: null,
  });

  const roomId = createdBody.data.room_id as number;
  const slug = createdBody.data.slug as string;
  await expect(page).toHaveURL(new RegExp(`/studio/${roomId}/studio-room$`));
  await expect(page.getByTestId("studio-room-owner-editor-shell")).toBeVisible();
  await expect(page.getByTestId("studio-room-draft-warning")).toContainText("private draft only");
  await expect(page.getByTestId("studio-room-chamber-panel")).toBeVisible();
  await expect(page.getByTestId("studio-room-inspector-panel")).toBeVisible();
  await expect(page.getByTestId("studio-room-preview-panel")).toBeVisible();
  await expect(page.getByTestId("studio-room-canvas-shell")).toBeVisible();
  await expect(page.getByTestId("studio-room-save-draft")).toBeDisabled();
  await expect(page.getByRole("button", { name: /publish/i })).toHaveCount(0);
  await expect(page.locator('a[href^="/p/"], a[href^="/presence/"]')).toHaveCount(0);

  await page.getByLabel("Chamber summary").fill(marker);
  await expect(page.getByTestId("studio-room-save-draft")).toBeEnabled();
  await expect(page.getByTestId("studio-room-canvas-shell")).toContainText(marker);

  const saveResponse = page.waitForResponse((response) =>
    response.url().includes(`/api/presence/owner/studio-rooms/${roomId}/draft`) &&
    response.request().method() === "PATCH",
  );
  await page.getByTestId("studio-room-save-draft").click();
  const saved = await saveResponse;
  expect(saved.ok()).toBeTruthy();
  const savedBody = await saved.json();
  expect(savedBody.data).toMatchObject({
    room_id: roomId,
    template_kit_id: "cultural-community-artist",
    status: "draft",
    visibility: "private",
    public_status: "draft",
    published: null,
    published_config_present: false,
    published_at: null,
  });
  await expect(page.getByText("Draft saved. Public routes are unchanged.")).toBeVisible();
  await expect(page.getByTestId("studio-room-canvas-shell")).toContainText(marker);
  await expect(page.getByTestId("studio-room-canvas-shell")).toHaveAttribute("data-dirty", "false");

  await page.reload({ waitUntil: "networkidle" });
  await expect(page).toHaveURL(new RegExp(`/studio/${roomId}/studio-room$`));
  await expect(page.getByTestId("studio-room-canvas-shell")).toContainText(marker);
  await expect(page.getByRole("button", { name: /publish/i })).toHaveCount(0);

  const publicApi = await request.get(`${api}/api/presence/public/${slug}`);
  expect(publicApi.status()).toBe(404);
  const publicPage = await context.newPage();
  await publicPage.goto(`/p/${slug}`, { waitUntil: "networkidle" });
  await expect(publicPage.getByText("Presence not public yet")).toBeVisible();
  await expect(publicPage.getByText(marker)).toHaveCount(0);
  await publicPage.close();

  const candidateCreate = await request.post(`${api}/api/presence/owner/studio-rooms/from-template-kit`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
    data: {
      kit_id: "underground-dj-portal",
      draft_payload: {},
    },
  });
  expect(candidateCreate.status()).toBe(403);

  const log = await (await request.get(`${api}/__test__/requests`)).json();
  const paths = (log.requests as Array<{ path: string }>).map((entry) => entry.path);
  expect(paths.some((path) => path.toLowerCase().includes("publish"))).toBe(false);
});
