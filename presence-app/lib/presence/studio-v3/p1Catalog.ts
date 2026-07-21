import type { PresenceStudioV2LayoutId, StudioV2PublicStylePreset, StudioV2WorldId } from "../studio-v2/index.ts";
import type {
  StudioV3CollectionPresentationId,
  StudioV3Look,
  StudioV3LookId,
  StudioV3RoomStyleId,
} from "./model.ts";

export const STUDIO_V3_SOFT_EDITORIAL_LOOK: StudioV3Look = {
  id: "soft-editorial",
  baseLookId: "soft-editorial",
  name: "Soft Editorial",
  origin: "system",
  provenance: "studio-v3-p1-system-look",
  values: {
    background: "#f7f3ea",
    accentColor: "#8f6f3f",
    texture: "linen",
    borderStyle: "hairline",
    objectRadius: 12,
    shadowDepth: 0.24,
    headingWeight: 650,
    motionIntensity: "still",
    publicStylePreset: "gallery-p2",
    roomStyleId: "gallery-wall",
    worldId: "gallery",
    collectionPresentationId: "wall",
    atmosphere: "paper-light",
    density: "spacious",
    pieceTreatment: "quiet-framed",
    journey: "editorial-browse",
  },
};

export const STUDIO_V3_NOCTURNAL_GALLERY_LOOK: StudioV3Look = {
  id: "nocturnal-gallery",
  baseLookId: "nocturnal-gallery",
  name: "Nocturnal Gallery",
  origin: "system",
  provenance: "studio-v3-p1-system-look",
  values: {
    background: "#050505",
    accentColor: "#ffd84d",
    texture: "grain",
    borderStyle: "hairline",
    objectRadius: 2,
    shadowDepth: 0.58,
    headingWeight: 520,
    motionIntensity: "gentle",
    publicStylePreset: "bbbvision-threshold-gallery",
    roomStyleId: "threshold-portal",
    worldId: "gallery",
    collectionPresentationId: "threshold-feature",
    atmosphere: "nocturnal-depth",
    density: "focused",
    pieceTreatment: "luminous-depth",
    journey: "threshold-reveal",
  },
};

export const STUDIO_V3_ZINE_ARCHIVE_LOOK: StudioV3Look = {
  id: "zine-archive",
  baseLookId: "zine-archive",
  name: "Zine Archive",
  origin: "system",
  provenance: "studio-v3-p1-system-look",
  values: {
    background: "#2b1118",
    accentColor: "#f1c96a",
    texture: "ledger",
    borderStyle: "ledger",
    objectRadius: 0,
    shadowDepth: 0.12,
    headingWeight: 780,
    motionIntensity: "living",
    publicStylePreset: "gallery-p2",
    roomStyleId: "film-strip-selected-works",
    worldId: "zine",
    collectionPresentationId: "selected-sequence",
    atmosphere: "ledger-scan",
    density: "dense",
    pieceTreatment: "captioned-ledger",
    journey: "archive-index",
  },
};

export const STUDIO_V3_P0_LOOKS: readonly StudioV3Look[] = [
  STUDIO_V3_SOFT_EDITORIAL_LOOK,
  STUDIO_V3_NOCTURNAL_GALLERY_LOOK,
];

export const STUDIO_V3_P1_LOOKS: readonly StudioV3Look[] = [
  ...STUDIO_V3_P0_LOOKS,
  STUDIO_V3_ZINE_ARCHIVE_LOOK,
];

export interface StudioV3RoomStyleDefinition {
  id: StudioV3RoomStyleId;
  label: string;
  v2LayoutId: PresenceStudioV2LayoutId;
  collectionPresentationId: StudioV3CollectionPresentationId;
  hierarchy: "dominant-entry" | "paced-wall" | "active-work-sequence";
  interaction: "onward-portal" | "ordered-browse" | "previous-next-index";
}

export const STUDIO_V3_ROOM_STYLE_DEFINITIONS: readonly StudioV3RoomStyleDefinition[] = [
  {
    id: "threshold-portal",
    label: "Threshold Portal",
    v2LayoutId: "portal-threshold",
    collectionPresentationId: "threshold-feature",
    hierarchy: "dominant-entry",
    interaction: "onward-portal",
  },
  {
    id: "gallery-wall",
    label: "Gallery Wall",
    v2LayoutId: "gallery-wall",
    collectionPresentationId: "wall",
    hierarchy: "paced-wall",
    interaction: "ordered-browse",
  },
  {
    id: "film-strip-selected-works",
    label: "Film Strip / Selected Works",
    v2LayoutId: "film-strip-selected-works",
    collectionPresentationId: "selected-sequence",
    hierarchy: "active-work-sequence",
    interaction: "previous-next-index",
  },
];

export interface StudioV3LookRoomStyleCompatibility {
  lookId: StudioV3LookId;
  roomStyleId: StudioV3RoomStyleId;
  v2LayoutId: PresenceStudioV2LayoutId;
  publicStylePreset: StudioV2PublicStylePreset;
  worldId: StudioV2WorldId;
  collectionPresentationId: StudioV3CollectionPresentationId;
}

export const STUDIO_V3_LOOK_ROOM_STYLE_COMPATIBILITY: readonly StudioV3LookRoomStyleCompatibility[] =
  STUDIO_V3_P1_LOOKS.flatMap((look) => STUDIO_V3_ROOM_STYLE_DEFINITIONS.map((style) => ({
    lookId: look.id as StudioV3LookId,
    roomStyleId: style.id,
    v2LayoutId: style.v2LayoutId,
    publicStylePreset: look.values.publicStylePreset,
    worldId: look.values.worldId,
    collectionPresentationId: style.collectionPresentationId,
  })));

export function studioV3RoomStyleDefinition(roomStyleId: StudioV3RoomStyleId): StudioV3RoomStyleDefinition {
  return STUDIO_V3_ROOM_STYLE_DEFINITIONS.find((item) => item.id === roomStyleId) ?? STUDIO_V3_ROOM_STYLE_DEFINITIONS[1];
}

export function resolveStudioV3LookRoomStyleCompatibility(
  look: StudioV3Look,
  roomStyleId: StudioV3RoomStyleId,
): StudioV3LookRoomStyleCompatibility {
  const baseLookId = look.baseLookId ?? (look.origin === "system" ? look.id as StudioV3LookId : "soft-editorial");
  return STUDIO_V3_LOOK_ROOM_STYLE_COMPATIBILITY.find((item) => item.lookId === baseLookId && item.roomStyleId === roomStyleId)
    ?? STUDIO_V3_LOOK_ROOM_STYLE_COMPATIBILITY.find((item) => item.lookId === "soft-editorial" && item.roomStyleId === roomStyleId)
    ?? STUDIO_V3_LOOK_ROOM_STYLE_COMPATIBILITY[0];
}
