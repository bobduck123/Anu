import type { BudgetTier } from "./candidates.ts";

/** Payload budgets in kilobytes. Over-budget candidates are flagged, never silently dropped. */
export const SPATIAL_ASSET_BUDGETS_KB: Readonly<Record<BudgetTier, number>> = {
  simple: 1024,
  common: 2048,
  hero: 5120,
  "roomkit-eager": 3072,
  "layout-json": 100,
};

export interface IngestConfig {
  /** Absolute folder scanned for `.glb`/`.gltf`. Read-only for the whole run. */
  sourceRoot: string;
  /** Absolute repo root used to resolve every output folder. */
  repoRoot: string;
  /** Batch label recorded in every artefact. */
  sourceBatch: string;
  /** ISO timestamp stamped on every artefact; injectable so runs are reproducible in tests. */
  generatedAt: string;
  /** Skip Blender entirely and produce manifest-level candidates only. */
  inspectOnly: boolean;
  /** Absolute path to a Blender executable, or null to auto-detect. */
  blenderPath: string | null;
  /** Per-source-file Blender budget in milliseconds. */
  blenderTimeoutMs: number;
  /** Maximum candidate objects exported per source file; the rest stay manifest-only. */
  maxObjectExportsPerSource: number;
  /** Minimum triangles for a node to be worth exporting as its own candidate. */
  minTriangleCountForExport: number;
  /** Loose-part splitting is opt-in and additionally guarded by `loosePartMaxTriangles`. */
  enableLoosePartSplit: boolean;
  loosePartMaxTriangles: number;
  loosePartMaxParts: number;
  /** Longest texture edge, in pixels, for any textured export. */
  maxTextureSize: number;
  /** Source files larger than this are never given a textured room-kit export. */
  maxTexturedSourceBytes: number;
  /** Render thumbnails (adds Blender render time per candidate). */
  renderThumbnails: boolean;
  thumbnailSize: number;
  /** Only re-run Blender for source files whose content hash changed. */
  incremental: boolean;
  /** Restrict the run to source paths containing this substring. */
  only: string | null;
}

export const DEFAULT_INGEST_CONFIG: Omit<IngestConfig, "sourceRoot" | "repoRoot" | "generatedAt"> = {
  sourceBatch: "initial-presence-ingestion",
  inspectOnly: false,
  blenderPath: null,
  blenderTimeoutMs: 900_000,
  maxObjectExportsPerSource: 24,
  minTriangleCountForExport: 24,
  enableLoosePartSplit: false,
  loosePartMaxTriangles: 60_000,
  loosePartMaxParts: 12,
  maxTextureSize: 1024,
  maxTexturedSourceBytes: 80 * 1024 * 1024,
  renderThumbnails: true,
  thumbnailSize: 512,
  incremental: true,
  only: null,
};

/** Output folders, relative to the repo root. Deliberately outside `public/`. */
export const SPATIAL_ASSET_PATHS = {
  sourceRawStaging: "assets/presence-spatial/source/raw",
  sourceReports: "assets/presence-spatial/source/reports",
  candidateComponents: "assets/presence-spatial/candidates/components",
  candidateRoomKits: "assets/presence-spatial/candidates/roomkits",
  candidateThumbnails: "assets/presence-spatial/candidates/thumbnails",
  candidateManifests: "assets/presence-spatial/candidates/manifests",
} as const;

export const CANDIDATE_REGISTRY_FILENAME = "candidate-registry.json";
export const SOURCE_INSPECTION_FILENAME = "source-inspection.json";
export const SOURCE_INSPECTION_MARKDOWN = "SOURCE_INSPECTION.md";
export const REVIEW_MARKDOWN_FILENAME = "CANDIDATE_REVIEW.md";
