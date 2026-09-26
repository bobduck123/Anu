import type { SpatialDimensions, SpatialMaterialSlotId, SpatialVec3 } from "../../model.ts";
import type {
  ScaleReview,
  SourceBoundingBox,
  SourceWarning,
  SpatialAssetSchemaVersion,
} from "./source.ts";

/**
 * Candidate status vocabulary.
 *
 * The pipeline only ever writes `candidate-review-required`. Every other value
 * exists so a human reviewer can record a decision by editing the registry;
 * nothing in this module may produce them.
 */
export type CandidateStatus =
  | "candidate-review-required"
  | "human-approved-component"
  | "human-approved-roomkit"
  | "human-rejected";

export const PIPELINE_CANDIDATE_STATUS = "candidate-review-required" as const;
export type PipelineCandidateStatus = typeof PIPELINE_CANDIDATE_STATUS;

/** Best-effort component category guess; `unknown-object` is an honest answer. */
export type CandidateComponentCategory =
  | "table"
  | "chair"
  | "sofa"
  | "bed"
  | "rack"
  | "shelf"
  | "cabinet"
  | "plinth"
  | "frame"
  | "poster"
  | "lamp"
  | "rug"
  | "plant"
  | "wall"
  | "floor"
  | "ceiling"
  | "door"
  | "window"
  | "stair"
  | "column"
  | "counter"
  | "display-block"
  | "projection-surface"
  | "decorative-prop"
  | "room-shell"
  | "unknown-object";

export const CANDIDATE_COMPONENT_CATEGORIES = [
  "table", "chair", "sofa", "bed", "rack", "shelf", "cabinet", "plinth", "frame", "poster",
  "lamp", "rug", "plant", "wall", "floor", "ceiling", "door", "window", "stair", "column",
  "counter", "display-block", "projection-surface", "decorative-prop", "room-shell", "unknown-object",
] as const satisfies readonly CandidateComponentCategory[];

export type CandidateRoomKitCategory =
  | "living-room"
  | "gallery"
  | "boutique"
  | "studio"
  | "warehouse"
  | "showroom"
  | "archive"
  | "bedroom"
  | "performance-room"
  | "listening-room"
  | "unknown-interior";

export const CANDIDATE_ROOMKIT_CATEGORIES = [
  "living-room", "gallery", "boutique", "studio", "warehouse", "showroom",
  "archive", "bedroom", "performance-room", "listening-room", "unknown-interior",
] as const satisfies readonly CandidateRoomKitCategory[];

export type CandidatePlacement =
  | "floor"
  | "wall"
  | "surface"
  | "rack"
  | "shelf"
  | "tabletop"
  | "projection-wall"
  | "ceiling"
  | "decorative"
  | "unknown";

export const CANDIDATE_PLACEMENTS = [
  "floor", "wall", "surface", "rack", "shelf", "tabletop", "projection-wall", "ceiling", "decorative", "unknown",
] as const satisfies readonly CandidatePlacement[];

/** Descriptive slot vocabulary used before a candidate is mapped onto Presence material slots. */
export type CandidateMaterialSlot =
  | "base" | "top" | "legs" | "frame" | "metal" | "fabric" | "paper" | "wood" | "glass"
  | "projection" | "poster-decal" | "logo-accent"
  | "primary" | "secondary" | "accent";

export type CandidateAnchorType = "surface" | "display" | "mount" | "reference";

export interface CandidateAnchor {
  id: string;
  type: CandidateAnchorType;
  position: SpatialVec3;
}

export type BudgetTier = "simple" | "common" | "hero" | "roomkit-eager" | "layout-json";
export type BudgetStatus = "within-budget" | "over-budget" | "not-exported";

export interface CandidateBudget {
  tier: BudgetTier;
  limitKb: number;
  actualKb: number | null;
  status: BudgetStatus;
  /** True only when an exported runtime asset fits its tier budget. Never true for manifest-only rows. */
  runtimeEligible: boolean;
  notes: readonly string[];
}

/**
 * Licence provenance carried on a candidate.
 *
 * `status` is a single-value union on purpose: the pipeline is structurally
 * incapable of marking anything licence-cleared.
 */
export interface CandidateLicense {
  status: "needs-review";
  source: "embedded" | "sidecar" | "filename" | "unknown";
  declaredCopyright: string | null;
  declaredAuthor: string | null;
  declaredLicense: string | null;
  evidence: readonly string[];
}

/** Visual/geometry quality. The pipeline never reviews; it only records that nothing was reviewed. */
export interface CandidateQuality {
  status: "not-reviewed";
  visuallyApproved: false;
  notes: readonly string[];
}

export type ExportKind = "shape-only" | "textured" | "manifest-only";

