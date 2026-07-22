import { mkdirSync } from "node:fs";
import { expect, test, type APIRequestContext, type Browser, type BrowserContext, type Locator, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";
const evidenceDir = "docs/program/evidence/presence-studio-v3-m1-functional-editing/screenshots";
const durableBaseMismatchMessage =
  "Existing durable state is preserved, but it belongs to a different Studio base. Private-state save is disabled until a reviewed rebase or clear is available.";
mkdirSync(evidenceDir, { recursive: true });

const forbiddenWritePatterns = [
  /\/api\/presence\/owner\/rooms\/29\/editor\/draft/,
  /\/api\/presence\/owner\/rooms\/29\/editor\/preview/,
  /\/api\/presence\/owner\/rooms\/29\/editor\/publish/,
  /\/api\/presence\/owner\/rooms\/29\/editor\/rollback/,
  /\/api\/presence\/owner\/nodes\/29\/(?:works|collections|media)/,
];

interface RequestLedgerEntry {
  method: string;
  path: string;
  body?: unknown;
}

async function resetAndSignIn(
  page: Page,
  request: APIRequestContext,
  controls: Record<string, unknown> = {},
) {
  await request.post(`${API_BASE}/__test__/reset`);
  if (Object.keys(controls).length > 0) {
    await request.post(`${API_BASE}/__test__/state`, { data: controls });
  }
  await page.goto("/");
  await enableOwnerAccess(page);
}

async function enableOwnerAccess(page: Page) {
  await page.evaluate(() => {
    window.localStorage.setItem("presence:e2e:access_token", "owner-test-token");
    window.localStorage.setItem("presence-studio-v3:bbb-pilot", "1");
  });
}

async function openEditor(page: Page) {
  await page.goto("/studio/29/editor", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v3-shell")).toBeVisible();
}

async function closeHome(page: Page) {
  if (await page.getByTestId("presence-studio-v3-home").isVisible()) {
    await page.getByRole("button", { name: "Studio Home" }).click();
  }
}

async function openLibrary(page: Page) {
  await page.getByTestId("presence-studio-v3-shelf-trigger").click();
  await expect(page.getByTestId("presence-studio-v3-piece-shelf")).toBeVisible();
}

function libraryGroup(page: Page, title: string): Locator {
  return page.locator(".studio-v3-library-sections section").filter({ hasText: title });
}

function libraryCard(group: Locator, title: string): Locator {
  return group.locator(".studio-v3-library-card").filter({ hasText: title }).first();
}

async function selectRoomNativePiece(page: Page, title: string) {
  await openLibrary(page);
  const card = libraryCard(libraryGroup(page, "Room-native BBB Pieces"), title);
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Inspect / edit" }).click();
  await expect(page.getByTestId("presence-studio-v3-action-bar")).toBeVisible();
}

async function applyFilmStripToActiveRoom(page: Page) {
  if (await page.getByTestId("presence-public-bbbvision-threshold").isVisible()) {
    await page.getByTestId("presence-public-bbbvision-enter").click();
  }
  await expect(page.getByTestId("presence-public-bbbvision-gallery")).toBeVisible();
  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-room-style-film-strip-selected-works").scrollIntoViewIfNeeded();
  await page.getByTestId("presence-studio-v3-room-style-film-strip-selected-works").click();
  await expect(page.getByTestId("presence-studio-v3-structural-preview")).toContainText("Previewing");
  await page.getByTestId("presence-studio-v3-structural-apply").click();
  await page.getByRole("button", { name: "Close sheet" }).click();
  await expect(page.getByTestId("presence-public-film-strip")).toBeVisible();
}

async function requestLedger(request: APIRequestContext): Promise<RequestLedgerEntry[]> {
  const response = await request.get(`${API_BASE}/__test__/requests`);
  const payload = await response.json() as { requests: RequestLedgerEntry[] };
  return payload.requests;
}

async function compatibilityMetric(page: Page, label: string): Promise<number> {
  const summary = page.getByTestId("presence-studio-v3-compatibility-summary");
  const terms = await summary.locator("dt").allTextContents();
  const index = terms.findIndex((term) => term.trim() === label);
  expect(index, `compatibility metric ${label}`).toBeGreaterThanOrEqual(0);
  return Number((await summary.locator("dd").nth(index).textContent())?.trim());
}

async function expectOnlyProductWrites(
  request: APIRequestContext,
  allowed: Array<{ method: string; path: string }>,
) {
  const writes = (await requestLedger(request)).filter((entry) => entry.method !== "GET");
  for (const entry of writes) {
    expect(forbiddenWritePatterns.some((pattern) => pattern.test(entry.path))).toBeFalsy();
  }
  expect(writes.map(({ method, path }) => ({ method, path }))).toEqual(allowed);
}

async function openCacheIndependentEditor(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ baseURL: "http://127.0.0.1:3100" });
  const page = await context.newPage();
  await page.goto("/");
  await enableOwnerAccess(page);
  expect(await page.evaluate(() => Object.keys(window.localStorage)
    .some((key) => key.startsWith("presence-studio-v3:prototype:")))).toBeFalsy();
  await openEditor(page);
  return { context, page };
}

