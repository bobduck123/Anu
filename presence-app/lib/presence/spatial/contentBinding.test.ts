import test from "node:test";
import assert from "node:assert/strict";

import { arrangeSpatialContentBindings } from "./arrangements.ts";
import {
  addArrangerOption,
  addArrangerComponent,
  bindArrangerContentToHost,
  bindArrangerPieceToHost,
  createArrangerPieceLibraryItem,
  createBlankMobstarSpatialRoom,
  listArrangerHostSupportedPieceTypes,
} from "./arranger.ts";
import { compileSpatialRoom } from "./compile.ts";
import { SPATIAL_COMPONENT_CATALOG } from "./registry.ts";
import { createSpatialDraftEnvelope, decodeSpatialDraftEnvelope, encodeSpatialDraftEnvelope } from "./storage.ts";
import { validateSpatialRoomDefinition } from "./validate.ts";
import type { SpatialContentBinding, SpatialPlacement, SpatialRoomDefinition } from "./model.ts";

const sampleBindings: readonly SpatialContentBinding[] = [
  binding("piece-a", 0),
  binding("piece-b", 1),
  binding("piece-c", 2),
  binding("piece-d", 3),
  binding("piece-e", 4),
];

test("grid, row and wall-grid content arrangements are deterministic", () => {
  for (const kind of ["grid", "row", "wall-grid"] as const) {
    const first = arrangeSpatialContentBindings({
      hostPlacementId: "archive-wall",
      arrangement: { kind, overflowPolicy: "overflow-list", capacity: 4, seed: "stable" },
      bindings: sampleBindings,
      hostDimensions: { width: 4, height: 2, depth: 0.2 },
      anchorKind: kind === "row" ? "surface" : "wall",
    });
    const second = arrangeSpatialContentBindings({
      hostPlacementId: "archive-wall",
      arrangement: { kind, overflowPolicy: "overflow-list", capacity: 4, seed: "stable" },
      bindings: [...sampleBindings].reverse(),
      hostDimensions: { width: 4, height: 2, depth: 0.2 },
      anchorKind: kind === "row" ? "surface" : "wall",
    });
    assert.deepEqual(first, second, kind);
    assert.equal(first.slots.length, sampleBindings.length);
    assert.equal(first.overflow.overflowCount, 1);
    assert.equal(first.fallbackRows.length, sampleBindings.length);
  }
});

test("overflow is explicit and never silently drops bound content", () => {
  const result = arrangeSpatialContentBindings({
    hostPlacementId: "archive-wall",
    arrangement: { kind: "wall-grid", overflowPolicy: "paginate", capacity: 2, pageSize: 2 },
    bindings: sampleBindings,
    hostDimensions: { width: 4, height: 2, depth: 0.2 },
    anchorKind: "wall",
  });
  assert.equal(result.slots.filter((slot) => slot.visible).length, 2);
  assert.equal(result.slots.filter((slot) => slot.overflowed).length, 3);
  assert.equal(result.overflow.policy, "paginate");
  assert.equal(result.overflow.pageCount, 3);
  assert.deepEqual(result.fallbackRows.map((row) => row.label), sampleBindings.map((item) => item.label));
});

test("spherical content arrangements derive deterministic orbital slots for 3, 12 and 40 bindings", () => {
  for (const count of [3, 12, 40]) {
    const bindings = Array.from({ length: count }, (_, index) => binding(`sphere-piece-${index}`, index));
    const first = arrangeSpatialContentBindings({
      hostPlacementId: "spherical-gallery",
      arrangement: { kind: "spherical", overflowPolicy: "show-all-if-possible", capacity: count, seed: "sphere-proof" },
      bindings,
      hostDimensions: { width: 4.8, height: 4.8, depth: 4.8 },
      anchorKind: "projection",
    });
    const second = arrangeSpatialContentBindings({
      hostPlacementId: "spherical-gallery",
      arrangement: { kind: "spherical", overflowPolicy: "show-all-if-possible", capacity: count, seed: "sphere-proof" },
      bindings: [...bindings].reverse(),
      hostDimensions: { width: 4.8, height: 4.8, depth: 4.8 },
      anchorKind: "projection",
    });
    assert.deepEqual(first, second);
    assert.equal(first.slots.length, count);
    assert.equal(first.fallbackRows.length, count);
    assert.equal(first.overflow.overflowCount, 0);
    assert.equal(first.slots.every((slot) => slot.anchorKind === "projection"), true);
    assert.ok(new Set(first.slots.map((slot) => slot.transform.position[2].toFixed(3))).size > 1);
  }
});

