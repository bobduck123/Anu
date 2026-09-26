import type { CandidateComponent, CandidateRegistry, CandidateRoomKit } from "../types/candidates.ts";
import type {
  BridgeComponent,
  BridgeRoomKit,
  CandidateReviewNote,
  InternalUseComponent,
  InternalUseManifest,
  InternalUseRoomKit,
  MobstarGate4Bridge,
  MobstarShortlist,
  ShortlistEntry,
  SourceClearance,
  UnfilledRole,
} from "../types/internalUse.ts";
import { ADMITTED_STATUS, INTERNAL_USE_STATUS } from "../types/internalUse.ts";
import { SPATIAL_ASSET_SCHEMA_VERSION } from "../types/source.ts";
import { MOBSTAR_REVIEW_NOTES, MOBSTAR_UNFILLED_ROLES } from "./reviewDecisions.ts";

/** Style and lighting owned by the Gate 4 art-direction lane that this set targets. */
export const MOBSTAR_STYLE_PRESET = "warm-nocturnal-boutique";
export const MOBSTAR_LIGHTING_PROFILE = "boutique-product-warm";

export const MOBSTAR_SELECTION_CRITERIA: readonly string[] = [
  "useful for a dark luxury streetwear showroom",
  "good silhouette when viewed shape-only",
  "usable scale, or an explicitly recorded scale doubt",
  "low payload and inside its budget tier",
  "clear material slots",
  "at least one anchor",
  "a rendered thumbnail good enough to judge from",
  "not obvious junk, service equipment or a grouped extraction",
  "not a redundant duplicate of a better candidate",
  "no third-party brand or franchise identity baked into geometry",
];

/** Sources excluded wholesale, with the reason preserved in the shortlist trace. */
const EXCLUDED_SOURCES: Readonly<Record<string, string>> = {
  "source.star-wars-the-clone-wars-venator-prefab":
    "franchise IP: Star Wars Venator geometry is excluded from any Mobstar client-facing set",
};

const NOTE_BY_ID = new Map(MOBSTAR_REVIEW_NOTES.map((note) => [note.candidateId, note]));

export interface AutomatedFilterResult {
  passed: boolean;
  trace: string[];
}

/**
 * The automated gate.
 *
 * This narrows 126 candidates to a reviewable set; it never selects. Selection
 * requires a recorded visual judgement, because metadata cannot see that a
 * well-proportioned wall panel carries another brand's logo.
 */
export function automatedFilter(candidate: CandidateComponent): AutomatedFilterResult {
  const trace: string[] = [];
  let passed = true;

  const excluded = EXCLUDED_SOURCES[candidate.sourceAssetId];
  if (excluded) {
    trace.push(`excluded-source: ${excluded}`);
    passed = false;
  }

  if (candidate.export.runtimeAsset === null) {
    trace.push("no-runtime-asset: manifest-only candidates cannot be placed");
    passed = false;
  } else {
    trace.push("has-runtime-asset");
  }

  if (candidate.budget.status === "over-budget") {
    trace.push(`over-budget: ${candidate.budget.actualKb} KB against ${candidate.budget.limitKb} KB`);
    passed = false;
  } else {
    trace.push(`budget-ok: ${candidate.budget.status}`);
  }

  if (candidate.thumbnail === null) {
    trace.push("no-thumbnail: cannot be visually reviewed");
    passed = false;
  } else {
    trace.push("has-thumbnail");
  }

  if (candidate.materialSlots.length === 0) {
    trace.push("no-material-slots");
    passed = false;
  } else {
    trace.push(`material-slots: ${candidate.materialSlots.length}`);
  }

  if (candidate.anchors.length === 0) {
    trace.push("no-anchors");
    passed = false;
  } else {
    trace.push(`anchors: ${candidate.anchors.length}`);
  }

  const [width, height, depth] = candidate.dimensions;
  const footprint = Math.max(width, depth);
  const plausible = footprint >= 0.15 && footprint <= 6 && height >= 0.15 && height <= 4;
  trace.push(plausible ? `plausible-showroom-scale: ${footprint.toFixed(2)}m x ${height.toFixed(2)}m` : `implausible-showroom-scale: ${footprint.toFixed(2)}m x ${height.toFixed(2)}m`);
  if (!plausible) passed = false;

  return { passed, trace };
}

