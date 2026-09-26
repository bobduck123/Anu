import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { inflateSync } from "node:zlib";

import { compileSpatialRoom } from "./compile.ts";
import { deriveSafeSpatialMediaLocators, resolveSpatialMediaSource } from "./rendererAdapter.ts";
import { createSpatialDraftEnvelope } from "./storage.ts";
import { spatialComponentCatalogMetadata } from "./registry.ts";
import { SPATIAL_LAYOUT_JSON_BUDGET_BYTES, validateSpatialRoomDefinition } from "./validate.ts";
import {
  ALPHA_GARMENT_MEDIA_DIRECTORY,
  ALPHA_GARMENT_RACK_FIXTURE,
} from "./fixtures/alphaGarmentRack.ts";
import { listArrangerContentBindings } from "./arranger.ts";

const PUBLIC_ROOT = new URL("../../../public/", import.meta.url);

interface DecodedPng {
  width: number;
  height: number;
  /** RGBA, 4 bytes per pixel. */
  pixels: Buffer;
}

/**
 * Minimal PNG reader for the generated test artwork.
 *
 * Only the shape this project's generator emits is supported — 8-bit RGBA, no
 * interlace, filter type 0 — and each of those properties is asserted rather
 * than assumed, so a future encoder change fails loudly instead of silently
 * decoding to nonsense.
 */
function decodePng(file: URL): DecodedPng {
  const buffer = readFileSync(file);
  assert.deepEqual(
    [...buffer.subarray(0, 8)],
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    "must be a PNG",
  );

  let offset = 8;
  let width = 0;
  let height = 0;
  const idat: Buffer[] = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      assert.equal(data[8], 8, "bit depth must be 8");
      assert.equal(data[9], 6, "colour type must be 6 (RGBA) — the alpha channel is the point");
      assert.equal(data[12], 0, "interlacing is not supported by this reader");
    } else if (type === "IDAT") {
      idat.push(Buffer.from(data));
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    assert.equal(raw[rowStart], 0, `row ${y} must use filter type 0`);
    raw.copy(pixels, y * stride, rowStart + 1, rowStart + 1 + stride);
  }
  return { width, height, pixels };
}

function alphaAt(image: DecodedPng, x: number, y: number): number {
  return image.pixels[(y * image.width + x) * 4 + 3];
}

const ALPHA_ASSETS = ALPHA_GARMENT_RACK_FIXTURE.assets;

// --- the media itself ---

test("alpha garment media are public-safe internal-evidence files that exist with the declared byte size", () => {
  assert.equal(ALPHA_ASSETS.length, 7);
  for (const asset of ALPHA_ASSETS) {
    assert.equal(asset.safety, "public-safe", asset.id);
    assert.ok(asset.locator.startsWith(`public:${ALPHA_GARMENT_MEDIA_DIRECTORY}/`), `${asset.id} must live in the internal-evidence directory`);
    assert.ok(asset.locator.endsWith(".png"), asset.id);
    // No raw model source may masquerade as artwork.
    assert.ok(!/\.(?:glb|gltf)$/i.test(asset.locator), asset.id);
    assert.ok(!asset.locator.includes("presence pieces"), asset.id);
    assert.ok(asset.attribution.toLowerCase().includes("synthetic"), `${asset.id} must declare itself synthetic`);

    const file = new URL(asset.locator.slice("public:".length), PUBLIC_ROOT);
    assert.equal(statSync(file).size, asset.compressedBytes, `${asset.id} declared byte size must match the real file`);
    // Test media must stay small.
    assert.ok(asset.compressedBytes < 32 * 1024, `${asset.id} is larger than the 32 KB test-media ceiling`);
  }
});

