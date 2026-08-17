import test from "node:test";
import assert from "node:assert/strict";
import { BBB_PROJECTION_WALL_FIXTURE } from "./fixtures/bbbProjectionWall.ts";
import { MOBSTAR_SPATIAL_ROOM_FIXTURE } from "./fixtures/mobstar.ts";
import {
  applySpatialPlacementMutation,
  snapSpatialRotation,
  snapSpatialTransform,
  snapSpatialValue,
} from "./placement.ts";
import { SPATIAL_COMPONENTS } from "./registry.ts";
import {
  SPATIAL_EAGER_ASSET_BUDGET_BYTES,
  SPATIAL_LAYOUT_JSON_BUDGET_BYTES,
  SPATIAL_TOTAL_ASSET_BUDGET_BYTES,
  utf8Bytes,
  validateSpatialComponentDefinition,
  validateRegisteredSpatialComponents,
  validateSpatialRoomDefinition,
} from "./validate.ts";

test("registered component metadata and both data-only proof fixtures validate", () => {
  assert.deepEqual(validateRegisteredSpatialComponents(), []);
  assert.ok(SPATIAL_COMPONENTS.every((component) => component.license.internalOnly));
  assert.equal(validateSpatialRoomDefinition(MOBSTAR_SPATIAL_ROOM_FIXTURE).ok, true);
  assert.equal(validateSpatialRoomDefinition(BBB_PROJECTION_WALL_FIXTURE).ok, true);
});

test("strict room validation rejects unknown fields and unsafe model locators", () => {
  const unknownField = { ...MOBSTAR_SPATIAL_ROOM_FIXTURE, unexpected: true };
  const unknownResult = validateSpatialRoomDefinition(unknownField);
  assert.equal(unknownResult.ok, false);
  if (!unknownResult.ok) assert.ok(unknownResult.issues.some((issue) => issue.code === "unknown-key"));

  const rawModel = structuredClone(MOBSTAR_SPATIAL_ROOM_FIXTURE) as unknown as Record<string, unknown>;
  const assets = rawModel.assets as Array<Record<string, unknown>>;
  assets[0].locator = "public:mobstar/unsafe-model.glb";
  const locatorResult = validateSpatialRoomDefinition(rawModel);
  assert.equal(locatorResult.ok, false);
  if (!locatorResult.ok) assert.ok(locatorResult.issues.some((issue) => issue.code === "unsafe-locator"));
});

test("room validation enforces aggregate asset and placement budgets", () => {
  const overBudget = structuredClone(MOBSTAR_SPATIAL_ROOM_FIXTURE) as unknown as Record<string, unknown>;
  const assets = overBudget.assets as Array<Record<string, unknown>>;
  assets[0].compressedBytes = SPATIAL_TOTAL_ASSET_BUDGET_BYTES;
  const budgetResult = validateSpatialRoomDefinition(overBudget);
  assert.equal(budgetResult.ok, false);
  if (!budgetResult.ok) assert.ok(budgetResult.issues.some((issue) => issue.code === "total-asset-budget"));

  const blockedPath = structuredClone(MOBSTAR_SPATIAL_ROOM_FIXTURE) as unknown as Record<string, unknown>;
  const cameraPath = blockedPath.cameraPath as Record<string, unknown>;
  cameraPath.points = [[4.7, 2, 0]];
  const pathResult = validateSpatialRoomDefinition(blockedPath);
  assert.equal(pathResult.ok, false);
  if (!pathResult.ok) assert.ok(pathResult.issues.some((issue) => issue.code === "camera-path"));
});

test("room validation enforces the serialized layout JSON ceiling", () => {
  const largeLayout = structuredClone(MOBSTAR_SPATIAL_ROOM_FIXTURE) as unknown as Record<string, unknown>;
  largeLayout.assets = Array.from({ length: 256 }, (_, index) => ({
    id: `padding-${index}`,
    kind: "image",
    locator: `generated:budget/padding-${index}`,
    safety: "generated-placeholder",
    compressedBytes: 0,
    eager: false,
    attribution: "x".repeat(500),
  }));
  largeLayout.media = [];
  const placements = largeLayout.placements as Array<Record<string, unknown>>;
  for (const placement of placements) delete placement.mediaRef;
  largeLayout.semanticFallback = (largeLayout.semanticFallback as Array<Record<string, unknown>>)
    .filter((item) => item.placementId === "retail-plinth");
  const result = validateSpatialRoomDefinition(largeLayout);
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.issues.some((issue) => issue.code === "layout-budget"));
});

