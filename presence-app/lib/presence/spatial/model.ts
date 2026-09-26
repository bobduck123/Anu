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
  | `piece-library:${string}`
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
  | "light"
  | "action";

export type SpatialPrimitiveKind =
  | "box"
  | "plane"
  | "cylinder"
  | "rack"
  | "projection-field"
  | "open-shell"
  | "ribbed-wall"
  | "display-bay"
  | "rounded-island"
  | "suspended-rack"
  | "garment-hanger"
  | "framed-media"
  | "projection-grid"
  | "display-shelf"
  | "sign-card"
  | "product-block"
  | "light-fixture"
  | "drape-divider"
  | "archive-wall"
  | "listening-station"
  | "spherical-gallery";
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
  | "accent-signal"
  | "wall-warm-sculptural"
  | "wall-boutique-charcoal"
  | "tabletop-pale-sculptural"
  | "rack-boutique-blackened"
  | "fabric-garment-dark"
  | "fabric-garment-signal"
  | "projection-campaign-warm"
  | "wall-lookbook-graphite"
  | "floor-lookbook-slate"
  | "tabletop-lookbook-riser"
  | "rack-lookbook-steel";

export type SpatialMaterialStylePresetId =
  | "white-gallery"
  | "nocturnal-black-gallery"
  | "soft-paper-room"
  | "industrial-concrete"
  | "polished-charcoal-tile"
  | "warm-timber-studio"
  | "archive-paper"
  | "boutique-chrome"
  | "projection-blackout"
  | "warm-nocturnal-boutique"
  | "lookbook-rack";

export type SpatialLightingProfileId =
  | "spatial-core-neutral"
  | "gallery-soft"
  | "boutique-product-warm"
  | "lookbook-rack-warm";

export type SpatialInteractionProfileId =
  | "piece-inspect-near"
  | "rack-turn-outward";

export type SpatialLightKind = "hemisphere" | "ambient" | "directional" | "point" | "spot";

export interface SpatialLightDefinition {
  id: string;
  kind: SpatialLightKind;
  color: string;
  intensity: number;
  position?: SpatialVec3;
  target?: SpatialVec3;
  distance?: number;
  angle?: number;
  penumbra?: number;
  groundColor?: string;
}

export interface SpatialLightingProfile {
  id: SpatialLightingProfileId;
  label: string;
  background: string;
  toneMappingExposure: number;
  lights: readonly SpatialLightDefinition[];
}

export interface SpatialInteractionProfile {
  id: SpatialInteractionProfileId;
  label: string;
  kind: "inspect";
  targetCategory: "piece";
  translation: {
    mode: "toward-camera";
    distance: number;
  };
  rotation: {
    mode: "preserve" | "face-camera-y";
    yawOffset: number;
  };
  preserveParentContext: true;
  deterministicReturn: true;
}

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

export interface SpatialOptionRef {
  optionId: string;
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

export type SpatialRenderGeometry =
  | {
      kind: "glb";
      url: string;
      compression: "none" | "draco";
      decoderPath?: string;
      fallbackPrimitive: SpatialPrimitiveKind;
      runtimeSizeKb: number;
      decoderSizeKb?: number;
    };

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
  renderGeometry?: SpatialRenderGeometry;
  placement: SpatialComponentPlacementContract;
  anchors: readonly SpatialAnchorDefinition[];
  materialSlots: readonly SpatialMaterialSlotId[];
  license: SpatialComponentLicense;
  runtime: SpatialRuntimeAssetProfile;
  mobileFallback: SpatialMobileFallback;
}