test("M1 Library exposes canonical BBB Works and Collections alongside every Room-native BBB Piece", async ({ page, request }) => {
  await resetAndSignIn(page, request);
  await openEditor(page);
  await openLibrary(page);

  const canonical = libraryGroup(page, "Canonical Works");
  for (const title of ["Opening image", "Portrait field", "Stage image", "Shadow image"]) {
    await expect(libraryCard(canonical, title)).toBeVisible();
  }
  const roomNative = libraryGroup(page, "Room-native BBB Pieces");
  for (const title of ["Opening image", "Portrait field", "Enter", "Stage image", "Shadow image", "Editable practice note"]) {
    await expect(libraryCard(roomNative, title)).toBeVisible();
  }
  await page.screenshot({ path: `${evidenceDir}/09-piece-library-bbb-pieces.png`, fullPage: true });

  await page.getByRole("tab", { name: "Collections 2" }).click();
  const collections = page.getByTestId("presence-studio-v3-collections-library");
  await expect(collections.getByText("Threshold Sequence", { exact: true })).toBeVisible();
  await expect(collections.getByText("Gallery Field", { exact: true })).toBeVisible();
  await expect(collections.getByText("Canonical Collection")).toHaveCount(2);
  await expect(collections).not.toContainText("Current Works");
  await expect(collections).not.toContainText("loaded-owner-library");
  await page.screenshot({ path: `${evidenceDir}/10-collections-bbb-collections.png`, fullPage: true });

  await page.getByRole("tab", { name: "Upload / Create" }).click();
  const uploadPanel = page.getByTestId("presence-studio-v3-library-upload-create");
  await expect(uploadPanel.getByText(/Private draft media is not enabled/)).toBeVisible();
  await expect(uploadPanel.locator("input[type=file]")).toBeDisabled();
  await expect(uploadPanel.getByRole("button", { name: "Create Work unavailable" })).toBeDisabled();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${evidenceDir}/11-upload-create-work-state.png`, fullPage: true });
  await expectOnlyProductWrites(request, []);
});

test("Home exposes Simple honestly and Review & publish remains an inert private-state boundary", async ({ page, request }) => {
  await resetAndSignIn(page, request);
  await openEditor(page);

  const modePicker = page.getByTestId("presence-studio-v3-mode-picker");
  await expect(modePicker.getByRole("button", { name: /Simple/ })).toHaveAttribute("aria-pressed", "true");
  const advanced = modePicker.getByRole("button", { name: /Advanced Creative/ });
  await expect(advanced).toBeDisabled();
  await expect(advanced).toContainText("Deferred");

  await page.getByTestId("presence-studio-v3-review-trigger").click();
  const readiness = page.getByTestId("presence-studio-v3-review-readiness");
  await expect(readiness).toContainText("never sends a publish request");
  await expect(readiness.getByRole("button", { name: "Publish unavailable in M1" })).toBeDisabled();
  await readiness.getByRole("button", { name: "Done reviewing" }).click();
  await expectOnlyProductWrites(request, []);
});

test("confirmed local discard serializes behind a delayed snapshot writer and reloads the durable base", async ({ page, request }) => {
  await resetAndSignIn(page, request);
  await openEditor(page);
  await closeHome(page);
  await page.evaluate(() => {
    const locks = navigator.locks;
    const originalRequest = locks.request.bind(locks);
    let delayed = false;
    Object.defineProperty(locks, "request", {
      configurable: true,
      value: (name: string, options: LockOptions, callback: LockGrantedCallback<void>) => {
        if (!delayed && name.startsWith("presence-studio-v3:")) {
          delayed = true;
          return originalRequest(name, options, (lock) => new Promise<void>((resolve) => {
            (window as typeof window & { __v3DelayedWriteHolding?: boolean }).__v3DelayedWriteHolding = true;
            window.setTimeout(() => resolve(callback(lock)), 900);
          }));
        }
        return originalRequest(name, options, callback);
      },
    });
  });

  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-look-option-soft-editorial").click();
  await page.getByRole("button", { name: "Close sheet" }).click();
  await expect.poll(() => page.evaluate(() => Boolean(
    (window as typeof window & { __v3DelayedWriteHolding?: boolean }).__v3DelayedWriteHolding,
  ))).toBeTruthy();
  await page.getByTestId("presence-studio-v3-review-trigger").click();
  page.once("dialog", (dialog) => dialog.accept());
  const discard = page.getByTestId("presence-studio-v3-discard-local");
  await discard.click();
  await expect(discard).toBeDisabled();
  await expect(page.getByTestId("presence-studio-v3-save-private-state")).toBeDisabled();
  await expect(page.getByTestId("presence-studio-v3-status")).toContainText("Discarding browser-local changes");
  await expect(discard).toHaveCount(0);
  await expect(page.getByTestId("presence-studio-v3-shell")).toBeVisible();
  await closeHome(page);
  await expect(page.locator(".presence-studio-v2-public").first()).toHaveAttribute("data-experience-atmosphere", "nocturnal-depth");
  await expectOnlyProductWrites(request, []);
});

test("a partial browser-local restore can be discarded without restoring the same unresolved snapshot", async ({ page, request }) => {
  await resetAndSignIn(page, request);
  await openEditor(page);
  await closeHome(page);
  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-look-option-soft-editorial").click();
  await page.getByRole("button", { name: "Close sheet" }).click();
  await expect.poll(() => page.evaluate(() => Object.keys(window.localStorage)
    .some((key) => key.includes(":manifest:29:")))).toBeTruthy();

  await page.evaluate(() => {
    const manifestKey = Object.keys(window.localStorage).find((key) => key.includes(":manifest:29:"));
    if (!manifestKey) throw new Error("Studio V3 local manifest was not written.");
    const manifest = JSON.parse(window.localStorage.getItem(manifestKey) ?? "null") as { activeGeneration?: string } | null;
    if (!manifest?.activeGeneration) throw new Error("Studio V3 local manifest has no active generation.");
    const snapshotKey = Object.keys(window.localStorage).find((key) => (
      key.includes(":snapshot:29:") && key.endsWith(`:${manifest.activeGeneration}`)
    ));
    if (!snapshotKey) throw new Error("Studio V3 active local snapshot was not written.");
    const snapshot = JSON.parse(window.localStorage.getItem(snapshotKey) ?? "null") as {
      presence?: { metadata?: { restore?: Record<string, unknown> } };
    } | null;
    if (!snapshot?.presence?.metadata?.restore) throw new Error("Studio V3 local metadata restore payload is missing.");
    snapshot.presence.metadata.restore.activeLookId = "missing-canonical-look";
    window.localStorage.setItem(snapshotKey, JSON.stringify(snapshot));
  });

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v3-save-status")).toHaveAttribute("data-save-phase", "conflict");
  await expect(page.getByTestId("presence-studio-v3-save-status")).toContainText("canonical references that are unavailable");
  await closeHome(page);
  await page.getByTestId("presence-studio-v3-review-trigger").click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByTestId("presence-studio-v3-discard-local").click();

  await expect(page.getByTestId("presence-studio-v3-save-status")).toHaveAttribute("data-save-phase", "clean");
  await expect(page.locator(".presence-studio-v2-public").first()).toHaveAttribute("data-experience-atmosphere", "nocturnal-depth");
  await expect.poll(() => page.evaluate(() => Object.values(window.localStorage)
    .every((value) => !value.includes("missing-canonical-look")))).toBeTruthy();
  await expectOnlyProductWrites(request, []);
});

test("editor bridge intercepts pointer, Enter, Space, Escape, and direct BBB navigation without visitor side effects", async ({ page, request }) => {
  await resetAndSignIn(page, request);
  await openEditor(page);
  await closeHome(page);
  await applyFilmStripToActiveRoom(page);

  const visitorUrl = page.url();
  const activeObject = page.locator(".v2-film-strip-slide .v2-public-object").first();
  await expect(activeObject).toBeVisible();
  await activeObject.click();
  await expect(page.getByTestId("presence-studio-v3-action-bar")).toBeVisible();
  expect(page.url()).toBe(visitorUrl);

  await page.keyboard.press("Escape");
  await expect(page.getByTestId("presence-studio-v3-action-bar")).toHaveCount(0);
  await activeObject.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("presence-studio-v3-action-bar")).toBeVisible();
  expect(page.url()).toBe(visitorUrl);

  await page.keyboard.press("Escape");
  await activeObject.focus();
  await page.keyboard.press("Space");
  await expect(page.getByTestId("presence-studio-v3-action-bar")).toBeVisible();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("presence-studio-v3-status")).toContainText(/Selected Room|suppressed/);
  expect(page.url()).toBe(visitorUrl);
  await expect(page.getByTestId("presence-public-bbbvision-focus")).toHaveCount(0);
  await expectOnlyProductWrites(request, []);
});

test("copy edits update immediately, cancel exactly, then save privately and restore after reload", async ({ page, browser, request }) => {
  await resetAndSignIn(page, request);
  await openEditor(page);
  await closeHome(page);
  await applyFilmStripToActiveRoom(page);
  await selectRoomNativePiece(page, "Editable practice note");
  await page.getByTestId("presence-studio-v3-edit-action").click();
  await expect(page.getByTestId("presence-studio-v3-piece-editor")).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/01-text-piece-editing.png`, fullPage: true });

  const title = page.getByTestId("presence-studio-v3-piece-title");
  const body = page.getByTestId("presence-studio-v3-piece-body");
  const caption = page.getByTestId("presence-studio-v3-piece-caption");
  await title.fill("M1 practice note - cancelled");
  await body.fill("This owner-private copy appears on the canvas immediately.");
  await caption.fill("Private editor caption");
  await expect(page.getByTestId("presence-public-film-strip")).toContainText("M1 practice note - cancelled");
  await expect(page.getByTestId("presence-public-film-strip")).toContainText("This owner-private copy appears on the canvas immediately.");
  await expect(page.getByTestId("presence-studio-v3-save-status")).toHaveAttribute("data-save-phase", "dirty");

  await page.getByTestId("presence-studio-v3-piece-cancel").click();
  await expect(page.getByTestId("presence-public-film-strip")).toContainText("Editable practice note");
  await expect(page.getByTestId("presence-public-film-strip")).not.toContainText("M1 practice note - cancelled");

  await page.getByTestId("presence-studio-v3-edit-action").click();
  await title.fill("M1 durable practice note");
  await body.fill("Durable owner-private copy restored after reload.");
  await caption.fill("M1 durable caption");
  await page.getByTestId("presence-studio-v3-piece-done").click();
  await expect(page.getByTestId("presence-public-film-strip")).toContainText("M1 durable practice note");
  await expect(page.getByTestId("presence-public-film-strip")).toContainText("Durable owner-private copy restored after reload.");
  await page.screenshot({ path: `${evidenceDir}/02-copy-change-on-canvas.png`, fullPage: true });

  await request.post(`${API_BASE}/__test__/state`, { data: { delayNextStudioV3StateWriteMs: 900 } });
  await page.getByTestId("presence-studio-v3-save-private-state").click();
  await expect(page.getByTestId("presence-studio-v3-save-status")).toHaveAttribute("data-save-phase", "saving");
  await page.getByTestId("presence-studio-v3-review-trigger").click();
  await expect(page.getByTestId("presence-studio-v3-discard-local")).toBeDisabled();
  await page.getByRole("button", { name: "Close sheet" }).click();
  await expect(page.getByTestId("presence-studio-v3-save-status")).toHaveAttribute("data-save-phase", "saved");
  await expect(page.getByTestId("presence-studio-v3-save-status")).toContainText("Saved privately");
  await expect(page.getByTestId("presence-studio-v3-save-status")).toContainText("Still unpublished");
  await expect(page.getByTestId("presence-studio-v3-save-status")).toContainText("Visitor site unchanged");
  await page.screenshot({ path: `${evidenceDir}/12-private-save-success.png`, fullPage: true });

  const writes = (await requestLedger(request)).filter((entry) => entry.method === "PUT");
  expect(writes).toHaveLength(1);
  const payload = writes[0]?.body as { metadata?: { object_edits?: Array<Record<string, unknown>> } };
  const edit = payload.metadata?.object_edits?.find((row) => row.objectId === "bbb-note");
  expect(edit).toMatchObject({
    title: "M1 durable practice note",
    body: "Durable owner-private copy restored after reload.",
    caption: "M1 durable caption",
  });
  expect(edit?.sourceRef).toBe("legacy-object:bbb-note");
  expect(JSON.stringify(payload.metadata)).not.toMatch(/https?:\/\/|blob:|data:/i);

  const restored = await openCacheIndependentEditor(browser);
  await closeHome(restored.page);
  await expect(restored.page.getByTestId("presence-public-film-strip")).toContainText("M1 durable practice note");
  await expect(restored.page.getByTestId("presence-public-film-strip")).toContainText("Durable owner-private copy restored after reload.");
  await restored.context.close();
  await expectOnlyProductWrites(request, [{ method: "PUT", path: "/api/presence/owner/rooms/29/editor/v3/state" }]);
});

