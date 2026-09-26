import type {
  CandidateComponent,
  CandidateComponentCategory,
  CandidateRoomKit,
  CandidateRoomKitCategory,
  ExportKind,
  ReviewAction,
} from "../types/candidates.ts";
import { PIPELINE_CANDIDATE_STATUS } from "../types/candidates.ts";
import type { SourceAssetReport, SourceBoundingBox, SourceNodeSummary, SourceWarning } from "../types/source.ts";
import { SPATIAL_ASSET_PATHS } from "../types/config.ts";
import { generateAnchors } from "./anchors.ts";
import type { BlenderObjectRecord, BlenderResult } from "./blender.ts";
import { bytesToKb, componentBudgetTier, evaluateBudget, reviewScale } from "./budgets.ts";
import { assertPresenceId, componentCandidateId, isGenericName, roomKitCandidateId, slugify, sourceDiscriminator, titleCase, truncateSlug } from "./ids.ts";
import { toCandidateLicense } from "./license.ts";
import {
  candidateMaterialSlots,
  guessComponentCategory,
  guessPlacement,
  guessRoomKitCategory,
  presenceMaterialSlots,
  roomKitMaterialSlots,
} from "./taxonomy.ts";

/** Candidate versions deliberately sit below the admitted `VERSION_PATTERN` floor. */
export const CANDIDATE_VERSION = "0.1.0";

export interface StagedFile {
  from: string;
  to: string;
}

export interface BuiltCandidates {
  components: CandidateComponent[];
  roomKit: CandidateRoomKit | null;
  stagedFiles: StagedFile[];
}

function meaningfulLabel(name: string, sourceSlug: string): string {
  const cleaned = name.trim();
  if (isGenericName(cleaned)) return truncateSlug(sourceSlug, 32);
  return truncateSlug(slugify(cleaned, sourceSlug), 40);
}

function dimensionsTuple(bounds: SourceBoundingBox | null): readonly [number, number, number] {
  if (!bounds) return [0, 0, 0];
  return [bounds.dimensions.width, bounds.dimensions.height, bounds.dimensions.depth];
}

function componentReviewActions(input: {
  budgetOverBudget: boolean;
  exportKind: ExportKind;
  categoryConfidence: CandidateComponent["categoryConfidence"];
  scaleReviewRequired: boolean;
  category: CandidateComponentCategory;
}): readonly ReviewAction[] {
  const actions: ReviewAction[] = ["approve-as-component"];
  if (input.categoryConfidence !== "keyword-match") actions.push("rename");
  if (input.exportKind === "manifest-only") actions.push("needs-manual-cleanup");
  if (input.budgetOverBudget) actions.push("needs-manual-cleanup");
  if (input.scaleReviewRequired) actions.push("needs-manual-cleanup");
  if (input.category === "poster" || input.category === "projection-surface" || input.category === "rug") {
    actions.push("needs-texture-preservation");
  }
  actions.push("needs-license-review", "needs-art-direction-review");
  return [...new Set(actions)];
}

function roomKitReviewActions(input: { budgetOverBudget: boolean; scaleReviewRequired: boolean; hasRuntimeAsset: boolean }): readonly ReviewAction[] {
  const actions: ReviewAction[] = ["approve-as-roomkit"];
  if (!input.hasRuntimeAsset) actions.push("needs-manual-cleanup");
  if (input.budgetOverBudget) actions.push("needs-manual-cleanup");
  if (input.scaleReviewRequired) actions.push("needs-manual-cleanup");
  actions.push("needs-license-review", "needs-art-direction-review");
  return [...new Set(actions)];
}

interface ComponentSeed {
  name: string;
  meshNames: readonly string[];
  materialNames: readonly string[];
  triangleCount: number | null;
  bounds: SourceBoundingBox | null;
  instanceCount: number;
  instanceNames: readonly string[];
  sourceNodeIndex: number | null;
  extraction: CandidateComponent["extraction"];
  stagedGlb: string | null;
  stagedGlbBytes: number | null;
  stagedThumbnail: string | null;
  warnings: readonly SourceWarning[];
}

