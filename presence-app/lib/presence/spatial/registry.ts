import type { SpatialComponentDefinition, SpatialComponentRef } from "./model.ts";
import { spatialComponentKey } from "./model.ts";

export type SpatialComponentAssetCategory =
  | "room-architecture"
  | "wall-system"
  | "display-surface"
  | "retail-fixture"
  | "projection-surface"
  | "piece-carrier";

export interface SpatialComponentCatalogMetadata extends SpatialComponentRef {
  assetCategory: SpatialComponentAssetCategory;
  assetStrategy: "procedural-placeholder";
  origin: {
    convention: "center" | "floor-center" | "back-center";
    offset: readonly [number, number, number];
    unit: "metre";
    upAxis: "y";
  };
  pivot: {
    convention: "component-origin" | "floor-contact" | "wall-contact";
    offset: readonly [number, number, number];
  };
  rawAssetIncluded: false;
}

const identity = { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] } as const;
const internalLicense = {
  licenseId: "presence-internal-generated-v1",
  sourceKind: "generated-placeholder",
  source: "presence-spatial-gate3",
  attribution: "Generated internal Presence proof geometry",
  internalOnly: true,
} as const;

export const SPATIAL_COMPONENTS = [
  {
    componentId: "presence.room-shell",
    version: "1.0.0",
    label: "Room shell",
    category: "shell",
    dimensions: { width: 18, height: 6, depth: 30 },
    geometry: { kind: "primitive", primitive: "box" },
    placement: { allowedAnchorKinds: ["free"], collision: "overlap-allowed", requiresParent: false, blocksCameraPath: false, floorClearance: 0 },
    anchors: [],
    materialSlots: ["wall"],
    license: internalLicense,
    runtime: { compressedBytes: 0, sourceBytes: 0, eager: true, performanceTier: "core" },
    mobileFallback: { strategy: "simplified", note: "Use a shallower shell while preserving semantic order." },
  },
  {
    componentId: "presence.floor-slab",
    version: "1.0.0",
    label: "Floor slab",
    category: "floor",
    dimensions: { width: 18, height: 0.12, depth: 30 },
    geometry: { kind: "primitive", primitive: "box" },
    placement: { allowedAnchorKinds: ["floor"], collision: "overlap-allowed", requiresParent: false, blocksCameraPath: false, floorClearance: 0 },
    anchors: [],
    materialSlots: ["floor"],
    license: internalLicense,
    runtime: { compressedBytes: 0, sourceBytes: 0, eager: true, performanceTier: "core" },
    mobileFallback: { strategy: "same", note: "Primitive floor is retained." },
  },
  {
    componentId: "presence.wall-panel",
    version: "1.0.0",
    label: "Wall panel",
    category: "wall",
    dimensions: { width: 6, height: 5, depth: 0.18 },
    geometry: { kind: "primitive", primitive: "box" },
    placement: { allowedAnchorKinds: ["wall", "free"], collision: "overlap-allowed", requiresParent: false, blocksCameraPath: false, floorClearance: 0 },
    anchors: [
      { id: "wall-face", kind: "wall", transform: identity, accepts: ["projection", "piece", "action"], capacity: 48 },
    ],
    materialSlots: ["wall", "poster-decal", "logo-accent"],
    license: internalLicense,
    runtime: { compressedBytes: 0, sourceBytes: 0, eager: true, performanceTier: "core" },
    mobileFallback: { strategy: "same", note: "Primitive wall remains readable on mobile." },
  },
  {
    componentId: "presence.divider-wall",
    version: "1.0.0",
    label: "Divider wall",
    category: "wall",
    dimensions: { width: 4.8, height: 3.2, depth: 0.16 },
    geometry: { kind: "primitive", primitive: "box" },
    placement: { allowedAnchorKinds: ["floor", "free"], collision: "solid", requiresParent: false, blocksCameraPath: true, floorClearance: 0 },
    anchors: [
      { id: "divider-face-a", kind: "wall", transform: { position: [0, 0, 0.09], rotation: [0, 0, 0], scale: [1, 1, 1] }, accepts: ["piece", "action"], capacity: 12 },
      { id: "divider-face-b", kind: "wall", transform: { position: [0, 0, -0.09], rotation: [0, Math.PI, 0], scale: [1, 1, 1] }, accepts: ["piece", "action"], capacity: 12 },
    ],
    materialSlots: ["wall", "poster-decal", "logo-accent"],
    license: internalLicense,
    runtime: { compressedBytes: 0, sourceBytes: 0, eager: true, performanceTier: "core" },
    mobileFallback: { strategy: "simplified", note: "Retain one bounded divider plane without blocking the entry path." },
  },
  {
    componentId: "presence.display-table",
    version: "1.0.0",
    label: "Display table",
    category: "surface",
    dimensions: { width: 3.2, height: 0.9, depth: 1.4 },
    geometry: { kind: "primitive", primitive: "box" },
    placement: { allowedAnchorKinds: ["floor"], collision: "solid", requiresParent: false, blocksCameraPath: true, floorClearance: 0 },
    anchors: [
      { id: "tabletop-grid", kind: "surface", transform: { position: [0, 0.47, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }, accepts: ["piece", "action"], capacity: 12 },
    ],
    materialSlots: ["tabletop", "logo-accent"],
    license: internalLicense,
    runtime: { compressedBytes: 0, sourceBytes: 0, eager: true, performanceTier: "core" },
    mobileFallback: { strategy: "simplified", note: "Retain one compact display surface with semantic Piece access." },
  },
  {
    componentId: "presence.display-plinth",
    version: "1.0.0",
    label: "Display plinth",
    category: "surface",
    dimensions: { width: 4.2, height: 0.72, depth: 1.8 },
    geometry: { kind: "primitive", primitive: "box" },
    placement: { allowedAnchorKinds: ["floor"], collision: "solid", requiresParent: false, blocksCameraPath: true, floorClearance: 0 },
    anchors: [
      { id: "surface-top", kind: "surface", transform: { position: [0, 0.4, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }, accepts: ["rack", "piece", "action"], capacity: 8 },
    ],
    materialSlots: ["tabletop"],
    license: internalLicense,
    runtime: { compressedBytes: 0, sourceBytes: 0, eager: true, performanceTier: "core" },
    mobileFallback: { strategy: "simplified", note: "Collapse to one display surface." },
  },
  {
    componentId: "presence.retail-rack",
    version: "1.0.0",
    label: "Retail garment rack",
    category: "rack",
    dimensions: { width: 5.6, height: 3.4, depth: 1.4 },
    geometry: { kind: "primitive", primitive: "rack" },
    placement: { allowedAnchorKinds: ["floor"], collision: "solid", requiresParent: false, blocksCameraPath: true, floorClearance: 0 },
    anchors: Array.from({ length: 12 }, (_, index) => ({
      id: `rack-slot-${String(index + 1).padStart(2, "0")}`,
      kind: "rack" as const,
      transform: { position: [-2.2 + index * 0.4, 0.7, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      accepts: ["piece"] as const,
      capacity: 1,
    })),
    materialSlots: ["rack-metal"],
    license: internalLicense,
    runtime: { compressedBytes: 0, sourceBytes: 0, eager: true, performanceTier: "enhanced" },
    mobileFallback: { strategy: "simplified", note: "Retain a six-slot rack with direct selection." },
  },
  {
    componentId: "presence.projection-wall",
    version: "1.0.0",
    label: "Projection wall",
    category: "projection",
    dimensions: { width: 9, height: 5, depth: 0.3 },
    geometry: { kind: "primitive", primitive: "projection-field" },
    placement: { allowedAnchorKinds: ["wall", "free"], collision: "overlap-allowed", requiresParent: false, blocksCameraPath: false, floorClearance: 0 },
    anchors: Array.from({ length: 32 }, (_, index) => ({
      id: `projection-cell-${String(index + 1).padStart(2, "0")}`,
      kind: "projection" as const,
      transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      accepts: ["piece"] as const,
      capacity: 1,
    })),
    materialSlots: ["projection", "wall"],
    license: internalLicense,
    runtime: { compressedBytes: 0, sourceBytes: 0, eager: true, performanceTier: "enhanced" },
    mobileFallback: { strategy: "simplified", note: "Use a bounded swipeable image sequence." },
  },
  {
    componentId: "presence.piece-plane",
    version: "1.0.0",
    label: "Piece plane",
    category: "piece",
    dimensions: { width: 1.1, height: 1.5, depth: 0.05 },
    geometry: { kind: "primitive", primitive: "plane" },
    placement: { allowedAnchorKinds: ["wall", "surface", "rack", "projection", "free"], collision: "parent-contained", requiresParent: true, blocksCameraPath: false, floorClearance: 0 },
    anchors: [],
    materialSlots: ["fabric", "paper", "projection", "poster-decal", "logo-accent"],
    license: internalLicense,
    runtime: { compressedBytes: 0, sourceBytes: 0, eager: false, performanceTier: "core" },
    mobileFallback: { strategy: "same", note: "Render media or semantic placeholder." },
  },
] as const satisfies readonly SpatialComponentDefinition[];

const placeholderMetadata = (
  componentId: string,
  assetCategory: SpatialComponentAssetCategory,
  originConvention: SpatialComponentCatalogMetadata["origin"]["convention"],
  pivotConvention: SpatialComponentCatalogMetadata["pivot"]["convention"],
): SpatialComponentCatalogMetadata => ({
  componentId,
  version: "1.0.0",
  assetCategory,
  assetStrategy: "procedural-placeholder",
  origin: { convention: originConvention, offset: [0, 0, 0], unit: "metre", upAxis: "y" },
  pivot: { convention: pivotConvention, offset: [0, 0, 0] },
  rawAssetIncluded: false,
});

/** Admission-neutral metadata for the initial generated catalog; no raw asset files are bundled. */
export const SPATIAL_COMPONENT_CATALOG = [
  placeholderMetadata("presence.room-shell", "room-architecture", "center", "component-origin"),
  placeholderMetadata("presence.floor-slab", "room-architecture", "floor-center", "floor-contact"),
  placeholderMetadata("presence.wall-panel", "wall-system", "back-center", "wall-contact"),
  placeholderMetadata("presence.divider-wall", "wall-system", "floor-center", "floor-contact"),
  placeholderMetadata("presence.display-table", "display-surface", "floor-center", "floor-contact"),
  placeholderMetadata("presence.display-plinth", "display-surface", "floor-center", "floor-contact"),
  placeholderMetadata("presence.retail-rack", "retail-fixture", "floor-center", "floor-contact"),
  placeholderMetadata("presence.projection-wall", "projection-surface", "back-center", "wall-contact"),
  placeholderMetadata("presence.piece-plane", "piece-carrier", "center", "component-origin"),
] as const satisfies readonly SpatialComponentCatalogMetadata[];

const COMPONENT_METADATA_MAP = new Map(SPATIAL_COMPONENT_CATALOG.map((metadata) => [spatialComponentKey(metadata), metadata]));

const COMPONENT_MAP = new Map(SPATIAL_COMPONENTS.map((definition) => [spatialComponentKey(definition), definition]));

export function spatialComponent(ref: SpatialComponentRef): SpatialComponentDefinition | undefined {
  return COMPONENT_MAP.get(spatialComponentKey(ref));
}

export function requireSpatialComponent(ref: SpatialComponentRef): SpatialComponentDefinition {
  const definition = spatialComponent(ref);
  if (!definition) throw new Error(`Unknown spatial component ${spatialComponentKey(ref)}.`);
  return definition;
}

export function spatialComponentEntries(): readonly SpatialComponentDefinition[] {
  return SPATIAL_COMPONENTS;
}

export function spatialComponentCatalogMetadata(ref: SpatialComponentRef): SpatialComponentCatalogMetadata | undefined {
  return COMPONENT_METADATA_MAP.get(spatialComponentKey(ref));
}
