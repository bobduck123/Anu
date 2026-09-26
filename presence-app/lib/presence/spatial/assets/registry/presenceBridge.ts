import type {
  SpatialAnchorDefinition,
  SpatialAnchorKind,
  SpatialComponentCategory,
  SpatialComponentDefinition,
  SpatialMaterialSlotId,
} from "../../model.ts";
import { ID_PATTERN, VERSION_PATTERN } from "../../model.ts";
import type {
  CandidateAnchor,
  CandidateComponent,
  CandidateComponentCategory,
  CandidateLayoutReference,
  CandidatePlacement,
  CandidateRoomKit,
} from "../types/candidates.ts";

/**
 * The pipeline stamps every candidate with a version that deliberately fails
 * `VERSION_PATTERN`, so a candidate can never be dropped into the admitted
 * component registry by accident. Promotion has to choose a real version.
 */
export function isAdmittedVersion(version: string): boolean {
  return VERSION_PATTERN.test(version);
}

const CATEGORY_TO_SPATIAL: Readonly<Record<CandidateComponentCategory, SpatialComponentCategory>> = {
  table: "surface",
  chair: "surface",
  sofa: "surface",
  bed: "surface",
  rack: "rack",
  shelf: "rack",
  cabinet: "surface",
  plinth: "surface",
  frame: "piece",
  poster: "piece",
  lamp: "piece",
  rug: "floor",
  plant: "piece",
  wall: "wall",
  floor: "floor",
  ceiling: "shell",
  door: "wall",
  window: "wall",
  stair: "shell",
  column: "shell",
  counter: "surface",
  "display-block": "surface",
  "projection-surface": "projection",
  "decorative-prop": "piece",
  "room-shell": "shell",
  "unknown-object": "piece",
};

const PLACEMENT_TO_ANCHOR_KIND: Readonly<Record<CandidatePlacement, SpatialAnchorKind>> = {
  floor: "floor",
  wall: "wall",
  surface: "surface",
  rack: "rack",
  shelf: "rack",
  tabletop: "surface",
  "projection-wall": "projection",
  ceiling: "free",
  decorative: "surface",
  unknown: "free",
};

const ANCHOR_TYPE_TO_KIND: Readonly<Record<CandidateAnchor["type"], SpatialAnchorKind>> = {
  surface: "surface",
  display: "free",
  mount: "wall",
  reference: "free",
};

export interface PromotionInput {
  candidate: CandidateComponent;
  /** Version assigned at promotion; must satisfy the admitted `VERSION_PATTERN`. */
  admittedVersion: string;
  /** Promotion requires a real licence decision made by a human, outside this pipeline. */
  license: SpatialComponentDefinition["license"];
  /** Resolved asset id in the Presence asset layer; never a `.glb` path. */
  assetId: string;
}

export type PromotionResult =
  | { ok: true; definition: SpatialComponentDefinition }
  | { ok: false; reasons: readonly string[] };

/**
 * Converts a reviewed candidate into an admitted `SpatialComponentDefinition`.
 *
 * This is the only sanctioned promotion path, and it refuses anything the
 * pipeline itself produced: a candidate is admitted only after a human has set
 * a real version, a real licence and a resolved asset id, and only when the
 * candidate is inside its payload budget.
 */