test("every alpha garment image really carries a transparent background and an opaque garment", () => {
  for (const asset of ALPHA_ASSETS) {
    const image = decodePng(new URL(asset.locator.slice("public:".length), PUBLIC_ROOT));

    // All four corners sit outside any of these silhouettes.
    for (const [x, y] of [[0, 0], [image.width - 1, 0], [0, image.height - 1], [image.width - 1, image.height - 1]] as const) {
      assert.equal(alphaAt(image, x, y), 0, `${asset.id} corner (${x},${y}) must be fully transparent`);
    }

    let transparent = 0;
    let opaque = 0;
    for (let index = 3; index < image.pixels.length; index += 4) {
      if (image.pixels[index] === 0) transparent += 1;
      else if (image.pixels[index] === 255) opaque += 1;
    }
    const total = image.width * image.height;
    assert.equal(transparent + opaque, total, `${asset.id} must be fully transparent or fully opaque, so alphaTest is unambiguous`);
    assert.ok(opaque > total * 0.15, `${asset.id} must actually draw a garment`);
    // This is the assertion that fails if the artwork is a rectangular card.
    assert.ok(transparent > total * 0.12, `${asset.id} must cut a real silhouette, not fill its rectangle (transparent ${transparent}/${total})`);
  }
});

test("each silhouette is genuinely non-rectangular, not a padded rectangle", () => {
  for (const asset of ALPHA_ASSETS) {
    const image = decodePng(new URL(asset.locator.slice("public:".length), PUBLIC_ROOT));

    // Opaque width per row: a rectangle has one constant width across every row
    // it occupies. A garment does not.
    const widths: number[] = [];
    for (let y = 0; y < image.height; y += 1) {
      let count = 0;
      for (let x = 0; x < image.width; x += 1) if (alphaAt(image, x, y) > 0) count += 1;
      if (count > 0) widths.push(count);
    }
    assert.ok(widths.length > 0, `${asset.id} must draw something`);
    const widest = Math.max(...widths);
    const narrowest = Math.min(...widths);
    assert.ok(
      narrowest < widest * 0.75,
      `${asset.id} outline barely varies (${narrowest}..${widest}) — that reads as a rectangle`,
    );
  }
});

test("the pant silhouette has a real gap between its legs", () => {
  const pant = ALPHA_ASSETS.find((asset) => asset.id === "alpha-pant-front");
  assert.ok(pant);
  const image = decodePng(new URL(pant.locator.slice("public:".length), PUBLIC_ROOT));

  // Near the hem, the centre column must be transparent while both legs are not:
  // an interior hole no rectangular card can produce.
  const y = Math.round(image.height * 0.95);
  assert.equal(alphaAt(image, Math.round(image.width * 0.5), y), 0, "the crotch gap must be open at the hem");
  assert.ok(alphaAt(image, Math.round(image.width * 0.25), y) > 0, "the left leg must be present");
  assert.ok(alphaAt(image, Math.round(image.width * 0.75), y) > 0, "the right leg must be present");
});

test("front and back artwork are visually distinguishable", () => {
  for (const article of ["shirt", "pant", "generic"] as const) {
    const front = ALPHA_ASSETS.find((asset) => asset.id === `alpha-${article}-front`);
    const back = ALPHA_ASSETS.find((asset) => asset.id === `alpha-${article}-back`);
    assert.ok(front && back, article);

    const frontImage = decodePng(new URL(front.locator.slice("public:".length), PUBLIC_ROOT));
    const backImage = decodePng(new URL(back.locator.slice("public:".length), PUBLIC_ROOT));
    assert.equal(frontImage.width, backImage.width, article);

    let differing = 0;
    for (let index = 0; index < frontImage.pixels.length; index += 4) {
      if (frontImage.pixels[index] !== backImage.pixels[index]) differing += 1;
    }
    assert.ok(
      differing > frontImage.width * frontImage.height * 0.02,
      `${article} front and back must carry different marks`,
    );
  }
});

// --- the fixture ---

test("the alpha fixture validates, compiles and hangs six garments on a rack under rack-row", () => {
  assert.equal(validateSpatialRoomDefinition(ALPHA_GARMENT_RACK_FIXTURE).ok, true);
  const compiled = compileSpatialRoom(ALPHA_GARMENT_RACK_FIXTURE);
  assert.equal(compiled.ok, true, compiled.ok ? "" : JSON.stringify(compiled.issues));
  if (!compiled.ok) return;

  const host = ALPHA_GARMENT_RACK_FIXTURE.placements.find((placement) => placement.id === "garment-rack");
  assert.equal(host?.contentArrangement?.kind, "rack-row");

  const garments = compiled.plan.items.filter((item) => item.garment);
  assert.equal(garments.length, 6);
  const articles = new Set(garments.map((item) => item.garment?.articleType));
  for (const article of ["shirt", "pant", "shoe", "generic"] as const) {
    assert.ok(articles.has(article), `the mixed rack must include a ${article}`);
  }

  // Slot order, binding order and fallback order stay aligned.
  const arrangement = compiled.plan.contentBindingArrangements.find((entry) => entry.hostPlacementId === "garment-rack");
  assert.ok(arrangement);
  assert.equal(arrangement.kind, "rack-row");
  assert.deepEqual(
    arrangement.slots.map((slot) => slot.bindingId),
    listArrangerContentBindings(ALPHA_GARMENT_RACK_FIXTURE, "garment-rack").map((binding) => binding.id),
  );
});

