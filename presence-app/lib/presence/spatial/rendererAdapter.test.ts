import test from "node:test";
import assert from "node:assert/strict";
import { compileSpatialRoom } from "./compile.ts";
import { BBB_PROJECTION_WALL_FIXTURE } from "./fixtures/bbbProjectionWall.ts";
import { MOBSTAR_SPATIAL_ROOM_FIXTURE } from "./fixtures/mobstar.ts";
import {
  buildSemanticSpatialRows,
  collectSpatialActions,
  cycleProjectionPlacement,
  deriveSafeSpatialMediaLocators,
  isSpatialTextureDimensionSafe,
  resolveSpatialActionIntent,
  resolveSpatialMediaSource,
  resolveSpatialSceneState,
  selectSpatialRendererLane,
  spatialContainMapping,
  spatialInspectionPosition,
  spatialMediaLocatorSignature,
  spatialMediaPlacementIdsToLoad,
} from "./rendererAdapter.ts";

const compile = (fixture: typeof MOBSTAR_SPATIAL_ROOM_FIXTURE | typeof BBB_PROJECTION_WALL_FIXTURE) => {
  const result = compileSpatialRoom(fixture);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("fixture did not compile");
  return result.plan;
};

test("renderer lane uses Three only for capable desktop motion contexts", () => {
  assert.deepEqual(selectSpatialRendererLane({ mobile: false, reducedMotion: false, webglAvailable: true }), {
    lane: "three",
    reason: null,
  });
  assert.equal(selectSpatialRendererLane({ mobile: true, reducedMotion: false, webglAvailable: true }).reason, "mobile");
  assert.equal(selectSpatialRendererLane({ mobile: false, reducedMotion: true, webglAvailable: true }).reason, "reduced-motion");
  assert.equal(selectSpatialRendererLane({ mobile: false, reducedMotion: false, webglAvailable: false }).reason, "webgl-unavailable");
  assert.equal(selectSpatialRendererLane({ mobile: false, reducedMotion: false, webglAvailable: true, runtimeFailed: true }).reason, "runtime-failure");
});

test("semantic rows cover every Piece and every unique Action", () => {
  for (const plan of [compile(MOBSTAR_SPATIAL_ROOM_FIXTURE), compile(BBB_PROJECTION_WALL_FIXTURE)]) {
    const rows = buildSemanticSpatialRows(plan);
    const rowPlacementIds = new Set(rows.map((row) => row.placementId));
    const rowActionIds = new Set(rows.flatMap((row) => row.actions.map((action) => action.id)));

    for (const item of plan.items.filter((candidate) => candidate.category === "piece")) {
      assert.ok(rowPlacementIds.has(item.placementId), `${item.placementId} is available semantically`);
    }
    for (const entry of collectSpatialActions(plan)) {
      assert.ok(rowActionIds.has(entry.action.id), `${entry.action.id} is available semantically`);
    }
  }
  const mobstarRows = buildSemanticSpatialRows(compile(MOBSTAR_SPATIAL_ROOM_FIXTURE));
  assert.ok(
    mobstarRows.some((row) => row.placementId === "retail-rack"),
    "a scene-state focus target is present for visible semantic navigation feedback",
  );
});

test("actions resolve generically without component or fixture knowledge", () => {
  assert.deepEqual(
    resolveSpatialActionIntent(
      { id: "inspect", kind: "inspect", label: "Inspect", targetPlacementId: "piece-7" },
      "wall-2",
    ),
    { kind: "inspect", placementId: "piece-7", actionId: "inspect" },
  );
  assert.deepEqual(
    resolveSpatialActionIntent(
      { id: "focus", kind: "navigate-state", label: "Focus", targetStateId: "detail" },
      "rack-1",
    ),
    { kind: "navigate-state", stateId: "detail", actionId: "focus" },
  );
  assert.deepEqual(
    resolveSpatialActionIntent({ id: "next", kind: "sequence-next", label: "Next" }, "projection-1"),
    { kind: "sequence", direction: 1, actionId: "next" },
  );
});

test("projection sequence is inferred from render materials and cycles deterministically", () => {
  const plan = compile(BBB_PROJECTION_WALL_FIXTURE);
  assert.equal(cycleProjectionPlacement(plan, undefined, 1), "projection-piece-01");
  assert.equal(cycleProjectionPlacement(plan, "projection-piece-01", 1), "projection-piece-02");
  assert.equal(cycleProjectionPlacement(plan, "projection-piece-01", -1), "projection-piece-03");
});

test("projection sequence only includes Pieces visible in the active state", () => {
  const plan = compile(BBB_PROJECTION_WALL_FIXTURE);
  const filteredPlan = {
    ...plan,
    states: [
      ...plan.states,
      {
        ...plan.states[0],
        id: "single-projection",
        visiblePlacementIds: ["bbb-shell", "bbb-projection-wall", "projection-piece-02"],
      },
    ],
  };
  assert.equal(
    cycleProjectionPlacement(filteredPlan, "projection-piece-01", 1, "single-projection"),
    "projection-piece-02",
  );
  assert.equal(
    cycleProjectionPlacement(filteredPlan, "projection-piece-01", -1, "single-projection"),
    "projection-piece-02",
  );
  assert.equal(
    cycleProjectionPlacement(
      { ...filteredPlan, states: [{ ...filteredPlan.states[0], id: "empty", visiblePlacementIds: [] }] },
      undefined,
      1,
      "empty",
    ),
    undefined,
  );
});

