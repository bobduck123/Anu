import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { CandidateComponent, CandidateRegistry, CandidateRoomKit } from "../types/candidates.ts";
import type { SourceAssetReport, SourceInspectionBatch, SourceWarning } from "../types/source.ts";
import { SPATIAL_ASSET_SCHEMA_VERSION } from "../types/source.ts";
import type { IngestConfig } from "../types/config.ts";
import {
  CANDIDATE_REGISTRY_FILENAME,
  REVIEW_MARKDOWN_FILENAME,
  SOURCE_INSPECTION_FILENAME,
  SOURCE_INSPECTION_MARKDOWN,
  SPATIAL_ASSET_PATHS,
} from "../types/config.ts";
import { createCandidateRegistry, validateCandidateRegistry } from "../registry/candidateRegistry.ts";
import { blenderScriptPath, blenderVersion, buildBlenderJob, clearStaging, locateBlender, runBlenderJob } from "./blender.ts";
import type { BlenderResult } from "./blender.ts";
import { buildCandidates } from "./candidates.ts";
import { discoverSources } from "./discover.ts";
import { readGltfContainer } from "./gltf.ts";
import { inspectSource } from "./inspect.ts";
import { renderSourceInspectionMarkdown } from "./reports.ts";
import { renderReviewMarkdown } from "./review.ts";

export interface IngestOutcome {
  batch: SourceInspectionBatch;
  registry: CandidateRegistry;
  writtenFiles: readonly string[];
  skippedSources: readonly string[];
  log: readonly string[];
}

const STAGING_DIRECTORY = "assets/presence-spatial/candidates/.staging";

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeText(filePath: string, value: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, value, "utf8");
}

/** Moves a staged Blender output into its final candidate path, falling back to copy across volumes. */
async function placeStagedFile(from: string, to: string): Promise<void> {
  await mkdir(path.dirname(to), { recursive: true });
  try {
    await rename(from, to);
  } catch {
    await copyFile(from, to);
  }
}

interface BlenderCacheEntry {
  contentHash: string;
  result: BlenderResult;
}

async function readBlenderCache(cachePath: string, contentHash: string): Promise<BlenderResult | null> {
  try {
    const raw = await readFile(cachePath, "utf8");
    const parsed = JSON.parse(raw) as BlenderCacheEntry;
    return parsed.contentHash === contentHash ? parsed.result : null;
  } catch {
    return null;
  }
}

/**
 * Removes generated candidate files the current registry no longer references.
 *
 * Only files this pipeline writes are considered: `candidate.*` GLBs and
 * thumbnails inside the three candidate output folders. Source assets are never
 * touched, and pruning is skipped for any run whose registry deliberately
 * describes less than a full run (`--only`, `--inspect-only`, or no Blender).
 */
async function pruneOrphans(input: {
  resolve: (relative: string) => string;
  referenced: ReadonlySet<string>;
  log: string[];
}): Promise<void> {
  const { readdir, unlink } = await import("node:fs/promises");
  const directories = [
    SPATIAL_ASSET_PATHS.candidateComponents,
    SPATIAL_ASSET_PATHS.candidateRoomKits,
    SPATIAL_ASSET_PATHS.candidateThumbnails,
  ];
  let removed = 0;
  for (const directory of directories) {
    let entries: string[];
    try {
      entries = await readdir(input.resolve(directory));
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.startsWith("candidate.")) continue;
      if (!entry.endsWith(".glb") && !entry.endsWith(".webp")) continue;
      const relative = `${directory}/${entry}`;
      if (input.referenced.has(relative)) continue;
      await unlink(input.resolve(relative));
      removed += 1;
    }
  }
  if (removed > 0) input.log.push(`Pruned ${removed} generated file(s) no longer referenced by the registry.`);
}

