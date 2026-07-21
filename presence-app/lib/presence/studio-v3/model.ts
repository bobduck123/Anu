import type { PresenceCollection, PresenceEditableConfig, PresenceWork } from "../../api/types.ts";
import type {
  StudioV2ChamberComposition,
  StudioV2MotionIntensity,
  StudioV2BorderStyle,
  StudioV2ObjectType,
  StudioV2PublicStylePreset,
  StudioV2PublicRoom,
  StudioV2State,
  StudioV2Texture,
  StudioV2WorldId,
} from "../studio-v2/index.ts";
import type { StudioV3CollectionSourceRef, StudioV3SourceRef } from "./sourceRefs.ts";

export const STUDIO_V3_LOCAL_SCHEMA_VERSION = "presence-studio-v3-p1-local-v1" as const;
export const STUDIO_V3_HIDDEN_OR_UNAVAILABLE_REASON = "This Piece is hidden or unavailable in the owner Library." as const;

export type StudioV3RoomStyleId = "threshold-portal" | "gallery-wall" | "film-strip-selected-works";
export type StudioV3LookId = "soft-editorial" | "nocturnal-gallery" | "zine-archive";
export type StudioV3CollectionPresentationId = "wall" | "selected-sequence" | "threshold-feature";
export type StudioV3Density = "spacious" | "focused" | "dense";
export type StudioV3Atmosphere = "paper-light" | "nocturnal-depth" | "ledger-scan";
export type StudioV3PieceTreatment = "quiet-framed" | "luminous-depth" | "captioned-ledger";
export type StudioV3Journey = "editorial-browse" | "threshold-reveal" | "archive-index";
export type StudioV3ModePreference = "simple" | "advanced-creative";
export type StudioV3Layer =
  | "presence-look"
  | "room-style"
  | "collection-presentation"
  | "piece-treatment"
  | "motion-atmosphere"
  | "navigation-journey";
export type StudioV3ScopeKind = "presence" | "room" | "collection" | "piece";

export interface StudioV3BaseIdentity {
  sourceKind: "draft" | "published";
  configId: number;
  roomId: number;
  version: number;
  revision: number | null;
  status: string;
  schemaVersion: string;
  updatedAt?: string | null;
}

export interface StudioV3BaseSnapshot {
  identity: StudioV3BaseIdentity;
  fingerprint: string;
  comparableConfig: StudioV3ComparableConfig;
  localPersistence: "available" | "memory-only";
  reason?: string;
}

export interface StudioV3ComparableConfig {
  schema_version: string;
  renderer_key: string | null;
  scene_config: Record<string, unknown>;
  style_dna: Record<string, unknown>;
  motion_config: Record<string, unknown>;
  asset_config: Record<string, unknown>;
  content_config: Record<string, unknown>;
  roomkey_config: Record<string, unknown>;
  enquiry_config: Record<string, unknown>;
  locked_fields: Record<string, unknown>;
}

export type StudioV3PostPayload = Omit<StudioV3ComparableConfig, "schema_version">;

export interface StudioV3Piece {
  id: string;
  sourceRef: StudioV3SourceRef;
  title: string;
  date?: string;
  description?: string;
  media?: { src: string; alt: string };
  mediaType: "image" | "writing" | "unknown";
  compatibleRoomStyles: StudioV3RoomStyleId[];
  sourceStatus: "current" | "missing" | "unavailable";
  snapshotType: StudioV2ObjectType;
  fromWork?: PresenceWork;
}

export interface StudioV3Collection {
  id: string;
  sourceRef: StudioV3CollectionSourceRef;
  title: string;
  description?: string;
  memberSourceRefs: StudioV3SourceRef[];
  fromCollection?: PresenceCollection;
}

export interface StudioV3Placement {
  id: string;
  roomId: string;
  sourceRef: StudioV3SourceRef;
  collectionSourceRef?: StudioV3CollectionSourceRef;
  order: number;
  status: "placed" | "duplicate" | "incompatible" | "shelved";
  featured?: boolean;
  depth?: number;
  visibility?: "visible" | "hidden";
  collectionPresentationId?: StudioV3CollectionPresentationId;
  reason?: string;
}

export interface StudioV3Room {
  id: string;
  label: string;
  styleId: StudioV3RoomStyleId;
  composition?: StudioV2ChamberComposition;
  collectionPresentationId?: StudioV3CollectionPresentationId;
  placements: StudioV3Placement[];
  baseObjectIds: string[];
}

export interface StudioV3LookValues {
  background: string;
  accentColor: string;
  texture: StudioV2Texture;
  borderStyle: StudioV2BorderStyle;
  objectRadius: number;
  shadowDepth: number;
  headingWeight: number;
  motionIntensity: StudioV2MotionIntensity;
  publicStylePreset: StudioV2PublicStylePreset;
  roomStyleId: StudioV3RoomStyleId;
  worldId: StudioV2WorldId;
  collectionPresentationId: StudioV3CollectionPresentationId;
  atmosphere: StudioV3Atmosphere;
  density: StudioV3Density;
  pieceTreatment: StudioV3PieceTreatment;
  journey: StudioV3Journey;
}