export interface CandidateExport {
  kind: ExportKind;
  /**
   * Repo-relative path, or null when the candidate is manifest-only.
   * This is a filesystem path, not a URL: candidate assets live outside
   * `public/` and are never served by a Presence route.
   */
  runtimeAsset: string | null;
  runtimeSizeKb: number | null;
  texturesStripped: boolean;
  materialSlotsPreserved: boolean;
  geometryCompression: "draco" | "none";
  /** Reason an export is absent or degraded. */
  note: string;
}

export interface CandidateComponent {
  componentId: string;
  version: string;
  sourceAssetId: string;
  sourceNodeName: string;
  sourceNodeIndex: number | null;
  name: string;
  category: CandidateComponentCategory;
  /** `${category}-candidate`, kept for registry readability and reviewer filtering. */
  categoryLabel: string;
  categoryConfidence: "keyword-match" | "dimension-heuristic" | "unknown";
  /**
   * Generated candidates are always `candidate-review-required`; the wider union
   * exists so a reviewer can record a decision by editing the registry, and
   * `validateCandidateRegistry` rejects any other value on generated output.
   */
  status: CandidateStatus;
  extraction: "gltf-node" | "blender-object" | "blender-loose-part";
  export: CandidateExport;
  thumbnail: string | null;
  dimensions: readonly [number, number, number];
  bounds: SourceBoundingBox | null;
  triangleCount: number | null;
  scaleReview: ScaleReview;
  /** How many identical instances of this shape the source scene contained. */
  instanceCount: number;
  instanceNames: readonly string[];
  placement: CandidatePlacement;
  materialSlots: readonly CandidateMaterialSlot[];
  presenceMaterialSlots: readonly SpatialMaterialSlotId[];
  sourceMaterialNames: readonly string[];
  anchors: readonly CandidateAnchor[];
  budget: CandidateBudget;
  license: CandidateLicense;
  quality: CandidateQuality;
  reviewActions: readonly ReviewAction[];
  warnings: readonly SourceWarning[];
}

export interface CandidateRoomKit {
  roomKitId: string;
  version: string;
  sourceAssetId: string;
  name: string;
  category: CandidateRoomKitCategory;
  categoryConfidence: "keyword-match" | "dimension-heuristic" | "unknown";
  /** See `CandidateComponent.status`. */
  status: CandidateStatus;
  export: CandidateExport;
  /** Semantic/shape-only representation used when the runtime export is absent or over budget. */
  fallback: {
    strategy: "shape-only-glb" | "semantic-only";
    runtimeAsset: string | null;
    note: string;
  };
  thumbnail: string | null;
  dimensions: readonly [number, number, number];
  bounds: SourceBoundingBox | null;
  triangleCount: number | null;
  scaleReview: ScaleReview;
  extractedComponents: readonly string[];
  materialSlots: readonly CandidateMaterialSlot[];
  presenceMaterialSlots: readonly SpatialMaterialSlotId[];
  sourceMaterialNames: readonly string[];
  budget: CandidateBudget;
  license: CandidateLicense;
  quality: CandidateQuality;
  reviewActions: readonly ReviewAction[];
  warnings: readonly SourceWarning[];
}

export type ReviewAction =
  | "approve-as-component"
  | "approve-as-roomkit"
  | "rename"
  | "merge"
  | "reject"
  | "needs-manual-cleanup"
  | "needs-license-review"
  | "needs-texture-preservation"
  | "needs-art-direction-review";

export const REVIEW_ACTIONS = [
  "approve-as-component",
  "approve-as-roomkit",
  "rename",
  "merge",
  "reject",
  "needs-manual-cleanup",
  "needs-license-review",
  "needs-texture-preservation",
  "needs-art-direction-review",
] as const satisfies readonly ReviewAction[];

export interface CandidateRegistryTooling {
  blenderAvailable: boolean;
  blenderVersion: string | null;
  gltfTransformAvailable: boolean;
  gltfpackAvailable: boolean;
  notes: readonly string[];
}

export interface CandidateRegistry {
  schemaVersion: SpatialAssetSchemaVersion;
  generatedAt: string;
  sourceBatch: string;
  sourceRoot: string;
  /** Admission state of the whole registry; candidates are never runtime-admitted by this pipeline. */
  admission: "candidates-only";
  tooling: CandidateRegistryTooling;
  components: readonly CandidateComponent[];
  roomKits: readonly CandidateRoomKit[];
}

/** Minimal Presence layout row a candidate can be referenced by; geometry is never inlined. */
export interface CandidateLayoutReference {
  componentId: string;
  version: string;
  transform: {
    position: SpatialVec3;
    rotation: SpatialVec3;
    scale: SpatialVec3;
  };
  materialSlotOverrides: Readonly<Record<string, string>>;
  skinRefs: readonly string[];
  mediaRefs: readonly string[];
  actionRefs: readonly string[];
}

export interface CandidateDimensionsInput {
  dimensions: SpatialDimensions;
}
