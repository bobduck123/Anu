import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  CANDIDATE_COMPONENT_OPTIONS,
  CANDIDATE_ROOM_KIT_OPTIONS,
  candidateComponentGroups,
} from "./candidateOptions.ts";
import {
  addArrangerComponent,
  assignArrangerMaterialPreset,
  assignArrangerMedia,
  assignArrangerOpenLink,
  createBlankMobstarSpatialRoom,
} from "./arranger.ts";
import { compileSpatialRoom } from "./compile.ts";
import { CANDIDATE_OPTIONS_REVIEW_FIXTURE } from "./fixtures/candidateOptionsReview.ts";
import { spatialComponent, spatialComponentCatalogMetadata } from "./registry.ts";
import { createSpatialDraftEnvelope, decodeSpatialDraftEnvelope, encodeSpatialDraftEnvelope } from "./storage.ts";

interface CandidateRegistry {
  admission: string;
  components: {
    componentId: string;
    version: string;
    status: string;
    export?: { runtimeAsset?: string; runtimeSizeKb?: number };
    budget: { status: string };
  }[];
  roomKits: {
    roomKitId: string;
    status: string;
    category: string;
    export?: { runtimeAsset?: string; runtimeSizeKb?: number };
    budget: { status: string };
  }[];
}

interface InternalUseManifest {
  admission: string;
  components: {
    componentId: string;
    version: string;
    status: string;
    role: string;
    runtimeAsset: string;
    runtimeSizeKb: number;
    budgetStatus: string;
  }[];
}

test("candidate room kit options mirror the generated registry and keep review status", async () => {
  const registry = await readJson<CandidateRegistry>("assets/presence-spatial/candidates/manifests/candidate-registry.json");
  assert.equal(registry.admission, "candidates-only");
  assert.equal(CANDIDATE_ROOM_KIT_OPTIONS.length, registry.roomKits.length);

  for (const option of CANDIDATE_ROOM_KIT_OPTIONS) {
    const source = registry.roomKits.find((candidate) => candidate.roomKitId === option.roomKitId);
    assert.ok(source, option.roomKitId);
    assert.equal(option.status, source.status);
    assert.equal(option.category, source.category);
    assert.equal(option.runtimeAsset, source.export?.runtimeAsset);
    assert.equal(option.runtimeSizeKb, source.export?.runtimeSizeKb);
    assert.equal(option.clearanceStatus, "needs-review");
    assert.ok(option.statusLabels.includes("not admitted"));
    assert.ok(option.statusLabels.includes("not production-ready"));
  }
});

test("over-budget room kits are disabled or deferred without becoming selectable components", async () => {
  const registry = await readJson<CandidateRegistry>("assets/presence-spatial/candidates/manifests/candidate-registry.json");
  const overBudgetIds = registry.roomKits
    .filter((candidate) => candidate.budget.status === "over-budget")
    .map((candidate) => candidate.roomKitId);
  assert.ok(overBudgetIds.length > 0);

  for (const roomKitId of overBudgetIds) {
    const option = CANDIDATE_ROOM_KIT_OPTIONS.find((candidate) => candidate.roomKitId === roomKitId);
    assert.ok(option, roomKitId);
    assert.equal(option.usability, "disabled");
    assert.ok(option.disabledReasons.includes("over-budget"));
  }
  assert.equal(CANDIDATE_ROOM_KIT_OPTIONS.some((option) => option.usability === "selectable-internal"), false);
});

test("candidate component options are filtered, grouped and mirrored from the internal-use manifest", async () => {
  const registry = await readJson<CandidateRegistry>("assets/presence-spatial/candidates/manifests/candidate-registry.json");
  const manifest = await readJson<InternalUseManifest>("assets/presence-spatial/candidates/internal-use-components.mobstar-gate4.json");
  assert.equal(manifest.admission, "internal-use-candidates-only");
  assert.ok(CANDIDATE_COMPONENT_OPTIONS.length < registry.components.length);
  assert.equal(CANDIDATE_COMPONENT_OPTIONS.length, manifest.components.length);
  assert.ok(candidateComponentGroups().length >= 3);

  for (const option of CANDIDATE_COMPONENT_OPTIONS) {
    const source = manifest.components.find((candidate) => candidate.componentId === option.componentId);
    assert.ok(source, option.componentId);
    assert.equal(option.sourceCandidateVersion, source.version);
    assert.equal(option.reviewStatus, source.status);
    assert.equal(option.role, source.role);
    assert.equal(option.runtimeAsset, source.runtimeAsset);
    assert.equal(option.runtimeSizeKb, source.runtimeSizeKb);
    assert.equal(option.payloadStatus, source.budgetStatus);
    assert.equal(option.usability, "selectable-internal");
    assert.ok(option.statusLabels.includes("internal-use only"));
    assert.ok(option.statusLabels.includes("not admitted"));
    assert.ok(option.presenceMaterialSlots.length > 0);
  }
});