export interface StudioV3Look {
  id: StudioV3LookId | `named:${string}`;
  name: string;
  origin: "system" | "owner";
  baseLookId?: StudioV3LookId;
  values: StudioV3LookValues;
  provenance: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudioV3LayerLock {
  id: string;
  scopeKind: StudioV3ScopeKind;
  scopeId: string;
  layer: StudioV3Layer;
  value: unknown;
  reason: string;
}

export interface StudioV3LayerOverrideValue {
  background?: string;
  accentColor?: string;
  texture?: StudioV2Texture;
  borderStyle?: StudioV2BorderStyle;
  objectRadius?: number;
  shadowDepth?: number;
  headingWeight?: number;
  motionIntensity?: StudioV2MotionIntensity;
  publicStylePreset?: StudioV2PublicStylePreset;
  roomStyleId?: StudioV3RoomStyleId;
  worldId?: StudioV2WorldId;
  collectionPresentationId?: StudioV3CollectionPresentationId;
  density?: StudioV3Density;
  pieceTreatment?: StudioV3PieceTreatment;
  atmosphere?: StudioV3Atmosphere;
  journey?: StudioV3Journey;
}

export interface StudioV3LayerOverride {
  id: string;
  scopeKind: StudioV3ScopeKind;
  scopeId: string;
  layer: StudioV3Layer;
  value: StudioV3LayerOverrideValue;
  provenance: string;
}

export interface StudioV3NavigationState {
  entryRoomId: string;
  roomOrder: string[];
  requiredCta: {
    sourceRef?: StudioV3SourceRef;
    visible: boolean;
    destinationToken?: "existing-base" | `room:${string}`;
  };
}

export interface StudioV3StructuralRoomState {
  roomId: string;
  order: number;
  styleId: StudioV3RoomStyleId;
  collectionPresentationId?: StudioV3CollectionPresentationId;
  composition?: StudioV2ChamberComposition;
  baseObjectIds: string[];
  placements: StudioV3Placement[];
}

export interface StudioV3StructuralSavepoint {
  id: string;
  createdAt: string;
  activeRoomId: string;
  activeLookId: StudioV3Look["id"];
  navigation: StudioV3NavigationState;
  rooms: StudioV3StructuralRoomState[];
  locks: StudioV3LayerLock[];
  layerOverrides: StudioV3LayerOverride[];
  lookProvenance: string;
  baseRevision: number | null;
  fingerprint: string;
}

export interface StudioV3Document {
  schemaVersion: typeof STUDIO_V3_LOCAL_SCHEMA_VERSION;
  nodeId: number;
  slug: string;
  title: string;
  activeRoomId: string;
  activeLookId: StudioV3Look["id"];
  mode: StudioV3ModePreference;
  base: StudioV3BaseSnapshot;
  rooms: StudioV3Room[];
  pieces: Record<string, StudioV3Piece>;
  collections: Record<string, StudioV3Collection>;
  looks: Record<string, StudioV3Look>;
  locks: StudioV3LayerLock[];
  layerOverrides: StudioV3LayerOverride[];
  navigation: StudioV3NavigationState;
  savepoints: StudioV3StructuralSavepoint[];
  namedLooks: StudioV3Look[];
  selection?: { kind: "piece"; pieceId: string } | { kind: "room"; roomId: string };
  diagnostics: StudioV3CompileIssue[];
}

export interface StudioV3CompileIssue {
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
  sourceRef?: StudioV3SourceRef;
  roomId?: string;
  resolution?: "placed" | "shelved" | "unplaced" | "blocked";
}

export interface StudioV3CompileResult {
  document: StudioV3Document;
  studioV2State: StudioV2State;
  publicRoom: StudioV2PublicRoom;
  comparableConfig: StudioV3ComparableConfig;
  issues: StudioV3CompileIssue[];
  placements: StudioV3Placement[];
}

export interface StudioV3HydrateInput {
  nodeId: number;
  slug: string;
  title: string;
  baseConfig: PresenceEditableConfig;
  base: StudioV3BaseSnapshot;
  studioV2State: StudioV2State;
  works: PresenceWork[];
  collections: PresenceCollection[];
  now?: string;
}

export const STUDIO_V3_COMPARABLE_KEYS = [
  "schema_version",
  "renderer_key",
  "scene_config",
  "style_dna",
  "motion_config",
  "asset_config",
  "content_config",
  "roomkey_config",
  "enquiry_config",
  "locked_fields",
] as const;

export const STUDIO_V3_POST_KEYS = [
  "renderer_key",
  "scene_config",
  "style_dna",
  "motion_config",
  "asset_config",
  "content_config",
  "roomkey_config",
  "enquiry_config",
  "locked_fields",
] as const;
