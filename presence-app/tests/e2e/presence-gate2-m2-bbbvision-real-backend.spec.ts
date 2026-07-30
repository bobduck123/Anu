import { mkdirSync } from "node:fs";
import { expect, test, type APIRequestContext, type Page } from "playwright/test";

const enabled = process.env.PRESENCE_GATE2_M2_REAL_BACKEND === "1";
const apiBase = process.env.PRESENCE_GATE2_M2_API_BASE ?? "http://127.0.0.1:5015";
const ownerToken = process.env.PRESENCE_GATE2_M2_OWNER_TOKEN ?? "";
const evidenceDir =
  "docs/program/evidence/presence-gate2-m2-first-real-work-edit-bbbvision-20260727/screenshots";
const editedTitle = "Opening image - private M2 proof";
const realBackendUiTimeout = 20_000;

test.skip(!enabled, "Gate 2 M2 real-backend proof is opt-in.");
test.skip(enabled && !ownerToken, "PRESENCE_GATE2_M2_OWNER_TOKEN is required for real-backend proof.");

mkdirSync(evidenceDir, { recursive: true });

async function enableLocalOwner(page: Page) {
  const seedOwner = (token: string) => {
    window.localStorage.setItem("presence:e2e:access_token", token);
    window.localStorage.setItem("presence-studio-v3:bbb-pilot", "1");
    window.localStorage.setItem("presence-onboarded:gallery-bbbvision", "1");
    document.cookie = `presence_e2e_session=${token}; Path=/; SameSite=Lax`;
  };
  await page.context().addInitScript(seedOwner, ownerToken);
  await page.addInitScript(seedOwner, ownerToken);
}

async function ensureLocalOwnerStorage(page: Page) {
  await page.evaluate((token) => {
    window.localStorage.setItem("presence:e2e:access_token", token);
    window.localStorage.setItem("presence-studio-v3:bbb-pilot", "1");
    window.localStorage.setItem("presence-onboarded:gallery-bbbvision", "1");
    document.cookie = `presence_e2e_session=${token}; Path=/; SameSite=Lax`;
  }, ownerToken);
}

async function clearPrivateState(request: APIRequestContext) {
  const response = await request.delete(`${apiBase}/api/presence/owner/rooms/29/editor/v3/state`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  expect([200, 404]).toContain(response.status());
}

async function closeHomeIfOpen(page: Page) {
  const homeCopy = page.getByText("V3 metadata remains owner-private", { exact: false }).first();
  if (await homeCopy.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "Studio Home" }).click();
  }
}

