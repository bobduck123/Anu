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
      version: string;
      optionRef?: { optionId: string; version: string };
      mediaRef?: string;
      skinRef?: string;
      actionRefs: string[];
      materialSlotOverrides: Record<string, string>;
      anchor?: { kind: string; parentPlacementId?: string; anchorId?: string };
      contentArrangement?: { kind: string; overflowPolicy: string; capacity: number };
      transform: { position: [number, number, number]; rotation: [number, number, number] };
    }>;
    actions: Array<{ id: string; kind: string; label: string; href?: string }>;
    contentBindings?: Array<{
      id: string;
      hostPlacementId: string;
      pieceRef: string;
      pieceType: string;
      mediaRefs: string[];
      actionRefs: string[];
      order: number;
    }>;
    pieceLibrary?: Array<{
      id: string;
      pieceType: string;
      label: string;
      mediaRefs: string[];
      actionRefs: string[];
    }>;
    semanticFallback: Array<{ placementId: string; actionRefs: string[] }>;
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

test("candidate options palette exposes deferred room kits and persists placed candidate component refs", async ({ page }, testInfo) => {
  await openArranger(page);
  await expect(page.getByTestId("presence-spatial-candidate-room-kits")).toContainText("candidate.roomkit.boutique-0ae2");
  await expect(page.getByTestId("presence-spatial-candidate-room-kits")).toContainText("over-budget");
  await expect(page.getByTestId("presence-spatial-candidate-room-kits")).toContainText("not admitted");
  await expect(page.getByTestId("presence-spatial-candidate-components")).toContainText("display-island");
  await expect(page.getByTestId("presence-spatial-candidate-components")).toContainText("candidate-cleared-for-internal-use");
  await expect(page.getByTestId("presence-spatial-candidate-components")).toContainText("not production-ready");

  await page.getByRole("button", { name: "Create Mobstar" }).click();
  await page.getByTestId("presence-spatial-add-candidate-candidate-table-old-church-modeling-interior-sce-ffd7-017").click();
  await expect(page.getByTestId("presence-spatial-inspector-selected-component"))
    .toContainText("candidate.table.old-church-modeling-interior-sce-ffd7-017@1.0.0");
  await expect(page.getByTestId("presence-spatial-inspector-glb-status")).toContainText("draco optional GLB");
  await page.getByLabel("Material slot").selectOption("tabletop");
  await page.getByLabel("Material preset").selectOption("tabletop-gallery-white");
  await page.getByRole("button", { name: "Apply material preset" }).click();
  await page.getByLabel("Piece media").selectOption("mobstar-media-a");
  await page.getByRole("button", { name: /Assign to Candidate display-island/ }).click();
  await page.getByLabel("Action label").fill("Open candidate option");
  await page.getByLabel("HTTPS link").fill("https://example.com/candidate-option");
  await page.getByRole("button", { name: "Assign link action" }).click();
  await page.getByRole("button", { name: "Save local" }).click();

  const saved = await page.evaluate((key) => window.localStorage.getItem(key), MOBSTAR_DRAFT_KEY);
  expect(saved).toBeTruthy();
  const envelope = JSON.parse(saved ?? "null") as SavedSpatialEnvelope;
  const candidate = envelope.room.placements.find((placement) => (
    placement.componentId === "candidate.table.old-church-modeling-interior-sce-ffd7-017"
  ));
  expect(candidate?.version).toBe("1.0.0");
  expect(candidate?.materialSlotOverrides.tabletop).toBe("tabletop-gallery-white");
  expect(envelope.room.placements.some((placement) => placement.mediaRef === "mobstar-media-a")).toBe(true);
  expect(envelope.room.actions.some((action) => action.kind === "open-link" && action.href === "https://example.com/candidate-option")).toBe(true);
  expect(JSON.stringify(envelope)).not.toContain("sourceFile");
  await page.screenshot({ path: screenshotPath(testInfo, "12-candidate-options-palette.png"), fullPage: true });
});

