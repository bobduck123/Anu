import { materialPresetMatchesSlot, SPATIAL_MATERIAL_PRESETS, SPATIAL_MATERIAL_SLOTS } from "./materials.ts";
import { SPATIAL_LIGHTING_PROFILES } from "./lighting.ts";
import { SPATIAL_INTERACTION_PROFILES } from "./interactionProfiles.ts";
import {
  ID_PATTERN,
  SPATIAL_SCHEMA_VERSION,
  VERSION_PATTERN,
  type SpatialActionRef,
  type SpatialAssetRef,
  type SpatialComponentDefinition,
  type SpatialMediaRef,
  type SpatialPlacement,
  type SpatialRoomDefinition,
  type SpatialSceneState,
  type SpatialSemanticItem,
  type SpatialSkinRef,
  type SpatialTransform,
  type SpatialValidationIssue,
  type SpatialValidationResult,
  type SpatialVec3,
} from "./model.ts";
import { validateSpatialPlacementRules } from "./placement.ts";
import { spatialComponent, spatialComponentEntries } from "./registry.ts";

export const SPATIAL_LAYOUT_JSON_BUDGET_BYTES = 100 * 1024;
export const SPATIAL_EAGER_ASSET_BUDGET_BYTES = 3 * 1024 * 1024;
export const SPATIAL_TOTAL_ASSET_BUDGET_BYTES = 12 * 1024 * 1024;
export const SPATIAL_MAX_SOURCE_COMPONENT_BYTES = 35 * 1024 * 1024 - 1;

const MAX_PLACEMENTS = 512;
const MAX_ASSETS = 256;
const MAX_STATES = 64;
const MAX_STRING = 500;
const COMPONENT_CATEGORIES = new Set(["shell", "floor", "wall", "surface", "rack", "projection", "piece", "action"]);
const ANCHOR_KINDS = new Set(["floor", "wall", "surface", "rack", "projection", "free"]);
const MATERIAL_SLOTS = new Set<string>(SPATIAL_MATERIAL_SLOTS);
const MATERIAL_PRESETS = new Set<string>(Object.keys(SPATIAL_MATERIAL_PRESETS));

export function validateSpatialRoomDefinition(value: unknown): SpatialValidationResult<SpatialRoomDefinition> {
  const issues: SpatialValidationIssue[] = [];
  const room = record(value, "$", issues);
  if (!room) return failure(issues);
  exactKeys(room, [
    "schemaVersion", "id", "label", "fixtureKind", "revision", "seed", "bounds", "entryStateId",
    "cameraPath", "lightingProfileId", "fallbackPresentation", "assets", "skins", "media", "actions", "placements", "states", "semanticFallback",
  ], "$", issues);
  literal(room.schemaVersion, SPATIAL_SCHEMA_VERSION, "schemaVersion", issues);
  identifier(room.id, "id", issues);
  text(room.label, "label", issues, 160);
  oneOf(room.fixtureKind, ["mobstar-proof", "bbb-projection-proof", "generic-proof"], "fixtureKind", issues);
  integer(room.revision, "revision", issues, 1, 1_000_000);
  text(room.seed, "seed", issues, 160);
  dimensions(room.bounds, "bounds", issues);
  identifier(room.entryStateId, "entryStateId", issues);
  cameraPath(room.cameraPath, "cameraPath", issues);
  if (room.lightingProfileId !== undefined) {
    oneOf(room.lightingProfileId, Object.keys(SPATIAL_LIGHTING_PROFILES), "lightingProfileId", issues);
  }
  if (room.fallbackPresentation !== undefined) {
    fallbackPresentation(room.fallbackPresentation, "fallbackPresentation", issues);
  }

  array(room.assets, "assets", issues, MAX_ASSETS, assetRef);
  array(room.skins, "skins", issues, 64, skinRef);
  array(room.media, "media", issues, MAX_ASSETS, mediaRef);
  array(room.actions, "actions", issues, MAX_ASSETS, actionRef);
  array(room.placements, "placements", issues, MAX_PLACEMENTS, placement);
  array(room.states, "states", issues, MAX_STATES, sceneState);
  array(room.semanticFallback, "semanticFallback", issues, MAX_PLACEMENTS, semanticItem);

  if (issues.length > 0) return failure(issues);
  const typed = value as SpatialRoomDefinition;
  validateRoomReferences(typed, issues);
  validateRoomBudgets(typed, issues);
  issues.push(...validateSpatialPlacementRules(typed));
  return issues.length === 0 ? { ok: true, value: typed, issues: [] } : failure(issues);
}