export interface SpatialAssetRef {
  id: string;
  kind: "shape" | "image" | "poster" | "logo" | "audio" | "video";
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
  kind: "image" | "poster" | "logo" | "placeholder" | "audio" | "video";
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
      kind: "open-link" | "listen" | "watch" | "enquire";
      href: string;
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

export type SpatialArrangementKind = "grid" | "row" | "wall-grid" | "spherical" | "rack-row";

/**
 * Every implemented arrangement, in operator-facing order.
 *
 * The authoring UI renders this list directly. Rendered QA found a hand-written
 * option list that had silently omitted `rack-row`, which made three completed
 * passes of rack work unreachable; deriving the list removes that failure mode.
 */
export const SPATIAL_ARRANGEMENT_KINDS = [
  "rack-row",
  "wall-grid",
  "grid",
  "row",
  "spherical",
] as const satisfies readonly SpatialArrangementKind[];

/**
 * Article a garment carrier represents.
 *
 * The carrier supplies bounds, hang point and inspection framing only. It never
 * contributes a visible silhouette: the client artwork's alpha channel does that,
 * so one carrier serves a cropped tee and a long coat equally.
 */
export type SpatialGarmentArticleType = "shirt" | "pant" | "shoe" | "generic";

export const SPATIAL_GARMENT_ARTICLE_TYPES = ["shirt", "pant", "shoe", "generic"] as const satisfies readonly SpatialGarmentArticleType[];

/**
 * Which artwork surface a garment media ref feeds.
 *
 * Shirts and pants read front/back. Shoes deliberately do not: footwear is shown
 * from the outer side and above, so pretending a shoe has a "back print" would
 * be a false model rather than a missing feature.
 */
export type SpatialGarmentArtworkRole = "front" | "back" | "display" | "outer-side" | "top";

/**
 * Default artwork aspect (width / height) per article.
 *
 * `SpatialMediaRef` carries no intrinsic dimensions, so a per-article default is
 * used unless a piece supplies an explicit `artworkAspect`. A pant plane is tall
 * and narrow; a shoe plane is wide and short.
 */
export const SPATIAL_GARMENT_DEFAULT_ASPECT: Readonly<Record<SpatialGarmentArticleType, number>> = {
  shirt: 0.95,
  pant: 0.46,
  shoe: 1.6,
  generic: 0.9,
};

/**
 * How an article presents on a rack.
 *
 * Shared by the arrangement (which places the slot on the rail) and the geometry
 * template (which builds artwork and hardware inside the carrier), so a pant
 * cannot hang from a shirt's shoulder line in one and not the other.
 *
 * All offsets are in metres unless noted.
 */
export interface SpatialGarmentHangProfile {
  /** Extra vertical offset at the rail. Negative hangs lower. */
  railDrop: number;
  /** Artwork centre within the carrier volume, as a fraction of its height. */
  artworkCentreY: number;
  /** Visible hardware silhouette at the attachment point. */
  hardware: "hook-bar" | "clamp-bar" | "stand";
  /** Hardware attachment height within the carrier volume, as a fraction. */
  hardwareY: number;
  /** Forward offset from the rail plane, for articles presented rather than hung. */
  forwardOffset: number;
  /** Uniform scale nudge for rack presentation. */
  rackScale: number;
  /** Interaction profile used when this article is inspected. */
  inspectionProfileId: SpatialInteractionProfileId;
}

export const SPATIAL_GARMENT_HANG_PROFILES: Readonly<Record<SpatialGarmentArticleType, SpatialGarmentHangProfile>> = {
  // Hangs from the shoulder line on a normal hanger.
  shirt: {
    railDrop: 0,
    artworkCentreY: -0.02,
    hardware: "hook-bar",
    hardwareY: 0.39,
    forwardOffset: 0,
    rackScale: 1,
    inspectionProfileId: "rack-turn-outward",
  },
  // Hangs lower and from a waistband clamp, not a shoulder line.
  pant: {
    railDrop: -0.34,
    artworkCentreY: -0.08,
    hardware: "clamp-bar",
    // The clamp grips the waistband at the top of the carrier so the trousers
    // hang beneath it; the whole assembly then drops lower on the rail.
    hardwareY: 0.45,
    forwardOffset: 0,
    rackScale: 1,
    inspectionProfileId: "rack-turn-outward",
  },
  // Footwear does not hang. It sits low on a small stand, presented forward.
  // This is a rack-display proxy, not solved footwear.
  shoe: {
    railDrop: -0.62,
    artworkCentreY: -0.24,
    hardware: "stand",
    hardwareY: -0.3,
    forwardOffset: 0.08,
    rackScale: 0.82,
    inspectionProfileId: "piece-inspect-near",
  },
  // Unchanged Stage A presentation.
  generic: {
    railDrop: 0,
    artworkCentreY: -0.04,
    hardware: "hook-bar",
    hardwareY: 0.39,
    forwardOffset: 0,
    rackScale: 1,
    inspectionProfileId: "rack-turn-outward",
  },
};

/** Bounds for an operator-supplied artwork aspect override. */
export const SPATIAL_GARMENT_ASPECT_RANGE = { min: 0.2, max: 4 } as const;

export type SpatialArrangementOverflowPolicy =
  | "show-all-if-possible"
  | "paginate"
  | "overflow-list"
  | "reject-over-capacity";

export interface SpatialContentArrangement {
  kind: SpatialArrangementKind;
  overflowPolicy: SpatialArrangementOverflowPolicy;
  capacity: number;
  pageSize?: number;
  seed?: string;
}

export interface SpatialContentBinding {
  id: string;
  hostPlacementId: string;
  pieceRef: SpatialLogicalRef;
  pieceType: PieceType;
  label: string;
  caption?: string;
  mediaRefs: readonly string[];
  actionRefs: readonly string[];
  order: number;
  arrangementRole: "primary" | "supporting" | "overflow";
  /** Garment carrier article; absent for non-garment bindings. */
  garmentArticleType?: SpatialGarmentArticleType;
  /** Media id for the front print layer. Resolved against `room.media`. */
  frontImageRef?: string;
  /** Media id for the back print layer; may differ from the front. */
  backImageRef?: string;
  /** Neutral display image, and the only artwork channel a shoe is expected to use. */
  displayImageRef?: string;
  /** Footwear outer-side artwork. */
  outerSideImageRef?: string;
  /** Footwear top/three-quarter artwork. */
  topImageRef?: string;
  /** Artwork width / height override; falls back to the per-article default. */
  artworkAspect?: number;
}

export interface SpatialPieceLibraryItem {
  id: string;
  pieceType: PieceType;
  label: string;
  caption?: string;
  mediaRefs: readonly string[];
  actionRefs: readonly string[];
  tags: readonly string[];
  collectionRefs: readonly string[];
  safety: "internal-fixture" | "public-safe";
  createdAt: string;
  updatedAt: string;
  garmentArticleType?: SpatialGarmentArticleType;
  frontImageRef?: string;
  backImageRef?: string;
  displayImageRef?: string;
  outerSideImageRef?: string;
  topImageRef?: string;
  artworkAspect?: number;
}

export interface SpatialPlacement extends SpatialComponentRef {
  id: string;
  order: number;
  optionRef?: SpatialOptionRef;
  transform: SpatialTransform;
  anchor: SpatialPlacementAnchor;
  contentArrangement?: SpatialContentArrangement;
  materialSlotOverrides: Partial<Record<SpatialMaterialSlotId, SpatialMaterialPresetId>>;
  skinRef?: string;
  mediaRef?: string;
  interactionProfileId?: SpatialInteractionProfileId;
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

export interface SpatialContentOverflowState {
  hostPlacementId: string;
  kind: SpatialArrangementKind;
  policy: SpatialArrangementOverflowPolicy;
  totalCount: number;
  visibleCount: number;
  overflowCount: number;
  pageCount: number;
  rejected: boolean;
}

export interface SpatialCompiledContentSlot {
  bindingId: string;
  hostPlacementId: string;
  placementId: string;
  order: number;
  visible: boolean;
  overflowed: boolean;
  transform: SpatialTransform;
  anchorKind: SpatialAnchorKind;
}

export interface SpatialCompiledContentArrangement {
  hostPlacementId: string;
  kind: SpatialArrangementKind;
  policy: SpatialArrangementOverflowPolicy;
  slots: readonly SpatialCompiledContentSlot[];
  overflow: SpatialContentOverflowState;
  fallbackRows: readonly SpatialSemanticItem[];
}

export interface SpatialFallbackPresentation {
  eyebrow: string;
  title: string;
  summary: string;
  brandMediaRef?: string;
  heroMediaRef?: string;
  accentColor: string;
  backgroundColor: string;
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
  lightingProfileId?: SpatialLightingProfileId;
  fallbackPresentation?: SpatialFallbackPresentation;
  assets: readonly SpatialAssetRef[];
  skins: readonly SpatialSkinRef[];
  media: readonly SpatialMediaRef[];
  actions: readonly SpatialActionRef[];
  pieceLibrary?: readonly SpatialPieceLibraryItem[];
  placements: readonly SpatialPlacement[];
  contentBindings?: readonly SpatialContentBinding[];
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
  parentPlacementId?: string;
  componentKey: string;
  category: SpatialComponentCategory;
  geometry: SpatialComponentDefinition["geometry"];
  renderGeometry?: SpatialRenderGeometry;
  dimensions: SpatialDimensions;
  transform: SpatialTransform;
  materials: readonly SpatialResolvedMaterial[];
  primaryMaterialSlot: SpatialMaterialSlotId;
  media?: SpatialMediaRef;
  /**
   * Garment artwork channel.
   *
   * Front and back are separate media so a back print can differ from the front.
   * `missingArtwork` is surfaced honestly rather than rendering an empty carrier
   * as if it had succeeded.
   */
  garment?: {
    articleType: SpatialGarmentArticleType;
    frontMedia?: SpatialMediaRef;
    backMedia?: SpatialMediaRef;
    displayMedia?: SpatialMediaRef;
    outerSideMedia?: SpatialMediaRef;
    topMedia?: SpatialMediaRef;
    /** Resolved artwork width / height for this piece. */
    aspect: number;
    missingArtwork: boolean;
  };
  interaction?: SpatialInteractionProfile;
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
  lighting: SpatialLightingProfile;
  fallbackPresentation?: SpatialFallbackPresentation & {
    brandMedia?: SpatialMediaRef;
    heroMedia?: SpatialMediaRef;
  };
  componentKeys: readonly string[];
  assets: readonly SpatialAssetRef[];
  eagerAssetIds: readonly string[];
  lazyAssetIds: readonly string[];
  items: readonly SpatialRenderItem[];
  contentBindingArrangements: readonly SpatialCompiledContentArrangement[];
  states: readonly SpatialSceneState[];
  semanticFallback: readonly SpatialSemanticItem[];
  budgets: {
    layoutJsonBytes: number;
    eagerCompressedAssetBytes: number;
    totalCompressedAssetBytes: number;
    lazyDecoderBytes: number;
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
