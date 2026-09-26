import { spawn } from "node:child_process";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

import type { SourceBoundingBox, SourceWarning } from "../types/source.ts";
import type { IngestConfig } from "../types/config.ts";

export interface BlenderObjectRecord {
  index: number;
  name: string;
  meshObjectCount: number;
  triangleCount: number;
  materialNames: string[];
  instanceCount: number;
  instanceNames: string[];
  file: string | null;
  fileBytes: number | null;
  thumbnail: string | null;
  bounds: SourceBoundingBox | null;
  looseParts: Array<{
    index: number;
    name: string;
    file: string;
    fileBytes: number | null;
    triangleCount: number;
    bounds: SourceBoundingBox | null;
  }>;
  warnings: SourceWarning[];
}

export interface BlenderRoomKitRecord {
  shapeOnly: { file: string; fileBytes: number | null } | null;
  textured: { file: string; fileBytes: number | null } | null;
  thumbnail: string | null;
  resizedImages: string[];
}

export interface BlenderResult {
  ok: boolean;
  blenderVersion: string;
  error?: string;
  traceback?: string;
  importSeconds?: number;
  sceneBounds?: SourceBoundingBox | null;
  sceneTriangleCount?: number;
  sceneObjectCount?: number;
  sceneMaterialNames?: string[];
  separableObjectCount?: number;
  uniqueObjectCount?: number;
  eligibleObjectCount?: number;
  descendedWrappers?: string[];
  geometryCompression?: "draco" | "none";
  objects: BlenderObjectRecord[];
  roomKit: BlenderRoomKitRecord | null;
  warnings: SourceWarning[];
}

const WINDOWS_BLENDER_GLOBS = [
  "C:/Program Files/Blender Foundation",
  "C:/Program Files (x86)/Blender Foundation",
];

async function exists(candidate: string): Promise<boolean> {
  try {
    await access(candidate, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Finds a usable Blender executable. Absence is a documented, non-fatal
 * outcome: the pipeline still produces manifest-level candidates.
 */
export async function locateBlender(explicitPath: string | null): Promise<string | null> {
  if (explicitPath) return (await exists(explicitPath)) ? explicitPath : null;

  const fromEnvironment = process.env.BLENDER_PATH;
  if (fromEnvironment && (await exists(fromEnvironment))) return fromEnvironment;

  if (process.platform === "win32") {
    const { readdir } = await import("node:fs/promises");
    const found: string[] = [];
    for (const root of WINDOWS_BLENDER_GLOBS) {
      try {
        const entries = await readdir(root, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const candidate = path.join(root, entry.name, "blender.exe");
          if (await exists(candidate)) found.push(candidate);
        }
      } catch {
        // Root not present on this machine.
      }
    }
    // Newest install wins when several are present.
    found.sort();
    if (found.length > 0) return found[found.length - 1];
  }

  for (const candidate of ["/usr/bin/blender", "/usr/local/bin/blender", "/Applications/Blender.app/Contents/MacOS/Blender"]) {
    if (await exists(candidate)) return candidate;
  }
  return null;
}

export async function blenderVersion(blenderPath: string): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn(blenderPath, ["--version"], { windowsHide: true });
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString("utf8"); });
    child.on("error", () => resolve(null));
    child.on("close", () => {
      const match = /Blender\s+([0-9][^\s]*)/.exec(output);
      resolve(match ? match[1] : null);
    });
  });
}

/**
 * Resolved from the repo root rather than the module URL so the same code path
 * works under the CommonJS transpile `tsx` uses here and under plain ESM.
 */
export const BLENDER_SCRIPT_RELATIVE_PATH = "lib/presence/spatial/assets/ingest/blender/extract_candidates.py";

export function blenderScriptPath(repoRoot: string): string {
  return path.join(repoRoot, ...BLENDER_SCRIPT_RELATIVE_PATH.split("/"));
}