export function validateSpatialComponentDefinition(value: unknown): SpatialValidationResult<SpatialComponentDefinition> {
  const issues: SpatialValidationIssue[] = [];
  const component = record(value, "$", issues);
  if (!component) return failure(issues);
  exactKeys(component, [
    "componentId", "version", "label", "category", "dimensions", "geometry", "placement", "anchors",
    "materialSlots", "license", "runtime", "mobileFallback",
  ], "$", issues);
  identifier(component.componentId, "componentId", issues);
  if (typeof component.version !== "string" || !VERSION_PATTERN.test(component.version)) add(issues, "version", "version", "Invalid component version.");
  text(component.label, "label", issues, 160);
  oneOf(component.category, [...COMPONENT_CATEGORIES], "category", issues);
  dimensions(component.dimensions, "dimensions", issues);
  geometry(component.geometry, "geometry", issues);
  placementContract(component.placement, "placement", issues);
  array(component.anchors, "anchors", issues, 128, anchorDefinition);
  if (Array.isArray(component.anchors)) {
    const validAnchorIds = component.anchors.flatMap((anchor) => (
      anchor && typeof anchor === "object" && !Array.isArray(anchor) && typeof (anchor as { id?: unknown }).id === "string"
        ? [{ id: (anchor as { id: string }).id }]
        : []
    ));
    unique(validAnchorIds, "anchors", issues);
  }
  stringArray(component.materialSlots, "materialSlots", issues, MATERIAL_SLOTS, 9);
  if (Array.isArray(component.materialSlots) && component.materialSlots.length === 0) {
    add(issues, "materialSlots", "array-size", "Components require at least one material slot.");
  }
  componentLicense(component.license, "license", issues);
  runtimeProfile(component.runtime, "runtime", issues);
  mobileFallback(component.mobileFallback, "mobileFallback", issues);
  return issues.length === 0 ? { ok: true, value: value as SpatialComponentDefinition, issues: [] } : failure(issues);
}

export function validateRegisteredSpatialComponents(): SpatialValidationIssue[] {
  const issues: SpatialValidationIssue[] = [];
  const keys = new Set<string>();
  for (const definition of spatialComponentEntries()) {
    const result = validateSpatialComponentDefinition(definition);
    if (!result.ok) issues.push(...result.issues.map((item) => ({ ...item, path: `${definition.componentId}.${item.path}` })));
    const key = `${definition.componentId}@${definition.version}`;
    if (keys.has(key)) add(issues, key, "duplicate-component", "Component registry keys must be unique.");
    keys.add(key);
  }
  for (const definition of spatialComponentEntries()) {
    const fallback = definition.mobileFallback.componentRef;
    if (fallback && !keys.has(`${fallback.componentId}@${fallback.version}`)) {
      add(
        issues,
        `${definition.componentId}.mobileFallback.componentRef`,
        "missing-fallback-component",
        `Mobile fallback component ${fallback.componentId}@${fallback.version} is not registered.`,
      );
    }
  }
  return issues;
}

