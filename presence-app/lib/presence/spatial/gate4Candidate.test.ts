import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { compileSpatialRoom } from "./compile.ts";
import { MOBSTAR_GATE4_SPATIAL_ROOM_FIXTURE } from "./fixtures/mobstarGate4.ts";
import {
  buildSemanticSpatialRows,
  collectSpatialActions,
  spatialInspectionTransform,
} from "./rendererAdapter.ts";
import {
  SPATIAL_COMPONENTS,
  SPATIAL_COMPONENT_CATALOG,
} from "./registry.ts";
import { validateSpatialRoomDefinition } from "./validate.ts";
import {
  createSpatialGeometryTemplate,
} from "../../../components/presence-spatial/threeGeometryCache.ts";

const compiled = compileSpatialRoom(MOBSTAR_GATE4_SPATIAL_ROOM_FIXTURE);
if (!compiled.ok) throw new Error(`Gate 4 candidate fixture failed to compile: ${JSON.stringify(compiled.issues)}`);
const plan = compiled.plan;

test("Gate 4 candidate compiles under strict budgets with data-selected profiles and safe planned media", () => {
  assert.equal(validateSpatialRoomDefinition(MOBSTAR_GATE4_SPATIAL_ROOM_FIXTURE).ok, true);
  assert.equal(plan.lighting.id, "boutique-product-warm");
  assert.equal(plan.fallbackPresentation?.brandMedia?.assetId, "candidate-logo");
  assert.equal(plan.fallbackPresentation?.heroMedia?.assetId, "candidate-campaign");
  assert.ok(plan.budgets.layoutJsonBytes < 100 * 1024);
  assert.ok(plan.budgets.eagerCompressedAssetBytes <= 3 * 1024 * 1024);
  assert.ok(plan.assets.every((asset) => asset.locator.startsWith("public:presence-spatial/mobstar-gate4-candidate/")));
  assert.ok(plan.assets.every((asset) => !/\.(?:glb|gltf)$/i.test(asset.locator)));
  for (const asset of plan.assets) {
    const logicalPath = asset.locator.replace(/^public:/, "");
    const actualBytes = statSync(join(process.cwd(), "public", logicalPath)).size;
    assert.ok(actualBytes <= asset.compressedBytes, `${asset.id} actual bytes stay within its declared budget`);
  }
});

test("candidate catalog remains prototype and not-evaluated while all Gate 3 v1 component keys survive", () => {
  const originalV1Keys = [
    "presence.room-shell@1.0.0",
    "presence.floor-slab@1.0.0",
    "presence.wall-panel@1.0.0",
    "presence.divider-wall@1.0.0",
    "presence.display-table@1.0.0",
    "presence.display-plinth@1.0.0",
    "presence.retail-rack@1.0.0",
    "presence.projection-wall@1.0.0",
    "presence.piece-plane@1.0.0",
  ];
  const keys = new Set(SPATIAL_COMPONENTS.map((component) => `${component.componentId}@${component.version}`));
  for (const key of originalV1Keys) assert.ok(keys.has(key), `${key} remains registered`);

  const candidatePrimitiveKinds = new Set([
    "open-shell", "ribbed-wall", "display-bay", "rounded-island",
    "suspended-rack", "garment-hanger", "framed-media", "projection-grid",
  ]);
  const candidates = SPATIAL_COMPONENTS.filter(
    (component) => (
      component.componentId === "presence.floor-slab" && component.version === "2.0.0"
    ) || (
      component.geometry.kind === "primitive" && candidatePrimitiveKinds.has(component.geometry.primitive)
    ),
  );
  assert.equal(candidates.length, 9);
  for (const candidate of candidates) {
    const metadata = SPATIAL_COMPONENT_CATALOG.find(
      (entry) => entry.componentId === candidate.componentId && entry.version === candidate.version,
    );
    assert.equal(metadata?.creativeStatus, "prototype");
    assert.equal(metadata?.admissionStatus, "not-evaluated");
    assert.equal(candidate.license.sourceKind, "presence-authored");
    assert.equal(candidate.license.internalOnly, true);
  }
});

