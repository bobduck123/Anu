import type { BudgetStatus, BudgetTier, CandidateBudget, ExportKind } from "../types/candidates.ts";
import type { ScaleReview, SourceBoundingBox } from "../types/source.ts";
import { SPATIAL_ASSET_BUDGETS_KB } from "../types/config.ts";

const COMMON_TIER_MIN_TRIANGLES = 50_000;
const HERO_TIER_MIN_TRIANGLES = 250_000;

/** Chooses the budget a candidate should be judged against, from its own weight. */
export function componentBudgetTier(input: { exportKind: ExportKind; triangleCount: number | null }): BudgetTier {
  if (input.exportKind === "textured") return "hero";
  const triangles = input.triangleCount ?? 0;
  if (triangles >= HERO_TIER_MIN_TRIANGLES) return "hero";
  if (triangles >= COMMON_TIER_MIN_TRIANGLES) return "common";
  return "simple";
}

export function bytesToKb(bytes: number | null): number | null {
  return bytes === null ? null : Math.round((bytes / 1024) * 10) / 10;
}

/**
 * Budget status never fails a run. An over-budget candidate stays in the
 * registry as source/candidate material with `runtimeEligible: false`, which is
 * what keeps a heavy raw model out of the admitted Presence library.
 */
export function evaluateBudget(input: {
  tier: BudgetTier;
  actualKb: number | null;
  exportKind: ExportKind;
  extraNotes?: readonly string[];
}): CandidateBudget {
  const limitKb = SPATIAL_ASSET_BUDGETS_KB[input.tier];
  const notes = [...(input.extraNotes ?? [])];

  let status: BudgetStatus;
  if (input.exportKind === "manifest-only" || input.actualKb === null) {
    status = "not-exported";
    notes.push("No runtime asset was exported, so no payload budget could be measured.");
  } else if (input.actualKb > limitKb) {
    status = "over-budget";
    notes.push(`Exported ${input.actualKb} KB against a ${limitKb} KB ${input.tier} budget; keep as source/candidate only until optimised.`);
  } else {
    status = "within-budget";
  }

  return {
    tier: input.tier,
    limitKb,
    actualKb: input.actualKb,
    status,
    runtimeEligible: status === "within-budget",
    notes,
  };
}

/** Plausible interior ceiling heights, in metres, used only to detect a unit mismatch. */
const PLAUSIBLE_INTERIOR_HEIGHT_MIN = 2.2;
const PLAUSIBLE_INTERIOR_HEIGHT_MAX = 12;
const ASSUMED_INTERIOR_HEIGHT = 3.2;

export function reviewScale(input: { bounds: SourceBoundingBox | null; isInterior: boolean }): ScaleReview {
  const measuredHeight = input.bounds?.dimensions.height ?? null;
  if (measuredHeight === null || measuredHeight <= 0) {
    return {
      required: false,
      measuredHeight,
      assumedInteriorHeight: ASSUMED_INTERIOR_HEIGHT,
      suggestedUniformScale: null,
      note: "No usable height was measured, so no scale check could be made.",
    };
  }

  if (!input.isInterior) {
    return {
      required: false,
      measuredHeight,
      assumedInteriorHeight: ASSUMED_INTERIOR_HEIGHT,
      suggestedUniformScale: null,
      note: "Scale is only auto-checked against interior heights; object scale must be confirmed in context.",
    };
  }

  if (measuredHeight >= PLAUSIBLE_INTERIOR_HEIGHT_MIN && measuredHeight <= PLAUSIBLE_INTERIOR_HEIGHT_MAX) {
    return {
      required: false,
      measuredHeight,
      assumedInteriorHeight: ASSUMED_INTERIOR_HEIGHT,
      suggestedUniformScale: null,
      note: `Measured height ${measuredHeight} is consistent with a metre-scaled interior.`,
    };
  }

  const suggested = Math.round((ASSUMED_INTERIOR_HEIGHT / measuredHeight) * 10000) / 10000;
  return {
    required: true,
    measuredHeight,
    assumedInteriorHeight: ASSUMED_INTERIOR_HEIGHT,
    suggestedUniformScale: suggested,
    note:
      `Measured height ${measuredHeight} is outside the plausible ${PLAUSIBLE_INTERIOR_HEIGHT_MIN}-${PLAUSIBLE_INTERIOR_HEIGHT_MAX} metre interior range. ` +
      `A uniform scale of ${suggested} would give a ${ASSUMED_INTERIOR_HEIGHT} metre ceiling. This is a suggestion for a human to confirm; the pipeline does not rescale geometry.`,
  };
}
