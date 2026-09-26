import type {
  CandidateComponent,
  CandidateRegistry,
  CandidateRoomKit,
} from "../types/candidates.ts";
import { PIPELINE_CANDIDATE_STATUS } from "../types/candidates.ts";
import type { SpatialAssetSchemaVersion } from "../types/source.ts";
import { SPATIAL_ASSET_SCHEMA_VERSION } from "../types/source.ts";
import { ID_PATTERN } from "../../model.ts";

export interface RegistryIssue {
  path: string;
  code: string;
  message: string;
}

export type RegistryValidation =
  | { ok: true; issues: readonly [] }
  | { ok: false; issues: readonly RegistryIssue[] };

const REQUIRED_COMPONENT_KEYS = [
  "componentId", "version", "sourceAssetId", "name", "category", "status", "export",
  "dimensions", "placement", "materialSlots", "presenceMaterialSlots", "anchors",
  "budget", "license", "quality", "reviewActions",
] as const;

const REQUIRED_ROOMKIT_KEYS = [
  "roomKitId", "version", "sourceAssetId", "name", "category", "status", "export",
  "fallback", "dimensions", "extractedComponents", "budget", "license", "quality", "reviewActions",
] as const;

function hasKey(record: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

/**
 * Structural validation of a candidate registry.
 *
 * This is intentionally stricter about safety invariants than about shape: the
 * checks that must never regress are that nothing claims to be licence-cleared,
 * nothing claims to be visually approved, and nothing over budget claims to be
 * runtime-eligible.
 */
export function validateCandidateRegistry(value: unknown): RegistryValidation {
  const issues: RegistryIssue[] = [];
  const registry = value as Partial<CandidateRegistry> | null;

  if (typeof registry !== "object" || registry === null) {
    return { ok: false, issues: [{ path: "$", code: "not-an-object", message: "Registry must be an object." }] };
  }
  if (registry.schemaVersion !== SPATIAL_ASSET_SCHEMA_VERSION) {
    issues.push({ path: "$.schemaVersion", code: "unsupported-schema", message: `Expected ${SPATIAL_ASSET_SCHEMA_VERSION}.` });
  }
  if (registry.admission !== "candidates-only") {
    issues.push({ path: "$.admission", code: "unsupported-admission", message: "Generated registries are always candidates-only." });
  }
  if (typeof registry.generatedAt !== "string" || Number.isNaN(Date.parse(registry.generatedAt))) {
    issues.push({ path: "$.generatedAt", code: "invalid-timestamp", message: "generatedAt must be an ISO timestamp." });
  }
  if (!Array.isArray(registry.components)) {
    issues.push({ path: "$.components", code: "missing-array", message: "components must be an array." });
  }
  if (!Array.isArray(registry.roomKits)) {
    issues.push({ path: "$.roomKits", code: "missing-array", message: "roomKits must be an array." });
  }
  if (issues.length > 0 && (!Array.isArray(registry.components) || !Array.isArray(registry.roomKits))) {
    return { ok: false, issues };
  }

  const componentIds = new Set<string>();
  for (const [index, component] of (registry.components ?? []).entries()) {
    const at = `$.components[${index}]`;
    for (const key of REQUIRED_COMPONENT_KEYS) {
      if (!hasKey(component as object, key)) {
        issues.push({ path: `${at}.${key}`, code: "missing-field", message: `Required field ${key} is missing.` });
      }
    }
    validateSharedInvariants(component as CandidateComponent, at, issues);
    if (!ID_PATTERN.test(component.componentId ?? "")) {
      issues.push({ path: `${at}.componentId`, code: "invalid-id", message: `"${component.componentId}" does not match the Presence id pattern.` });
    }
    if (componentIds.has(component.componentId)) {
      issues.push({ path: `${at}.componentId`, code: "duplicate-id", message: `Duplicate component id ${component.componentId}.` });
    }
    componentIds.add(component.componentId);
    if (!Array.isArray(component.anchors) || component.anchors.length === 0) {
      issues.push({ path: `${at}.anchors`, code: "missing-anchors", message: "Every candidate needs at least one anchor." });
    }
    if (!Array.isArray(component.materialSlots) || component.materialSlots.length === 0) {
      issues.push({ path: `${at}.materialSlots`, code: "missing-material-slots", message: "Every candidate must expose material slots." });
    }
  }

  const roomKitIds = new Set<string>();
  for (const [index, roomKit] of (registry.roomKits ?? []).entries()) {
    const at = `$.roomKits[${index}]`;
    for (const key of REQUIRED_ROOMKIT_KEYS) {
      if (!hasKey(roomKit as object, key)) {
        issues.push({ path: `${at}.${key}`, code: "missing-field", message: `Required field ${key} is missing.` });
      }
    }
    validateSharedInvariants(roomKit as CandidateRoomKit, at, issues);
    if (!ID_PATTERN.test(roomKit.roomKitId ?? "")) {
      issues.push({ path: `${at}.roomKitId`, code: "invalid-id", message: `"${roomKit.roomKitId}" does not match the Presence id pattern.` });
    }
    if (roomKitIds.has(roomKit.roomKitId)) {
      issues.push({ path: `${at}.roomKitId`, code: "duplicate-id", message: `Duplicate room-kit id ${roomKit.roomKitId}.` });
    }
    roomKitIds.add(roomKit.roomKitId);
    for (const componentId of roomKit.extractedComponents ?? []) {
      if (!componentIds.has(componentId)) {
        issues.push({ path: `${at}.extractedComponents`, code: "dangling-component-ref", message: `Room kit references unknown component ${componentId}.` });
      }
    }
  }

  return issues.length === 0 ? { ok: true, issues: [] } : { ok: false, issues };
}

function validateSharedInvariants(
  entry: CandidateComponent | CandidateRoomKit,
  at: string,
  issues: RegistryIssue[],
): void {
  if (entry.status !== PIPELINE_CANDIDATE_STATUS) {
    issues.push({
      path: `${at}.status`,
      code: "unexpected-status",
      message: `Generated candidates must be "${PIPELINE_CANDIDATE_STATUS}"; found "${entry.status}".`,
    });
  }
  if (entry.license?.status !== "needs-review") {
    issues.push({
      path: `${at}.license.status`,
      code: "license-assumed",
      message: "Licence status must remain needs-review; the pipeline may never clear a licence.",
    });
  }
  if (entry.quality?.status !== "not-reviewed" || entry.quality?.visuallyApproved !== false) {
    issues.push({
      path: `${at}.quality`,
      code: "quality-assumed",
      message: "Quality must remain not-reviewed and never visually approved by the pipeline.",
    });
  }
  if (entry.budget?.status === "over-budget" && entry.budget?.runtimeEligible) {
    issues.push({
      path: `${at}.budget.runtimeEligible`,
      code: "over-budget-admitted",
      message: "An over-budget candidate must never be marked runtime-eligible.",
    });
  }
  if (entry.budget?.status === "not-exported" && entry.budget?.runtimeEligible) {
    issues.push({
      path: `${at}.budget.runtimeEligible`,
      code: "unexported-admitted",
      message: "A candidate with no exported asset must never be marked runtime-eligible.",
    });
  }
  if (entry.export?.runtimeAsset && entry.export.runtimeAsset.startsWith("public/")) {
    issues.push({
      path: `${at}.export.runtimeAsset`,
      code: "public-path",
      message: "Candidate assets must not be written under public/; they are not publish-approved.",
    });
  }
}

export function createCandidateRegistry(input: {
  generatedAt: string;
  sourceBatch: string;
  sourceRoot: string;
  tooling: CandidateRegistry["tooling"];
  components: readonly CandidateComponent[];
  roomKits: readonly CandidateRoomKit[];
}): CandidateRegistry {
  return {
    schemaVersion: SPATIAL_ASSET_SCHEMA_VERSION satisfies SpatialAssetSchemaVersion,
    generatedAt: input.generatedAt,
    sourceBatch: input.sourceBatch,
    sourceRoot: input.sourceRoot,
    admission: "candidates-only",
    tooling: input.tooling,
    components: [...input.components].sort((a, b) => a.componentId.localeCompare(b.componentId)),
    roomKits: [...input.roomKits].sort((a, b) => a.roomKitId.localeCompare(b.roomKitId)),
  };
}

export function registrySummary(registry: CandidateRegistry): {
  componentCount: number;
  roomKitCount: number;
  exportedComponents: number;
  manifestOnlyComponents: number;
  withinBudget: number;
  overBudget: number;
  notExported: number;
  thumbnails: number;
} {
  const all = [...registry.components, ...registry.roomKits];
  return {
    componentCount: registry.components.length,
    roomKitCount: registry.roomKits.length,
    exportedComponents: registry.components.filter((component) => component.export.runtimeAsset !== null).length,
    manifestOnlyComponents: registry.components.filter((component) => component.export.kind === "manifest-only").length,
    withinBudget: all.filter((entry) => entry.budget.status === "within-budget").length,
    overBudget: all.filter((entry) => entry.budget.status === "over-budget").length,
    notExported: all.filter((entry) => entry.budget.status === "not-exported").length,
    thumbnails: all.filter((entry) => entry.thumbnail !== null).length,
  };
}
