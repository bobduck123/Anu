import test from "node:test";
import assert from "node:assert/strict";
import { SpatialComponentCache } from "./assetCache.ts";
import { compileSpatialRoom, stableFingerprint, stableStringify } from "./compile.ts";
import { BBB_PROJECTION_WALL_FIXTURE } from "./fixtures/bbbProjectionWall.ts";
import { MOBSTAR_SPATIAL_ROOM_FIXTURE } from "./fixtures/mobstar.ts";
import { SPATIAL_MATERIAL_SLOTS } from "./materials.ts";

test("the material contract exposes exactly nine stable slots", () => {
  assert.deepEqual(SPATIAL_MATERIAL_SLOTS, [
    "wall", "floor", "tabletop", "rack-metal", "fabric", "paper", "projection", "poster-decal", "logo-accent",
  ]);
});

test("compilation is deterministic and produces a sorted renderer-neutral plan", () => {
  const first = compileSpatialRoom(MOBSTAR_SPATIAL_ROOM_FIXTURE);
  const second = compileSpatialRoom(MOBSTAR_SPATIAL_ROOM_FIXTURE);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (!first.ok || !second.ok) return;
  assert.equal(first.plan.fingerprint, second.plan.fingerprint);
  assert.deepEqual(first.plan, second.plan);
  assert.deepEqual(first.plan.componentKeys, [...first.plan.componentKeys].sort());
  assert.deepEqual(first.plan.items.map((item) => item.placementId), [
    "room-shell", "floor", "archive-wall", "campaign-wall", "secondary-divider", "merch-table", "retail-plinth",
    "retail-rack", "rack-piece-a", "rack-piece-b", "archive-poster", "campaign-projection", "merch-piece", "brand-mark-piece",
  ]);
  assert.deepEqual(first.plan.assets, MOBSTAR_SPATIAL_ROOM_FIXTURE.assets);
  assert.notEqual(first.plan.assets, MOBSTAR_SPATIAL_ROOM_FIXTURE.assets);
  assert.equal(first.plan.items.find((item) => item.placementId === "brand-mark-piece")?.primaryMaterialSlot, "logo-accent");
  assert.equal(first.plan.items.find((item) => item.placementId === "archive-wall")?.primaryMaterialSlot, "wall");
  assert.ok(first.plan.budgets.layoutJsonBytes < 100 * 1024);
});

test("BBB compiles through the reusable projection-wall component", () => {
  const result = compileSpatialRoom(BBB_PROJECTION_WALL_FIXTURE);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(result.plan.componentKeys.includes("presence.projection-wall@1.0.0"));
  assert.equal(result.plan.items.filter((item) => item.category === "piece").length, 3);
  assert.ok(result.plan.items.every((item) => item.geometry.kind === "primitive"));
});

test("stable serialization ignores object key insertion order", () => {
  const left = stableStringify({ b: 2, a: { d: 4, c: 3 } });
  const right = stableStringify({ a: { c: 3, d: 4 }, b: 2 });
  assert.equal(left, right);
  assert.equal(stableFingerprint(left), stableFingerprint(right));
  assert.equal(stableStringify({ b: undefined, a: 1 }), "{\"a\":1}");
});

test("fingerprints cover the complete validated canonical room, including unused assets", () => {
  const baseline = compileSpatialRoom(MOBSTAR_SPATIAL_ROOM_FIXTURE);
  const changed = structuredClone(MOBSTAR_SPATIAL_ROOM_FIXTURE);
  changed.assets[0].attribution = "Changed canonical attribution";
  const changedResult = compileSpatialRoom(changed);
  assert.equal(baseline.ok, true);
  assert.equal(changedResult.ok, true);
  if (baseline.ok && changedResult.ok) assert.notEqual(baseline.plan.fingerprint, changedResult.plan.fingerprint);
});

test("component cache shares concurrent loads and isolates component versions", async () => {
  const cache = new SpatialComponentCache();
  let calls = 0;
  const ref = { componentId: "presence.retail-rack", version: "1.0.0" };
  const load = () => {
    calls += 1;
    return Promise.resolve({ resource: "rack" });
  };
  const [left, right] = await Promise.all([cache.getOrLoad(ref, load), cache.getOrLoad(ref, load)]);
  assert.equal(calls, 1);
  assert.equal(left, right);
  assert.equal(cache.peek(ref), left);
  await cache.getOrLoad({ ...ref, version: "2.0.0" }, load);
  assert.equal(calls, 2);
});
