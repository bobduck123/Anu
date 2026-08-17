import test from "node:test";
import assert from "node:assert/strict";
import { SpatialComponentCache } from "./assetCache.ts";
import { compileSpatialRoom } from "./compile.ts";
import { MOBSTAR_SPATIAL_ROOM_FIXTURE } from "./fixtures/mobstar.ts";
import type { SpatialRenderItem } from "./model.ts";
import {
  createSpatialGeometryTemplate,
  getSpatialGeometryTemplate,
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

  assert.equal(cache.delete(rackPieceA), true);
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
