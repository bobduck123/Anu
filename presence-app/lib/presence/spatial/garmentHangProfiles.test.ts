import test from "node:test";
import assert from "node:assert/strict";

import { arrangeSpatialContentBindings } from "./arrangements.ts";
import {
  bindArrangerPieceToHost,
  createArrangerPieceLibraryItem,
  defaultArrangementKindForHost,
  listArrangerContentBindings,
  moveArrangerContentBinding,
} from "./arranger.ts";
import { compileSpatialRoom } from "./compile.ts";
import { requireSpatialComponent } from "./registry.ts";
import { validateSpatialRoomDefinition, SPATIAL_LAYOUT_JSON_BUDGET_BYTES } from "./validate.ts";
import { MOBSTAR_SPATIAL_ROOM_FIXTURE } from "./fixtures/mobstar.ts";
import { SPATIAL_GARMENT_DEFAULT_ASPECT, SPATIAL_GARMENT_HANG_PROFILES } from "./model.ts";
import type {
  SpatialContentBinding,
  SpatialDimensions,
  SpatialGarmentArticleType,
  SpatialRenderItem,
  SpatialRoomDefinition,
} from "./model.ts";

const RACK: SpatialDimensions = { width: 8.4, height: 4, depth: 1.8 };

function bindingsFor(articleType: SpatialGarmentArticleType, count: number): SpatialContentBinding[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `g${String(index + 1).padStart(2, "0")}`,
    hostPlacementId: "rack-1",
    pieceRef: `piece-library:garment-${index + 1}` as const,
    pieceType: "garment" as const,
    label: `Look ${String(index + 1).padStart(2, "0")}`,
    mediaRefs: [],
    actionRefs: [],
    order: index,
    arrangementRole: index === 0 ? ("primary" as const) : ("supporting" as const),
    garmentArticleType: articleType,
  }));
}

function arrangeArticle(articleType: SpatialGarmentArticleType, count = 4, capacity = 12) {
  return arrangeSpatialContentBindings({
    hostPlacementId: "rack-1",
    arrangement: { kind: "rack-row", overflowPolicy: "paginate", capacity, seed: "qa" },
    bindings: bindingsFor(articleType, count),
    hostDimensions: RACK,
    anchorKind: "rack",
  });
}

async function garmentTemplate(articleType: SpatialGarmentArticleType) {
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
    },
  };
  return createSpatialGeometryTemplate(item);
}

function planeSize(part: { geometry: unknown }) {
  const geometry = part.geometry as {
    computeBoundingBox: () => void;
    boundingBox: { max: { x: number; y: number }; min: { x: number; y: number } } | null;
  };
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) throw new Error("plane has no bounding box");
  return { width: box.max.x - box.min.x, height: box.max.y - box.min.y };
}

function seedGarments(count: number): { room: SpatialRoomDefinition; hostId: string } {
  let room: SpatialRoomDefinition = MOBSTAR_SPATIAL_ROOM_FIXTURE;
  const host = room.placements.find((placement) => {
    const definition = requireSpatialComponent(placement);
    return definition.anchors.some((anchor) => anchor.kind === "rack" && anchor.accepts.includes("piece"));
  });
  assert.ok(host, "fixture must contain a rack host");
  const hostId = host.id;
  for (let index = 0; index < count; index += 1) {
    const created = createArrangerPieceLibraryItem(room, {
      pieceType: "garment",
      label: `Look ${String(index + 1).padStart(2, "0")}`,
    });
    assert.equal(created.ok, true, JSON.stringify(created.issues));
    if (!created.ok) break;
    room = created.room;
    const piece = room.pieceLibrary?.[room.pieceLibrary.length - 1];
    assert.ok(piece);
    const bound = bindArrangerPieceToHost(room, hostId, {
      pieceId: piece.id,
      arrangementKind: defaultArrangementKindForHost(room.placements.find((p) => p.id === hostId)!),
    });
    assert.equal(bound.ok, true, JSON.stringify(bound.issues));
    if (!bound.ok) break;
    room = bound.room;
  }
  return { room, hostId };
}

// --- Profiles ---

