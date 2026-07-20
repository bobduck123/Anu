import type { StudioV2Chamber, StudioV2PublicChamber, StudioV2Skin, StudioV2WorldId } from "./model";

export type StudioV2EnvironmentFocus = "room" | "chamber" | "object";
export type StudioV2PerformanceProfile = "high" | "balanced" | "reduced" | "fallback";

export interface StudioV2EnvironmentModel {
  worldId: StudioV2WorldId;
  focus: StudioV2EnvironmentFocus;
  focusedChamberId: string | null;
  focusedObjectId: string | null;
  depthLayers: 3;
  camera: "room" | "chamber" | "object";
  motion: StudioV2Skin["motionIntensity"];
  texture: StudioV2Skin["texture"];
  performance: StudioV2PerformanceProfile;
}

/**
 * Shared editor/preview environmental contract. It deliberately derives from
 * the persisted V2 room model rather than adding an editor-only world schema.
 * The first slice uses DOM depth layers; a future WebGL layer may consume this
 * exact contract without changing rooms, ownership, or draft persistence.
 */
export function deriveStudioV2Environment({
  worldId,
  skin,
  chambers,
  focusedChamberId = null,
  focusedObjectId = null,
  performance = "balanced",
}: {
  worldId: StudioV2WorldId;
  skin: StudioV2Skin;
  chambers: Array<StudioV2Chamber | StudioV2PublicChamber>;
  focusedChamberId?: string | null;
  focusedObjectId?: string | null;
  performance?: StudioV2PerformanceProfile;
}): StudioV2EnvironmentModel {
  const resolvedChamberId = focusedChamberId && chambers.some((chamber) => chamber.id === focusedChamberId)
    ? focusedChamberId
    : null;
  const focus: StudioV2EnvironmentFocus = focusedObjectId
    ? "object"
    : resolvedChamberId
      ? "chamber"
      : "room";

  return {
    worldId,
    focus,
    focusedChamberId: resolvedChamberId,
    focusedObjectId,
    depthLayers: 3,
    camera: focus,
    motion: skin.motionIntensity,
    texture: skin.texture,
    performance,
  };
}