test("image replacement stores only a stable Piece source reference and updates the canvas immediately", async ({ page, request }) => {
  await resetAndSignIn(page, request);
  await openEditor(page);
  await closeHome(page);
  await selectRoomNativePiece(page, "Opening image");
  await page.getByTestId("presence-studio-v3-edit-action").click();
  await expect(page.getByTestId("presence-studio-v3-piece-editor")).toBeVisible();
  const currentMedia = page.locator(".studio-v3-media-choice").filter({ hasText: "Opening image" }).first();
  await expect(currentMedia).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: `${evidenceDir}/03-image-piece-editing.png`, fullPage: true });

  const replacementMedia = page.locator(".studio-v3-media-choice").filter({ hasText: "Portrait field" }).first();
  await replacementMedia.click();
  await expect(replacementMedia).toHaveAttribute("aria-pressed", "true");
  await expect(currentMedia).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("presence-studio-v3-status")).toContainText("Media changed on the private canvas");
  await expect(page.getByTestId("presence-public-bbbvision-threshold").locator(".v2-bbb-slide-stack img.is-active"))
    .toHaveAttribute("src", /archive-rhythm\.png/);
  await page.screenshot({ path: `${evidenceDir}/04-media-change-or-upload-disabled.png`, fullPage: true });
  await page.getByTestId("presence-studio-v3-piece-done").click();
  await page.getByTestId("presence-studio-v3-save-private-state").click();
  await expect(page.getByTestId("presence-studio-v3-save-status")).toHaveAttribute("data-save-phase", "saved");

  const write = (await requestLedger(request)).find((entry) => entry.method === "PUT");
  const metadata = (write?.body as { metadata?: Record<string, unknown> })?.metadata;
  const edits = metadata?.object_edits as Array<Record<string, unknown>>;
  expect(edits.find((row) => row.objectId === "bbb-sparkle")?.mediaSourceRef)
    .toBe("legacy-object:bbb-portrait");
  expect(JSON.stringify(metadata)).not.toMatch(/https?:\/\/|blob:|data:|private-media=/i);

  await selectRoomNativePiece(page, "Enter");
  const requiredCtaHide = page.getByTestId("presence-studio-v3-action-bar")
    .getByRole("button", { name: "Hide", exact: true });
  await expect(requiredCtaHide).toBeDisabled();
  await expect(requiredCtaHide).toHaveAttribute("title", "The required navigation CTA must remain visible.");
  await page.getByTestId("presence-studio-v3-edit-action").click();
  const requiredCtaLabel = page.getByTestId("presence-studio-v3-piece-title");
  await requiredCtaLabel.fill("");
  await expect(requiredCtaLabel).toHaveValue("Enter");
  await expect(page.getByTestId("presence-studio-v3-status")).toContainText("Required CTA label cannot be empty");
  await page.getByTestId("presence-studio-v3-piece-cancel").click();
  await expectOnlyProductWrites(request, [{ method: "PUT", path: "/api/presence/owner/rooms/29/editor/v3/state" }]);
});

