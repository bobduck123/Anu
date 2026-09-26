import test from "node:test";
import assert from "node:assert/strict";
import {
  SPATIAL_MATERIAL_SLOTS,
  SPATIAL_MATERIAL_STYLE_PRESETS,
  materialPresetMatchesSlot,
} from "./materials.ts";
import {
  PRESENCE_ACTION_TYPES,
  PRESENCE_PIECE_TYPES,
  PRESENCE_ROOM_TYPES,
  PRESENCE_SPATIAL_AGGREGATE_VERSION,
  PRESENCE_SPATIAL_OBJECT_TYPES,
  PRESENCE_SURFACE_TYPES,
  PRESENCE_WALL_TYPES,
  type PresenceSpatialAggregate,
} from "./model.ts";
import { SPATIAL_COMPONENTS, SPATIAL_COMPONENT_CATALOG } from "./registry.ts";

test("first-usable aggregate carries the approved hierarchy and reserved event fields", () => {
  const aggregate: PresenceSpatialAggregate = {
    schemaVersion: PRESENCE_SPATIAL_AGGREGATE_VERSION,
    presence: { id: "presence-1", clientName: "Internal proof", slug: "internal-proof", status: "internal-preview", activeSpaceId: null, draftSpaceId: "space-1", createdAt: "2026-08-17T00:00:00.000Z", updatedAt: "2026-08-17T00:00:00.000Z" },
    spaces: [{ id: "space-1", presenceId: "presence-1", name: "Proof space", tier: "proof", sqmCapacity: 100, roomIds: ["room-1"], defaultRoomId: "room-1", theme: "internal", look: "white-gallery", createdAt: "2026-08-17T00:00:00.000Z", updatedAt: "2026-08-17T00:00:00.000Z" }],
    rooms: [{ id: "room-1", spaceId: "space-1", name: "Gallery", roomType: "gallery", dimensions: { width: 10, height: 4, depth: 12 }, wallIds: ["wall-1"], surfaceIds: ["surface-1"], objectIds: ["object-1"], cameraAnchorIds: ["camera-1"], lightingPreset: "gallery-neutral", materialPreset: "white-gallery", entryPoint: [0, 0, 5], connectedRoomIds: [], floorplan: { dimensions: { width: 10, height: 4, depth: 12 }, entryPoints: [{ id: "entry-1", position: [0, 0, 5], cameraAnchorId: "camera-1" }], gatheringZones: [{ id: "gathering-1", kind: "gathering", position: [0, 0, 0], dimensions: { width: 4, height: 2, depth: 4 }, capacityLimit: 12, hostAnchorIds: ["host-1"] }], stageZones: [] }, capacityLimit: 20, hostAnchorIds: ["host-1"], interactionEvents: [{ id: "event-1", eventType: "enter", sourceId: "entry-1", targetRef: "room:room-1", future: true }], roomState: "planned", guestPresenceState: "not-supported" }],
    walls: [{ id: "wall-1", roomId: "room-1", type: "gallery-wall", position: [0, 2, -6], rotation: [0, 0, 0], dimensions: { width: 10, height: 4, depth: 0.2 }, materialId: "material-1", canHostObjects: true, allowedObjectTypes: ["frame", "poster"], isDivider: false, hasDoorway: false, connectedRoomId: null }],
    surfaces: [{ id: "surface-1", roomId: "room-1", type: "plinth", position: [2, 0.5, 0], rotation: [0, 0, 0], dimensions: { width: 2, height: 1, depth: 1 }, materialId: "material-1", allowedPieceTypes: ["image", "product"], anchorPoints: [{ id: "surface-anchor-1", position: [0, 0.5, 0], rotation: [0, 0, 0], capacity: 2 }], capacity: 2 }],
    objects: [{ id: "object-1", roomId: "room-1", componentType: "plinth", position: [2, 0.5, 0], rotation: [0, 0, 0], scale: [1, 1, 1], materialOverrides: {}, surfaceId: "surface-1", wallId: null, placementMode: "floor", locked: false, layer: 1 }],
    pieces: [{ id: "piece-1", presenceId: "presence-1", pieceType: "event", title: "Future event placeholder", description: "Logical-only event proof.", mediaUrl: "generated:event/placeholder", thumbnailUrl: null, metadata: { capacity: 20 }, actionIds: ["action-1"], createdAt: "2026-08-17T00:00:00.000Z", updatedAt: "2026-08-17T00:00:00.000Z" }],
    actions: [{ id: "action-1", pieceId: "piece-1", actionType: "RSVP", label: "RSVP", target: "action:rsvp-placeholder", requiresAuth: false, requiresPayment: false, trackingKey: "internal-rsvp" }],
    materials: [{ id: "material-1", name: "Gallery wall", slot: "wall", presetId: "wall-gallery-white", baseColor: "#f0efe9", roughness: 0.82, metalness: 0.01, textureRefs: [] }],
    cameraAnchors: [{ id: "camera-1", roomId: "room-1", name: "Entry", position: [0, 2, 5], target: [0, 1.5, 0], fieldOfView: 55, isEntryPoint: true, hostAnchorId: "host-1" }],
    placementRules: [{ id: "rule-1", roomTypes: ["gallery"], objectTypes: ["plinth"], placementModes: ["floor"], allowedWallTypes: [], allowedSurfaceTypes: ["floor-zone"], capacityCost: 1, requiresHostAnchor: false, collision: "solid", minimumClearance: 0.5, interactionEvents: ["focus", "inspect"] }],
  };

  assert.equal(aggregate.rooms[0].floorplan.gatheringZones[0].capacityLimit, 12);
  assert.equal(aggregate.rooms[0].interactionEvents[0].future, true);
  assert.equal(aggregate.actions[0].actionType, "RSVP");
});