export function promoteCandidateToComponent(input: PromotionInput): PromotionResult {
  const reasons: string[] = [];
  const { candidate } = input;

  if (!ID_PATTERN.test(candidate.componentId)) reasons.push(`componentId "${candidate.componentId}" does not match the Presence id pattern.`);
  if (!isAdmittedVersion(input.admittedVersion)) reasons.push(`admittedVersion "${input.admittedVersion}" does not match the admitted version pattern.`);
  if (candidate.status !== "candidate-review-required" && candidate.status !== "human-approved-component") {
    reasons.push(`Candidate status "${candidate.status}" is not promotable.`);
  }
  if (candidate.status === "candidate-review-required") reasons.push("Candidate has not been human-reviewed yet.");
  if (candidate.export.runtimeAsset === null) reasons.push("Candidate has no exported runtime asset.");
  if (!candidate.budget.runtimeEligible) reasons.push(`Candidate is ${candidate.budget.status} against its ${candidate.budget.tier} budget.`);
  if (candidate.scaleReview.required) reasons.push("Candidate scale has not been confirmed.");
  if (input.assetId.toLowerCase().endsWith(".glb") || input.assetId.toLowerCase().endsWith(".gltf")) {
    reasons.push("assetId must be a logical asset reference, not a raw model path.");
  }

  if (reasons.length > 0) return { ok: false, reasons };

  const definition: SpatialComponentDefinition = {
    componentId: candidate.componentId,
    version: input.admittedVersion,
    label: candidate.name,
    category: CATEGORY_TO_SPATIAL[candidate.category],
    dimensions: {
      width: candidate.dimensions[0],
      height: candidate.dimensions[1],
      depth: candidate.dimensions[2],
    },
    geometry: { kind: "asset", assetId: input.assetId },
    placement: {
      allowedAnchorKinds: [PLACEMENT_TO_ANCHOR_KIND[candidate.placement]],
      collision: "solid",
      requiresParent: false,
      blocksCameraPath: candidate.placement === "floor",
      floorClearance: 0,
    },
    anchors: candidate.anchors.map((anchor): SpatialAnchorDefinition => ({
      id: anchor.id,
      kind: ANCHOR_TYPE_TO_KIND[anchor.type],
      transform: { position: anchor.position, rotation: [0, 0, 0], scale: [1, 1, 1] },
      accepts: ["piece", "action"],
      capacity: 1,
    })),
    materialSlots: candidate.presenceMaterialSlots as readonly SpatialMaterialSlotId[],
    license: input.license,
    runtime: {
      compressedBytes: Math.round((candidate.export.runtimeSizeKb ?? 0) * 1024),
      sourceBytes: Math.round((candidate.export.runtimeSizeKb ?? 0) * 1024),
      eager: false,
      performanceTier: candidate.budget.tier === "hero" ? "hero" : candidate.budget.tier === "common" ? "enhanced" : "core",
    },
    mobileFallback: {
      strategy: "semantic-only",
      note: "Candidate geometry has no reviewed mobile variant yet.",
    },
  };

  return { ok: true, definition };
}

/**
 * The layout row a Presence room stores for a candidate. Geometry lives in the
 * shared component/asset layer; the layout carries only a reference, a
 * transform and expression overrides, which is what keeps layout JSON tiny.
 */
export function candidateLayoutReference(input: {
  candidate: CandidateComponent;
  position?: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  scale?: readonly [number, number, number];
  materialSlotOverrides?: Readonly<Record<string, string>>;
}): CandidateLayoutReference {
  return {
    componentId: input.candidate.componentId,
    version: input.candidate.version,
    transform: {
      position: input.position ?? [0, 0, 0],
      rotation: input.rotation ?? [0, 0, 0],
      scale: input.scale ?? [1, 1, 1],
    },
    materialSlotOverrides: input.materialSlotOverrides ?? {},
    skinRefs: [],
    mediaRefs: [],
    actionRefs: [],
  };
}

export function roomKitLayoutReferences(input: {
  roomKit: CandidateRoomKit;
  components: readonly CandidateComponent[];
}): readonly CandidateLayoutReference[] {
  const byId = new Map(input.components.map((component) => [component.componentId, component]));
  return input.roomKit.extractedComponents
    .map((componentId) => byId.get(componentId))
    .filter((component): component is CandidateComponent => component !== undefined)
    .map((component) => candidateLayoutReference({ candidate: component }));
}

/** Byte size of a layout, used to prove the 100 KB layout-JSON budget. */
export function layoutJsonBytes(references: readonly CandidateLayoutReference[]): number {
  return Buffer.byteLength(JSON.stringify(references), "utf8");
}