test("validated public logical locators derive generic same-origin media paths", () => {
  const locators = deriveSafeSpatialMediaLocators([
    { id: "public-image", kind: "image", locator: "public:artists/work.webp", safety: "public-safe", compressedBytes: 12, eager: true, attribution: "Public" },
    { id: "generated-image", kind: "image", locator: "generated:artists/draft", safety: "generated-placeholder", compressedBytes: 8, eager: false, attribution: "Generated" },
    { id: "shape", kind: "shape", locator: "public:shapes/room", safety: "public-safe", compressedBytes: 2, eager: true, attribution: "Public" },
  ]);
  assert.deepEqual(locators, {
    "public-image": { src: "/artists/work.webp", safety: "public-safe" },
  });
  assert.equal(
    spatialMediaLocatorSignature(locators),
    "public-image\u0000public-safe\u0000/artists/work.webp",
  );
  assert.equal(
    spatialMediaLocatorSignature({
      b: { src: "/b.webp", safety: "public-safe" },
      a: { src: "/a.webp", safety: "public-safe" },
    }),
    spatialMediaLocatorSignature({
      a: { src: "/a.webp", safety: "public-safe" },
      b: { src: "/b.webp", safety: "public-safe" },
    }),
  );
});

test("media sources require matching safety and an explicit safe URL mapping", () => {
  const media = compile(BBB_PROJECTION_WALL_FIXTURE).items.find((item) => item.media)?.media;
  assert.ok(media);
  assert.equal(resolveSpatialMediaSource(media, {}), null);
  assert.equal(
    resolveSpatialMediaSource(media, {
      [media.assetId]: { src: "/internal-proof/threshold.webp", safety: media.safety },
    }),
    "/internal-proof/threshold.webp",
  );
  assert.equal(
    resolveSpatialMediaSource(media, {
      [media.assetId]: { src: "javascript:alert(1)", safety: media.safety },
    }),
    null,
  );
  assert.equal(
    resolveSpatialMediaSource(media, {
      [media.assetId]: { src: "https://example.test/threshold.webp", safety: media.safety },
    }),
    null,
  );
  assert.equal(
    resolveSpatialMediaSource(media, {
      [media.assetId]: { src: "/internal-proof/threshold.webp", safety: "generated-placeholder" },
    }),
    null,
  );
});

test("media load decisions keep lazy assets dormant until selected or explicitly state-visible", () => {
  const plan = compile(BBB_PROJECTION_WALL_FIXTURE);
  const state = resolveSpatialSceneState(plan, plan.entryStateId);
  const initial = spatialMediaPlacementIdsToLoad(plan, state);
  assert.equal(initial.has("projection-piece-01"), true);
  assert.equal(initial.has("projection-piece-02"), false);
  assert.equal(initial.has("projection-piece-03"), true);
  assert.equal(
    spatialMediaPlacementIdsToLoad(plan, state, "projection-piece-02").has("projection-piece-02"),
    true,
  );

  const explicitState = {
    ...state,
    visiblePlacementIds: ["bbb-shell", "bbb-projection-wall", "projection-piece-02"],
  };
  assert.equal(spatialMediaPlacementIdsToLoad(plan, explicitState).has("projection-piece-02"), true);
});

test("texture safety and contain mapping are deterministic", () => {
  assert.equal(isSpatialTextureDimensionSafe(1_536, 1_024), true);
  assert.equal(isSpatialTextureDimensionSafe(8_192, 1_024), false);
  assert.equal(isSpatialTextureDimensionSafe(Number.MAX_SAFE_INTEGER, 2), false);
  assert.deepEqual(spatialContainMapping(1_600, 900, 1, 1), {
    canvasWidth: 2_048,
    canvasHeight: 2_048,
    drawX: 0,
    drawY: 448,
    drawWidth: 2_048,
    drawHeight: 1_152,
  });
  assert.equal(spatialContainMapping(0, 900, 1, 1), null);
});

test("scene-state resolution follows state IDs and reduced-motion counterparts", () => {
  const plan = compile(MOBSTAR_SPATIAL_ROOM_FIXTURE);
  assert.equal(resolveSpatialSceneState(plan, "rack-focus", false).id, "rack-focus");
  assert.equal(resolveSpatialSceneState(plan, "rack-focus", true).id, "rack-static");
  assert.equal(resolveSpatialSceneState(plan, "missing", false).id, plan.entryStateId);
});

test("inspection advances only a selected Piece and leaves its rack transform untouched", () => {
  const plan = compile(MOBSTAR_SPATIAL_ROOM_FIXTURE);
  const piece = plan.items.find((item) => item.placementId === "rack-piece-a");
  const rack = plan.items.find((item) => item.placementId === "retail-rack");
  assert.ok(piece);
  assert.ok(rack);
  const camera = resolveSpatialSceneState(plan, "rack-focus").cameraPosition;

  assert.notDeepEqual(spatialInspectionPosition(piece, camera), piece.transform.position);
  assert.deepEqual(spatialInspectionPosition(rack, camera), rack.transform.position);
});