test("registered-zone manipulation supports drag, tap, reorder, feature, visibility, exact cancel, and unplace", async ({ page, request }) => {
  await resetAndSignIn(page, request);
  await openEditor(page);
  await closeHome(page);

  await selectRoomNativePiece(page, "Opening image");
  await page.getByTestId("presence-studio-v3-arrange-action").click();
  const nativeFeatureToggle = page.getByTestId("presence-studio-v3-toggle-feature");
  const nativeFeatureState = await nativeFeatureToggle.getAttribute("aria-pressed");
  expect(nativeFeatureState).toMatch(/^(?:true|false)$/);
  await nativeFeatureToggle.click();
  await expect(nativeFeatureToggle).toHaveAttribute("aria-pressed", nativeFeatureState === "true" ? "false" : "true");
  await page.getByTestId("presence-studio-v3-arrange-cancel").click();

  await openLibrary(page);
  const firstCanonical = libraryCard(libraryGroup(page, "Canonical Works"), "Opening image");
  await firstCanonical.getByTestId("presence-studio-v3-place-piece").click();
  await expect(page.getByTestId("presence-studio-v3-placement-summary")).toContainText("1 placed");
  await firstCanonical.getByRole("button", { name: "Inspect / edit" }).click();
  await page.getByTestId("presence-studio-v3-arrange-action").click();

  const summary = page.getByTestId("presence-studio-v3-placement-summary");
  const before = await summary.innerText();
  const featureToggle = page.getByTestId("presence-studio-v3-toggle-feature");
  const initialFeatureState = await featureToggle.getAttribute("aria-pressed");
  expect(initialFeatureState).toMatch(/^(?:true|false)$/);
  const enabledZones = page.locator('[data-testid^="presence-studio-v3-zone-"]:not([disabled])');
  await expect(enabledZones).toHaveCount(2);
  const openingZone = enabledZones.first();
  const mainWallZone = enabledZones.nth(1);
  await expect(openingZone).toHaveAttribute("aria-pressed", "true");
  const beforeWrongDrop = await summary.innerText();
  await mainWallZone.evaluate((element) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData("text/plain", "wrong-piece");
    dataTransfer.setData("application/x-presence-studio-v3-piece", "wrong-piece");
    element.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer }));
    element.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer }));
  });
  expect(await summary.innerText()).toBe(beforeWrongDrop);
  await expect(openingZone).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("presence-studio-v3-drag-piece").dragTo(mainWallZone);
  await expect(mainWallZone).toHaveAttribute("aria-pressed", "true");
  await expect(summary).toContainText("main-wall");
  expect(await summary.innerText()).not.toBe(before);
  // Clicking the active zone exercises the keyboard/tap fallback without
  // inventing an unavailable move back into the occupied single-item zone.
  await mainWallZone.click();
  await expect(mainWallZone).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("presence-studio-v3-size-large").click();
  await expect(page.getByTestId("presence-studio-v3-size-large")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("presence-studio-v3-treatment-captioned").click();
  await expect(page.getByTestId("presence-studio-v3-treatment-captioned")).toHaveAttribute("aria-pressed", "true");
  await expect(summary).toContainText("large");
  const order = summary.locator("dd").nth(1);
  const orderBeforeReorder = await order.innerText();
  await page.getByTestId("presence-studio-v3-move-earlier").click();
  await expect(order).not.toHaveText(orderBeforeReorder);
  await page.getByTestId("presence-studio-v3-move-later").click();
  await expect(order).toHaveText(orderBeforeReorder);
  await page.getByTestId("presence-studio-v3-toggle-visibility").click();
  await expect(page.getByTestId("presence-studio-v3-toggle-visibility")).toHaveText("Show");
  await page.getByTestId("presence-studio-v3-toggle-visibility").click();
  await expect(page.getByTestId("presence-studio-v3-toggle-visibility")).toHaveText("Hide");
  await page.screenshot({ path: `${evidenceDir}/05-direct-manipulation-reorder.png`, fullPage: true });

  await page.getByTestId("presence-studio-v3-arrange-cancel").click();
  await expect(page.getByTestId("presence-studio-v3-status")).toContainText("exact prior state restored");
  await page.getByTestId("presence-studio-v3-arrange-action").click();
  expect(await page.getByTestId("presence-studio-v3-placement-summary").innerText()).toBe(before);
  await expect(page.getByTestId("presence-studio-v3-toggle-feature")).toHaveAttribute("aria-pressed", initialFeatureState!);
  await expect(page.getByTestId("presence-studio-v3-toggle-visibility")).toHaveText("Hide");
  await page.getByRole("button", { name: "Unplace", exact: true }).click();
  await expect(page.getByTestId("presence-studio-v3-action-bar")).toHaveCount(0);
  await expect(page.getByTestId("presence-studio-v3-shelf-trigger")).toBeFocused();
  await openLibrary(page);
  await expect(page.getByTestId("presence-studio-v3-placement-summary")).toContainText("0 placed");
  await expectOnlyProductWrites(request, []);
});

