import test from "node:test";
import assert from "node:assert/strict";

import {
  bindArrangerPieceToHost,
  createArrangerPieceLibraryItem,
  defaultArrangementKindForHost,
  listArrangerContentBindings,
  setArrangerPieceGarmentArtwork,
} from "./arranger.ts";
import { compileSpatialRoom } from "./compile.ts";
import { requireSpatialComponent, spatialComponentEntries } from "./registry.ts";
import { validateSpatialRoomDefinition } from "./validate.ts";
import { MOBSTAR_SPATIAL_ROOM_FIXTURE } from "./fixtures/mobstar.ts";
import { SPATIAL_ARRANGEMENT_KINDS, SPATIAL_GARMENT_DEFAULT_ASPECT } from "./model.ts";
import type {
  SpatialGarmentArticleType,
  SpatialPlacement,
  SpatialRenderItem,
  SpatialRoomDefinition,
} from "./model.ts";

const ARTICLES: readonly SpatialGarmentArticleType[] = ["shirt", "pant", "shoe", "generic"];

function placementFor(componentId: string): SpatialPlacement {
  const definition = requireSpatialComponent({ componentId, version: "1.0.0" });
  return {
    id: `probe-${componentId}`,
    order: 0,
    componentId: definition.componentId,
    version: definition.version,
    transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    anchor: { kind: "floor" },
    materialSlotOverrides: {},
    actionRefs: [],
    visible: true,
    semanticLabel: componentId,
  };
}

