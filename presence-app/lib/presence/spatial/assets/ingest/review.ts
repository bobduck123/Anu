import type { CandidateComponent, CandidateRegistry, CandidateRoomKit } from "../types/candidates.ts";
import { registrySummary } from "../registry/candidateRegistry.ts";

function sizeCell(entry: CandidateComponent | CandidateRoomKit): string {
  if (entry.export.runtimeSizeKb === null) return "not exported";
  return `${entry.export.runtimeSizeKb} KB`;
}

function budgetCell(entry: CandidateComponent | CandidateRoomKit): string {
  const { status, tier, limitKb } = entry.budget;
  if (status === "within-budget") return `within ${tier} (${limitKb} KB)`;
  if (status === "over-budget") return `**over ${tier}** (${limitKb} KB)`;
  return `not measured (${tier})`;
}

function dimensionCell(entry: CandidateComponent | CandidateRoomKit): string {
  const [width, height, depth] = entry.dimensions;
  if (width === 0 && height === 0 && depth === 0) return "unknown";
  return `${width} x ${height} x ${depth}`;
}

function recommendedAction(entry: CandidateComponent | CandidateRoomKit): string {
  const actions = entry.reviewActions;
  if (actions.includes("needs-manual-cleanup")) return "needs-manual-cleanup";
  return actions[0] ?? "needs-art-direction-review";
}

function thumbnailCell(entry: CandidateComponent | CandidateRoomKit): string {
  return entry.thumbnail ? `\`${entry.thumbnail}\`` : "none";
}

/**
 * The review artefact.
 *
 * A reviewer works from thumbnails, dimensions, budget status and licence
 * evidence in this one file. Opening Blender is only required for candidates
 * explicitly flagged `needs-manual-cleanup`.
 */