async function allPresent(paths: readonly string[]): Promise<boolean> {
  const { access } = await import("node:fs/promises");
  for (const candidate of paths) {
    try {
      await access(candidate);
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Runs the whole ingestion.
 *
 * Order: discover -> inspect -> classify -> Blender extraction (room kit first,
 * then object candidates) -> candidate build -> registry -> reports -> review.
 * Every stage after inspection degrades rather than fails, so one broken source
 * cannot take down a batch.
 */
export async function runIngestion(config: IngestConfig): Promise<IngestOutcome> {
  const log: string[] = [];
  const writtenFiles: string[] = [];
  const skippedSources: string[] = [];

  const resolve = (relative: string): string => path.join(config.repoRoot, ...relative.split("/"));

  const sources = (await discoverSources(config.sourceRoot))
    .filter((source) => (config.only ? source.relativePath.toLowerCase().includes(config.only.toLowerCase()) : true));
  log.push(`Discovered ${sources.length} source file(s) under ${config.sourceRoot}.`);

  const blenderPath = config.inspectOnly ? null : await locateBlender(config.blenderPath);
  const detectedBlenderVersion = blenderPath ? await blenderVersion(blenderPath) : null;
  const toolingNotes: string[] = [];
  if (config.inspectOnly) {
    toolingNotes.push("Run was `--inspect-only`: no Blender stage ran and every candidate is manifest-only.");
  } else if (!blenderPath) {
    toolingNotes.push("Blender was not found. Candidates were derived from glTF structure only: no GLB export, no thumbnail, no geometry optimisation.");
  } else {
    toolingNotes.push(`Blender extraction ran per source with a ${Math.round(config.blenderTimeoutMs / 1000)}s timeout, Draco geometry compression and WEBP thumbnails.`);
    toolingNotes.push(`Textured exports resize images to a ${config.maxTextureSize}px longest edge; sources above ${Math.round(config.maxTexturedSourceBytes / (1024 * 1024))} MB get shape-only room kits.`);
  }
  toolingNotes.push("gltf-transform and gltfpack were not used: neither is installed in this environment, and no new dependency was introduced for this pass.");
  log.push(blenderPath ? `Blender: ${blenderPath} (${detectedBlenderVersion ?? "version unknown"}).` : "Blender: not available.");

  const registryPath = resolve(`${SPATIAL_ASSET_PATHS.candidateManifests}/${CANDIDATE_REGISTRY_FILENAME}`);

  const reports: SourceAssetReport[] = [];
  const components: CandidateComponent[] = [];
  const roomKits: CandidateRoomKit[] = [];
  const sourceHashes: Record<string, string> = {};
  let roomKitIndex = 1;

  for (const source of sources) {
    log.push(`--- ${source.relativePath}`);
    const container = await readGltfContainer(source.absolutePath);
    const report = await inspectSource({ container, sourceRoot: config.sourceRoot });
    reports.push(report);
    sourceHashes[report.sourceAssetId] = report.contentHash;

    await writeJson(resolve(`${SPATIAL_ASSET_PATHS.sourceReports}/${report.sourceAssetId}.json`), report);
    writtenFiles.push(`${SPATIAL_ASSET_PATHS.sourceReports}/${report.sourceAssetId}.json`);

    const extraWarnings: SourceWarning[] = [];
    const stagingDir = resolve(`${STAGING_DIRECTORY}/${report.sourceAssetId}`);
    const cachePath = resolve(`${SPATIAL_ASSET_PATHS.candidateManifests}/blender/${report.sourceAssetId}.json`);
    const exportTextured = report.appearsCompleteInterior && report.fileBytes <= config.maxTexturedSourceBytes;

    const buildFrom = (blender: BlenderResult | null, warnings: readonly SourceWarning[]) =>
      buildCandidates({
        report,
        blender,
        roomKitIndex,
        maxManifestOnlyCandidates: config.maxObjectExportsPerSource,
        minTriangleCountForExport: config.minTriangleCountForExport,
        extraWarnings: warnings,
      });

    let blenderResult: BlenderResult | null = null;
    let built = null as ReturnType<typeof buildFrom> | null;
    let reusedCache = false;

    if (blenderPath && config.incremental) {
      const cached = await readBlenderCache(cachePath, report.contentHash);
      if (cached) {
        const candidateBuild = buildFrom(cached, extraWarnings);
        const expected = candidateBuild.stagedFiles.map((staged) => resolve(staged.to));
        if (await allPresent(expected)) {
          blenderResult = cached;
          built = candidateBuild;
          reusedCache = true;
          skippedSources.push(report.sourcePath);
          log.push("  unchanged since the last run; reusing cached Blender exports.");
        }
      }
    }

    if (blenderPath && !reusedCache) {
      if (report.appearsCompleteInterior && !exportTextured) {
        extraWarnings.push({
          code: "huge-texture-payload",
          message: `Source exceeds the ${Math.round(config.maxTexturedSourceBytes / (1024 * 1024))} MB textured-export ceiling; only a shape-only room kit was produced.`,
        });
      }
      const job = buildBlenderJob({
        sourcePath: source.absolutePath,
        stagingDir,
        exportRoomKit: report.appearsCompleteInterior,
        exportTexturedRoomKit: exportTextured,
        config,
      });
      const outcome = await runBlenderJob({
        blenderPath,
        scriptPath: blenderScriptPath(config.repoRoot),
        job,
        timeoutMs: config.blenderTimeoutMs,
      });
      blenderResult = outcome.result;
      extraWarnings.push(...outcome.warnings);
      log.push(`  blender: ${outcome.result?.ok ? "ok" : "degraded"} in ${Math.round(outcome.durationMs / 1000)}s, ${outcome.result?.objects.length ?? 0} object export(s).`);
      if (outcome.stderrTail && !outcome.result?.ok) log.push(`  blender stderr tail: ${outcome.stderrTail.slice(-400)}`);
    } else if (!blenderPath) {
      extraWarnings.push({
        code: "blender-unavailable",
        message: "Blender was unavailable, so this source produced manifest-level candidates only.",
      });
    }

    if (!built) built = buildFrom(blenderResult, extraWarnings);

    if (blenderResult && !reusedCache) {
      for (const staged of built.stagedFiles) {
        await placeStagedFile(path.join(stagingDir, staged.from), resolve(staged.to));
        writtenFiles.push(staged.to);
      }
      await clearStaging(stagingDir);
      await writeJson(cachePath, { contentHash: report.contentHash, result: blenderResult } satisfies BlenderCacheEntry);
    }

    components.push(...built.components);
    if (built.roomKit) {
      roomKits.push(built.roomKit);
      roomKitIndex += 1;
    }
    log.push(`  candidates: ${built.components.length} component(s)${built.roomKit ? ", 1 room kit" : ""}.`);
  }

  const batch: SourceInspectionBatch = {
    schemaVersion: SPATIAL_ASSET_SCHEMA_VERSION,
    generatedAt: config.generatedAt,
    sourceBatch: config.sourceBatch,
    sourceRoot: config.sourceRoot,
    fileCount: reports.length,
    totalSourceBytes: reports.reduce((total, report) => total + report.fileBytes, 0),
    reports,
  };

  const registry = createCandidateRegistry({
    generatedAt: config.generatedAt,
    sourceBatch: config.sourceBatch,
    sourceRoot: config.sourceRoot,
    tooling: {
      blenderAvailable: blenderPath !== null,
      blenderVersion: detectedBlenderVersion,
      gltfTransformAvailable: false,
      gltfpackAvailable: false,
      notes: toolingNotes,
    },
    components,
    roomKits,
  });

  // `--only` and `--inspect-only` both describe deliberately less than a full
  // run, so neither may delete exports an earlier full run produced.
  if (config.only === null && !config.inspectOnly && blenderPath !== null) {
    const referenced = new Set<string>();
    for (const entry of [...components, ...roomKits]) {
      if (entry.export.runtimeAsset) referenced.add(entry.export.runtimeAsset);
      if (entry.thumbnail) referenced.add(entry.thumbnail);
    }
    for (const roomKit of roomKits) {
      if (roomKit.fallback.runtimeAsset) referenced.add(roomKit.fallback.runtimeAsset);
    }
    await pruneOrphans({ resolve, referenced, log });
  }

  const validation = validateCandidateRegistry(registry);
  if (!validation.ok) {
    throw new Error(
      `Generated candidate registry failed validation:\n${validation.issues.map((issue) => `  ${issue.path}: ${issue.message}`).join("\n")}`,
    );
  }

  await writeJson(resolve(`${SPATIAL_ASSET_PATHS.sourceReports}/${SOURCE_INSPECTION_FILENAME}`), batch);
  await writeText(resolve(`${SPATIAL_ASSET_PATHS.sourceReports}/${SOURCE_INSPECTION_MARKDOWN}`), renderSourceInspectionMarkdown(batch));
  await writeJson(registryPath, { ...registry, sourceHashes });
  await writeText(
    resolve(`${SPATIAL_ASSET_PATHS.candidateManifests}/${REVIEW_MARKDOWN_FILENAME}`),
    renderReviewMarkdown({ registry, reviewDocPath: `${SPATIAL_ASSET_PATHS.candidateManifests}/${REVIEW_MARKDOWN_FILENAME}` }),
  );

  writtenFiles.push(
    `${SPATIAL_ASSET_PATHS.sourceReports}/${SOURCE_INSPECTION_FILENAME}`,
    `${SPATIAL_ASSET_PATHS.sourceReports}/${SOURCE_INSPECTION_MARKDOWN}`,
    `${SPATIAL_ASSET_PATHS.candidateManifests}/${CANDIDATE_REGISTRY_FILENAME}`,
    `${SPATIAL_ASSET_PATHS.candidateManifests}/${REVIEW_MARKDOWN_FILENAME}`,
  );

  return { batch, registry, writtenFiles, skippedSources, log };
}