function validateRoomReferences(room: SpatialRoomDefinition, issues: SpatialValidationIssue[]): void {
  unique(room.assets, "assets", issues);
  unique(room.skins, "skins", issues);
  unique(room.media, "media", issues);
  unique(room.actions, "actions", issues);
  unique(room.placements, "placements", issues);
  unique(room.states, "states", issues);
  const assets = new Map(room.assets.map((item) => [item.id, item]));
  const skins = new Map(room.skins.map((item) => [item.id, item]));
  const media = new Map(room.media.map((item) => [item.id, item]));
  const actions = new Map(room.actions.map((item) => [item.id, item]));
  const placements = new Map(room.placements.map((item) => [item.id, item]));
  const states = new Map(room.states.map((item) => [item.id, item]));

  if (room.fallbackPresentation) {
    const brandMedia = room.fallbackPresentation.brandMediaRef
      ? media.get(room.fallbackPresentation.brandMediaRef)
      : undefined;
    const heroMedia = room.fallbackPresentation.heroMediaRef
      ? media.get(room.fallbackPresentation.heroMediaRef)
      : undefined;
    if (room.fallbackPresentation.brandMediaRef && !brandMedia) {
      add(issues, "fallbackPresentation.brandMediaRef", "missing-media", "Fallback brand media does not exist.");
    } else if (brandMedia && brandMedia.kind !== "logo" && brandMedia.kind !== "image") {
      add(issues, "fallbackPresentation.brandMediaRef", "fallback-media-kind", "Fallback brand media must be a logo or image.");
    }
    if (room.fallbackPresentation.heroMediaRef && !heroMedia) {
      add(issues, "fallbackPresentation.heroMediaRef", "missing-media", "Fallback hero media does not exist.");
    } else if (heroMedia && heroMedia.kind !== "image" && heroMedia.kind !== "poster") {
      add(issues, "fallbackPresentation.heroMediaRef", "fallback-media-kind", "Fallback hero media must be an image or poster.");
    }
  }

  if (!states.has(room.entryStateId)) add(issues, "entryStateId", "missing-state", "Entry state does not exist.");
  for (const item of room.media) {
    const asset = assets.get(item.assetId);
    if (!asset) {
      add(issues, `media.${item.id}.assetId`, "missing-asset", "Media asset does not exist.");
      continue;
    }
    if (asset.safety !== item.safety) {
      add(issues, `media.${item.id}.safety`, "media-safety", "Media safety must match its referenced asset.");
    }
    const kindCompatible = item.kind === asset.kind
      || (item.kind === "placeholder" && asset.kind !== "shape" && asset.safety === "generated-placeholder");
    if (!kindCompatible) {
      add(issues, `media.${item.id}.kind`, "media-kind", `Media kind ${item.kind} is incompatible with ${asset.kind} asset ${asset.id}.`);
    }
  }
  for (const skin of room.skins) {
    for (const assetId of skin.decalAssetIds) {
      const asset = assets.get(assetId);
      if (!asset) add(issues, `skins.${skin.id}.decalAssetIds`, "missing-asset", `Skin asset ${assetId} does not exist.`);
      else if (asset.kind !== "poster" && asset.kind !== "logo") {
        add(issues, `skins.${skin.id}.decalAssetIds`, "decal-kind", `Skin decal ${assetId} must reference a poster or logo asset.`);
      }
    }
  }
  for (const item of room.actions) {
    if (item.targetPlacementId && !placements.has(item.targetPlacementId)) add(issues, `actions.${item.id}.targetPlacementId`, "missing-placement", "Action target placement does not exist.");
    if (item.targetStateId && !states.has(item.targetStateId)) add(issues, `actions.${item.id}.targetStateId`, "missing-state", "Action target state does not exist.");
  }
  for (const item of room.placements) {
    const definition = spatialComponent(item);
    if (!definition) {
      add(issues, `placements.${item.id}`, "unknown-component", `Unknown component ${item.componentId}@${item.version}.`);
      continue;
    }
    if (item.skinRef && !skins.has(item.skinRef)) add(issues, `placements.${item.id}.skinRef`, "missing-skin", "Placement skin does not exist.");
    if (item.mediaRef && !media.has(item.mediaRef)) add(issues, `placements.${item.id}.mediaRef`, "missing-media", "Placement media does not exist.");
    if (item.interactionProfileId) {
      const profile = SPATIAL_INTERACTION_PROFILES[item.interactionProfileId];
      if (!profile) add(issues, `placements.${item.id}.interactionProfileId`, "missing-interaction-profile", "Interaction profile is not registered.");
      else if (profile.targetCategory !== definition.category) add(issues, `placements.${item.id}.interactionProfileId`, "interaction-category", "Interaction profile does not support this component category.");
    }
    for (const actionId of item.actionRefs) if (!actions.has(actionId)) add(issues, `placements.${item.id}.actionRefs`, "missing-action", `Action ${actionId} does not exist.`);
    for (const [slot, presetId] of Object.entries(item.materialSlotOverrides)) {
      if (!definition.materialSlots.includes(slot as never)) add(issues, `placements.${item.id}.materialSlotOverrides.${slot}`, "unsupported-slot", "Component does not expose this material slot.");
      if (!materialPresetMatchesSlot(slot as never, presetId as never)) add(issues, `placements.${item.id}.materialSlotOverrides.${slot}`, "preset-slot", "Material preset does not match its slot.");
    }
  }
  for (const state of room.states) {
    if (state.focusPlacementId && !placements.has(state.focusPlacementId)) add(issues, `states.${state.id}.focusPlacementId`, "missing-placement", "State focus placement does not exist.");
    for (const placementId of state.visiblePlacementIds ?? []) if (!placements.has(placementId)) add(issues, `states.${state.id}.visiblePlacementIds`, "missing-placement", `State placement ${placementId} does not exist.`);
    if (state.reducedMotionStateId && !states.has(state.reducedMotionStateId)) add(issues, `states.${state.id}.reducedMotionStateId`, "missing-state", "Reduced-motion state does not exist.");
  }
  for (const state of room.states) {
    const seen = new Set<string>();
    let current: SpatialSceneState | undefined = state;
    while (current?.reducedMotionStateId) {
      if (seen.has(current.id)) {
        add(issues, `states.${state.id}.reducedMotionStateId`, "reduced-state-cycle", "Reduced-motion state references must be acyclic and cannot reference themselves.");
        break;
      }
      seen.add(current.id);
      current = states.get(current.reducedMotionStateId);
    }
  }
  const semanticPlacements = new Set(room.semanticFallback.map((item) => item.placementId));
  for (const item of room.semanticFallback) {
    const owner = placements.get(item.placementId);
    if (!owner) add(issues, `semanticFallback.${item.placementId}`, "missing-placement", "Semantic item placement does not exist.");
    for (const actionId of item.actionRefs) {
      if (!actions.has(actionId)) add(issues, `semanticFallback.${item.placementId}.actionRefs`, "missing-action", `Semantic action ${actionId} does not exist.`);
      else if (owner && !owner.actionRefs.includes(actionId)) {
        add(issues, `semanticFallback.${item.placementId}.actionRefs`, "semantic-action-owner", `Semantic action ${actionId} must also be attached to placement ${item.placementId}.`);
      }
    }
  }
  for (const item of room.placements) {
    if ((item.actionRefs.length > 0 || item.mediaRef) && !semanticPlacements.has(item.id)) {
      add(issues, `placements.${item.id}`, "semantic-fallback", "Interactive/media placements require a semantic fallback item.");
    }
  }
}