function clearanceFor(entry: CandidateComponent | CandidateRoomKit): SourceClearance {
  return {
    status: "user-sourced-cleared-for-internal-use",
    notes:
      "Product owner confirmed they will source these assets and that source/licence concerns are cleared appropriately for internal use. " +
      "This is an owner declaration recorded as-is. No independent legal verification was performed, and the original provenance below is preserved unchanged.",
    declaredLicense: entry.license.declaredLicense,
    declaredAuthor: entry.license.declaredAuthor,
    declaredCopyright: entry.license.declaredCopyright,
    licenseEvidence: entry.license.evidence,
    independentLegalVerification: false,
  };
}

const NOT_ADMITTED_REASON =
  "Single-context candidate cleared for internal Mobstar Gate 4 use only; awaiting a separately documented second-context art-direction review before any admission to the Presence component library.";

export function buildShortlist(input: {
  registry: CandidateRegistry;
  generatedAt: string;
  sourceRegistryPath: string;
}): MobstarShortlist {
  const entries: ShortlistEntry[] = [];
  let passedFilter = 0;

  for (const candidate of input.registry.components) {
    const filter = automatedFilter(candidate);
    if (filter.passed) passedFilter += 1;
    const note = NOTE_BY_ID.get(candidate.componentId);
    // A candidate reaches the shortlist by passing the filter or by carrying a
    // recorded judgement — rejections are kept so the reasoning survives.
    if (!filter.passed && !note) continue;

    entries.push(toEntry({ candidate, note, trace: filter.trace }));
  }

  for (const roomKit of input.registry.roomKits) {
    const note = NOTE_BY_ID.get(roomKit.roomKitId);
    if (!note) continue;
    entries.push({
      candidateId: roomKit.roomKitId,
      kind: "roomkit",
      sourceAssetId: roomKit.sourceAssetId,
      category: roomKit.category,
      observedAs: note.observedAs,
      role: note.role,
      decision: note.decision,
      scores: note.scores,
      dimensions: roomKit.dimensions,
      runtimeSizeKb: roomKit.export.runtimeSizeKb,
      budgetStatus: roomKit.budget.status,
      materialSlotCount: roomKit.materialSlots.length,
      anchorCount: 0,
      thumbnail: roomKit.thumbnail,
      filterTrace: [`roomkit-budget: ${roomKit.budget.status}`, `scale-review-required: ${roomKit.scaleReview.required}`],
      notes: note.notes,
      ...(note.rejectionReason ? { rejectionReason: note.rejectionReason } : {}),
    });
  }

  entries.sort((a, b) => decisionRank(a.decision) - decisionRank(b.decision) || a.candidateId.localeCompare(b.candidateId));

  return {
    schemaVersion: SPATIAL_ASSET_SCHEMA_VERSION,
    shortlistVersion: "mobstar-gate4-shortlist.v0",
    generatedAt: input.generatedAt,
    sourceRegistry: input.sourceRegistryPath,
    gate: "mobstar-gate4",
    criteria: MOBSTAR_SELECTION_CRITERIA,
    totals: {
      registryComponents: input.registry.components.length,
      registryRoomKits: input.registry.roomKits.length,
      passedAutomatedFilter: passedFilter,
      visuallyReviewed: MOBSTAR_REVIEW_NOTES.length,
      selected: entries.filter((entry) => entry.decision === "use-for-mobstar-gate4").length,
      rejected: entries.filter((entry) => entry.decision === "reject").length,
    },
    entries,
    unfilledRoles: MOBSTAR_UNFILLED_ROLES,
  };
}

