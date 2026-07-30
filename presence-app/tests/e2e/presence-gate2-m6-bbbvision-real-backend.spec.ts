import { mkdirSync } from "node:fs";
import { expect, test, type APIRequestContext, type Page } from "playwright/test";
import type { PresenceEditableConfig } from "../../lib/api/types";
import {
  comparableConfigFromEditableConfig,
  fingerprintStudioV3BaseConfig,
  studioV3PostPayloadFromComparable,
} from "../../lib/presence/studio-v3/fingerprint";

const enabled = process.env.PRESENCE_GATE2_M6_REAL_BACKEND === "1";
const apiBase = process.env.PRESENCE_GATE2_M6_API_BASE ?? "http://127.0.0.1:5015";
const ownerToken = process.env.PRESENCE_GATE2_M6_OWNER_TOKEN ?? "";
const evidenceDir =
  "docs/program/evidence/presence-gate2-m6-bbbvision-private-collection-curation-20260727/screenshots";
const editedTitle = "Opening image - private M2 proof";
const realBackendUiTimeout = 20_000;

test.skip(!enabled, "Gate 2 M6 real-backend proof is opt-in.");
test.skip(enabled && !ownerToken, "PRESENCE_GATE2_M6_OWNER_TOKEN is required for real-backend proof.");

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
  if (await enter.isVisible().catch(() => false)) await enter.click();
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

async function applyM2M3M6PrivateOverlay(page: Page) {
  await selectOpeningWorkFromShelf(page);
  await page.getByTestId("presence-studio-v3-edit-action").click();
  await expect(page.getByTestId("presence-studio-v3-piece-editor")).toBeVisible();
  await page.getByTestId("presence-studio-v3-piece-title").fill(editedTitle);
  await page.getByTestId("presence-studio-v3-piece-done").click();
  await page.getByTestId("presence-studio-v3-arrange-action").click();
  await page.getByTestId("presence-studio-v3-zone-main-wall").click();
  await expect(page.getByTestId("presence-studio-v3-placement-summary")).toContainText("main-wall");
  await page.getByTestId("presence-studio-v3-size-large").click();
  await expect(page.getByTestId("presence-studio-v3-placement-summary")).toContainText("large");
  await expect(page.getByTestId("presence-studio-v3-private-collection-curation")).toContainText("Private Collection curation");
  await page.getByTestId("presence-studio-v3-collection-option-collection-292").click();
  await expect(page.getByTestId("presence-studio-v3-collection-current")).toContainText("Gallery Field");
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByTestId("presence-studio-v3-selected-collection-summary")).toContainText("Private Collection: Gallery Field");
}