function validateRoomBudgets(room: SpatialRoomDefinition, issues: SpatialValidationIssue[]): void {
  const layoutBytes = utf8Bytes(JSON.stringify(room));
  if (layoutBytes > SPATIAL_LAYOUT_JSON_BUDGET_BYTES) add(issues, "$", "layout-budget", `Layout JSON is ${layoutBytes} bytes; maximum is ${SPATIAL_LAYOUT_JSON_BUDGET_BYTES}.`);
  const eager = room.assets.filter((asset) => asset.eager).reduce((sum, asset) => sum + asset.compressedBytes, 0);
  const total = room.assets.reduce((sum, asset) => sum + asset.compressedBytes, 0);
  if (eager > SPATIAL_EAGER_ASSET_BUDGET_BYTES) add(issues, "assets", "eager-asset-budget", "Eager compressed assets exceed 3 MB.");
  if (total > SPATIAL_TOTAL_ASSET_BUDGET_BYTES) add(issues, "assets", "total-asset-budget", "Compressed assets exceed the internal 12 MB proof ceiling.");
}

function assetRef(value: unknown, path: string, issues: SpatialValidationIssue[]): void {
  const item = record(value, path, issues); if (!item) return;
  exactKeys(item, ["id", "kind", "locator", "safety", "compressedBytes", "eager", "attribution"], path, issues);
  identifier(item.id, `${path}.id`, issues);
  oneOf(item.kind, ["shape", "image", "poster", "logo"], `${path}.kind`, issues);
  oneOf(item.safety, ["generated-placeholder", "public-safe"], `${path}.safety`, issues);
  validateLogicalAssetLocator(item.locator, item.safety, `${path}.locator`, issues);
  integer(item.compressedBytes, `${path}.compressedBytes`, issues, 0, SPATIAL_TOTAL_ASSET_BUDGET_BYTES);
  boolean(item.eager, `${path}.eager`, issues);
  text(item.attribution, `${path}.attribution`, issues);
}

function skinRef(value: unknown, path: string, issues: SpatialValidationIssue[]): void {
  const item = record(value, path, issues); if (!item) return;
  exactKeys(item, ["id", "label", "materialPresets", "colors", "decalAssetIds"], path, issues);
  identifier(item.id, `${path}.id`, issues); text(item.label, `${path}.label`, issues, 160);
  materialMap(item.materialPresets, `${path}.materialPresets`, issues);
  colorMap(item.colors, `${path}.colors`, issues);
  stringArray(item.decalAssetIds, `${path}.decalAssetIds`, issues, null, 64);
}

function mediaRef(value: unknown, path: string, issues: SpatialValidationIssue[]): void {
  const item = record(value, path, issues); if (!item) return;
  exactKeys(item, ["id", "kind", "assetId", "alt", "safety"], path, issues);
  identifier(item.id, `${path}.id`, issues); oneOf(item.kind, ["image", "poster", "logo", "placeholder"], `${path}.kind`, issues);
  identifier(item.assetId, `${path}.assetId`, issues); text(item.alt, `${path}.alt`, issues);
  oneOf(item.safety, ["generated-placeholder", "public-safe"], `${path}.safety`, issues);
}

function actionRef(value: unknown, path: string, issues: SpatialValidationIssue[]): void {
  const item = record(value, path, issues); if (!item) return;
  identifier(item.id, `${path}.id`, issues);
  oneOf(item.kind, ["inspect", "navigate-state", "sequence-previous", "sequence-next", "disabled-placeholder"], `${path}.kind`, issues);
  text(item.label, `${path}.label`, issues, 160);
  if (item.kind === "inspect") {
    exactKeys(item, ["id", "kind", "label", "targetPlacementId"], path, issues);
    if (!identifier(item.targetPlacementId, `${path}.targetPlacementId`, issues)) add(issues, path, "action-target", "inspect requires targetPlacementId.");
  } else if (item.kind === "navigate-state") {
    exactKeys(item, ["id", "kind", "label", "targetStateId"], path, issues);
    if (!identifier(item.targetStateId, `${path}.targetStateId`, issues)) add(issues, path, "action-target", "navigate-state requires targetStateId.");
  } else if (item.kind === "disabled-placeholder") {
    exactKeys(item, ["id", "kind", "label", "disabledReason"], path, issues);
    if (!text(item.disabledReason, `${path}.disabledReason`, issues)) add(issues, path, "disabled-reason", "Disabled actions require an honest reason.");
  } else if (item.kind === "sequence-previous" || item.kind === "sequence-next") {
    exactKeys(item, ["id", "kind", "label"], path, issues);
  } else {
    exactKeys(item, ["id", "kind", "label"], path, issues);
  }
}

