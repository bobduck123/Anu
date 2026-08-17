import type {
  SpatialActionRef,
  SpatialAssetRef,
  SpatialMediaRef,
  SpatialRenderItem,
  SpatialRenderPlan,
  SpatialSceneState,
  SpatialTransform,
  SpatialVec3,
} from "./model.ts";

export type SpatialRendererFallbackReason =
  | "mobile"
  | "reduced-motion"
  | "webgl-unavailable"
  | "runtime-failure";

export type SpatialRendererLaneSelection =
  | { lane: "three"; reason: null }
  | { lane: "semantic"; reason: SpatialRendererFallbackReason };

export interface SpatialRendererCapabilities {
  mobile: boolean;
  reducedMotion: boolean;
  webglAvailable: boolean;
  runtimeFailed?: boolean;
}

export interface SafeSpatialMediaLocator {
  src: string;
  safety: SpatialMediaRef["safety"];
}

export type SafeSpatialMediaLocatorMap = Readonly<Record<string, SafeSpatialMediaLocator>>;

export interface SpatialContainMapping {
  canvasWidth: number;
  canvasHeight: number;
  drawX: number;
  drawY: number;
  drawWidth: number;
  drawHeight: number;
}

export const SPATIAL_MAX_TEXTURE_DIMENSION = 4_096;
export const SPATIAL_MAX_TEXTURE_PIXELS = 16_777_216;

export interface SpatialActionEntry {
  action: SpatialActionRef;
  ownerPlacementId: string;
  ownerLabel: string;
}

export interface SemanticSpatialRow {
  placementId: string;
  label: string;
  description?: string;
  mediaAlt?: string;
  actions: readonly SpatialActionRef[];
}

export type SpatialActionIntent =
  | { kind: "inspect"; placementId: string; actionId: string }
  | { kind: "navigate-state"; stateId: string; actionId: string }
  | { kind: "sequence"; direction: -1 | 1; actionId: string }
  | { kind: "open-link"; href: string; actionId: string }
  | { kind: "disabled"; reason: string; actionId: string };

export function selectSpatialRendererLane(
  capabilities: SpatialRendererCapabilities,
): SpatialRendererLaneSelection {
  if (capabilities.runtimeFailed) return { lane: "semantic", reason: "runtime-failure" };
  if (capabilities.reducedMotion) return { lane: "semantic", reason: "reduced-motion" };
  if (capabilities.mobile) return { lane: "semantic", reason: "mobile" };
  if (!capabilities.webglAvailable) return { lane: "semantic", reason: "webgl-unavailable" };
  return { lane: "three", reason: null };
}

export function collectSpatialActions(plan: SpatialRenderPlan): SpatialActionEntry[] {
  const actions = new Map<string, SpatialActionEntry>();
  for (const item of plan.items) {
    for (const action of item.actions) {
      if (!actions.has(action.id)) {
        actions.set(action.id, {
          action,
          ownerPlacementId: item.placementId,
          ownerLabel: item.semanticLabel,
        });
      }
    }
  }
  return [...actions.values()];
}

export function buildSemanticSpatialRows(plan: SpatialRenderPlan): SemanticSpatialRow[] {
  const itemByPlacementId = new Map(plan.items.map((item) => [item.placementId, item]));
  const actionEntries = collectSpatialActions(plan);
  const actionById = new Map(actionEntries.map((entry) => [entry.action.id, entry.action]));
  const rows = new Map<string, SemanticSpatialRow>();

  for (const fallback of plan.semanticFallback) {
    const item = itemByPlacementId.get(fallback.placementId);
    rows.set(fallback.placementId, {
      placementId: fallback.placementId,
      label: fallback.label,
      description: fallback.description,
      mediaAlt: item?.media?.alt,
      actions: fallback.actionRefs
        .map((actionId) => actionById.get(actionId))
        .filter((action): action is SpatialActionRef => action !== undefined),
    });
  }

  for (const item of plan.items) {
    if (item.category !== "piece" || rows.has(item.placementId)) continue;
    rows.set(item.placementId, semanticRowForItem(item));
  }

  for (const state of plan.states) {
    if (!state.focusPlacementId || rows.has(state.focusPlacementId)) continue;
    const focusedItem = itemByPlacementId.get(state.focusPlacementId);
    if (focusedItem) rows.set(state.focusPlacementId, semanticRowForItem(focusedItem));
  }

  const representedActionIds = new Set(
    [...rows.values()].flatMap((row) => row.actions.map((action) => action.id)),
  );
  for (const entry of actionEntries) {
    if (representedActionIds.has(entry.action.id)) continue;
    const existing = rows.get(entry.ownerPlacementId);
    if (existing) {
      rows.set(entry.ownerPlacementId, {
        ...existing,
        actions: [...existing.actions, entry.action],
      });
    } else {
      const owner = itemByPlacementId.get(entry.ownerPlacementId);
      rows.set(
        entry.ownerPlacementId,
        owner
          ? semanticRowForItem(owner)
          : {
              placementId: entry.ownerPlacementId,
              label: entry.ownerLabel,
              actions: [entry.action],
            },
      );
    }
    representedActionIds.add(entry.action.id);
  }

  return [...rows.values()];
}

