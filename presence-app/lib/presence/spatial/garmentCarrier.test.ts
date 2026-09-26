import test from "node:test";
import assert from "node:assert/strict";

import { arrangeSpatialContentBindings } from "./arrangements.ts";
import {
  arrangerRackSlotState,
  bindArrangerPieceToHost,
  createArrangerPieceLibraryItem,
  defaultArrangementKindForHost,
  listArrangerContentBindings,
  moveArrangerContentBinding,
  removeArrangerContentBinding,
  setArrangerPieceGarmentArtwork,
} from "./arranger.ts";
import { compileSpatialRoom } from "./compile.ts";
import { requireSpatialComponent } from "./registry.ts";
import { validateSpatialRoomDefinition, SPATIAL_LAYOUT_JSON_BUDGET_BYTES } from "./validate.ts";
import { MOBSTAR_SPATIAL_ROOM_FIXTURE } from "./fixtures/mobstar.ts";
import { SPATIAL_GARMENT_DEFAULT_ASPECT } from "./model.ts";
import type {
  SpatialContentBinding,
  SpatialDimensions,
  SpatialGarmentArticleType,
  SpatialRenderItem,
  SpatialRoomDefinition,
} from "./model.ts";

const RACK: SpatialDimensions = { width: 8.4, height: 4, depth: 1.8 };

/** Builds the real geometry template for one garment article. */
async function garmentTemplate(
  articleType: SpatialGarmentArticleType,
  overrides: Partial<NonNullable<SpatialRenderItem["garment"]>> = {},
) {
  const { createSpatialGeometryTemplate } = await import("../../../components/presence-spatial/threeGeometryCache.ts");
  const definition = requireSpatialComponent({ componentId: "presence.garment-hanger", version: "1.0.0" });
  const item: SpatialRenderItem = {
    placementId: `garment-${articleType}`,
    componentId: definition.componentId,
    version: definition.version,
    componentKey: `${definition.componentId}@${definition.version}`,
    category: definition.category,
    geometry: definition.geometry,
    dimensions: definition.dimensions,
    transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    materials: [],
    primaryMaterialSlot: "fabric",
    actions: [],
    visible: true,
    semanticLabel: `${articleType} carrier`,
    garment: {
      articleType,
      aspect: SPATIAL_GARMENT_DEFAULT_ASPECT[articleType],
      missingArtwork: true,
      ...overrides,
    },
  };
  return createSpatialGeometryTemplate(item);
}

/** Bounding size of an artwork plane, from its own geometry. */
function planeSize(part: { geometry: { boundingBox?: unknown; computeBoundingBox: () => void } }) {
  const geometry = part.geometry as unknown as {
    computeBoundingBox: () => void;
    boundingBox: { max: { x: number; y: number }; min: { x: number; y: number } } | null;
  };
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) throw new Error("plane has no bounding box");
  return { width: box.max.x - box.min.x, height: box.max.y - box.min.y };
}