function buildComponent(input: {
  seed: ComponentSeed;
  report: SourceAssetReport;
  index: number;
  sourceSlug: string;
  discriminator: string;
  geometryCompression: "draco" | "none";
}): { component: CandidateComponent; stagedFiles: StagedFile[] } {
  const { seed, report, index, sourceSlug } = input;
  const categoryGuess = guessComponentCategory({
    nodeName: seed.name,
    meshNames: seed.meshNames,
    materialNames: seed.materialNames,
    bounds: seed.bounds,
  });
  const placement = guessPlacement(categoryGuess.category, seed.bounds);
  const slots = candidateMaterialSlots(categoryGuess.category);
  const label = meaningfulLabel(seed.name, sourceSlug);
  const componentId = assertPresenceId(componentCandidateId({
    category: categoryGuess.category,
    label,
    discriminator: input.discriminator,
    index,
  }));

  const exportKind: ExportKind = seed.stagedGlb ? "shape-only" : "manifest-only";
  const runtimeAsset = seed.stagedGlb ? `${SPATIAL_ASSET_PATHS.candidateComponents}/${componentId}.glb` : null;
  const thumbnail = seed.stagedThumbnail ? `${SPATIAL_ASSET_PATHS.candidateThumbnails}/${componentId}.webp` : null;

  const actualKb = bytesToKb(seed.stagedGlbBytes);
  const budget = evaluateBudget({
    tier: componentBudgetTier({ exportKind, triangleCount: seed.triangleCount }),
    actualKb,
    exportKind,
  });

  const scaleReview = reviewScale({ bounds: seed.bounds, isInterior: false });
  const warnings: SourceWarning[] = [...seed.warnings];
  if (report.scaleReview.required) {
    warnings.push({
      code: "scale-check-required",
      message: `Extracted from a source whose scale needs confirmation: ${report.scaleReview.note}`,
    });
  }

  const quality = {
    status: "not-reviewed" as const,
    visuallyApproved: false as const,
    notes: [
      categoryGuess.matchedKeywords.length > 0
        ? `Category matched keywords: ${categoryGuess.matchedKeywords.join(", ")}.`
        : "Category was not keyword-matched; treat the guess as provisional.",
      seed.instanceCount > 1
        ? `The source scene repeated this shape ${seed.instanceCount} times; one shared candidate represents them all.`
        : "Single instance in the source scene.",
    ],
  };

  const component: CandidateComponent = {
    componentId,
    version: CANDIDATE_VERSION,
    sourceAssetId: report.sourceAssetId,
    sourceNodeName: seed.name,
    sourceNodeIndex: seed.sourceNodeIndex,
    name: `Candidate ${titleCase(label)}`,
    category: categoryGuess.category,
    categoryLabel: `${categoryGuess.category}-candidate`,
    categoryConfidence: categoryGuess.confidence,
    status: PIPELINE_CANDIDATE_STATUS,
    extraction: seed.extraction,
    export: {
      kind: exportKind,
      runtimeAsset,
      runtimeSizeKb: actualKb,
      texturesStripped: exportKind !== "manifest-only",
      materialSlotsPreserved: exportKind !== "manifest-only",
      geometryCompression: exportKind === "manifest-only" ? "none" : input.geometryCompression,
      note:
        exportKind === "manifest-only"
          ? "No GLB was exported for this candidate; it is recorded from glTF structure only."
          : "Shape-only export: geometry, UVs, material slots and base factors kept; images, cameras, lights, animations and skins dropped.",
    },
    thumbnail,
    dimensions: dimensionsTuple(seed.bounds),
    bounds: seed.bounds,
    triangleCount: seed.triangleCount,
    scaleReview,
    instanceCount: seed.instanceCount,
    instanceNames: seed.instanceNames,
    placement,
    materialSlots: slots,
    presenceMaterialSlots: presenceMaterialSlots(slots, categoryGuess.category),
    sourceMaterialNames: seed.materialNames,
    anchors: generateAnchors({ bounds: seed.bounds, category: categoryGuess.category, placement }),
    budget,
    license: toCandidateLicense(report.license),
    quality,
    reviewActions: componentReviewActions({
      budgetOverBudget: budget.status === "over-budget",
      exportKind,
      categoryConfidence: categoryGuess.confidence,
      scaleReviewRequired: report.scaleReview.required,
      category: categoryGuess.category,
    }),
    warnings,
  };

  const stagedFiles: StagedFile[] = [];
  if (seed.stagedGlb && runtimeAsset) stagedFiles.push({ from: seed.stagedGlb, to: runtimeAsset });
  if (seed.stagedThumbnail && thumbnail) stagedFiles.push({ from: seed.stagedThumbnail, to: thumbnail });
  return { component, stagedFiles };
}

function seedsFromBlender(result: BlenderResult): ComponentSeed[] {
  const seeds: ComponentSeed[] = [];
  for (const record of result.objects) {
    seeds.push({
      name: record.name,
      meshNames: [],
      materialNames: record.materialNames ?? [],
      triangleCount: record.triangleCount,
      bounds: record.bounds,
      instanceCount: record.instanceCount ?? 1,
      instanceNames: record.instanceNames ?? [record.name],
      sourceNodeIndex: null,
      extraction: "blender-object",
      stagedGlb: record.file,
      stagedGlbBytes: record.fileBytes,
      stagedThumbnail: record.thumbnail,
      warnings: record.warnings ?? [],
    });
    for (const part of record.looseParts ?? []) {
      seeds.push({
        name: `${record.name}-part-${String(part.index + 1).padStart(2, "0")}`,
        meshNames: [],
        materialNames: record.materialNames ?? [],
        triangleCount: part.triangleCount,
        bounds: part.bounds,
        instanceCount: 1,
        instanceNames: [part.name],
        sourceNodeIndex: null,
        extraction: "blender-loose-part",
        stagedGlb: part.file,
        stagedGlbBytes: part.fileBytes,
        stagedThumbnail: null,
        warnings: [],
      });
    }
  }
  return seeds;
}

