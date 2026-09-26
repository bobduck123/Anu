import { readdir } from "node:fs/promises";
import path from "node:path";

import type { CandidateLicense } from "../types/candidates.ts";
import type { SourceLicenseMetadata } from "../types/source.ts";
import type { GltfJson } from "./gltf.ts";

const SIDECAR_PATTERN = /^(licen[cs]e|copyright|readme|attribution|credits|terms)([._-].*)?(\.(txt|md|json|html))?$/i;

/** Filename tokens that hint at provenance. They are recorded, never trusted. */
const FILENAME_HINTS: ReadonlyArray<{ token: RegExp; hint: string }> = [
  { token: /\bfree\b/i, hint: "filename contains 'free'" },
  { token: /\bcc0\b/i, hint: "filename contains 'cc0'" },
  { token: /\bcc[-_ ]?by\b/i, hint: "filename contains 'cc-by'" },
  { token: /\bpublic[-_ ]?domain\b/i, hint: "filename contains 'public-domain'" },
  { token: /\bdemo\b/i, hint: "filename contains 'demo'" },
  { token: /\bsample\b/i, hint: "filename contains 'sample'" },
  { token: /\bstar[-_ ]?wars\b/i, hint: "filename references a third-party franchise" },
  { token: /\bprefab\b/i, hint: "filename contains 'prefab'" },
];

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readExtrasField(extras: unknown, keys: readonly string[]): string | null {
  if (typeof extras !== "object" || extras === null) return null;
  const record = extras as Record<string, unknown>;
  for (const key of keys) {
    const direct = readString(record[key]);
    if (direct) return direct;
    const lower = Object.keys(record).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
    if (lower) {
      const found = readString(record[lower]);
      if (found) return found;
    }
  }
  return null;
}

function readXmp(json: GltfJson): { author: string | null; license: string | null; title: string | null } {
  const xmp = (json.extensions?.KHR_xmp_json_ld ?? json.extensions?.KHR_xmp) as
    | { packets?: Array<Record<string, unknown>> }
    | undefined;
  const packet = xmp?.packets?.[0];
  if (!packet) return { author: null, license: null, title: null };
  return {
    author: readExtrasField(packet, ["dc:creator", "creator", "author"]),
    license: readExtrasField(packet, ["dc:rights", "xmpRights:WebStatement", "model3d:license", "license"]),
    title: readExtrasField(packet, ["dc:title", "title"]),
  };
}

async function findSidecarFiles(sourceFilePath: string): Promise<string[]> {
  const directory = path.dirname(sourceFilePath);
  const found: string[] = [];
  for (const candidateDir of [directory, path.dirname(directory)]) {
    try {
      const entries = await readdir(candidateDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        if (SIDECAR_PATTERN.test(entry.name)) found.push(path.join(candidateDir, entry.name));
      }
    } catch {
      // An unreadable sibling directory simply yields no sidecar evidence.
    }
  }
  return [...new Set(found)];
}

/**
 * Collects every provenance signal available without opening a browser or a
 * licence portal. The resulting status is always `needs-review`: this pipeline
 * has no authority to clear a licence.
 */
export async function extractLicenseMetadata(
  json: GltfJson,
  sourceFilePath: string,
): Promise<SourceLicenseMetadata> {
  const asset = json.asset ?? {};
  const xmp = readXmp(json);
  const evidence: string[] = [];

  const declaredCopyright = readString(asset.copyright);
  if (declaredCopyright) evidence.push("asset.copyright present in the glTF header");

  const declaredGenerator = readString(asset.generator);
  if (declaredGenerator) evidence.push("asset.generator present in the glTF header");

  const declaredAuthor =
    xmp.author ?? readExtrasField(asset.extras, ["author", "artist", "creator"]) ?? readExtrasField(json.extras, ["author", "artist", "creator"]);
  if (declaredAuthor) evidence.push("author/creator recorded in embedded metadata");

  const declaredTitle = xmp.title ?? readExtrasField(asset.extras, ["title", "name"]);
  if (declaredTitle) evidence.push("title recorded in embedded metadata");

  const declaredLicense =
    xmp.license ?? readExtrasField(asset.extras, ["license", "licence", "rights"]) ?? readExtrasField(json.extras, ["license", "licence", "rights"]);
  if (declaredLicense) evidence.push("licence string recorded in embedded metadata");

  const sidecarFiles = await findSidecarFiles(sourceFilePath);
  if (sidecarFiles.length > 0) evidence.push(`sidecar provenance files found: ${sidecarFiles.map((file) => path.basename(file)).join(", ")}`);

  const basename = path.basename(sourceFilePath);
  const filenameHints = FILENAME_HINTS.filter((entry) => entry.token.test(basename)).map((entry) => entry.hint);
  evidence.push(...filenameHints);

  if (evidence.length === 0) evidence.push("no embedded, sidecar or filename provenance signal was found");

  const source: SourceLicenseMetadata["source"] = declaredCopyright || declaredLicense || declaredAuthor
    ? "embedded"
    : sidecarFiles.length > 0
      ? "sidecar"
      : filenameHints.length > 0
        ? "filename"
        : "unknown";

  return {
    status: "needs-review",
    source,
    declaredCopyright,
    declaredGenerator,
    declaredAuthor,
    declaredTitle,
    declaredLicense,
    sidecarFiles,
    filenameHints,
    evidence,
  };
}

export function toCandidateLicense(metadata: SourceLicenseMetadata): CandidateLicense {
  return {
    status: "needs-review",
    source: metadata.source,
    declaredCopyright: metadata.declaredCopyright,
    declaredAuthor: metadata.declaredAuthor,
    declaredLicense: metadata.declaredLicense,
    evidence: metadata.evidence,
  };
}
