import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTHORING_CONTRAST_SKIN_ID,
  ARRANGER_COMPONENT_OPTIONS,
  addArrangerComponent,
  assignArrangerMaterialPreset,
  assignArrangerMedia,
  assignArrangerOpenLink,
  assignArrangerPlacementMedia,
  assignArrangerSkin,
  createBlankMobstarSpatialRoom,
  deleteArrangerPlacement,
  duplicateArrangerPlacement,
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
import { MOBSTAR_GATE4_SPATIAL_ROOM_FIXTURE } from "./fixtures/mobstarGate4.ts";
import { resolveSpatialPlacementTransform } from "./placement.ts";
import { spatialComponent, spatialComponentCatalogMetadata } from "./registry.ts";

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

test("all thirteen reusable arranger components use registered candidate refs and deterministic valid grid positions", () => {
  assert.equal(ARRANGER_COMPONENT_OPTIONS.length, 13);
  let room = createBlankMobstarSpatialRoom();
  for (const option of ARRANGER_COMPONENT_OPTIONS) {
    assert.ok(spatialComponent(option), `${option.componentId}@${option.version} must be registered`);
    assert.notEqual(spatialComponentCatalogMetadata(option)?.admissionStatus, "admitted");
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
  assert.equal(isArrangerMovablePlacement(MOBSTAR_SPATIAL_ROOM_FIXTURE.placements[2]), true);
  assert.equal(isArrangerMovablePlacement(MOBSTAR_SPATIAL_ROOM_FIXTURE.placements[0]), false);
});

test("wall fixtures can be moved and rotated while room foundations remain locked", () => {
  const added = addArrangerComponent(createBlankMobstarSpatialRoom(), "presence.wall-panel");
  assert.equal(added.ok, true);
  if (!added.ok) return;
  const wall = added.room.placements.find((placement) => placement.componentId === "presence.wall-panel");
  assert.ok(wall);
  const moved = moveArrangerPlacement(added.room, wall.id, 0.25, 1);
  assert.equal(moved.ok, true);
  if (!moved.ok) return;
  const rotated = rotateArrangerPlacement(moved.room, wall.id, 1);
  assert.equal(rotated.ok, true);
  assert.equal(moveArrangerPlacement(moved.room, "room-shell", 0.25, 0).ok, false);
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

test("duplicate and delete preserve a complete Piece/action/semantic subtree", () => {
  const added = addArrangerComponent(createBlankMobstarSpatialRoom(), "presence.display-table");
  assert.equal(added.ok, true);
  if (!added.ok) return;
  const table = added.room.placements.find((placement) => placement.componentId === "presence.display-table");
  assert.ok(table);
  const first = assignArrangerMedia(added.room, table.id, "mobstar-media-a");
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const second = assignArrangerMedia(first.room, table.id, "mobstar-media-b");
  assert.equal(second.ok, true);
  if (!second.ok) return;

  const duplicated = duplicateArrangerPlacement(second.room, table.id);
  assert.equal(duplicated.ok, true);
  if (!duplicated.ok) return;
  const tables = duplicated.room.placements.filter((placement) => placement.componentId === "presence.display-table");
  assert.equal(tables.length, 2);
  const copy = tables.find((placement) => placement.id !== table.id);
  assert.ok(copy);
  const copyChildren = listArrangerChildPieces(duplicated.room, copy.id);
  assert.equal(copyChildren.length, 2);
  assert.ok(copyChildren.every((piece) => piece.actionRefs.length === 1));
  assert.ok(copyChildren.every((piece) => duplicated.room.semanticFallback.some((item) => item.placementId === piece.id)));
  assert.equal(compileSpatialRoom(duplicated.room).ok, true);

  const deleted = deleteArrangerPlacement(duplicated.room, copy.id);
  assert.equal(deleted.ok, true);
  if (!deleted.ok) return;
  assert.equal(deleted.room.placements.some((placement) => placement.id === copy.id), false);
  assert.equal(copyChildren.some((piece) => deleted.room.placements.some((placement) => placement.id === piece.id)), false);
  assert.equal(copyChildren.some((piece) => deleted.room.actions.some((action) => piece.actionRefs.includes(action.id))), false);
  assert.equal(copyChildren.some((piece) => deleted.room.semanticFallback.some((item) => item.placementId === piece.id)), false);
  assert.equal(compileSpatialRoom(deleted.room).ok, true);
  assert.equal(deleteArrangerPlacement(deleted.room, "room-shell").ok, false);
});

test("delete retains an Action that is still referenced by a surviving placement", () => {
  const first = addArrangerComponent(createBlankMobstarSpatialRoom(), "presence.framed-media");
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const second = addArrangerComponent(first.room, "presence.framed-media");
  assert.equal(second.ok, true);
  if (!second.ok) return;
  const frames = second.room.placements.filter((placement) => placement.componentId === "presence.framed-media");
  assert.equal(frames.length, 2);
  const linked = assignArrangerOpenLink(second.room, frames[0].id, "Shared campaign", "https://example.com/shared");
  assert.equal(linked.ok, true);
  if (!linked.ok) return;
  const actionId = linked.room.placements.find((placement) => placement.id === frames[0].id)!.actionRefs[0];
  const sharedRoom = {
    ...linked.room,
    placements: linked.room.placements.map((placement) => placement.id === frames[1].id
      ? { ...placement, actionRefs: [actionId] }
      : placement),
    semanticFallback: [
      ...linked.room.semanticFallback,
      { placementId: frames[1].id, label: frames[1].semanticLabel, actionRefs: [actionId] },
    ],
  };
  assert.equal(compileSpatialRoom(sharedRoom).ok, true);
  const deleted = deleteArrangerPlacement(sharedRoom, frames[0].id);
  assert.equal(deleted.ok, true);
  if (!deleted.ok) return;
  assert.ok(deleted.room.actions.some((action) => action.id === actionId));
  assert.ok(deleted.room.placements.find((placement) => placement.id === frames[1].id)?.actionRefs.includes(actionId));
});

test("authored shelf and projection anchors accept Pieces without a second generated offset", () => {
  const shelfAdded = addArrangerComponent(createBlankMobstarSpatialRoom(), "presence.display-shelf");
  assert.equal(shelfAdded.ok, true);
  if (!shelfAdded.ok) return;
  const shelf = shelfAdded.room.placements.find((placement) => placement.componentId === "presence.display-shelf");
  assert.ok(shelf);
  const shelfAssigned = assignArrangerMedia(shelfAdded.room, shelf.id, shelfAdded.room.media[0].id);
  assert.equal(shelfAssigned.ok, true);

  const projection = MOBSTAR_GATE4_SPATIAL_ROOM_FIXTURE.placements.find((placement) => placement.componentId === "presence.projection-wall" && placement.version === "2.0.0");
  assert.ok(projection);
  const projectionAssigned = assignArrangerMedia(
    structuredClone(MOBSTAR_GATE4_SPATIAL_ROOM_FIXTURE),
    projection.id,
    MOBSTAR_GATE4_SPATIAL_ROOM_FIXTURE.media[0].id,
  );
  assert.equal(projectionAssigned.ok, true);
});

test("material, skin, direct media and HTTPS link assignments compile and fail closed", () => {
  const added = addArrangerComponent(createBlankMobstarSpatialRoom(), "presence.framed-media");
  assert.equal(added.ok, true);
  if (!added.ok) return;
  const frame = added.room.placements.find((placement) => placement.componentId === "presence.framed-media");
  assert.ok(frame);

  const material = assignArrangerMaterialPreset(added.room, frame.id, "poster-decal", "poster-archive");
  assert.equal(material.ok, true);
  if (!material.ok) return;
  assert.equal(assignArrangerMaterialPreset(material.room, frame.id, "poster-decal", "floor-dark-stone").ok, false);
  assert.equal(assignArrangerMaterialPreset(material.room, frame.id, "floor", "floor-dark-stone").ok, false);

  const skin = assignArrangerSkin(material.room, frame.id, AUTHORING_CONTRAST_SKIN_ID);
  assert.equal(skin.ok, true);
  if (!skin.ok) return;
  assert.equal(assignArrangerSkin(skin.room, frame.id, "missing-skin").ok, false);

  const media = assignArrangerPlacementMedia(skin.room, frame.id, "mobstar-media-campaign");
  assert.equal(media.ok, true);
  if (!media.ok) return;
  const linked = assignArrangerOpenLink(media.room, frame.id, "View campaign", "https://example.com/campaign");
  assert.equal(linked.ok, true);
  if (!linked.ok) return;
  const compiled = compileSpatialRoom(linked.room);
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;
  const frameItem = compiled.plan.items.find((item) => item.placementId === frame.id);
  assert.equal(frameItem?.media?.id, "mobstar-media-campaign");
  assert.equal(frameItem?.actions[0]?.kind, "open-link");
  assert.equal(frameItem?.materials.find((item) => item.slot === "poster-decal")?.color, "#30d5c8");
  assert.equal(frameItem?.materials.find((item) => item.slot === "rack-metal")?.color, "#f4b942");
  assert.ok(compiled.plan.semanticFallback.some((item) => item.placementId === frame.id && item.actionRefs.length === 1));
  assert.equal(assignArrangerOpenLink(linked.room, frame.id, "Unsafe", "http://example.com").ok, false);
  assert.equal(assignArrangerOpenLink(linked.room, frame.id, "Unsafe", "javascript:alert(1)").ok, false);
  assert.equal(assignArrangerPlacementMedia(linked.room, "floor", "mobstar-media-a").ok, false);
});

test("the same authored room compiles deterministically beneath layout and eager budgets", () => {
  const added = addArrangerComponent(createBlankMobstarSpatialRoom(), "presence.product-display-block");
  assert.equal(added.ok, true);
  if (!added.ok) return;
  const first = compileSpatialRoom(added.room);
  const second = compileSpatialRoom(JSON.parse(JSON.stringify(added.room)));
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (!first.ok || !second.ok) return;
  assert.equal(first.plan.fingerprint, second.plan.fingerprint);
  assert.ok(first.plan.budgets.layoutJsonBytes < 100 * 1024);
  assert.ok(first.plan.budgets.eagerCompressedAssetBytes < 3 * 1024 * 1024);
});
