import test from "node:test";
import assert from "node:assert/strict";
import { BBB_PROJECTION_WALL_FIXTURE } from "./fixtures/bbbProjectionWall.ts";
import { MOBSTAR_SPATIAL_ROOM_FIXTURE } from "./fixtures/mobstar.ts";
import type { SpatialPlacement, SpatialRoomDefinition } from "./model.ts";
import {
  applySpatialPlacementMutation,
  resolveSpatialPlacementTransform,
  validateSpatialPlacementRules,
} from "./placement.ts";
import { validateSpatialRoomDefinition } from "./validate.ts";

test("Mobstar keeps its rack floor-mounted and its garment Pieces contained in readable rack slots", () => {
  const rack = placement(MOBSTAR_SPATIAL_ROOM_FIXTURE, "retail-rack");
  assert.deepEqual(rack.anchor, { kind: "floor" });
  assert.equal(resolveSpatialPlacementTransform(MOBSTAR_SPATIAL_ROOM_FIXTURE, rack).position[1], 1.7);
  assert.deepEqual(validateSpatialPlacementRules(MOBSTAR_SPATIAL_ROOM_FIXTURE), []);
  for (const id of ["rack-piece-a", "rack-piece-b"]) {
    const piece = placement(MOBSTAR_SPATIAL_ROOM_FIXTURE, id);
    const world = resolveSpatialPlacementTransform(MOBSTAR_SPATIAL_ROOM_FIXTURE, piece);
    assert.ok(world.position[1] > 1.7 && world.position[1] < 3.4, `${id} remains visibly suspended within the rack`);
  }
});

test("wall, projection, rack and surface Pieces accept exact planar containment and reject overflow", async (t) => {
  const cases = [
    {
      name: "wall",
      fixture: MOBSTAR_SPATIAL_ROOM_FIXTURE,
      placementId: "archive-poster",
      axis: 0,
      exact: 1.625,
    },
    {
      name: "projection",
      fixture: BBB_PROJECTION_WALL_FIXTURE,
      placementId: "projection-piece-01",
      axis: 0,
      exact: 3.51,
    },
    {
      name: "rack",
      fixture: MOBSTAR_SPATIAL_ROOM_FIXTURE,
      placementId: "rack-piece-a",
      axis: 0,
      exact: 3.815,
    },
    {
      name: "surface",
      fixture: MOBSTAR_SPATIAL_ROOM_FIXTURE,
      placementId: "merch-piece",
      axis: 0,
      exact: 0.83,
    },
  ] as const;

  for (const item of cases) {
    await t.test(item.name, () => {
      const exactRoom = structuredClone(item.fixture) as SpatialRoomDefinition;
      const exactPlacement = mutablePlacement(exactRoom, item.placementId);
      const exactPosition = [...exactPlacement.transform.position] as [number, number, number];
      exactPosition[item.axis] = item.exact;
      exactPlacement.transform = { ...exactPlacement.transform, position: exactPosition };
      assert.equal(validateSpatialRoomDefinition(exactRoom).ok, true, `${item.name} exact boundary`);

      const overflowRoom = structuredClone(exactRoom) as SpatialRoomDefinition;
      const overflowPlacement = mutablePlacement(overflowRoom, item.placementId);
      const overflowPosition = [...overflowPlacement.transform.position] as [number, number, number];
      overflowPosition[item.axis] += 0.001;
      overflowPlacement.transform = { ...overflowPlacement.transform, position: overflowPosition };
      const result = validateSpatialRoomDefinition(overflowRoom);
      assert.equal(result.ok, false, `${item.name} overflow`);
      if (!result.ok) assert.ok(result.issues.some((issue) => issue.code === "parent-bounds"));
    });
  }
});

test("floor contact accepts the exact floor and rejects geometry below it", () => {
  assert.equal(validateSpatialRoomDefinition(MOBSTAR_SPATIAL_ROOM_FIXTURE).ok, true);
  const belowFloor = structuredClone(MOBSTAR_SPATIAL_ROOM_FIXTURE) as SpatialRoomDefinition;
  const floor = mutablePlacement(belowFloor, "floor");
  floor.transform = { ...floor.transform, position: [0, 0.059, 0] };
  const result = validateSpatialRoomDefinition(belowFloor);
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.issues.some((issue) => issue.code === "room-bounds"));
});

