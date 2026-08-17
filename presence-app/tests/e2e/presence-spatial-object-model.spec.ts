import { mkdirSync, readFileSync } from "node:fs";
import { expect, test, type APIRequestContext, type Page, type TestInfo } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";
const ROUTE = "/internal/spatial-object-model";
const MOBSTAR_DRAFT_KEY = "presence-spatial:internal-draft:v1:mobstar-internal-arranger-room";
const evidenceDir = "docs/program/evidence/presence-spatial-object-model-shift/screenshots";
const captureCanonicalEvidence = process.env.PRESENCE_CAPTURE_SPATIAL_EVIDENCE === "1";
const browserWrites = new WeakMap<Page, string[]>();

interface SavedSpatialEnvelope {
  roomFingerprint: string;
  room: {
    placements: Array<{
      id: string;
      componentId: string;
      mediaRef?: string;
      transform: { position: [number, number, number]; rotation: [number, number, number] };
    }>;
  };
}

if (captureCanonicalEvidence) mkdirSync(evidenceDir, { recursive: true });

function screenshotPath(testInfo: TestInfo, fileName: string): string {
  return captureCanonicalEvidence ? `${evidenceDir}/${fileName}` : testInfo.outputPath(fileName);
}

async function resetRequestLedger(request: APIRequestContext) {
  const response = await request.post(`${API_BASE}/__test__/reset`);
  expect(response.ok()).toBeTruthy();
}

async function expectZeroProductWrites(request: APIRequestContext) {
  const response = await request.get(`${API_BASE}/__test__/requests`);
  expect(response.ok()).toBeTruthy();
  const payload = await response.json() as {
    requests: Array<{ method: string; path: string }>;
  };
  expect(payload.requests.filter((entry) => entry.method !== "GET")).toEqual([]);
}

