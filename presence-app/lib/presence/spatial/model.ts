export const SPATIAL_SCHEMA_VERSION = "presence-spatial-v1" as const;
export const SPATIAL_DRAFT_SCHEMA_VERSION = "presence-spatial-draft-v1" as const;
export const PRESENCE_SPATIAL_AGGREGATE_VERSION = "presence-spatial-aggregate-v1" as const;

export type PresenceStatus = "draft" | "internal-preview" | "active" | "archived";
export type SpaceTier = "proof" | "lite" | "pro" | "cultural-org";
export type RoomType =
  | "boutique"
  | "gallery"
  | "archive"
  | "studio"
  | "listening-room"
  | "pop-up"
  | "showroom"
  | "projection-room";
export type WallType =
  | "solid-wall"
  | "divider-wall"
  | "projection-wall"
  | "gallery-wall"
  | "poster-wall"
  | "archive-wall"
  | "media-wall";
export type SurfaceType =
  | "table"
  | "rack"
  | "shelf"
  | "plinth"
  | "floor-zone"
  | "wall-frame-zone"
  | "projection-surface"
  | "listening-station"
  | "merch-table"
  | "campaign-wall";
export type SpatialObjectType =
  | "rack"
  | "table"
  | "plinth"
  | "frame"
  | "poster"
  | "projection"
  | "audio-player"
  | "product-display"
  | "garment-display"
  | "flyer-stack"
  | "text-card"
  | "link-card"
  | "doorway"
  | "room-label";
export type PieceType =
  | "image"
  | "video"
  | "audio"
  | "garment"
  | "product"
  | "event"
  | "flyer"
  | "text"
  | "link"
  | "gallery"
  | "collection"
  | "archive-item";
export type ActionType =
  | "view"
  | "buy"
  | "enquire"
  | "listen"
  | "watch"
  | "book"
  | "RSVP"
  | "donate"
  | "enter-room"
  | "unlock-room"
  | "open-link";
export type PlacementMode = "floor" | "wall" | "surface" | "anchor" | "free";
export type SpatialRoomState = "planned" | "available" | "occupied" | "paused" | "closed";
export type SpatialGuestPresenceState = "not-supported" | "empty" | "present" | "at-capacity";
export type SpatialInteractionEventType =
  | "enter"
  | "exit"
  | "focus"
  | "inspect"
  | "activate"
  | "state-change";

export const PRESENCE_ROOM_TYPES = [
  "boutique", "gallery", "archive", "studio", "listening-room", "pop-up", "showroom", "projection-room",
] as const satisfies readonly RoomType[];
export const PRESENCE_WALL_TYPES = [
  "solid-wall", "divider-wall", "projection-wall", "gallery-wall", "poster-wall", "archive-wall", "media-wall",
] as const satisfies readonly WallType[];
export const PRESENCE_SURFACE_TYPES = [
  "table", "rack", "shelf", "plinth", "floor-zone", "wall-frame-zone", "projection-surface", "listening-station", "merch-table", "campaign-wall",
] as const satisfies readonly SurfaceType[];
export const PRESENCE_SPATIAL_OBJECT_TYPES = [
  "rack", "table", "plinth", "frame", "poster", "projection", "audio-player", "product-display", "garment-display", "flyer-stack", "text-card", "link-card", "doorway", "room-label",
] as const satisfies readonly SpatialObjectType[];
export const PRESENCE_PIECE_TYPES = [
  "image", "video", "audio", "garment", "product", "event", "flyer", "text", "link", "gallery", "collection", "archive-item",
] as const satisfies readonly PieceType[];
export const PRESENCE_ACTION_TYPES = [
  "view", "buy", "enquire", "listen", "watch", "book", "RSVP", "donate", "enter-room", "unlock-room", "open-link",
] as const satisfies readonly ActionType[];

/** Logical references are resolved by an approved asset/action layer; they are never raw uploads or inline blobs. */
export type SpatialLogicalRef =
  | `asset:${string}`
  | `public:${string}`
  | `generated:${string}`
  | `presence:${string}`
  | `space:${string}`
  | `room:${string}`
  | `piece:${string}`
  | `action:${string}`;

export interface SpatialEntryPoint {
  id: string;
  position: SpatialVec3;
  cameraAnchorId?: string;
  connectedRoomId?: string;
}

export interface SpatialCapacityZone {
  id: string;
  kind: "gathering" | "stage";
  position: SpatialVec3;
  dimensions: SpatialDimensions;
  capacityLimit: number;
  hostAnchorIds: readonly string[];
}

export interface SpatialInteractionEvent {
  id: string;
  eventType: SpatialInteractionEventType;
  sourceId: string;
  targetRef?: SpatialLogicalRef;
  future: true;
}