test("rotated descendants beneath nonuniform scale fail before lossy transform decomposition", () => {
  const room = structuredClone(MOBSTAR_SPATIAL_ROOM_FIXTURE) as SpatialRoomDefinition;
  const table = mutablePlacement(room, "merch-table");
  table.transform = { ...table.transform, scale: [1.5, 1, 1] };
  const result = validateSpatialRoomDefinition(room);
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.issues.some((issue) => issue.code === "shear-transform"));
});

test("camera validation intersects full segments against clearance-expanded bounds", () => {
  const crossing = structuredClone(MOBSTAR_SPATIAL_ROOM_FIXTURE) as SpatialRoomDefinition;
  crossing.cameraPath = { points: [[0, 2, 0], [8.1, 2, 0]], clearance: 0.4 };
  const crossingResult = validateSpatialRoomDefinition(crossing);
  assert.equal(crossingResult.ok, false);
  if (!crossingResult.ok) assert.ok(crossingResult.issues.some((issue) => issue.code === "camera-path"));

  const tangent = structuredClone(MOBSTAR_SPATIAL_ROOM_FIXTURE) as SpatialRoomDefinition;
  tangent.cameraPath = { points: [[1.5, 2, -2], [1.5, 2, 2]], clearance: 0.4 };
  const tangentResult = validateSpatialRoomDefinition(tangent);
  assert.equal(tangentResult.ok, false);
  if (!tangentResult.ok) assert.ok(tangentResult.issues.some((issue) => issue.code === "camera-path"));

  const clear = structuredClone(tangent) as SpatialRoomDefinition;
  clear.cameraPath = { points: [[1.498, 2, -2], [1.498, 2, 2]], clearance: 0.4 };
  assert.equal(validateSpatialRoomDefinition(clear).ok, true);
});

test("ancestor walks terminate safely even when invalid solid placements form a parent cycle", () => {
  const room = structuredClone(MOBSTAR_SPATIAL_ROOM_FIXTURE) as SpatialRoomDefinition;
  const table = mutablePlacement(room, "merch-table");
  const plinth = mutablePlacement(room, "retail-plinth");
  table.anchor = { kind: "surface", parentPlacementId: "retail-plinth", anchorId: "surface-top" };
  plinth.anchor = { kind: "surface", parentPlacementId: "merch-table", anchorId: "tabletop-grid" };
  const result = validateSpatialRoomDefinition(room);
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.issues.some((issue) => issue.code === "parent-cycle"));
});

test("remove rejects missing placements and every retained reference without mutating the room", async (t) => {
  const cases = [
    { name: "missing", room: MOBSTAR_SPATIAL_ROOM_FIXTURE, placementId: "missing-placement", code: "remove-missing" },
    { name: "child", room: MOBSTAR_SPATIAL_ROOM_FIXTURE, placementId: "retail-rack", code: "parent-in-use" },
    { name: "action", room: MOBSTAR_SPATIAL_ROOM_FIXTURE, placementId: "archive-poster", code: "action-reference" },
    { name: "state", room: MOBSTAR_SPATIAL_ROOM_FIXTURE, placementId: "retail-rack", code: "state-reference" },
    { name: "semantic", room: semanticOnlyBrandReference(), placementId: "brand-mark-piece", code: "semantic-reference" },
  ] as const;
  for (const item of cases) {
    await t.test(item.name, () => {
      const result = applySpatialPlacementMutation(item.room, { kind: "remove", placementId: item.placementId });
      assert.equal(result.ok, false);
      assert.equal(result.room, item.room);
      if (!result.ok) assert.ok(result.issues.some((issue) => issue.code === item.code));
    });
  }
});

function semanticOnlyBrandReference(): SpatialRoomDefinition {
  const room = structuredClone(MOBSTAR_SPATIAL_ROOM_FIXTURE) as SpatialRoomDefinition;
  room.actions = room.actions.filter((action) => action.id !== "inspect-brand");
  const brand = mutablePlacement(room, "brand-mark-piece");
  brand.actionRefs = [];
  room.semanticFallback = room.semanticFallback.map((item) => (
    item.placementId === "brand-mark-piece" ? { ...item, actionRefs: [] } : item
  ));
  return room;
}

function placement(room: SpatialRoomDefinition, id: string): SpatialPlacement {
  const item = room.placements.find((candidate) => candidate.id === id);
  assert.ok(item, `Missing placement ${id}`);
  return item;
}

function mutablePlacement(room: SpatialRoomDefinition, id: string): SpatialPlacement {
  return placement(room, id);
}
