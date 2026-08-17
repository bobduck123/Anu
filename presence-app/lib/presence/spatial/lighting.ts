import type {
  SpatialLightingProfile,
  SpatialLightingProfileId,
} from "./model.ts";

export const DEFAULT_SPATIAL_LIGHTING_PROFILE_ID: SpatialLightingProfileId = "spatial-core-neutral";

export const SPATIAL_LIGHTING_PROFILES: Readonly<Record<SpatialLightingProfileId, SpatialLightingProfile>> = {
  "spatial-core-neutral": {
    id: "spatial-core-neutral",
    label: "Spatial core neutral",
    background: "#111318",
    toneMappingExposure: 0.95,
    lights: [
      { id: "ambient-hemi", kind: "hemisphere", color: "#f7f2e5", groundColor: "#17191d", intensity: 1.55 },
      { id: "key", kind: "directional", color: "#ffffff", intensity: 1.8, position: [5, 9, 8] },
      { id: "fill", kind: "directional", color: "#f2cbb9", intensity: 0.55, position: [-7, 4, 1] },
    ],
  },
  "gallery-soft": {
    id: "gallery-soft",
    label: "Gallery soft",
    background: "#e4e1d9",
    toneMappingExposure: 1,
    lights: [
      { id: "gallery-hemi", kind: "hemisphere", color: "#fffdf5", groundColor: "#77746f", intensity: 1.35 },
      { id: "gallery-key", kind: "directional", color: "#fff8e9", intensity: 1.45, position: [4, 8, 6] },
      { id: "gallery-fill", kind: "directional", color: "#dfe8ff", intensity: 0.4, position: [-5, 3, -2] },
    ],
  },
  "boutique-product-warm": {
    id: "boutique-product-warm",
    label: "Warm product-first boutique",
    background: "#08090a",
    toneMappingExposure: 1.34,
    lights: [
      { id: "boutique-hemi", kind: "hemisphere", color: "#f5e7cf", groundColor: "#111216", intensity: 0.88 },
      { id: "boutique-ambient", kind: "ambient", color: "#d8d3ca", intensity: 0.18 },
      { id: "entry-fill", kind: "directional", color: "#eee5da", intensity: 1.05, position: [-5, 6, 12], target: [0, 1.4, -6] },
      { id: "left-display", kind: "spot", color: "#ffd6a2", intensity: 58, position: [-5.2, 5.2, 1], target: [-5.2, 1.4, -2], distance: 18, angle: 0.62, penumbra: 0.62 },
      { id: "rack-wash", kind: "spot", color: "#ffd9ad", intensity: 82, position: [8.2, 5.1, -1], target: [8.5, 1.8, -5], distance: 20, angle: 0.7, penumbra: 0.58 },
      { id: "island-pool", kind: "point", color: "#ffc98f", intensity: 46, position: [0, 3.8, 1], distance: 12 },
      { id: "rear-campaign", kind: "spot", color: "#ffe0b8", intensity: 46, position: [0, 5, -12], target: [0, 2.5, -16], distance: 12, angle: 0.7, penumbra: 0.7 },
      { id: "rack-edge", kind: "point", color: "#fff0d6", intensity: 34, position: [6.8, 2.8, -7], distance: 9 },
    ],
  },
};

export function spatialLightingProfile(id?: SpatialLightingProfileId): SpatialLightingProfile | undefined {
  return SPATIAL_LIGHTING_PROFILES[id ?? DEFAULT_SPATIAL_LIGHTING_PROFILE_ID];
}

export function requireSpatialLightingProfile(id?: SpatialLightingProfileId): SpatialLightingProfile {
  const profile = spatialLightingProfile(id);
  if (!profile) throw new Error(`Unknown spatial lighting profile ${String(id)}.`);
  return profile;
}