function placement(value: unknown, path: string, issues: SpatialValidationIssue[]): void {
  const item = record(value, path, issues); if (!item) return;
  exactKeys(item, ["id", "order", "componentId", "version", "transform", "anchor", "materialSlotOverrides", "skinRef", "mediaRef", "interactionProfileId", "actionRefs", "visible", "semanticLabel"], path, issues);
  identifier(item.id, `${path}.id`, issues); integer(item.order, `${path}.order`, issues, 0, MAX_PLACEMENTS * 4);
  identifier(item.componentId, `${path}.componentId`, issues);
  if (typeof item.version !== "string" || !VERSION_PATTERN.test(item.version)) add(issues, `${path}.version`, "version", "Invalid component version.");
  transform(item.transform, `${path}.transform`, issues);
  const anchor = record(item.anchor, `${path}.anchor`, issues);
  if (anchor) {
    exactKeys(anchor, ["kind", "parentPlacementId", "anchorId"], `${path}.anchor`, issues);
    oneOf(anchor.kind, [...ANCHOR_KINDS], `${path}.anchor.kind`, issues);
    optionalIdentifier(anchor.parentPlacementId, `${path}.anchor.parentPlacementId`, issues);
    optionalIdentifier(anchor.anchorId, `${path}.anchor.anchorId`, issues);
  }
  materialMap(item.materialSlotOverrides, `${path}.materialSlotOverrides`, issues);
  optionalIdentifier(item.skinRef, `${path}.skinRef`, issues); optionalIdentifier(item.mediaRef, `${path}.mediaRef`, issues);
  if (item.interactionProfileId !== undefined) oneOf(item.interactionProfileId, Object.keys(SPATIAL_INTERACTION_PROFILES), `${path}.interactionProfileId`, issues);
  stringArray(item.actionRefs, `${path}.actionRefs`, issues, null, 32); boolean(item.visible, `${path}.visible`, issues); text(item.semanticLabel, `${path}.semanticLabel`, issues, 200);
}

function sceneState(value: unknown, path: string, issues: SpatialValidationIssue[]): void {
  const item = record(value, path, issues); if (!item) return;
  exactKeys(item, ["id", "label", "cameraPosition", "cameraTarget", "fieldOfView", "focusPlacementId", "visiblePlacementIds", "reducedMotionStateId"], path, issues);
  identifier(item.id, `${path}.id`, issues); text(item.label, `${path}.label`, issues, 160);
  vec3(item.cameraPosition, `${path}.cameraPosition`, issues, -100, 100); vec3(item.cameraTarget, `${path}.cameraTarget`, issues, -100, 100);
  finite(item.fieldOfView, `${path}.fieldOfView`, issues, 20, 100);
  optionalIdentifier(item.focusPlacementId, `${path}.focusPlacementId`, issues);
  if (item.visiblePlacementIds !== undefined) stringArray(item.visiblePlacementIds, `${path}.visiblePlacementIds`, issues, null, MAX_PLACEMENTS);
  optionalIdentifier(item.reducedMotionStateId, `${path}.reducedMotionStateId`, issues);
}

function semanticItem(value: unknown, path: string, issues: SpatialValidationIssue[]): void {
  const item = record(value, path, issues); if (!item) return;
  exactKeys(item, ["placementId", "label", "description", "actionRefs"], path, issues);
  identifier(item.placementId, `${path}.placementId`, issues); text(item.label, `${path}.label`, issues, 200);
  optionalText(item.description, `${path}.description`, issues); stringArray(item.actionRefs, `${path}.actionRefs`, issues, null, 32);
}

function cameraPath(value: unknown, path: string, issues: SpatialValidationIssue[]): void {
  const item = record(value, path, issues); if (!item) return;
  exactKeys(item, ["points", "clearance"], path, issues);
  if (!Array.isArray(item.points) || item.points.length < 1 || item.points.length > 64) add(issues, `${path}.points`, "array", "Camera path requires 1-64 points.");
  else item.points.forEach((point, index) => vec3(point, `${path}.points.${index}`, issues, -100, 100));
  finite(item.clearance, `${path}.clearance`, issues, 0, 10);
}