export interface BlenderJob {
  sourcePath: string;
  stagingDir: string;
  exportRoomKit: boolean;
  exportTexturedRoomKit: boolean;
  options: {
    maxObjects: number;
    minTriangles: number;
    thumbnails: boolean;
    thumbnailSize: number;
    thumbnailEngine: string;
    thumbnailSamples: number;
    maxTextureSize: number;
    imageQuality: number;
    draco: boolean;
    looseParts: boolean;
    loosePartMaxTriangles: number;
    loosePartMaxParts: number;
  };
}

export function buildBlenderJob(input: {
  sourcePath: string;
  stagingDir: string;
  exportRoomKit: boolean;
  exportTexturedRoomKit: boolean;
  config: IngestConfig;
}): BlenderJob {
  return {
    sourcePath: input.sourcePath.split(path.sep).join("/"),
    stagingDir: input.stagingDir.split(path.sep).join("/"),
    exportRoomKit: input.exportRoomKit,
    exportTexturedRoomKit: input.exportTexturedRoomKit,
    options: {
      maxObjects: input.config.maxObjectExportsPerSource,
      minTriangles: input.config.minTriangleCountForExport,
      thumbnails: input.config.renderThumbnails,
      thumbnailSize: input.config.thumbnailSize,
      thumbnailEngine: "BLENDER_WORKBENCH",
      thumbnailSamples: 16,
      maxTextureSize: input.config.maxTextureSize,
      imageQuality: 75,
      draco: true,
      looseParts: input.config.enableLoosePartSplit,
      loosePartMaxTriangles: input.config.loosePartMaxTriangles,
      loosePartMaxParts: input.config.loosePartMaxParts,
    },
  };
}

export interface BlenderRunOutcome {
  result: BlenderResult | null;
  warnings: SourceWarning[];
  durationMs: number;
  stderrTail: string;
}

/**
 * Runs one Blender extraction job. Blender is given its own process per source
 * so a crash, hang or out-of-memory on one heavy file cannot take down the run.
 */
export async function runBlenderJob(input: {
  blenderPath: string;
  scriptPath: string;
  job: BlenderJob;
  timeoutMs: number;
}): Promise<BlenderRunOutcome> {
  const warnings: SourceWarning[] = [];
  const startedAt = Date.now();
  await mkdir(input.job.stagingDir, { recursive: true });
  const jobPath = path.join(input.job.stagingDir, "job.json");
  await writeFile(jobPath, JSON.stringify(input.job, null, 2), "utf8");

  const stderrChunks: string[] = [];
  const timedOut = await new Promise<boolean>((resolve) => {
    const child = spawn(
      input.blenderPath,
      ["--background", "--factory-startup", "--python", input.scriptPath, "--", "--job", jobPath],
      { windowsHide: true },
    );
    const timer = setTimeout(() => {
      child.kill();
      resolve(true);
    }, input.timeoutMs);
    child.stdout.on("data", () => { /* Blender is verbose; the result file is the contract. */ });
    child.stderr.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk.toString("utf8"));
      if (stderrChunks.length > 40) stderrChunks.shift();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      stderrChunks.push(String(error));
      resolve(false);
    });
    child.on("close", () => {
      clearTimeout(timer);
      resolve(false);
    });
  });

  const durationMs = Date.now() - startedAt;
  const stderrTail = stderrChunks.join("").slice(-2000);

  if (timedOut) {
    warnings.push({
      code: "blender-timeout",
      message: `Blender exceeded the ${Math.round(input.timeoutMs / 1000)}s budget for this source; candidates fall back to manifest-only.`,
    });
  }

  let result: BlenderResult | null = null;
  try {
    const raw = await readFile(path.join(input.job.stagingDir, "blender-result.json"), "utf8");
    result = JSON.parse(raw) as BlenderResult;
  } catch {
    if (!timedOut) {
      warnings.push({ code: "blender-failed", message: "Blender produced no result file; candidates fall back to manifest-only." });
    }
  }

  if (result && !result.ok) {
    warnings.push({ code: "blender-failed", message: result.error ?? "Blender reported a failure." });
  }

  return { result, warnings, durationMs, stderrTail };
}

export async function clearStaging(stagingDir: string): Promise<void> {
  await rm(stagingDir, { recursive: true, force: true });
}
