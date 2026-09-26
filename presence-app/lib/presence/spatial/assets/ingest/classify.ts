import type {
  SourceBoundingBox,
  SourceClassificationTag,
  SourceLicenseMetadata,
  SourceNodeSummary,
  SourceWarning,
} from "../types/source.ts";

export interface ClassificationInput {
  meshCount: number;
  materialCount: number;
  imageCount: number;
  topLevelNodes: readonly SourceNodeSummary[];
  bounds: SourceBoundingBox | null;
  textureBytes: number;
  geometryBytes: number;
  fileBytes: number;
  licenseSource: SourceLicenseMetadata["source"];
  /** Relative source path; folder and file names are a strong interior signal. */
  sourcePath: string;
  warnings: readonly SourceWarning[];
}

export interface ClassificationResult {
  tags: readonly SourceClassificationTag[];
  interiorSignals: readonly string[];
  appearsSingleObject: boolean;
  appearsMultiObject: boolean;
  appearsCompleteInterior: boolean;
  hasSeparableNodes: boolean;
  loosePartSplitUseful: boolean;
  warnings: readonly SourceWarning[];
}

const ARCHITECTURAL_TOKENS = [
  "floor", "wall", "ceiling", "room", "interior", "building", "window", "door",
  "stair", "column", "pillar", "roof", "ground", "arch", "corridor",
];

/** Path tokens that describe a whole space rather than a single object. */
const INTERIOR_PATH_TOKENS = [
  "interior", "room", "scene", "shop", "store", "gallery", "studio", "church",
  "hall", "apartment", "house", "cafe", "lounge", "showroom", "boutique",
];

/** Signal thresholds. Deliberately conservative: a false interior is worse than a missed one. */
const INTERIOR_MIN_MESHES = 8;
const INTERIOR_MIN_FOOTPRINT_METRES = 4;
const INTERIOR_MIN_HEIGHT_METRES = 2;
const INTERIOR_MIN_MATERIALS = 3;
const INTERIOR_MIN_SIGNALS = 3;

const TEXTURE_HEAVY_RATIO = 1.5;
const TEXTURE_HEAVY_MIN_BYTES = 4 * 1024 * 1024;
const TEXTURE_HEAVY_MIN_IMAGES = 8;
const GEOMETRY_HEAVY_MIN_BYTES = 16 * 1024 * 1024;
const GEOMETRY_HEAVY_MIN_TRIANGLES = 300_000;
const OVER_SOURCE_BUDGET_BYTES = 35 * 1024 * 1024;

const MANUAL_REVIEW_WARNING_CODES = new Set([
  "unparseable-json",
  "missing-external-buffer",
  "missing-external-image",
  "draco-compressed",
  "meshopt-compressed",
  "unsupported-extension-required",
  "no-meshes",
  "no-node-hierarchy",
  "bounding-box-unavailable",
  "loose-part-split-unsafe",
]);

