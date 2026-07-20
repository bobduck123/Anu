import type {
  StudioV2Chamber,
  StudioV2ChamberLayout,
  StudioV2ChamberMetadata,
  StudioV2PublicChamber,
  StudioV2ChamberRole,
  StudioV2ChamberTransition,
} from "./model.ts";

type StudioV2ChamberWithMetadata = {
  metadata?: StudioV2ChamberMetadata;
};

type StudioV2ChamberWithObjects = StudioV2ChamberWithMetadata & {
  objects: readonly unknown[];
};

const STUDIO_V2_CHAMBER_ROLES: readonly StudioV2ChamberRole[] = [
  "threshold",
  "gallery",
  "practice",
  "about",
  "archive",
  "contact",
  "index",
  "custom",
];

const STUDIO_V2_CHAMBER_LAYOUTS: readonly StudioV2ChamberLayout[] = [
  "stack",
  "focus",
  "grid",
  "sequence",
  "wall",
  "field",
];

const STUDIO_V2_CHAMBER_TRANSITIONS: readonly StudioV2ChamberTransition[] = [
  "none",
  "fade",
  "slide",
  "recede",
  "portal",
  "snap",
];

export function normalizeStudioV2ChamberRole(value: unknown): StudioV2ChamberRole {
  const candidate = typeof value === "string" ? value.toLowerCase().trim() : "";
  return STUDIO_V2_CHAMBER_ROLES.includes(candidate as StudioV2ChamberRole) ? (candidate as StudioV2ChamberRole) : "custom";
}

export function normalizeStudioV2ChamberLayout(value: unknown): StudioV2ChamberLayout {
  const candidate = typeof value === "string" ? value.toLowerCase().trim() : "";
  return STUDIO_V2_CHAMBER_LAYOUTS.includes(candidate as StudioV2ChamberLayout) ? (candidate as StudioV2ChamberLayout) : "stack";
}

export function normalizeStudioV2ChamberTransition(value: unknown): StudioV2ChamberTransition {
  const candidate = typeof value === "string" ? value.toLowerCase().trim() : "";
  return STUDIO_V2_CHAMBER_TRANSITIONS.includes(candidate as StudioV2ChamberTransition)
    ? (candidate as StudioV2ChamberTransition)
    : "none";
}

export function normalizeStudioV2ChamberMetadata(value: unknown): StudioV2ChamberMetadata {
  if (!value || typeof value !== "object") {
    return {};
  }
  const raw = value as Record<string, unknown>;
  const result: StudioV2ChamberMetadata = {};
  if (raw.role !== undefined) result.role = normalizeStudioV2ChamberRole(raw.role);
  if (typeof raw.description === "string") result.description = raw.description.trim();
  if (raw.layout !== undefined) result.layout = normalizeStudioV2ChamberLayout(raw.layout);
  if (raw.transition !== undefined) result.transition = normalizeStudioV2ChamberTransition(raw.transition);
  if (typeof raw.isEntry === "boolean") result.isEntry = raw.isEntry;
  if (typeof raw.isDefault === "boolean") result.isDefault = raw.isDefault;
  return result;
}

export function withNormalizedStudioV2ChamberMetadata<TChamber extends StudioV2ChamberWithMetadata>(
  chamber: TChamber,
): TChamber {
  if (!chamber.metadata) return chamber;
  return {
    ...chamber,
    metadata: normalizeStudioV2ChamberMetadata(chamber.metadata),
  };
}

export function normalizeStudioV2Chambers<TChamber extends StudioV2ChamberWithMetadata>(
  chambers: readonly TChamber[],
): TChamber[] {
  return chambers.map((chamber) => withNormalizedStudioV2ChamberMetadata(chamber));
}

export function getStudioV2EntryChamber<TChamber extends StudioV2ChamberWithMetadata>(
  chambers: readonly TChamber[],
): TChamber | undefined {
  if (chambers.length === 0) return undefined;
  const normalized = normalizeStudioV2Chambers(chambers);
  const explicitEntry = normalized.find((c) => c.metadata?.isEntry === true);
  if (explicitEntry) return explicitEntry;
  const thresholdRole = normalized.find((c) => c.metadata?.role === "threshold");
  if (thresholdRole) return thresholdRole;
  return normalized[0];
}

export function getStudioV2DefaultChamber<TChamber extends StudioV2ChamberWithMetadata>(
  chambers: readonly TChamber[],
): TChamber | undefined {
  if (chambers.length === 0) return undefined;
  const normalized = normalizeStudioV2Chambers(chambers);
  const explicitDefault = normalized.find((c) => c.metadata?.isDefault === true);
  if (explicitDefault) return explicitDefault;
  const entry = getStudioV2EntryChamber(normalized);
  if (entry) return entry;
  return normalized[0];
}

export function getStudioV2ChambersByRole(
  chambers: readonly StudioV2Chamber[],
  role: StudioV2ChamberRole,
): StudioV2Chamber[] {
  const normalized = normalizeStudioV2Chambers(chambers);
  return normalized.filter((c) => c.metadata?.role === role);
}

export function getStudioV2PublicChambers(chambers: readonly StudioV2Chamber[]): StudioV2Chamber[] {
  return normalizeStudioV2Chambers(chambers).filter((chamber) =>
    chamber.objects.some((object) => object.visibility.public)
  );
}

export function getStudioV2PublicChambersByRole(
  chambers: readonly StudioV2PublicChamber[],
  role: StudioV2ChamberRole,
): StudioV2PublicChamber[] {
  const normalized = normalizeStudioV2Chambers(chambers);
  return normalized.filter((c) => c.metadata?.role === role);
}

export function getStudioV2RenderablePublicChambers<TChamber extends StudioV2ChamberWithObjects>(
  chambers: readonly TChamber[],
): TChamber[] {
  return normalizeStudioV2Chambers(chambers).filter((chamber) => chamber.objects.length > 0);
}
