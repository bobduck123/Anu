import type {
  SpatialInteractionProfile,
  SpatialInteractionProfileId,
} from "./model.ts";

export const SPATIAL_INTERACTION_PROFILES: Readonly<Record<SpatialInteractionProfileId, SpatialInteractionProfile>> = {
  "piece-inspect-near": {
    id: "piece-inspect-near",
    label: "Inspect Piece nearby",
    kind: "inspect",
    targetCategory: "piece",
    translation: { mode: "toward-camera", distance: 0.9 },
    rotation: { mode: "preserve", yawOffset: 0 },
    preserveParentContext: true,
    deterministicReturn: true,
  },
  "rack-turn-outward": {
    id: "rack-turn-outward",
    label: "Turn outward beside parent fixture",
    kind: "inspect",
    targetCategory: "piece",
    translation: { mode: "toward-camera", distance: 0.68 },
    rotation: { mode: "face-camera-y", yawOffset: 0 },
    preserveParentContext: true,
    deterministicReturn: true,
  },
};

export function spatialInteractionProfile(id?: SpatialInteractionProfileId): SpatialInteractionProfile | undefined {
  return id ? SPATIAL_INTERACTION_PROFILES[id] : undefined;
}