test("each article declares a distinct rack hang profile", () => {
  const profiles = SPATIAL_GARMENT_HANG_PROFILES;
  assert.deepEqual(Object.keys(profiles).sort(), ["generic", "pant", "shirt", "shoe"]);
  assert.equal(profiles.shirt.hardware, "hook-bar");
  assert.equal(profiles.pant.hardware, "clamp-bar");
  assert.equal(profiles.shoe.hardware, "stand");
  assert.equal(profiles.generic.hardware, "hook-bar");
  // Footwear is a rack-display proxy, so it is inspected close rather than turned outward.
  assert.equal(profiles.shoe.inspectionProfileId, "piece-inspect-near");
  assert.equal(profiles.shirt.inspectionProfileId, "rack-turn-outward");
});

test("a pant no longer hangs from the same rail point as a shirt", () => {
  const shirtY = arrangeArticle("shirt").slots[0].transform.position[1];
  const pantY = arrangeArticle("pant").slots[0].transform.position[1];
  const shoeY = arrangeArticle("shoe").slots[0].transform.position[1];
  const genericY = arrangeArticle("generic").slots[0].transform.position[1];

  assert.ok(pantY < shirtY, `pant ${pantY} must hang lower than shirt ${shirtY}`);
  assert.ok(shoeY < pantY, `shoe ${shoeY} must sit lower than pant ${pantY}`);
  // Generic preserves the prior safe behaviour.
  assert.equal(genericY, shirtY);
});

test("a shoe is presented forward and smaller rather than hung like clothing", () => {
  const shoes = arrangeArticle("shoe", 3);
  const shirts = arrangeArticle("shirt", 3);

  assert.ok(shoes.slots[0].transform.position[2] > 0, "a shoe is offset forward of the rail plane");
  assert.equal(shirts.slots[0].transform.position[2], 0, "hanging garments stay in the rail plane");
  assert.ok(
    shoes.slots[0].transform.scale[0] < shirts.slots[0].transform.scale[0],
    "a shoe presents smaller than a hanging garment",
  );
});

// --- Hardware ---

test("hanger hardware is visible, article-specific and never an artwork layer", async () => {
  const counts = new Set<number>();
  for (const article of ["shirt", "pant", "shoe", "generic"] as const) {
    const template = await garmentTemplate(article);
    const hardware = template.parts.filter((part) => part.materialSlot === "rack-metal");
    assert.ok(hardware.length > 0, `${article} must show hanger hardware`);
    counts.add(hardware.length);
    for (const part of hardware) {
      // Hardware can never impose the garment silhouette.
      assert.notEqual(part.alphaArtwork, true, `${article} hardware must not be an artwork layer`);
      assert.notEqual(part.carrier, true, `${article} hardware must not be the invisible carrier`);
      assert.notEqual(part.geometry.type, "PlaneGeometry", `${article} hardware is solid, not a print plane`);
    }
    assert.ok(template.parts.some((part) => part.alphaArtwork), `${article} keeps its artwork layers`);
  }
  assert.ok(counts.size > 1, "hardware part counts differ between articles");
});

test("hardware sits at or above the artwork top so it cannot cover the print", async () => {
  for (const article of ["shirt", "pant", "generic"] as const) {
    const template = await garmentTemplate(article);
    const artwork = template.parts.find((part) => part.mediaRole === "front");
    assert.ok(artwork);
    const artworkTop = artwork.position[1] + planeSize(artwork).height / 2;
    for (const part of template.parts.filter((candidate) => candidate.materialSlot === "rack-metal")) {
      assert.ok(
        part.position[1] >= artworkTop - 0.001,
        `${article} hardware at ${part.position[1]} must sit at or above artwork top ${artworkTop}`,
      );
    }
  }
});

// --- Compile, reorder, reload ---

