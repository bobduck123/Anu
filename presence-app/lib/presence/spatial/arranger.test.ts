import test from "node:test";
import assert from "node:assert/strict";
import {
  ARRANGER_COMPONENT_OPTIONS,
  addArrangerComponent,
  assignArrangerMedia,
  createBlankMobstarSpatialRoom,
  isArrangerMovablePlacement,
  listArrangerChildPieces,
  listArrangerCompatibleMedia,
  moveArrangerPlacement,
  moveArrangerPlacementTo,
  reorderArrangerPiece,
  rotateArrangerPlacement,
} from "./arranger.ts";
import { compileSpatialRoom } from "./compile.ts";
import { MOBSTAR_SPATIAL_ROOM_FIXTURE } from "./fixtures/mobstar.ts";
import { resolveSpatialPlacementTransform } from "./placement.ts";

test("blank Mobstar arranger room is a strict, compilable shell with assignable media", () => {
  const room = createBlankMobstarSpatialRoom();
  const result = compileSpatialRoom(room);

  assert.equal(result.ok, true);
  assert.equal(room.id, "mobstar-internal-arranger-room");
  assert.notEqual(room.id, MOBSTAR_SPATIAL_ROOM_FIXTURE.id);
  assert.deepEqual(room.placements.map((placement) => placement.id), ["room-shell", "floor"]);
  assert.deepEqual(room.actions, []);
  assert.deepEqual(room.semanticFallback, []);
  assert.equal(room.media.length, MOBSTAR_SPATIAL_ROOM_FIXTURE.media.length);
});

test("all six arranger components use deterministic valid 0.25 m grid positions", () => {
  let room = createBlankMobstarSpatialRoom();
  for (const option of ARRANGER_COMPONENT_OPTIONS) {
    const result = addArrangerComponent(room, option.componentId);
    assert.equal(result.ok, true, `${option.label} should find a valid position`);
    if (!result.ok) continue;
    room = result.room;
    const added = room.placements.find((placement) => placement.componentId === option.componentId);
    assert.ok(added);
    assert.equal(added.transform.position[0] / 0.25, Math.round(added.transform.position[0] / 0.25));
    assert.equal(added.transform.position[2] / 0.25, Math.round(added.transform.position[2] / 0.25));
  }

  assert.equal(compileSpatialRoom(room).ok, true);
});

test("overlap-allowed wall fixtures never stack at the same footprint", () => {
  const blank = createBlankMobstarSpatialRoom();
  const first = addArrangerComponent(blank, "presence.projection-wall");
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const second = addArrangerComponent(first.room, "presence.projection-wall");
  assert.equal(second.ok, true);
  if (!second.ok) return;
  const third = addArrangerComponent(second.room, "presence.projection-wall");
  assert.equal(third.ok, true);
  if (!third.ok) return;

  const walls = third.room.placements.filter((placement) => placement.componentId === "presence.projection-wall");
  assert.equal(walls.length, 3);
  assert.equal(new Set(walls.map((wall) => `${wall.transform.position[0]}:${wall.transform.position[2]}`)).size, 3);
  const frontWall = walls.find((wall) => wall.transform.position[2] > 0);
  assert.ok(frontWall);
  assert.ok(Math.abs(frontWall.transform.rotation[1] - Math.PI) < 1e-9);
  assert.equal(compileSpatialRoom(third.room).ok, true);
});

test("floor movement snaps to 0.25 m and rotation advances exactly 15 degrees", () => {
  const moved = moveArrangerPlacement(MOBSTAR_SPATIAL_ROOM_FIXTURE, "merch-table", 0.13, 0.13);
  assert.equal(moved.ok, true);
  if (!moved.ok) return;
  const table = moved.room.placements.find((placement) => placement.id === "merch-table");
  assert.ok(table);
  assert.deepEqual(table.transform.position, [-4.25, 0.45, 3.25]);

  const rotated = rotateArrangerPlacement(moved.room, "merch-table", 1);
  assert.equal(rotated.ok, true);
  if (!rotated.ok) return;
  const rotatedTable = rotated.room.placements.find((placement) => placement.id === "merch-table");
  assert.ok(rotatedTable);
  assert.ok(Math.abs(rotatedTable.transform.rotation[1] - 30 * Math.PI / 180) < 1e-9);
  assert.equal(isArrangerMovablePlacement(rotatedTable), true);
  assert.equal(isArrangerMovablePlacement(MOBSTAR_SPATIAL_ROOM_FIXTURE.placements[2]), false);
});

test("a newly added floor fixture starts at a rotation-safe interior position", () => {
  const added = addArrangerComponent(createBlankMobstarSpatialRoom(), "presence.display-table");
  assert.equal(added.ok, true);
  if (!added.ok) return;
  const table = added.room.placements.find((placement) => placement.componentId === "presence.display-table");
  assert.ok(table);
  const rotated = rotateArrangerPlacement(added.room, table.id, 1);
  assert.equal(rotated.ok, true);
  if (rotated.ok) assert.equal(compileSpatialRoom(rotated.room).ok, true);
});