function semanticRowForItem(item: SpatialRenderItem): SemanticSpatialRow {
  return {
    placementId: item.placementId,
    label: item.semanticLabel,
    mediaAlt: item.media?.alt,
    actions: item.actions,
  };
}

export function resolveSpatialActionIntent(
  action: SpatialActionRef,
  ownerPlacementId: string,
): SpatialActionIntent {
  switch (action.kind) {
    case "inspect":
      return {
        kind: "inspect",
        placementId: action.targetPlacementId ?? ownerPlacementId,
        actionId: action.id,
      };
    case "navigate-state":
      if (action.targetStateId) {
        return { kind: "navigate-state", stateId: action.targetStateId, actionId: action.id };
      }
      return { kind: "disabled", reason: "This room state is unavailable.", actionId: action.id };
    case "sequence-previous":
      return { kind: "sequence", direction: -1, actionId: action.id };
    case "sequence-next":
      return { kind: "sequence", direction: 1, actionId: action.id };
    case "open-link":
      return { kind: "open-link", href: action.href, actionId: action.id };
    case "disabled-placeholder":
      return {
        kind: "disabled",
        reason: action.disabledReason ?? "This action is not available in the internal proof.",
        actionId: action.id,
      };
  }
}

export function projectionSequencePlacementIds(
  plan: SpatialRenderPlan,
  activeStateId?: string,
): string[] {
  const items = activeStateId
    ? spatialItemsForState(plan, resolveSpatialSceneState(plan, activeStateId))
    : plan.items.filter((item) => item.visible);
  return items
    .filter(
      (item) =>
        item.category === "piece" &&
        item.materials.some((material) => material.slot === "projection"),
    )
    .map((item) => item.placementId);
}

export function cycleProjectionPlacement(
  plan: SpatialRenderPlan,
  currentPlacementId: string | undefined,
  direction: -1 | 1,
  activeStateId?: string,
): string | undefined {
  const placementIds = projectionSequencePlacementIds(plan, activeStateId);
  if (placementIds.length === 0) return undefined;
  const currentIndex = currentPlacementId ? placementIds.indexOf(currentPlacementId) : -1;
  if (currentIndex < 0) return direction === 1 ? placementIds[0] : placementIds.at(-1);
  return placementIds[(currentIndex + direction + placementIds.length) % placementIds.length];
}

export function deriveSafeSpatialMediaLocators(
  assets: readonly SpatialAssetRef[],
): SafeSpatialMediaLocatorMap {
  const locators: Record<string, SafeSpatialMediaLocator> = {};
  for (const asset of assets) {
    if (
      asset.safety !== "public-safe" ||
      asset.kind === "shape" ||
      !asset.locator.startsWith("public:")
    ) {
      continue;
    }
    const logicalPath = asset.locator.slice("public:".length);
    const segments = logicalPath.split("/");
    if (
      logicalPath.length === 0 ||
      logicalPath.includes("\\") ||
      segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")
    ) {
      continue;
    }
    locators[asset.id] = { src: `/${logicalPath}`, safety: asset.safety };
  }
  return Object.freeze(locators);
}

export function spatialMediaLocatorSignature(locators: SafeSpatialMediaLocatorMap): string {
  return Object.entries(locators)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([assetId, locator]) => `${assetId}\u0000${locator.safety}\u0000${locator.src}`)
    .join("\u0001");
}

export function resolveSpatialMediaSource(
  media: SpatialMediaRef | undefined,
  locators: SafeSpatialMediaLocatorMap,
): string | null {
  if (!media) return null;
  const locator = locators[media.assetId];
  if (!locator || locator.safety !== media.safety || !isSafeSpatialMediaSource(locator.src)) return null;
  return locator.src;
}

