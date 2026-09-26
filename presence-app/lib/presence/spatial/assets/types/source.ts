import type { SpatialDimensions, SpatialVec3 } from "../../model.ts";

/** Schema version for every artefact this ingestion pipeline writes. */
export const SPATIAL_ASSET_SCHEMA_VERSION = "presence-spatial-assets.v0" as const;
export type SpatialAssetSchemaVersion = typeof SPATIAL_ASSET_SCHEMA_VERSION;

export type SourceFormat = "glb" | "gltf";

/**
 * Heuristic classification tags. A source file may carry several tags at once.
 * These are best-effort signals for reviewers, never admission decisions.
 */
export type SourceClassificationTag =
  | "single-object-source"
  | "multi-object-source"
  | "complete-interior-source"
  | "texture-heavy-source"
  | "geometry-heavy-source"
  | "candidate-roomkit-source"
  | "needs-license-review"
  | "needs-manual-review";

export const SOURCE_CLASSIFICATION_TAGS = [
  "single-object-source",
  "multi-object-source",
  "complete-interior-source",
  "texture-heavy-source",
  "geometry-heavy-source",
  "candidate-roomkit-source",
  "needs-license-review",
  "needs-manual-review",
] as const satisfies readonly SourceClassificationTag[];

export type SourceWarningCode =
  | "no-meshes"
  | "no-node-hierarchy"
  | "unparseable-json"
  | "missing-external-buffer"
  | "missing-external-image"
  | "draco-compressed"
  | "meshopt-compressed"
  | "unsupported-extension-required"
  | "animations-present"
  | "cameras-present"
  | "lights-present"
  | "skinned-meshes-present"
  | "no-license-metadata"
  | "over-source-budget"
  | "huge-texture-payload"
  | "bounding-box-unavailable"
  | "scale-check-required"
  | "loose-part-split-unsafe"
  | "blender-unavailable"
  | "blender-failed"
  | "blender-timeout"
  | "export-cap-reached"
  | "duplicates-collapsed"
  | "thumbnail-unavailable";

export interface SourceWarning {
  code: SourceWarningCode;
  message: string;
}

/**
 * Licence provenance for a source file.
 *
 * The pipeline can only ever record `needs-review`. Clearing a licence is a
 * human act performed outside this pipeline; nothing here may assume otherwise.
 */
export interface SourceLicenseMetadata {
  status: "needs-review";
  source: "embedded" | "sidecar" | "filename" | "unknown";
  declaredCopyright: string | null;
  declaredGenerator: string | null;
  declaredAuthor: string | null;
  declaredTitle: string | null;
  declaredLicense: string | null;
  sidecarFiles: readonly string[];
  filenameHints: readonly string[];
  evidence: readonly string[];
}

export interface SourceBoundingBox {
  min: SpatialVec3;
  max: SpatialVec3;
  dimensions: SpatialDimensions;
  /** Centre of the world-space bounds, useful for pivot/origin correction. */
  center: SpatialVec3;
}

/** One separable top-level node of a source scene. */
export interface SourceNodeSummary {
  /** Index of the top-level node in the primary scene. */
  nodeIndex: number;
  name: string;
  /** Descendant nodes carrying a mesh, including the node itself. */
  meshNodeCount: number;
  meshNames: readonly string[];
  materialNames: readonly string[];
  triangleCount: number;
  /** Distinct primitive groups beneath this node; a proxy for loose-part potential. */
  primitiveCount: number;
  bounds: SourceBoundingBox | null;
  hasSkin: boolean;
}

export interface SourceAssetReport {
  schemaVersion: SpatialAssetSchemaVersion;
  sourceAssetId: string;
  sourceFilename: string;
  /** Path relative to the configured source root; the absolute root is recorded once per batch. */
  sourcePath: string;
  absoluteSourcePath: string;
  fileBytes: number;
  format: SourceFormat;
  gltfVersion: string;
  contentHash: string;

  nodeCount: number;
  /** Nodes listed directly on the primary scene, before wrapper descent. */
  sceneRootCount: number;
  /** Separable objects after descending through pass-through wrapper nodes. */
  topLevelNodeCount: number;
  /** Names of the wrapper nodes the pipeline descended through to find real objects. */
  separationRootPath: readonly string[];
  meshCount: number;
  primitiveCount: number;
  materialCount: number;
  imageCount: number;
  textureCount: number;
  animationCount: number;
  cameraCount: number;
  lightCount: number;
  triangleCount: number | null;

  textureBytes: number;
  geometryBytes: number;
  otherBufferBytes: number;

  bounds: SourceBoundingBox | null;

  appearsSingleObject: boolean;
  appearsMultiObject: boolean;
  appearsCompleteInterior: boolean;
  hasSeparableNodes: boolean;
  loosePartSplitUseful: boolean;

  classifications: readonly SourceClassificationTag[];
  interiorSignals: readonly string[];
  scaleReview: ScaleReview;
  license: SourceLicenseMetadata;
  extensionsUsed: readonly string[];
  extensionsRequired: readonly string[];
  topLevelNodes: readonly SourceNodeSummary[];
  warnings: readonly SourceWarning[];
}

/**
 * Source models arrive in whatever unit their author used. The pipeline never
 * silently rescales geometry; it records the measurement and a suggestion for a
 * human to confirm or reject.
 */
export interface ScaleReview {
  required: boolean;
  measuredHeight: number | null;
  assumedInteriorHeight: number;
  suggestedUniformScale: number | null;
  note: string;
}

export interface SourceInspectionBatch {
  schemaVersion: SpatialAssetSchemaVersion;
  generatedAt: string;
  sourceBatch: string;
  sourceRoot: string;
  fileCount: number;
  totalSourceBytes: number;
  reports: readonly SourceAssetReport[];
}
