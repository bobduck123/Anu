import type { SpatialMaterialSlotId, SpatialPrimitiveKind } from "../../model.ts";
import type {
  CandidateAnchor,
  CandidateMaterialSlot,
  CandidatePlacement,
} from "./candidates.ts";
import type { SpatialAssetSchemaVersion } from "./source.ts";

/**
 * The three-stage admission vocabulary.
 *
 * `candidate-review-required` is what the ingestion pipeline writes.
 * `candidate-cleared-for-internal-use` is what a single-context review can grant.
 * `admitted-presence-component` requires a separately documented second-context
 * review and is never written by this module — `assertNotAdmitted` enforces it.
 */
export type AdmissionStatus =
  | "candidate-review-required"
  | "candidate-cleared-for-internal-use"
  | "admitted-presence-component";

export const INTERNAL_USE_STATUS = "candidate-cleared-for-internal-use" as const;
export type InternalUseStatus = typeof INTERNAL_USE_STATUS;

export const ADMITTED_STATUS = "admitted-presence-component" as const;

/** Roles the Mobstar Gate 4 showroom needs filled. */
export type MobstarRole =
  | "showroom-shell"
  | "wall-treatment"
  | "garment-rack"
  | "display-island"
  | "product-riser"
  | "projection-media-wall"
  | "poster-archive-surface"
  | "garment-carrier"
  | "showroom-seating"
  | "display-lighting-fixture"
  | "soft-division-drape"
  | "decorative-showroom-object";

export const MOBSTAR_ROLES = [
  "showroom-shell",
  "wall-treatment",
  "garment-rack",
  "display-island",
  "product-riser",
  "projection-media-wall",
  "poster-archive-surface",
  "garment-carrier",
  "showroom-seating",
  "display-lighting-fixture",
  "soft-division-drape",
  "decorative-showroom-object",
] as const satisfies readonly MobstarRole[];

export type ReviewDecision =
  | "use-for-mobstar-gate4"
  | "maybe-use-later"
  | "needs-manual-cleanup"
  | "reject"
  | "missing-suitable-candidate";

/** 0-4. Never inflate; `null` means the thumbnail did not support a judgement. */
export type ReviewScore = 0 | 1 | 2 | 3 | 4 | null;

export interface VisualReviewScores {
  visualQuality: ReviewScore;
  scaleConfidence: ReviewScore;
  mobstarFit: ReviewScore;
  /** Set when a thumbnail alone was not enough to assess the object. */
  needs3dReview: boolean;
}

/**
 * A recorded visual judgement about one candidate.
 *
 * These are agent-recorded observations made by opening each thumbnail, not
 * metadata inferences. `observedAs` is what the object actually looks like,
 * which frequently disagrees with the pipeline's heuristic `category`.
 */
export interface CandidateReviewNote {
  candidateId: string;
  observedAs: string;
  role: MobstarRole | null;
  decision: ReviewDecision;
  scores: VisualReviewScores;
  notes: readonly string[];
  /** Present on every rejection, so the reason survives in the record. */
  rejectionReason?: string;
}

export interface SourceClearance {
  status: "user-sourced-cleared-for-internal-use";
  notes: string;
  /** Provenance carried forward verbatim from the candidate registry. */
  declaredLicense: string | null;
  declaredAuthor: string | null;
  declaredCopyright: string | null;
  licenseEvidence: readonly string[];
  independentLegalVerification: false;
}

export interface InternalUseComponent {
  componentId: string;
  version: string;
  status: InternalUseStatus;
  role: MobstarRole;
  observedAs: string;
  intendedUses: readonly string[];
  notAdmittedReason: string;
  sourceAssetId: string;
  sourceFile: string;
  runtimeAsset: string;
  thumbnail: string | null;
  dimensions: readonly [number, number, number];
  runtimeSizeKb: number | null;
  budgetStatus: string;
  budgetTier: string;
  materialSlots: readonly CandidateMaterialSlot[];
  presenceMaterialSlots: readonly SpatialMaterialSlotId[];
  anchors: readonly string[];
  placement: CandidatePlacement;
  scores: VisualReviewScores;
  scaleReviewRequired: boolean;
  sourceClearance: SourceClearance;
  notes: readonly string[];
}