test("collision and room-boundary failures preserve the exact original room", () => {
  const collision = moveArrangerPlacementTo(MOBSTAR_SPATIAL_ROOM_FIXTURE, "merch-table", 4.7, 1);
  assert.equal(collision.ok, false);
  assert.equal(collision.room, MOBSTAR_SPATIAL_ROOM_FIXTURE);
  if (!collision.ok) assert.ok(collision.issues.some((candidate) => candidate.code === "collision"));

  const outside = moveArrangerPlacementTo(MOBSTAR_SPATIAL_ROOM_FIXTURE, "secondary-divider", 9, 0);
  assert.equal(outside.ok, false);
  assert.equal(outside.room, MOBSTAR_SPATIAL_ROOM_FIXTURE);
  if (!outside.ok) assert.ok(outside.issues.some((candidate) => candidate.code === "room-bounds"));
});

test("yaw rotation rejects a divider whose oriented bounds cross the room boundary", () => {
  const added = addArrangerComponent(createBlankMobstarSpatialRoom(), "presence.divider-wall");
  assert.equal(added.ok, true);
  if (!added.ok) return;
  const divider = added.room.placements.find((placement) => placement.componentId === "presence.divider-wall");
  assert.ok(divider);
  const nearBoundary = moveArrangerPlacementTo(added.room, divider.id, 0, 14.75);
  assert.equal(nearBoundary.ok, true);
  if (!nearBoundary.ok) return;

  const rotated = rotateArrangerPlacement(nearBoundary.room, divider.id, 1);
  assert.equal(rotated.ok, false);
  assert.equal(rotated.room, nearBoundary.room);
  if (!rotated.ok) assert.ok(rotated.issues.some((candidate) => candidate.code === "room-bounds"));
});

test("media assignment adds a Piece, inspect Action and semantic fallback atomically", () => {
  const blank = createBlankMobstarSpatialRoom();
  const added = addArrangerComponent(blank, "presence.display-table");
  assert.equal(added.ok, true);
  if (!added.ok) return;
  const table = added.room.placements.find((placement) => placement.componentId === "presence.display-table");
  assert.ok(table);
  assert.equal(listArrangerCompatibleMedia(added.room, table.id).length, added.room.media.length);

  const assigned = assignArrangerMedia(added.room, table.id, "mobstar-media-a");
  assert.equal(assigned.ok, true);
  if (!assigned.ok) return;
  const children = listArrangerChildPieces(assigned.room, table.id);
  assert.equal(children.length, 1);
  assert.equal(children[0].anchor.kind, "surface");
  assert.equal(children[0].anchor.anchorId, "tabletop-grid");
  assert.equal(children[0].mediaRef, "mobstar-media-a");
  const inspect = assigned.room.actions.find((action) => action.targetPlacementId === children[0].id);
  assert.equal(inspect?.kind, "inspect");
  assert.ok(assigned.room.semanticFallback.some((item) => item.placementId === children[0].id));
  assert.equal(compileSpatialRoom(assigned.room).ok, true);

  const rejected = assignArrangerMedia(assigned.room, "floor", "mobstar-media-b");
  assert.equal(rejected.ok, false);
  assert.equal(rejected.room, assigned.room);
  if (!rejected.ok) assert.ok(rejected.issues.some((candidate) => candidate.code === "anchor-type"));
});

test("projection walls accept gallery media through the same Piece-plane contract", () => {
  const blank = createBlankMobstarSpatialRoom();
  const added = addArrangerComponent(blank, "presence.projection-wall");
  assert.equal(added.ok, true);
  if (!added.ok) return;
  const projection = added.room.placements.find((placement) => placement.componentId === "presence.projection-wall");
  assert.ok(projection);

  const assigned = assignArrangerMedia(added.room, projection.id, "mobstar-media-campaign");
  assert.equal(assigned.ok, true);
  if (!assigned.ok) return;
  const child = listArrangerChildPieces(assigned.room, projection.id)[0];
  assert.equal(child.anchor.kind, "projection");
  assert.equal(child.anchor.anchorId, "projection-cell-01");
  assert.equal(compileSpatialRoom(assigned.room).ok, true);
});

