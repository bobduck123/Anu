import { mkdirSync } from "node:fs";
import { expect, test, type APIRequestContext, type Page } from "playwright/test";

const API_BASE = "http://127.0.0.1:5105";
const evidenceDir = "docs/program/evidence/presence-studio-v3-p1-foundation/screenshots";
const loadedOwnerLibraryCollectionSourceRef = "collection:loaded-owner-library";
const durableBaseMismatchMessage =
  "Existing durable state is preserved, but it belongs to a different Studio base. Private-state save is disabled until a reviewed rebase or clear is available.";
mkdirSync(evidenceDir, { recursive: true });
const forbiddenWritePatterns = [
  /\/api\/presence\/owner\/rooms\/29\/editor\/draft/,
  /\/api\/presence\/owner\/rooms\/29\/editor\/preview/,
  /\/api\/presence\/owner\/rooms\/29\/editor\/publish/,
  /\/api\/presence\/owner\/rooms\/29\/editor\/rollback/,
];

const allowedWritePatterns = [/^\/__test__\//];

async function signInOwnerAndEnableV3(page: Page, request: APIRequestContext) {
  await request.post(`${API_BASE}/__test__/reset`);
  await page.goto("/");
  await enableOwnerAccess(page);
}

async function enableOwnerAccess(page: Page) {
  await page.evaluate(() => {
    window.localStorage.setItem("presence:e2e:access_token", "owner-test-token");
    window.localStorage.setItem("presence-studio-v3:bbb-pilot", "1");
  });
}

async function expectNoForbiddenWrites(request: APIRequestContext) {
  const requestLog = await (await request.get(`${API_BASE}/__test__/requests`)).json() as {
    requests: Array<{ method: string; path: string }>;
  };
  const forbidden = requestLog.requests.filter((entry) => {
    if (entry.method === "GET") return false;
    if (allowedWritePatterns.some((pattern) => pattern.test(entry.path))) return false;
    return true;
  });
  expect(forbidden.filter((entry) => forbiddenWritePatterns.some((pattern) => pattern.test(entry.path)))).toEqual([]);
  expect(forbidden).toEqual([]);
}

test("BBB local Studio V3 prototype loads, places Pieces, edits Looks, and stays browser-local", async ({ page, request }) => {
  await signInOwnerAndEnableV3(page, request);

  await page.goto("/studio/29/editor", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v3-shell")).toBeVisible();
  await expect(page.getByRole("button", { name: "Visitor Preview" })).toBeDisabled();
  await expect(page.getByText("No complete local snapshot")).toBeVisible();
  await expect(page.getByText(/V3 metadata remains owner-private and saves separately/)).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/00-p0-regression-home-local.png`, fullPage: true });

  await page.getByRole("button", { name: "Home" }).click();
  await expect(page.getByTestId("presence-public-bbbvision-threshold")).toBeVisible();
  await page.getByTestId("presence-public-bbbvision-enter").click();
  await expect(page.getByTestId("presence-public-bbbvision-gallery")).toBeVisible();
  await expect(page.getByText(/Selected Room/)).toBeVisible();
  const thresholdDots = page.locator(".v2-bbb-dot-nav button");
  if (await thresholdDots.count() > 1) {
    await thresholdDots.nth(1).click();
    await expect(page.getByText("Visitor chrome suppressed in editor")).toBeVisible();
  }
  await page.getByTestId("presence-studio-v3-shelf-trigger").click();
  await expect(page.getByTestId("presence-studio-v3-piece-shelf")).toBeVisible();
  await page.getByTestId("presence-studio-v3-place-piece").click();
  await expect(page.getByTestId("presence-studio-v3-placement-summary")).toContainText("1 placed");
  await page.getByTestId("presence-studio-v3-place-collection").click();
  await expect(page.getByTestId("presence-studio-v3-placement-summary")).toContainText("duplicate");

  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-apply-soft-editorial").click();
  await expect(page.getByText("Soft Editorial applied locally")).toBeVisible();
  await page.getByRole("button", { name: "Close sheet" }).click();
  const galleryRoomLinks = page.locator(".v2-public-threshold-index a[href^='#v2-public-room-']", { hasText: "Gallery" });
  const genericRoomLink = await galleryRoomLinks.count() > 0
    ? galleryRoomLinks.first()
    : page.locator(".v2-public-threshold-index a[href^='#v2-public-room-']").first();
  await genericRoomLink.click();
  await expect(page.getByText(/Selected Room/)).toBeVisible();
  const placedObject = page.locator("[id^='v2-public-object-studio-v3']").first();
  await expect(placedObject).toBeVisible();
  await placedObject.click();
  await expect(page.getByTestId("presence-studio-v3-action-bar")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v3-more-action")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("presence-studio-v3-action-bar")).toHaveCount(0);
  await placedObject.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("presence-studio-v3-action-bar")).toBeVisible();
  await page.keyboard.press("Escape");
  await placedObject.focus();
  await page.keyboard.press("Space");
  await expect(page.getByTestId("presence-studio-v3-action-bar")).toBeVisible();
  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-lock-layer").click();
  await expect(page.getByText("locked locally")).toBeVisible();
  await page.getByTestId("presence-studio-v3-named-look-name").fill("Owner Soft Editorial");
  await page.getByTestId("presence-studio-v3-save-named-look").click();
  await page.getByTestId("presence-studio-v3-apply-nocturnal-gallery").click();
  await page.getByTestId("presence-studio-v3-restore-named-look").click();
  await expect(page.getByText("Named Look restored locally")).toBeVisible();
  await page.getByTestId("presence-studio-v3-shelf-trigger").click();
  await page.getByTestId("presence-studio-v3-place-piece").click();
  await expect(page.getByTestId("presence-studio-v3-placement-summary")).toContainText("1 placed");
  await expect(page.getByTestId("presence-studio-v3-retained-placements")).toContainText("Retained Pieces");
  await page.screenshot({ path: `${evidenceDir}/00-p0-regression-look-loop.png`, fullPage: true });

  await expect.poll(async () => page.evaluate(() => Object.keys(window.localStorage).filter((key) => key.startsWith("presence-studio-v3:prototype")).length)).toBeGreaterThan(0);
  await page.goto("/");
  await enableOwnerAccess(page);
  await page.goto("/studio/29/editor", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("presence-studio-v3-shell")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Restored browser-local changes")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("presence-studio-v3-shelf-trigger").click();
  await expect(page.getByTestId("presence-studio-v3-placement-summary")).toContainText("1 placed");
  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await expect(page.getByTestId("presence-studio-v3-saved-look-name")).toContainText("Owner Soft Editorial");
  await expectNoForbiddenWrites(request);
});

test("Studio V3 clears its active local partition and in-memory document on authenticated sign-out", async ({ page, request }) => {
  await signInOwnerAndEnableV3(page, request);
  await page.goto("/studio/29/editor", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v3-shell")).toBeVisible();
  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-apply-soft-editorial").click();
  await expect.poll(async () => page.evaluate(() => Object.keys(window.localStorage)
    .filter((key) => key.startsWith("presence-studio-v3:prototype")).length)).toBeGreaterThan(0);

  await page.evaluate(() => {
    window.localStorage.removeItem("presence:e2e:access_token");
    window.dispatchEvent(new CustomEvent("presence:e2e:auth-state", { detail: { event: "SIGNED_OUT", session: null } }));
  });

  await expect(page.getByText("Sign in required.")).toBeVisible();
  await expect.poll(async () => page.evaluate(() => Object.keys(window.localStorage)
    .filter((key) => key.startsWith("presence-studio-v3:prototype")).length)).toBe(0);
  await expectNoForbiddenWrites(request);
});

test("P1 Looks and Room Styles are distinct, staged, exactly cancellable, and browser-local", async ({ page, request }) => {
  await signInOwnerAndEnableV3(page, request);
  await page.goto("/studio/29/editor", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v3-shell")).toBeVisible();
  await page.getByRole("button", { name: "Home" }).click();

  await page.getByTestId("presence-studio-v3-shelf-trigger").click();
  await page.getByTestId("presence-studio-v3-place-piece").click();
  await page.getByTestId("presence-studio-v3-place-collection").click();
  await page.getByTestId("presence-studio-v3-look-trigger").click();

  const visualSignatures: Array<{
    background: string;
    accent: string;
    texture: string;
    density: string;
    atmosphere: string;
    treatment: string;
    journey: string;
    renderer: string;
  }> = [];
  for (const option of [
    { id: "soft-editorial", label: "Soft Editorial", screenshot: "01-soft-editorial-same-bbb-content.png" },
    { id: "nocturnal-gallery", label: "Nocturnal Gallery", screenshot: "02-nocturnal-gallery-same-bbb-content.png" },
    { id: "zine-archive", label: "Zine Archive", screenshot: "03-zine-archive-same-bbb-content.png" },
  ] as const) {
    await page.getByTestId(`presence-studio-v3-look-option-${option.id}`).click();
    await expect(page.getByText(`${option.label} applied locally`)).toBeVisible();
    visualSignatures.push(await page.locator(".presence-studio-v2-public").first().evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.getPropertyValue("--v2-public-bg").trim(),
        accent: style.getPropertyValue("--v2-public-accent").trim(),
        texture: Array.from(element.classList).find((name) => name.startsWith("texture-")) ?? "",
        density: element.getAttribute("data-experience-density") ?? "",
        atmosphere: element.getAttribute("data-experience-atmosphere") ?? "",
        treatment: element.getAttribute("data-experience-piece-treatment") ?? "",
        journey: element.getAttribute("data-experience-journey") ?? "",
        renderer: element.getAttribute("data-testid") ?? "generic-v2",
      };
    }));
    await page.screenshot({ path: `${evidenceDir}/${option.screenshot}`, fullPage: true });
  }
  expect(new Set(visualSignatures.map((signature) => JSON.stringify(signature))).size).toBe(3);
  expect(new Set(visualSignatures.map((signature) => signature.density)).size).toBe(3);
  expect(new Set(visualSignatures.map((signature) => signature.treatment)).size).toBe(3);
  expect(visualSignatures[1]?.renderer).toBe("presence-public-style-bbbvision-threshold-gallery");

  for (const option of [
    { id: "threshold-portal", label: "Threshold Portal", screenshot: "04-threshold-portal.png" },
    { id: "gallery-wall", label: "Gallery Wall", screenshot: "05-gallery-wall.png" },
    { id: "film-strip-selected-works", label: "Film Strip / Selected Works", screenshot: "06-film-strip-selected-works.png" },
  ] as const) {
    await page.getByTestId(`presence-studio-v3-room-style-${option.id}`).click();
    await expect(page.getByTestId("presence-studio-v3-structural-preview")).toContainText("Previewing");
    await page.getByTestId("presence-studio-v3-structural-apply").click();
    await expect(page.getByText(`${option.label} applied locally`)).toBeVisible();
    if (option.id === "film-strip-selected-works") {
      await expect(page.getByTestId("presence-public-film-strip")).toBeVisible();
    }
    await page.screenshot({ path: `${evidenceDir}/${option.screenshot}`, fullPage: true });
  }

  const exactBeforeCancel = await page.locator(".presence-studio-v2-public").first().innerHTML();
  await page.getByTestId("presence-studio-v3-room-style-gallery-wall").click();
  await page.getByTestId("presence-studio-v3-compare-before").click();
  await expect(page.getByTestId("presence-studio-v3-structural-preview")).toContainText("Before");
  await expect(page.getByTestId("presence-studio-v3-shelf-trigger")).toBeDisabled();
  await expect(page.getByTestId("presence-studio-v3-test-visitor")).toBeDisabled();
  await expect(page.getByTestId("presence-studio-v3-save-named-look")).toBeDisabled();
  await expect(page.getByTestId("presence-public-film-strip")).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/07-before-structural-change.png`, fullPage: true });

  await page.getByTestId("presence-studio-v3-compare-after").click();
  await expect(page.getByTestId("presence-studio-v3-structural-preview")).toContainText("After");
  await expect(page.getByTestId("presence-public-film-strip")).toHaveCount(0);
  await page.screenshot({ path: `${evidenceDir}/08-after-staged-structural-change.png`, fullPage: true });

  await page.getByTestId("presence-studio-v3-structural-cancel").click();
  await expect(page.getByText("Preview cancelled - exact prior structure restored")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v3-structural-preview")).toHaveCount(0);
  await expect(page.getByTestId("presence-public-film-strip")).toBeVisible();
  expect(await page.locator(".presence-studio-v2-public").first().innerHTML()).toBe(exactBeforeCancel);
  await page.screenshot({ path: `${evidenceDir}/09-cancel-exact-restore-proof.png`, fullPage: true });

  await expect(page.getByTestId("presence-studio-v3-compatibility-summary")).toContainText("accounted for");
  await expect(page.getByTestId("presence-studio-v3-compatibility-summary")).toContainText("Locks preserved");
  await expect(page.getByTestId("presence-studio-v3-compatibility-summary")).toContainText("Overrides preserved");
  await expect(page.getByTestId("presence-studio-v3-compatibility-summary")).toContainText("Overflow");
  await page.screenshot({ path: `${evidenceDir}/10-compatibility-shelf-summary.png`, fullPage: true });
  await expectNoForbiddenWrites(request);
});

test("P1 durable private state writes only the reviewed owner-private endpoint and restores after reload", async ({ page, request }) => {
  await signInOwnerAndEnableV3(page, request);
  await page.goto("/studio/29/editor", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v3-shell")).toBeVisible();

  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-look-option-zine-archive").click();
  await page.getByTestId("presence-studio-v3-lock-layer").click();
  await page.getByTestId("presence-studio-v3-named-look-name").fill("Durable Zine Proof");
  await page.getByTestId("presence-studio-v3-save-named-look").click();
  await page.getByRole("button", { name: "Close sheet" }).click();
  await page.getByTestId("presence-studio-v3-shelf-trigger").click();
  await page.getByTestId("presence-studio-v3-place-collection").click();
  await expect(page.getByText("Collection placed locally")).toBeVisible();
  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-room-style-film-strip-selected-works").click();
  await page.getByTestId("presence-studio-v3-structural-apply").click();
  await page.getByRole("button", { name: "Close sheet" }).click();
  await expect(page.getByTestId("presence-public-film-strip")).toBeVisible();

  await expect.poll(async () => page.evaluate(() => Object.keys(window.localStorage)
    .filter((key) => key.includes(":snapshot:"))
    .map((key) => JSON.parse(window.localStorage.getItem(key) ?? "{}"))
    .some((snapshot) => snapshot?.presence?.metadata?.savepoints?.length > 0))).toBe(true);
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByText("Restored browser-local changes")).toBeVisible();
  await expect(page.getByTestId("presence-public-film-strip")).toBeVisible();

  await page.getByTestId("presence-studio-v3-save-private-state").click();
  await expect(page.getByText("Private V3 state saved")).toBeVisible();

  const requestLog = await (await request.get(`${API_BASE}/__test__/requests`)).json() as {
    requests: Array<{ method: string; path: string }>;
  };
  const productWrites = requestLog.requests.filter((entry) => (
    entry.method !== "GET" && !allowedWritePatterns.some((pattern) => pattern.test(entry.path))
  ));
  expect(productWrites.map(({ method, path }) => ({ method, path }))).toEqual([{
    method: "PUT",
    path: "/api/presence/owner/rooms/29/editor/v3/state",
  }]);

  const storedResponse = await request.get(`${API_BASE}/api/presence/owner/rooms/29/editor/v3/state`, {
    headers: { Authorization: "Bearer owner-test-token" },
  });
  expect(storedResponse.ok()).toBeTruthy();
  const stored = await storedResponse.json() as {
    data: { state: { metadata_revision: number; metadata: {
      named_looks: Array<{ name: string }>;
      placements: Array<{ collectionSourceRef?: string }>;
      savepoints: Array<{ rooms: Array<{
        composition?: { layoutId: string };
        placements: Array<{ collectionSourceRef?: string }>;
      }> }>;
      restore: { roomStyles: Array<{ styleId: string }> };
    } } };
  };
  expect(stored.data.state.metadata_revision).toBe(1);
  expect(stored.data.state.metadata.named_looks.some((look) => look.name === "Durable Zine Proof")).toBeTruthy();
  expect(stored.data.state.metadata.savepoints).toHaveLength(1);
  expect(stored.data.state.metadata.savepoints[0]?.rooms[0]?.composition?.layoutId).toBe("gallery-wall");
  expect(stored.data.state.metadata.restore.roomStyles[0]?.styleId).toBe("film-strip-selected-works");
  expect(stored.data.state.metadata.placements.some(
    (placement) => placement.collectionSourceRef === loadedOwnerLibraryCollectionSourceRef,
  )).toBeTruthy();
  expect(stored.data.state.metadata.savepoints.some((savepoint) => savepoint.rooms.some((room) => (
    room.placements.some(
      (placement) => placement.collectionSourceRef === loadedOwnerLibraryCollectionSourceRef,
    )
  )))).toBeTruthy();

  await page.evaluate(() => {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith("presence-studio-v3:prototype")) window.localStorage.removeItem(key);
    }
  });
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v3-shell")).toBeVisible();
  await expect(page.getByText("Restored durable private V3 state")).toBeVisible();
  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await expect(page.getByTestId("presence-studio-v3-saved-look-name")).toContainText("Durable Zine Proof");
  await expect(page.getByTestId("presence-public-film-strip")).toBeVisible();
  await page.getByTestId("presence-studio-v3-restore-structural-savepoint").click();
  await expect(page.getByText("Last structural savepoint restored")).toBeVisible();
  await expect(page.getByTestId("presence-public-film-strip")).toHaveCount(0);
  await expect.poll(async () => page.evaluate((collectionRef) => Object.keys(window.localStorage)
    .filter((key) => key.includes(":snapshot:"))
    .map((key) => JSON.parse(window.localStorage.getItem(key) ?? "{}"))
    .some((snapshot) => snapshot?.presence?.metadata?.placements?.some(
      (placement: { collectionSourceRef?: string }) => placement.collectionSourceRef === collectionRef,
    ) && snapshot?.presence?.metadata?.savepoints?.some(
      (savepoint: { rooms?: Array<{ placements?: Array<{ collectionSourceRef?: string }> }> }) => savepoint.rooms?.some(
        (room) => room.placements?.some((placement) => placement.collectionSourceRef === collectionRef),
      ),
    )), loadedOwnerLibraryCollectionSourceRef)).toBe(true);
});