/** Strips comments so source assertions cannot match their own explanatory prose. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function garmentBindings(count: number, options: { artwork?: boolean } = {}): SpatialContentBinding[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `g${String(index + 1).padStart(2, "0")}`,
    hostPlacementId: "rack-1",
    pieceRef: `piece-library:garment-${index + 1}` as const,
    pieceType: "garment" as const,
    label: `Look ${String(index + 1).padStart(2, "0")}`,
    caption: `Synthetic look ${index + 1}`,
    mediaRefs: [],
    actionRefs: [],
    order: index,
    arrangementRole: index === 0 ? ("primary" as const) : ("supporting" as const),
    garmentArticleType: "shirt" as const,
    ...(options.artwork ? { frontImageRef: `front-${index + 1}`, backImageRef: `back-${index + 1}` } : {}),
  }));
}

function arrangeRack(count: number, capacity = 12) {
  return arrangeSpatialContentBindings({
    hostPlacementId: "rack-1",
    arrangement: { kind: "rack-row", overflowPolicy: "paginate", capacity, seed: "qa" },
    bindings: garmentBindings(count),
    hostDimensions: RACK,
    anchorKind: "rack",
  });
}

// --- Carrier geometry: no imposed silhouette, separate artwork layers ---

test("the garment carrier no longer imposes a hard-coded shirt silhouette", async () => {
  const source = await import("node:fs/promises")
    .then((fs) => fs.readFile("components/presence-spatial/threeGeometryCache.ts", "utf8"));
  const hangerFactory = source.slice(source.indexOf("function garmentHangerParts("));
  const body = stripComments(hangerFactory.slice(0, hangerFactory.indexOf("\n}\n")));

  // The previous implementation traced an 8-point shirt outline. Artwork alpha
  // now defines the silhouette, so no shape tracing may remain.
  assert.ok(!body.includes("THREE.Shape"), "garment carrier must not build a silhouette shape");
  assert.ok(!body.includes("lineTo"), "garment carrier must not trace a garment outline");
  assert.ok(body.includes("PlaneGeometry"), "artwork layers must be plain rectangles");
});

test("the carrier exposes an invisible carrier part plus separate front and back artwork layers", async () => {
  const template = await garmentTemplate("shirt");
  const carriers = template.parts.filter((part) => part.carrier);
  const artwork = template.parts.filter((part) => part.alphaArtwork);

  assert.equal(carriers.length, 1, "exactly one invisible carrier part");
  assert.equal(artwork.length, 2, "front and back artwork layers");
  assert.deepEqual(artwork.map((part) => part.mediaRole).sort(), ["back", "front"]);
  // Artwork planes are plain rectangles: alpha defines the silhouette.
  for (const part of artwork) {
    assert.equal(part.geometry.type, "PlaneGeometry");
    assert.equal(part.carrier, undefined, "an artwork layer is never the carrier");
  }
  assert.notEqual(carriers[0]?.geometry.type, "PlaneGeometry");
});

test("carrier visibility and artwork visibility use independent materials", async () => {
  const renderer = await import("node:fs/promises")
    .then((fs) => fs.readFile("components/presence-spatial/ThreeSpatialRenderer.tsx", "utf8"));

  // The material cache key must separate carrier from artwork, or hiding the
  // carrier would hide the print with it.
  assert.ok(renderer.includes('templatePart.carrier ? "carrier" : "visible"'));
  assert.ok(renderer.includes("applyCarrierVisibility"));
  assert.ok(renderer.includes("applyArtworkAlpha"));
  // Carrier is invisible by default and only ghosted under the debug toggle;
  // it never writes depth, so it stays present for selection without occluding.
  assert.ok(renderer.includes("material.opacity = debug ? SPATIAL_CARRIER_DEBUG_OPACITY : 0"));
  assert.ok(renderer.includes("material.colorWrite = debug"));
  assert.ok(renderer.includes("material.depthWrite = false"));
  assert.ok(renderer.includes("material.alphaTest = SPATIAL_ARTWORK_ALPHA_TEST"));
  // The debug toggle must rebuild the scene, or toggling would do nothing.
  assert.ok(renderer.includes('debugCarriers ? "debug" : "clean"'));
});

// --- rack-row arrangement ---

test("rack-row hangs garments upright below the rail rather than laying them flat", () => {
  const result = arrangeRack(6);
  const visible = result.slots.filter((slot) => slot.visible);
  assert.equal(visible.length, 6);
  for (const slot of visible) {
    // Upright: no -PI/2 tilt anywhere.
    assert.deepEqual(slot.transform.rotation, [0, 0, 0]);
    // Below the rail, which sits near the top of the host volume.
    assert.ok(slot.transform.position[1] < RACK.height / 2, "garments hang below the rail top");
    assert.ok(slot.transform.position[1] > -RACK.height / 2, "garments stay inside the host volume");
  }
});

test("rack-row pitch derives from host width so a part-full rail still spreads", () => {
  const six = arrangeRack(6).slots.filter((slot) => slot.visible).map((slot) => slot.transform.position[0]);
  const twelve = arrangeRack(12).slots.filter((slot) => slot.visible).map((slot) => slot.transform.position[0]);
  const spanOf = (xs: number[]) => Math.max(...xs) - Math.min(...xs);

  // Both counts fill the same usable rail width; the old fixed 0.72 m pitch
  // bunched six garments into the middle of an 8.4 m rack.
  assert.ok(spanOf(six) > RACK.width * 0.7, `six garments should spread across the rail, got ${spanOf(six)}`);
  assert.ok(Math.abs(spanOf(six) - spanOf(twelve)) < 0.001, "pitch adapts to count, span stays constant");
});

test("rack-row is deterministic and independent of input ordering", () => {
  const forward = arrangeRack(8);
  const reversed = arrangeSpatialContentBindings({
    hostPlacementId: "rack-1",
    arrangement: { kind: "rack-row", overflowPolicy: "paginate", capacity: 12, seed: "qa" },
    bindings: [...garmentBindings(8)].reverse(),
    hostDimensions: RACK,
    anchorKind: "rack",
  });
  assert.deepEqual(JSON.parse(JSON.stringify(reversed)), JSON.parse(JSON.stringify(forward)));
});

test("rack-row overflow keeps every garment reachable in fallback", () => {
  const result = arrangeRack(18, 12);
  assert.equal(result.slots.filter((slot) => slot.visible).length, 12);
  assert.equal(result.overflow.overflowCount, 6);
  assert.equal(result.fallbackRows.length, 18, "overflowed garments still appear in fallback");
  assert.ok(result.fallbackRows.some((row) => row.description?.includes("Overflow item")));
});

test("slot order equals binding order equals fallback order", () => {
  const result = arrangeRack(10);
  const slotOrder = result.slots.map((slot) => slot.bindingId);
  const fallbackOrder = result.fallbackRows.map((row) => row.placementId.replace("binding-rack-1-", ""));
  assert.deepEqual(fallbackOrder, slotOrder);
  assert.deepEqual(slotOrder, garmentBindings(10).map((binding) => binding.id));
});

// --- Arranger slot targeting ---

function rackRoom(): { room: SpatialRoomDefinition; hostId: string } {
  const room = MOBSTAR_SPATIAL_ROOM_FIXTURE;
  const host = room.placements.find((placement) => placement.componentId === "presence.retail-rack")
    ?? room.placements.find((placement) => {
      const definition = requireSpatialComponent(placement);
      return definition.anchors.some((anchor) => anchor.kind === "rack" && anchor.accepts.includes("piece"));
    });
  assert.ok(host, "fixture must contain a rack host");
  return { room, hostId: host.id };
}

function seedGarments(count: number): { room: SpatialRoomDefinition; hostId: string } {
  let { room, hostId } = rackRoom();
  for (let index = 0; index < count; index += 1) {
    const created = createArrangerPieceLibraryItem(room, {
      pieceType: "garment",
      label: `Look ${String(index + 1).padStart(2, "0")}`,
    });
    assert.equal(created.ok, true, JSON.stringify(created.issues));
    if (!created.ok) return { room, hostId };
    room = created.room;
    const piece = room.pieceLibrary?.[room.pieceLibrary.length - 1];
    assert.ok(piece);
    const bound = bindArrangerPieceToHost(room, hostId, {
      pieceId: piece.id,
      arrangementKind: defaultArrangementKindForHost(room.placements.find((p) => p.id === hostId)!),
    });
    assert.equal(bound.ok, true, JSON.stringify(bound.issues));
    if (!bound.ok) return { room, hostId };
    room = bound.room;
  }
  return { room, hostId };
}

test("a rack host defaults to the rack-row arrangement", () => {
  const { room, hostId } = rackRoom();
  const host = room.placements.find((placement) => placement.id === hostId);
  assert.ok(host);
  assert.equal(defaultArrangementKindForHost(host), "rack-row");
});

test("rack slot state reports capacity, occupancy and open slots", () => {
  const { room, hostId } = seedGarments(3);
  const state = arrangerRackSlotState(room, hostId);
  assert.ok(state);
  assert.equal(state.occupied, 3);
  assert.equal(state.open, state.capacity - 3);
  assert.equal(state.overflow, 0);
  assert.equal(state.slots.filter((slot) => slot.bindingId).length, 3);
  // Garments created without artwork must be flagged, not silently rendered blank.
  assert.ok(state.slots.filter((slot) => slot.missingArtwork).length >= 1);
});

test("moving a garment left and right reorders bindings deterministically", () => {
  const { room, hostId } = seedGarments(4);
  const before = listArrangerContentBindings(room, hostId).map((binding) => binding.label);

  const movedRight = moveArrangerContentBinding(room, hostId, listArrangerContentBindings(room, hostId)[0].id, 1);
  assert.equal(movedRight.ok, true, JSON.stringify(movedRight.issues));
  if (!movedRight.ok) return;
  const afterRight = listArrangerContentBindings(movedRight.room, hostId).map((binding) => binding.label);
  assert.deepEqual(afterRight, [before[1], before[0], before[2], before[3]]);

  const movedBack = moveArrangerContentBinding(movedRight.room, hostId, listArrangerContentBindings(movedRight.room, hostId)[1].id, -1);
  assert.equal(movedBack.ok, true);
  if (!movedBack.ok) return;
  assert.deepEqual(listArrangerContentBindings(movedBack.room, hostId).map((b) => b.label), before);

  // Order stays dense from zero so slot/fallback order cannot drift.
  assert.deepEqual(listArrangerContentBindings(movedBack.room, hostId).map((b) => b.order), [0, 1, 2, 3]);
});

test("moving past the end of the rack is refused with a readable reason", () => {
  const { room, hostId } = seedGarments(2);
  const first = listArrangerContentBindings(room, hostId)[0];
  const result = moveArrangerContentBinding(room, hostId, first.id, -1);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.issues.some((issue) => issue.message.includes("already at the end of the rack")));
});

test("removing a garment preserves the remaining order", () => {
  const { room, hostId } = seedGarments(4);
  const bindings = listArrangerContentBindings(room, hostId);
  const removed = removeArrangerContentBinding(room, hostId, bindings[1].id);
  assert.equal(removed.ok, true, JSON.stringify(removed.issues));
  if (!removed.ok) return;
  const after = listArrangerContentBindings(removed.room, hostId);
  assert.deepEqual(after.map((b) => b.label), [bindings[0].label, bindings[2].label, bindings[3].label]);
  assert.deepEqual(after.map((b) => b.order), [0, 1, 2]);
});

// --- Compile, validate, payload, fallback ---

test("garment bindings compile through the invisible carrier with a garment channel", () => {
  const { room, hostId } = seedGarments(3);
  const compiled = compileSpatialRoom(room);
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;
  const carriers = compiled.plan.items.filter((item) => (
    item.parentPlacementId === hostId && item.placementId.startsWith(`binding-${hostId}-`)
  ));
  assert.ok(carriers.length >= 3);
  for (const carrier of carriers) {
    assert.equal(carrier.componentId, "presence.garment-hanger");
    assert.ok(carrier.garment, "garment items expose an artwork channel");
    assert.equal(carrier.garment?.articleType, "generic");
    // No artwork was assigned, so this must be reported rather than hidden.
    assert.equal(carrier.garment?.missingArtwork, true);
  }
});

test("saved rooms with garment bindings validate and stay inside the layout budget", () => {
  const { room } = seedGarments(6);
  const validated = validateSpatialRoomDefinition(room);
  assert.equal(validated.ok, true, JSON.stringify(validated.issues, null, 2));
  const bytes = Buffer.byteLength(JSON.stringify(room), "utf8");
  assert.ok(bytes < SPATIAL_LAYOUT_JSON_BUDGET_BYTES, `layout was ${bytes} bytes`);
});

test("saved layouts never store raw model or image payloads", () => {
  const { room } = seedGarments(4);
  const serialised = JSON.stringify(room);
  assert.ok(!/\.glb\b/i.test(serialised), "no GLB path may be stored");
  assert.ok(!/\.gltf\b/i.test(serialised), "no glTF path may be stored");
  assert.ok(!serialised.includes("data:image"), "no inline image payload may be stored");
  assert.ok(!serialised.includes("presence pieces"), "no source folder path may be stored");
  // Derived slot transforms are computed at compile time, never persisted.
  assert.ok(
    !room.placements.some((placement) => placement.id.startsWith("binding-")),
    "derived binding placements must not be persisted into room.placements",
  );
});

test("save and reload preserve rack garment order", () => {
  const { room, hostId } = seedGarments(5);
  const reloaded = JSON.parse(JSON.stringify(room)) as SpatialRoomDefinition;
  assert.deepEqual(
    listArrangerContentBindings(reloaded, hostId).map((binding) => [binding.label, binding.order]),
    listArrangerContentBindings(room, hostId).map((binding) => [binding.label, binding.order]),
  );
  const before = compileSpatialRoom(room);
  const after = compileSpatialRoom(reloaded);
  assert.equal(before.ok && after.ok, true);
  if (!before.ok || !after.ok) return;
  assert.deepEqual(after.plan.semanticFallback, before.plan.semanticFallback);
});

test("semantic fallback preserves garment order and actions", () => {
  const { room, hostId } = seedGarments(4);
  const compiled = compileSpatialRoom(room);
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;
  const bindings = listArrangerContentBindings(room, hostId);
  const rows = compiled.plan.semanticFallback.filter((row) => row.placementId.startsWith(`binding-${hostId}-`));
  assert.equal(rows.length, bindings.length);
  assert.deepEqual(rows.map((row) => row.label), bindings.map((binding) => binding.label));
});

test("garment article types and artwork refs validate only on garment pieces", () => {
  const { room } = seedGarments(1);
  const invalid: SpatialRoomDefinition = {
    ...room,
    contentBindings: (room.contentBindings ?? []).map((binding, index) => (index === 0
      ? { ...binding, pieceType: "audio" as const, garmentArticleType: "shirt" as const }
      : binding)),
  };
  const result = validateSpatialRoomDefinition(invalid);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.issues.some((issue) => issue.code === "garment-article-type"));
});

test("garment artwork refs must resolve to real media", () => {
  const { room } = seedGarments(1);
  const invalid: SpatialRoomDefinition = {
    ...room,
    contentBindings: (room.contentBindings ?? []).map((binding, index) => (index === 0
      ? { ...binding, frontImageRef: "does-not-exist" }
      : binding)),
  };
  const result = validateSpatialRoomDefinition(invalid);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.issues.some((issue) => issue.code === "missing-media"));
});

// --- Article-specific carriers ---

test("shirt and pant carriers use different proportions", async () => {
  const shirt = await garmentTemplate("shirt");
  const pant = await garmentTemplate("pant");
  const shirtArt = planeSize(shirt.parts.find((part) => part.mediaRole === "front")!);
  const pantArt = planeSize(pant.parts.find((part) => part.mediaRole === "front")!);

  // A pant plane is taller and much narrower than a shirt plane.
  assert.ok(pantArt.height > shirtArt.height, `pant ${pantArt.height} should exceed shirt ${shirtArt.height}`);
  assert.ok(pantArt.width < shirtArt.width, `pant ${pantArt.width} should be narrower than shirt ${shirtArt.width}`);
  assert.ok(pantArt.width / pantArt.height < shirtArt.width / shirtArt.height, "pant is proportionally narrower");
});

test("the shoe carrier does not pretend to be a front/back garment", async () => {
  const shoe = await garmentTemplate("shoe");
  const roles = shoe.parts.filter((part) => part.alphaArtwork).map((part) => part.mediaRole).sort();

  // Footwear is shown from display and outer-side, never as a "back print".
  assert.deepEqual(roles, ["display", "outer-side"]);
  assert.ok(!roles.includes("front" as never), "shoe must not claim a front garment plane");
  assert.ok(!roles.includes("back" as never), "shoe must not claim a back garment plane");

  const art = planeSize(shoe.parts.find((part) => part.mediaRole === "display")!);
  assert.ok(art.width > art.height, "a shoe display plane is wider than it is tall");
});

test("the generic carrier keeps Stage A front/back behaviour", async () => {
  const generic = await garmentTemplate("generic");
  const roles = generic.parts.filter((part) => part.alphaArtwork).map((part) => part.mediaRole).sort();
  assert.deepEqual(roles, ["back", "front"]);
  assert.equal(generic.parts.filter((part) => part.carrier).length, 1);
});

test("every article keeps the carrier invisible and separate from artwork", async () => {
  for (const article of ["shirt", "pant", "shoe", "generic"] as const) {
    const template = await garmentTemplate(article);
    const carrier = template.parts.find((part) => part.carrier);
    assert.ok(carrier, `${article} must have a carrier`);
    assert.notEqual(carrier.alphaArtwork, true, `${article} carrier must never be an artwork layer`);
    assert.ok(template.parts.some((part) => part.alphaArtwork), `${article} must have artwork layers`);
    // Hanger hardware stays genuinely visible.
    assert.ok(template.parts.some((part) => part.materialSlot === "rack-metal" && !part.carrier));
  }
});

test("artwork aspect overrides change plane proportions and key the geometry cache", async () => {
  const narrow = await garmentTemplate("shirt", { aspect: 0.4 });
  const wide = await garmentTemplate("shirt", { aspect: 1.8 });
  const narrowArt = planeSize(narrow.parts.find((part) => part.mediaRole === "front")!);
  const wideArt = planeSize(wide.parts.find((part) => part.mediaRole === "front")!);

  assert.ok(wideArt.width > narrowArt.width, "a wider aspect produces a wider plane");
  // Article and aspect must key the cache, or a pant would reuse a shirt template.
  assert.notEqual(narrow.signature, wide.signature);
  assert.notEqual((await garmentTemplate("shirt")).signature, (await garmentTemplate("pant")).signature);
});

test("garment artwork channels resolve per role with honest fallbacks", () => {
  const { room, hostId } = seedGarments(1);
  const media = room.media[0];
  assert.ok(media, "fixture must expose media");
  const withArtwork: SpatialRoomDefinition = {
    ...room,
    contentBindings: (room.contentBindings ?? []).map((binding) => ({
      ...binding,
      garmentArticleType: "pant" as const,
      frontImageRef: media.id,
      artworkAspect: 0.5,
    })),
  };
  const compiled = compileSpatialRoom(withArtwork);
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;
  const carrier = compiled.plan.items.find((item) => item.placementId.startsWith(`binding-${hostId}-`));
  assert.ok(carrier?.garment);
  assert.equal(carrier.garment?.articleType, "pant");
  assert.equal(carrier.garment?.aspect, 0.5);
  assert.equal(carrier.garment?.frontMedia?.id, media.id);
  assert.equal(carrier.garment?.missingArtwork, false, "artwork present must not report missing");
});

test("article-specific artwork refs survive reorder and save/reload", () => {
  const { room, hostId } = seedGarments(3);
  const media = room.media[0];
  assert.ok(media);
  const tagged: SpatialRoomDefinition = {
    ...room,
    contentBindings: (room.contentBindings ?? []).map((binding, index) => ({
      ...binding,
      garmentArticleType: (["shirt", "pant", "shoe"] as const)[index % 3],
      frontImageRef: media.id,
      ...(index % 3 === 2 ? { displayImageRef: media.id } : {}),
    })),
  };
  const first = listArrangerContentBindings(tagged, hostId)[0];
  const moved = moveArrangerContentBinding(tagged, hostId, first.id, 1);
  assert.equal(moved.ok, true, JSON.stringify(moved.issues));
  if (!moved.ok) return;

  // The moved garment keeps its own article and artwork refs.
  const afterMove = listArrangerContentBindings(moved.room, hostId).find((binding) => binding.id === first.id);
  assert.ok(afterMove);
  assert.equal(afterMove.garmentArticleType, first.garmentArticleType);
  assert.equal(afterMove.frontImageRef, media.id);

  const reloaded = JSON.parse(JSON.stringify(moved.room)) as SpatialRoomDefinition;
  assert.deepEqual(
    listArrangerContentBindings(reloaded, hostId).map((b) => [b.id, b.garmentArticleType, b.frontImageRef, b.order]),
    listArrangerContentBindings(moved.room, hostId).map((b) => [b.id, b.garmentArticleType, b.frontImageRef, b.order]),
  );
  assert.equal(validateSpatialRoomDefinition(reloaded).ok, true);
});

test("shoe and aspect fields validate and stay garment-only", () => {
  const { room } = seedGarments(1);
  const media = room.media[0];
  const invalid: SpatialRoomDefinition = {
    ...room,
    contentBindings: (room.contentBindings ?? []).map((binding) => ({
      ...binding,
      pieceType: "text" as const,
      displayImageRef: media?.id,
    })),
  };
  const result = validateSpatialRoomDefinition(invalid);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.issues.some((issue) => issue.code === "garment-artwork-ref"));
});

// --- Artwork assignment mutation (backs the internal UI) ---

test("assigning garment artwork updates the piece and its existing bindings", () => {
  const { room, hostId } = seedGarments(2);
  const media = room.media.find((item) => item.kind === "image" || item.kind === "poster");
  assert.ok(media, "fixture must expose image media");
  const piece = (room.pieceLibrary ?? []).find((item) => item.pieceType === "garment");
  assert.ok(piece);

  const result = setArrangerPieceGarmentArtwork(room, piece.id, {
    garmentArticleType: "pant",
    frontImageRef: media.id,
    artworkAspect: 0.5,
  });
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  if (!result.ok) return;

  const updated = (result.room.pieceLibrary ?? []).find((item) => item.id === piece.id);
  assert.equal(updated?.garmentArticleType, "pant");
  assert.equal(updated?.frontImageRef, media.id);
  assert.equal(updated?.artworkAspect, 0.5);

  // Already-bound garments pick the change up without being rebound.
  const bound = listArrangerContentBindings(result.room, hostId)
    .filter((binding) => binding.pieceRef === `piece-library:${piece.id}`);
  assert.ok(bound.length > 0);
  for (const binding of bound) {
    assert.equal(binding.garmentArticleType, "pant");
    assert.equal(binding.frontImageRef, media.id);
  }
  assert.equal(validateSpatialRoomDefinition(result.room).ok, true);
});

test("artwork assignment refuses unknown media, bad aspect and non-garment pieces", () => {
  const { room } = seedGarments(1);
  const piece = (room.pieceLibrary ?? []).find((item) => item.pieceType === "garment");
  assert.ok(piece);

  const missing = setArrangerPieceGarmentArtwork(room, piece.id, { frontImageRef: "no-such-media" });
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.ok(missing.issues.some((issue) => issue.code === "missing-media"));

  const badAspect = setArrangerPieceGarmentArtwork(room, piece.id, { artworkAspect: 99 });
  assert.equal(badAspect.ok, false);
  if (!badAspect.ok) assert.ok(badAspect.issues.some((issue) => issue.code === "garment-aspect"));

  const nonGarment = (room.pieceLibrary ?? []).find((item) => item.pieceType !== "garment");
  if (nonGarment) {
    const rejected = setArrangerPieceGarmentArtwork(room, nonGarment.id, { frontImageRef: room.media[0]?.id });
    assert.equal(rejected.ok, false);
  }
});

test("clearing an artwork ref removes it rather than storing an empty string", () => {
  const { room } = seedGarments(1);
  const media = room.media.find((item) => item.kind === "image" || item.kind === "poster");
  const piece = (room.pieceLibrary ?? []).find((item) => item.pieceType === "garment");
  assert.ok(media && piece);

  const assigned = setArrangerPieceGarmentArtwork(room, piece.id, { frontImageRef: media.id });
  assert.equal(assigned.ok, true);
  if (!assigned.ok) return;
  const cleared = setArrangerPieceGarmentArtwork(assigned.room, piece.id, { frontImageRef: null });
  assert.equal(cleared.ok, true);
  if (!cleared.ok) return;
  const updated = (cleared.room.pieceLibrary ?? []).find((item) => item.id === piece.id);
  assert.equal("frontImageRef" in (updated ?? {}), false, "a cleared ref is removed, not blanked");
  assert.equal(validateSpatialRoomDefinition(cleared.room).ok, true);
});

test("artwork assignment never stores blobs, source paths or expiring URLs", () => {
  const { room } = seedGarments(2);
  const media = room.media.find((item) => item.kind === "image" || item.kind === "poster");
  const piece = (room.pieceLibrary ?? []).find((item) => item.pieceType === "garment");
  assert.ok(media && piece);
  const result = setArrangerPieceGarmentArtwork(room, piece.id, {
    garmentArticleType: "shoe",
    displayImageRef: media.id,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const serialised = JSON.stringify(result.room);
  assert.ok(!serialised.includes("data:image"));
  assert.ok(!/\.glb\b/i.test(serialised));
  assert.ok(!/\.gltf\b/i.test(serialised));
  assert.ok(!serialised.includes("presence pieces"));
  assert.ok(!serialised.includes("X-Amz-Signature") && !serialised.includes("?token="));
  assert.ok(Buffer.byteLength(serialised, "utf8") < SPATIAL_LAYOUT_JSON_BUDGET_BYTES);
});
