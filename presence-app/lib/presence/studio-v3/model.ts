import type { PresenceCollection, PresenceEditableConfig, PresenceWork } from "../../api/types.ts";
import type {
  StudioV2ChamberComposition,
  StudioV2MotionIntensity,
  StudioV2ObjectType,
  StudioV2PublicRoom,
  StudioV2State,
} from "../studio-v2/index.ts";
import type { StudioV3SourceRef } from "./sourceRefs.ts";

export const STUDIO_V3_LOCAL_SCHEMA_VERSION = "presence-studio-v3-p0-local-v1" as const;

export type StudioV3RoomStyleId = "threshold-portal" | "gallery-wall";
export type StudioV3LookId = "soft-editorial" | "nocturnal-gallery";
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
  sourceRef: `collection:${number}`;
  title: string;
  description?: string;
  memberSourceRefs: StudioV3SourceRef[];
  fromCollection?: PresenceCollection;
}

export interface StudioV3Placement {
  id: string;
  roomId: string;
  sourceRef: StudioV3SourceRef;
  collectionSourceRef?: `collection:${number}`;
  order: number;
  status: "placed" | "duplicate" | "incompatible" | "shelved";
  reason?: string;
}

export interface StudioV3Room {
  id: string;
  label: string;
  styleId: StudioV3RoomStyleId;
  composition?: StudioV2ChamberComposition;
  placements: StudioV3Placement[];
  baseObjectIds: string[];
}

export interface StudioV3LookValues {
  background: string;
  accentColor: string;
  texture: "paper" | "grain" | "linen" | "none";
  borderStyle: "hairline" | "framed" | "none";
  objectRadius: number;
  shadowDepth: number;
  headingWeight: number;
  motionIntensity: StudioV2MotionIntensity;
  publicStylePreset: "gallery-p2" | "bbbvision-threshold-gallery";
  roomStyleId: StudioV3RoomStyleId;
}

export interface StudioV3Look {
  id: StudioV3LookId | `named:${string}`;
  name: string;
  origin: "system" | "owner";
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
  resolution?: "placed" | "shelved" | "blocked";
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