async function openEditor(page: Page) {
  await page.goto("/studio/29/editor", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v3-shell")).toBeVisible({ timeout: realBackendUiTimeout });
  await closeHomeIfOpen(page);
}

async function selectOpeningWorkFromShelf(page: Page) {
  await page.getByTestId("presence-studio-v3-shelf-trigger").click();
  const card = page.getByTestId("presence-studio-v3-piece-work-2901");
  await expect(card).toContainText("Owner Work");
  await expect(card).toContainText("Opening image");
  const place = card.getByRole("button", { name: "Place in Room" });
  if (await place.isVisible().catch(() => false)) await place.click();
  await card.getByRole("button", { name: "Inspect / edit" }).click();
  await expect(page.getByTestId("presence-studio-v3-action-bar")).toBeVisible();
}

test("real BBBVision Work 2901 edits, saves, reloads, previews privately, and leaves public/canonical data unchanged", async ({ page, request }) => {
  await enableLocalOwner(page);
  await clearPrivateState(request);

  const publicApiBefore = await request.get(`${apiBase}/api/presence/public/bbbvision`);
  expect(publicApiBefore.status()).toBe(404);
  const worksBefore = await request.get(`${apiBase}/api/presence/owner/nodes/29/works`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  expect(worksBefore.status()).toBe(200);
  const openingBefore = ((await worksBefore.json()).data as Array<{ id: number; slug: string; title: string }>)
    .find((work) => work.id === 2901);
  expect(openingBefore).toMatchObject({ id: 2901, slug: "bbb-opening-image", title: "Opening image" });

  const writes: Array<{ method: string; url: string }> = [];
  page.on("request", (browserRequest) => {
    const method = browserRequest.method();
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      writes.push({ method, url: browserRequest.url() });
    }
  });

  await openEditor(page);
  await selectOpeningWorkFromShelf(page);
  await page.getByTestId("presence-studio-v3-edit-action").click();
  await expect(page.getByTestId("presence-studio-v3-piece-editor")).toBeVisible();
  await page.getByTestId("presence-studio-v3-piece-title").fill(editedTitle);
  await page.getByTestId("presence-studio-v3-piece-done").click();
  await expect(page.getByTestId("presence-studio-v3-action-bar")).toContainText(editedTitle);
  await page.screenshot({ path: `${evidenceDir}/01-desktop-work-2901-private-title-edit.png`, fullPage: true });

  await page.getByTestId("presence-studio-v3-save-private-state").click();
  await expect(page.getByTestId("presence-studio-v3-save-status")).toHaveAttribute("data-save-phase", "saved", {
    timeout: realBackendUiTimeout,
  });
  await expect(page.getByTestId("presence-studio-v3-save-status")).toContainText("Saved privately");
  await page.screenshot({ path: `${evidenceDir}/02-desktop-work-2901-saved-privately.png`, fullPage: true });

  const privateState = await request.get(`${apiBase}/api/presence/owner/rooms/29/editor/v3/state`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  expect(privateState.status()).toBe(200);
  const privateStatePayload = await privateState.json();
  const objectEdits = privateStatePayload.data.state.metadata.object_edits as Array<Record<string, unknown>>;
  expect(objectEdits.find((row) => row.sourceRef === "work:2901")).toMatchObject({
    title: editedTitle,
    sourceRef: "work:2901",
    roomId: "threshold",
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await ensureLocalOwnerStorage(page);
  await openEditor(page);
  await selectOpeningWorkFromShelf(page);
  await expect(page.getByTestId("presence-studio-v3-action-bar")).toContainText(editedTitle);
  await page.screenshot({ path: `${evidenceDir}/03-desktop-work-2901-reloaded-private-overlay.png`, fullPage: true });

  await page.getByTestId("presence-studio-v3-test-visitor").click();
  await expect(page.locator(".studio-v3-shell.is-testing-visitor")).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(editedTitle) })).toBeVisible({ timeout: realBackendUiTimeout });
  await page.screenshot({ path: `${evidenceDir}/04-desktop-test-as-visitor-private-overlay.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await ensureLocalOwnerStorage(page);
  await openEditor(page);
  await selectOpeningWorkFromShelf(page);
  await expect(page.getByTestId("presence-studio-v3-action-bar")).toContainText(editedTitle);
  await page.screenshot({ path: `${evidenceDir}/05-mobile-work-2901-reloaded-private-overlay.png`, fullPage: true });

  const worksAfter = await request.get(`${apiBase}/api/presence/owner/nodes/29/works`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const openingAfter = ((await worksAfter.json()).data as Array<{ id: number; title: string }>).find((work) => work.id === 2901);
  expect(openingAfter).toMatchObject({ id: 2901, title: "Opening image" });

  const publicApiAfter = await request.get(`${apiBase}/api/presence/public/bbbvision`);
  expect(publicApiAfter.status()).toBe(404);
  const publicP = await page.goto("/p/bbbvision", { waitUntil: "networkidle" });
  expect(publicP?.status()).toBe(404);
  await expect(page.locator("body")).not.toContainText(editedTitle);
  await page.screenshot({ path: `${evidenceDir}/06-public-p-bbbvision-unpublished.png`, fullPage: true });

  const publicPresence = await page.goto("/presence/bbbvision", { waitUntil: "networkidle" });
  expect([200, 404]).toContain(publicPresence?.status() ?? 0);
  await expect(page.locator("body")).not.toContainText(editedTitle);
  await page.screenshot({ path: `${evidenceDir}/07-public-presence-bbbvision-unchanged.png`, fullPage: true });

  await page.goto("/studio/1/works", { waitUntil: "networkidle" });
  await expect(page.getByText("Add your first work")).toBeVisible({ timeout: realBackendUiTimeout });
  await page.screenshot({ path: `${evidenceDir}/08-room-1-empty-works-control.png`, fullPage: true });

  expect(writes).toEqual([
    { method: "PUT", url: `${apiBase}/api/presence/owner/rooms/29/editor/v3/state` },
  ]);
});