test("newer durable private state rejects a stale browser-local overlay before it can save", async ({ page, request }) => {
  await signInOwnerAndEnableV3(page, request);
  await page.goto("/studio/29/editor", { waitUntil: "networkidle" });
  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-look-option-soft-editorial").click();
  await page.getByTestId("presence-studio-v3-named-look-name").fill("Durable Soft Authority");
  await page.getByTestId("presence-studio-v3-save-named-look").click();
  await page.getByRole("button", { name: "Close sheet" }).click();
  await page.getByTestId("presence-studio-v3-save-private-state").click();
  await expect(page.getByText("Private V3 state saved")).toBeVisible();

  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-look-option-zine-archive").click();
  await expect.poll(async () => page.evaluate(() => Object.keys(window.localStorage)
    .filter((key) => key.includes(":snapshot:"))
    .map((key) => JSON.parse(window.localStorage.getItem(key) ?? "{}"))
    .some((snapshot) => snapshot?.presence?.metadataRevision === 1
      && snapshot?.presence?.metadata?.restore?.activeLookId === "zine-archive"))).toBe(true);

  const durableRead = await request.get(`${API_BASE}/api/presence/owner/rooms/29/editor/v3/state`, {
    headers: { Authorization: "Bearer owner-test-token" },
  });
  const durable = await durableRead.json() as { data: { state: {
    metadata_revision: number;
    metadata_schema_version: string;
    base: Record<string, unknown>;
    metadata: Record<string, unknown>;
  } } };
  const externalWrite = await request.put(`${API_BASE}/api/presence/owner/rooms/29/editor/v3/state`, {
    headers: { Authorization: "Bearer owner-test-token" },
    data: {
      expected: {
        room_id: 29,
        ...durable.data.state.base,
        metadata_revision: durable.data.state.metadata_revision,
      },
      metadata_schema_version: durable.data.state.metadata_schema_version,
      metadata: durable.data.state.metadata,
    },
  });
  expect(externalWrite.ok()).toBeTruthy();

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByText("Ignored stale browser-local snapshot")).toBeVisible();
  const root = page.locator(".presence-studio-v2-public").first();
  await expect(root).toHaveAttribute("data-experience-density", "spacious");
  await expect(root).not.toHaveAttribute("data-experience-density", "dense");
});

