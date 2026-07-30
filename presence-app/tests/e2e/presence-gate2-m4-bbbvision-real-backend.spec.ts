import { mkdirSync } from "node:fs";
import { expect, test, type APIRequestContext, type Page } from "playwright/test";

const enabled = process.env.PRESENCE_GATE2_M4_REAL_BACKEND === "1";
const apiBase = process.env.PRESENCE_GATE2_M4_API_BASE ?? "http://127.0.0.1:5015";
const ownerToken = process.env.PRESENCE_GATE2_M4_OWNER_TOKEN ?? "";
const evidenceDir =
  "docs/program/evidence/presence-gate2-m4-safe-draft-private-preview-20260727/screenshots";
const editedTitle = "Opening image - private M2 proof";
const realBackendUiTimeout = 20_000;

test.skip(!enabled, "Gate 2 M4 real-backend proof is opt-in.");
test.skip(enabled && !ownerToken, "PRESENCE_GATE2_M4_OWNER_TOKEN is required for real-backend proof.");

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

async function enterGalleryRoom(page: Page) {
  const enter = page.getByTestId("presence-public-bbbvision-enter");
  if (await enter.isVisible().catch(() => false)) {
    await enter.click();
  }
  await expect(page.getByTestId("presence-public-bbbvision-gallery")).toBeVisible({ timeout: realBackendUiTimeout });
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

async function applyM2M3PrivateOverlay(page: Page) {
  await selectOpeningWorkFromShelf(page);
  await page.getByTestId("presence-studio-v3-edit-action").click();
  await expect(page.getByTestId("presence-studio-v3-piece-editor")).toBeVisible();
  await page.getByTestId("presence-studio-v3-piece-title").fill(editedTitle);
  await page.getByTestId("presence-studio-v3-piece-done").click();

  await page.getByTestId("presence-studio-v3-arrange-action").click();
  await expect(page.getByTestId("presence-studio-v3-arrange-controls")).toContainText("Private organisation");
  await page.getByTestId("presence-studio-v3-zone-main-wall").click();
  await expect(page.getByTestId("presence-studio-v3-placement-summary")).toContainText("main-wall");
  await page.getByTestId("presence-studio-v3-size-large").click();
  await expect(page.getByTestId("presence-studio-v3-placement-summary")).toContainText("large");
  await page.getByRole("button", { name: "Done" }).click();
}

test("BBVision private preview labels source truth and does not expose private overlay publicly", async ({ page, request }) => {
  await enableLocalOwner(page);
  await clearPrivateState(request);

  const [worksBeforeResponse, collectionsBeforeResponse, publicApiBefore] = await Promise.all([
    request.get(`${apiBase}/api/presence/owner/nodes/29/works`, { headers: { Authorization: `Bearer ${ownerToken}` } }),
    request.get(`${apiBase}/api/presence/owner/nodes/29/collections`, { headers: { Authorization: `Bearer ${ownerToken}` } }),
    request.get(`${apiBase}/api/presence/public/bbbvision`),
  ]);
  expect(worksBeforeResponse.status()).toBe(200);
  expect(collectionsBeforeResponse.status()).toBe(200);
  expect(publicApiBefore.status()).toBe(404);
  const worksBefore = (await worksBeforeResponse.json()).data as Array<{ id: number; slug: string; title: string; collection_id: number | null }>;
  const collectionsBefore = (await collectionsBeforeResponse.json()).data as Array<{ id: number; title: string }>;
  expect(worksBefore.find((work) => work.id === 2901)).toMatchObject({
    id: 2901,
    slug: "bbb-opening-image",
    title: "Opening image",
    collection_id: 291,
  });
  expect(collectionsBefore.map((collection) => collection.title)).toEqual(["Threshold Sequence", "Gallery Field"]);

  const writes: Array<{ method: string; url: string }> = [];
  const recordWrites = (targetPage: Page) => targetPage.on("request", (browserRequest) => {
    const method = browserRequest.method();
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      writes.push({ method, url: browserRequest.url() });
    }
  });
  recordWrites(page);

  await openEditor(page);
  await enterGalleryRoom(page);
  await expect(page.getByTestId("presence-studio-v3-test-visitor")).toHaveText("Private preview");
  await page.getByTestId("presence-studio-v3-review-trigger").click();
  await expect(page.getByTestId("presence-studio-v3-review-readiness")).toContainText(
    "Server draft preview is deferred. Current M4 preview is a local/private Studio projection.",
  );
  await expect(page.getByTestId("presence-studio-v3-review-public-boundary")).toContainText(
    "This review does not publish or change the public payload in Gate 2.",
  );
  await expect(page.locator("button").filter({ hasText: /^Publish/i })).toHaveCount(0);
  await page.screenshot({ path: `${evidenceDir}/01-desktop-preview-source-review-status.png`, fullPage: true });
  await page.getByRole("button", { name: "Done reviewing" }).click();

  await applyM2M3PrivateOverlay(page);
  await page.getByTestId("presence-studio-v3-save-private-state").click();
  await expect(page.getByTestId("presence-studio-v3-save-status")).toHaveAttribute("data-save-phase", "saved", {
    timeout: realBackendUiTimeout,
  });
  await expect(page.getByTestId("presence-studio-v3-save-status")).toContainText("Visitor site unchanged");
  await page.screenshot({ path: `${evidenceDir}/02-desktop-private-overlay-saved-before-preview.png`, fullPage: true });

  const privateState = await request.get(`${apiBase}/api/presence/owner/rooms/29/editor/v3/state`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  expect(privateState.status()).toBe(200);
  const privateStatePayload = await privateState.json();
  const metadata = privateStatePayload.data.state.metadata as {
    placements: Array<Record<string, unknown>>;
    object_edits: Array<Record<string, unknown>>;
  };
  expect(metadata.placements.find((row) => row.sourceRef === "work:2901")).toMatchObject({
    sourceRef: "work:2901",
    roomId: "gallery",
    status: "placed",
  });
  expect(metadata.object_edits.find((row) => row.sourceRef === "work:2901")).toMatchObject({
    sourceRef: "work:2901",
    roomId: "gallery",
    title: editedTitle,
    zoneId: "main-wall",
    size: "large",
  });

  const reloadedPage = await page.context().newPage();
  recordWrites(reloadedPage);
  await enableLocalOwner(reloadedPage);
  await page.close();
  page = reloadedPage;
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await ensureLocalOwnerStorage(page);
  await page.goto("/studio/29/editor", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("presence-studio-v3-shell")).toBeVisible({ timeout: realBackendUiTimeout });
  await ensureLocalOwnerStorage(page);
  await closeHomeIfOpen(page);
  await enterGalleryRoom(page);
  await selectOpeningWorkFromShelf(page);
  await expect(page.getByTestId("presence-studio-v3-action-bar")).toContainText(editedTitle);
  await page.getByTestId("presence-studio-v3-arrange-action").click();
  await expect(page.getByTestId("presence-studio-v3-placement-summary")).toContainText("main-wall");
  await expect(page.getByTestId("presence-studio-v3-placement-summary")).toContainText("large");
  await page.getByRole("button", { name: "Done" }).click();
  await page.screenshot({ path: `${evidenceDir}/03-desktop-private-overlay-reloaded.png`, fullPage: true });

  await page.getByTestId("presence-studio-v3-test-visitor").click();
  await expect(page.locator(".studio-v3-shell.is-testing-visitor")).toBeVisible();
  const sourcePanel = page.getByTestId("presence-studio-v3-preview-source-panel");
  await expect(sourcePanel).toContainText("Private preview");
  await expect(sourcePanel).toContainText("Local preview - uses your unsent Studio changes");
  await expect(sourcePanel).toContainText("Private Studio overlay is active");
  await expect(sourcePanel).toContainText("Canonical Works and Collections stay unchanged");
  await expect(sourcePanel).toContainText("Visitor site unchanged");
  await expect(sourcePanel).toContainText("This action does not publish");
  await expect(sourcePanel).toContainText("Not a public preview link");
  await expect(sourcePanel).toContainText("Publish is not available in this gate");
  await expect(page.getByRole("button", { name: new RegExp(editedTitle) })).toBeVisible({ timeout: realBackendUiTimeout });
  await page.screenshot({ path: `${evidenceDir}/04-desktop-private-preview-source-labelled.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".studio-v3-shell.is-testing-visitor")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v3-preview-source-panel")).toContainText("Local preview - uses your unsent Studio changes");
  await expect(page.getByRole("button", { name: new RegExp(editedTitle) })).toBeVisible({ timeout: realBackendUiTimeout });
  await page.screenshot({ path: `${evidenceDir}/05-mobile-private-preview-source-labelled.png`, fullPage: true });

  const [worksAfterResponse, collectionsAfterResponse, publicApiAfter] = await Promise.all([
    request.get(`${apiBase}/api/presence/owner/nodes/29/works`, { headers: { Authorization: `Bearer ${ownerToken}` } }),
    request.get(`${apiBase}/api/presence/owner/nodes/29/collections`, { headers: { Authorization: `Bearer ${ownerToken}` } }),
    request.get(`${apiBase}/api/presence/public/bbbvision`),
  ]);
  const worksAfter = (await worksAfterResponse.json()).data as typeof worksBefore;
  const collectionsAfter = (await collectionsAfterResponse.json()).data as typeof collectionsBefore;
  expect(worksAfter).toEqual(worksBefore);
  expect(collectionsAfter).toEqual(collectionsBefore);
  expect(publicApiAfter.status()).toBe(404);

  const publicP = await page.goto("/p/bbbvision", { waitUntil: "domcontentloaded" });
  expect(publicP?.status()).toBe(404);
  await expect(page.locator("body")).not.toContainText(editedTitle);
  await expect(page.locator("body")).not.toContainText("main-wall");
  await page.screenshot({ path: `${evidenceDir}/06-public-p-bbbvision-unpublished.png`, fullPage: true });

  const publicPresence = await page.goto("/presence/bbbvision", { waitUntil: "domcontentloaded" });
  expect([200, 404]).toContain(publicPresence?.status() ?? 0);
  await expect(page.locator("body")).not.toContainText(editedTitle);
  await expect(page.locator("body")).not.toContainText("main-wall");
  await page.screenshot({ path: `${evidenceDir}/07-public-presence-bbbvision-unchanged.png`, fullPage: true });

  await page.goto("/studio/1/works", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Add your first work")).toBeVisible({ timeout: realBackendUiTimeout });
  await page.screenshot({ path: `${evidenceDir}/08-room-1-empty-works-control.png`, fullPage: true });

  await page.goto("/studio/1/editor", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).not.toContainText(editedTitle);
  await page.screenshot({ path: `${evidenceDir}/09-room-1-editor-control.png`, fullPage: true });

  expect(writes).toEqual([
    { method: "PUT", url: `${apiBase}/api/presence/owner/rooms/29/editor/v3/state` },
  ]);
});