/** Recursively asserts every number reachable from a value is finite. */
function assertAllFinite(value: unknown, path: string): void {
  if (typeof value === "number") {
    assert.ok(Number.isFinite(value), `${path} must be finite, got ${value}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertAllFinite(entry, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      assertAllFinite(entry, `${path}.${key}`);
    }
  }
}

// --- A/B/C: rack-row reachability and host defaulting ---

test("every implemented arrangement kind is offered to operators", () => {
  // Rendered QA found a hand-written option list missing rack-row. The UI now
  // renders this constant, so a new kind cannot be silently unreachable.
  assert.ok(SPATIAL_ARRANGEMENT_KINDS.includes("rack-row"));
  assert.equal(new Set(SPATIAL_ARRANGEMENT_KINDS).size, SPATIAL_ARRANGEMENT_KINDS.length);
  for (const kind of ["grid", "row", "wall-grid", "spherical", "rack-row"] as const) {
    assert.ok(SPATIAL_ARRANGEMENT_KINDS.includes(kind), `${kind} must be offered`);
  }
});

test("the authoring UI renders the arrangement list and derives its default from the host", async () => {
  const source = await import("node:fs/promises")
    .then((fs) => fs.readFile("components/presence-spatial/SpatialObjectArranger.tsx", "utf8"));

  assert.ok(source.includes("SPATIAL_ARRANGEMENT_KINDS.map"), "the select must render the shared list");
  assert.ok(source.includes("defaultArrangementKindForHost(selectedPlacement)"), "the default must come from the host");
  // The regression that shipped: a hard-coded wall-grid default for every host.
  assert.ok(
    !/useState<SpatialArrangementKind>\("wall-grid"\)/.test(source),
    "the arrangement default must not be hard-coded to wall-grid",
  );
});

test("rack-compatible hosts default to rack-row and other hosts do not", () => {
  assert.equal(defaultArrangementKindForHost(placementFor("presence.suspended-rack")), "rack-row");
  assert.equal(defaultArrangementKindForHost(placementFor("presence.retail-rack")), "rack-row");
  assert.equal(defaultArrangementKindForHost(placementFor("presence.spherical-gallery")), "spherical");
  assert.equal(defaultArrangementKindForHost(placementFor("presence.archive-wall")), "wall-grid");

  // No non-rack component may claim the rack default.
  for (const definition of spatialComponentEntries()) {
    const kind = defaultArrangementKindForHost(placementFor(definition.componentId));
    if (kind !== "rack-row") continue;
    assert.ok(
      definition.anchors.some((anchor) => anchor.kind === "rack" && anchor.accepts.includes("piece")),
      `${definition.componentId} defaults to rack-row without a rack anchor`,
    );
  }
});

function seedRack(articles: readonly SpatialGarmentArticleType[]): { room: SpatialRoomDefinition; hostId: string } {
  let room: SpatialRoomDefinition = MOBSTAR_SPATIAL_ROOM_FIXTURE;
  const host = room.placements.find((placement) => {
    const definition = requireSpatialComponent(placement);
    return definition.anchors.some((anchor) => anchor.kind === "rack" && anchor.accepts.includes("piece"));
  });
  assert.ok(host, "fixture must contain a rack host");
  const hostId = host.id;
  const media = room.media.find((item) => item.kind === "image" || item.kind === "poster");

  for (const [index, article] of articles.entries()) {
    const created = createArrangerPieceLibraryItem(room, {
      pieceType: "garment",
      label: `Look ${String(index + 1).padStart(2, "0")} ${article}`,
    });
    assert.equal(created.ok, true, JSON.stringify(created.issues));
    if (!created.ok) break;
    room = created.room;
    const piece = room.pieceLibrary?.[room.pieceLibrary.length - 1];
    assert.ok(piece);

    // Leave the last piece without artwork so the missing-artwork path is covered.
    const artwork = setArrangerPieceGarmentArtwork(room, piece.id, {
      garmentArticleType: article,
      ...(media && index < articles.length - 1
        ? article === "shoe" ? { displayImageRef: media.id } : { frontImageRef: media.id, backImageRef: media.id }
        : {}),
    });
    assert.equal(artwork.ok, true, JSON.stringify(artwork.issues));
    if (!artwork.ok) break;
    room = artwork.room;

    const bound = bindArrangerPieceToHost(room, hostId, {
      pieceId: piece.id,
      // Exactly what the fixed UI now passes.
      arrangementKind: defaultArrangementKindForHost(room.placements.find((p) => p.id === hostId)!),
    });
    assert.equal(bound.ok, true, JSON.stringify(bound.issues));
    if (!bound.ok) break;
    room = bound.room;
  }
  return { room, hostId };
}

test("binding a garment to a rack saves rack-row and reload preserves it", () => {
  const { room, hostId } = seedRack(["shirt", "pant"]);
  const host = room.placements.find((placement) => placement.id === hostId);
  assert.equal(host?.contentArrangement?.kind, "rack-row", "saved layout must record rack-row");

  const reloaded = JSON.parse(JSON.stringify(room)) as SpatialRoomDefinition;
  assert.equal(
    reloaded.placements.find((placement) => placement.id === hostId)?.contentArrangement?.kind,
    "rack-row",
    "reload must preserve rack-row",
  );
  assert.equal(validateSpatialRoomDefinition(reloaded).ok, true);

  // Slot order, binding order and fallback order stay aligned under rack-row.
  const compiled = compileSpatialRoom(reloaded);
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;
  const arrangement = compiled.plan.contentBindingArrangements.find((entry) => entry.hostPlacementId === hostId);
  assert.ok(arrangement);
  assert.equal(arrangement.kind, "rack-row");
  assert.deepEqual(
    arrangement.slots.map((slot) => slot.bindingId),
    listArrangerContentBindings(reloaded, hostId).map((binding) => binding.id),
  );
});

// --- D: pant canvas-loss guards ---

test("every article carrier template produces finite, positive geometry", async () => {
  const { createSpatialGeometryTemplate } = await import("../../../components/presence-spatial/threeGeometryCache.ts");
  const definition = requireSpatialComponent({ componentId: "presence.garment-hanger", version: "1.0.0" });

  for (const article of ARTICLES) {
    const item: SpatialRenderItem = {
      placementId: `probe-${article}`,
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
      semanticLabel: article,
      garment: { articleType: article, aspect: SPATIAL_GARMENT_DEFAULT_ASPECT[article], missingArtwork: true },
    };

    const template = createSpatialGeometryTemplate(item);
    assert.ok(template.parts.length > 0, `${article} must produce parts`);

    for (const [index, part] of template.parts.entries()) {
      assertAllFinite(part.position, `${article}.parts[${index}].position`);
      if (part.rotation) assertAllFinite(part.rotation, `${article}.parts[${index}].rotation`);
      if (part.scale) assertAllFinite(part.scale, `${article}.parts[${index}].scale`);

      // Every vertex must be finite: a single NaN poisons the whole buffer and
      // can take the WebGL context down rather than throwing.
      const position = part.geometry.getAttribute("position");
      assert.ok(position, `${article}.parts[${index}] must have a position attribute`);
      const array = position.array as ArrayLike<number>;
      assert.ok(array.length > 0, `${article}.parts[${index}] must have vertices`);
      for (let cursor = 0; cursor < array.length; cursor += 1) {
        assert.ok(Number.isFinite(array[cursor]), `${article}.parts[${index}].position[${cursor}] is not finite`);
      }

      part.geometry.computeBoundingSphere();
      const sphere = part.geometry.boundingSphere;
      assert.ok(sphere, `${article}.parts[${index}] must have a bounding sphere`);
      // A NaN bounding sphere is the classic silent WebGL killer: three culls
      // against it every frame and the renderer never recovers.
      assert.ok(Number.isFinite(sphere.radius), `${article}.parts[${index}] bounding sphere radius is not finite`);
      assert.ok(sphere.radius > 0, `${article}.parts[${index}] bounding sphere must be positive`);
      assertAllFinite([sphere.center.x, sphere.center.y, sphere.center.z], `${article}.parts[${index}].boundingSphere.center`);
    }
  }
});

test("a pant bound to a rack compiles without any non-finite transform", () => {
  const { room, hostId } = seedRack(["pant"]);
  const compiled = compileSpatialRoom(room);
  assert.equal(compiled.ok, true, compiled.ok ? "" : JSON.stringify(compiled.issues));
  if (!compiled.ok) return;
  const derived = compiled.plan.items.filter((item) => item.placementId.startsWith(`binding-${hostId}-`));
  assert.equal(derived.length, 1);
  for (const item of derived) {
    assertAllFinite(item.transform, `${item.placementId}.transform`);
    assert.equal(item.garment?.articleType, "pant");
  }
});

test("a mixed shirt/pant/shoe/generic rack compiles without any non-finite transform", () => {
  const { room, hostId } = seedRack(ARTICLES);
  const compiled = compileSpatialRoom(room);
  assert.equal(compiled.ok, true, compiled.ok ? "" : JSON.stringify(compiled.issues));
  if (!compiled.ok) return;

  const derived = compiled.plan.items.filter((item) => item.placementId.startsWith(`binding-${hostId}-`));
  assert.equal(derived.length, ARTICLES.length);
  for (const item of derived) {
    assertAllFinite(item.transform, `${item.placementId}.transform`);
    // Scale must never be zero or negative: a zero scale collapses the matrix
    // and a negative one flips winding.
    for (const axis of item.transform.scale) assert.ok(axis > 0, `${item.placementId} scale must be positive`);
  }
  assertAllFinite(compiled.plan.contentBindingArrangements, "contentBindingArrangements");

  // The last piece was seeded without artwork; that must still be reported.
  assert.ok(derived.some((item) => item.garment?.missingArtwork === true));
});

test("a shared cache serves every article of one component instead of colliding", async () => {
  // This is the pant canvas-loss defect, headless.
  //
  // Every garment article shares `presence.garment-hanger@1.0.0`, but the
  // geometry signature includes the article. The cache was keyed on the
  // component ref alone, so binding a pant after a shirt returned the shirt's
  // template, failed the signature check and threw inside scene construction.
  // The renderer caught that, reported a runtime failure and unmounted, so the
  // canvas disappeared with no console error. Order matters, so both directions
  // are exercised.
  const { getSpatialGeometryTemplate, spatialGeometryCacheRef } = await import(
    "../../../components/presence-spatial/threeGeometryCache.ts"
  );
  const { SpatialComponentCache } = await import("./assetCache.ts");
  const definition = requireSpatialComponent({ componentId: "presence.garment-hanger", version: "1.0.0" });

  const itemFor = (article: SpatialGarmentArticleType): SpatialRenderItem => ({
    placementId: `probe-${article}`,
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
    semanticLabel: article,
    garment: { articleType: article, aspect: SPATIAL_GARMENT_DEFAULT_ASPECT[article], missingArtwork: true },
  });

  for (const order of [ARTICLES, [...ARTICLES].reverse()]) {
    const cache = new SpatialComponentCache();
    const widths = new Map<SpatialGarmentArticleType, number>();

    for (const article of order) {
      // Twice, so a cache hit is exercised as well as a cache miss.
      for (const pass of [0, 1]) {
        const template = getSpatialGeometryTemplate(itemFor(article), cache);
        const artwork = template.parts.find((part) => part.alphaArtwork);
        assert.ok(artwork, `${article} must produce an artwork plane on pass ${pass}`);
        artwork.geometry.computeBoundingBox();
        const box = artwork.geometry.boundingBox;
        assert.ok(box);
        const width = box.max.x - box.min.x;
        const seen = widths.get(article);
        if (seen === undefined) widths.set(article, width);
        else assert.equal(width, seen, `${article} must be stable across cache hits`);
      }
    }

    // Each article keeps its own geometry rather than inheriting a neighbour's.
    assert.notEqual(widths.get("pant"), widths.get("shirt"), "a pant must not reuse shirt geometry");
    assert.notEqual(widths.get("shoe"), widths.get("shirt"), "a shoe must not reuse shirt geometry");
    assert.equal(cache.size, new Set(order).size, "one cache slot per article variant");
  }

  // Distinct articles must occupy distinct cache slots.
  const keys = new Set(ARTICLES.map((article) => {
    const ref = spatialGeometryCacheRef(itemFor(article));
    return `${ref.componentId}@${ref.version}`;
  }));
  assert.equal(keys.size, ARTICLES.length, "each article needs its own cache key");
});
