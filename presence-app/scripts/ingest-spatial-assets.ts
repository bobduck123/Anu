import path from "node:path";

import { runIngestion } from "../lib/presence/spatial/assets/ingest/run.ts";
import { DEFAULT_INGEST_CONFIG } from "../lib/presence/spatial/assets/types/config.ts";
import type { IngestConfig } from "../lib/presence/spatial/assets/types/config.ts";
import { registrySummary } from "../lib/presence/spatial/assets/registry/candidateRegistry.ts";

const USAGE = `Presence spatial asset ingestion

Usage:
  npx tsx scripts/ingest-spatial-assets.ts --source "<folder of .glb/.gltf>" [options]

Options:
  --source <path>        Source folder to ingest (required). Read-only for the whole run.
  --batch <label>        Batch label recorded in every artefact. Default: ${DEFAULT_INGEST_CONFIG.sourceBatch}
  --inspect-only         Skip Blender; write inspection reports and manifest-only candidates.
  --blender <path>       Explicit Blender executable. Default: auto-detect, then $BLENDER_PATH.
  --timeout <seconds>    Per-source Blender budget. Default: ${Math.round(DEFAULT_INGEST_CONFIG.blenderTimeoutMs / 1000)}
  --max-objects <n>      Candidate object exports per source. Default: ${DEFAULT_INGEST_CONFIG.maxObjectExportsPerSource}
  --min-triangles <n>    Minimum triangles for an object to earn a candidate. Default: ${DEFAULT_INGEST_CONFIG.minTriangleCountForExport}
  --loose-parts          Also split single-mesh candidates by loose parts (guarded).
  --max-texture <px>     Longest texture edge for textured exports. Default: ${DEFAULT_INGEST_CONFIG.maxTextureSize}
  --max-textured-mb <n>  Sources above this size get shape-only room kits. Default: ${Math.round(DEFAULT_INGEST_CONFIG.maxTexturedSourceBytes / (1024 * 1024))}
  --no-thumbnails        Skip thumbnail rendering.
  --thumbnail-size <px>  Thumbnail edge. Default: ${DEFAULT_INGEST_CONFIG.thumbnailSize}
  --no-incremental       Re-run Blender even when a source is unchanged.
  --only <substring>     Restrict the run to matching source paths.
  --at <iso>             Fix the generatedAt timestamp (for reproducible runs).
  --help                 Show this message.
`;

function parseArgs(argv: readonly string[]): { config: IngestConfig; help: boolean } {
  const repoRoot = process.cwd();
  const config: IngestConfig = {
    ...DEFAULT_INGEST_CONFIG,
    sourceRoot: "",
    repoRoot,
    generatedAt: new Date().toISOString(),
  };
  let help = false;

  const next = (index: number, flag: string): string => {
    const value = argv[index + 1];
    if (value === undefined) throw new Error(`${flag} requires a value.`);
    return value;
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--help": case "-h": help = true; break;
      case "--source": config.sourceRoot = path.resolve(next(index, arg)); index += 1; break;
      case "--batch": config.sourceBatch = next(index, arg); index += 1; break;
      case "--inspect-only": config.inspectOnly = true; break;
      case "--blender": config.blenderPath = next(index, arg); index += 1; break;
      case "--timeout": config.blenderTimeoutMs = Number(next(index, arg)) * 1000; index += 1; break;
      case "--max-objects": config.maxObjectExportsPerSource = Number(next(index, arg)); index += 1; break;
      case "--min-triangles": config.minTriangleCountForExport = Number(next(index, arg)); index += 1; break;
      case "--loose-parts": config.enableLoosePartSplit = true; break;
      case "--max-texture": config.maxTextureSize = Number(next(index, arg)); index += 1; break;
      case "--max-textured-mb": config.maxTexturedSourceBytes = Number(next(index, arg)) * 1024 * 1024; index += 1; break;
      case "--no-thumbnails": config.renderThumbnails = false; break;
      case "--thumbnail-size": config.thumbnailSize = Number(next(index, arg)); index += 1; break;
      case "--no-incremental": config.incremental = false; break;
      case "--only": config.only = next(index, arg); index += 1; break;
      case "--at": config.generatedAt = next(index, arg); index += 1; break;
      default:
        if (arg.startsWith("--")) throw new Error(`Unknown option ${arg}. Use --help.`);
    }
  }

  return { config, help };
}

async function main(): Promise<void> {
  const { config, help } = parseArgs(process.argv.slice(2));
  if (help || config.sourceRoot === "") {
    process.stdout.write(USAGE);
    process.exitCode = help ? 0 : 1;
    return;
  }

  process.stdout.write(`Ingesting from ${config.sourceRoot}\n`);
  const outcome = await runIngestion(config);
  for (const line of outcome.log) process.stdout.write(`${line}\n`);

  const summary = registrySummary(outcome.registry);
  process.stdout.write("\nCandidate registry summary\n");
  process.stdout.write(`  sources inspected     ${outcome.batch.fileCount}\n`);
  process.stdout.write(`  sources reused        ${outcome.skippedSources.length}\n`);
  process.stdout.write(`  component candidates  ${summary.componentCount} (${summary.exportedComponents} exported, ${summary.manifestOnlyComponents} manifest-only)\n`);
  process.stdout.write(`  room-kit candidates   ${summary.roomKitCount}\n`);
  process.stdout.write(`  within budget         ${summary.withinBudget}\n`);
  process.stdout.write(`  over budget           ${summary.overBudget}\n`);
  process.stdout.write(`  not measurable        ${summary.notExported}\n`);
  process.stdout.write(`  thumbnails            ${summary.thumbnails}\n`);
  process.stdout.write("\nEvery candidate is candidate-review-required, licence needs-review and not visually approved.\n");
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