test("invalid placement mutations return the original room unchanged", () => {
  const rackPiece = MOBSTAR_SPATIAL_ROOM_FIXTURE.placements.find((placement) => placement.id === "rack-piece-a");
  assert.ok(rackPiece);
  const invalidReplacement = {
    ...rackPiece,
    anchor: { kind: "rack" as const, parentPlacementId: "retail-rack", anchorId: "missing-slot" },
  };
  const result = applySpatialPlacementMutation(MOBSTAR_SPATIAL_ROOM_FIXTURE, {
    kind: "replace",
    placementId: rackPiece.id,
    placement: invalidReplacement,
  });
  assert.equal(result.ok, false);
  assert.equal(result.room, MOBSTAR_SPATIAL_ROOM_FIXTURE);
  if (!result.ok) assert.ok(result.issues.some((issue) => issue.code === "anchor-missing"));
});

test("arranger snap helpers produce stable grid and rotation values", () => {
  assert.equal(snapSpatialValue(1.13, 0.25), 1.25);
  assert.equal(snapSpatialValue(-0.12, 0.25), 0);
  assert.ok(Math.abs(snapSpatialRotation(14 * Math.PI / 180, 15) - 15 * Math.PI / 180) < 1e-9);
  const snapped = snapSpatialTransform({ position: [1.13, 0.06, -2.62], rotation: [0, 0.24, 0], scale: [1, 1, 1] });
  assert.deepEqual(snapped.position, [1.25, 0.06, -2.5]);
  assert.ok(Math.abs(snapped.rotation[1] - 15 * Math.PI / 180) < 1e-9);
  assert.deepEqual(snapped.scale, [1, 1, 1]);
  assert.throws(() => snapSpatialValue(1, 0), /positive step/);
  assert.throws(() => snapSpatialValue(Number.MAX_VALUE, Number.MIN_VALUE), /finite numeric range/);
});

test("logical asset locators are normalized and namespace-bound to safety", () => {
  const invalidLocators = [
    "generated:mobstar/../secret",
    "generated:https://example.com/image.png",
    "generated:mobstar\\image.png",
    "generated:/absolute/image.png",
    "generated:mobstar/raw.glb",
    "generated:mobstar//image.png",
  ];
  for (const locator of invalidLocators) {
    const room = structuredClone(MOBSTAR_SPATIAL_ROOM_FIXTURE) as unknown as { assets: Array<Record<string, unknown>> };
    room.assets[0].locator = locator;
    const result = validateSpatialRoomDefinition(room);
    assert.equal(result.ok, false, locator);
    if (!result.ok) assert.ok(result.issues.some((issue) => issue.code === "unsafe-locator"), locator);
  }

  const namespaceMismatch = structuredClone(MOBSTAR_SPATIAL_ROOM_FIXTURE) as unknown as { assets: Array<Record<string, unknown>> };
  namespaceMismatch.assets[0].locator = "public:mobstar/piece-a";
  const result = validateSpatialRoomDefinition(namespaceMismatch);
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.issues.some((issue) => issue.code === "locator-namespace"));
});

test("media, decals and skin colours remain type- and safety-consistent", () => {
  const wrongMedia = structuredClone(MOBSTAR_SPATIAL_ROOM_FIXTURE) as unknown as {
    media: Array<Record<string, unknown>>;
  };
  wrongMedia.media[0].kind = "logo";
  wrongMedia.media[0].safety = "public-safe";
  const mediaResult = validateSpatialRoomDefinition(wrongMedia);
  assert.equal(mediaResult.ok, false);
  if (!mediaResult.ok) {
    assert.ok(mediaResult.issues.some((issue) => issue.code === "media-kind"));
    assert.ok(mediaResult.issues.some((issue) => issue.code === "media-safety"));
  }

  const wrongDecal = structuredClone(MOBSTAR_SPATIAL_ROOM_FIXTURE) as unknown as {
    skins: Array<{ decalAssetIds: string[] }>;
  };
  wrongDecal.skins[0].decalAssetIds = ["mobstar-piece-a"];
  const decalResult = validateSpatialRoomDefinition(wrongDecal);
  assert.equal(decalResult.ok, false);
  if (!decalResult.ok) assert.ok(decalResult.issues.some((issue) => issue.code === "decal-kind"));

  const wrongColourSlot = structuredClone(MOBSTAR_SPATIAL_ROOM_FIXTURE) as unknown as {
    skins: Array<{ colors: Record<string, string> }>;
  };
  wrongColourSlot.skins[0].colors = { background: "#000000" };
  const colourResult = validateSpatialRoomDefinition(wrongColourSlot);
  assert.equal(colourResult.ok, false);
  if (!colourResult.ok) assert.ok(colourResult.issues.some((issue) => issue.code === "material-slot"));
});