function geometry(value: unknown, path: string, issues: SpatialValidationIssue[]): void {
  const item = record(value, path, issues); if (!item) return;
  if (item.kind === "primitive") {
    exactKeys(item, ["kind", "primitive"], path, issues); oneOf(item.primitive, [
      "box", "plane", "cylinder", "rack", "projection-field", "open-shell", "ribbed-wall",
      "display-bay", "rounded-island", "suspended-rack", "garment-hanger", "framed-media", "projection-grid",
    ], `${path}.primitive`, issues);
  } else if (item.kind === "asset") {
    exactKeys(item, ["kind", "assetId"], path, issues); identifier(item.assetId, `${path}.assetId`, issues);
  } else add(issues, `${path}.kind`, "geometry-kind", "Geometry must be primitive or asset reference.");
}

function placementContract(value: unknown, path: string, issues: SpatialValidationIssue[]): void {
  const item = record(value, path, issues); if (!item) return;
  exactKeys(item, ["allowedAnchorKinds", "collision", "requiresParent", "blocksCameraPath", "floorClearance"], path, issues);
  stringArray(item.allowedAnchorKinds, `${path}.allowedAnchorKinds`, issues, ANCHOR_KINDS, 6);
  oneOf(item.collision, ["solid", "overlap-allowed", "parent-contained"], `${path}.collision`, issues);
  boolean(item.requiresParent, `${path}.requiresParent`, issues); boolean(item.blocksCameraPath, `${path}.blocksCameraPath`, issues);
  finite(item.floorClearance, `${path}.floorClearance`, issues, 0, 10);
}

function anchorDefinition(value: unknown, path: string, issues: SpatialValidationIssue[]): void {
  const item = record(value, path, issues); if (!item) return;
  exactKeys(item, ["id", "kind", "transform", "accepts", "capacity"], path, issues);
  identifier(item.id, `${path}.id`, issues); oneOf(item.kind, [...ANCHOR_KINDS], `${path}.kind`, issues); transform(item.transform, `${path}.transform`, issues);
  stringArray(item.accepts, `${path}.accepts`, issues, COMPONENT_CATEGORIES, COMPONENT_CATEGORIES.size); integer(item.capacity, `${path}.capacity`, issues, 1, 512);
}

function componentLicense(value: unknown, path: string, issues: SpatialValidationIssue[]): void {
  const item = record(value, path, issues); if (!item) return;
  exactKeys(item, ["licenseId", "sourceKind", "source", "attribution", "internalOnly"], path, issues);
  text(item.licenseId, `${path}.licenseId`, issues, 160); oneOf(item.sourceKind, ["presence-authored", "generated-placeholder", "third-party"], `${path}.sourceKind`, issues);
  text(item.source, `${path}.source`, issues); text(item.attribution, `${path}.attribution`, issues); boolean(item.internalOnly, `${path}.internalOnly`, issues);
}

function runtimeProfile(value: unknown, path: string, issues: SpatialValidationIssue[]): void {
  const item = record(value, path, issues); if (!item) return;
  exactKeys(item, ["compressedBytes", "sourceBytes", "eager", "performanceTier"], path, issues);
  integer(item.compressedBytes, `${path}.compressedBytes`, issues, 0, SPATIAL_TOTAL_ASSET_BUDGET_BYTES);
  integer(item.sourceBytes, `${path}.sourceBytes`, issues, 0, SPATIAL_MAX_SOURCE_COMPONENT_BYTES);
  boolean(item.eager, `${path}.eager`, issues); oneOf(item.performanceTier, ["core", "enhanced", "hero"], `${path}.performanceTier`, issues);
}

function mobileFallback(value: unknown, path: string, issues: SpatialValidationIssue[]): void {
  const item = record(value, path, issues); if (!item) return;
  exactKeys(item, ["strategy", "componentRef", "note"], path, issues);
  oneOf(item.strategy, ["same", "simplified", "semantic-only"], `${path}.strategy`, issues); text(item.note, `${path}.note`, issues);
  if (item.componentRef !== undefined) {
    const ref = record(item.componentRef, `${path}.componentRef`, issues);
    if (ref) {
      exactKeys(ref, ["componentId", "version"], `${path}.componentRef`, issues);
      const validId = identifier(ref.componentId, `${path}.componentRef.componentId`, issues);
      const validVersion = typeof ref.version === "string" && VERSION_PATTERN.test(ref.version);
      if (!validVersion) add(issues, `${path}.componentRef.version`, "version", "Invalid fallback component version.");
      if (validId && validVersion && !spatialComponent({ componentId: ref.componentId as string, version: ref.version as string })) {
        add(issues, `${path}.componentRef`, "missing-fallback-component", "Mobile fallback component is not registered.");
      }
    }
  }
}

