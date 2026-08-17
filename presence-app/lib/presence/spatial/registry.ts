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
  assetStrategy: "procedural-placeholder" | "presence-authored-procedural";
  creativeStatus: "prototype" | "review" | "approved" | "rejected";
  admissionStatus: "not-evaluated" | "candidate" | "admitted" | "rejected";
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
const candidateLicense = {
  licenseId: "presence-authored-gate4-candidate-v1",
  sourceKind: "presence-authored",
  source: "presence-spatial-gate4-candidate",
  attribution: "Presence-authored internal candidate geometry",
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
  {
    componentId: "presence.boutique-shell",
    version: "1.0.0",
    label: "Open boutique shell candidate",
    category: "shell",
    dimensions: { width: 20, height: 6, depth: 36 },
    geometry: { kind: "primitive", primitive: "open-shell" },
    placement: { allowedAnchorKinds: ["free"], collision: "overlap-allowed", requiresParent: false, blocksCameraPath: false, floorClearance: 0 },
    anchors: [],
    materialSlots: ["wall"],
    license: candidateLicense,
    runtime: { compressedBytes: 0, sourceBytes: 0, eager: true, performanceTier: "enhanced" },
    mobileFallback: { strategy: "semantic-only", note: "Use the branded static fallback and full semantic room." },
  },
  {
    componentId: "presence.floor-slab",
    version: "2.0.0",
    label: "Boutique floor slab candidate",
    category: "floor",
    dimensions: { width: 20, height: 0.12, depth: 36 },
    geometry: { kind: "primitive", primitive: "box" },
    placement: { allowedAnchorKinds: ["floor"], collision: "overlap-allowed", requiresParent: false, blocksCameraPath: false, floorClearance: 0 },
    anchors: [],
    materialSlots: ["floor"],
    license: candidateLicense,
    runtime: { compressedBytes: 0, sourceBytes: 0, eager: true, performanceTier: "core" },
    mobileFallback: { strategy: "semantic-only", note: "Retain floor identity in the branded static fallback." },
  },
  {
    componentId: "presence.ribbed-wall",
    version: "1.0.0",
    label: "Ribbed identity wall candidate",
    category: "wall",
    dimensions: { width: 6.8, height: 5.4, depth: 0.36 },
    geometry: { kind: "primitive", primitive: "ribbed-wall" },
    placement: { allowedAnchorKinds: ["wall", "free"], collision: "overlap-allowed", requiresParent: false, blocksCameraPath: false, floorClearance: 0 },
    anchors: [
      { id: "identity-face", kind: "wall", transform: { position: [0, 0, 0.48], rotation: [0, 0, 0], scale: [1, 1, 1] }, accepts: ["piece"], capacity: 3 },
    ],
    materialSlots: ["wall", "logo-accent"],
    license: candidateLicense,
    runtime: { compressedBytes: 0, sourceBytes: 0, eager: true, performanceTier: "enhanced" },
    mobileFallback: { strategy: "semantic-only", note: "Expose the identity media in the branded static fallback." },
  },
  {
    componentId: "presence.display-bay",
    version: "1.0.0",
    label: "Sculptural display bay candidate",
    category: "surface",
    dimensions: { width: 6.4, height: 4.6, depth: 1.5 },
    geometry: { kind: "primitive", primitive: "display-bay" },
    placement: { allowedAnchorKinds: ["floor"], collision: "solid", requiresParent: false, blocksCameraPath: true, floorClearance: 0 },
    anchors: Array.from({ length: 6 }, (_, index) => ({
      id: `display-cell-${String(index + 1).padStart(2, "0")}`,
      kind: "surface" as const,
      transform: { position: [-2 + (index % 3) * 2, -0.9 + Math.floor(index / 3) * 1.5, 0.82], rotation: [0, 0, 0], scale: [1, 1, 1] },
      accepts: ["piece"] as const,
      capacity: 1,
    })),
    materialSlots: ["wall", "tabletop", "rack-metal"],
    license: candidateLicense,
    runtime: { compressedBytes: 0, sourceBytes: 0, eager: true, performanceTier: "hero" },
    mobileFallback: { strategy: "semantic-only", note: "Represent the bay as a branded media group with semantic Piece access." },
  },
  {
    componentId: "presence.rounded-island",
    version: "1.0.0",
    label: "Rounded display island candidate",
    category: "surface",
    dimensions: { width: 3.6, height: 0.78, depth: 1.9 },
    geometry: { kind: "primitive", primitive: "rounded-island" },
    placement: { allowedAnchorKinds: ["floor"], collision: "solid", requiresParent: false, blocksCameraPath: true, floorClearance: 0 },
    anchors: Array.from({ length: 3 }, (_, index) => ({
      id: `island-cell-${String(index + 1).padStart(2, "0")}`,
      kind: "surface" as const,
      transform: { position: [-1.05 + index * 1.05, 0.43, 0], rotation: [-Math.PI / 2, 0, 0], scale: [1, 1, 1] },
      accepts: ["piece"] as const,
      capacity: 1,
    })),
    materialSlots: ["tabletop", "rack-metal"],
    license: candidateLicense,
    runtime: { compressedBytes: 0, sourceBytes: 0, eager: true, performanceTier: "enhanced" },
    mobileFallback: { strategy: "semantic-only", note: "Keep island Pieces in spatial order within the branded fallback." },
  },
  {
    componentId: "presence.suspended-rack",
    version: "1.0.0",
    label: "Suspended architecture rack candidate",
    category: "rack",
    dimensions: { width: 8.4, height: 4, depth: 1.8 },
    geometry: { kind: "primitive", primitive: "suspended-rack" },
    placement: { allowedAnchorKinds: ["floor"], collision: "solid", requiresParent: false, blocksCameraPath: true, floorClearance: 0 },
    anchors: Array.from({ length: 12 }, (_, index) => ({
      id: `garment-slot-${String(index + 1).padStart(2, "0")}`,
      kind: "rack" as const,
      transform: { position: [-3.55 + index * 0.645, 0.18, 0.05], rotation: [0, 0, 0], scale: [1, 1, 1] },
      accepts: ["piece"] as const,
      capacity: 1,
    })),
    materialSlots: ["rack-metal", "tabletop"],
    license: candidateLicense,
    runtime: { compressedBytes: 0, sourceBytes: 0, eager: true, performanceTier: "hero" },
    mobileFallback: { strategy: "semantic-only", note: "Preserve the rack sequence and direct garment actions semantically." },
  },
  {
    componentId: "presence.garment-hanger",
    version: "1.0.0",
    label: "Garment on hanger candidate",
    category: "piece",
    dimensions: { width: 1.05, height: 1.7, depth: 0.2 },
    geometry: { kind: "primitive", primitive: "garment-hanger" },
    placement: { allowedAnchorKinds: ["rack"], collision: "parent-contained", requiresParent: true, blocksCameraPath: false, floorClearance: 0 },
    anchors: [],
    materialSlots: ["fabric", "rack-metal"],
    license: candidateLicense,
    runtime: { compressedBytes: 0, sourceBytes: 0, eager: false, performanceTier: "enhanced" },
    mobileFallback: { strategy: "semantic-only", note: "Expose garment media and inspection action without 3D." },
  },
  {
    componentId: "presence.framed-media",
    version: "1.0.0",
    label: "Framed media candidate",
    category: "piece",
    dimensions: { width: 2, height: 2.6, depth: 0.18 },
    geometry: { kind: "primitive", primitive: "framed-media" },
    placement: { allowedAnchorKinds: ["wall", "free"], collision: "parent-contained", requiresParent: false, blocksCameraPath: false, floorClearance: 0 },
    anchors: [],
    materialSlots: ["poster-decal", "rack-metal", "logo-accent"],
    license: candidateLicense,
    runtime: { compressedBytes: 0, sourceBytes: 0, eager: false, performanceTier: "enhanced" },
    mobileFallback: { strategy: "semantic-only", note: "Render safe media when present, otherwise retain an honest semantic item." },
  },
  {
    componentId: "presence.projection-wall",
    version: "2.0.0",
    label: "Campaign projection grid candidate",
    category: "projection",
    dimensions: { width: 7.8, height: 4.8, depth: 0.36 },
    geometry: { kind: "primitive", primitive: "projection-grid" },
    placement: { allowedAnchorKinds: ["wall", "free"], collision: "overlap-allowed", requiresParent: false, blocksCameraPath: false, floorClearance: 0 },
    anchors: Array.from({ length: 6 }, (_, index) => ({
      id: `campaign-cell-${String(index + 1).padStart(2, "0")}`,
      kind: "projection" as const,
      transform: { position: [-2.45 + (index % 3) * 2.45, 1.15 - Math.floor(index / 3) * 2.3, 0.22], rotation: [0, 0, 0], scale: [1, 1, 1] },
      accepts: ["piece"] as const,
      capacity: 1,
    })),
    materialSlots: ["projection", "wall", "rack-metal"],
    license: candidateLicense,
    runtime: { compressedBytes: 0, sourceBytes: 0, eager: true, performanceTier: "hero" },
    mobileFallback: { strategy: "semantic-only", note: "Present campaign media as a bounded branded static group." },
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
  creativeStatus: "prototype",
  admissionStatus: "not-evaluated",
  origin: { convention: originConvention, offset: [0, 0, 0], unit: "metre", upAxis: "y" },
  pivot: { convention: pivotConvention, offset: [0, 0, 0] },
  rawAssetIncluded: false,
});