function toEntry(input: {
  candidate: CandidateComponent;
  note: CandidateReviewNote | undefined;
  trace: readonly string[];
}): ShortlistEntry {
  const { candidate, note } = input;
  return {
    candidateId: candidate.componentId,
    kind: "component",
    sourceAssetId: candidate.sourceAssetId,
    category: candidate.category,
    observedAs: note?.observedAs ?? "not visually reviewed in this pass",
    role: note?.role ?? null,
    decision: note?.decision ?? "maybe-use-later",
    scores: note?.scores ?? { visualQuality: null, scaleConfidence: null, mobstarFit: null, needs3dReview: true },
    dimensions: candidate.dimensions,
    runtimeSizeKb: candidate.export.runtimeSizeKb,
    budgetStatus: candidate.budget.status,
    materialSlotCount: candidate.materialSlots.length,
    anchorCount: candidate.anchors.length,
    thumbnail: candidate.thumbnail,
    filterTrace: [...input.trace],
    notes: note?.notes ?? ["Passed the automated filter but was not visually reviewed in this pass; treat as unassessed."],
    ...(note?.rejectionReason ? { rejectionReason: note.rejectionReason } : {}),
  };
}

function decisionRank(decision: ShortlistEntry["decision"]): number {
  switch (decision) {
    case "use-for-mobstar-gate4": return 0;
    case "maybe-use-later": return 1;
    case "needs-manual-cleanup": return 2;
    case "missing-suitable-candidate": return 3;
    case "reject": return 4;
  }
}

/** Guards the one thing this pass must never do. */
export function assertNotAdmitted(statuses: readonly string[]): void {
  for (const status of statuses) {
    if (status === ADMITTED_STATUS) {
      throw new Error(`This pass may not mark anything "${ADMITTED_STATUS}"; a second-context review is required first.`);
    }
  }
}

export function buildInternalUseManifest(input: {
  registry: CandidateRegistry;
  generatedAt: string;
}): InternalUseManifest {
  const components: InternalUseComponent[] = [];
  const roomKits: InternalUseRoomKit[] = [];

  const selected = MOBSTAR_REVIEW_NOTES.filter((note) => note.decision === "use-for-mobstar-gate4");
  const componentById = new Map(input.registry.components.map((component) => [component.componentId, component]));
  const roomKitById = new Map(input.registry.roomKits.map((roomKit) => [roomKit.roomKitId, roomKit]));

  for (const note of selected) {
    if (note.role === null) continue;

    const component = componentById.get(note.candidateId);
    if (component) {
      if (component.export.runtimeAsset === null) {
        throw new Error(`Selected candidate ${note.candidateId} has no runtime asset and cannot be cleared for internal use.`);
      }
      components.push({
        componentId: component.componentId,
        version: component.version,
        status: INTERNAL_USE_STATUS,
        role: note.role,
        observedAs: note.observedAs,
        intendedUses: ["mobstar-gate4", "showroom", note.role],
        notAdmittedReason: NOT_ADMITTED_REASON,
        sourceAssetId: component.sourceAssetId,
        sourceFile: component.sourceNodeName,
        runtimeAsset: component.export.runtimeAsset,
        thumbnail: component.thumbnail,
        dimensions: component.dimensions,
        runtimeSizeKb: component.export.runtimeSizeKb,
        budgetStatus: component.budget.status,
        budgetTier: component.budget.tier,
        materialSlots: component.materialSlots,
        presenceMaterialSlots: component.presenceMaterialSlots,
        anchors: component.anchors.map((anchor) => anchor.id),
        placement: component.placement,
        scores: note.scores,
        scaleReviewRequired: component.scaleReview.required || note.scores.needs3dReview,
        sourceClearance: clearanceFor(component),
        notes: note.notes,
      });
      continue;
    }

    const roomKit = roomKitById.get(note.candidateId);
    if (roomKit) {
      if (roomKit.export.runtimeAsset === null) {
        throw new Error(`Selected room kit ${note.candidateId} has no runtime asset and cannot be cleared for internal use.`);
      }
      roomKits.push({
        roomKitId: roomKit.roomKitId,
        version: roomKit.version,
        status: INTERNAL_USE_STATUS,
        role: "showroom-shell",
        category: roomKit.category,
        observedAs: note.observedAs,
        intendedUses: ["mobstar-gate4", "showroom", "showroom-shell"],
        notAdmittedReason: NOT_ADMITTED_REASON,
        sourceAssetId: roomKit.sourceAssetId,
        sourceFile: roomKit.name,
        runtimeAsset: roomKit.export.runtimeAsset,
        thumbnail: roomKit.thumbnail,
        dimensions: roomKit.dimensions,
        runtimeSizeKb: roomKit.export.runtimeSizeKb,
        budgetStatus: roomKit.budget.status,
        budgetTier: roomKit.budget.tier,
        materialSlots: roomKit.materialSlots,
        presenceMaterialSlots: roomKit.presenceMaterialSlots,
        scores: note.scores,
        scaleReviewRequired: roomKit.scaleReview.required || note.scores.needs3dReview,
        sourceClearance: clearanceFor(roomKit),
        usage: "use-whole-or-mine",
        usageNote:
          "Usable whole as a showroom shell for Gate 4, and worth mining for its ribbed wall surface in a later pass. " +
          "It is an optimised candidate export, not the 40.8 MB raw source GLB.",
        extractedComponentCount: roomKit.extractedComponents.length,
        notes: note.notes,
      });
    }
  }

  assertNotAdmitted([...components.map((c) => c.status), ...roomKits.map((k) => k.status)]);

  return {
    schemaVersion: SPATIAL_ASSET_SCHEMA_VERSION,
    manifestVersion: "mobstar-gate4-internal-use.v0",
    generatedAt: input.generatedAt,
    gate: "mobstar-gate4",
    admission: "internal-use-candidates-only",
    admissionNote:
      "Every entry is cleared for internal Mobstar Gate 4 use only. Nothing here is an admitted Presence component, " +
      "nothing is production-ready, nothing is public-launch-ready, and no independent legal verification was performed.",
    components,
    roomKits,
    unfilledRoles: MOBSTAR_UNFILLED_ROLES,
  };
}