function dimensions(value: unknown, path: string, issues: SpatialValidationIssue[]): void {
  const item = record(value, path, issues); if (!item) return;
  exactKeys(item, ["width", "height", "depth"], path, issues);
  finite(item.width, `${path}.width`, issues, 0.001, 200); finite(item.height, `${path}.height`, issues, 0.001, 200); finite(item.depth, `${path}.depth`, issues, 0.001, 200);
}

function transform(value: unknown, path: string, issues: SpatialValidationIssue[]): void {
  const item = record(value, path, issues); if (!item) return;
  exactKeys(item, ["position", "rotation", "scale"], path, issues);
  vec3(item.position, `${path}.position`, issues, -100, 100); vec3(item.rotation, `${path}.rotation`, issues, -Math.PI * 4, Math.PI * 4); vec3(item.scale, `${path}.scale`, issues, 0.01, 20);
}

function vec3(value: unknown, path: string, issues: SpatialValidationIssue[], min: number, max: number): value is SpatialVec3 {
  if (!Array.isArray(value) || value.length !== 3) { add(issues, path, "vec3", "Expected exactly three numeric values."); return false; }
  value.forEach((item, index) => finite(item, `${path}.${index}`, issues, min, max)); return true;
}

function materialMap(value: unknown, path: string, issues: SpatialValidationIssue[]): void {
  const item = record(value, path, issues); if (!item) return;
  for (const [slot, preset] of Object.entries(item)) {
    if (!MATERIAL_SLOTS.has(slot)) add(issues, `${path}.${slot}`, "material-slot", "Unknown material slot.");
    if (typeof preset !== "string" || !MATERIAL_PRESETS.has(preset)) add(issues, `${path}.${slot}`, "material-preset", "Unknown material preset.");
    else if (MATERIAL_SLOTS.has(slot) && !materialPresetMatchesSlot(slot as never, preset as never)) add(issues, `${path}.${slot}`, "preset-slot", "Material preset does not match its slot.");
  }
}

function colorMap(value: unknown, path: string, issues: SpatialValidationIssue[]): void {
  const item = record(value, path, issues); if (!item) return;
  if (Object.keys(item).length > SPATIAL_MATERIAL_SLOTS.length) add(issues, path, "record-size", "Too many material colour entries.");
  for (const [key, child] of Object.entries(item)) {
    if (!MATERIAL_SLOTS.has(key)) add(issues, `${path}.${key}`, "material-slot", "Skin colours must be keyed by a registered material slot.");
    if (typeof child !== "string" || !/^#[0-9a-f]{6}$/i.test(child)) add(issues, `${path}.${key}`, "value", "Color values must be six-digit hex.");
  }
}

function fallbackPresentation(value: unknown, path: string, issues: SpatialValidationIssue[]): void {
  const item = record(value, path, issues); if (!item) return;
  exactKeys(item, ["eyebrow", "title", "summary", "brandMediaRef", "heroMediaRef", "accentColor", "backgroundColor"], path, issues);
  text(item.eyebrow, `${path}.eyebrow`, issues, 100);
  text(item.title, `${path}.title`, issues, 160);
  text(item.summary, `${path}.summary`, issues, 500);
  optionalIdentifier(item.brandMediaRef, `${path}.brandMediaRef`, issues);
  optionalIdentifier(item.heroMediaRef, `${path}.heroMediaRef`, issues);
  color(item.accentColor, `${path}.accentColor`, issues);
  color(item.backgroundColor, `${path}.backgroundColor`, issues);
}

function validateLogicalAssetLocator(
  value: unknown,
  safety: unknown,
  path: string,
  issues: SpatialValidationIssue[],
): void {
  if (typeof value !== "string" || value.length > 248 || value.includes("://") || value.includes("\\")) {
    add(issues, path, "unsafe-locator", "Use a normalized generated: or public: logical locator without URLs or backslashes.");
    return;
  }
  const separator = value.indexOf(":");
  const namespace = separator > 0 ? value.slice(0, separator) : "";
  const logicalPath = separator > 0 ? value.slice(separator + 1) : "";
  const expectedNamespace = safety === "generated-placeholder"
    ? "generated"
    : safety === "public-safe"
      ? "public"
      : undefined;
  const segments = logicalPath.split("/");
  const normalized = logicalPath.length > 0
    && !logicalPath.startsWith("/")
    && segments.every((segment) => (
      segment !== "."
      && segment !== ".."
      && /^[a-z0-9][a-z0-9._-]{0,79}$/.test(segment)
    ));
  const containsRawModel = segments.some((segment) => /\.(?:glb|gltf)$/i.test(segment));
  if ((namespace !== "generated" && namespace !== "public") || !normalized || containsRawModel) {
    add(issues, path, "unsafe-locator", "Use normalized generated: or public: path segments; traversal, absolute paths and raw GLB/GLTF files are forbidden.");
    return;
  }
  if (expectedNamespace && namespace !== expectedNamespace) {
    add(issues, path, "locator-namespace", `${safety} assets must use the ${expectedNamespace}: namespace.`);
  }
}

function array<T>(value: unknown, path: string, issues: SpatialValidationIssue[], max: number, validate: (item: unknown, itemPath: string, issues: SpatialValidationIssue[]) => void): value is T[] {
  if (!Array.isArray(value)) { add(issues, path, "array", "Expected an array."); return false; }
  if (value.length > max) add(issues, path, "array-size", `Maximum ${max} entries.`);
  value.forEach((item, index) => validate(item, `${path}.${index}`, issues)); return true;
}

function stringArray(value: unknown, path: string, issues: SpatialValidationIssue[], allowed: ReadonlySet<string> | null, max: number): void {
  if (!Array.isArray(value)) { add(issues, path, "array", "Expected a string array."); return; }
  if (value.length > max) add(issues, path, "array-size", `Maximum ${max} entries.`);
  value.forEach((item, index) => {
    if (typeof item !== "string" || item.length > 160) add(issues, `${path}.${index}`, "string", "Invalid string entry.");
    else if (allowed && !allowed.has(item)) add(issues, `${path}.${index}`, "enum", "Unsupported value.");
  });
}

function unique(items: readonly { id: string }[], path: string, issues: SpatialValidationIssue[]): void {
  const seen = new Set<string>();
  for (const item of items) { if (seen.has(item.id)) add(issues, `${path}.${item.id}`, "duplicate-id", "IDs must be unique within this collection."); seen.add(item.id); }
}

function record(value: unknown, path: string, issues: SpatialValidationIssue[]): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) { add(issues, path, "object", "Expected a plain object."); return null; }
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], path: string, issues: SpatialValidationIssue[]): void {
  const set = new Set(allowed);
  for (const key of Object.keys(value)) if (!set.has(key)) add(issues, `${path}.${key}`, "unknown-key", "Unknown fields are rejected.");
  for (const key of allowed) if (!(key in value) && !OPTIONAL_KEYS.has(key)) add(issues, `${path}.${key}`, "missing-key", "Required field is missing.");
}