async function readPrivateState(request: APIRequestContext) {
  const response = await request.get(`${apiBase}/api/presence/owner/rooms/29/editor/v3/state`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  expect(response.status()).toBe(200);
  return (await response.json()).data.state as {
    metadata_revision: number;
    base: Record<string, unknown>;
    metadata: { object_edits?: Array<Record<string, unknown>>; placements?: Array<Record<string, unknown>> };
  };
}

async function readEditorDraft(request: APIRequestContext): Promise<PresenceEditableConfig> {
  const response = await request.get(`${apiBase}/api/presence/owner/rooms/29/editor`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  expect(response.status()).toBe(200);
  const overview = (await response.json()).data as { draft: PresenceEditableConfig | null };
  if (!overview.draft) throw new Error("BBVision room 29 must have a draft base for M6 proof.");
  return overview.draft;
}

async function bumpLocalDraftBase(request: APIRequestContext) {
  const draft = await readEditorDraft(request);
  const comparable = comparableConfigFromEditableConfig(draft);
  const fingerprint = await fingerprintStudioV3BaseConfig(comparable);
  const nextComparable = {
    ...comparable,
    style_dna: {
      ...comparable.style_dna,
      studio_v2: {
        ...((comparable.style_dna.studio_v2 && typeof comparable.style_dna.studio_v2 === "object")
          ? comparable.style_dna.studio_v2 as Record<string, unknown>
          : {}),
        m6_rebase_marker: new Date().toISOString(),
      },
    },
  };
  const response = await request.put(`${apiBase}/api/presence/owner/rooms/29/editor/v3/draft`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
    data: {
      expected: {
        room_id: draft.room_id,
        config_id: draft.id,
        version: draft.version,
        revision: draft.revision,
        schema_version: draft.schema_version,
        fingerprint,
      },
      config: studioV3PostPayloadFromComparable(nextComparable),
    },
  });
  expect(response.status()).toBe(200);
  return (await response.json()).data.committed as { revision: number; fingerprint: string };
}

test("BBVision private Collection curation saves, reloads, previews, and rebases without canonical or public mutation", async ({ page, request }) => {
  await enableLocalOwner(page);
  await clearPrivateState(request);

  const [worksBeforeResponse, collectionsBeforeResponse, publicApiBefore] = await Promise.all([
    request.get(`${apiBase}/api/presence/owner/nodes/29/works`, { headers: { Authorization: `Bearer ${ownerToken}` } }),
    request.get(`${apiBase}/api/presence/owner/nodes/29/collections`, { headers: { Authorization: `Bearer ${ownerToken}` } }),
    request.get(`${apiBase}/api/presence/public/bbbvision`),
  ]);
  expect(publicApiBefore.status()).toBe(404);
  const worksBefore = (await worksBeforeResponse.json()).data as Array<{ id: number; title: string; collection_id: number | null }>;
  const collectionsBefore = (await collectionsBeforeResponse.json()).data as Array<{ id: number; title: string }>;
  expect(worksBefore).toContainEqual(expect.objectContaining({ id: 2901, title: "Opening image", collection_id: 291 }));
  expect(collectionsBefore).toContainEqual(expect.objectContaining({ id: 292, title: "Gallery Field" }));

  const writes: Array<{ method: string; url: string }> = [];
  page.on("request", (browserRequest) => {
    const method = browserRequest.method();
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      writes.push({ method, url: browserRequest.url() });
    }
  });

  await openEditor(page);
  await enterGalleryRoom(page);
  await applyM2M3M6PrivateOverlay(page);
  await page.screenshot({ path: `${evidenceDir}/01-m6-private-collection-curation-control.png`, fullPage: true });
  await page.getByTestId("presence-studio-v3-save-private-state").click();
  await expect(page.getByTestId("presence-studio-v3-save-status")).toHaveAttribute("data-save-phase", "saved", {
    timeout: realBackendUiTimeout,
  });
  const staleState = await readPrivateState(request);
  expect(staleState.metadata.object_edits ?? []).toContainEqual(expect.objectContaining({
    sourceRef: "work:2901",
    title: editedTitle,
    zoneId: "main-wall",
    size: "large",
  }));
  expect(staleState.metadata.placements ?? []).toContainEqual(expect.objectContaining({
    sourceRef: "work:2901",
    roomId: "gallery",
    status: "placed",
    collectionSourceRef: "collection:292",
  }));
  await page.screenshot({ path: `${evidenceDir}/02-m6-private-save-with-collection-curation.png`, fullPage: true });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await ensureLocalOwnerStorage(page);
  await page.goto("/studio/29/editor", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("presence-studio-v3-status")).toHaveAttribute("data-durable-base-state", "current");
  await closeHomeIfOpen(page);
  await enterGalleryRoom(page);
  await selectOpeningWorkFromShelf(page);
  await expect(page.getByTestId("presence-studio-v3-selected-collection-summary")).toContainText("Private Collection: Gallery Field");
  await page.getByTestId("presence-studio-v3-test-visitor").click();
  await expect(page.getByTestId("presence-studio-v3-preview-source-panel")).toContainText("Local preview");
  await expect(page.getByTestId("presence-studio-v3-preview-collection-summary")).toContainText("Private Collection curation active");
  await expect(page.getByTestId("presence-studio-v3-preview-collection-summary")).toContainText("Gallery Field");
  await expect(page.getByRole("button", { name: new RegExp(editedTitle) })).toBeVisible({ timeout: realBackendUiTimeout });
  await page.screenshot({ path: `${evidenceDir}/03-m6-private-preview-collection-curation.png`, fullPage: true });

  const committed = await bumpLocalDraftBase(request);
  expect(committed.revision).toBeGreaterThan(Number(staleState.base.revision));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await ensureLocalOwnerStorage(page);
  await page.goto("/studio/29/editor", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("presence-studio-v3-status")).toHaveAttribute("data-durable-base-state", "mismatch");
  await expect(page.getByTestId("presence-studio-v3-recovery-panel")).toContainText("older base");
  await expect(page.getByTestId("presence-studio-v3-recovery-summary")).toContainText("Compatible private changes can be preserved");
  await expect(page.getByTestId("presence-studio-v3-preserve-compatible")).toBeEnabled();
  await page.screenshot({ path: `${evidenceDir}/04-m6-stale-base-compatible-collection-curation.png`, fullPage: true });

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByTestId("presence-studio-v3-preserve-compatible").click();
  await expect(page.getByTestId("presence-studio-v3-save-status")).toHaveAttribute("data-save-phase", "saved", {
    timeout: realBackendUiTimeout,
  });
  const rebasedState = await readPrivateState(request);
  expect(rebasedState.metadata_revision).toBe(staleState.metadata_revision + 1);
  expect(rebasedState.base.revision).toBe(committed.revision);
  expect(rebasedState.metadata.placements ?? []).toContainEqual(expect.objectContaining({
    sourceRef: "work:2901",
    roomId: "gallery",
    status: "placed",
    collectionSourceRef: "collection:292",
  }));
  await page.screenshot({ path: `${evidenceDir}/05-m6-rebased-private-collection-curation.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await ensureLocalOwnerStorage(page);
  await page.goto("/studio/29/editor", { waitUntil: "domcontentloaded" });
  await closeHomeIfOpen(page);
  await enterGalleryRoom(page);
  await selectOpeningWorkFromShelf(page);
  await page.getByTestId("presence-studio-v3-arrange-action").click();
  await expect(page.getByTestId("presence-studio-v3-collection-current")).toContainText("Gallery Field");
  await page.screenshot({ path: `${evidenceDir}/06-m6-mobile-collection-curation-control.png`, fullPage: true });

  const [worksAfterResponse, collectionsAfterResponse, publicApiAfter] = await Promise.all([
    request.get(`${apiBase}/api/presence/owner/nodes/29/works`, { headers: { Authorization: `Bearer ${ownerToken}` } }),
    request.get(`${apiBase}/api/presence/owner/nodes/29/collections`, { headers: { Authorization: `Bearer ${ownerToken}` } }),
    request.get(`${apiBase}/api/presence/public/bbbvision`),
  ]);
  expect((await worksAfterResponse.json()).data).toEqual(worksBefore);
  expect((await collectionsAfterResponse.json()).data).toEqual(collectionsBefore);
  expect(publicApiAfter.status()).toBe(404);

  const publicP = await page.goto("/p/bbbvision", { waitUntil: "domcontentloaded" });
  expect(publicP?.status()).toBe(404);
  await expect(page.locator("body")).not.toContainText(editedTitle);
  await page.screenshot({ path: `${evidenceDir}/07-m6-public-p-bbbvision-unpublished.png`, fullPage: true });

  const publicPresence = await page.goto("/presence/bbbvision", { waitUntil: "domcontentloaded" });
  expect([200, 404]).toContain(publicPresence?.status() ?? 0);
  await expect(page.locator("body")).not.toContainText(editedTitle);
  await expect(page.locator("body")).not.toContainText("Private Collection curation");
  await page.screenshot({ path: `${evidenceDir}/08-m6-public-presence-bbbvision-unchanged.png`, fullPage: true });

  await page.goto("/studio/1/editor", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).not.toContainText(editedTitle);
  await page.screenshot({ path: `${evidenceDir}/09-m6-room-1-editor-control.png`, fullPage: true });

  expect(writes).toEqual([
    { method: "PUT", url: `${apiBase}/api/presence/owner/rooms/29/editor/v3/state` },
    { method: "PUT", url: `${apiBase}/api/presence/owner/rooms/29/editor/v3/state/rebase` },
  ]);
});
