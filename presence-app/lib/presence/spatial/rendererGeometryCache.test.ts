import test from "node:test";
import assert from "node:assert/strict";
import { SpatialComponentCache } from "./assetCache.ts";
import { compileSpatialRoom } from "./compile.ts";
import { DRACO_DISPLAY_ISLAND_PROOF_FIXTURE } from "./fixtures/dracoDisplayIslandProof.ts";
import { MOBSTAR_SPATIAL_ROOM_FIXTURE } from "./fixtures/mobstar.ts";
import type { SpatialRenderItem } from "./model.ts";
import { spatialGlbLoaderPlan } from "./renderGeometry.ts";
import {
  createSpatialGeometryTemplate,
  getSpatialGeometryTemplate,
  spatialGeometryCacheRef,
} from "../../../components/presence-spatial/threeGeometryCache.ts";

const result = compileSpatialRoom(MOBSTAR_SPATIAL_ROOM_FIXTURE);
if (!result.ok) throw new Error("Mobstar fixture must compile for renderer cache tests.");
const rackPieceA = result.plan.items.find((item) => item.placementId === "rack-piece-a");
const rackPieceB = result.plan.items.find((item) => item.placementId === "rack-piece-b");
if (!rackPieceA || !rackPieceB) throw new Error("Mobstar rack Pieces are missing.");

test("repeated component refs share one cached Three geometry template", () => {
  const cache = new SpatialComponentCache();
  let factoryCalls = 0;
  const factory = (item: SpatialRenderItem) => {
    factoryCalls += 1;
    return createSpatialGeometryTemplate(item);
  };

  const first = getSpatialGeometryTemplate(rackPieceA, cache, factory);
  const second = getSpatialGeometryTemplate(rackPieceB, cache, factory);

  assert.equal(factoryCalls, 1);
  assert.equal(first, second);
  assert.equal(first.parts[0].geometry, second.parts[0].geometry);
  assert.equal(first.source, "procedural-primitive");
  assert.ok(first.parts.every((part) => !("material" in part) && !("texture" in part)));
});

test("cache eviction owns shared geometry disposal", () => {
  const cache = new SpatialComponentCache();
  const template = getSpatialGeometryTemplate(rackPieceA, cache);
  const uniqueGeometries = new Set(template.parts.map((part) => part.geometry));
  let disposeEvents = 0;
  for (const geometry of uniqueGeometries) geometry.addEventListener("dispose", () => { disposeEvents += 1; });

  // Geometry is cached per variant, so eviction must address the variant slot:
  // two articles of one component are different geometry, not one shared entry.
  assert.equal(cache.delete(spatialGeometryCacheRef(rackPieceA)), true);
  assert.equal(disposeEvents, uniqueGeometries.size);
});

test("future asset geometry remains an explicitly labelled cached bounds fallback", () => {
  const futureAssetItem: SpatialRenderItem = {
    ...rackPieceA,
    componentId: "presence.future-asset",
    componentKey: "presence.future-asset@1.0.0",
    geometry: { kind: "asset", assetId: "future-shape-only-glb" },
  };
  const template = getSpatialGeometryTemplate(futureAssetItem, new SpatialComponentCache());
  assert.equal(template.source, "cached-asset-bounds-fallback");
  assert.equal(template.parts.length, 1);
});

test("Draco GLB render geometry keeps a procedural proxy for authoring and fallback", () => {
  const compiled = compileSpatialRoom(DRACO_DISPLAY_ISLAND_PROOF_FIXTURE);
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;
  const item = compiled.plan.items.find((candidate) => candidate.placementId === "draco-display-island");
  assert.ok(item);
  assert.equal(item.geometry.kind, "primitive");
  assert.equal(item.geometry.kind === "primitive" ? item.geometry.primitive : "", "product-block");
  assert.equal(item.renderGeometry?.kind, "glb");
  assert.equal(item.renderGeometry?.compression, "draco");
  assert.match(item.renderGeometry?.url ?? "", /^\/presence-spatial\/candidates\/components\/.+\.glb$/);
  assert.doesNotMatch(item.renderGeometry?.url ?? "", /(?:^|\/)(?:source|raw)(?:\/|$)|\.gltf$/i);
  const template = createSpatialGeometryTemplate(item);
  assert.equal(template.source, "procedural-primitive");
  assert.ok(template.parts.length > 0);
  assert.ok(compiled.plan.semanticFallback.some((row) => row.placementId === item.placementId));
});

test("Draco GLB render geometry chooses the decoder path and records payload impact", () => {
  const compiled = compileSpatialRoom(DRACO_DISPLAY_ISLAND_PROOF_FIXTURE);
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;
  const item = compiled.plan.items.find((candidate) => candidate.placementId === "draco-display-island");
  assert.equal(item?.renderGeometry?.kind, "glb");
  if (item?.renderGeometry?.kind !== "glb") return;
  const plan = spatialGlbLoaderPlan(item.renderGeometry);
  assert.equal(plan.useDraco, true);
  assert.equal(plan.decoderPath, "/presence-spatial/draco/gltf/");
  assert.equal(plan.url, "/presence-spatial/candidates/components/candidate.table.old-church-modeling-interior-sce-ffd7-017.glb");
  assert.equal(compiled.plan.budgets.eagerCompressedAssetBytes, 0);
  assert.equal(compiled.plan.budgets.lazyDecoderBytes, 250_876);
  assert.equal(compiled.plan.budgets.totalCompressedAssetBytes, 258_852);
});
