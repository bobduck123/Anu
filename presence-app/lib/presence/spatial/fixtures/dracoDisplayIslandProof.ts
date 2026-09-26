import { SPATIAL_SCHEMA_VERSION, type SpatialRoomDefinition } from "../model.ts";

export const DRACO_DISPLAY_ISLAND_PROOF_FIXTURE = {
  schemaVersion: SPATIAL_SCHEMA_VERSION,
  id: "presence-draco-display-island-proof-room",
  label: "Draco GLB display-island proof",
  fixtureKind: "generic-proof",
  revision: 1,
  seed: "presence-draco-display-island-runtime-proof-v1",
  bounds: { width: 18, height: 6, depth: 30 },
  entryStateId: "overview",
  cameraPath: { points: [[0, 2.2, 9], [0, 1.8, 4]], clearance: 0.35 },
  lightingProfileId: "gallery-soft",
  fallbackPresentation: {
    eyebrow: "Internal GLB runtime proof",
    title: "Real display-island geometry, proxy preserved.",
    summary: "The optimized Draco GLB is optional render geometry. The authored proxy remains the source for placement, fallback and semantic meaning.",
    accentColor: "#30d5c8",
    backgroundColor: "#101318",
  },
  assets: [],
  skins: [
    {
      id: "draco-proof-neutral-skin",
      label: "Draco proof neutral skin",
      materialPresets: { floor: "floor-gallery-white", tabletop: "tabletop-pale-sculptural", "rack-metal": "rack-matte-black" },
      colors: { tabletop: "#d8d0bf" },
      decalAssetIds: [],
    },
  ],
  media: [],
  actions: [
    { id: "inspect-draco-display-island", kind: "inspect", label: "Inspect the GLB display island", targetPlacementId: "draco-display-island" },
  ],
  placements: [
    { id: "draco-proof-shell", order: 0, componentId: "presence.room-shell", version: "1.0.0", transform: { position: [0, 3, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }, anchor: { kind: "free" }, materialSlotOverrides: { wall: "wall-gallery-white" }, skinRef: "draco-proof-neutral-skin", actionRefs: [], visible: true, semanticLabel: "Neutral proof shell" },
    { id: "draco-proof-floor", order: 1, componentId: "presence.floor-slab", version: "1.0.0", transform: { position: [0, 0.06, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }, anchor: { kind: "floor" }, materialSlotOverrides: { floor: "floor-gallery-white" }, skinRef: "draco-proof-neutral-skin", actionRefs: [], visible: true, semanticLabel: "Neutral proof floor" },
    { id: "draco-display-island", order: 2, componentId: "presence.candidate-display-island", version: "1.0.0", transform: { position: [0, 0.3892, 0], rotation: [0, 0.16, 0], scale: [1, 1, 1] }, anchor: { kind: "floor" }, materialSlotOverrides: { tabletop: "tabletop-pale-sculptural", "rack-metal": "rack-matte-black" }, skinRef: "draco-proof-neutral-skin", actionRefs: ["inspect-draco-display-island"], visible: true, semanticLabel: "Optimized candidate display-island GLB proof" },
  ],
  states: [
    { id: "overview", label: "Overview", cameraPosition: [0, 2.2, 9], cameraTarget: [0, 0.8, 0], fieldOfView: 42, focusPlacementId: "draco-display-island", reducedMotionStateId: "overview-static" },
    { id: "overview-static", label: "Overview without motion", cameraPosition: [0, 2.2, 9], cameraTarget: [0, 0.8, 0], fieldOfView: 42, focusPlacementId: "draco-display-island" },
  ],
  semanticFallback: [
    { placementId: "draco-display-island", label: "Optimized display-island candidate", description: "Proxy placement and semantic fallback remain available if GLB or Draco loading fails.", actionRefs: ["inspect-draco-display-island"] },
  ],
} satisfies SpatialRoomDefinition;