export function classifySource(input: ClassificationInput): ClassificationResult {
  const warnings: SourceWarning[] = [];
  const meshBearingNodes = input.topLevelNodes.filter((node) => node.meshNodeCount > 0);
  const totalMeshNodes = input.topLevelNodes.reduce((total, node) => total + node.meshNodeCount, 0);
  const totalTriangles = input.topLevelNodes.reduce((total, node) => total + node.triangleCount, 0);
  const totalPrimitives = input.topLevelNodes.reduce((total, node) => total + node.primitiveCount, 0);

  const nameHaystack = input.topLevelNodes
    .flatMap((node) => [node.name, ...node.meshNames, ...node.materialNames])
    .join(" ")
    .toLowerCase();
  const architecturalHits = ARCHITECTURAL_TOKENS.filter((token) => nameHaystack.includes(token));

  const footprint = input.bounds ? Math.max(input.bounds.dimensions.width, input.bounds.dimensions.depth) : 0;
  const height = input.bounds?.dimensions.height ?? 0;

  const pathTokens = input.sourcePath.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  const pathHits = INTERIOR_PATH_TOKENS.filter((token) => pathTokens.includes(token));

  const interiorSignals: string[] = [];
  if (pathHits.length > 0) interiorSignals.push(`source path names a space: ${pathHits.join(", ")}`);
  if (input.meshCount >= INTERIOR_MIN_MESHES) interiorSignals.push(`${input.meshCount} meshes suggest an arranged scene`);
  if (totalMeshNodes >= INTERIOR_MIN_MESHES) interiorSignals.push(`${totalMeshNodes} mesh-bearing nodes across the scene`);
  if (footprint >= INTERIOR_MIN_FOOTPRINT_METRES) interiorSignals.push(`wide footprint (${footprint} units across)`);
  if (height >= INTERIOR_MIN_HEIGHT_METRES) interiorSignals.push(`room-scale height (${height} units)`);
  if (input.materialCount >= INTERIOR_MIN_MATERIALS) interiorSignals.push(`${input.materialCount} materials`);
  if (architecturalHits.length > 0) interiorSignals.push(`architectural naming: ${architecturalHits.slice(0, 6).join(", ")}`);

  const hasSpatialEvidence =
    footprint >= INTERIOR_MIN_FOOTPRINT_METRES || architecturalHits.length > 0 || pathHits.length > 0;
  const appearsCompleteInterior = interiorSignals.length >= INTERIOR_MIN_SIGNALS && hasSpatialEvidence;

  const hasSeparableNodes = meshBearingNodes.length >= 2 || totalMeshNodes >= 2;
  const appearsMultiObject = hasSeparableNodes || input.meshCount >= 2;
  const appearsSingleObject = !appearsMultiObject && input.meshCount >= 1;

  const loosePartSplitUseful =
    meshBearingNodes.length <= 2 && totalTriangles >= 500 && (totalPrimitives >= 2 || input.meshCount >= 2);

  const tags = new Set<SourceClassificationTag>();
  if (appearsSingleObject) tags.add("single-object-source");
  if (appearsMultiObject) tags.add("multi-object-source");
  if (appearsCompleteInterior) {
    tags.add("complete-interior-source");
    tags.add("candidate-roomkit-source");
  }

  const textureHeavy =
    (input.textureBytes > input.geometryBytes * TEXTURE_HEAVY_RATIO && input.textureBytes >= TEXTURE_HEAVY_MIN_BYTES) ||
    input.imageCount >= TEXTURE_HEAVY_MIN_IMAGES;
  if (textureHeavy) tags.add("texture-heavy-source");

  const geometryHeavy =
    input.geometryBytes > input.textureBytes &&
    (input.geometryBytes >= GEOMETRY_HEAVY_MIN_BYTES || totalTriangles >= GEOMETRY_HEAVY_MIN_TRIANGLES);
  if (geometryHeavy) tags.add("geometry-heavy-source");

  // Licence review is unconditional: this pipeline never clears a licence.
  tags.add("needs-license-review");

  const manualReviewWarnings = input.warnings.filter((warning) => MANUAL_REVIEW_WARNING_CODES.has(warning.code));
  if (manualReviewWarnings.length > 0 || input.meshCount === 0) tags.add("needs-manual-review");

  if (input.fileBytes >= OVER_SOURCE_BUDGET_BYTES) {
    warnings.push({
      code: "over-source-budget",
      message: `Source file is ${(input.fileBytes / (1024 * 1024)).toFixed(1)} MB. It is source material only and must not be treated as a Presence runtime asset.`,
    });
  }
  if (input.textureBytes >= TEXTURE_HEAVY_MIN_BYTES * 4) {
    warnings.push({
      code: "huge-texture-payload",
      message: `Embedded textures account for ${(input.textureBytes / (1024 * 1024)).toFixed(1)} MB; textured exports require resizing and recompression.`,
    });
  }

  return {
    tags: [...tags],
    interiorSignals,
    appearsSingleObject,
    appearsMultiObject,
    appearsCompleteInterior,
    hasSeparableNodes,
    loosePartSplitUseful,
    warnings,
  };
}
