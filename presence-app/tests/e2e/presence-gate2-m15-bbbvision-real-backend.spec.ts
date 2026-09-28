import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "playwright/test";

const enabled = process.env.PRESENCE_GATE2_M15_REAL_BACKEND === "1";
const apiBase = process.env.PRESENCE_GATE2_M15_API_BASE ?? "http://127.0.0.1:5015";
const ownerToken = process.env.PRESENCE_GATE2_M15_OWNER_TOKEN ?? "";
const evidenceDir =
  "docs/program/evidence/presence-gate2-m15-bbbvision-local-seed-connect-20260727/screenshots";
const realBackendUiTimeout = 20_000;

test.skip(!enabled, "Gate 2 M1.5 real-backend proof is opt-in.");
test.skip(enabled && !ownerToken, "PRESENCE_GATE2_M15_OWNER_TOKEN is required for real-backend proof.");

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

test("desktop BBBVision seed is visible to owner only and public remains unpublished", async ({ page, request }) => {
  await enableLocalOwner(page);

  const [node, works, collections, editor, publicNode, roomOneWorks, roomOneCollections] = await Promise.all([
    request.get(`${apiBase}/api/presence/owner/nodes/29`, { headers: { Authorization: `Bearer ${ownerToken}` } }),
    request.get(`${apiBase}/api/presence/owner/nodes/29/works`, { headers: { Authorization: `Bearer ${ownerToken}` } }),
    request.get(`${apiBase}/api/presence/owner/nodes/29/collections`, { headers: { Authorization: `Bearer ${ownerToken}` } }),
    request.get(`${apiBase}/api/presence/owner/rooms/29/editor`, { headers: { Authorization: `Bearer ${ownerToken}` } }),
    request.get(`${apiBase}/api/presence/public/bbbvision`),
    request.get(`${apiBase}/api/presence/owner/nodes/1/works`, { headers: { Authorization: `Bearer ${ownerToken}` } }),
    request.get(`${apiBase}/api/presence/owner/nodes/1/collections`, { headers: { Authorization: `Bearer ${ownerToken}` } }),
  ]);

  expect(node.status()).toBe(200);
  expect(works.status()).toBe(200);
  expect(collections.status()).toBe(200);
  expect(editor.status()).toBe(200);
  expect(publicNode.status()).toBe(404);
  expect(roomOneWorks.status()).toBe(200);
  expect(roomOneCollections.status()).toBe(200);

  const worksPayload = (await works.json()).data as Array<{ title: string; collection_id: number | null }>;
  const collectionsPayload = (await collections.json()).data as Array<{ title: string }>;
  const roomOneWorksPayload = (await roomOneWorks.json()).data as unknown[];
  const roomOneCollectionsPayload = (await roomOneCollections.json()).data as unknown[];
  expect(worksPayload.map((work) => work.title)).toEqual([
    "Opening image",
    "Portrait field",
    "Stage image",
    "Shadow image",
  ]);
  expect(new Set(worksPayload.map((work) => work.collection_id))).toEqual(new Set([291, 292]));
  expect(collectionsPayload.map((collection) => collection.title)).toEqual(["Threshold Sequence", "Gallery Field"]);
  expect(roomOneWorksPayload).toHaveLength(0);
  expect(roomOneCollectionsPayload).toHaveLength(0);

  await page.goto("/studio/29/editor", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v3-shell")).toBeVisible({ timeout: realBackendUiTimeout });
  await expect(page.getByText("bbb.vision").first()).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/01-studio-29-editor-desktop.png`, fullPage: true });

  await page.goto("/studio/29/works", { waitUntil: "networkidle" });
  await expect(page.getByText("Opening image")).toBeVisible({ timeout: realBackendUiTimeout });
  await expect(page.getByText("Shadow image")).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/02-studio-29-works.png`, fullPage: true });

  await page.goto("/studio/29/collections", { waitUntil: "networkidle" });
  await expect(page.getByText("Threshold Sequence")).toBeVisible({ timeout: realBackendUiTimeout });
  await expect(page.getByText("Gallery Field")).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/03-studio-29-collections.png`, fullPage: true });

  await page.goto("/studio/29/editor", { waitUntil: "networkidle" });
  await page.getByTestId("presence-studio-v3-test-visitor").click();
  await expect(page.locator(".studio-v3-shell.is-testing-visitor")).toBeVisible({ timeout: realBackendUiTimeout });
  await page.screenshot({ path: `${evidenceDir}/04-studio-29-private-visitor-preview.png`, fullPage: true });

  const publicResponse = await page.goto("/p/bbbvision", { waitUntil: "networkidle" });
  expect(publicResponse?.status()).toBe(404);
  await page.screenshot({ path: `${evidenceDir}/05-public-bbbvision-unpublished.png`, fullPage: true });

  await page.goto("/studio/1/works", { waitUntil: "networkidle" });
  await expect(page.getByText("Add your first work")).toBeVisible({ timeout: realBackendUiTimeout });
  await page.screenshot({ path: `${evidenceDir}/06-room-1-empty-works-control.png`, fullPage: true });
});

test("mobile BBBVision owner editor loads from the real backend", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enableLocalOwner(page);
  await page.goto("/studio/29/editor", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v3-shell")).toBeVisible({ timeout: realBackendUiTimeout });
  await expect(page.getByText("bbb.vision").first()).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/07-studio-29-editor-mobile.png`, fullPage: true });
});