test("hiding a resident frees bounded-zone capacity across private save and fresh hydration", async ({ page, browser, request }) => {
  await resetAndSignIn(page, request);
  await openEditor(page);
  await closeHome(page);

  await page.getByTestId("presence-studio-v3-look-trigger").click();
  const placedBeforeHide = await compatibilityMetric(page, "Placed");
  const retainedBeforeHide = await compatibilityMetric(page, "Retained in Shelf");
  await page.getByRole("button", { name: "Close sheet" }).click();

  await selectRoomNativePiece(page, "Opening image");
  await page.getByTestId("presence-studio-v3-arrange-action").click();
  await page.getByTestId("presence-studio-v3-toggle-visibility").click();
  await expect(page.getByTestId("presence-studio-v3-toggle-visibility")).toHaveText("Show");
  await page.getByTestId("presence-studio-v3-arrange-controls").getByRole("button", { name: "Done", exact: true }).click();

  await page.getByTestId("presence-studio-v3-look-trigger").click();
  expect(await compatibilityMetric(page, "Placed")).toBe(placedBeforeHide - 1);
  expect(await compatibilityMetric(page, "Retained in Shelf")).toBe(retainedBeforeHide + 1);
  await page.getByRole("button", { name: "Close sheet" }).click();

  await openLibrary(page);
  const canonical = libraryCard(libraryGroup(page, "Canonical Works"), "Opening image");
  await canonical.getByTestId("presence-studio-v3-place-piece").click();
  await page.getByRole("button", { name: "Close sheet" }).click();

  await page.getByTestId("presence-studio-v3-look-trigger").click();
  expect(await compatibilityMetric(page, "Placed")).toBe(placedBeforeHide);
  expect(await compatibilityMetric(page, "Retained in Shelf")).toBe(retainedBeforeHide + 1);
  await page.getByTestId("presence-studio-v3-room-style-gallery-wall").click();
  await expect(page.locator('#v2-public-object-bbb-sparkle')).toHaveCount(0);
  expect(await compatibilityMetric(page, "Placed")).toBeGreaterThan(0);
  expect(await compatibilityMetric(page, "Retained in Shelf")).toBeGreaterThan(0);
  await page.getByTestId("presence-studio-v3-structural-cancel").click();
  await page.getByTestId("presence-studio-v3-room-style-film-strip-selected-works").click();
  await expect(page.getByTestId("presence-studio-v3-structural-preview")).toContainText("Film Strip / Selected Works");
  await expect(page.locator('#v2-public-object-bbb-sparkle')).toHaveCount(0);
  expect(await compatibilityMetric(page, "Placed")).toBeGreaterThan(0);
  expect(await compatibilityMetric(page, "Retained in Shelf")).toBeGreaterThan(0);
  await page.getByTestId("presence-studio-v3-structural-cancel").click();
  await page.getByRole("button", { name: "Close sheet" }).click();

  await openLibrary(page);
  const placedCanonical = libraryCard(libraryGroup(page, "Canonical Works"), "Opening image");
  await placedCanonical.getByRole("button", { name: "Inspect / edit" }).click();
  await page.getByTestId("presence-studio-v3-arrange-action").click();
  const openingZone = page.getByTestId("presence-studio-v3-zone-opening-work");
  const mainWallZone = page.getByTestId("presence-studio-v3-zone-main-wall");
  await expect(openingZone).toHaveAttribute("aria-pressed", "true");
  await mainWallZone.click();
  await expect(mainWallZone).toHaveAttribute("aria-pressed", "true");
  await openingZone.click();
  await expect(openingZone).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("presence-studio-v3-arrange-controls").getByRole("button", { name: "Done", exact: true }).click();

  await page.getByTestId("presence-studio-v3-save-private-state").click();
  await expect(page.getByTestId("presence-studio-v3-save-status")).toHaveAttribute("data-save-phase", "saved");
  const fresh = await openCacheIndependentEditor(browser);
  await closeHome(fresh.page);
  await openLibrary(fresh.page);
  const restoredCanonical = libraryCard(libraryGroup(fresh.page, "Canonical Works"), "Opening image");
  await restoredCanonical.getByRole("button", { name: "Inspect / edit" }).click();
  await fresh.page.getByTestId("presence-studio-v3-arrange-action").click();
  await expect(fresh.page.getByTestId("presence-studio-v3-placement-summary")).toContainText("opening-work");
  await expect(fresh.page.getByTestId("presence-studio-v3-toggle-visibility")).toHaveText("Hide");
  await fresh.context.close();
  await expectOnlyProductWrites(request, [{ method: "PUT", path: "/api/presence/owner/rooms/29/editor/v3/state" }]);
});

test("arrangement survives a different Room Style apply, private save, and fresh hydration", async ({ page, browser, request }) => {
  await resetAndSignIn(page, request);
  await openEditor(page);
  await closeHome(page);
  if (await page.getByTestId("presence-public-bbbvision-threshold").isVisible()) {
    await page.getByTestId("presence-public-bbbvision-enter").click();
  }
  await expect(page.getByTestId("presence-public-bbbvision-gallery")).toBeVisible();

  await openLibrary(page);
  const canonical = libraryCard(libraryGroup(page, "Canonical Works"), "Opening image");
  await canonical.getByTestId("presence-studio-v3-place-piece").click();
  await canonical.getByRole("button", { name: "Inspect / edit" }).click();
  await page.getByTestId("presence-studio-v3-arrange-action").click();
  const mainWallZone = page.getByTestId("presence-studio-v3-zone-main-wall");
  await mainWallZone.click();
  await expect(mainWallZone).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("presence-studio-v3-arrange-controls").getByRole("button", { name: "Done", exact: true }).click();

  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-room-style-film-strip-selected-works").click();
  await expect(page.getByTestId("presence-studio-v3-structural-preview")).toContainText("Film Strip / Selected Works");
  await page.getByTestId("presence-studio-v3-structural-apply").click();
  await page.getByRole("button", { name: "Close sheet" }).click();
  await expect(page.getByTestId("presence-public-film-strip")).toBeVisible();

  await page.getByTestId("presence-studio-v3-save-private-state").click();
  await expect(page.getByTestId("presence-studio-v3-save-status")).toHaveAttribute("data-save-phase", "saved");
  const stateWrite = (await requestLedger(request)).find((entry) => entry.method === "PUT");
  const metadata = (stateWrite?.body as { metadata?: Record<string, unknown> })?.metadata;
  const roomStyles = (metadata?.restore as { roomStyles?: Array<Record<string, unknown>> })?.roomStyles ?? [];
  expect(roomStyles.some((row) => row.roomId === "gallery" && row.compositionToken === "film-strip-selected-works")).toBeTruthy();
  const edits = metadata?.object_edits as Array<Record<string, unknown>>;
  expect(edits.some((row) => row.roomId === "gallery" && row.zoneId === "main-wall")).toBeFalsy();

  const fresh = await openCacheIndependentEditor(browser);
  await closeHome(fresh.page);
  await expect(fresh.page.getByTestId("presence-public-film-strip")).toBeVisible();
  await openLibrary(fresh.page);
  const restoredCanonical = libraryCard(libraryGroup(fresh.page, "Canonical Works"), "Opening image");
  await restoredCanonical.getByRole("button", { name: "Inspect / edit" }).click();
  await fresh.page.getByTestId("presence-studio-v3-arrange-action").click();
  const restoredSummary = fresh.page.getByTestId("presence-studio-v3-placement-summary");
  await expect(restoredSummary).not.toContainText("main-wall");
  expect(await restoredSummary.innerText()).toMatch(/active-work-stage|sequence-index|selected-work-context/);
  await fresh.context.close();
  await expectOnlyProductWrites(request, [{ method: "PUT", path: "/api/presence/owner/rooms/29/editor/v3/state" }]);
});

