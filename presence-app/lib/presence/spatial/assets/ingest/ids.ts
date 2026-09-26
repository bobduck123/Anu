import { createHash } from "node:crypto";

import { ID_PATTERN } from "../../model.ts";

/**
 * Lower-cases and strips a label down to the `ID_PATTERN` alphabet used by the
 * Presence spatial model, so a candidate id can never fail promotion on syntax.
 */
export function slugify(input: string, fallback = "unnamed"): string {
  const slug = input
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return slug.length > 0 ? slug : fallback;
}

export function truncateSlug(slug: string, maxLength: number): string {
  if (slug.length <= maxLength) return slug;
  return slug.slice(0, maxLength).replace(/-+$/g, "");
}

export function sourceAssetId(relativePath: string): string {
  const withoutExtension = relativePath.replace(/\.(glb|gltf)$/i, "");
  return `source.${truncateSlug(slugify(withoutExtension, "source"), 96)}`;
}

export function sequence(index: number): string {
  return String(index).padStart(3, "0");
}

/**
 * Short stable discriminator for a source asset.
 *
 * Candidate ids must be unique across the whole batch but must not move when
 * another file is dropped into the source folder later. Two different folders
 * can both hold `Untitled.glb`, and object names repeat across scenes, so the
 * id carries a hash of the source asset id rather than a batch position.
 */
export function sourceDiscriminator(sourceAssetId: string): string {
  return createHash("sha256").update(sourceAssetId).digest("hex").slice(0, 4);
}

export function componentCandidateId(input: {
  category: string;
  label: string;
  discriminator: string;
  index: number;
}): string {
  const base = truncateSlug(slugify(input.label, input.category), 40);
  return `candidate.${slugify(input.category, "unknown")}.${base}-${input.discriminator}-${sequence(input.index)}`;
}

export function roomKitCandidateId(category: string, discriminator: string): string {
  return `candidate.roomkit.${slugify(category, "unknown-interior")}-${discriminator}`;
}

/** Guards every generated identifier against the shared Presence id contract. */
export function assertPresenceId(id: string): string {
  if (!ID_PATTERN.test(id)) throw new Error(`Generated id "${id}" does not satisfy the Presence spatial id pattern.`);
  return id;
}

/**
 * Authoring-tool default names (`Cube.019`, `Object_2`, `Mesh.1321`, `Empty`).
 *
 * They carry no semantic signal, so they must not drive a category guess and
 * must not be used as a candidate label.
 */
const GENERIC_NAME_PATTERN =
  /^(object|mesh|cube|plane|cylinder|sphere|circle|cone|torus|material|empty|layer|node|group|item|part|untitled|retopo|g-_+)[._\-\s]*\d*(\.\d+)?$/i;

export function isGenericName(name: string): boolean {
  return name.trim().length === 0 || GENERIC_NAME_PATTERN.test(name.trim());
}

export function titleCase(input: string): string {
  return slugify(input, "unnamed")
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