export interface Presence {
  id: string;
  clientName: string;
  slug: string;
  status: PresenceStatus;
  activeSpaceId: string | null;
  draftSpaceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Space {
  id: string;
  presenceId: string;
  name: string;
  tier: SpaceTier;
  sqmCapacity: number;
  roomIds: readonly string[];
  defaultRoomId: string;
  theme: string;
  look: string;
  createdAt: string;
  updatedAt: string;
}

export interface Floorplan {
  dimensions: SpatialDimensions;
  entryPoints: readonly SpatialEntryPoint[];
  gatheringZones: readonly SpatialCapacityZone[];
  stageZones: readonly SpatialCapacityZone[];
}

export interface Room {
  id: string;
  spaceId: string;
  name: string;
  roomType: RoomType;
  dimensions: SpatialDimensions;
  wallIds: readonly string[];
  surfaceIds: readonly string[];
  objectIds: readonly string[];
  cameraAnchorIds: readonly string[];
  lightingPreset: string;
  materialPreset: SpatialMaterialStylePresetId;
  entryPoint: SpatialVec3;
  connectedRoomIds: readonly string[];
  floorplan: Floorplan;
  capacityLimit: number | null;
  hostAnchorIds: readonly string[];
  interactionEvents: readonly SpatialInteractionEvent[];
  roomState: SpatialRoomState;
  guestPresenceState: SpatialGuestPresenceState;
}

export interface Wall {
  id: string;
  roomId: string;
  type: WallType;
  position: SpatialVec3;
  rotation: SpatialVec3;
  dimensions: SpatialDimensions;
  materialId: string;
  canHostObjects: boolean;
  allowedObjectTypes: readonly SpatialObjectType[];
  isDivider: boolean;
  hasDoorway: boolean;
  connectedRoomId: string | null;
}

export interface SurfaceAnchorPoint {
  id: string;
  position: SpatialVec3;
  rotation: SpatialVec3;
  capacity: number;
}

export interface Surface {
  id: string;
  roomId: string;
  type: SurfaceType;
  position: SpatialVec3;
  rotation: SpatialVec3;
  dimensions: SpatialDimensions;
  materialId: string;
  allowedPieceTypes: readonly PieceType[];
  anchorPoints: readonly SurfaceAnchorPoint[];
  capacity: number;
}

export interface SpatialObject {
  id: string;
  roomId: string;
  componentType: SpatialObjectType;
  position: SpatialVec3;
  rotation: SpatialVec3;
  scale: SpatialVec3;
  materialOverrides: Partial<Record<SpatialMaterialSlotId, SpatialMaterialPresetId>>;
  surfaceId: string | null;
  wallId: string | null;
  placementMode: PlacementMode;
  locked: boolean;
  layer: number;
}

export interface Piece {
  id: string;
  presenceId: string;
  pieceType: PieceType;
  title: string;
  description: string;
  mediaUrl: SpatialLogicalRef | null;
  thumbnailUrl: SpatialLogicalRef | null;
  metadata: Readonly<Record<string, string | number | boolean | null>>;
  actionIds: readonly string[];
  createdAt: string;
  updatedAt: string;
}

export interface Action {
  id: string;
  pieceId: string;
  actionType: ActionType;
  label: string;
  target: SpatialLogicalRef;
  requiresAuth: boolean;
  requiresPayment: boolean;
  trackingKey: string;
}

export interface Material {
  id: string;
  name: string;
  slot: SpatialMaterialSlotId;
  presetId: SpatialMaterialPresetId;
  baseColor: string;
  roughness: number;
  metalness: number;
  textureRefs: readonly SpatialLogicalRef[];
}

export interface CameraAnchor {
  id: string;
  roomId: string;
  name: string;
  position: SpatialVec3;
  target: SpatialVec3;
  fieldOfView: number;
  isEntryPoint: boolean;
  hostAnchorId: string | null;
}

export interface PlacementRule {
  id: string;
  roomTypes: readonly RoomType[];
  objectTypes: readonly SpatialObjectType[];
  placementModes: readonly PlacementMode[];
  allowedWallTypes: readonly WallType[];
  allowedSurfaceTypes: readonly SurfaceType[];
  capacityCost: number;
  requiresHostAnchor: boolean;
  collision: "solid" | "overlap-allowed" | "parent-contained";
  minimumClearance: number;
  interactionEvents: readonly SpatialInteractionEventType[];
}

export interface PresenceSpatialAggregate {
  schemaVersion: typeof PRESENCE_SPATIAL_AGGREGATE_VERSION;
  presence: Presence;
  spaces: readonly Space[];
  rooms: readonly Room[];
  walls: readonly Wall[];
  surfaces: readonly Surface[];
  objects: readonly SpatialObject[];
  pieces: readonly Piece[];
  actions: readonly Action[];
  materials: readonly Material[];
  cameraAnchors: readonly CameraAnchor[];
  placementRules: readonly PlacementRule[];
}

export type SpatialSchemaVersion = typeof SPATIAL_SCHEMA_VERSION;
export type SpatialComponentCategory =
  | "shell"
  | "floor"
  | "wall"
  | "surface"
  | "rack"
  | "projection"
  | "piece"
  | "action";

export type SpatialPrimitiveKind = "box" | "plane" | "cylinder" | "rack" | "projection-field";
export type SpatialPerformanceTier = "core" | "enhanced" | "hero";
export type SpatialAnchorKind = "floor" | "wall" | "surface" | "rack" | "projection" | "free";
export type SpatialMaterialSlotId =
  | "wall"
  | "floor"
  | "tabletop"
  | "rack-metal"
  | "fabric"
  | "paper"
  | "projection"
  | "poster-decal"
  | "logo-accent";

export type SpatialMaterialPresetId =
  | "wall-plaster"
  | "wall-charcoal"
  | "wall-gallery-white"
  | "wall-soft-paper"
  | "wall-industrial-concrete"
  | "wall-projection-blackout"
  | "floor-dark-stone"
  | "floor-gallery-white"
  | "floor-polished-charcoal"
  | "floor-warm-timber"
  | "tabletop-warm-stone"
  | "tabletop-gallery-white"
  | "tabletop-industrial-concrete"
  | "tabletop-warm-timber"
  | "rack-matte-black"
  | "rack-boutique-chrome"
  | "fabric-neutral"
  | "fabric-nocturnal"
  | "paper-uncoated"
  | "paper-archive"
  | "projection-emissive"
  | "projection-blackout"
  | "poster-satin"
  | "poster-archive"
  | "accent-signal";

export type SpatialMaterialStylePresetId =
  | "white-gallery"
  | "nocturnal-black-gallery"
  | "soft-paper-room"
  | "industrial-concrete"
  | "polished-charcoal-tile"
  | "warm-timber-studio"
  | "archive-paper"
  | "boutique-chrome"
  | "projection-blackout";

export type SpatialVec3 = readonly [number, number, number];

export interface SpatialDimensions {
  width: number;
  height: number;
  depth: number;
}

export interface SpatialTransform {
  position: SpatialVec3;
  rotation: SpatialVec3;
  scale: SpatialVec3;
}

export interface SpatialComponentRef {
  componentId: string;
  version: string;
}

export interface SpatialAnchorDefinition {
  id: string;
  kind: SpatialAnchorKind;
  transform: SpatialTransform;
  accepts: readonly SpatialComponentCategory[];
  capacity: number;
}

export interface SpatialComponentPlacementContract {
  allowedAnchorKinds: readonly SpatialAnchorKind[];
  collision: "solid" | "overlap-allowed" | "parent-contained";
  requiresParent: boolean;
  blocksCameraPath: boolean;
  floorClearance: number;
}

export interface SpatialComponentLicense {
  licenseId: string;
  sourceKind: "presence-authored" | "generated-placeholder" | "third-party";
  source: string;
  attribution: string;
  internalOnly: boolean;
}

export interface SpatialRuntimeAssetProfile {
  compressedBytes: number;
  sourceBytes: number;
  eager: boolean;
  performanceTier: SpatialPerformanceTier;
}

export interface SpatialMobileFallback {
  strategy: "same" | "simplified" | "semantic-only";
  componentRef?: SpatialComponentRef;
  note: string;
}

export interface SpatialComponentDefinition extends SpatialComponentRef {
  label: string;
  category: SpatialComponentCategory;
  dimensions: SpatialDimensions;
  geometry:
    | { kind: "primitive"; primitive: SpatialPrimitiveKind }
    | { kind: "asset"; assetId: string };
  placement: SpatialComponentPlacementContract;
  anchors: readonly SpatialAnchorDefinition[];
  materialSlots: readonly SpatialMaterialSlotId[];
  license: SpatialComponentLicense;
  runtime: SpatialRuntimeAssetProfile;
  mobileFallback: SpatialMobileFallback;
}

export interface SpatialAssetRef {
  id: string;
  kind: "shape" | "image" | "poster" | "logo";
  locator: string;
  safety: "generated-placeholder" | "public-safe";
  compressedBytes: number;
  eager: boolean;
  attribution: string;
}

export interface SpatialSkinRef {
  id: string;
  label: string;
  materialPresets: Partial<Record<SpatialMaterialSlotId, SpatialMaterialPresetId>>;
  colors: Partial<Record<SpatialMaterialSlotId, string>>;
  decalAssetIds: readonly string[];
}

export interface SpatialMediaRef {
  id: string;
  kind: "image" | "poster" | "logo" | "placeholder";
  assetId: string;
  alt: string;
  safety: "generated-placeholder" | "public-safe";
}

interface SpatialActionRefBase {
  id: string;
  label: string;
}

export type SpatialActionRef =
  | (SpatialActionRefBase & {
      kind: "inspect";
      targetPlacementId: string;
      targetStateId?: never;
      disabledReason?: never;
    })
  | (SpatialActionRefBase & {
      kind: "navigate-state";
      targetPlacementId?: never;
      targetStateId: string;
      disabledReason?: never;
    })
  | (SpatialActionRefBase & {
      kind: "sequence-previous" | "sequence-next";
      targetPlacementId?: never;
      targetStateId?: never;
      disabledReason?: never;
    })
  | (SpatialActionRefBase & {
      kind: "disabled-placeholder";
      targetPlacementId?: never;
      targetStateId?: never;
      disabledReason: string;
    });

export interface SpatialPlacementAnchor {
  kind: SpatialAnchorKind;
  parentPlacementId?: string;
  anchorId?: string;
}

export interface SpatialPlacement extends SpatialComponentRef {
  id: string;
  order: number;
  transform: SpatialTransform;
  anchor: SpatialPlacementAnchor;
  materialSlotOverrides: Partial<Record<SpatialMaterialSlotId, SpatialMaterialPresetId>>;
  skinRef?: string;
  mediaRef?: string;
  actionRefs: readonly string[];
  visible: boolean;
  semanticLabel: string;
}

export interface SpatialCameraPath {
  points: readonly SpatialVec3[];
  clearance: number;
}

export interface SpatialSceneState {
  id: string;
  label: string;
  cameraPosition: SpatialVec3;
  cameraTarget: SpatialVec3;
  fieldOfView: number;
  focusPlacementId?: string;
  visiblePlacementIds?: readonly string[];
  reducedMotionStateId?: string;
}

export interface SpatialSemanticItem {
  placementId: string;
  label: string;
  description?: string;
  actionRefs: readonly string[];
}

export interface SpatialRoomDefinition {
  schemaVersion: SpatialSchemaVersion;
  id: string;
  label: string;
  fixtureKind: "mobstar-proof" | "bbb-projection-proof" | "generic-proof";
  revision: number;
  seed: string;
  bounds: SpatialDimensions;
  entryStateId: string;
  cameraPath: SpatialCameraPath;
  assets: readonly SpatialAssetRef[];
  skins: readonly SpatialSkinRef[];
  media: readonly SpatialMediaRef[];
  actions: readonly SpatialActionRef[];
  placements: readonly SpatialPlacement[];
  states: readonly SpatialSceneState[];
  semanticFallback: readonly SpatialSemanticItem[];
}

export interface SpatialValidationIssue {
  path: string;
  code: string;
  message: string;
}

export type SpatialValidationResult<T> =
  | { ok: true; value: T; issues: readonly [] }
  | { ok: false; issues: readonly SpatialValidationIssue[] };

export interface SpatialResolvedMaterial {
  slot: SpatialMaterialSlotId;
  presetId: SpatialMaterialPresetId;
  color?: string;
}

export interface SpatialRenderItem extends SpatialComponentRef {
  placementId: string;
  componentKey: string;
  category: SpatialComponentCategory;
  geometry: SpatialComponentDefinition["geometry"];
  dimensions: SpatialDimensions;
  transform: SpatialTransform;
  materials: readonly SpatialResolvedMaterial[];
  primaryMaterialSlot: SpatialMaterialSlotId;
  media?: SpatialMediaRef;
  actions: readonly SpatialActionRef[];
  visible: boolean;
  semanticLabel: string;
}

export interface SpatialRenderPlan {
  schemaVersion: SpatialSchemaVersion;
  roomId: string;
  roomRevision: number;
  fingerprint: string;
  entryStateId: string;
  componentKeys: readonly string[];
  assets: readonly SpatialAssetRef[];
  eagerAssetIds: readonly string[];
  lazyAssetIds: readonly string[];
  items: readonly SpatialRenderItem[];
  states: readonly SpatialSceneState[];
  semanticFallback: readonly SpatialSemanticItem[];
  budgets: {
    layoutJsonBytes: number;
    eagerCompressedAssetBytes: number;
    totalCompressedAssetBytes: number;
  };
}

export interface SpatialDraftEnvelope {
  schemaVersion: typeof SPATIAL_DRAFT_SCHEMA_VERSION;
  roomId: string;
  fixtureRevision: number;
  roomFingerprint: string;
  savedAt: string;
  room: SpatialRoomDefinition;
}

export function spatialComponentKey(ref: SpatialComponentRef): string {
  return `${ref.componentId}@${ref.version}`;
}

export const ID_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,119}$/;
export const VERSION_PATTERN = /^[1-9][0-9]{0,3}(?:\.[0-9]{1,4}){0,2}$/;