function seedsFromGltf(report: SourceAssetReport, limit: number, minTriangles: number): ComponentSeed[] {
  const ranked = [...report.topLevelNodes]
    .filter((node: SourceNodeSummary) => node.meshNodeCount > 0 && node.triangleCount >= minTriangles)
    .sort((a, b) => b.triangleCount - a.triangleCount || a.name.localeCompare(b.name));

  return ranked.slice(0, limit).map((node) => ({
    name: node.name,
    meshNames: node.meshNames,
    materialNames: node.materialNames,
    triangleCount: node.triangleCount,
    bounds: node.bounds,
    instanceCount: 1,
    instanceNames: [node.name],
    sourceNodeIndex: node.nodeIndex,
    extraction: "gltf-node" as const,
    stagedGlb: null,
    stagedGlbBytes: null,
    stagedThumbnail: null,
    warnings: [],
  }));
}

/** Fills glTF node indices onto Blender-derived candidates where the name is unambiguous. */
function attachNodeIndices(seeds: ComponentSeed[], report: SourceAssetReport): void {
  const byName = new Map<string, number[]>();
  for (const node of report.topLevelNodes) {
    const existing = byName.get(node.name) ?? [];
    existing.push(node.nodeIndex);
    byName.set(node.name, existing);
  }
  for (const seed of seeds) {
    const matches = byName.get(seed.name);
    if (matches && matches.length === 1) seed.sourceNodeIndex = matches[0];
  }
}

export function buildCandidates(input: {
  report: SourceAssetReport;
  blender: BlenderResult | null;
  roomKitIndex: number;
  maxManifestOnlyCandidates: number;
  minTriangleCountForExport: number;
  extraWarnings: readonly SourceWarning[];
}): BuiltCandidates {
  const { report, blender } = input;
  const sourceSlug = slugify(report.sourceAssetId.replace(/^source\./, ""), "source");
  const discriminator = sourceDiscriminator(report.sourceAssetId);
  const geometryCompression = blender?.geometryCompression ?? "none";

  const seeds = blender && blender.ok && blender.objects.length > 0
    ? seedsFromBlender(blender)
    : seedsFromGltf(report, input.maxManifestOnlyCandidates, input.minTriangleCountForExport);
  attachNodeIndices(seeds, report);

  const components: CandidateComponent[] = [];
  const stagedFiles: StagedFile[] = [];
  for (const [index, seed] of seeds.entries()) {
    const built = buildComponent({ seed, report, index, sourceSlug, discriminator, geometryCompression });
    components.push(built.component);
    stagedFiles.push(...built.stagedFiles);
  }

  const roomKit = report.appearsCompleteInterior
    ? buildRoomKit({
      report,
      blender,
      index: input.roomKitIndex,
      sourceSlug,
      discriminator,
      componentIds: components.map((component) => component.componentId),
      geometryCompression,
      extraWarnings: input.extraWarnings,
      stagedFiles,
    })
    : null;

  return { components, roomKit, stagedFiles };
}