test("article hang profiles reach the compiled plan and survive reorder and reload", () => {
  const { room, hostId } = seedGarments(3);
  const tagged: SpatialRoomDefinition = {
    ...room,
    contentBindings: (room.contentBindings ?? []).map((binding, index) => ({
      ...binding,
      garmentArticleType: (["shirt", "pant", "shoe"] as const)[index],
    })),
  };
  const compiled = compileSpatialRoom(tagged);
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;

  const derived = compiled.plan.items.filter((item) => item.placementId.startsWith(`binding-${hostId}-`));
  const byArticle = new Map(derived.map((item) => [item.garment?.articleType, item]));
  const shirtY = byArticle.get("shirt")?.transform.position[1];
  const pantY = byArticle.get("pant")?.transform.position[1];
  const shoeY = byArticle.get("shoe")?.transform.position[1];
  assert.ok(shirtY !== undefined && pantY !== undefined && shoeY !== undefined);
  assert.ok(pantY < shirtY, "compiled pant hangs lower than compiled shirt");
  assert.ok(shoeY < pantY, "compiled shoe sits lowest");

  // Article-specific inspection profiles are applied through existing machinery.
  assert.equal(byArticle.get("shoe")?.interaction?.id, "piece-inspect-near");
  assert.equal(byArticle.get("shirt")?.interaction?.id, "rack-turn-outward");

  const first = listArrangerContentBindings(tagged, hostId)[0];
  const moved = moveArrangerContentBinding(tagged, hostId, first.id, 1);
  assert.equal(moved.ok, true);
  if (!moved.ok) return;
  const afterMove = listArrangerContentBindings(moved.room, hostId).find((binding) => binding.id === first.id);
  assert.equal(afterMove?.garmentArticleType, first.garmentArticleType, "reorder keeps the article type");

  // Presentation is derived from garmentArticleType, so reload reproduces it exactly.
  const reloaded = JSON.parse(JSON.stringify(moved.room)) as SpatialRoomDefinition;
  const before = compileSpatialRoom(moved.room);
  const after = compileSpatialRoom(reloaded);
  assert.equal(before.ok && after.ok, true);
  if (!before.ok || !after.ok) return;
  assert.deepEqual(
    after.plan.items.filter((item) => item.placementId.startsWith("binding-")).map((item) => [item.garment?.articleType, item.transform.position[1]]),
    before.plan.items.filter((item) => item.placementId.startsWith("binding-")).map((item) => [item.garment?.articleType, item.transform.position[1]]),
  );
  assert.equal(validateSpatialRoomDefinition(reloaded).ok, true);
});

test("per-article hang does not disturb slot order, overflow, spacing or payload", () => {
  const bindings = bindingsFor("shirt", 18).map((binding, index) => ({
    ...binding,
    garmentArticleType: (["shirt", "pant", "shoe", "generic"] as const)[index % 4],
  }));
  const result = arrangeSpatialContentBindings({
    hostPlacementId: "rack-1",
    arrangement: { kind: "rack-row", overflowPolicy: "paginate", capacity: 12, seed: "qa" },
    bindings,
    hostDimensions: RACK,
    anchorKind: "rack",
  });

  assert.equal(result.slots.filter((slot) => slot.visible).length, 12);
  assert.equal(result.overflow.overflowCount, 6);
  assert.equal(result.fallbackRows.length, 18, "mixed-article overflow keeps every garment in fallback");
  assert.deepEqual(result.slots.map((slot) => slot.bindingId), bindings.map((binding) => binding.id));
  assert.deepEqual(
    result.fallbackRows.map((row) => row.placementId.replace("binding-rack-1-", "")),
    bindings.map((binding) => binding.id),
  );
  // Horizontal spacing is unaffected by article, so the rail still reads evenly.
  const xs = result.slots.filter((slot) => slot.visible).map((slot) => slot.transform.position[0]);
  assert.ok(Math.max(...xs) - Math.min(...xs) > RACK.width * 0.7);
});

test("mixed-article racks stay inside the layout budget and store no derived transforms", () => {
  const { room } = seedGarments(6);
  const tagged: SpatialRoomDefinition = {
    ...room,
    contentBindings: (room.contentBindings ?? []).map((binding, index) => ({
      ...binding,
      garmentArticleType: (["shirt", "pant", "shoe", "generic"] as const)[index % 4],
    })),
  };
  assert.equal(validateSpatialRoomDefinition(tagged).ok, true);
  const serialised = JSON.stringify(tagged);
  assert.ok(Buffer.byteLength(serialised, "utf8") < SPATIAL_LAYOUT_JSON_BUDGET_BYTES);
  assert.ok(!/\.glb\b/i.test(serialised) && !/\.gltf\b/i.test(serialised));
  assert.ok(!serialised.includes("presence pieces"));
  // Hang profiles are derived from the article, never persisted per piece.
  assert.ok(!serialised.includes("railDrop"));
  assert.ok(!serialised.includes("hardwareY"));
  assert.ok(!tagged.placements.some((placement) => placement.id.startsWith("binding-")));
});
