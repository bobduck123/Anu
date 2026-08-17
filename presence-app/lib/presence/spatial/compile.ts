import { resolveSpatialMaterials } from "./materials.ts";
import type {
  SpatialRenderItem,
  SpatialRenderPlan,
  SpatialRoomDefinition,
  SpatialValidationIssue,
} from "./model.ts";
import { spatialComponentKey } from "./model.ts";
import { resolveSpatialPlacementTransform } from "./placement.ts";
import { requireSpatialComponent } from "./registry.ts";
import {
  SPATIAL_EAGER_ASSET_BUDGET_BYTES,
  SPATIAL_TOTAL_ASSET_BUDGET_BYTES,
  utf8Bytes,
  validateSpatialRoomDefinition,
} from "./validate.ts";

export type SpatialCompileResult =
  | { ok: true; room: SpatialRoomDefinition; plan: SpatialRenderPlan }
  | { ok: false; issues: readonly SpatialValidationIssue[] };

export function compileSpatialRoom(value: unknown): SpatialCompileResult {
  const validated = validateSpatialRoomDefinition(value);
  if (!validated.ok) return validated;
  const room = validated.value;
  const skins = new Map(room.skins.map((skin) => [skin.id, skin]));
  const media = new Map(room.media.map((item) => [item.id, item]));
  const actions = new Map(room.actions.map((item) => [item.id, item]));
  const items: SpatialRenderItem[] = room.placements
    .slice()
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))
    .map((placement) => {
      const definition = requireSpatialComponent(placement);
      const primaryMaterialSlot = definition.materialSlots.find(
        (slot) => placement.materialSlotOverrides[slot] !== undefined,
      ) ?? definition.materialSlots[0];
      if (!primaryMaterialSlot) {
        throw new Error(`Spatial component ${spatialComponentKey(placement)} has no material slots.`);
      }
      return {
        placementId: placement.id,
        componentId: placement.componentId,
        version: placement.version,
        componentKey: spatialComponentKey(placement),
        category: definition.category,
        geometry: definition.geometry,
        dimensions: definition.dimensions,
        transform: resolveSpatialPlacementTransform(room, placement),
        materials: resolveSpatialMaterials({
          slots: definition.materialSlots,
          skin: placement.skinRef ? skins.get(placement.skinRef) : undefined,
          overrides: placement.materialSlotOverrides,
        }),
        primaryMaterialSlot,
        media: placement.mediaRef ? media.get(placement.mediaRef) : undefined,
        actions: placement.actionRefs.map((actionId) => actions.get(actionId)).filter((item) => item !== undefined),
        visible: placement.visible,
        semanticLabel: placement.semanticLabel,
      };
    });

  const componentKeys = [...new Set(items.map((item) => item.componentKey))].sort();
  const uniqueDefinitions = componentKeys.map((key) => {
    const item = items.find((candidate) => candidate.componentKey === key)!;
    return requireSpatialComponent(item);
  });
  const eagerAssetIds = room.assets.filter((asset) => asset.eager).map((asset) => asset.id).sort();
  const lazyAssetIds = room.assets.filter((asset) => !asset.eager).map((asset) => asset.id).sort();
  const eagerCompressedAssetBytes = room.assets.filter((asset) => asset.eager).reduce((sum, asset) => sum + asset.compressedBytes, 0)
    + uniqueDefinitions.filter((definition) => definition.runtime.eager).reduce((sum, definition) => sum + definition.runtime.compressedBytes, 0);
  const totalCompressedAssetBytes = room.assets.reduce((sum, asset) => sum + asset.compressedBytes, 0)
    + uniqueDefinitions.reduce((sum, definition) => sum + definition.runtime.compressedBytes, 0);
  const issues: SpatialValidationIssue[] = [];
  if (eagerCompressedAssetBytes > SPATIAL_EAGER_ASSET_BUDGET_BYTES) {
    issues.push({ path: "assets", code: "eager-asset-budget", message: "Compiled eager component and room assets exceed 3 MB." });
  }
  if (totalCompressedAssetBytes > SPATIAL_TOTAL_ASSET_BUDGET_BYTES) {
    issues.push({ path: "assets", code: "total-asset-budget", message: "Compiled component and room assets exceed 12 MB." });
  }
  if (issues.length > 0) return { ok: false, issues };

  const canonical = stableStringify(room);
  return {
    ok: true,
    room,
    plan: {
      schemaVersion: room.schemaVersion,
      roomId: room.id,
      roomRevision: room.revision,
      fingerprint: stableFingerprint(canonical),
      entryStateId: room.entryStateId,
      componentKeys,
      assets: room.assets.map((asset) => ({ ...asset })),
      eagerAssetIds,
      lazyAssetIds,
      items,
      states: room.states.slice().sort((left, right) => left.id.localeCompare(right.id)),
      semanticFallback: room.semanticFallback,
      budgets: {
        layoutJsonBytes: utf8Bytes(JSON.stringify(room)),
        eagerCompressedAssetBytes,
        totalCompressedAssetBytes,
      },
    },
  };
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

export function stableFingerprint(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
