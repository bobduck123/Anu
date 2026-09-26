import type { SourceAssetReport, SourceInspectionBatch } from "../types/source.ts";

function mb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function yesNo(value: boolean): string {
  return value ? "yes" : "no";
}

function dimensions(report: SourceAssetReport): string {
  if (!report.bounds) return "unknown";
  const { width, height, depth } = report.bounds.dimensions;
  return `${width} x ${height} x ${depth}`;
}

/** Human-readable companion to `source-inspection.json`. */
export function renderSourceInspectionMarkdown(batch: SourceInspectionBatch): string {
  const lines: string[] = [];
  lines.push("# Presence spatial source inspection");
  lines.push("");
  lines.push(`Batch: \`${batch.sourceBatch}\`  `);
  lines.push(`Generated: ${batch.generatedAt}  `);
  lines.push(`Source root: \`${batch.sourceRoot}\` (read-only; never modified by this pipeline)  `);
  lines.push(`Files inspected: ${batch.fileCount}  `);
  lines.push(`Total source bytes: ${mb(batch.totalSourceBytes)}`);
  lines.push("");
  lines.push("Every row below describes **source material only**. No entry here is a Presence runtime asset.");
  lines.push("");
  lines.push("## Overview");
  lines.push("");
  lines.push("| Source | Size | Nodes | Separable | Meshes | Materials | Images | Triangles | Texture | Geometry | Classifications |");
  lines.push("|---|---|---|---|---|---|---|---|---|---|---|");
  for (const report of batch.reports) {
    lines.push([
      `\`${report.sourcePath}\``,
      mb(report.fileBytes),
      String(report.nodeCount),
      String(report.topLevelNodeCount),
      String(report.meshCount),
      String(report.materialCount),
      String(report.imageCount),
      report.triangleCount === null ? "unknown" : report.triangleCount.toLocaleString("en-AU"),
      mb(report.textureBytes),
      mb(report.geometryBytes),
      report.classifications.join(", "),
    ].join(" | ").replace(/^/, "| ").replace(/$/, " |"));
  }
  lines.push("");

  for (const report of batch.reports) {
    lines.push(`## ${report.sourceFilename}`);
    lines.push("");
    lines.push(`- Source asset id: \`${report.sourceAssetId}\``);
    lines.push(`- Path: \`${report.sourcePath}\``);
    lines.push(`- Format: ${report.format} (glTF ${report.gltfVersion}), ${mb(report.fileBytes)}`);
    lines.push(`- Content hash: \`${report.contentHash.slice(0, 16)}...\``);
    lines.push(`- Nodes: ${report.nodeCount} (scene roots ${report.sceneRootCount}, separable objects ${report.topLevelNodeCount})`);
    if (report.separationRootPath.length > 0) {
      lines.push(`- Descended wrapper nodes: ${report.separationRootPath.map((name) => `\`${name}\``).join(" -> ")}`);
    }
    lines.push(`- Meshes ${report.meshCount}, primitives ${report.primitiveCount}, materials ${report.materialCount}, textures ${report.textureCount}, images ${report.imageCount}`);
    lines.push(`- Animations ${report.animationCount}, cameras ${report.cameraCount}, lights ${report.lightCount}`);
    lines.push(`- Triangles: ${report.triangleCount === null ? "unknown" : report.triangleCount.toLocaleString("en-AU")}`);
    lines.push(`- Byte split: textures ${mb(report.textureBytes)}, geometry ${mb(report.geometryBytes)}, other ${mb(report.otherBufferBytes)}`);
    lines.push(`- Bounds (w x h x d): ${dimensions(report)}`);
    lines.push(`- Single object: ${yesNo(report.appearsSingleObject)} | multi-object: ${yesNo(report.appearsMultiObject)} | complete interior: ${yesNo(report.appearsCompleteInterior)}`);
    lines.push(`- Separable nodes: ${yesNo(report.hasSeparableNodes)} | loose-part split useful: ${yesNo(report.loosePartSplitUseful)}`);
    lines.push(`- Classifications: ${report.classifications.join(", ")}`);
    if (report.interiorSignals.length > 0) {
      lines.push(`- Interior signals: ${report.interiorSignals.join("; ")}`);
    }
    lines.push(`- Scale check required: ${yesNo(report.scaleReview.required)}${report.scaleReview.required ? ` - ${report.scaleReview.note}` : ""}`);
    lines.push("");
    lines.push("**Licence and provenance (status is always `needs-review`; this pipeline never clears a licence):**");
    lines.push("");
    lines.push(`- Signal source: ${report.license.source}`);
    lines.push(`- Declared title: ${report.license.declaredTitle ?? "none"}`);
    lines.push(`- Declared author: ${report.license.declaredAuthor ?? "none"}`);
    lines.push(`- Declared licence: ${report.license.declaredLicense ?? "none"}`);
    lines.push(`- Declared copyright: ${report.license.declaredCopyright ?? "none"}`);
    lines.push(`- Generator: ${report.license.declaredGenerator ?? "none"}`);
    if (report.license.sidecarFiles.length > 0) {
      lines.push(`- Sidecar files: ${report.license.sidecarFiles.map((file) => `\`${file}\``).join(", ")}`);
    }
    lines.push(`- Evidence: ${report.license.evidence.join("; ")}`);
    lines.push("");
    if (report.warnings.length > 0) {
      lines.push("**Warnings:**");
      lines.push("");
      for (const warning of report.warnings) lines.push(`- \`${warning.code}\`: ${warning.message}`);
      lines.push("");
    }
    const topNodes = [...report.topLevelNodes].sort((a, b) => b.triangleCount - a.triangleCount).slice(0, 12);
    if (topNodes.length > 0) {
      lines.push("**Largest separable objects:**");
      lines.push("");
      lines.push("| Node | Mesh nodes | Triangles | Dimensions | Materials |");
      lines.push("|---|---|---|---|---|");
      for (const node of topNodes) {
        const size = node.bounds ? `${node.bounds.dimensions.width} x ${node.bounds.dimensions.height} x ${node.bounds.dimensions.depth}` : "unknown";
        lines.push(`| \`${node.name}\` | ${node.meshNodeCount} | ${node.triangleCount.toLocaleString("en-AU")} | ${size} | ${node.materialNames.slice(0, 3).join(", ") || "-"} |`);
      }
      lines.push("");
    }
  }

  return `${lines.join("\n")}\n`;
}