test("assignment capacity rejection preserves the last valid compiled room", () => {
  const blank = createBlankMobstarSpatialRoom();
  const added = addArrangerComponent(blank, "presence.display-table");
  assert.equal(added.ok, true);
  if (!added.ok) return;
  const table = added.room.placements.find((placement) => placement.componentId === "presence.display-table");
  assert.ok(table);
  let room = added.room;
  for (let index = 0; index < 12; index += 1) {
    const media = room.media[index % room.media.length];
    const assigned = assignArrangerMedia(room, table.id, media.id);
    assert.equal(assigned.ok, true, `table slot ${index + 1} should accept a Piece`);
    if (!assigned.ok) return;
    room = assigned.room;
  }

  const assignedPieces = listArrangerChildPieces(room, table.id);
  assert.equal(assignedPieces.length, 12);
  assert.equal(
    new Set(assignedPieces.map((piece) => piece.transform.position.join(":"))).size,
    assignedPieces.length,
    "every capacity slot should receive a distinct local transform",
  );

  const rejected = assignArrangerMedia(room, table.id, room.media[0].id);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.room, room);
  if (!rejected.ok) assert.ok(rejected.issues.some((candidate) => candidate.code === "anchor-capacity"));
  assert.equal(compileSpatialRoom(room).ok, true);
});

test("rack Piece reorder swaps stable order and remaps rack anchors", () => {
  const blank = createBlankMobstarSpatialRoom();
  const added = addArrangerComponent(blank, "presence.retail-rack");
  assert.equal(added.ok, true);
  if (!added.ok) return;
  const rack = added.room.placements.find((placement) => placement.componentId === "presence.retail-rack");
  assert.ok(rack);
  const first = assignArrangerMedia(added.room, rack.id, "mobstar-media-a");
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const second = assignArrangerMedia(first.room, rack.id, "mobstar-media-b");
  assert.equal(second.ok, true);
  if (!second.ok) return;

  const before = listArrangerChildPieces(second.room, rack.id);
  assert.deepEqual(before.map((piece) => piece.anchor.anchorId), ["rack-slot-01", "rack-slot-02"]);
  const reordered = reorderArrangerPiece(second.room, rack.id, before[1].id, -1);
  assert.equal(reordered.ok, true);
  if (!reordered.ok) return;
  const after = listArrangerChildPieces(reordered.room, rack.id);
  assert.deepEqual(after.map((piece) => piece.id), [before[1].id, before[0].id]);
  assert.deepEqual(after.map((piece) => piece.anchor.anchorId), ["rack-slot-01", "rack-slot-02"]);
  assert.equal(compileSpatialRoom(reordered.room).ok, true);
});

test("a nonzero-offset Piece follows a rotated parent using composed local transforms", () => {
  const added = addArrangerComponent(createBlankMobstarSpatialRoom(), "presence.display-table");
  assert.equal(added.ok, true);
  if (!added.ok) return;
  const table = added.room.placements.find((placement) => placement.componentId === "presence.display-table");
  assert.ok(table);
  const moved = moveArrangerPlacementTo(added.room, table.id, -4.5, 3);
  assert.equal(moved.ok, true);
  if (!moved.ok) return;
  const first = assignArrangerMedia(moved.room, table.id, "mobstar-media-a");
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const second = assignArrangerMedia(first.room, table.id, "mobstar-media-b");
  assert.equal(second.ok, true);
  if (!second.ok) return;
  const shearCandidate = {
    ...second.room,
    placements: second.room.placements.map((placement) => placement.id === table.id
      ? { ...placement, transform: { ...placement.transform, scale: [1.5, 1, 1] as const } }
      : placement),
  };
  const shearResult = compileSpatialRoom(shearCandidate);
  assert.equal(shearResult.ok, false);
  if (!shearResult.ok) assert.ok(shearResult.issues.some((issue) => issue.code === "shear-transform"));

  const scaledRoom = {
    ...second.room,
    placements: second.room.placements.map((placement) => placement.id === table.id
      ? {
          ...placement,
          transform: {
            ...placement.transform,
            position: [placement.transform.position[0], 0.675, placement.transform.position[2]] as const,
            scale: [1.5, 1.5, 1.5] as const,
          },
        }
      : placement),
  };
  assert.equal(compileSpatialRoom(scaledRoom).ok, true);
  const rotated = rotateArrangerPlacement(scaledRoom, table.id, 1);
  assert.equal(rotated.ok, true);
  if (!rotated.ok) return;

  const rotatedTable = rotated.room.placements.find((placement) => placement.id === table.id);
  const child = listArrangerChildPieces(rotated.room, table.id)[0];
  assert.ok(rotatedTable);
  assert.notEqual(child.transform.position[0], 0);
  const resolved = resolveSpatialPlacementTransform(rotated.room, child);
  const yaw = rotatedTable.transform.rotation[1];
  const localX = child.transform.position[0] * rotatedTable.transform.scale[0];
  assert.ok(Math.abs(resolved.position[0] - (rotatedTable.transform.position[0] + Math.cos(yaw) * localX)) < 1e-9);
  assert.ok(Math.abs(resolved.position[2] - (rotatedTable.transform.position[2] - Math.sin(yaw) * localX)) < 1e-9);
  assert.ok(Math.abs(resolved.scale[0] - child.transform.scale[0] * rotatedTable.transform.scale[0]) < 1e-9);
  assert.equal(compileSpatialRoom(rotated.room).ok, true);
});
