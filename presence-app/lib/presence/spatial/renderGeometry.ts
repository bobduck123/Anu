import type { SpatialRenderGeometry } from "./model.ts";

export const DEFAULT_SPATIAL_DRACO_DECODER_PATH = "/presence-spatial/draco/gltf/" as const;

export interface SpatialGlbLoaderPlan {
  url: string;
  useDraco: boolean;
  decoderPath?: string;
}

export function spatialGlbLoaderPlan(
  geometry: Extract<SpatialRenderGeometry, { kind: "glb" }>,
): SpatialGlbLoaderPlan {
  return {
    url: geometry.url,
    useDraco: geometry.compression === "draco",
    decoderPath: geometry.compression === "draco"
      ? geometry.decoderPath ?? DEFAULT_SPATIAL_DRACO_DECODER_PATH
      : undefined,
  };
}