test("component anchors are unique and mobile fallback component references resolve", () => {
  const duplicateAnchor = structuredClone(
    SPATIAL_COMPONENTS.find((component) => component.componentId === "presence.retail-rack"),
  ) as unknown as { anchors: unknown[] } & Record<string, unknown>;
  assert.ok(duplicateAnchor);
  duplicateAnchor.anchors = [duplicateAnchor.anchors[0], duplicateAnchor.anchors[0]];
  const duplicateResult = validateSpatialComponentDefinition(duplicateAnchor);
  assert.equal(duplicateResult.ok, false);
  if (!duplicateResult.ok) assert.ok(duplicateResult.issues.some((issue) => issue.code === "duplicate-id"));

  const missingFallback = structuredClone(SPATIAL_COMPONENTS[0]) as unknown as Record<string, unknown>;
  missingFallback.mobileFallback = {
    strategy: "simplified",
    componentRef: { componentId: "presence.missing-fallback", version: "1.0.0" },
    note: "Missing fallback should fail closed.",
  };
  const fallbackResult = validateSpatialComponentDefinition(missingFallback);
  assert.equal(fallbackResult.ok, false);
  if (!fallbackResult.ok) assert.ok(fallbackResult.issues.some((issue) => issue.code === "missing-fallback-component"));
});

test("Actions use exact discriminated fields and semantic rows can expose only owned Actions", () => {
  const extraTarget = structuredClone(MOBSTAR_SPATIAL_ROOM_FIXTURE) as unknown as {
    actions: Array<Record<string, unknown>>;
  };
  extraTarget.actions[0].targetStateId = "overview";
  const targetResult = validateSpatialRoomDefinition(extraTarget);
  assert.equal(targetResult.ok, false);
  if (!targetResult.ok) assert.ok(targetResult.issues.some((issue) => issue.code === "unknown-key"));

  const unownedSemanticAction = structuredClone(MOBSTAR_SPATIAL_ROOM_FIXTURE) as unknown as {
    placements: Array<{ id: string; actionRefs: string[] }>;
  };
  unownedSemanticAction.placements.find((placement) => placement.id === "retail-rack")!.actionRefs = [];
  const semanticResult = validateSpatialRoomDefinition(unownedSemanticAction);
  assert.equal(semanticResult.ok, false);
  if (!semanticResult.ok) assert.ok(semanticResult.issues.some((issue) => issue.code === "semantic-action-owner"));
});

test("reduced-motion state references reject self references and longer cycles", () => {
  const selfCycle = structuredClone(MOBSTAR_SPATIAL_ROOM_FIXTURE) as unknown as {
    states: Array<{ id: string; reducedMotionStateId?: string }>;
  };
  selfCycle.states.find((state) => state.id === "overview")!.reducedMotionStateId = "overview";
  const selfResult = validateSpatialRoomDefinition(selfCycle);
  assert.equal(selfResult.ok, false);
  if (!selfResult.ok) assert.ok(selfResult.issues.some((issue) => issue.code === "reduced-state-cycle"));

  const longerCycle = structuredClone(MOBSTAR_SPATIAL_ROOM_FIXTURE) as unknown as {
    states: Array<{ id: string; reducedMotionStateId?: string }>;
  };
  longerCycle.states.find((state) => state.id === "overview-static")!.reducedMotionStateId = "overview";
  const cycleResult = validateSpatialRoomDefinition(longerCycle);
  assert.equal(cycleResult.ok, false);
  if (!cycleResult.ok) assert.ok(cycleResult.issues.some((issue) => issue.code === "reduced-state-cycle"));
});