test("garment artwork refs resolve to the alpha images through the public-safe media path", () => {
  const locators = deriveSafeSpatialMediaLocators(ALPHA_GARMENT_RACK_FIXTURE.assets);
  const compiled = compileSpatialRoom(ALPHA_GARMENT_RACK_FIXTURE);
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;

  let resolved = 0;
  for (const item of compiled.plan.items) {
    for (const media of [item.garment?.frontMedia, item.garment?.backMedia, item.garment?.displayMedia]) {
      if (!media) continue;
      const source = resolveSpatialMediaSource(media, locators);
      assert.ok(source, `${media.id} must resolve to a real public source`);
      assert.ok(source.startsWith(`/${ALPHA_GARMENT_MEDIA_DIRECTORY}/`), `${media.id} resolved outside the evidence directory: ${source}`);
      assert.ok(source.endsWith(".png"));
      resolved += 1;
    }
  }
  // Four front, three back (Look 02 is front-only), one shoe display.
  assert.equal(resolved, 8);
});

test("every artwork channel survives binding, including the shoe display channel", () => {
  const bindings = listArrangerContentBindings(ALPHA_GARMENT_RACK_FIXTURE, "garment-rack");
  const shoe = bindings.find((binding) => binding.garmentArticleType === "shoe");
  assert.ok(shoe, "the fixture must bind a shoe");
  // Binding used to copy only front/back, which silently discarded a shoe's
  // artwork and then reported the shoe as missing artwork.
  assert.equal(shoe.displayImageRef, "alpha-media-shoe-display");

  const compiled = compileSpatialRoom(ALPHA_GARMENT_RACK_FIXTURE);
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;
  const shoeItem = compiled.plan.items.find((item) => item.garment?.articleType === "shoe");
  assert.equal(shoeItem?.garment?.missingArtwork, false, "a shoe with display artwork is not missing artwork");
});

test("the deliberately unassigned garment still reports missing artwork", () => {
  const compiled = compileSpatialRoom(ALPHA_GARMENT_RACK_FIXTURE);
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;

  const missing = compiled.plan.items.filter((item) => item.garment?.missingArtwork === true);
  assert.equal(missing.length, 1, "exactly one garment is deliberately left without artwork");
  assert.match(missing[0].semanticLabel, /No artwork assigned/);

  // Assigning alpha artwork must not have silenced the diagnostic for everyone else.
  const assigned = compiled.plan.items.filter((item) => item.garment && item.garment.missingArtwork === false);
  assert.equal(assigned.length, 5);
});

test("the semantic fallback still carries every garment, in order, with its action", () => {
  const compiled = compileSpatialRoom(ALPHA_GARMENT_RACK_FIXTURE);
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;

  const bindings = listArrangerContentBindings(ALPHA_GARMENT_RACK_FIXTURE, "garment-rack");
  const rows = compiled.plan.semanticFallback;
  for (const binding of bindings) {
    assert.ok(rows.some((row) => row.label === binding.label), `${binding.label} must appear in the fallback`);
  }
  // Fallback order matches binding order.
  const fallbackOrder = bindings.map((binding) => rows.findIndex((row) => row.label === binding.label));
  assert.deepEqual(fallbackOrder, [...fallbackOrder].sort((left, right) => left - right));

  // The one action link survives.
  assert.ok(
    rows.some((row) => row.actionRefs.length > 0 && row.label.includes("Look 01")),
    "the Look 01 action link must reach the fallback",
  );
});

