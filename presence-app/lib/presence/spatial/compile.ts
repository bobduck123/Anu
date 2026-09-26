import { resolveSpatialMaterials } from "./materials.ts";
import { requireSpatialLightingProfile } from "./lighting.ts";
import { spatialInteractionProfile } from "./interactionProfiles.ts";
import { arrangeSpatialContentBindings } from "./arrangements.ts";
import type {
  SpatialActionRef,
  SpatialCompiledContentArrangement,
  SpatialContentBinding,
  SpatialMediaRef,
  SpatialPlacement,
  SpatialRenderItem,
  SpatialRenderPlan,
  SpatialRoomDefinition,
  SpatialValidationIssue,
} from "./model.ts";
import {
  spatialComponentKey,
  SPATIAL_GARMENT_ASPECT_RANGE,
  SPATIAL_GARMENT_DEFAULT_ASPECT,
  SPATIAL_GARMENT_HANG_PROFILES,
} from "./model.ts";
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
        parentPlacementId: placement.anchor.parentPlacementId,
        componentId: placement.componentId,
        version: placement.version,
        componentKey: spatialComponentKey(placement),
        category: definition.category,
        geometry: definition.geometry,
        renderGeometry: definition.renderGeometry,
        dimensions: definition.dimensions,
        transform: resolveSpatialPlacementTransform(room, placement),
        materials: resolveSpatialMaterials({
          slots: definition.materialSlots,
          skin: placement.skinRef ? skins.get(placement.skinRef) : undefined,
          overrides: placement.materialSlotOverrides,
        }),
        primaryMaterialSlot,
        media: placement.mediaRef ? media.get(placement.mediaRef) : undefined,
        interaction: spatialInteractionProfile(placement.interactionProfileId),
        actions: placement.actionRefs.map((actionId) => actions.get(actionId)).filter((item) => item !== undefined),
        visible: placement.visible,
        semanticLabel: placement.semanticLabel,
      };
    });
  const contentBindingArrangements = compileContentBindingArrangements(room, items, actions);
  for (const derivedItem of derivedContentBindingItems(room, contentBindingArrangements, actions)) {
    items.push(derivedItem);
  }

  const componentKeys = [...new Set(items.map((item) => item.componentKey))].sort();
  const uniqueDefinitions = componentKeys.map((key) => {
    const item = items.find((candidate) => candidate.componentKey === key)!;
    return requireSpatialComponent(item);
  });
  const eagerAssetIds = room.assets.filter((asset) => asset.eager).map((asset) => asset.id).sort();
  const lazyAssetIds = room.assets.filter((asset) => !asset.eager).map((asset) => asset.id).sort();
  const eagerCompressedAssetBytes = room.assets.filter((asset) => asset.eager).reduce((sum, asset) => sum + asset.compressedBytes, 0)
    + uniqueDefinitions.filter((definition) => definition.runtime.eager).reduce((sum, definition) => sum + definition.runtime.compressedBytes, 0);
  const lazyDecoderBytes = uniqueDefinitions.reduce((sum, definition) => {
    const renderGeometry = definition.renderGeometry;
    return sum + (renderGeometry?.kind === "glb" && renderGeometry.compression === "draco"
      ? Math.ceil((renderGeometry.decoderSizeKb ?? 0) * 1024)
      : 0);
  }, 0);
  const totalCompressedAssetBytes = room.assets.reduce((sum, asset) => sum + asset.compressedBytes, 0)
    + uniqueDefinitions.reduce((sum, definition) => sum + definition.runtime.compressedBytes, 0)
    + lazyDecoderBytes;
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
      lighting: requireSpatialLightingProfile(room.lightingProfileId),
      fallbackPresentation: room.fallbackPresentation
        ? {
            ...room.fallbackPresentation,
            brandMedia: room.fallbackPresentation.brandMediaRef
              ? media.get(room.fallbackPresentation.brandMediaRef)
              : undefined,
            heroMedia: room.fallbackPresentation.heroMediaRef
              ? media.get(room.fallbackPresentation.heroMediaRef)
              : undefined,
          }
        : undefined,
      componentKeys,
      assets: room.assets.map((asset) => ({ ...asset })),
      eagerAssetIds,
      lazyAssetIds,
      items,
      contentBindingArrangements,
      states: room.states.slice().sort((left, right) => left.id.localeCompare(right.id)),
      semanticFallback: [
        ...room.semanticFallback,
        ...contentBindingArrangements.flatMap((arrangement) => arrangement.fallbackRows),
      ],
      budgets: {
        layoutJsonBytes: utf8Bytes(JSON.stringify(room)),
        eagerCompressedAssetBytes,
        totalCompressedAssetBytes,
        lazyDecoderBytes,
      },
    },
  };
}