function buildRoomKit(input: {
  report: SourceAssetReport;
  blender: BlenderResult | null;
  index: number;
  sourceSlug: string;
  discriminator: string;
  componentIds: readonly string[];
  geometryCompression: "draco" | "none";
  extraWarnings: readonly SourceWarning[];
  stagedFiles: StagedFile[];
}): CandidateRoomKit {
  const { report, blender } = input;
  // Blender's scene bounds describe the file that was actually exported, so they
  // win over the glTF-derived bounds whenever an export exists.
  const bounds = blender?.sceneBounds ?? report.bounds;
  const triangleCount = blender?.sceneTriangleCount ?? report.triangleCount;
  const categoryGuess = guessRoomKitCategory({
    filename: `${report.sourcePath} ${report.sourceFilename}`,
    sceneName: report.license.declaredTitle ?? "",
    nodeNames: report.topLevelNodes.map((node) => node.name),
    bounds,
  });
  const category: CandidateRoomKitCategory = categoryGuess.category;
  const roomKitId = assertPresenceId(roomKitCandidateId(category, input.discriminator));

  const roomKitRecord = blender?.roomKit ?? null;
  const textured = roomKitRecord?.textured ?? null;
  const shapeOnly = roomKitRecord?.shapeOnly ?? null;
  const preferred = textured ?? shapeOnly;

  const exportKind: ExportKind = preferred === null ? "manifest-only" : textured ? "textured" : "shape-only";
  const runtimeAsset = preferred ? `${SPATIAL_ASSET_PATHS.candidateRoomKits}/${roomKitId}.glb` : null;
  const fallbackAsset = shapeOnly && textured ? `${SPATIAL_ASSET_PATHS.candidateRoomKits}/${roomKitId}.shape.glb` : null;
  const thumbnail = roomKitRecord?.thumbnail ? `${SPATIAL_ASSET_PATHS.candidateThumbnails}/${roomKitId}.webp` : null;

  if (preferred && runtimeAsset) input.stagedFiles.push({ from: preferred.file, to: runtimeAsset });
  if (shapeOnly && textured && fallbackAsset) input.stagedFiles.push({ from: shapeOnly.file, to: fallbackAsset });
  if (roomKitRecord?.thumbnail && thumbnail) input.stagedFiles.push({ from: roomKitRecord.thumbnail, to: thumbnail });

  const actualKb = bytesToKb(preferred?.fileBytes ?? null);
  const budget = evaluateBudget({
    tier: "roomkit-eager",
    actualKb,
    exportKind,
    extraNotes: textured
      ? [`Textured room-kit export; source images were resized and re-encoded to WEBP${roomKitRecord?.resizedImages?.length ? ` (${roomKitRecord.resizedImages.length} image(s) downscaled)` : ""}.`]
      : [],
  });

  const scaleReview = reviewScale({ bounds, isInterior: true });
  const slots = roomKitMaterialSlots();

  const warnings: SourceWarning[] = [...input.extraWarnings, ...(blender?.warnings ?? [])];
  if (scaleReview.required) warnings.push({ code: "scale-check-required", message: scaleReview.note });
  if (!preferred) {
    warnings.push({
      code: "blender-unavailable",
      message: "No optimised room-kit export exists; the kit is recorded as a semantic candidate from glTF inspection only.",
    });
  }

  return {
    roomKitId,
    version: CANDIDATE_VERSION,
    sourceAssetId: report.sourceAssetId,
    name: `Candidate ${titleCase(category)} Kit ${String(input.index).padStart(3, "0")} (${input.sourceSlug})`,
    category,
    categoryConfidence: categoryGuess.confidence,
    status: PIPELINE_CANDIDATE_STATUS,
    export: {
      kind: exportKind,
      runtimeAsset,
      runtimeSizeKb: actualKb,
      texturesStripped: exportKind === "shape-only",
      materialSlotsPreserved: exportKind !== "manifest-only",
      geometryCompression: exportKind === "manifest-only" ? "none" : input.geometryCompression,
      note:
        exportKind === "manifest-only"
          ? "No room-kit GLB was exported; the kit is a metadata-level candidate."
          : exportKind === "textured"
            ? "Textured room-kit export retained because an interior preview needs its baked surfaces."
            : "Shape-only room-kit export; textures were dropped.",
    },
    fallback: fallbackAsset
      ? {
        strategy: "shape-only-glb",
        runtimeAsset: fallbackAsset,
        note: "Shape-only room shell for constrained clients and mobile fallback.",
      }
      : {
        strategy: exportKind === "shape-only" ? "shape-only-glb" : "semantic-only",
        runtimeAsset: exportKind === "shape-only" ? runtimeAsset : null,
        note:
          exportKind === "shape-only"
            ? "The shape-only export doubles as the fallback representation."
            : "No geometry fallback exists; the kit falls back to the semantic room description and its extracted component list.",
      },
    thumbnail,
    dimensions: dimensionsTuple(bounds),
    bounds,
    triangleCount,
    scaleReview,
    extractedComponents: input.componentIds,
    materialSlots: slots,
    presenceMaterialSlots: presenceMaterialSlots(slots, "room-shell"),
    sourceMaterialNames: blender?.sceneMaterialNames ?? [],
    budget,
    license: toCandidateLicense(report.license),
    quality: {
      status: "not-reviewed",
      visuallyApproved: false,
      notes: [
        categoryGuess.matchedKeywords.length > 0
          ? `Interior category matched keywords: ${categoryGuess.matchedKeywords.join(", ")}.`
          : "Interior category could not be keyword-matched; recorded as an uncertain guess.",
        `Interior signals: ${report.interiorSignals.join("; ") || "none recorded"}.`,
      ],
    },
    reviewActions: roomKitReviewActions({
      budgetOverBudget: budget.status === "over-budget",
      scaleReviewRequired: scaleReview.required,
      hasRuntimeAsset: preferred !== null,
    }),
    warnings,
  };
}