test("published durable state is preserved and locked when a newer draft base becomes live", async ({ page, request }) => {
  await signInOwnerAndEnableV3(page, request);
  await page.goto("/studio/29/editor", { waitUntil: "networkidle" });
  await expect(page.getByTestId("presence-studio-v3-shell")).toBeVisible();

  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await page.getByTestId("presence-studio-v3-look-option-soft-editorial").click();
  await page.getByTestId("presence-studio-v3-named-look-name").fill("Published Durable Authority");
  await page.getByTestId("presence-studio-v3-save-named-look").click();
  await page.getByRole("button", { name: "Close sheet" }).click();
  await page.getByTestId("presence-studio-v3-save-private-state").click();
  await expect(page.getByText("Private V3 state saved")).toBeVisible();

  const beforeResponse = await request.get(`${API_BASE}/api/presence/owner/rooms/29/editor/v3/state`, {
    headers: { Authorization: "Bearer owner-test-token" },
  });
  expect(beforeResponse.ok()).toBeTruthy();
  const before = await beforeResponse.json() as { data: { state: {
    metadata_revision: number;
    base: { source_kind: string; status: string; [key: string]: unknown };
    metadata: Record<string, unknown>;
    [key: string]: unknown;
  } } };
  expect(before.data.state.metadata_revision).toBe(1);
  expect(before.data.state.base.source_kind).toBe("published");
  expect(before.data.state.base.status).toBe("published");

  const draftControl = await request.post(`${API_BASE}/__test__/state`, {
    data: { useBbbVisionDraftBase: true },
  });
  expect(draftControl.ok()).toBeTruthy();
  await page.reload({ waitUntil: "networkidle" });

  const status = page.getByTestId("presence-studio-v3-status");
  await expect(status).toHaveAttribute("data-durable-base-state", "mismatch");
  await expect(status).toHaveText(durableBaseMismatchMessage);
  const privateSave = page.getByTestId("presence-studio-v3-save-private-state");
  await expect(privateSave).toBeDisabled();
  await expect(privateSave).toHaveAttribute("title", /Existing durable state is preserved/);
  const root = page.locator(".presence-studio-v2-public").first();
  await expect(root).toHaveAttribute("data-experience-density", "focused");
  await page.getByTestId("presence-studio-v3-look-trigger").click();
  await expect(page.getByTestId("presence-studio-v3-saved-look-name")).toHaveCount(0);

  await expect.poll(async () => page.evaluate(() => Object.keys(window.localStorage)
    .filter((key) => key.includes(":snapshot:"))
    .map((key) => JSON.parse(window.localStorage.getItem(key) ?? "{}"))
    .some((snapshot) => snapshot?.presence?.baseIdentity?.sourceKind === "draft"
      && snapshot?.presence?.metadataRevision === 0))).toBe(true);
  await privateSave.evaluate((button: HTMLButtonElement) => button.click());

  const requestLog = await (await request.get(`${API_BASE}/__test__/requests`)).json() as {
    requests: Array<{ method: string; path: string }>;
  };
  const productWrites = requestLog.requests.filter((entry) => (
    entry.method !== "GET" && !allowedWritePatterns.some((pattern) => pattern.test(entry.path))
  ));
  expect(productWrites.map(({ method, path }) => ({ method, path }))).toEqual([{
    method: "PUT",
    path: "/api/presence/owner/rooms/29/editor/v3/state",
  }]);

  const afterResponse = await request.get(`${API_BASE}/api/presence/owner/rooms/29/editor/v3/state`, {
    headers: { Authorization: "Bearer owner-test-token" },
  });
  expect(afterResponse.ok()).toBeTruthy();
  const after = await afterResponse.json() as typeof before;
  expect(after.data.state).toEqual(before.data.state);
});