function compileContentBindingArrangements(
  room: SpatialRoomDefinition,
  hostItems: readonly SpatialRenderItem[],
  actions: ReadonlyMap<string, SpatialActionRef>,
): SpatialCompiledContentArrangement[] {
  const arrangements: SpatialCompiledContentArrangement[] = [];
  for (const host of room.placements) {
    if (!host.contentArrangement) continue;
    const definition = requireSpatialComponent(host);
    const anchor = definition.anchors.find((candidate) => candidate.accepts.includes("piece"))
      ?? definition.anchors[0];
    const hostBindings = (room.contentBindings ?? []).filter((binding) => binding.hostPlacementId === host.id);
    const arrangement = arrangeSpatialContentBindings({
      hostPlacementId: host.id,
      arrangement: host.contentArrangement,
      bindings: hostBindings,
      hostDimensions: definition.dimensions,
      anchorKind: anchor?.kind ?? host.anchor.kind,
    });
    const hostActionIds = new Set(hostItems.find((item) => item.placementId === host.id)?.actions.map((action) => action.id) ?? []);
    arrangements.push({
      ...arrangement,
      fallbackRows: arrangement.fallbackRows.map((row) => ({
        ...row,
        actionRefs: row.actionRefs.filter((actionId) => actions.has(actionId) && !hostActionIds.has(actionId)),
      })),
    });
  }
  return arrangements;
}

/**
 * Resolves a garment binding's artwork channel.
 *
 * Front and back are independent media refs. `missingArtwork` is reported rather
 * than hidden: with an invisible carrier, "no artwork assigned" and "broken"
 * would otherwise look identical.
 */
function garmentChannel(
  binding: SpatialContentBinding,
  media: ReadonlyMap<string, SpatialMediaRef>,
): NonNullable<SpatialRenderItem["garment"]> {
  const articleType = binding.garmentArticleType ?? "generic";
  const lookup = (ref: string | undefined) => (ref ? media.get(ref) : undefined);
  const displayMedia = lookup(binding.displayImageRef);
  // A garment with only a legacy mediaRefs[0] still resolves as its front print.
  const frontMedia = lookup(binding.frontImageRef) ?? lookup(binding.mediaRefs[0]);
  const backMedia = lookup(binding.backImageRef);
  const outerSideMedia = lookup(binding.outerSideImageRef);
  const topMedia = lookup(binding.topImageRef);
  const aspect = clampArtworkAspect(binding.artworkAspect)
    ?? SPATIAL_GARMENT_DEFAULT_ASPECT[articleType];
  const resolved = [frontMedia, backMedia, displayMedia, outerSideMedia, topMedia];
  return {
    articleType,
    ...(frontMedia ? { frontMedia } : {}),
    ...(backMedia ? { backMedia } : {}),
    ...(displayMedia ? { displayMedia } : {}),
    ...(outerSideMedia ? { outerSideMedia } : {}),
    ...(topMedia ? { topMedia } : {}),
    aspect,
    missingArtwork: resolved.every((item) => item === undefined),
  };
}

function clampArtworkAspect(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return Math.min(SPATIAL_GARMENT_ASPECT_RANGE.max, Math.max(SPATIAL_GARMENT_ASPECT_RANGE.min, value));
}