test("candidate component bridge registers internal refs without admission or raw source paths", () => {
  const serializedOptions = JSON.stringify(CANDIDATE_COMPONENT_OPTIONS);
  assert.equal(serializedOptions.includes("sourceFile"), false);
  assert.equal(serializedOptions.includes("sourceRoot"), false);
  assert.equal(serializedOptions.includes(".blend"), false);
  assert.equal(serializedOptions.includes(".gltf"), false);

  for (const option of CANDIDATE_COMPONENT_OPTIONS) {
    const definition = spatialComponent(option);
    const metadata = spatialComponentCatalogMetadata(option);
    assert.ok(definition, option.componentId);
    assert.ok(metadata, option.componentId);
    assert.equal(metadata.admissionStatus, "not-evaluated");
    assert.equal(metadata.rawAssetIncluded, false);
    assert.equal(definition.runtime.eager, false);
    assert.equal(definition.mobileFallback.strategy, "semantic-only");
  }
});

test("candidate refs can be added, customized, assigned and persisted as layout JSON", () => {
  let room = createBlankMobstarSpatialRoom();
  const added = addArrangerComponent(room, "candidate.table.old-church-modeling-interior-sce-ffd7-017");
  assert.equal(added.ok, true);
  assert.notEqual(added.room, room);
  if (!added.ok) return;
  room = added.room;
  const placement = room.placements.find((candidate) => candidate.componentId === "candidate.table.old-church-modeling-interior-sce-ffd7-017");
  assert.ok(placement);

  const material = assignArrangerMaterialPreset(room, placement.id, "tabletop", "tabletop-gallery-white");
  assert.equal(material.ok, true);
  if (!material.ok) return;
  room = material.room;

  const media = assignArrangerMedia(room, placement.id, room.media[0]?.id ?? "");
  assert.equal(media.ok, true);
  if (!media.ok) return;
  room = media.room;

  const action = assignArrangerOpenLink(room, placement.id, "Open review", "https://example.com/candidate-options");
  assert.equal(action.ok, true);
  if (!action.ok) return;
  room = action.room;

  const compiled = compileSpatialRoom(room);
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;
  assert.ok(compiled.plan.componentKeys.includes("candidate.table.old-church-modeling-interior-sce-ffd7-017@1.0.0"));
  assert.equal(compiled.plan.budgets.eagerCompressedAssetBytes < 3 * 1024 * 1024, true);
  assert.equal(compiled.plan.budgets.totalCompressedAssetBytes < 12 * 1024 * 1024, true);

  const envelope = createSpatialDraftEnvelope(room);
  const decoded = decodeSpatialDraftEnvelope(encodeSpatialDraftEnvelope(envelope));
  assert.equal(decoded.ok, true);
  if (!decoded.ok) return;
  const persisted = decoded.value.room.placements.find((candidate) => candidate.id === placement.id);
  assert.ok(persisted);
  assert.equal(persisted.componentId, placement.componentId);
  assert.equal(persisted.version, "1.0.0");
  assert.equal(persisted.materialSlotOverrides.tabletop, "tabletop-gallery-white");
  assert.equal(decoded.value.room.actions.some((candidate) => candidate.kind === "open-link"), true);
});

test("candidate options preserve proxy fallback while the public Draco proof remains optional", () => {
  const draco = spatialComponent({ componentId: "candidate.table.old-church-modeling-interior-sce-ffd7-017", version: "1.0.0" });
  const proxy = spatialComponent({ componentId: "candidate.chair.interior-7-3bc1-013", version: "1.0.0" });
  assert.equal(draco?.renderGeometry?.kind, "glb");
  assert.equal(draco?.renderGeometry?.compression, "draco");
  assert.equal(draco?.runtime.eager, false);
  assert.equal(proxy?.renderGeometry, undefined);
  assert.equal(proxy?.geometry.kind, "primitive");
});

test("candidate review fixture compiles generically and renderer code has no fixture branch", async () => {
  const compiled = compileSpatialRoom(CANDIDATE_OPTIONS_REVIEW_FIXTURE);
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;
  assert.equal(CANDIDATE_OPTIONS_REVIEW_FIXTURE.fixtureKind, "generic-proof");
  assert.equal(compiled.plan.componentKeys.some((key) => key.startsWith("candidate.")), true);
  assert.equal(compiled.plan.semanticFallback.length > 0, true);

  const renderer = await readFile(resolve("components/presence-spatial/ThreeSpatialRenderer.tsx"), "utf8");
  assert.equal(renderer.includes("candidate-options-review"), false);
  assert.equal(renderer.includes("candidate.table.old-church-modeling-interior-sce-ffd7-017"), false);
});

test("generated registry remains unadmitted and public-off invariants are not changed", async () => {
  const registry = await readJson<CandidateRegistry>("assets/presence-spatial/candidates/manifests/candidate-registry.json");
  assert.equal(registry.components.some((candidate) => candidate.status === "admitted"), false);
  assert.equal(CANDIDATE_COMPONENT_OPTIONS.some((option) => option.statusLabels.includes("admitted")), false);
});

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(resolve(path), "utf8")) as T;
}