async function openArranger(page: Page) {
  const response = await page.goto(ROUTE, { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Spatial object arranger" })).toBeVisible();
  await expect(page.getByLabel("Persistence boundary")).toContainText("There is no API");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/i);
  await expect(page.getByTestId("presence-spatial-room-viewport")).toHaveAttribute(
    "data-renderer-lane",
    /^(semantic|three)$/,
    { timeout: 30_000 },
  );
}

async function expectThreeRenderer(page: Page) {
  const viewport = page.getByTestId("presence-spatial-room-viewport");
  await expect(viewport).toHaveAttribute("data-renderer-lane", "three");
  await expect(page.getByTestId("presence-spatial-three-renderer")).toBeVisible();
  const canvas = page.getByTestId("presence-spatial-three-renderer").locator("canvas");
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toHaveAttribute("data-rendered-item-count", /^[1-9][0-9]*$/);
  await expect(canvas).toHaveAttribute("data-component-keys", /presence\.room-shell@1\.0\.0/);
}

async function currentPublicSignature(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.localStorage.setItem("presence-onboarded:gallery-bbbvision", "1"));
  const response = await page.goto("/p/bbbvision", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  await expect(page.getByText("bbb.vision").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Spatial object arranger" })).toHaveCount(0);
  return page.locator("main").first().evaluate((main) => ({
    text: (main.textContent ?? "").replace(/\s+/g, " ").trim(),
    links: Array.from(main.querySelectorAll("a")).map((link) => ({
      href: link.getAttribute("href"),
      text: (link.textContent ?? "").replace(/\s+/g, " ").trim(),
    })),
    media: Array.from(main.querySelectorAll("img,video,canvas")).map((node) => ({
      tag: node.tagName,
      src: node.getAttribute("src"),
      alt: node.getAttribute("alt"),
    })),
    internalMarkers: main.querySelectorAll('[data-testid^="presence-spatial-"]').length,
  }));
}

test.beforeEach(async ({ page, request }) => {
  await resetRequestLedger(request);
  const writes: string[] = [];
  browserWrites.set(page, writes);
  page.on("request", (outgoing) => {
    if (outgoing.method() !== "GET" && outgoing.method() !== "HEAD") {
      writes.push(`${outgoing.method()} ${outgoing.url()}`);
    }
  });
});

test.afterEach(async ({ page, request }) => {
  expect(browserWrites.get(page) ?? []).toEqual([]);
  await expectZeroProductWrites(request);
});

test("desktop Three preview round-trips a fully arranged Mobstar room", async ({ page }, testInfo) => {
  await openArranger(page);
  await expectThreeRenderer(page);
  await page.getByRole("button", { name: "Create Mobstar" }).click();
  await expect(page.getByRole("heading", { name: "Mobstar blank spatial arranger draft" })).toBeVisible();

  await page.getByRole("button", { name: "+ Table" }).click();
  await expect(page.getByText("Display table", { exact: true }).last()).toBeVisible();
  await page.getByRole("combobox").selectOption("mobstar-media-a");
  await page.getByRole("button", { name: "Assign to Display table" }).click();
  await expect(page.getByText("Assigned Abstract generated garment placeholder A to Display table.")).toBeVisible();

  const readout = page.locator("code").filter({ hasText: /^x / }).first();
  const initialTransform = await readout.innerText();
  await page.getByRole("button", { name: "Move right" }).click();
  await page.getByRole("button", { name: /E.*15/ }).click();
  await expect(readout).not.toHaveText(initialTransform);

  const afterKeyboardTransform = await readout.innerText();
  const tablePlanObject = page.locator('svg[aria-label="Top-down editable room plan"] g[data-component="presence.display-table"]');
  const tableDragHandle = tablePlanObject.locator("circle");
  const plan = page.locator('svg[aria-label="Top-down editable room plan"]');
  const planBox = await plan.boundingBox();
  expect(planBox).not.toBeNull();
  if (planBox) {
    await tableDragHandle.hover();
    await page.mouse.down();
    await expect(tablePlanObject).toHaveAttribute("data-dragging", "true");
    await page.mouse.move(
      planBox.x + planBox.width * 0.58,
      planBox.y + planBox.height * 0.5,
      { steps: 4 },
    );
    await page.mouse.up();
    await expect(readout).not.toHaveText(afterKeyboardTransform);
  }

  for (const label of ["Wall", "Divider", "Rack", "Plinth", "Projection wall"]) {
    await page.getByRole("button", { name: `+ ${label}`, exact: true }).click();
  }
  await expect(page.getByText("6 core objects")).toBeVisible();

  await page.getByRole("button", { name: "Save local" }).click();
  await expect(page.getByText("Saved locally in this browser. Nothing was published or sent to a server.")).toBeVisible();
  const firstSave = await page.evaluate((key) => window.localStorage.getItem(key), MOBSTAR_DRAFT_KEY);
  expect(firstSave).toBeTruthy();
  const firstEnvelope = JSON.parse(firstSave ?? "null") as SavedSpatialEnvelope;
  const firstTable = firstEnvelope.room.placements.find((placement) => placement.componentId === "presence.display-table");
  expect(firstTable).toBeTruthy();
  expect(firstEnvelope.room.placements.some((placement) => placement.mediaRef === "mobstar-media-a")).toBe(true);

  await page.locator("button").filter({ hasText: "Display table" }).first().click();
  await page.getByRole("button", { name: "Move backward" }).click();
  await page.getByRole("button", { name: "Save local" }).click();
  await expect(page.getByRole("button", { name: "Revert generation" })).toBeEnabled();
  const secondSave = await page.evaluate((key) => window.localStorage.getItem(key), MOBSTAR_DRAFT_KEY);
  expect(secondSave).toBeTruthy();
  expect(secondSave).not.toBe(firstSave);

  await page.getByRole("button", { name: "Revert generation" }).click();
  await expect(page.getByText(/Reverted to the local generation saved/)).toBeVisible();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), MOBSTAR_DRAFT_KEY)).toBe(firstSave);

  await page.getByRole("button", { name: "Reload saved" }).click();
  await expect(page.getByText(/Reloaded the local generation saved/)).toBeVisible();
  await page.getByRole("radio", { name: "Saved" }).check();
  await expect(page.getByLabel(/Saved Mobstar blank spatial arranger draft visitor preview/)).toBeVisible();
  await expectThreeRenderer(page);
  const savedCanvas = page.getByTestId("presence-spatial-three-renderer").locator("canvas");
  await expect(savedCanvas).toHaveAttribute("data-room-fingerprint", firstEnvelope.roomFingerprint);
  await expect(savedCanvas).toHaveAttribute("data-component-keys", /presence\.display-table@1\.0\.0/);
  await page.screenshot({ path: screenshotPath(testInfo, "01-mobstar-three-arranger-saved-preview.png"), fullPage: true });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = await downloadPromise;
  const downloadedPath = await download.path();
  expect(downloadedPath).toBeTruthy();
  const exportedEnvelope = JSON.parse(readFileSync(downloadedPath ?? "", "utf8")) as SavedSpatialEnvelope;
  expect(exportedEnvelope.roomFingerprint).toBe(firstEnvelope.roomFingerprint);

  await page.getByRole("button", { name: "Reset working" }).click();
  await expect(page.getByText("0 core objects")).toBeVisible();
  await page.locator('input[type="file"][accept*="json"]').setInputFiles({
    name: "mobstar-exported-draft.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(exportedEnvelope)),
  });
  await expect(page.getByText("Imported a validated draft into memory. It has not been saved or published.")).toBeVisible();
  await page.getByRole("radio", { name: "Current" }).check();
  await expectThreeRenderer(page);
  await expect(page.getByTestId("presence-spatial-three-renderer").locator("canvas"))
    .toHaveAttribute("data-room-fingerprint", exportedEnvelope.roomFingerprint);

  const restoredTable = exportedEnvelope.room.placements.find((placement) => placement.componentId === "presence.display-table");
  expect(restoredTable?.transform).toEqual(firstTable?.transform);
});