export function buildGate4Bridge(input: {
  manifest: InternalUseManifest;
  registry: CandidateRegistry;
  generatedAt: string;
}): MobstarGate4Bridge {
  const componentById = new Map(input.registry.components.map((component) => [component.componentId, component]));

  const components: BridgeComponent[] = input.manifest.components.map((entry): BridgeComponent => {
    const candidate = componentById.get(entry.componentId);
    if (!candidate) throw new Error(`Bridge references unknown candidate ${entry.componentId}.`);
    return {
      componentId: entry.componentId,
      version: entry.version,
      role: entry.role,
      runtimeAsset: entry.runtimeAsset,
      materialSlots: entry.materialSlots,
      presenceMaterialSlots: entry.presenceMaterialSlots,
      anchors: entry.anchors,
      anchorDefinitions: candidate.anchors,
      placement: entry.placement,
      runtimeSizeKb: entry.runtimeSizeKb,
      status: INTERNAL_USE_STATUS,
      suggestedStylePreset: MOBSTAR_STYLE_PRESET,
      suggestedLightingProfile: MOBSTAR_LIGHTING_PROFILE,
    };
  });

  const roomKitById = new Map(input.registry.roomKits.map((roomKit) => [roomKit.roomKitId, roomKit]));
  const roomKits: BridgeRoomKit[] = input.manifest.roomKits.map((entry): BridgeRoomKit => {
    const candidate = roomKitById.get(entry.roomKitId);
    if (!candidate) throw new Error(`Bridge references unknown room kit ${entry.roomKitId}.`);
    return {
      roomKitId: entry.roomKitId,
      version: entry.version,
      role: "showroom-shell",
      runtimeAsset: entry.runtimeAsset,
      fallbackAsset: candidate.fallback.runtimeAsset,
      dimensions: entry.dimensions,
      runtimeSizeKb: entry.runtimeSizeKb,
      status: INTERNAL_USE_STATUS,
      usage: entry.usage,
    };
  });

  assertNotAdmitted([...components.map((c) => c.status), ...roomKits.map((k) => k.status)]);

  return {
    registryVersion: "mobstar-gate4-candidate.v0",
    generatedAt: input.generatedAt,
    gate: "mobstar-gate4",
    admission: "internal-use-candidates-only",
    admissionNote: input.manifest.admissionNote,
    targets: {
      materialStylePreset: MOBSTAR_STYLE_PRESET,
      lightingProfile: MOBSTAR_LIGHTING_PROFILE,
    },
    components,
    roomKits,
    proceduralFallbacks: input.manifest.unfilledRoles,
  };
}