export function renderReviewMarkdown(input: {
  registry: CandidateRegistry;
  reviewDocPath: string;
}): string {
  const { registry } = input;
  const summary = registrySummary(registry);
  const lines: string[] = [];

  lines.push("# Presence spatial candidate review");
  lines.push("");
  lines.push(`Batch: \`${registry.sourceBatch}\`  `);
  lines.push(`Generated: ${registry.generatedAt}  `);
  lines.push(`Registry admission: \`${registry.admission}\``);
  lines.push("");
  lines.push("Every row is `candidate-review-required`. Nothing here is an admitted Presence component, nothing is licence-cleared, and nothing has passed art direction.");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|---|---|");
  lines.push(`| Component candidates | ${summary.componentCount} |`);
  lines.push(`| Room-kit candidates | ${summary.roomKitCount} |`);
  lines.push(`| Candidates with an exported GLB | ${summary.exportedComponents} |`);
  lines.push(`| Manifest-only candidates | ${summary.manifestOnlyComponents} |`);
  lines.push(`| Within payload budget | ${summary.withinBudget} |`);
  lines.push(`| Over payload budget | ${summary.overBudget} |`);
  lines.push(`| Not measurable (no export) | ${summary.notExported} |`);
  lines.push(`| With a thumbnail | ${summary.thumbnails} |`);
  lines.push("");
  lines.push("Tooling used for this batch:");
  lines.push("");
  lines.push(`- Blender: ${registry.tooling.blenderAvailable ? `available (${registry.tooling.blenderVersion ?? "version unknown"})` : "**not available**"}`);
  lines.push(`- gltf-transform: ${registry.tooling.gltfTransformAvailable ? "available" : "not available"}`);
  lines.push(`- gltfpack: ${registry.tooling.gltfpackAvailable ? "available" : "not available"}`);
  for (const note of registry.tooling.notes) lines.push(`- ${note}`);
  lines.push("");

  lines.push("## Recommended actions vocabulary");
  lines.push("");
  lines.push("`approve-as-component`, `approve-as-roomkit`, `rename`, `merge`, `reject`, `needs-manual-cleanup`, `needs-license-review`, `needs-texture-preservation`, `needs-art-direction-review`");
  lines.push("");

  lines.push("## Room-kit candidates");
  lines.push("");
  if (registry.roomKits.length === 0) {
    lines.push("_No complete interior was detected in this batch._");
    lines.push("");
  } else {
    lines.push("| Room kit id | Thumbnail | Source | Category | Dimensions | Runtime size | Budget | Licence | Components | Recommended action |");
    lines.push("|---|---|---|---|---|---|---|---|---|---|");
    for (const roomKit of registry.roomKits) {
      lines.push([
        `\`${roomKit.roomKitId}\``,
        thumbnailCell(roomKit),
        `\`${roomKit.sourceAssetId}\``,
        `${roomKit.category} (${roomKit.categoryConfidence})`,
        dimensionCell(roomKit),
        sizeCell(roomKit),
        budgetCell(roomKit),
        roomKit.license.status,
        String(roomKit.extractedComponents.length),
        recommendedAction(roomKit),
      ].join(" | ").replace(/^/, "| ").replace(/$/, " |"));
    }
    lines.push("");

    for (const roomKit of registry.roomKits) {
      lines.push(`### ${roomKit.roomKitId}`);
      lines.push("");
      lines.push(`- Name: ${roomKit.name}`);
      lines.push(`- Source asset: \`${roomKit.sourceAssetId}\``);
      lines.push(`- Runtime asset: ${roomKit.export.runtimeAsset ? `\`${roomKit.export.runtimeAsset}\`` : "none"} (${roomKit.export.kind}, ${roomKit.export.geometryCompression} geometry)`);
      lines.push(`- Fallback: ${roomKit.fallback.strategy}${roomKit.fallback.runtimeAsset ? ` -> \`${roomKit.fallback.runtimeAsset}\`` : ""} - ${roomKit.fallback.note}`);
      lines.push(`- Extracted component candidates: ${roomKit.extractedComponents.length}`);
      lines.push(`- Licence evidence: ${roomKit.license.evidence.join("; ")}`);
      if (roomKit.scaleReview.required) lines.push(`- Scale: ${roomKit.scaleReview.note}`);
      for (const note of roomKit.quality.notes) lines.push(`- ${note}`);
      if (roomKit.warnings.length > 0) {
        lines.push(`- Warnings: ${roomKit.warnings.map((warning) => `\`${warning.code}\``).join(", ")}`);
      }
      lines.push(`- Available actions: ${roomKit.reviewActions.join(", ")}`);
      lines.push("");
    }
  }

  lines.push("## Component candidates");
  lines.push("");
  if (registry.components.length === 0) {
    lines.push("_No component candidate was extracted in this batch._");
    lines.push("");
    return `${lines.join("\n")}\n`;
  }

  const bySource = new Map<string, CandidateComponent[]>();
  for (const component of registry.components) {
    const existing = bySource.get(component.sourceAssetId) ?? [];
    existing.push(component);
    bySource.set(component.sourceAssetId, existing);
  }

  for (const [sourceAssetId, components] of [...bySource.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`### From \`${sourceAssetId}\``);
    lines.push("");
    lines.push("| Candidate id | Thumbnail | Category | Dimensions | Triangles | Instances | Runtime size | Budget | Licence | Recommended action |");
    lines.push("|---|---|---|---|---|---|---|---|---|---|");
    for (const component of components) {
      lines.push([
        `\`${component.componentId}\``,
        thumbnailCell(component),
        `${component.category} (${component.categoryConfidence})`,
        dimensionCell(component),
        component.triangleCount === null ? "unknown" : component.triangleCount.toLocaleString("en-AU"),
        `x${component.instanceCount}`,
        sizeCell(component),
        budgetCell(component),
        component.license.status,
        recommendedAction(component),
      ].join(" | ").replace(/^/, "| ").replace(/$/, " |"));
    }
    lines.push("");
  }

  lines.push("## How to record a decision");
  lines.push("");
  lines.push("1. Open the thumbnail listed for the candidate. Blender is only needed for rows recommending `needs-manual-cleanup`.");
  lines.push("2. Edit the candidate's entry in the registry JSON, setting `status` to `human-approved-component`, `human-approved-roomkit` or `human-rejected`.");
  lines.push("3. Licence clearance is a separate human act: set `license.status` only after checking the declared licence against its source, and record where that check happened.");
  lines.push("4. Art-direction sign-off is recorded on `quality`; the pipeline will never set `visuallyApproved` to true.");
  lines.push("5. Promotion into the admitted Presence component registry goes through `promoteCandidateToComponent`, which refuses unreviewed, over-budget, unscaled or unexported candidates.");
  lines.push("");
  lines.push(`Re-running the pipeline regenerates \`${input.reviewDocPath}\` from the registry, so record decisions in the registry rather than in this file.`);

  return `${lines.join("\n")}\n`;
}