function derivedContentBindingItems(
  room: SpatialRoomDefinition,
  arrangements: readonly SpatialCompiledContentArrangement[],
  actions: ReadonlyMap<string, SpatialActionRef>,
): SpatialRenderItem[] {
  const skins = new Map(room.skins.map((skin) => [skin.id, skin]));
  const media = new Map(room.media.map((item) => [item.id, item]));
  const pieceDefinition = requireSpatialComponent({ componentId: "presence.piece-plane", version: "1.0.0" });
  const garmentDefinition = requireSpatialComponent({ componentId: "presence.garment-hanger", version: "1.0.0" });
  const items: SpatialRenderItem[] = [];
  for (const arrangement of arrangements) {
    const host = room.placements.find((placement) => placement.id === arrangement.hostPlacementId);
    if (!host) continue;
    const skinRef = host.skinRef ? skins.get(host.skinRef) : undefined;
    for (const slot of arrangement.slots) {
      const binding = (room.contentBindings ?? []).find((candidate) => candidate.id === slot.bindingId);
      if (!binding) continue;
      // Garment bindings render through the invisible carrier rather than a bare
      // piece plane, so front and back artwork can be separate surfaces.
      const isGarment = binding.pieceType === "garment";
      const definition = isGarment ? garmentDefinition : pieceDefinition;
      const placement: SpatialPlacement = {
        id: slot.placementId,
        order: 10_000 + slot.order,
        componentId: definition.componentId,
        version: definition.version,
        transform: slot.transform,
        anchor: { kind: slot.anchorKind, parentPlacementId: arrangement.hostPlacementId },
        materialSlotOverrides: materialOverridesForBinding(slot.anchorKind, binding.pieceType),
        ...(host.skinRef ? { skinRef: host.skinRef } : {}),
        ...(binding.mediaRefs[0] ? { mediaRef: binding.mediaRefs[0] } : {}),
        // Inspection uses the article's profile: footwear is inspected close and
        // small, hanging garments turn outward beside the rail.
        ...(isGarment
          ? { interactionProfileId: SPATIAL_GARMENT_HANG_PROFILES[binding.garmentArticleType ?? "generic"].inspectionProfileId }
          : {}),
        actionRefs: binding.actionRefs,
        visible: slot.visible,
        semanticLabel: binding.label,
      };
      const materialOverrides = placement.materialSlotOverrides;
      const primaryMaterialSlot = Object.keys(materialOverrides)[0] as SpatialRenderItem["primaryMaterialSlot"] | undefined
        ?? definition.materialSlots[0];
      if (!primaryMaterialSlot) throw new Error("Spatial piece-plane component has no material slots.");
      items.push({
        placementId: placement.id,
        parentPlacementId: arrangement.hostPlacementId,
        componentId: placement.componentId,
        version: placement.version,
        componentKey: spatialComponentKey(placement),
        category: definition.category,
        geometry: definition.geometry,
        renderGeometry: definition.renderGeometry,
        dimensions: definition.dimensions,
        transform: resolveSpatialPlacementTransform({ ...room, placements: [...room.placements, placement] }, placement),
        materials: resolveSpatialMaterials({
          slots: definition.materialSlots,
          skin: skinRef,
          overrides: materialOverrides,
        }),
        primaryMaterialSlot,
        media: placement.mediaRef ? media.get(placement.mediaRef) : undefined,
        ...(isGarment ? { garment: garmentChannel(binding, media) } : {}),
        interaction: spatialInteractionProfile(placement.interactionProfileId),
        actions: placement.actionRefs.map((actionId) => actions.get(actionId)).filter((item) => item !== undefined),
        visible: placement.visible,
        semanticLabel: placement.semanticLabel,
      });
    }
  }
  return items;
}

function materialOverridesForBinding(
  anchorKind: SpatialPlacement["anchor"]["kind"],
  pieceType: string,
): SpatialPlacement["materialSlotOverrides"] {
  if (pieceType === "garment" || anchorKind === "rack") return { fabric: "fabric-neutral" };
  if (pieceType === "video" || anchorKind === "projection") return { projection: "projection-emissive" };
  if (pieceType === "audio") return { "logo-accent": "accent-signal" };
  if (pieceType === "archive-item") return { "poster-decal": "poster-satin" };
  return { paper: "paper-uncoated" };
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