test("layout, eager and total budget ceilings accept equality and reject one byte over", () => {
  const exactLayout = roomAtExactLayoutBytes(SPATIAL_LAYOUT_JSON_BUDGET_BYTES);
  assert.equal(utf8Bytes(JSON.stringify(exactLayout)), SPATIAL_LAYOUT_JSON_BUDGET_BYTES);
  assert.equal(validateSpatialRoomDefinition(exactLayout).ok, true);
  const overLayout = structuredClone(exactLayout) as unknown as { assets: Array<{ attribution: string }> };
  const expandable = overLayout.assets.find((asset) => asset.attribution.length < 500);
  assert.ok(expandable);
  expandable.attribution += "x";
  const layoutResult = validateSpatialRoomDefinition(overLayout);
  assert.equal(layoutResult.ok, false);
  if (!layoutResult.ok) assert.ok(layoutResult.issues.some((issue) => issue.code === "layout-budget"));

  const exactEager = structuredClone(MOBSTAR_SPATIAL_ROOM_FIXTURE) as unknown as {
    assets: Array<{ compressedBytes: number; eager: boolean }>;
  };
  exactEager.assets.forEach((asset) => { asset.compressedBytes = 0; asset.eager = false; });
  exactEager.assets[0].compressedBytes = SPATIAL_EAGER_ASSET_BUDGET_BYTES;
  exactEager.assets[0].eager = true;
  assert.equal(validateSpatialRoomDefinition(exactEager).ok, true);
  exactEager.assets[0].compressedBytes += 1;
  const eagerResult = validateSpatialRoomDefinition(exactEager);
  assert.equal(eagerResult.ok, false);
  if (!eagerResult.ok) assert.ok(eagerResult.issues.some((issue) => issue.code === "eager-asset-budget"));

  const exactTotal = structuredClone(MOBSTAR_SPATIAL_ROOM_FIXTURE) as unknown as {
    assets: Array<{ compressedBytes: number; eager: boolean }>;
  };
  exactTotal.assets.forEach((asset) => { asset.compressedBytes = 0; asset.eager = false; });
  exactTotal.assets[0].compressedBytes = SPATIAL_TOTAL_ASSET_BUDGET_BYTES;
  assert.equal(validateSpatialRoomDefinition(exactTotal).ok, true);
  exactTotal.assets[1].compressedBytes = 1;
  const totalResult = validateSpatialRoomDefinition(exactTotal);
  assert.equal(totalResult.ok, false);
  if (!totalResult.ok) assert.ok(totalResult.issues.some((issue) => issue.code === "total-asset-budget"));
});

function roomAtExactLayoutBytes(target: number): unknown {
  const room = structuredClone(MOBSTAR_SPATIAL_ROOM_FIXTURE) as unknown as {
    label: string;
    seed: string;
    assets: Array<Record<string, unknown> & { attribution: string }>;
  };
  let index = 0;
  while (room.assets.length < 256) {
    const asset = {
      id: `padding-${index}`,
      kind: "image",
      locator: `generated:budget/padding-${index}`,
      safety: "generated-placeholder",
      compressedBytes: 0,
      eager: false,
      attribution: "x".repeat(500),
    };
    room.assets.push(asset);
    if (utf8Bytes(JSON.stringify(room)) > target) {
      room.assets.pop();
      break;
    }
    index += 1;
  }

  let remaining = target - utf8Bytes(JSON.stringify(room));
  const strings: Array<{ owner: Record<string, unknown>; key: string; maximum: number }> = [
    { owner: room as unknown as Record<string, unknown>, key: "label", maximum: 160 },
    { owner: room as unknown as Record<string, unknown>, key: "seed", maximum: 160 },
    ...room.assets.map((asset) => ({ owner: asset, key: "attribution", maximum: 500 })),
  ];
  for (const candidate of strings) {
    if (remaining === 0) break;
    const current = candidate.owner[candidate.key] as string;
    const added = Math.min(remaining, candidate.maximum - current.length);
    candidate.owner[candidate.key] = `${current}${"x".repeat(added)}`;
    remaining -= added;
  }
  assert.equal(remaining, 0, "test room could not be padded to the exact layout boundary");
  return room;
}
