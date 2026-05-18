// Uniqueness engine. Compares two rooms across multiple DNA + composition
// axes and emits a similarity score with explanations + recommended
// changes. Used as a guardrail so we don't accidentally ship two rooms
// that read as the same template with a colour swap.
//
// Lower score = more unique. Threshold for "too similar" = 0.70.

import type { UniquenessInputs } from "@/lib/presence/dna/types";

interface AxisWeight {
  axis: keyof UniquenessInputs;
  weight: number;
  // For array fields like section_order we use Jaccard, otherwise equality.
  kind: "equality" | "jaccard";
}

const AXES: AxisWeight[] = [
  { axis: "blueprint", weight: 0.16, kind: "equality" },
  { axis: "entry_type", weight: 0.10, kind: "equality" },
  { axis: "palette_mode", weight: 0.10, kind: "equality" },
  { axis: "typography_mode", weight: 0.08, kind: "equality" },
  { axis: "proof_density", weight: 0.05, kind: "equality" },
  { axis: "proof_position", weight: 0.05, kind: "equality" },
  { axis: "cta_label", weight: 0.04, kind: "equality" },
  { axis: "media_density", weight: 0.04, kind: "equality" },
  { axis: "signature_module", weight: 0.14, kind: "equality" },
  { axis: "motion_preset", weight: 0.08, kind: "equality" },
  { axis: "navigation_mode", weight: 0.06, kind: "equality" },
  { axis: "image_treatment", weight: 0.10, kind: "equality" },
];
// section_order is compared separately via Jaccard with its own weight.
const SECTION_ORDER_WEIGHT = 0.0; // captured in the axis-driven score below

function totalWeight() {
  return AXES.reduce((acc, axis) => acc + axis.weight, 0) + SECTION_ORDER_WEIGHT;
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const setA = new Set(a);
  const setB = new Set(b);
  let inter = 0;
  for (const v of setA) if (setB.has(v)) inter += 1;
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

export interface SimilarityHit {
  axis: keyof UniquenessInputs;
  same: boolean;
  weight: number;
  detail?: string;
}

export interface SimilarityReport {
  score: number; // 0..1 — higher = more similar
  threshold_too_similar: number;
  too_similar: boolean;
  hits: SimilarityHit[];
  recommendations: string[];
}

export const TOO_SIMILAR_THRESHOLD = 0.70;

export function compareRooms(a: UniquenessInputs, b: UniquenessInputs): SimilarityReport {
  const total = totalWeight();
  let weightedSame = 0;
  const hits: SimilarityHit[] = [];

  for (const axis of AXES) {
    const av = a[axis.axis] as unknown;
    const bv = b[axis.axis] as unknown;
    const same = av === bv;
    if (same) weightedSame += axis.weight;
    hits.push({ axis: axis.axis, same, weight: axis.weight });
  }

  // Section order Jaccard — folded into axis score by weighting at 0.10
  // of the total. We intentionally do not include it in AXES because
  // it's an array, not a scalar.
  const sectionWeight = 0.10;
  const sectionSim = jaccard(a.section_order, b.section_order);
  weightedSame += sectionSim * sectionWeight;
  hits.push({
    axis: "section_order",
    same: sectionSim === 1,
    weight: sectionWeight,
    detail: `Jaccard ${sectionSim.toFixed(2)}`,
  });

  const score = weightedSame / (total + sectionWeight);
  const too_similar = score >= TOO_SIMILAR_THRESHOLD;
  const recommendations = too_similar ? recommendChanges(a, b, hits) : [];

  return { score, threshold_too_similar: TOO_SIMILAR_THRESHOLD, too_similar, hits, recommendations };
}

function recommendChanges(a: UniquenessInputs, b: UniquenessInputs, hits: SimilarityHit[]): string[] {
  const recs: string[] = [];
  const sameHigh = hits.filter((h) => h.same && h.weight >= 0.10);

  for (const hit of sameHigh) {
    switch (hit.axis) {
      case "blueprint":
        recs.push(`Switch blueprint away from ${a.blueprint} — two rooms sharing a blueprint should differ on entry_type and signature.`);
        break;
      case "signature_module":
        recs.push(`Change signature module away from ${a.signature_module}. Try a contrasting module (e.g. before_after_slider vs materials_board for trades).`);
        break;
      case "image_treatment":
        recs.push(`Change image_treatment from ${a.image_treatment} — reinforce identity with a different treatment family (gallery_matte vs glitch vs warm_portrait).`);
        break;
      case "palette_mode":
        recs.push(`Pick a different palette_mode — both rooms are using ${a.palette_mode}.`);
        break;
    }
  }
  // Section order similarity
  const sec = hits.find((h) => h.axis === "section_order");
  if (sec && !sec.same && sec.weight > 0 && (sec.detail ?? "").includes("0.")) {
    const m = /Jaccard ([\d.]+)/.exec(sec.detail ?? "");
    if (m && parseFloat(m[1]) > 0.8) {
      recs.push("Re-order sections — section_stack Jaccard is high; consider moving signature module earlier or later, and switching the entry section.");
    }
  }
  if (recs.length === 0) {
    recs.push("Reduce overlap on entry_type or motion_preset to create a stronger contrast.");
  }
  return recs;
}

// Helper for batch comparisons across all demo rooms.
export interface PairwiseFinding {
  a: string;
  b: string;
  report: SimilarityReport;
}

export function pairwise(
  rooms: Record<string, UniquenessInputs>,
): PairwiseFinding[] {
  const slugs = Object.keys(rooms);
  const findings: PairwiseFinding[] = [];
  for (let i = 0; i < slugs.length; i += 1) {
    for (let j = i + 1; j < slugs.length; j += 1) {
      const a = slugs[i];
      const b = slugs[j];
      findings.push({ a, b, report: compareRooms(rooms[a], rooms[b]) });
    }
  }
  return findings;
}