test("BBB gallery media is lazy, reusable and operable in the Three lane", async ({ page }, testInfo) => {
  const requestedUrls: string[] = [];
  page.on("request", (request) => requestedUrls.push(request.url()));
  await openArranger(page);
  await page.getByRole("button", { name: "Load BBB" }).click();
  await expect(page.getByRole("heading", { name: "BBB reusable projection-wall proof" })).toBeVisible();
  await expectThreeRenderer(page);

  await expect.poll(() => requestedUrls.some((url) => url.includes("threshold-signal.png"))).toBe(true);
  expect(requestedUrls.some((url) => url.includes("archive-rhythm.png"))).toBe(false);

  const nextProjection = page.getByTestId("presence-spatial-action-next-bbb");
  await expect(nextProjection).toBeVisible();
  await expect(page.getByTestId("presence-spatial-action-inspect-bbb-01")).toBeVisible();
  await nextProjection.click();
  await expect(page.getByText("Showing the next projection.")).toBeAttached();
  await nextProjection.click();
  await expect.poll(() => requestedUrls.some((url) => url.includes("archive-rhythm.png"))).toBe(true);
  await page.getByTestId("presence-spatial-action-inspect-bbb-02").click();
  await expect(page.getByTestId("presence-spatial-inspection-card")).toContainText("Archive rhythm projection");
  await page.screenshot({ path: screenshotPath(testInfo, "02-bbb-reusable-projection-wall-three.png"), fullPage: true });
});

test("missing BBB media keeps the Three room and generated fallback operable", async ({ page }) => {
  await page.route("**/bbb-pilot/threshold-signal.png", (route) => route.abort("failed"));
  await openArranger(page);
  await page.getByRole("button", { name: "Load BBB" }).click();
  await expectThreeRenderer(page);
  await page.getByTestId("presence-spatial-action-inspect-bbb-01").click();
  await expect(page.getByTestId("presence-spatial-inspection-card")).toContainText("Threshold signal projection");
  await expect(page.getByTestId("presence-spatial-three-renderer")).toBeVisible();
});

test("Gate 4 candidate loads through generic geometry, lighting and rack inspection", async ({ page }) => {
  await openArranger(page);
  await page.getByTestId("presence-spatial-load-mobstar-gate4").click();
  await expect(page.getByRole("heading", { name: "Mobstar Gate 4 art-direction candidate" })).toBeVisible();
  const viewport = page.getByTestId("presence-spatial-room-viewport");
  await expect(viewport).toHaveAttribute("data-renderer-lane", "three");
  const canvas = page.getByTestId("presence-spatial-three-renderer").locator("canvas");
  await expect(canvas).toHaveAttribute("data-lighting-profile", "boutique-product-warm");
  await expect(canvas).toHaveAttribute("data-component-keys", /presence\.suspended-rack@1\.0\.0/);
  await page.getByTestId("presence-spatial-state-rack").click();
  await page.getByTestId("presence-spatial-action-inspect-signal-garment").click();
  await expect(page.getByTestId("presence-spatial-inspection-card")).toContainText("Signal garment candidate on the rack");
  await expect(page.getByTestId("presence-spatial-three-renderer")).toBeVisible();
});

test("390px Gate 4 candidate exposes branded static and complete semantic fallback", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openArranger(page);
  await page.getByTestId("presence-spatial-load-mobstar-gate4").click();
  const fallback = page.getByTestId("presence-spatial-semantic-fallback");
  await expect(fallback).toHaveAttribute("data-fallback-reason", "mobile");
  await expect(page.getByTestId("presence-spatial-branded-fallback")).toContainText("A deep product-first boutique");
  await expect(page.getByAltText("Generated internal campaign wall study")).toBeVisible();
  await expect(page.getByAltText("Candidate yellow and red compact Mobstar identity mark")).toBeVisible();
  await expect(fallback.getByText("Signal garment candidate", { exact: true })).toBeVisible();
  await fallback.getByRole("button", { name: "Turn the signal garment outward" }).click();
  await expect(page.getByTestId("presence-spatial-semantic-item-garment-signal")).toHaveAttribute("data-selected", "true");
});