test("visual Look, Room Style, treatment, background, typography and motion cards are functional", async ({ page, request }) => {
  await resetAndSignIn(page, request);
  await openEditor(page);
  await closeHome(page);
  await page.getByTestId("presence-studio-v3-look-trigger").click();

  const lookCards = page.locator(".studio-v3-look-cards .studio-v3-option-card");
  await expect(lookCards).toHaveCount(3);
  await expect(lookCards.locator(".studio-v3-look-miniature")).toHaveCount(3);
  await page.getByTestId("presence-studio-v3-look-option-zine-archive").click();
  await expect(page.getByTestId("presence-studio-v3-look-option-zine-archive")).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: `${evidenceDir}/06-visual-look-cards.png`, fullPage: true });

  const exactBefore = await page.locator(".presence-studio-v2-public").first().innerHTML();
  await page.getByTestId("presence-studio-v3-room-style-film-strip-selected-works").scrollIntoViewIfNeeded();
  await page.getByTestId("presence-studio-v3-room-style-film-strip-selected-works").click();
  await expect(page.getByTestId("presence-studio-v3-structural-preview")).toContainText("Previewing");
  await expect(page.getByTestId("presence-public-film-strip")).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/07-visual-room-style-cards.png`, fullPage: true });
  await page.getByTestId("presence-studio-v3-structural-cancel").click();
  await expect(page.getByTestId("presence-studio-v3-status")).toContainText("exact prior structure restored");
  expect(await page.locator(".presence-studio-v2-public").first().innerHTML()).toBe(exactBefore);

  await page.getByTestId("presence-studio-v3-room-style-film-strip-selected-works").click();
  await expect(page.getByTestId("presence-public-film-strip")).toBeVisible();
  await page.getByRole("button", { name: "Close sheet" }).click();
  await expect(page.getByTestId("presence-studio-v3-status")).toContainText("exact prior structure restored");
  expect(await page.locator(".presence-studio-v2-public").first().innerHTML()).toBe(exactBefore);

  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-room-style-film-strip-selected-works").click();
  await expect(page.getByTestId("presence-public-film-strip")).toBeVisible();
  await page.getByRole("button", { name: "Close sheet" }).focus();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("presence-studio-v3-bottom-sheet")).toHaveCount(0);
  await expect(page.getByTestId("presence-studio-v3-status")).toContainText("exact prior structure restored");
  expect(await page.locator(".presence-studio-v2-public").first().innerHTML()).toBe(exactBefore);

  await page.getByTestId("presence-studio-v3-look-trigger").click();

  await page.getByTestId("presence-studio-v3-facet-background-night").scrollIntoViewIfNeeded();
  await page.getByTestId("presence-studio-v3-facet-background-night").click();
  await page.getByTestId("presence-studio-v3-facet-treatment-luminous").click();
  await page.getByTestId("presence-studio-v3-facet-typography-signal").click();
  await page.getByTestId("presence-studio-v3-facet-motion-living").click();
  const canvasRoot = page.locator(".presence-studio-v2-public").first();
  await expect(canvasRoot).toHaveAttribute("data-experience-atmosphere", "nocturnal-depth");
  await expect(canvasRoot).toHaveAttribute("data-experience-piece-treatment", "luminous-depth");
  await expect(page.getByTestId("presence-studio-v3-facet-motion-living")).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: `${evidenceDir}/08-visual-treatment-background-motion.png`, fullPage: true });
  await page.getByTestId("presence-studio-v3-lock-layer").click();
  await expect(page.getByTestId("presence-studio-v3-facet-motion-still")).toBeDisabled();
  await expect(page.getByTestId("presence-studio-v3-facet-motion-gentle")).toBeDisabled();
  await expect(page.getByTestId("presence-studio-v3-facet-motion-living")).toBeDisabled();
  await expectOnlyProductWrites(request, []);
});

test("private upload uses only the protected inventory endpoint and persists only a stable media id", async ({ page, browser, request }) => {
  await resetAndSignIn(page, request, { privateDraftMedia: true });
  await openEditor(page);
  await closeHome(page);
  await selectRoomNativePiece(page, "Opening image");
  await page.getByTestId("presence-studio-v3-edit-action").click();
  const upload = page.getByTestId("presence-studio-v3-upload-input");
  await expect(upload).toBeEnabled();
  await upload.setInputFiles({
    name: "m1-private-proof.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z4R0AAAAASUVORK5CYII=", "base64"),
  });
  await expect(page.getByTestId("presence-studio-v3-status")).toContainText("uploaded privately and selected");
  await expect(page.getByTestId("presence-public-bbbvision-threshold").locator(".v2-bbb-slide-stack img.is-active"))
    .toHaveAttribute("src", /private-media=bbb-v3-private-media-1/);
  await page.getByTestId("presence-studio-v3-piece-done").click();
  await page.getByTestId("presence-studio-v3-save-private-state").click();
  await expect(page.getByTestId("presence-studio-v3-save-status")).toHaveAttribute("data-save-phase", "saved");

  const writes = (await requestLedger(request)).filter((entry) => entry.method !== "GET");
  expect(writes.map(({ method, path }) => ({ method, path }))).toEqual([
    { method: "POST", path: "/api/presence/owner/rooms/29/assets/upload" },
    { method: "PUT", path: "/api/presence/owner/rooms/29/editor/v3/state" },
  ]);
  const metadata = (writes[1]?.body as { metadata?: Record<string, unknown> })?.metadata;
  const objectEdits = metadata?.object_edits as Array<Record<string, unknown>>;
  expect(objectEdits.find((row) => row.objectId === "bbb-sparkle")).toMatchObject({
    mediaId: "bbb-v3-private-media-1",
  });
  expect(JSON.stringify(metadata)).not.toMatch(/https?:\/\/|blob:|data:|private-media=/i);

  const restored = await openCacheIndependentEditor(browser);
  await closeHome(restored.page);
  await expect(restored.page.getByTestId("presence-public-bbbvision-threshold").locator(".v2-bbb-slide-stack img.is-active"))
    .toHaveAttribute("src", /private-media=bbb-v3-private-media-1/);
  await restored.context.close();
});

test("a save response preserves owner-private media uploaded concurrently from the Library", async ({ page, request }) => {
  await resetAndSignIn(page, request, { privateDraftMedia: true });
  await openEditor(page);
  await closeHome(page);
  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-look-option-soft-editorial").click();
  await page.getByRole("button", { name: "Close sheet" }).click();

  await request.post(`${API_BASE}/__test__/state`, { data: { delayNextStudioV3StateWriteMs: 900 } });
  await page.getByTestId("presence-studio-v3-save-private-state").click();
  await expect(page.getByTestId("presence-studio-v3-save-status")).toHaveAttribute("data-save-phase", "saving");
  await openLibrary(page);
  await page.getByRole("tab", { name: "Upload / Create" }).click();
  await page.getByTestId("presence-studio-v3-library-upload-create").locator('input[type="file"]').setInputFiles({
    name: "concurrent-private-inventory.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z4R0AAAAASUVORK5CYII=", "base64"),
  });
  await expect(page.getByTestId("presence-studio-v3-status")).toContainText("uploaded to the owner-private media Library");
  await expect(page.getByTestId("presence-studio-v3-save-status")).toHaveAttribute("data-save-phase", "saved");
  await page.getByRole("button", { name: "Close sheet" }).click();

  await selectRoomNativePiece(page, "Opening image");
  await page.getByTestId("presence-studio-v3-edit-action").click();
  await expect(page.getByTestId("presence-studio-v3-media-choice-asset-bbb-v3-private-media-1")).toBeVisible();
  const writes = (await requestLedger(request)).filter((entry) => entry.method !== "GET");
  expect(writes.map(({ method, path }) => ({ method, path }))).toEqual([
    { method: "PUT", path: "/api/presence/owner/rooms/29/editor/v3/state" },
    { method: "POST", path: "/api/presence/owner/rooms/29/assets/upload" },
  ]);
});

test("save feedback exposes saving, failure with retry, conflict with reload, disabled, and memory-only states", async ({ page, request }) => {
  await resetAndSignIn(page, request);
  await openEditor(page);
  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-look-option-soft-editorial").click();
  await page.getByRole("button", { name: "Close sheet" }).click();

  await request.post(`${API_BASE}/__test__/state`, { data: { delayNextStudioV3StateWriteMs: 650 } });
  await page.getByTestId("presence-studio-v3-save-private-state").click();
  await expect(page.getByTestId("presence-studio-v3-save-status")).toHaveAttribute("data-save-phase", "saving");
  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-look-option-zine-archive").click();
  await page.getByRole("button", { name: "Close sheet" }).click();
  await expect(page.getByTestId("presence-studio-v3-save-status")).toHaveAttribute("data-save-phase", "dirty");
  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await expect(page.getByTestId("presence-studio-v3-look-option-zine-archive")).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Close sheet" }).click();
  await page.getByTestId("presence-studio-v3-save-private-state").click();
  await expect(page.getByTestId("presence-studio-v3-save-status")).toHaveAttribute("data-save-phase", "saved");

  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-look-option-soft-editorial").click();
  await page.getByRole("button", { name: "Close sheet" }).click();

  await request.post(`${API_BASE}/__test__/state`, {
    data: { delayNextStudioV3StateWriteMs: 350, failNextStudioV3StateWrites: 1 },
  });
  await page.getByTestId("presence-studio-v3-save-private-state").click();
  await expect(page.getByTestId("presence-studio-v3-save-status")).toHaveAttribute("data-save-phase", "saving");
  await expect(page.getByTestId("presence-studio-v3-save-status")).toHaveAttribute("data-save-phase", "failed");
  await expect(page.getByTestId("presence-studio-v3-save-status")).toContainText("Could not save private editor state");
  await expect(page.getByTestId("presence-studio-v3-save-retry")).toBeVisible();
  await page.getByTestId("presence-studio-v3-save-retry").click();
  await expect(page.getByTestId("presence-studio-v3-save-status")).toHaveAttribute("data-save-phase", "saved");

  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-look-option-zine-archive").click();
  await page.getByRole("button", { name: "Close sheet" }).click();
  await request.post(`${API_BASE}/__test__/state`, { data: { forceNextStudioV3StateConflict: 1 } });
  await page.getByTestId("presence-studio-v3-save-private-state").click();
  await expect(page.getByTestId("presence-studio-v3-save-status")).toHaveAttribute("data-save-phase", "conflict");
  await expect(page.getByTestId("presence-studio-v3-save-status")).toContainText("Conflict");
  await expect(page.getByTestId("presence-studio-v3-save-reload")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v3-save-private-state")).toBeDisabled();
  await page.screenshot({ path: `${evidenceDir}/13-private-save-failure-or-conflict.png`, fullPage: true });

  await resetAndSignIn(page, request, { failStudioV3StateReads: true });
  await openEditor(page);
  await expect(page.getByTestId("presence-studio-v3-save-status")).toHaveAttribute("data-save-phase", "disabled");
  await expect(page.getByTestId("presence-studio-v3-save-status")).toContainText("Durable save disabled");

  await request.post(`${API_BASE}/__test__/reset`);
  await request.post(`${API_BASE}/__test__/state`, { data: { failStudioV3StateReads: true } });
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "locks", { configurable: true, get: () => undefined });
  });
  await page.goto("/");
  await enableOwnerAccess(page);
  await openEditor(page);
  await expect(page.getByTestId("presence-studio-v3-save-status")).toHaveAttribute("data-save-phase", "memory-only");
  await expect(page.getByTestId("presence-studio-v3-save-status")).toContainText("Memory-only mode");
});

test("newer draft base preserves published durable state and disables unsafe replacement", async ({ page, request }) => {
  await resetAndSignIn(page, request);
  await openEditor(page);
  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-look-option-soft-editorial").click();
  await page.getByRole("button", { name: "Close sheet" }).click();
  await page.getByTestId("presence-studio-v3-save-private-state").click();
  await expect(page.getByTestId("presence-studio-v3-save-status")).toHaveAttribute("data-save-phase", "saved");

  const beforeResponse = await request.get(`${API_BASE}/api/presence/owner/rooms/29/editor/v3/state`, {
    headers: { Authorization: "Bearer owner-test-token" },
  });
  const before = await beforeResponse.json() as { data: { state: Record<string, unknown> } };
  await request.post(`${API_BASE}/__test__/state`, { data: { useBbbVisionDraftBase: true } });
  await page.reload({ waitUntil: "networkidle" });

  await expect(page.getByTestId("presence-studio-v3-status")).toHaveAttribute("data-durable-base-state", "mismatch");
  await expect(page.getByTestId("presence-studio-v3-status")).toHaveText(durableBaseMismatchMessage);
  await expect(page.getByTestId("presence-studio-v3-save-status")).toHaveAttribute("data-save-phase", "conflict");
  await expect(page.getByTestId("presence-studio-v3-save-private-state")).toBeDisabled();

  const afterResponse = await request.get(`${API_BASE}/api/presence/owner/rooms/29/editor/v3/state`, {
    headers: { Authorization: "Bearer owner-test-token" },
  });
  const after = await afterResponse.json() as typeof before;
  expect(after.data.state).toEqual(before.data.state);
  await expectOnlyProductWrites(request, [{ method: "PUT", path: "/api/presence/owner/rooms/29/editor/v3/state" }]);
});

test("one-sided canonical Library failures preserve durable metadata and disable replacement", async ({ page, request }) => {
  await resetAndSignIn(page, request);
  await openEditor(page);
  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-look-option-soft-editorial").click();
  await page.getByRole("button", { name: "Close sheet" }).click();
  await page.getByTestId("presence-studio-v3-save-private-state").click();
  await expect(page.getByTestId("presence-studio-v3-save-status")).toHaveAttribute("data-save-phase", "saved");
  await expect.poll(() => page.evaluate(() => Object.keys(window.localStorage)
    .filter((key) => key.startsWith("presence-studio-v3:prototype:"))
    .map((key) => window.localStorage.getItem(key) ?? "")
    .some((value) => value.includes('"metadataRevision":1')))).toBeTruthy();

  const durableBefore = await (await request.get(`${API_BASE}/api/presence/owner/rooms/29/editor/v3/state`, {
    headers: { Authorization: "Bearer owner-test-token" },
  })).json();
  const localBefore = await page.evaluate(() => Object.fromEntries(
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith("presence-studio-v3:prototype:"))
      .map((key) => [key, window.localStorage.getItem(key)]),
  ));

  // Next dev intentionally mounts effects more than once. Keep the selected
  // source unavailable across those duplicate reads, and explicitly reset the
  // other source so each branch remains one-sided.
  for (const control of [
    { failNextOwnerWorksReads: 8, failNextOwnerCollectionsReads: 0 },
    { failNextOwnerWorksReads: 0, failNextOwnerCollectionsReads: 8 },
  ]) {
    await request.post(`${API_BASE}/__test__/state`, { data: control });
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByTestId("presence-studio-v3-save-status")).toHaveAttribute("data-save-phase", "disabled");
    await expect(page.getByTestId("presence-studio-v3-save-status")).toContainText("complete owner Library could not be loaded");
    await expect(page.getByTestId("presence-studio-v3-save-private-state")).toBeDisabled();
    await openLibrary(page);
    await expect(page.getByTestId("presence-studio-v3-piece-shelf")).toContainText("Durable private save is disabled to preserve canonical references");
    await page.getByRole("button", { name: "Close sheet" }).click();
    expect(await page.evaluate(() => Object.fromEntries(
      Object.keys(window.localStorage)
        .filter((key) => key.startsWith("presence-studio-v3:prototype:"))
        .map((key) => [key, window.localStorage.getItem(key)]),
    ))).toEqual(localBefore);
  }

  const durableAfter = await (await request.get(`${API_BASE}/api/presence/owner/rooms/29/editor/v3/state`, {
    headers: { Authorization: "Bearer owner-test-token" },
  })).json();
  expect(durableAfter).toEqual(durableBefore);
  await expectOnlyProductWrites(request, [{ method: "PUT", path: "/api/presence/owner/rooms/29/editor/v3/state" }]);
});

test("partial private-state restore preserves unresolved canonical references and locks durable replacement", async ({ page, request }) => {
  await resetAndSignIn(page, request);
  await openEditor(page);
  await closeHome(page);
  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-look-option-zine-archive").click();
  await page.getByRole("button", { name: "Close sheet" }).click();
  await page.getByTestId("presence-studio-v3-save-private-state").click();
  await expect(page.getByTestId("presence-studio-v3-save-status")).toHaveAttribute("data-save-phase", "saved");

  const savedResponse = await request.get(`${API_BASE}/api/presence/owner/rooms/29/editor/v3/state`, {
    headers: { Authorization: "Bearer owner-test-token" },
  });
  const saved = await savedResponse.json() as {
    data: {
      state: {
        room_id: number;
        metadata_schema_version: string;
        metadata_revision: number;
        base: Record<string, unknown>;
        metadata: Record<string, unknown> & { restore?: Record<string, unknown> };
      };
    };
  };
  const unresolvedMetadata = {
    ...saved.data.state.metadata,
    restore: {
      ...saved.data.state.metadata.restore,
      activeLookId: "missing-canonical-look",
    },
  };
  const injectedResponse = await request.put(`${API_BASE}/api/presence/owner/rooms/29/editor/v3/state`, {
    headers: { Authorization: "Bearer owner-test-token" },
    data: {
      expected: {
        room_id: saved.data.state.room_id,
        ...saved.data.state.base,
        metadata_revision: saved.data.state.metadata_revision,
      },
      metadata_schema_version: saved.data.state.metadata_schema_version,
      metadata: unresolvedMetadata,
    },
  });
  expect(injectedResponse.ok()).toBeTruthy();
  const injected = await injectedResponse.json() as { data: { state: Record<string, unknown> } };
  const writesBeforeReload = (await requestLedger(request)).filter((entry) => entry.method === "PUT").length;

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v3-save-status")).toHaveAttribute("data-save-phase", "conflict");
  await expect(page.getByTestId("presence-studio-v3-save-status")).toContainText("canonical references that are unavailable");
  await expect(page.getByTestId("presence-studio-v3-save-status")).toContainText("reload latest");
  await expect(page.getByTestId("presence-studio-v3-save-reload")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v3-save-private-state")).toBeDisabled();

  await closeHome(page);
  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-look-option-nocturnal-gallery").click();
  await expect(page.getByTestId("presence-studio-v3-look-option-nocturnal-gallery")).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Close sheet" }).click();
  await expect(page.getByTestId("presence-studio-v3-save-status")).toHaveAttribute("data-save-phase", "conflict");
  await expect(page.getByTestId("presence-studio-v3-save-private-state")).toBeDisabled();

  const durableAfter = await (await request.get(`${API_BASE}/api/presence/owner/rooms/29/editor/v3/state`, {
    headers: { Authorization: "Bearer owner-test-token" },
  })).json() as typeof injected;
  expect(durableAfter.data.state).toEqual(injected.data.state);
  expect((await requestLedger(request)).filter((entry) => entry.method === "PUT")).toHaveLength(writesBeforeReload);
});

test("authenticated sign-out clears the active local V3 partition", async ({ page, request }) => {
  await resetAndSignIn(page, request);
  await openEditor(page);
  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-look-option-soft-editorial").click();
  await expect.poll(async () => page.evaluate(() => Object.keys(window.localStorage)
    .filter((key) => key.startsWith("presence-studio-v3:prototype")).length)).toBeGreaterThan(0);

  await page.evaluate(() => {
    window.localStorage.removeItem("presence:e2e:access_token");
    window.dispatchEvent(new CustomEvent("presence:e2e:auth-state", { detail: { event: "SIGNED_OUT", session: null } }));
  });
  await expect(page.getByText("Sign in required.")).toBeVisible();
  await expect.poll(async () => page.evaluate(() => Object.keys(window.localStorage)
    .filter((key) => key.startsWith("presence-studio-v3:prototype")).length)).toBe(0);
  await expectOnlyProductWrites(request, []);
});

test("mock private-state boundary rejects raw URL media metadata without storing it", async ({ request }) => {
  await request.post(`${API_BASE}/__test__/reset`);
  const response = await request.put(`${API_BASE}/api/presence/owner/rooms/29/editor/v3/state`, {
    headers: { Authorization: "Bearer owner-test-token" },
    data: {
      expected: {
        room_id: 29,
        config_id: 9902,
        source_kind: "published",
        status: "published",
        version: 2,
        revision: 1,
        schema_version: "presence-editable-config-v1",
        fingerprint: "0123456789abcdef",
        metadata_revision: 0,
      },
      metadata_schema_version: "presence-studio-v3-private-v1",
      metadata: {
        owner_mode: "simple",
        named_looks: [],
        layer_locks: [],
        savepoints: [],
        placements: [],
        object_edits: [{
          id: "edit:unsafe",
          roomId: "threshold",
          objectId: "bbb-sparkle",
          sourceRef: "legacy-object:bbb-sparkle",
          mediaSourceRef: "https://unsafe.example/private.png",
        }],
        layer_values: [],
        restore: { activeRoomId: "threshold", activeLookId: "soft-editorial", roomStyles: [], unresolvedRefs: [] },
        compatibility: [],
      },
    },
  });
  expect(response.status()).toBe(422);
  const read = await request.get(`${API_BASE}/api/presence/owner/rooms/29/editor/v3/state`, {
    headers: { Authorization: "Bearer owner-test-token" },
  });
  expect((await read.json() as { data: { state: unknown } }).data.state).toBeNull();
});