test("candidate procedural kinds produce inspectable data-driven Three geometry", () => {
  const inspectedKinds = new Set<string>();
  for (const item of plan.items) {
    if (item.geometry.kind !== "primitive" || inspectedKinds.has(item.geometry.primitive)) continue;
    inspectedKinds.add(item.geometry.primitive);
    const template = createSpatialGeometryTemplate(item);
    assert.equal(template.source, "procedural-primitive");
    assert.ok(template.parts.length > 0, item.geometry.primitive);
  }
  for (const required of ["open-shell", "ribbed-wall", "display-bay", "rounded-island", "suspended-rack", "garment-hanger", "framed-media", "projection-grid"]) {
    assert.ok(inspectedKinds.has(required), required);
  }
});

test("rack-context inspection turns only the selected garment outward and returns deterministically", () => {
  const selected = plan.items.find((item) => item.placementId === "garment-signal");
  const neighbour = plan.items.find((item) => item.placementId === "garment-dark");
  const rack = plan.items.find((item) => item.placementId === "architecture-rack");
  const state = plan.states.find((candidate) => candidate.id === "rack");
  assert.ok(selected && neighbour && rack && state);
  const inspected = spatialInspectionTransform(selected, state.cameraPosition);
  assert.deepEqual(spatialInspectionTransform(selected, state.cameraPosition), inspected);
  assert.notDeepEqual(inspected.position, selected.transform.position);
  assert.notDeepEqual(inspected.rotation, selected.transform.rotation);
  assert.deepEqual(spatialInspectionTransform(rack, state.cameraPosition), rack.transform);
  assert.deepEqual(neighbour.transform.position, plan.items.find((item) => item.placementId === "garment-dark")?.transform.position);
  assert.equal(selected.interaction?.preserveParentContext, true);
  assert.equal(selected.interaction?.deterministicReturn, true);
});

test("invalid profile and fallback references fail closed", () => {
  const badLighting = structuredClone(MOBSTAR_GATE4_SPATIAL_ROOM_FIXTURE) as unknown as Record<string, unknown>;
  badLighting.lightingProfileId = "missing-light-rig";
  const lightResult = validateSpatialRoomDefinition(badLighting);
  assert.equal(lightResult.ok, false);
  if (!lightResult.ok) assert.ok(lightResult.issues.some((issue) => issue.path === "lightingProfileId"));

  const badInteraction = structuredClone(MOBSTAR_GATE4_SPATIAL_ROOM_FIXTURE) as unknown as {
    placements: Array<Record<string, unknown>>;
  };
  badInteraction.placements.find((placement) => placement.id === "garment-signal")!.interactionProfileId = "missing-inspection";
  const interactionResult = validateSpatialRoomDefinition(badInteraction);
  assert.equal(interactionResult.ok, false);
  if (!interactionResult.ok) assert.ok(interactionResult.issues.some((issue) => issue.path.includes("interactionProfileId")));

  const badFallback = structuredClone(MOBSTAR_GATE4_SPATIAL_ROOM_FIXTURE) as unknown as {
    fallbackPresentation: Record<string, unknown>;
  };
  badFallback.fallbackPresentation.heroMediaRef = "missing-hero";
  const fallbackResult = validateSpatialRoomDefinition(badFallback);
  assert.equal(fallbackResult.ok, false);
  if (!fallbackResult.ok) assert.ok(fallbackResult.issues.some((issue) => issue.code === "missing-media"));
});

test("candidate semantic fallback covers every Piece and Action", () => {
  const rows = buildSemanticSpatialRows(plan);
  const rowPlacements = new Set(rows.map((row) => row.placementId));
  const actionIds = new Set(rows.flatMap((row) => row.actions.map((action) => action.id)));
  for (const item of plan.items.filter((candidate) => candidate.category === "piece")) {
    assert.ok(rowPlacements.has(item.placementId), item.placementId);
  }
  for (const entry of collectSpatialActions(plan)) assert.ok(actionIds.has(entry.action.id), entry.action.id);
});

test("renderer modules contain no candidate-specific branch token", () => {
  const sources = [
    "components/presence-spatial/ThreeSpatialRenderer.tsx",
    "components/presence-spatial/SpatialRoomViewport.tsx",
    "components/presence-spatial/SemanticSpatialFallback.tsx",
    "components/presence-spatial/threeGeometryCache.ts",
    "lib/presence/spatial/rendererAdapter.ts",
  ].map((path) => readFileSync(path, "utf8").toLowerCase());
  for (const source of sources) {
    assert.equal(source.includes("mobstar"), false);
    assert.equal(source.includes("mobstar-proof"), false);
    assert.equal(source.includes("mobstar-gate4-candidate-room"), false);
  }
});
