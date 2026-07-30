import type {
  StudioV3Look,
  StudioV3LookId,
  StudioV3RoomStyleId,
} from "./model.ts";
import {
  PRESENCE_LOOK_DEFINITIONS,
  PRESENCE_LOOK_ROOM_STYLE_COMPATIBILITY,
  PRESENCE_ROOM_STYLE_DEFINITIONS,
  getPresenceRoomStyleDefinition,
  resolvePresenceLookRoomStyleCompatibility,
  type PresenceLookRoomStyleCompatibilityDefinition,
  type PresenceRoomStyleDefinition,
} from "./styleCatalog.ts";

export const STUDIO_V3_SOFT_EDITORIAL_LOOK = PRESENCE_LOOK_DEFINITIONS[0].systemLook;
export const STUDIO_V3_NOCTURNAL_GALLERY_LOOK = PRESENCE_LOOK_DEFINITIONS[1].systemLook;
export const STUDIO_V3_ZINE_ARCHIVE_LOOK = PRESENCE_LOOK_DEFINITIONS[2].systemLook;

export const STUDIO_V3_P0_LOOKS: readonly StudioV3Look[] = [
  STUDIO_V3_SOFT_EDITORIAL_LOOK,
  STUDIO_V3_NOCTURNAL_GALLERY_LOOK,
];

export const STUDIO_V3_P1_LOOKS: readonly StudioV3Look[] = [
  ...STUDIO_V3_P0_LOOKS,
  STUDIO_V3_ZINE_ARCHIVE_LOOK,
];

export type StudioV3RoomStyleDefinition = PresenceRoomStyleDefinition;

export const STUDIO_V3_ROOM_STYLE_DEFINITIONS: readonly StudioV3RoomStyleDefinition[] = PRESENCE_ROOM_STYLE_DEFINITIONS;

export type StudioV3LookRoomStyleCompatibility = PresenceLookRoomStyleCompatibilityDefinition;

export const STUDIO_V3_LOOK_ROOM_STYLE_COMPATIBILITY: readonly StudioV3LookRoomStyleCompatibility[] =
  PRESENCE_LOOK_ROOM_STYLE_COMPATIBILITY;

export function studioV3RoomStyleDefinition(roomStyleId: StudioV3RoomStyleId): StudioV3RoomStyleDefinition {
  return getPresenceRoomStyleDefinition(roomStyleId);
}

export function resolveStudioV3LookRoomStyleCompatibility(
  look: StudioV3Look,
  roomStyleId: StudioV3RoomStyleId,
): StudioV3LookRoomStyleCompatibility {
  const baseLookId = look.baseLookId ?? (look.origin === "system" ? look.id as StudioV3LookId : "soft-editorial");
  return resolvePresenceLookRoomStyleCompatibility(baseLookId, roomStyleId);
}