const candidateMetadata = (
  componentId: string,
  version: string,
  assetCategory: SpatialComponentAssetCategory,
  originConvention: SpatialComponentCatalogMetadata["origin"]["convention"],
  pivotConvention: SpatialComponentCatalogMetadata["pivot"]["convention"],
): SpatialComponentCatalogMetadata => ({
  componentId,
  version,
  assetCategory,
  assetStrategy: "presence-authored-procedural",
  creativeStatus: "prototype",
  admissionStatus: "not-evaluated",
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
  candidateMetadata("presence.boutique-shell", "1.0.0", "room-architecture", "center", "component-origin"),
  candidateMetadata("presence.floor-slab", "2.0.0", "room-architecture", "floor-center", "floor-contact"),
  candidateMetadata("presence.ribbed-wall", "1.0.0", "wall-system", "back-center", "wall-contact"),
  candidateMetadata("presence.display-bay", "1.0.0", "display-surface", "floor-center", "floor-contact"),
  candidateMetadata("presence.rounded-island", "1.0.0", "display-surface", "floor-center", "floor-contact"),
  candidateMetadata("presence.suspended-rack", "1.0.0", "retail-fixture", "floor-center", "floor-contact"),
  candidateMetadata("presence.garment-hanger", "1.0.0", "piece-carrier", "center", "component-origin"),
  candidateMetadata("presence.framed-media", "1.0.0", "piece-carrier", "center", "component-origin"),
  candidateMetadata("presence.projection-wall", "2.0.0", "projection-surface", "back-center", "wall-contact"),
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