// --- payload safety ---

test("the saved layout stores media refs only, with no blobs, data URLs or model source paths", () => {
  const envelope = createSpatialDraftEnvelope(ALPHA_GARMENT_RACK_FIXTURE, "2026-08-20T00:00:00.000Z");
  const json = JSON.stringify(envelope);

  assert.ok(!json.includes("data:image"), "no inline image payloads");
  assert.ok(!/data:[a-z]+\/[a-z0-9.+-]+;base64/i.test(json), "no data: URLs of any kind");
  assert.ok(!/\.(?:glb|gltf)\b/i.test(json), "no raw model paths");
  assert.ok(!json.toLowerCase().includes("presence pieces"), "no source garment folder path");
  assert.ok(!/[?&](?:sig|signature|token|key)=/i.test(json), "no signed URLs");
  assert.ok(!json.includes("http://"), "no insecure URLs");

  // Media is carried by id, and the id resolves through the room's own asset list.
  assert.ok(json.includes("alpha-media-shirt-front"));
  assert.ok(json.includes(ALPHA_GARMENT_MEDIA_DIRECTORY), "the public path is declared once, on the asset");

  const bytes = Buffer.byteLength(json, "utf8");
  assert.ok(bytes < SPATIAL_LAYOUT_JSON_BUDGET_BYTES, `layout is ${bytes} bytes, over the ${SPATIAL_LAYOUT_JSON_BUDGET_BYTES} budget`);
});

test("save and reload preserves garment artwork, article types and order", () => {
  const reloaded = JSON.parse(JSON.stringify(ALPHA_GARMENT_RACK_FIXTURE));
  assert.equal(validateSpatialRoomDefinition(reloaded).ok, true);

  const before = listArrangerContentBindings(ALPHA_GARMENT_RACK_FIXTURE, "garment-rack");
  const after = listArrangerContentBindings(reloaded, "garment-rack");
  assert.deepEqual(
    after.map((binding) => [binding.label, binding.garmentArticleType, binding.frontImageRef, binding.backImageRef, binding.displayImageRef]),
    before.map((binding) => [binding.label, binding.garmentArticleType, binding.frontImageRef, binding.backImageRef, binding.displayImageRef]),
  );

  const first = compileSpatialRoom(ALPHA_GARMENT_RACK_FIXTURE);
  const second = compileSpatialRoom(reloaded);
  assert.equal(first.ok && second.ok, true);
  if (!first.ok || !second.ok) return;
  assert.deepEqual(second.plan.semanticFallback, first.plan.semanticFallback);
});

test("the alpha evidence fixture admits no component and claims no product truth", () => {
  for (const placement of ALPHA_GARMENT_RACK_FIXTURE.placements) {
    assert.notEqual(
      spatialComponentCatalogMetadata(placement)?.admissionStatus,
      "admitted",
      `${placement.componentId} must remain an internal candidate`,
    );
  }
  const json = JSON.stringify(ALPHA_GARMENT_RACK_FIXTURE).toLowerCase();
  for (const claim of ["sku", "price", "aud$", "in stock", "official", "©"]) {
    assert.ok(!json.includes(claim), `the evidence fixture must not assert product truth (${claim})`);
  }
  for (const asset of ALPHA_GARMENT_RACK_FIXTURE.assets) {
    assert.ok(asset.attribution.includes("not product artwork"), `${asset.id} must disclaim product artwork`);
  }
});

test("the media contain step keeps alpha for artwork surfaces", async () => {
  // A tripwire for the defect this pass fixed: the contain step painted an
  // opaque backing over every media texture, which destroyed the alpha channel
  // before `alphaTest` ever saw it, so no artwork could cut a silhouette.
  const source = await import("node:fs/promises").then((fs) =>
    fs.readFile("components/presence-spatial/ThreeSpatialRenderer.tsx", "utf8"));
  const fillIndex = source.indexOf('context.fillStyle = "#111318"');
  assert.ok(fillIndex > 0, "the opaque backing fill should still exist for non-artwork media");
  assert.ok(
    source.slice(Math.max(0, fillIndex - 600), fillIndex).includes("if (!preserveAlpha) {"),
    "the opaque backing must stay behind the preserveAlpha guard",
  );
});