test("spherical gallery binding compiles overflow without storing derived transforms", () => {
  let room = addHost(createBlankMobstarSpatialRoom(), "presence.spherical-gallery");
  const host = room.placements.find((placement) => placement.componentId === "presence.spherical-gallery");
  assert.ok(host);

  const mediaIds = ["mobstar-media-a", "mobstar-media-b", "mobstar-media-poster", "presence-sample-audio", "presence-sample-video"];
  for (let index = 0; index < 20; index += 1) {
    const mediaId = mediaIds[index % mediaIds.length];
    const actionKind = mediaId === "presence-sample-audio" ? "listen" : mediaId === "presence-sample-video" ? "watch" : "open-link";
    const result = bindArrangerContentToHost(room, host.id, {
      mediaId,
      arrangementKind: "spherical",
      overflowPolicy: "overflow-list",
      actionKind,
      actionLabel: `Open spherical item ${index}`,
      href: `https://example.com/spherical/${index}`,
    });
    assert.equal(result.ok, true, `bind ${index}`);
    if (result.ok) room = result.room;
  }
  room = {
    ...room,
    placements: room.placements.map((placement) => placement.id === host.id && placement.contentArrangement
      ? { ...placement, contentArrangement: { ...placement.contentArrangement, capacity: 12 } }
      : placement),
  };

  const serializedLayout = JSON.stringify(room);
  assert.equal(room.placements.some((placement) => placement.id.startsWith("binding-")), false);
  assert.doesNotMatch(serializedLayout, /\.(?:glb|gltf)(?:["?#]|$)/i);
  assert.equal(Buffer.byteLength(serializedLayout, "utf8") < 100 * 1024, true);

  const compiled = compileSpatialRoom(room);
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;
  const arrangement = compiled.plan.contentBindingArrangements.find((candidate) => candidate.hostPlacementId === host.id);
  assert.ok(arrangement);
  assert.equal(arrangement.kind, "spherical");
  assert.equal(arrangement.slots.length, 20);
  assert.equal(arrangement.overflow.visibleCount, 12);
  assert.equal(arrangement.overflow.overflowCount, 8);
  assert.equal(arrangement.fallbackRows.length, 20);
  assert.equal(compiled.plan.items.filter((item) => item.parentPlacementId === host.id && item.componentId === "presence.piece-plane").length, 20);
  assert.equal(compiled.plan.semanticFallback.filter((row) => row.placementId.startsWith(`binding-${host.id}`)).length, 20);
  assert.ok(compiled.plan.items.some((item) => item.actions.some((action) => action.kind === "listen")));
  assert.ok(compiled.plan.items.some((item) => item.actions.some((action) => action.kind === "watch")));
  assert.ok(compiled.plan.items.some((item) => item.actions.some((action) => action.kind === "open-link")));

  const catalog = SPATIAL_COMPONENT_CATALOG.find((record) => record.componentId === "presence.spherical-gallery");
  assert.equal(catalog?.creativeStatus, "prototype");
  assert.equal(catalog?.admissionStatus, "not-evaluated");
  assert.equal(catalog?.rawAssetIncluded, false);
});

test("host bindings persist and compile without storing derived child placements", () => {
  const room = addHost(createBlankMobstarSpatialRoom(), "presence.archive-wall");
  const host = room.placements.find((placement) => placement.componentId === "presence.archive-wall");
  assert.ok(host);

  const bound = bindArrangerContentToHost(room, host.id, {
    mediaId: "mobstar-media-a",
    arrangementKind: "wall-grid",
    overflowPolicy: "overflow-list",
    actionKind: "open-link",
    actionLabel: "Open bound work",
    href: "https://example.com/bound-work",
  });
  assert.equal(bound.ok, true);
  if (!bound.ok) return;
  assert.equal(bound.room.contentBindings?.length, 1);
  assert.equal(bound.room.placements.some((placement) => placement.id.startsWith("binding-")), false);

  const compiled = compileSpatialRoom(bound.room);
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;
  assert.equal(compiled.plan.contentBindingArrangements.length, 1);
  assert.ok(compiled.plan.items.some((item) => item.placementId.startsWith(`binding-${host.id}`)));
  assert.ok(compiled.plan.semanticFallback.some((row) => row.label === "Abstract generated garment placeholder A"));

  const envelope = createSpatialDraftEnvelope(bound.room);
  const decoded = decodeSpatialDraftEnvelope(encodeSpatialDraftEnvelope(envelope));
  assert.equal(decoded.ok, true);
  if (decoded.ok) assert.deepEqual(decoded.value.room.contentBindings, bound.room.contentBindings);
});

test("piece-plane and framed work receive owner content through the binding path", () => {
  const planeRoom = addHost(createBlankMobstarSpatialRoom(), "presence.framed-media");
  const frame = planeRoom.placements.find((placement) => placement.componentId === "presence.framed-media");
  assert.ok(frame);
  const bound = bindArrangerContentToHost(planeRoom, frame.id, {
    mediaId: "mobstar-media-poster",
    arrangementKind: "wall-grid",
    overflowPolicy: "show-all-if-possible",
    actionKind: "enquire",
    actionLabel: "Enquire about framed work",
    href: "https://example.com/enquire",
  });
  assert.equal(bound.ok, true);
  if (!bound.ok) return;
  const compiled = compileSpatialRoom(bound.room);
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;
  const item = compiled.plan.items.find((candidate) => candidate.placementId.startsWith(`binding-${frame.id}`));
  assert.equal(item?.componentId, "presence.piece-plane");
  assert.equal(item?.actions[0]?.kind, "enquire");
});

test("archive wall uses the arrangement contract and reports overflow", () => {
  const room = addHost(createBlankMobstarSpatialRoom(), "presence.archive-wall");
  const host = room.placements.find((placement) => placement.componentId === "presence.archive-wall");
  assert.ok(host);
  let current = room;
  for (const mediaId of ["mobstar-media-a", "mobstar-media-b", "mobstar-media-poster"]) {
    const result = bindArrangerContentToHost(current, host.id, {
      mediaId,
      arrangementKind: "wall-grid",
      overflowPolicy: "overflow-list",
      actionKind: "open-link",
      actionLabel: `Open ${mediaId}`,
      href: `https://example.com/${mediaId}`,
    });
    assert.equal(result.ok, true);
    if (result.ok) current = result.room;
  }
  current = {
    ...current,
    placements: current.placements.map((placement) => placement.id === host.id && placement.contentArrangement
      ? { ...placement, contentArrangement: { ...placement.contentArrangement, capacity: 2 } }
      : placement),
  };
  const compiled = compileSpatialRoom(current);
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;
  const arrangement = compiled.plan.contentBindingArrangements[0];
  assert.equal(arrangement.hostPlacementId, host.id);
  assert.equal(arrangement.overflow.overflowCount, 1);
  assert.equal(arrangement.fallbackRows.length, 3);
});

test("audio and video media kinds validate and listen/watch/enquire actions are preserved", () => {
  const room = createBlankMobstarSpatialRoom();
  const valid = validateSpatialRoomDefinition(room);
  assert.equal(valid.ok, true);
  const withHost = addHost(room, "presence.listening-station");
  const host = withHost.placements.find((placement) => placement.componentId === "presence.listening-station");
  assert.ok(host);
  const listened = bindArrangerContentToHost(withHost, host.id, {
    mediaId: "presence-sample-audio",
    arrangementKind: "row",
    overflowPolicy: "overflow-list",
    actionKind: "listen",
    actionLabel: "Listen sample",
    href: "https://example.com/audio",
  });
  assert.equal(listened.ok, true);
  if (!listened.ok) return;
  const watched = bindArrangerContentToHost(listened.room, host.id, {
    mediaId: "presence-sample-video",
    arrangementKind: "row",
    overflowPolicy: "overflow-list",
    actionKind: "watch",
    actionLabel: "Watch sample",
    href: "https://example.com/video",
  });
  assert.equal(watched.ok, true);
  if (!watched.ok) return;
  const compiled = compileSpatialRoom(watched.room);
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;
  assert.ok(compiled.plan.items.some((item) => item.actions.some((action) => action.kind === "listen")));
  assert.ok(compiled.plan.items.some((item) => item.actions.some((action) => action.kind === "watch")));
  assert.ok(compiled.plan.budgets.layoutJsonBytes < 100 * 1024);
});

test("binding contract rejects incompatible media and raw model/admission drift", () => {
  const room = addHost(createBlankMobstarSpatialRoom(), "presence.listening-station");
  const host = room.placements.find((placement) => placement.componentId === "presence.listening-station");
  assert.ok(host);
  const rejected = bindArrangerContentToHost(room, host.id, {
    mediaId: "mobstar-media-a",
    arrangementKind: "row",
    overflowPolicy: "overflow-list",
    actionKind: "listen",
    actionLabel: "Listen wrong media",
    href: "https://example.com/listen",
  });
  assert.equal(rejected.ok, false);
  if (!rejected.ok) {
    assert.equal(rejected.room, room);
    assert.equal(rejected.issues[0].code, "media-kind");
  }
  const serialized = JSON.stringify(room);
  assert.doesNotMatch(serialized, /\.(?:glb|gltf)(?:["?#]|$)/i);
  for (const record of SPATIAL_COMPONENT_CATALOG.filter((item) => ["presence.archive-wall", "presence.listening-station"].includes(item.componentId))) {
    assert.equal(record.admissionStatus, "not-evaluated");
  }
});

test("internal piece library creates reusable pieces and binds compatible hosts", () => {
  let room = createBlankMobstarSpatialRoom();
  const frameRoom = addHost(room, "presence.framed-media");
  const frame = frameRoom.placements.find((placement) => placement.componentId === "presence.framed-media");
  assert.ok(frame);
  room = frameRoom;

  const imagePiece = createArrangerPieceLibraryItem(room, {
    pieceType: "image",
    label: "Internal library image",
    caption: "Operator-created image piece.",
    mediaId: "mobstar-media-a",
    actionKind: "open-link",
    actionLabel: "Open image piece",
    href: "https://example.com/library-image",
    tags: ["library", "image"],
  });
  assert.equal(imagePiece.ok, true);
  if (!imagePiece.ok) return;
  room = imagePiece.room;
  const createdImage = room.pieceLibrary?.find((piece) => piece.label === "Internal library image");
  assert.ok(createdImage);
  assert.equal(createdImage.pieceType, "image");
  assert.deepEqual(createdImage.mediaRefs, ["mobstar-media-a"]);

  const frameBinding = bindArrangerPieceToHost(room, frame.id, {
    pieceId: createdImage.id,
    arrangementKind: "wall-grid",
    overflowPolicy: "overflow-list",
  });
  assert.equal(frameBinding.ok, true);
  if (!frameBinding.ok) return;
  room = frameBinding.room;
  assert.equal(room.contentBindings?.at(-1)?.pieceRef, `piece-library:${createdImage.id}`);

  const archiveRoom = addHost(room, "presence.archive-wall");
  const archive = archiveRoom.placements.find((placement) => placement.componentId === "presence.archive-wall");
  assert.ok(archive);
  room = archiveRoom;
  const archivePiece = createArrangerPieceLibraryItem(room, {
    pieceType: "archive-item",
    label: "Internal archive item",
    mediaId: "mobstar-media-poster",
    actionKind: "enquire",
    actionLabel: "Enquire archive item",
    href: "https://example.com/archive",
  });
  assert.equal(archivePiece.ok, true);
  if (!archivePiece.ok) return;
  room = archivePiece.room;
  const createdArchive = room.pieceLibrary?.find((piece) => piece.label === "Internal archive item");
  assert.ok(createdArchive);
  const archiveBinding = bindArrangerPieceToHost(room, archive.id, {
    pieceId: createdArchive.id,
    arrangementKind: "wall-grid",
    overflowPolicy: "overflow-list",
  });
  assert.equal(archiveBinding.ok, true);
  if (!archiveBinding.ok) return;
  room = archiveBinding.room;

  const listeningRoom = addHost(room, "presence.listening-station");
  const listening = listeningRoom.placements.find((placement) => placement.componentId === "presence.listening-station");
  assert.ok(listening);
  room = listeningRoom;
  const audioPiece = createArrangerPieceLibraryItem(room, {
    pieceType: "audio",
    label: "Internal audio item",
    caption: "No playback proof is claimed.",
    mediaId: "presence-sample-audio",
    actionKind: "listen",
    actionLabel: "Listen internal audio",
    href: "https://example.com/audio",
  });
  assert.equal(audioPiece.ok, true);
  if (!audioPiece.ok) return;
  room = audioPiece.room;
  const createdAudio = room.pieceLibrary?.find((piece) => piece.label === "Internal audio item");
  assert.ok(createdAudio);
  const listeningBinding = bindArrangerPieceToHost(room, listening.id, {
    pieceId: createdAudio.id,
    arrangementKind: "row",
    overflowPolicy: "overflow-list",
  });
  assert.equal(listeningBinding.ok, true);
  if (!listeningBinding.ok) return;
  room = listeningBinding.room;

  const compiled = compileSpatialRoom(room);
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;
  assert.ok(compiled.plan.semanticFallback.some((row) => row.label === "Internal library image" && row.description?.includes("Piece type: image.")));
  assert.ok(compiled.plan.semanticFallback.some((row) => row.label === "Internal audio item" && row.description?.includes("Piece type: audio.")));
  assert.ok(compiled.plan.items.some((item) => item.actions.some((action) => action.kind === "listen")));

  const envelope = createSpatialDraftEnvelope(room);
  const decoded = decodeSpatialDraftEnvelope(encodeSpatialDraftEnvelope(envelope));
  assert.equal(decoded.ok, true);
  if (decoded.ok) {
    assert.deepEqual(decoded.value.room.pieceLibrary, room.pieceLibrary);
    assert.deepEqual(decoded.value.room.contentBindings, room.contentBindings);
  }
});

test("piece library rejects unsafe and incompatible bindings without corrupting draft", () => {
  let room = addHost(createBlankMobstarSpatialRoom(), "presence.listening-station");
  const listening = room.placements.find((placement) => placement.componentId === "presence.listening-station");
  assert.ok(listening);

  const unsafe = createArrangerPieceLibraryItem(room, {
    pieceType: "image",
    label: "Unsafe link piece",
    mediaId: "mobstar-media-a",
    actionKind: "open-link",
    actionLabel: "Open unsafe",
    href: "http://example.com/unsafe",
  });
  assert.equal(unsafe.ok, false);
  if (!unsafe.ok) {
    assert.equal(unsafe.room, room);
    assert.equal(unsafe.issues[0].code, "unsafe-link");
  }

  const imagePiece = createArrangerPieceLibraryItem(room, {
    pieceType: "image",
    label: "Wrong host image",
    mediaId: "mobstar-media-a",
    actionKind: "open-link",
    actionLabel: "Open image",
    href: "https://example.com/image",
  });
  assert.equal(imagePiece.ok, true);
  if (!imagePiece.ok) return;
  room = imagePiece.room;
  const createdImage = room.pieceLibrary?.find((piece) => piece.label === "Wrong host image");
  assert.ok(createdImage);
  const before = room;
  const rejected = bindArrangerPieceToHost(room, listening.id, {
    pieceId: createdImage.id,
    arrangementKind: "row",
    overflowPolicy: "overflow-list",
  });
  assert.equal(rejected.ok, false);
  if (!rejected.ok) {
    assert.equal(rejected.room, before);
    assert.equal(rejected.issues[0].code, "piece-host-compatibility");
  }
  assert.deepEqual(room.contentBindings, []);
});

test("piece library binds projection and spherical galleries without raw blobs or content loss", () => {
  let room = addHost(createBlankMobstarSpatialRoom(), "presence.projection-wall");
  const projection = room.placements.find((placement) => placement.componentId === "presence.projection-wall");
  assert.ok(projection);
  const videoPiece = createArrangerPieceLibraryItem(room, {
    pieceType: "video",
    label: "Internal video item",
    mediaId: "presence-sample-video",
    actionKind: "watch",
    actionLabel: "Watch internal video",
    href: "https://example.com/video",
  });
  assert.equal(videoPiece.ok, true);
  if (!videoPiece.ok) return;
  room = videoPiece.room;
  const createdVideo = room.pieceLibrary?.find((piece) => piece.label === "Internal video item");
  assert.ok(createdVideo);
  const projectionBinding = bindArrangerPieceToHost(room, projection.id, {
    pieceId: createdVideo.id,
    arrangementKind: "wall-grid",
    overflowPolicy: "overflow-list",
  });
  assert.equal(projectionBinding.ok, true);
  if (!projectionBinding.ok) return;
  room = projectionBinding.room;

  room = addHost(room, "presence.spherical-gallery");
  const sphere = room.placements.find((placement) => placement.componentId === "presence.spherical-gallery");
  assert.ok(sphere);
  const reusablePieceIds: string[] = [createdVideo.id];
  for (let index = 0; index < 20; index += 1) {
    const piece = createArrangerPieceLibraryItem(room, {
      pieceType: index % 5 === 0 ? "text" : "image",
      label: `Sphere library piece ${index}`,
      caption: `Spherical fallback item ${index}`,
      mediaId: index % 5 === 0 ? undefined : "mobstar-media-a",
      actionKind: "open-link",
      actionLabel: `Open sphere piece ${index}`,
      href: `https://example.com/sphere-piece/${index}`,
    });
    assert.equal(piece.ok, true, `create ${index}`);
    if (piece.ok) {
      room = piece.room;
      const created = room.pieceLibrary?.find((candidate) => candidate.label === `Sphere library piece ${index}`);
      assert.ok(created);
      reusablePieceIds.push(created.id);
    }
  }
  for (const pieceId of reusablePieceIds) {
    const result = bindArrangerPieceToHost(room, sphere.id, {
      pieceId,
      arrangementKind: "spherical",
      overflowPolicy: "overflow-list",
    });
    assert.equal(result.ok, true, `bind ${pieceId}`);
    if (result.ok) room = result.room;
  }
  room = {
    ...room,
    placements: room.placements.map((placement) => placement.id === sphere.id && placement.contentArrangement
      ? { ...placement, contentArrangement: { ...placement.contentArrangement, capacity: 12 } }
      : placement),
  };
  const compiled = compileSpatialRoom(room);
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;
  const sphericalArrangement = compiled.plan.contentBindingArrangements.find((arrangement) => arrangement.hostPlacementId === sphere.id);
  assert.ok(sphericalArrangement);
  assert.equal(sphericalArrangement.slots.length, reusablePieceIds.length);
  assert.equal(sphericalArrangement.overflow.overflowCount, reusablePieceIds.length - 12);
  assert.equal(sphericalArrangement.fallbackRows.length, reusablePieceIds.length);
  assert.ok(compiled.plan.items.some((item) => item.actions.some((action) => action.kind === "watch")));
  assert.equal(compiled.plan.budgets.layoutJsonBytes < 100 * 1024, true);
  const serialized = JSON.stringify(room);
  assert.doesNotMatch(serialized, /data:/i);
  assert.doesNotMatch(serialized, /\.(?:glb|gltf)(?:["?#]|$)/i);
  assert.equal(room.placements.some((placement) => placement.id.startsWith("binding-")), false);
});

test("garment pieces bind through rack anchors and remain durable through fallback and reload", () => {
  let room = addHost(createBlankMobstarSpatialRoom(), "presence.suspended-rack");
  const rack = room.placements.find((placement) => placement.componentId === "presence.suspended-rack");
  assert.ok(rack);
  assert.ok(listArrangerHostSupportedPieceTypes(rack).includes("garment"));
  assert.ok(!listArrangerHostSupportedPieceTypes(rack).includes("audio"));

  const garmentPiece = createArrangerPieceLibraryItem(room, {
    pieceType: "garment",
    label: "Internal rack garment",
    caption: "Fixture garment bound to a suspended rack.",
    mediaId: "mobstar-media-a",
    actionKind: "open-link",
    actionLabel: "Open garment detail",
    href: "https://example.com/garment-detail",
  });
  assert.equal(garmentPiece.ok, true);
  if (!garmentPiece.ok) return;
  room = garmentPiece.room;
  const createdGarment = room.pieceLibrary?.find((piece) => piece.label === "Internal rack garment");
  assert.ok(createdGarment);
  assert.equal(createdGarment.pieceType, "garment");

  const bound = bindArrangerPieceToHost(room, rack.id, {
    pieceId: createdGarment.id,
    arrangementKind: "row",
    overflowPolicy: "overflow-list",
  });
  assert.equal(bound.ok, true);
  if (!bound.ok) return;
  room = bound.room;
  assert.equal(room.placements.some((placement) => placement.id.startsWith("binding-")), false);
  assert.equal(room.contentBindings?.at(-1)?.pieceRef, `piece-library:${createdGarment.id}`);

  const compiled = compileSpatialRoom(room);
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;
  const arrangement = compiled.plan.contentBindingArrangements.find((candidate) => candidate.hostPlacementId === rack.id);
  assert.ok(arrangement);
  assert.equal(arrangement.slots[0]?.anchorKind, "rack");
  // Garments now compile through the invisible carrier, not a bare piece plane.
  assert.ok(compiled.plan.items.some((item) => (
    item.parentPlacementId === rack.id
    && item.componentId === "presence.garment-hanger"
    && item.primaryMaterialSlot === "fabric"
    && item.garment?.articleType === "generic"
  )));
  assert.ok(compiled.plan.semanticFallback.some((row) => (
    row.label === "Internal rack garment"
    && row.description?.includes("Piece type: garment.")
    && row.actionRefs.length === 1
  )));
  assert.equal(compiled.plan.budgets.layoutJsonBytes < 100 * 1024, true);

  const decoded = decodeSpatialDraftEnvelope(encodeSpatialDraftEnvelope(createSpatialDraftEnvelope(room)));
  assert.equal(decoded.ok, true);
  if (decoded.ok) {
    assert.deepEqual(decoded.value.room.pieceLibrary, room.pieceLibrary);
    assert.deepEqual(decoded.value.room.contentBindings, room.contentBindings);
  }
  const rackCatalog = SPATIAL_COMPONENT_CATALOG.find((record) => record.componentId === "presence.suspended-rack");
  const hangerCatalog = SPATIAL_COMPONENT_CATALOG.find((record) => record.componentId === "presence.garment-hanger");
  assert.equal(rackCatalog?.admissionStatus, "not-evaluated");
  assert.equal(hangerCatalog?.admissionStatus, "not-evaluated");
});

test("garment hanger has a proven rack-to-hanger-to-garment binding path", () => {
  let room = addHost(createBlankMobstarSpatialRoom(), "presence.suspended-rack");
  const rack = room.placements.find((placement) => placement.componentId === "presence.suspended-rack");
  assert.ok(rack);
  room = addGarmentHangerChild(room, rack.id);
  const hanger = room.placements.find((placement) => placement.id === "qa-garment-hanger");
  assert.ok(hanger);
  assert.ok(listArrangerHostSupportedPieceTypes(hanger).includes("garment"));

  const garmentPiece = createArrangerPieceLibraryItem(room, {
    pieceType: "garment",
    label: "Hanger-carried garment",
    mediaId: "mobstar-media-b",
    actionKind: "enquire",
    actionLabel: "Ask about hanger garment",
    href: "https://example.com/hanger-garment",
  });
  assert.equal(garmentPiece.ok, true);
  if (!garmentPiece.ok) return;
  room = garmentPiece.room;
  const createdGarment = room.pieceLibrary?.find((piece) => piece.label === "Hanger-carried garment");
  assert.ok(createdGarment);

  const bound = bindArrangerPieceToHost(room, hanger.id, {
    pieceId: createdGarment.id,
    arrangementKind: "row",
    overflowPolicy: "reject-over-capacity",
  });
  assert.equal(bound.ok, true);
  if (!bound.ok) return;
  const compiled = compileSpatialRoom(bound.room);
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;
  const arrangement = compiled.plan.contentBindingArrangements.find((candidate) => candidate.hostPlacementId === hanger.id);
  assert.ok(arrangement);
  assert.equal(arrangement.slots[0]?.anchorKind, "surface");
  assert.ok(compiled.plan.semanticFallback.some((row) => row.label === "Hanger-carried garment" && row.description?.includes("Piece type: garment.")));
});

test("compatibility matrix accepts framed video and listening collections without playback claims", () => {
  let room = addHost(createBlankMobstarSpatialRoom(), "presence.framed-media");
  const frame = room.placements.find((placement) => placement.componentId === "presence.framed-media");
  assert.ok(frame);
  assert.ok(listArrangerHostSupportedPieceTypes(frame).includes("video"));
  const videoPiece = createArrangerPieceLibraryItem(room, {
    pieceType: "video",
    label: "Framed campaign video",
    mediaId: "presence-sample-video",
    actionKind: "watch",
    actionLabel: "Watch campaign video",
    href: "https://example.com/campaign-video",
  });
  assert.equal(videoPiece.ok, true);
  if (!videoPiece.ok) return;
  room = videoPiece.room;
  const createdVideo = room.pieceLibrary?.find((piece) => piece.label === "Framed campaign video");
  assert.ok(createdVideo);
  const frameBinding = bindArrangerPieceToHost(room, frame.id, {
    pieceId: createdVideo.id,
    arrangementKind: "wall-grid",
    overflowPolicy: "overflow-list",
  });
  assert.equal(frameBinding.ok, true);
  if (!frameBinding.ok) return;
  room = frameBinding.room;

  room = addHost(room, "presence.listening-station");
  const listening = room.placements.find((placement) => placement.componentId === "presence.listening-station");
  assert.ok(listening);
  assert.ok(listArrangerHostSupportedPieceTypes(listening).includes("collection"));
  const collectionPiece = createArrangerPieceLibraryItem(room, {
    pieceType: "collection",
    label: "Release playlist collection",
    actionKind: "open-link",
    actionLabel: "Open release collection",
    href: "https://example.com/release-collection",
  });
  assert.equal(collectionPiece.ok, true);
  if (!collectionPiece.ok) return;
  room = collectionPiece.room;
  const createdCollection = room.pieceLibrary?.find((piece) => piece.label === "Release playlist collection");
  assert.ok(createdCollection);
  const listeningBinding = bindArrangerPieceToHost(room, listening.id, {
    pieceId: createdCollection.id,
    arrangementKind: "row",
    overflowPolicy: "overflow-list",
  });
  assert.equal(listeningBinding.ok, true);
  if (!listeningBinding.ok) return;
  room = listeningBinding.room;

  const compiled = compileSpatialRoom(room);
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;
  assert.ok(compiled.plan.items.some((item) => item.actions.some((action) => action.kind === "watch" && action.label === "Watch campaign video")));
  assert.ok(compiled.plan.items.some((item) => item.actions.some((action) => action.kind === "open-link" && action.label === "Open release collection")));
  assert.ok(compiled.plan.semanticFallback.some((row) => row.label === "Release playlist collection" && row.description?.includes("Piece type: collection.")));
});

test("garment rejection diagnostics are actionable and preserve the draft", () => {
  let room = addHost(createBlankMobstarSpatialRoom(), "presence.archive-wall");
  const archive = room.placements.find((placement) => placement.componentId === "presence.archive-wall");
  assert.ok(archive);
  assert.ok(!listArrangerHostSupportedPieceTypes(archive).includes("garment"));
  const garmentPiece = createArrangerPieceLibraryItem(room, {
    pieceType: "garment",
    label: "Rejected archive garment",
    mediaId: "mobstar-media-a",
  });
  assert.equal(garmentPiece.ok, true);
  if (!garmentPiece.ok) return;
  room = garmentPiece.room;
  const createdGarment = room.pieceLibrary?.find((piece) => piece.label === "Rejected archive garment");
  assert.ok(createdGarment);
  const before = room;
  const rejected = bindArrangerPieceToHost(room, archive.id, {
    pieceId: createdGarment.id,
    arrangementKind: "wall-grid",
    overflowPolicy: "overflow-list",
  });
  assert.equal(rejected.ok, false);
  if (!rejected.ok) {
    assert.equal(rejected.room, before);
    assert.equal(rejected.issues[0].code, "piece-host-compatibility");
    assert.match(rejected.issues[0].message, /cannot accept garment|but not garment/i);
    assert.match(rejected.issues[0].message, /accept|rack anchor|garment-capable/i);
  }
  assert.deepEqual(room.contentBindings, []);
});

function addHost(room: SpatialRoomDefinition, componentId: string): SpatialRoomDefinition {
  const optionIds: Record<string, string> = {
    "presence.archive-wall": "presence.object.archive-wall",
    "presence.listening-station": "presence.object.listening-station",
    "presence.suspended-rack": "presence.object.suspended-rack",
    "presence.spherical-gallery": "presence.display.spherical-gallery",
  };
  const added = optionIds[componentId]
    ? addArrangerOption(room, optionIds[componentId])
    : addArrangerComponent(room, componentId);
  assert.equal(added.ok, true, componentId);
  if (!added.ok) throw new Error(`Unable to add ${componentId}`);
  return added.room;
}

function addGarmentHangerChild(room: SpatialRoomDefinition, rackPlacementId: string): SpatialRoomDefinition {
  const rack = room.placements.find((placement) => placement.id === rackPlacementId);
  assert.ok(rack);
  const hanger: SpatialPlacement = {
    id: "qa-garment-hanger",
    order: room.placements.reduce((maximum, placement) => Math.max(maximum, placement.order), -1) + 1,
    componentId: "presence.garment-hanger",
    version: "1.0.0",
    transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [0.78, 0.78, 0.78] },
    anchor: { kind: "rack", parentPlacementId: rackPlacementId, anchorId: "garment-slot-01" },
    materialSlotOverrides: { fabric: "fabric-neutral", "rack-metal": "rack-matte-black" },
    actionRefs: [],
    visible: true,
    semanticLabel: "QA garment hanger",
  };
  const candidate = { ...room, revision: room.revision + 1, placements: [...room.placements, hanger] };
  const compiled = compileSpatialRoom(candidate);
  assert.equal(compiled.ok, true);
  if (!compiled.ok) throw new Error("Unable to add QA garment hanger");
  return compiled.room;
}

function binding(id: string, order: number): SpatialContentBinding {
  return {
    id,
    hostPlacementId: "archive-wall",
    pieceRef: `piece:${id}`,
    pieceType: "image",
    label: `Piece ${order}`,
    mediaRefs: [`media-${order}`],
    actionRefs: [`action-${order}`],
    order,
    arrangementRole: order === 0 ? "primary" : "supporting",
  };
}