const OPTIONAL_KEYS = new Set(["componentRef", "skinRef", "mediaRef", "interactionProfileId", "lightingProfileId", "fallbackPresentation", "brandMediaRef", "heroMediaRef", "targetPlacementId", "targetStateId", "disabledReason", "parentPlacementId", "anchorId", "focusPlacementId", "visiblePlacementIds", "reducedMotionStateId", "description"]);

function identifier(value: unknown, path: string, issues: SpatialValidationIssue[]): value is string { if (typeof value !== "string" || !ID_PATTERN.test(value)) { add(issues, path, "id", "Invalid stable identifier."); return false; } return true; }
function optionalIdentifier(value: unknown, path: string, issues: SpatialValidationIssue[]): void { if (value !== undefined) identifier(value, path, issues); }
function text(value: unknown, path: string, issues: SpatialValidationIssue[], max = MAX_STRING): value is string { if (typeof value !== "string" || value.trim().length === 0 || value.length > max) { add(issues, path, "text", `Expected non-empty text up to ${max} characters.`); return false; } return true; }
function optionalText(value: unknown, path: string, issues: SpatialValidationIssue[]): void { if (value !== undefined) text(value, path, issues); }
function literal(value: unknown, expected: string, path: string, issues: SpatialValidationIssue[]): void { if (value !== expected) add(issues, path, "literal", `Expected ${expected}.`); }
function oneOf(value: unknown, allowed: readonly string[], path: string, issues: SpatialValidationIssue[]): void { if (typeof value !== "string" || !allowed.includes(value)) add(issues, path, "enum", "Unsupported value."); }
function boolean(value: unknown, path: string, issues: SpatialValidationIssue[]): void { if (typeof value !== "boolean") add(issues, path, "boolean", "Expected a boolean."); }
function integer(value: unknown, path: string, issues: SpatialValidationIssue[], min: number, max: number): void { if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) add(issues, path, "integer", `Expected integer ${min}-${max}.`); }
function finite(value: unknown, path: string, issues: SpatialValidationIssue[], min: number, max: number): void { if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) add(issues, path, "number", `Expected finite number ${min}-${max}.`); }
function color(value: unknown, path: string, issues: SpatialValidationIssue[]): void { if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value)) add(issues, path, "color", "Expected a six-digit hex colour."); }
function add(issues: SpatialValidationIssue[], path: string, code: string, message: string): void { issues.push({ path, code, message }); }
function failure(issues: SpatialValidationIssue[]): SpatialValidationResult<never> { return { ok: false, issues }; }

export function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}