export interface InternalUseRoomKit extends Omit<InternalUseComponent, "componentId" | "role" | "placement" | "anchors"> {
  roomKitId: string;
  category: string;
  role: "showroom-shell";
  /** Whether the kit is worth using whole or should be mined for parts. */
  usage: "use-whole" | "mine-for-parts" | "use-whole-or-mine";
  usageNote: string;
  extractedComponentCount: number;
}

export interface InternalUseManifest {
  schemaVersion: SpatialAssetSchemaVersion;
  manifestVersion: "mobstar-gate4-internal-use.v0";
  generatedAt: string;
  gate: "mobstar-gate4";
  admission: "internal-use-candidates-only";
  /** Restated on the artefact itself so it cannot be read out of context. */
  admissionNote: string;
  components: readonly InternalUseComponent[];
  roomKits: readonly InternalUseRoomKit[];
  unfilledRoles: readonly UnfilledRole[];
}

export interface UnfilledRole {
  role: MobstarRole;
  status: "missing-suitable-candidate";
  reason: string;
  /** The procedural primitive already present in the spatial model that should fill this gap. */
  recommendedFallback: {
    kind: "procedural-primitive" | "authored-component";
    primitive?: SpatialPrimitiveKind;
    note: string;
  };
}

/** One shortlisted row: the algorithmic filter result joined with the visual review. */
export interface ShortlistEntry {
  candidateId: string;
  kind: "component" | "roomkit";
  sourceAssetId: string;
  category: string;
  observedAs: string;
  role: MobstarRole | null;
  decision: ReviewDecision;
  scores: VisualReviewScores;
  dimensions: readonly [number, number, number];
  runtimeSizeKb: number | null;
  budgetStatus: string;
  materialSlotCount: number;
  anchorCount: number;
  thumbnail: string | null;
  /** Which automated gates the candidate passed or failed, in order. */
  filterTrace: readonly string[];
  notes: readonly string[];
  rejectionReason?: string;
}

export interface MobstarShortlist {
  schemaVersion: SpatialAssetSchemaVersion;
  shortlistVersion: "mobstar-gate4-shortlist.v0";
  generatedAt: string;
  sourceRegistry: string;
  gate: "mobstar-gate4";
  criteria: readonly string[];
  totals: {
    registryComponents: number;
    registryRoomKits: number;
    passedAutomatedFilter: number;
    visuallyReviewed: number;
    selected: number;
    rejected: number;
  };
  entries: readonly ShortlistEntry[];
  unfilledRoles: readonly UnfilledRole[];
}

export interface BridgeComponent {
  componentId: string;
  version: string;
  role: MobstarRole;
  runtimeAsset: string;
  materialSlots: readonly CandidateMaterialSlot[];
  presenceMaterialSlots: readonly SpatialMaterialSlotId[];
  anchors: readonly string[];
  anchorDefinitions: readonly CandidateAnchor[];
  placement: CandidatePlacement;
  runtimeSizeKb: number | null;
  status: InternalUseStatus;
  /** Style and lighting the Gate 4 showroom should pair this with. */
  suggestedStylePreset: string;
  suggestedLightingProfile: string;
}

export interface BridgeRoomKit {
  roomKitId: string;
  version: string;
  role: "showroom-shell";
  runtimeAsset: string;
  fallbackAsset: string | null;
  dimensions: readonly [number, number, number];
  runtimeSizeKb: number | null;
  status: InternalUseStatus;
  usage: InternalUseRoomKit["usage"];
}

export interface MobstarGate4Bridge {
  registryVersion: "mobstar-gate4-candidate.v0";
  generatedAt: string;
  gate: "mobstar-gate4";
  admission: "internal-use-candidates-only";
  admissionNote: string;
  /** Style/lighting vocabulary this bridge targets, owned by the Gate 4 art-direction lane. */
  targets: {
    materialStylePreset: string;
    lightingProfile: string;
  };
  components: readonly BridgeComponent[];
  roomKits: readonly BridgeRoomKit[];
  proceduralFallbacks: readonly UnfilledRole[];
}