export function isSafeSpatialMediaSource(source: string): boolean {
  if (!source.startsWith("/") || source.startsWith("//") || source.includes("\\")) return false;
  const [pathname] = source.split(/[?#]/, 1);
  return pathname.split("/").every((segment) => segment !== "." && segment !== "..");
}

export function spatialMediaPlacementIdsToLoad(
  plan: SpatialRenderPlan,
  state: SpatialSceneState,
  selectedPlacementId?: string,
): Set<string> {
  const eagerAssetIds = new Set(plan.eagerAssetIds);
  const explicitlyVisibleIds = state.visiblePlacementIds
    ? new Set(state.visiblePlacementIds)
    : undefined;
  return new Set(
    plan.items
      .filter((item) => {
        if (!item.visible || !item.media) return false;
        if (eagerAssetIds.has(item.media.assetId)) return true;
        if (item.placementId === selectedPlacementId) return true;
        if (item.placementId === state.focusPlacementId) return true;
        return explicitlyVisibleIds?.has(item.placementId) ?? false;
      })
      .map((item) => item.placementId),
  );
}

export function isSpatialTextureDimensionSafe(width: number, height: number): boolean {
  return Number.isSafeInteger(width) &&
    Number.isSafeInteger(height) &&
    width > 0 &&
    height > 0 &&
    width <= SPATIAL_MAX_TEXTURE_DIMENSION &&
    height <= SPATIAL_MAX_TEXTURE_DIMENSION &&
    width * height <= SPATIAL_MAX_TEXTURE_PIXELS;
}

export function spatialContainMapping(
  mediaWidth: number,
  mediaHeight: number,
  surfaceWidth: number,
  surfaceHeight: number,
  maximumCanvasDimension = 2_048,
): SpatialContainMapping | null {
  const values = [mediaWidth, mediaHeight, surfaceWidth, surfaceHeight, maximumCanvasDimension];
  if (values.some((value) => !Number.isFinite(value) || value <= 0)) return null;
  const surfaceAspect = surfaceWidth / surfaceHeight;
  const canvasWidth = surfaceAspect >= 1
    ? Math.max(1, Math.round(maximumCanvasDimension))
    : Math.max(1, Math.round(maximumCanvasDimension * surfaceAspect));
  const canvasHeight = surfaceAspect >= 1
    ? Math.max(1, Math.round(maximumCanvasDimension / surfaceAspect))
    : Math.max(1, Math.round(maximumCanvasDimension));
  const scale = Math.min(canvasWidth / mediaWidth, canvasHeight / mediaHeight);
  const drawWidth = mediaWidth * scale;
  const drawHeight = mediaHeight * scale;
  return {
    canvasWidth,
    canvasHeight,
    drawX: (canvasWidth - drawWidth) / 2,
    drawY: (canvasHeight - drawHeight) / 2,
    drawWidth,
    drawHeight,
  };
}

export function resolveSpatialSceneState(
  plan: SpatialRenderPlan,
  requestedStateId?: string,
  reducedMotion = false,
): SpatialSceneState {
  const requested =
    plan.states.find((state) => state.id === requestedStateId) ??
    plan.states.find((state) => state.id === plan.entryStateId) ??
    plan.states[0];
  if (!requested) throw new Error(`Spatial render plan ${plan.roomId} has no scene states.`);
  if (!reducedMotion || !requested.reducedMotionStateId) return requested;
  return plan.states.find((state) => state.id === requested.reducedMotionStateId) ?? requested;
}

export function spatialItemsForState(
  plan: SpatialRenderPlan,
  state: SpatialSceneState,
): SpatialRenderItem[] {
  const visiblePlacementIds = state.visiblePlacementIds
    ? new Set(state.visiblePlacementIds)
    : undefined;
  return plan.items.filter(
    (item) => item.visible && (!visiblePlacementIds || visiblePlacementIds.has(item.placementId)),
  );
}

export function spatialInspectionPosition(
  item: SpatialRenderItem,
  cameraPosition: SpatialVec3,
  distance = 0.9,
): SpatialVec3 {
  return spatialInspectionTransform(item, cameraPosition, distance).position;
}

export function spatialInspectionTransform(
  item: SpatialRenderItem,
  cameraPosition: SpatialVec3,
  fallbackDistance = 0.9,
): SpatialTransform {
  if (item.category !== "piece") return item.transform;
  const [x, y, z] = item.transform.position;
  const deltaX = cameraPosition[0] - x;
  const deltaY = cameraPosition[1] - y;
  const deltaZ = cameraPosition[2] - z;
  const length = Math.hypot(deltaX, deltaY, deltaZ) || 1;
  const distance = item.interaction?.translation.distance ?? fallbackDistance;
  const position: SpatialVec3 = [
    x + (deltaX / length) * distance,
    y + (deltaY / length) * distance,
    z + (deltaZ / length) * distance,
  ];
  const rotation = item.interaction?.rotation.mode === "face-camera-y"
    ? [0, Math.atan2(deltaX, deltaZ) + item.interaction.rotation.yawOffset, 0] as SpatialVec3
    : item.transform.rotation;
  return { ...item.transform, position, rotation };
}