test("option alias palette loads room kits and saves stable option refs", async ({ page }, testInfo) => {
  await openArranger(page);
  await expect(page.getByTestId("presence-spatial-roomkit-options")).toContainText("presence.roomkit.dark-boutique@0.1.0");
  await expect(page.getByTestId("presence-spatial-roomkit-options")).toContainText("presence.roomkit.ribbed-concrete@0.1.0");
  await expect(page.getByTestId("presence-spatial-option-aliases")).toContainText("Walls & Dividers");
  await expect(page.getByTestId("presence-spatial-option-aliases")).toContainText("Display Furniture");
  await expect(page.getByTestId("presence-spatial-option-aliases")).toContainText("Works & Media");
  await expect(page.getByTestId("presence-spatial-option-aliases")).toContainText("Candidate Objects");
  await expect(page.getByTestId("presence-spatial-option-aliases")).toContainText("Planned Options");
  await expect(page.getByTestId("presence-spatial-option-aliases")).toContainText("Future Display Systems");
  await expect(page.getByTestId("presence-spatial-option-aliases")).not.toContainText("Candidate Finds");
  await expect(page.getByTestId("presence-spatial-option-aliases")).not.toContainText("Future / Deferred");
  await expect(page.getByTestId("presence-spatial-option-aliases")).toContainText("presence.surface.display-island@0.1.0");
  await expect(page.getByTestId("presence-spatial-option-aliases")).toContainText("presence.object.archive-wall@0.1.0");
  await expect(page.getByTestId("presence-spatial-option-aliases")).toContainText("presence.object.listening-station@0.1.0");
  await expect(page.getByTestId("presence-spatial-option-aliases")).toContainText("presence.display.spherical-gallery@0.1.0");
  await expect(page.getByTestId("presence-spatial-option-aliases")).toContainText("presence.work.media-plane@0.1.0");
  await expect(page.getByTestId("presence-spatial-option-aliases")).toContainText("presence.object.garment-hanger@0.1.0");
  await expect(page.getByTestId("presence-spatial-option-aliases")).toContainText("presence.candidate.stacked-risers@0.1.0");
  await expect(page.getByTestId("presence-spatial-option-aliases")).toContainText("internal-experimental");
  await expect(page.getByTestId("presence-spatial-add-option-presence-display-spherical-gallery")).toBeEnabled();
  await expect(page.getByTestId("presence-spatial-add-option-presence-work-media-plane")).toBeDisabled();
  await expect(page.getByTestId("presence-spatial-add-option-presence-object-garment-hanger")).toBeDisabled();

  await page.getByTestId("presence-spatial-load-option-presence-roomkit-dark-boutique").click();
  await expect(page.getByRole("heading", { name: "Dark Gallery Room", exact: true })).toBeVisible();
  await expect(page.getByTestId("presence-spatial-inspector-layout-size")).toContainText(/B|KB/);
  await expect(page.getByTestId("presence-spatial-inspector-component-refs")).toContainText("presence.boutique-shell@1.0.0");

  await page.getByTestId("presence-spatial-add-option-presence-surface-display-island").click();
  await expect(page.getByTestId("presence-spatial-inspector-selected-component")).toHaveText("presence.rounded-island@1.0.0");
  await expect(page.getByTestId("presence-spatial-inspector-option-ref")).toHaveText("presence.surface.display-island@0.1.0");
  await expect(page.getByTestId("presence-spatial-inspector-fallback")).toContainText("semantic-only component fallback");

  await page.getByTestId("presence-spatial-add-option-presence-object-archive-wall").click();
  await expect(page.getByTestId("presence-spatial-inspector-selected-component")).toHaveText("presence.archive-wall@1.0.0");
  await expect(page.getByTestId("presence-spatial-inspector-option-ref")).toHaveText("presence.object.archive-wall@0.1.0");
  await page.getByLabel("Material slot").selectOption("poster-decal");
  await page.getByLabel("Material preset").selectOption("poster-archive");
  await page.getByRole("button", { name: "Apply material preset" }).click();
  await page.getByLabel("Piece media").selectOption("mobstar-media-a");
  await page.getByRole("button", { name: /Assign to Archive wall candidate/ }).click();

  await page.getByTestId("presence-spatial-add-option-presence-object-listening-station").click();
  await expect(page.getByTestId("presence-spatial-inspector-selected-component")).toHaveText("presence.listening-station@1.0.0");
  await expect(page.getByTestId("presence-spatial-inspector-option-ref")).toHaveText("presence.object.listening-station@0.1.0");
  await page.getByLabel("Material slot").selectOption("tabletop");
  await page.getByLabel("Material preset").selectOption("tabletop-warm-timber");
  await page.getByRole("button", { name: "Apply material preset" }).click();

  await page.getByTestId("presence-spatial-add-option-presence-candidate-stacked-risers").click();
  await expect(page.getByTestId("presence-spatial-inspector-selected-component")).toHaveText("candidate.chair.interior-7-3bc1-013@1.0.0");
  await expect(page.getByTestId("presence-spatial-inspector-option-ref")).toHaveText("presence.candidate.stacked-risers@0.1.0");

  await page.getByTestId("presence-spatial-add-option-presence-display-spherical-gallery").click();
  await expect(page.getByTestId("presence-spatial-inspector-selected-component")).toHaveText("presence.spherical-gallery@1.0.0");
  await expect(page.getByTestId("presence-spatial-inspector-option-ref")).toHaveText("presence.display.spherical-gallery@0.1.0");
  await page.getByLabel("Material slot").selectOption("projection");
  await page.getByLabel("Material preset").selectOption("projection-emissive");
  await page.getByRole("button", { name: "Apply material preset" }).click();
  await page.getByLabel("Action label").fill("Open spherical gallery");
  await page.getByLabel("HTTPS link").fill("https://example.com/spherical-gallery");
  await page.getByRole("button", { name: "Assign link action" }).click();
  await page.getByRole("button", { name: "Save local" }).click();

  const saved = await page.evaluate(() => window.localStorage.getItem("presence-spatial:internal-draft:v1:presence-option-roomkit-dark-boutique"));
  expect(saved).toBeTruthy();
  const envelope = JSON.parse(saved ?? "null") as SavedSpatialEnvelope;
  const stableOption = envelope.room.placements.find((placement) => placement.optionRef?.optionId === "presence.surface.display-island");
  expect(stableOption?.componentId).toBe("presence.rounded-island");
  expect(stableOption?.version).toBe("1.0.0");
  expect(stableOption?.optionRef?.version).toBe("0.1.0");
  const archiveWall = envelope.room.placements.find((placement) => placement.optionRef?.optionId === "presence.object.archive-wall");
  const listeningStation = envelope.room.placements.find((placement) => placement.optionRef?.optionId === "presence.object.listening-station");
  const candidateRisers = envelope.room.placements.find((placement) => placement.optionRef?.optionId === "presence.candidate.stacked-risers");
  const sphericalGallery = envelope.room.placements.find((placement) => placement.optionRef?.optionId === "presence.display.spherical-gallery");
  expect(archiveWall?.componentId).toBe("presence.archive-wall");
  expect(archiveWall?.materialSlotOverrides["poster-decal"]).toBe("poster-archive");
  expect(listeningStation?.componentId).toBe("presence.listening-station");
  expect(listeningStation?.materialSlotOverrides.tabletop).toBe("tabletop-warm-timber");
  expect(candidateRisers?.componentId).toBe("candidate.chair.interior-7-3bc1-013");
  expect(candidateRisers?.optionRef?.version).toBe("0.1.0");
  expect(sphericalGallery?.componentId).toBe("presence.spherical-gallery");
  expect(sphericalGallery?.anchor?.kind).toBe("free");
  expect(sphericalGallery?.materialSlotOverrides.projection).toBe("projection-emissive");
  expect(envelope.room.placements.some((placement) => placement.mediaRef === "mobstar-media-a")).toBe(true);
  expect(envelope.room.actions.some((action) => action.kind === "open-link" && action.href === "https://example.com/spherical-gallery")).toBe(true);
  expect(JSON.stringify(envelope)).not.toMatch(/\.(?:blend|glb|gltf)(?:["?#]|$)/i);
  expect(Buffer.byteLength(JSON.stringify(envelope), "utf8")).toBeLessThan(100 * 1024);
  await page.screenshot({ path: screenshotPath(testInfo, "15-option-alias-exposure-language.png"), fullPage: true });
});

test("host-targeted content binding saves ordered refs and preserves fallback actions", async ({ page }, testInfo) => {
  await openArranger(page);
  await expectThreeRenderer(page);
  await page.getByRole("button", { name: "Create Mobstar" }).click();
  await page.getByRole("button", { name: "+ Frame / poster surface", exact: true }).click();
  const hostId = await page.getByTestId("presence-spatial-binding-host").innerText();
  await expect(page.getByTestId("presence-spatial-binding-panel")).toContainText("Supported binding types");

  await page.getByLabel("Binding media").selectOption("mobstar-media-poster");
  await page.getByLabel("Arrangement").selectOption("wall-grid");
  await page.getByLabel("Overflow policy").selectOption("overflow-list");
  await page.getByLabel("Binding action").selectOption("enquire");
  await page.getByLabel("Action label").fill("Enquire about framed work");
  await page.getByLabel("HTTPS link").fill("https://example.com/framed-work");
  await page.getByRole("button", { name: "Bind content to host" }).click();
  await expect(page.getByText(/Bound Generated archive poster placeholder/)).toBeVisible();
  await expect(page.getByTestId("presence-spatial-bound-pieces")).toContainText("Generated archive poster placeholder");
  await expect(page.getByTestId("presence-spatial-binding-overflow")).toContainText("1/1 visible");
  await expect(page.getByTestId("presence-spatial-binding-fallback")).toContainText("enquire-binding");

  await page.getByLabel("Binding media").selectOption("mobstar-media-a");
  await page.getByLabel("Binding action").selectOption("listen");
  await page.getByLabel("Action label").fill("Listen to wrong media");
  await page.getByLabel("HTTPS link").fill("https://example.com/listen-wrong");
  await page.getByRole("button", { name: "Bind content to host" }).click();
  await expect(page.getByTestId("presence-spatial-diagnostics")).toContainText("Listen actions require audio media.");
  await expect(page.getByTestId("presence-spatial-binding-host")).toHaveText(hostId);
  await expect(page.getByTestId("presence-spatial-bound-pieces")).not.toContainText("Abstract generated garment placeholder A");

  await page.getByLabel("Binding media").selectOption("presence-sample-audio");
  await page.getByLabel("Action label").fill("Listen to sample");
  await page.getByLabel("HTTPS link").fill("https://example.com/listen");
  await page.getByRole("button", { name: "Bind content to host" }).click();
  await expect(page.getByText(/Bound Public-safe audio sample reference/)).toBeVisible();
  await expect(page.getByTestId("presence-spatial-inspector-content-bindings")).toContainText("2 bindings");
  await expect(page.getByTestId("presence-spatial-inspector-arrangement")).toContainText("wall-grid");
  await expect(page.getByTestId("presence-spatial-inspector-arrangement")).toContainText("overflow 1");

  await page.getByRole("button", { name: "Save local" }).click();
  const saved = await page.evaluate((key) => window.localStorage.getItem(key), MOBSTAR_DRAFT_KEY);
  expect(saved).toBeTruthy();
  const envelope = JSON.parse(saved ?? "null") as SavedSpatialEnvelope;
  expect(envelope.room.contentBindings?.map((binding) => binding.mediaRefs[0])).toEqual(["mobstar-media-poster", "presence-sample-audio"]);
  expect(envelope.room.contentBindings?.map((binding) => binding.order)).toEqual([0, 1]);
  expect(envelope.room.placements.some((placement) => placement.id.startsWith("binding-"))).toBe(false);
  expect(envelope.room.actions.some((action) => action.kind === "enquire" && action.href === "https://example.com/framed-work")).toBe(true);
  expect(envelope.room.actions.some((action) => action.kind === "listen" && action.href === "https://example.com/listen")).toBe(true);
  expect(JSON.stringify(envelope)).not.toMatch(/\.(?:glb|gltf)(?:["?#]|$)/i);
  expect(Buffer.byteLength(JSON.stringify(envelope), "utf8")).toBeLessThan(100 * 1024);
  const canvas = page.getByTestId("presence-spatial-three-renderer").locator("canvas");
  await expect(canvas).toHaveAttribute("data-component-keys", /presence\.piece-plane@1\.0\.0/);

  await page.setViewportSize({ width: 390, height: 844 });
  const fallback = page.getByTestId("presence-spatial-semantic-fallback");
  await expect(fallback).toHaveAttribute("data-fallback-reason", "mobile");
  await expect(fallback.getByRole("link", { name: "Enquire about framed work" })).toHaveAttribute("href", "https://example.com/framed-work");
  await expect(fallback.getByRole("link", { name: "Listen to sample" })).toHaveAttribute("href", "https://example.com/listen");
  await page.screenshot({ path: screenshotPath(testInfo, "16-host-targeted-content-binding.png"), fullPage: true });
});

test("spherical gallery host binding saves spherical arrangement and fallback actions", async ({ page }, testInfo) => {
  await openArranger(page);
  await expectThreeRenderer(page);
  await page.getByRole("button", { name: "Create Mobstar" }).click();
  await page.getByTestId("presence-spatial-add-option-presence-display-spherical-gallery").click();
  await expect(page.getByTestId("presence-spatial-inspector-selected-component")).toHaveText("presence.spherical-gallery@1.0.0");
  await expect(page.getByLabel("Arrangement")).toHaveValue("spherical");

  const bindings = [
    { media: "mobstar-media-a", action: "open-link", label: "Open first spherical work", href: "https://example.com/spherical/first" },
    { media: "presence-sample-video", action: "watch", label: "Watch spherical video", href: "https://example.com/spherical/video" },
    { media: "presence-sample-audio", action: "listen", label: "Listen spherical audio", href: "https://example.com/spherical/audio" },
  ];
  for (const binding of bindings) {
    await page.getByLabel("Binding media").selectOption(binding.media);
    await page.getByLabel("Arrangement").selectOption("spherical");
    await page.getByLabel("Overflow policy").selectOption("overflow-list");
    await page.getByLabel("Binding action").selectOption(binding.action);
    await page.getByLabel("Action label").fill(binding.label);
    await page.getByLabel("HTTPS link").fill(binding.href);
    await page.getByRole("button", { name: "Bind content to host" }).click();
  }

  await expect(page.getByTestId("presence-spatial-bound-pieces")).toContainText("Abstract generated garment placeholder A");
  await expect(page.getByTestId("presence-spatial-bound-pieces")).toContainText("Public-safe video sample reference");
  await expect(page.getByTestId("presence-spatial-bound-pieces")).toContainText("Public-safe audio sample reference");
  await expect(page.getByTestId("presence-spatial-binding-overflow")).toContainText("3/3 visible, 0 overflow");
  await expect(page.getByTestId("presence-spatial-inspector-arrangement")).toContainText("spherical");

  await page.getByRole("button", { name: "Save local" }).click();
  const saved = await page.evaluate((key) => window.localStorage.getItem(key), MOBSTAR_DRAFT_KEY);
  expect(saved).toBeTruthy();
  const envelope = JSON.parse(saved ?? "null") as SavedSpatialEnvelope;
  const sphericalGallery = envelope.room.placements.find((placement) => placement.componentId === "presence.spherical-gallery");
  expect(sphericalGallery?.contentArrangement?.kind).toBe("spherical");
  expect(sphericalGallery?.contentArrangement?.capacity).toBeGreaterThanOrEqual(40);
  expect(envelope.room.contentBindings?.map((binding) => binding.mediaRefs[0])).toEqual([
    "mobstar-media-a",
    "presence-sample-video",
    "presence-sample-audio",
  ]);
  expect(envelope.room.placements.some((placement) => placement.id.startsWith("binding-"))).toBe(false);
  expect(envelope.room.actions.some((action) => action.kind === "watch" && action.href === "https://example.com/spherical/video")).toBe(true);
  expect(envelope.room.actions.some((action) => action.kind === "listen" && action.href === "https://example.com/spherical/audio")).toBe(true);
  expect(JSON.stringify(envelope)).not.toMatch(/\.(?:glb|gltf)(?:["?#]|$)/i);
  expect(Buffer.byteLength(JSON.stringify(envelope), "utf8")).toBeLessThan(100 * 1024);

  const canvas = page.getByTestId("presence-spatial-three-renderer").locator("canvas");
  await expect(canvas).toHaveAttribute("data-component-keys", /presence\.piece-plane@1\.0\.0/);
  await page.setViewportSize({ width: 390, height: 844 });
  const fallback = page.getByTestId("presence-spatial-semantic-fallback");
  await expect(fallback).toHaveAttribute("data-fallback-reason", "mobile");
  await expect(fallback.getByRole("link", { name: "Watch spherical video" })).toHaveAttribute("href", "https://example.com/spherical/video");
  await expect(fallback.getByRole("link", { name: "Listen spherical audio" })).toHaveAttribute("href", "https://example.com/spherical/audio");
  await page.screenshot({ path: screenshotPath(testInfo, "17-spherical-gallery-binding-retrofit.png"), fullPage: true });
});

test("piece library creates owner-like pieces and binds them into hosts", async ({ page }, testInfo) => {
  await openArranger(page);
  await expectThreeRenderer(page);
  await page.getByRole("button", { name: "Create Mobstar" }).click();
  const library = page.getByTestId("presence-spatial-piece-library");
  await expect(library).toContainText("Library image work");
  await expect(library).toContainText("Library audio sample");

  await page.getByRole("button", { name: "+ Frame / poster surface", exact: true }).click();
  await expect(page.getByTestId("presence-spatial-piece-host-support")).toContainText("image");

  await library.getByLabel("Piece title").fill("Piece Library Framed Proof");
  await library.getByLabel("Piece type").selectOption("image");
  await library.getByLabel("Piece caption").fill("Operator-created framed proof piece.");
  await library.getByLabel("Piece media").selectOption("mobstar-media-a");
  await library.getByLabel("Piece action kind").selectOption("open-link");
  await library.getByLabel("Piece action label").fill("Open framed library proof");
  await library.getByLabel("Piece HTTPS link").fill("http://example.com/unsafe-piece");
  await library.getByRole("button", { name: "Create internal piece" }).click();
  await expect(page.getByTestId("presence-spatial-diagnostics")).toContainText("Piece actions require a credential-free HTTPS URL.");
  await expect(page.getByTestId("presence-spatial-bound-pieces")).not.toContainText("Piece Library Framed Proof");

  await library.getByLabel("Piece HTTPS link").fill("https://example.com/piece-library-frame");
  await library.getByRole("button", { name: "Create internal piece" }).click();
  await expect(library.getByTestId("presence-spatial-piece-library-list")).toContainText("Piece Library Framed Proof");
  await page.getByRole("button", { name: "Bind selected library piece" }).click();
  await expect(page.getByTestId("presence-spatial-bound-pieces")).toContainText("Piece Library Framed Proof");
  await expect(page.getByTestId("presence-spatial-binding-fallback")).toContainText("Piece Library Framed Proof");

  await page.getByTestId("presence-spatial-add-option-presence-object-listening-station").click();
  await expect(page.getByTestId("presence-spatial-piece-host-support")).toContainText("audio");
  await library.getByLabel("Piece title").fill("Piece Library Audio Proof");
  await library.getByLabel("Piece type").selectOption("audio");
  await library.getByLabel("Piece caption").fill("Audio fallback card; playback not claimed.");
  await library.getByLabel("Piece media").selectOption("presence-sample-audio");
  await library.getByLabel("Piece action kind").selectOption("listen");
  await library.getByLabel("Piece action label").fill("Listen library audio proof");
  await library.getByLabel("Piece HTTPS link").fill("https://example.com/piece-library-audio");
  await library.getByRole("button", { name: "Create internal piece" }).click();
  await page.getByRole("button", { name: "Bind selected library piece" }).click();
  await expect(page.getByTestId("presence-spatial-bound-pieces")).toContainText("Piece Library Audio Proof");

  await page.getByTestId("presence-spatial-add-option-presence-display-spherical-gallery").click();
  await expect(page.getByLabel("Arrangement")).toHaveValue("spherical");
  await expect(page.getByTestId("presence-spatial-piece-host-support")).toContainText("video");
  await library.getByLabel("Piece title").fill("Piece Library Video Proof");
  await library.getByLabel("Piece type").selectOption("video");
  await library.getByLabel("Piece caption").fill("Video fallback card; playback not claimed.");
  await library.getByLabel("Piece media").selectOption("presence-sample-video");
  await library.getByLabel("Piece action kind").selectOption("watch");
  await library.getByLabel("Piece action label").fill("Watch library video proof");
  await library.getByLabel("Piece HTTPS link").fill("https://example.com/piece-library-video");
  await library.getByRole("button", { name: "Create internal piece" }).click();
  await page.getByRole("button", { name: "Bind selected library piece" }).click();
  await expect(page.getByTestId("presence-spatial-bound-pieces")).toContainText("Piece Library Video Proof");
  await expect(page.getByTestId("presence-spatial-binding-overflow")).toContainText("1/1 visible");

  await page.getByRole("button", { name: "Save local" }).click();
  const saved = await page.evaluate((key) => window.localStorage.getItem(key), MOBSTAR_DRAFT_KEY);
  expect(saved).toBeTruthy();
  const envelope = JSON.parse(saved ?? "null") as SavedSpatialEnvelope;
  expect(envelope.room.pieceLibrary?.some((piece) => piece.label === "Piece Library Framed Proof")).toBe(true);
  expect(envelope.room.pieceLibrary?.some((piece) => piece.pieceType === "audio" && piece.mediaRefs[0] === "presence-sample-audio")).toBe(true);
  expect(envelope.room.contentBindings?.some((binding) => binding.pieceType === "video" && binding.mediaRefs[0] === "presence-sample-video")).toBe(true);
  expect(envelope.room.contentBindings?.every((binding) => binding.pieceRef.startsWith("piece-library:"))).toBe(true);
  expect(envelope.room.actions.some((action) => action.kind === "watch" && action.href === "https://example.com/piece-library-video")).toBe(true);
  expect(JSON.stringify(envelope)).not.toMatch(/data:/i);
  expect(JSON.stringify(envelope)).not.toMatch(/\.(?:blend|glb|gltf)(?:["?#]|$)/i);
  expect(Buffer.byteLength(JSON.stringify(envelope), "utf8")).toBeLessThan(100 * 1024);

  await page.getByRole("button", { name: "Reload saved" }).click();
  await expect(page.getByTestId("presence-spatial-piece-library-list")).toContainText("Piece Library Framed Proof");
  await expect(page.getByTestId("presence-spatial-inspector-content-bindings")).toContainText("3 bindings");

  await page.setViewportSize({ width: 390, height: 844 });
  const fallback = page.getByTestId("presence-spatial-semantic-fallback");
  await expect(fallback).toHaveAttribute("data-fallback-reason", "mobile");
  await expect(fallback.getByRole("link", { name: "Open framed library proof" })).toHaveAttribute("href", "https://example.com/piece-library-frame");
  await expect(fallback.getByRole("link", { name: "Listen library audio proof" })).toHaveAttribute("href", "https://example.com/piece-library-audio");
  await expect(fallback.getByRole("link", { name: "Watch library video proof" })).toHaveAttribute("href", "https://example.com/piece-library-video");
  await expect(fallback).toContainText("Piece type: audio.");
  await expect(fallback).toContainText("Piece type: video.");
  await page.screenshot({ path: screenshotPath(testInfo, "18-internal-piece-library-binding.png"), fullPage: true });
});

test("garment rack host binding repairs fashion pieces and adjacent matrix cases", async ({ page }, testInfo) => {
  await openArranger(page);
  await expectThreeRenderer(page);
  await page.getByRole("button", { name: "Create Mobstar" }).click();
  const library = page.getByTestId("presence-spatial-piece-library");

  await page.getByTestId("presence-spatial-add-option-presence-object-suspended-rack").click();
  await expect(page.getByTestId("presence-spatial-inspector-selected-component")).toHaveText("presence.suspended-rack@1.0.0");
  await expect(page.getByTestId("presence-spatial-piece-host-support")).toContainText("garment");
  await expect(page.getByTestId("presence-spatial-piece-host-support")).not.toContainText("audio");

  await library.getByLabel("Piece title").fill("Garment Rack Binding Proof");
  await library.getByLabel("Piece type").selectOption("garment");
  await library.getByLabel("Piece caption").fill("Garment content bound to a rack anchor.");
  await library.getByLabel("Piece media").selectOption("mobstar-media-a");
  await library.getByLabel("Piece action kind").selectOption("open-link");
  await library.getByLabel("Piece action label").fill("Open garment rack proof");
  await library.getByLabel("Piece HTTPS link").fill("https://example.com/garment-rack-proof");
  await library.getByRole("button", { name: "Create internal piece" }).click();
  await expect(library.getByTestId("presence-spatial-piece-library-list")).toContainText("Garment Rack Binding Proof");
  await page.getByRole("button", { name: "Bind selected library piece" }).click();
  await expect(page.getByTestId("presence-spatial-bound-pieces")).toContainText("Garment Rack Binding Proof");
  await expect(page.getByTestId("presence-spatial-binding-fallback")).toContainText("Garment Rack Binding Proof");

  await page.getByTestId("presence-spatial-add-option-presence-object-archive-wall").click();
  await expect(page.getByTestId("presence-spatial-piece-host-support")).not.toContainText("garment");
  await page.getByRole("button", { name: "Bind selected library piece" }).click();
  await expect(page.getByTestId("presence-spatial-diagnostics")).toContainText("Incompatible host");
  await expect(page.getByTestId("presence-spatial-diagnostics")).toContainText(/garment pieces|not garment/);
  await expect(page.getByTestId("presence-spatial-bound-pieces")).not.toContainText("Garment Rack Binding Proof");

  await page.getByRole("button", { name: "+ Frame / poster surface", exact: true }).click();
  await expect(page.getByTestId("presence-spatial-piece-host-support")).toContainText("video");
  await library.getByLabel("Piece title").fill("Framed Video Matrix Proof");
  await library.getByLabel("Piece type").selectOption("video");
  await library.getByLabel("Piece caption").fill("Video metadata card; playback not claimed.");
  await library.getByLabel("Piece media").selectOption("presence-sample-video");
  await library.getByLabel("Piece action kind").selectOption("watch");
  await library.getByLabel("Piece action label").fill("Watch framed video proof");
  await library.getByLabel("Piece HTTPS link").fill("https://example.com/framed-video-proof");
  await library.getByRole("button", { name: "Create internal piece" }).click();
  await page.getByRole("button", { name: "Bind selected library piece" }).click();
  await expect(page.getByTestId("presence-spatial-bound-pieces")).toContainText("Framed Video Matrix Proof");

  await page.getByTestId("presence-spatial-add-option-presence-object-listening-station").click();
  await expect(page.getByTestId("presence-spatial-piece-host-support")).toContainText("collection");
  await library.getByLabel("Piece title").fill("Listening Collection Matrix Proof");
  await library.getByLabel("Piece type").selectOption("collection");
  await library.getByLabel("Piece caption").fill("Release or playlist set represented as one bindable collection.");
  await library.getByLabel("Piece media").selectOption("");
  await library.getByLabel("Piece action kind").selectOption("open-link");
  await library.getByLabel("Piece action label").fill("Open listening collection proof");
  await library.getByLabel("Piece HTTPS link").fill("https://example.com/listening-collection-proof");
  await library.getByRole("button", { name: "Create internal piece" }).click();
  await page.getByRole("button", { name: "Bind selected library piece" }).click();
  await expect(page.getByTestId("presence-spatial-bound-pieces")).toContainText("Listening Collection Matrix Proof");

  await page.getByRole("button", { name: "Save local" }).click();
  const saved = await page.evaluate((key) => window.localStorage.getItem(key), MOBSTAR_DRAFT_KEY);
  expect(saved).toBeTruthy();
  const envelope = JSON.parse(saved ?? "null") as SavedSpatialEnvelope;
  expect(envelope.room.contentBindings?.some((binding) => binding.pieceType === "garment" && binding.pieceRef.startsWith("piece-library:"))).toBe(true);
  expect(envelope.room.contentBindings?.some((binding) => binding.pieceType === "video" && binding.mediaRefs[0] === "presence-sample-video")).toBe(true);
  expect(envelope.room.contentBindings?.some((binding) => binding.pieceType === "collection" && binding.mediaRefs.length === 0)).toBe(true);
  expect(envelope.room.placements.some((placement) => placement.id.startsWith("binding-"))).toBe(false);
  expect(envelope.room.actions.some((action) => action.kind === "watch" && action.href === "https://example.com/framed-video-proof")).toBe(true);
  expect(JSON.stringify(envelope)).not.toMatch(/data:/i);
  expect(JSON.stringify(envelope)).not.toMatch(/\.(?:blend|glb|gltf)(?:["?#]|$)/i);
  expect(Buffer.byteLength(JSON.stringify(envelope), "utf8")).toBeLessThan(100 * 1024);

  await page.getByRole("button", { name: "Reload saved" }).click();
  await expect(page.getByTestId("presence-spatial-inspector-content-bindings")).toContainText("3 bindings");
  await page.setViewportSize({ width: 390, height: 844 });
  const fallback = page.getByTestId("presence-spatial-semantic-fallback");
  await expect(fallback).toHaveAttribute("data-fallback-reason", "mobile");
  await expect(fallback).toContainText("Piece type: garment.");
  await expect(fallback).toContainText("Piece type: collection.");
  await expect(fallback.getByRole("link", { name: "Open garment rack proof" })).toHaveAttribute("href", "https://example.com/garment-rack-proof");
  await expect(fallback.getByRole("link", { name: "Watch framed video proof" })).toHaveAttribute("href", "https://example.com/framed-video-proof");
  await expect(fallback.getByRole("link", { name: "Open listening collection proof" })).toHaveAttribute("href", "https://example.com/listening-collection-proof");
  await page.screenshot({ path: screenshotPath(testInfo, "19-garment-rack-binding-repair.png"), fullPage: true });
});

test("desktop Three preview round-trips a fully arranged Mobstar room", async ({ page }, testInfo) => {
  await openArranger(page);
  await expectThreeRenderer(page);
  await page.getByRole("button", { name: "Create Mobstar" }).click();
  await expect(page.getByRole("heading", { name: "Mobstar blank spatial arranger draft" })).toBeVisible();

  await page.getByRole("button", { name: "+ Table" }).click();
  await expect(page.getByText("Display table", { exact: true }).last()).toBeVisible();
  await page.getByLabel("Piece media").selectOption("mobstar-media-a");
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
  await plan.scrollIntoViewIfNeeded();
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
  await expect(page.getByText("6 palette objects")).toBeVisible();

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
  await expect(page.getByText("0 palette objects")).toBeVisible();
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

test("spatial authoring baseline customises, duplicates, deletes and deterministically reloads component references", async ({ page }, testInfo) => {
  await openArranger(page);
  await expectThreeRenderer(page);
  await page.getByRole("button", { name: "Create Mobstar" }).click();

  await expect(page.getByText("Room shell", { exact: true })).toBeVisible();
  await expect(page.getByText("Floor slab", { exact: true })).toBeVisible();
  for (const paletteLabel of [
    "Wall",
    "Divider",
    "Table",
    "Display island",
    "Plinth",
    "Display shelf",
    "Rack",
    "Frame / poster surface",
    "Projection wall",
    "Text / sign card",
    "Product display block",
    "Light fixture",
    "Drape / soft divider",
  ]) {
    await expect(page.getByRole("button", { name: `+ ${paletteLabel}`, exact: true })).toBeVisible();
  }
  await expect(page.getByTestId("presence-spatial-layout-bytes")).toContainText(/B|KB/);
  await expect(page.getByTestId("presence-spatial-eager-bytes")).toContainText(/B|KB/);
  await expect(page.getByTestId("presence-spatial-total-bytes")).toContainText(/B|KB/);
  await expect(page.getByTestId("presence-spatial-palette-tags-presence-display-table")).toContainText("surface-host");
  await expect(page.getByTestId("presence-spatial-palette-tags-presence-framed-media")).toContainText("media-capable");
  await expect(page.getByTestId("presence-spatial-palette-tags-presence-light-fixture")).toContainText("proxy-only");
  await page.screenshot({ path: screenshotPath(testInfo, "04-authoring-baseline-before.png"), fullPage: true });

  for (const component of [
    "Display island",
    "Display shelf",
    "Rack",
    "Projection wall",
    "Light fixture",
    "Drape / soft divider",
  ]) {
    await page.getByRole("button", { name: `+ ${component}`, exact: true }).click();
  }
  await page.getByRole("button", { name: "+ Frame / poster surface", exact: true }).click();
  const originalFrameId = await page.getByTestId("presence-spatial-selected-id").innerText();
  await page.getByLabel("Material slot").selectOption("poster-decal");
  await page.getByLabel("Material preset").selectOption("poster-archive");
  await page.getByRole("button", { name: "Apply material preset" }).click();
  await expect(page.getByText(/Applied Archive poster/)).toBeVisible();

  await page.getByLabel("Skin preset").selectOption("presence-authoring-contrast-skin");
  await page.getByRole("button", { name: "Apply skin preset" }).click();
  await page.getByLabel("Direct surface media").selectOption("mobstar-media-a");
  await page.getByRole("button", { name: "Apply media layer" }).click();
  await page.getByLabel("Action label").fill("Visit Mobstar");
  await page.getByLabel("HTTPS link").fill("http://example.com/mobstar");
  await page.getByRole("button", { name: "Assign link action" }).click();
  await expect(page.getByTestId("presence-spatial-diagnostics")).toContainText("Invalid action URL");
  await expect(page.getByTestId("presence-spatial-diagnostics")).toContainText("Only credential-free HTTPS links are supported.");
  await expect(page.getByTestId("presence-spatial-selected-id")).toHaveText(originalFrameId);
  await page.getByLabel("HTTPS link").fill("https://example.com/mobstar");
  await page.getByRole("button", { name: "Assign link action" }).click();
  const inspector = page.getByTestId("presence-spatial-layout-inspector");
  await expect(inspector).toContainText("Readable state, not raw JSON");
  await expect(page.getByTestId("presence-spatial-inspector-layout-size")).toContainText(/B|KB/);
  await expect(page.getByTestId("presence-spatial-inspector-component-refs")).toContainText("presence.framed-media@1.0.0");
  await expect(page.getByTestId("presence-spatial-inspector-selected-id")).toHaveText(originalFrameId);
  await expect(page.getByTestId("presence-spatial-inspector-selected-component")).toHaveText("presence.framed-media@1.0.0");
  await expect(page.getByTestId("presence-spatial-inspector-material-overrides")).toContainText("poster-decal: poster-archive");
  await expect(page.getByTestId("presence-spatial-inspector-media-skin")).toContainText("media mobstar-media-a / skin presence-authoring-contrast-skin");
  await expect(page.getByTestId("presence-spatial-inspector-action-refs")).toContainText("open-link-arranger-framed-media:open-link");
  await expect(page.getByTestId("presence-spatial-inspector-fallback")).toContainText("Abstract generated garment placeholder A");
  await expect(page.getByTestId("presence-spatial-inspector-glb-status")).toHaveText("proxy-only");

  await page.getByRole("button", { name: "Duplicate object" }).click();
  const duplicateFrameId = await page.getByTestId("presence-spatial-selected-id").innerText();
  expect(duplicateFrameId).not.toBe(originalFrameId);
  await expect(page.getByTestId("presence-spatial-object-count")).toHaveText("8 palette objects");
  await page.getByRole("button", { name: "Move right" }).click();
  await page.getByRole("button", { name: "Delete object" }).click();
  await expect(page.getByTestId("presence-spatial-object-count")).toHaveText("7 palette objects");

  await page.getByRole("button", { name: "Save local" }).click();
  const saved = await page.evaluate((key) => window.localStorage.getItem(key), MOBSTAR_DRAFT_KEY);
  expect(saved).toBeTruthy();
  const envelope = JSON.parse(saved ?? "null") as SavedSpatialEnvelope;
  const frame = envelope.room.placements.find((placement) => placement.id === originalFrameId);
  expect(frame?.componentId).toBe("presence.framed-media");
  expect(frame?.materialSlotOverrides["poster-decal"]).toBe("poster-archive");
  expect(frame?.skinRef).toBe("presence-authoring-contrast-skin");
  expect(frame?.mediaRef).toBe("mobstar-media-a");
  const linkAction = envelope.room.actions.find((action) => action.kind === "open-link" && action.label === "Visit Mobstar");
  expect(linkAction?.href).toBe("https://example.com/mobstar");
  expect(frame?.actionRefs).toContain(linkAction?.id);
  expect(envelope.room.semanticFallback.find((item) => item.placementId === originalFrameId)?.actionRefs).toContain(linkAction?.id);
  for (const componentId of [
    "presence.rounded-island",
    "presence.display-shelf",
    "presence.retail-rack",
    "presence.projection-wall",
    "presence.light-fixture",
    "presence.drape-divider",
  ]) {
    expect(envelope.room.placements.some((placement) => placement.componentId === componentId)).toBe(true);
  }

  await page.getByRole("button", { name: "Reload saved" }).click();
  await expect(page.getByText(/Reloaded the local generation saved/)).toBeVisible();
  await page.getByRole("radio", { name: "Saved" }).check();
  const savedCanvas = page.getByTestId("presence-spatial-three-renderer").locator("canvas");
  await expect(savedCanvas).toHaveAttribute("data-room-fingerprint", envelope.roomFingerprint);
  await expect(savedCanvas).toHaveAttribute("data-component-keys", /presence\.framed-media@1\.0\.0/);
  await page.screenshot({ path: screenshotPath(testInfo, "05-authoring-baseline-after.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  const fallback = page.getByTestId("presence-spatial-semantic-fallback");
  await expect(fallback).toHaveAttribute("data-fallback-reason", "mobile");
  await expect(fallback.getByRole("link", { name: "Visit Mobstar" })).toHaveAttribute("href", "https://example.com/mobstar");
  await page.screenshot({ path: screenshotPath(testInfo, "06-authoring-baseline-mobile.png"), fullPage: true });
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

test("Draco GLB proof lazy-loads real geometry through the component reference model", async ({ page }) => {
  const requestedUrls: string[] = [];
  page.on("request", (request) => requestedUrls.push(request.url()));
  await openArranger(page);
  await page.getByTestId("presence-spatial-load-draco-proof").click();
  await expect(page.getByRole("heading", { name: "Draco GLB display-island proof" })).toBeVisible();
  await expectThreeRenderer(page);
  const canvas = page.getByTestId("presence-spatial-three-renderer").locator("canvas");
  await expect(canvas).toHaveAttribute("data-component-keys", /presence\.candidate-display-island@1\.0\.0/);
  await expect(canvas).toHaveAttribute("data-glb-render-requested-count", "1");
  await expect(canvas).toHaveAttribute("data-glb-render-loaded-count", "1", { timeout: 30_000 });
  await expect(canvas).toHaveAttribute("data-glb-render-failed-count", "0");
  expect(requestedUrls.some((url) => url.includes("candidate.table.old-church-modeling-interior-sce-ffd7-017.glb"))).toBe(true);
  expect(requestedUrls.some((url) => url.includes("/presence-spatial/draco/gltf/"))).toBe(true);
  await page.getByTestId("presence-spatial-action-inspect-draco-display-island").click();
  await expect(page.getByTestId("presence-spatial-inspection-card")).toContainText("Optimized candidate display-island GLB proof");
});

test("failed Draco GLB load keeps the proxy Three room and semantic fallback usable", async ({ page }) => {
  await page.route("**/presence-spatial/candidates/components/candidate.table.old-church-modeling-interior-sce-ffd7-017.glb", (route) => route.abort("failed"));
  await openArranger(page);
  await page.getByTestId("presence-spatial-load-draco-proof").click();
  await expectThreeRenderer(page);
  const canvas = page.getByTestId("presence-spatial-three-renderer").locator("canvas");
  await expect(canvas).toHaveAttribute("data-glb-render-requested-count", "1");
  await expect(canvas).toHaveAttribute("data-glb-render-failed-count", "1", { timeout: 30_000 });
  await expect(canvas).toHaveAttribute("data-rendered-item-count", /^[1-9][0-9]*$/);
  await page.getByTestId("presence-spatial-action-inspect-draco-display-island").click();
  await expect(page.getByTestId("presence-spatial-inspection-card")).toContainText("Optimized candidate display-island GLB proof");
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
