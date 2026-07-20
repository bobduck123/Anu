import type { StudioV2Object, StudioV2ObjectType, StudioV2State } from "./model.ts";

export type StudioV2AssetStatus =
  | "valid"
  | "missing-url"
  | "broken-unloaded"
  | "duplicate"
  | "possible-test-asset"
  | "external-url"
  | "local-public-asset";

export interface StudioV2DerivedAsset {
  id: string;
  src: string;
  alt: string;
  objectId: string;
  objectTitle: string;
  objectType: StudioV2ObjectType;
  chamberId: string;
  chamberLabel: string;
  publicVisible: boolean;
  mobileVisible: boolean;
  thresholdContext: boolean;
  usageCount: number;
  statuses: StudioV2AssetStatus[];
}

export interface StudioV2MediaHealth {
  total: number;
  missingUrls: number;
  brokenOrUnloaded: number;
  suspectedTestAssets: number;
  duplicateUrls: number;
  externalUrls: number;
  publicVisible: number;
  mobileVisible: number;
}

export interface StudioV2AssetRegistry {
  assets: StudioV2DerivedAsset[];
  health: StudioV2MediaHealth;
}

export interface StudioV2AssetUrlValidation {
  empty: boolean;
  unsupportedProtocol: boolean;
  externalUrl: boolean;
  possibleTestAsset: boolean;
  localPublicAsset: boolean;
}

const TEST_ASSET_PATTERN = /\b(smoke|test|harmless|hosted-smoke|v1b)\b/i;
const DERIVED_ASSET_OBJECT_TYPES = new Set<StudioV2ObjectType>(["image", "media", "moodboard"]);

export function deriveStudioV2AssetRegistry(
  state: StudioV2State,
  options: { brokenObjectIds?: ReadonlySet<string> } = {},
): StudioV2AssetRegistry {
  const objectEntries = state.chambers.flatMap((chamber) =>
    chamber.objects.map((object) => ({ chamber, object })),
  );
  const thresholdObjectId = objectEntries.find(
    ({ object }) => object.visibility.public && Boolean(normalizeAssetUrl(object.image?.src)),
  )?.object.id;
  const urlCounts = new Map<string, number>();

  for (const { object } of objectEntries) {
    const src = normalizeAssetUrl(object.image?.src);
    if (!src) continue;
    urlCounts.set(src, (urlCounts.get(src) ?? 0) + 1);
  }

  const assets = objectEntries
    .filter(({ object }) => hasAssetSignal(object))
    .map(({ chamber, object }) => {
      const src = normalizeAssetUrl(object.image?.src);
      const usageCount = src ? urlCounts.get(src) ?? 1 : 0;
      const validation = validateStudioV2AssetUrl(src);
      const statuses = deriveStatuses({
        src,
        object,
        usageCount,
        validation,
        broken: Boolean(options.brokenObjectIds?.has(object.id)),
      });

      return {
        id: `asset-${object.id}`,
        src,
        alt: object.image?.alt || object.title || "Room image",
        objectId: object.id,
        objectTitle: object.title || "Untitled object",
        objectType: object.type,
        chamberId: chamber.id,
        chamberLabel: chamber.label,
        publicVisible: object.visibility.public,
        mobileVisible: object.visibility.mobile,
        thresholdContext: object.id === thresholdObjectId,
        usageCount,
        statuses,
      } satisfies StudioV2DerivedAsset;
    });

  return {
    assets,
    health: {
      total: assets.length,
      missingUrls: countStatus(assets, "missing-url"),
      brokenOrUnloaded: countStatus(assets, "broken-unloaded"),
      suspectedTestAssets: countStatus(assets, "possible-test-asset"),
      duplicateUrls: countStatus(assets, "duplicate"),
      externalUrls: countStatus(assets, "external-url"),
      publicVisible: assets.filter((asset) => asset.publicVisible).length,
      mobileVisible: assets.filter((asset) => asset.mobileVisible).length,
    },
  };
}

export function studioV2AssetStatusLabel(status: StudioV2AssetStatus): string {
  const labels: Record<StudioV2AssetStatus, string> = {
    "valid": "Valid",
    "missing-url": "Missing URL",
    "broken-unloaded": "Broken/unloaded",
    "duplicate": "Duplicate URL",
    "possible-test-asset": "Possible test asset",
    "external-url": "External URL",
    "local-public-asset": "Local/public asset",
  };
  return labels[status];
}

export function validateStudioV2AssetUrl(value: string): StudioV2AssetUrlValidation {
  const url = normalizeAssetUrl(value);
  const empty = url.length === 0;
  const localPublicAsset = /^\/(?!\/)/.test(url);
  const externalUrl = /^https?:\/\//i.test(url);
  const supported = empty || localPublicAsset || externalUrl;
  return {
    empty,
    unsupportedProtocol: !supported,
    externalUrl,
    possibleTestAsset: TEST_ASSET_PATTERN.test(url),
    localPublicAsset,
  };
}

function hasAssetSignal(object: StudioV2Object): boolean {
  return Boolean(object.image) || DERIVED_ASSET_OBJECT_TYPES.has(object.type);
}

function normalizeAssetUrl(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function deriveStatuses({
  src,
  object,
  usageCount,
  validation,
  broken,
}: {
  src: string;
  object: StudioV2Object;
  usageCount: number;
  validation: StudioV2AssetUrlValidation;
  broken: boolean;
}): StudioV2AssetStatus[] {
  const statuses: StudioV2AssetStatus[] = [];
  if (validation.empty) statuses.push("missing-url");
  if (broken || validation.unsupportedProtocol) statuses.push("broken-unloaded");
  if (usageCount > 1) statuses.push("duplicate");
  if (validation.possibleTestAsset || TEST_ASSET_PATTERN.test(object.title) || TEST_ASSET_PATTERN.test(object.image?.alt ?? "")) {
    statuses.push("possible-test-asset");
  }
  if (validation.externalUrl) statuses.push("external-url");
  if (validation.localPublicAsset) statuses.push("local-public-asset");
  if (
    src &&
    !broken &&
    !validation.unsupportedProtocol &&
    !statuses.includes("possible-test-asset") &&
    !statuses.includes("missing-url")
  ) {
    statuses.unshift("valid");
  }
  return dedupeStatuses(statuses);
}

function countStatus(assets: StudioV2DerivedAsset[], status: StudioV2AssetStatus): number {
  return assets.filter((asset) => asset.statuses.includes(status)).length;
}

function dedupeStatuses(statuses: StudioV2AssetStatus[]): StudioV2AssetStatus[] {
  return [...new Set(statuses)];
}