test("390px mobile keeps Mobstar Pieces and Actions available through the semantic fallback", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openArranger(page);

  const fallback = page.getByTestId("presence-spatial-semantic-fallback");
  await expect(fallback).toHaveAttribute("data-fallback-reason", "mobile");
  await expect(page.getByTestId("presence-spatial-three-renderer")).toHaveCount(0);
  await expect(fallback.getByText("Generated garment placeholder A", { exact: true })).toBeVisible();
  await fallback.getByRole("button", { name: "Inspect rack piece A" }).click();
  await expect(page.getByTestId("presence-spatial-semantic-item-rack-piece-a")).toHaveAttribute("data-selected", "true");
  await page.screenshot({ path: screenshotPath(testInfo, "03-mobstar-mobile-semantic-fallback-390.png"), fullPage: true });
});

test("reduced motion selects the static semantic lane on desktop", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openArranger(page);

  const fallback = page.getByTestId("presence-spatial-semantic-fallback");
  await expect(fallback).toHaveAttribute("data-fallback-reason", "reduced-motion");
  await expect(fallback).toContainText("Reduced-motion is enabled");
  await expect(fallback.getByRole("button", { name: "Inspect campaign projection" })).toBeEnabled();
});

test("WebGL unavailability falls back without hiding spatial content", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function patchedGetContext(
      this: HTMLCanvasElement,
      contextId: string,
      ...args: unknown[]
    ) {
      if (contextId === "webgl" || contextId === "webgl2") return null;
      return original.call(this, contextId, ...args as []);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  await openArranger(page);

  const fallback = page.getByTestId("presence-spatial-semantic-fallback");
  await expect(fallback).toHaveAttribute("data-fallback-reason", "webgl-unavailable");
  await expect(fallback).toContainText("3D graphics are unavailable");
  await expect(fallback.getByText("Generated merchandise table placeholder", { exact: true })).toBeVisible();
});

test("invalid JSON import preserves the last valid room", async ({ page }) => {
  await openArranger(page);
  await page.getByRole("button", { name: "Load BBB" }).click();
  const roomHeading = page.getByRole("heading", { name: "BBB reusable projection-wall proof" });
  await expect(roomHeading).toBeVisible();

  await page.locator('input[type="file"][accept*="json"]').setInputFiles({
    name: "invalid-spatial-draft.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"schemaVersion":"wrong","room":{"id":"corrupt"}}'),
  });
  await expect(page.getByText("Import rejected. The last valid layout is still active.")).toBeVisible();
  await expect(page.getByRole("heading", { name: /rejected condition/ })).toBeVisible();
  await expect(roomHeading).toBeVisible();
  await expect(page.getByTestId("presence-spatial-room-viewport")).toBeVisible();
});

test("dirty workspace replacement requires an explicit discard decision", async ({ page }) => {
  await openArranger(page);
  await page.getByRole("button", { name: "Create Mobstar" }).click();
  await page.getByRole("button", { name: "+ Table" }).click();
  await expect(page.getByText("Display table", { exact: true }).last()).toBeVisible();

  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    expect(dialog.message()).toContain("Discard unsaved working changes");
    await dialog.dismiss();
  });
  await page.getByRole("button", { name: "Load BBB" }).click();
  await expect(page.getByRole("heading", { name: "Mobstar blank spatial arranger draft" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "BBB reusable projection-wall proof" })).toHaveCount(0);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Load BBB" }).click();
  await expect(page.getByRole("heading", { name: "BBB reusable projection-wall proof" })).toBeVisible();
});

test("internal local drafts do not alter the protected BBB public route", async ({ page }) => {
  const before = await currentPublicSignature(page);
  await openArranger(page);
  await page.getByRole("button", { name: "Load BBB" }).click();
  await page.getByRole("button", { name: "Save local" }).click();
  await expect(page.getByText("Saved locally in this browser. Nothing was published or sent to a server.")).toBeVisible();

  const after = await currentPublicSignature(page);
  expect(after).toEqual(before);
  await expect(page.getByTestId("presence-spatial-room-viewport")).toHaveCount(0);
});