test("approved room, wall, surface, object, Piece and Action enums remain explicit", () => {
  assert.deepEqual(PRESENCE_ROOM_TYPES, ["boutique", "gallery", "archive", "studio", "listening-room", "pop-up", "showroom", "projection-room"]);
  assert.deepEqual(PRESENCE_WALL_TYPES, ["solid-wall", "divider-wall", "projection-wall", "gallery-wall", "poster-wall", "archive-wall", "media-wall"]);
  assert.deepEqual(PRESENCE_SURFACE_TYPES, ["table", "rack", "shelf", "plinth", "floor-zone", "wall-frame-zone", "projection-surface", "listening-station", "merch-table", "campaign-wall"]);
  assert.deepEqual(PRESENCE_SPATIAL_OBJECT_TYPES, ["rack", "table", "plinth", "frame", "poster", "projection", "audio-player", "product-display", "garment-display", "flyer-stack", "text-card", "link-card", "doorway", "room-label"]);
  assert.deepEqual(PRESENCE_PIECE_TYPES, ["image", "video", "audio", "garment", "product", "event", "flyer", "text", "link", "gallery", "collection", "archive-item"]);
  assert.deepEqual(PRESENCE_ACTION_TYPES, ["view", "buy", "enquire", "listen", "watch", "book", "RSVP", "donate", "enter-room", "unlock-room", "open-link"]);
});

test("arranger minimum components have admission-neutral origin and pivot metadata", () => {
  const required = [
    "presence.wall-panel",
    "presence.divider-wall",
    "presence.display-table",
    "presence.retail-rack",
    "presence.display-plinth",
    "presence.projection-wall",
  ];
  for (const componentId of required) assert.ok(SPATIAL_COMPONENTS.some((component) => component.componentId === componentId));
  assert.equal(SPATIAL_COMPONENT_CATALOG.length, SPATIAL_COMPONENTS.length);
  assert.ok(SPATIAL_COMPONENT_CATALOG.every((entry) => entry.rawAssetIncluded === false));
  assert.ok(SPATIAL_COMPONENT_CATALOG.every((entry) => entry.creativeStatus === "prototype" && entry.admissionStatus === "not-evaluated"));
  assert.ok(SPATIAL_COMPONENT_CATALOG.every((entry) => entry.origin.unit === "metre" && entry.origin.upAxis === "y"));
});

test("all composite material styles resolve every required slot correctly", () => {
  assert.deepEqual(Object.keys(SPATIAL_MATERIAL_STYLE_PRESETS).sort(), [
    "archive-paper",
    "boutique-chrome",
    "industrial-concrete",
    "lookbook-rack",
    "nocturnal-black-gallery",
    "polished-charcoal-tile",
    "projection-blackout",
    "soft-paper-room",
    "warm-nocturnal-boutique",
    "warm-timber-studio",
    "white-gallery",
  ]);
  for (const style of Object.values(SPATIAL_MATERIAL_STYLE_PRESETS)) {
    assert.deepEqual(Object.keys(style.slotPresets).sort(), [...SPATIAL_MATERIAL_SLOTS].sort());
    for (const slot of SPATIAL_MATERIAL_SLOTS) assert.equal(materialPresetMatchesSlot(slot, style.slotPresets[slot]), true);
  }
});
