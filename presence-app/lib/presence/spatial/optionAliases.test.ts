import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { createSpatialGeometryTemplate } from "../../../components/presence-spatial/threeGeometryCache.ts";
import {
  addArrangerOption,
  assignArrangerMedia,
  assignArrangerOpenLink,
  createBlankMobstarSpatialRoom,
  createRoomFromPresenceRoomKitOption,
  isArrangerMovablePlacement,
} from "./arranger.ts";
import { compileSpatialRoom } from "./compile.ts";
import { CANDIDATE_COMPONENT_OPTIONS } from "./candidateOptions.ts";
import {
  PRESENCE_OPTION_ALIASES,
  PRESENCE_OPTION_ALIAS_HIDDEN_COMPONENTS,
  PRESENCE_ROOM_KIT_CONTAINERS,
  presenceOptionPaletteGroups,
  resolvePresencePlacementOption,
  resolvePresenceRoomKit,
  validatePresenceOptionAliases,
} from "./optionAliases.ts";
import { spatialComponentEntries } from "./registry.ts";
import { spatialComponentKey } from "./model.ts";
import { createSpatialDraftEnvelope, encodeSpatialDraftEnvelope } from "./storage.ts";

test("Presence option aliases and room-kit containers validate as unadmitted stable refs", () => {
  assert.deepEqual(validatePresenceOptionAliases(), []);
  assert.ok(PRESENCE_OPTION_ALIASES.length >= 30);
  assert.ok(PRESENCE_ROOM_KIT_CONTAINERS.length >= 3);
  assert.equal(PRESENCE_OPTION_ALIASES.some((option) => option.admissionStatus !== "not-admitted"), false);
  assert.ok(PRESENCE_OPTION_ALIASES.some((option) => option.status === "future-primitive"));
  assert.ok(PRESENCE_OPTION_ALIASES.some((option) => option.status === "internal-experimental"));
  assert.ok(PRESENCE_OPTION_ALIASES.some((option) => option.status === "available-now-candidate"));
});

test("registered authoring components are exposed through aliases or documented hidden reasons", () => {
  const aliasComponentKeys = new Set(
    PRESENCE_OPTION_ALIASES
      .map((option) => option.componentRef ? spatialComponentKey(option.componentRef) : undefined)
      .filter((key): key is string => Boolean(key)),
  );
  const hiddenComponentKeys = new Set(PRESENCE_OPTION_ALIAS_HIDDEN_COMPONENTS.map(spatialComponentKey));

  const presenceComponentKeys = spatialComponentEntries()
    .filter((component) => component.componentId.startsWith("presence."))
    .map(spatialComponentKey);

  for (const key of presenceComponentKeys) {
    assert.equal(aliasComponentKeys.has(key) || hiddenComponentKeys.has(key), true, key);
  }

  assert.ok(aliasComponentKeys.has("presence.piece-plane@1.0.0"));
  assert.ok(aliasComponentKeys.has("presence.garment-hanger@1.0.0"));
  assert.ok(PRESENCE_OPTION_ALIAS_HIDDEN_COMPONENTS.every((component) => component.reason.length > 20));
});

test("internally cleared candidates have stable aliases with provenance and warning labels", () => {
  for (const candidate of CANDIDATE_COMPONENT_OPTIONS) {
    const aliases = PRESENCE_OPTION_ALIASES.filter((option) => option.componentRef?.componentId === candidate.componentId);
    assert.equal(aliases.length >= 1, true, candidate.componentId);
    const alias = aliases[0];
    assert.equal(alias.status, "available-now-candidate");
    assert.equal(alias.admissionStatus, "not-admitted");
    assert.equal(alias.reviewStatus, "candidate-cleared-for-internal-use");
    assert.ok(alias.warnings.includes("candidate"));
    assert.ok(alias.warnings.includes("not production-ready"));
    for (const warning of candidate.warningFlags) assert.ok(alias.warnings.includes(warning), `${candidate.componentId} ${warning}`);
    assert.ok(alias.internalSourceRefs.some((ref) => ref.ref === candidate.sourceAssetId));
    assert.equal(JSON.stringify(alias).match(/\.(?:blend|glb|gltf)(?:["?#]|$)/i), null);
  }
});

test("resolver maps curated option IDs to procedural and candidate backing refs", () => {
  const displayIsland = resolvePresencePlacementOption({ optionId: "presence.surface.display-island", version: "0.1.0" });
  assert.equal(displayIsland.ok, true);
  if (!displayIsland.ok) return;
  assert.equal(displayIsland.componentRef.componentId, "presence.rounded-island");
  assert.equal(displayIsland.optionRef.optionId, "presence.surface.display-island");
  assert.equal(displayIsland.option.implementationStrategy, "procedural-component");

  const projectionWall = resolvePresencePlacementOption({ optionId: "presence.display.projection-wall", version: "0.1.0" });
  assert.equal(projectionWall.ok, true);
  if (!projectionWall.ok) return;
  assert.equal(projectionWall.componentRef.componentId, "presence.projection-wall");
  assert.equal(projectionWall.anchorKind, "wall");

  const candidate = resolvePresencePlacementOption({ optionId: "presence.candidate.stone-plinth", version: "0.1.0" });
  assert.equal(candidate.ok, true);
  if (!candidate.ok) return;
  assert.equal(candidate.componentRef.componentId, "candidate.table.old-church-modeling-interior-sce-ffd7-017");
  assert.equal(candidate.option.status, "available-now-candidate");
  assert.equal(candidate.option.admissionStatus, "not-admitted");
  assert.ok(candidate.option.warnings.includes("candidate"));

  const risers = resolvePresencePlacementOption({ optionId: "presence.candidate.stacked-risers", version: "0.1.0" });
  assert.equal(risers.ok, true);
  if (!risers.ok) return;
  assert.equal(risers.componentRef.componentId, "candidate.chair.interior-7-3bc1-013");
  assert.ok(risers.option.warnings.includes("needs-scale-review"));
});

test("procedural option aliases resolve without candidate source refs", () => {
  const procedural = PRESENCE_OPTION_ALIASES.filter((option) => option.status === "available-now-procedural" && option.kind !== "room-kit");
  assert.ok(procedural.length > 0);
  for (const option of procedural) {
    assert.equal(option.internalSourceRefs.some((ref) => ref.kind.startsWith("candidate")), false, option.optionId);
    const resolved = resolvePresencePlacementOption(option);
    assert.equal(resolved.ok, true, option.optionId);
  }
});

test("future and deferred options are visible metadata but cannot mutate the arranger draft", () => {
  const room = createBlankMobstarSpatialRoom();
  const future = addArrangerOption(room, "presence.display.orbital-carousel", "future");
  assert.equal(future.ok, false);
  assert.equal(future.room, room);
  if (!future.ok) assert.ok(future.issues.some((issue) => issue.code === "option-unavailable"));

  const workPlane = addArrangerOption(room, "presence.work.media-plane");
  assert.equal(workPlane.ok, false);
  assert.equal(workPlane.room, room);
  if (!workPlane.ok) assert.ok(workPlane.issues.some((issue) => issue.code === "option-unavailable"));

  assert.deepEqual(room.placements.map((placement) => placement.id), ["room-shell", "floor"]);
});

test("palette groups use operator language and separate planned from future options", () => {
  const groups = presenceOptionPaletteGroups();
  const labels = groups.map((group) => group.label);
  assert.deepEqual(labels, [
    "Walls & Dividers",
    "Display Furniture",
    "Works & Media",
    "Text & Labels",
    "Lighting & Atmosphere",
    "Candidate Objects",
    "Planned Options",
    "Future Display Systems",
  ]);
  assert.equal(labels.includes("Candidate Finds"), false);
  assert.equal(labels.includes("Future / Deferred"), false);

  const planned = groups.find((group) => group.label === "Planned Options");
  assert.ok(planned);
  assert.ok(planned.options.some((option) => option.optionId === "presence.work.media-plane"));
  assert.ok(planned.options.some((option) => option.optionId === "presence.object.garment-hanger"));
  assert.equal(planned.options.some((option) => option.status === "future-primitive"), false);

  const future = groups.find((group) => group.label === "Future Display Systems");
  assert.ok(future);
  assert.ok(future.options.some((option) => option.optionId === "presence.display.orbital-carousel"));
  assert.ok(future.options.some((option) => option.optionId === "presence.display.spherical-gallery"));

  const candidates = groups.find((group) => group.label === "Candidate Objects");
  assert.ok(candidates);
  for (const candidate of CANDIDATE_COMPONENT_OPTIONS) {
    assert.ok(candidates.options.some((option) => option.componentRef?.componentId === candidate.componentId), candidate.componentId);
  }
});

test("display labels are operator-facing while legacy option IDs remain valid", () => {
  const forbiddenNames = new Set([
    "Product Plinth",
    "Product Block",
    "Ribbed Showroom Wall",
    "Framed Media Surface",
    "Text / Sign Card",
    "Dark Boutique Shell",
  ]);
  for (const option of PRESENCE_OPTION_ALIASES) assert.equal(forbiddenNames.has(option.name), false, option.optionId);
  for (const kit of PRESENCE_ROOM_KIT_CONTAINERS) assert.equal(forbiddenNames.has(kit.name), false, kit.optionId);

  const legacyPlinth = resolvePresencePlacementOption({ optionId: "presence.surface.product-plinth", version: "0.1.0" });
  assert.equal(legacyPlinth.ok, true);
  if (!legacyPlinth.ok) return;
  assert.equal(legacyPlinth.option.name, "Display Plinth");
  assert.equal(legacyPlinth.componentRef.componentId, "presence.display-plinth");

  const legacyBlock = resolvePresencePlacementOption({ optionId: "presence.surface.product-block", version: "0.1.0" });
  assert.equal(legacyBlock.ok, true);
  if (!legacyBlock.ok) return;
  assert.equal(legacyBlock.option.name, "Display Block");
  assert.equal(legacyBlock.componentRef.componentId, "presence.product-display-block");
});

test("P0 option primitive aliases resolve and compile through generic procedural geometry", () => {
  for (const [optionId, componentId, status] of [
    ["presence.object.archive-wall", "presence.archive-wall", "available-now-procedural"],
    ["presence.object.listening-station", "presence.listening-station", "available-now-procedural"],
    ["presence.display.spherical-gallery", "presence.spherical-gallery", "internal-experimental"],
  ] as const) {
    const resolved = resolvePresencePlacementOption({ optionId, version: "0.1.0" });
    assert.equal(resolved.ok, true, optionId);
    if (!resolved.ok) continue;
    assert.equal(resolved.componentRef.componentId, componentId);
    assert.equal(resolved.option.status, status);
    assert.equal(resolved.option.admissionStatus, "not-admitted");
    assert.ok(resolved.option.warnings.includes("not production-ready"));

    const added = addArrangerOption(createBlankMobstarSpatialRoom(), optionId);
    assert.equal(added.ok, true, optionId);
    if (!added.ok) continue;
    const placement = added.room.placements.find((candidate) => candidate.optionRef?.optionId === optionId);
    assert.ok(placement, optionId);
    const compiled = compileSpatialRoom(added.room);
    assert.equal(compiled.ok, true, optionId);
    if (!compiled.ok) continue;
    const item = compiled.plan.items.find((candidate) => candidate.placementId === placement.id);
    assert.ok(item, optionId);
    assert.equal(item.componentKey, `${componentId}@1.0.0`);
    const template = createSpatialGeometryTemplate(item);
    assert.equal(template.source, "procedural-primitive", optionId);
    assert.ok(template.parts.length >= 4, optionId);
  }
});

test("P0 option primitives support media/action persistence and semantic fallback under payload budget", () => {
  let room = createBlankMobstarSpatialRoom();
  for (const optionId of [
    "presence.object.archive-wall",
    "presence.object.listening-station",
    "presence.display.spherical-gallery",
  ]) {
    const added = addArrangerOption(room, optionId);
    assert.equal(added.ok, true, optionId);
    if (!added.ok) return;
    room = added.room;
    const placement = room.placements.find((candidate) => candidate.optionRef?.optionId === optionId);
    assert.ok(placement, optionId);
    assert.equal(isArrangerMovablePlacement(placement), true, optionId);

    const media = assignArrangerMedia(room, placement.id, room.media[0]?.id ?? "");
    assert.equal(media.ok, true, optionId);
    if (!media.ok) return;
    room = media.room;
    const action = assignArrangerOpenLink(room, placement.id, `Open ${placement.semanticLabel}`, `https://example.com/${optionId.replaceAll(".", "-")}`);
    assert.equal(action.ok, true, optionId);
    if (!action.ok) return;
    room = action.room;
  }

  const compiled = compileSpatialRoom(room);
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;
  assert.ok(compiled.plan.componentKeys.includes("presence.archive-wall@1.0.0"));
  assert.ok(compiled.plan.componentKeys.includes("presence.listening-station@1.0.0"));
  assert.ok(compiled.plan.componentKeys.includes("presence.spherical-gallery@1.0.0"));
  assert.equal(compiled.plan.budgets.layoutJsonBytes < 100 * 1024, true);
  assert.equal(room.actions.filter((action) => action.kind === "open-link").length >= 3, true);
  assert.equal(room.semanticFallback.some((item) => item.actionRefs.length > 0), true);

  const envelopeJson = encodeSpatialDraftEnvelope(createSpatialDraftEnvelope(room));
  assert.equal(Buffer.byteLength(envelopeJson, "utf8") < 100 * 1024, true);
  assert.equal(/\.(?:blend|glb|gltf)(?:["?#]|$)/i.test(envelopeJson), false);
});

test("spherical gallery remains a free impossible-display primitive without wall requirement", () => {
  const resolved = resolvePresencePlacementOption({ optionId: "presence.display.spherical-gallery", version: "0.1.0" });
  assert.equal(resolved.ok, true);
  if (!resolved.ok) return;
  assert.equal(resolved.anchorKind, "free");
  assert.equal(resolved.option.status, "internal-experimental");
  assert.equal(resolved.option.placementType, "free");

  const added = addArrangerOption(createBlankMobstarSpatialRoom(), "presence.display.spherical-gallery");
  assert.equal(added.ok, true);
  if (!added.ok) return;
  const placement = added.room.placements.find((candidate) => candidate.optionRef?.optionId === "presence.display.spherical-gallery");
  assert.ok(placement);
  assert.equal(placement.anchor.kind, "free");
  assert.notEqual(placement.anchor.kind, "wall");
});

test("room-kit starter layouts compile and retain stable option refs", () => {
  for (const kitId of ["presence.roomkit.dark-boutique", "presence.roomkit.white-cube-gallery"]) {
    const result = createRoomFromPresenceRoomKitOption(kitId);
    assert.equal(result.ok, true, kitId);
    if (!result.ok) continue;
    const compiled = compileSpatialRoom(result.room);
    assert.equal(compiled.ok, true, kitId);
    if (!compiled.ok) continue;
    assert.equal(result.room.seed, `${kitId}@0.1.0`);
    assert.ok(result.room.placements.every((placement) => placement.optionRef), kitId);
    assert.ok(result.room.semanticFallback.length >= result.room.placements.length);
    assert.equal(compiled.plan.budgets.layoutJsonBytes < 100 * 1024, true);
    assert.equal(compiled.plan.budgets.eagerCompressedAssetBytes < 100 * 1024, true);
  }

  const deferredKit = resolvePresenceRoomKit({ optionId: "presence.roomkit.ribbed-concrete", version: "0.1.0" });
  assert.ok(deferredKit);
  assert.equal(deferredKit.status, "needs-art-pass");
  assert.equal(createRoomFromPresenceRoomKitOption("presence.roomkit.ribbed-concrete").ok, false);
});

test("saved layouts carry stable option refs without copying raw GLB or GLTF source paths", () => {
  let room = createBlankMobstarSpatialRoom();
  const added = addArrangerOption(room, "presence.surface.display-island");
  assert.equal(added.ok, true);
  if (!added.ok) return;
  room = added.room;
  const placement = room.placements.find((candidate) => candidate.optionRef?.optionId === "presence.surface.display-island");
  assert.ok(placement);
  assert.equal(placement.componentId, "presence.rounded-island");
  assert.equal(isArrangerMovablePlacement(placement), true);

  const envelopeJson = encodeSpatialDraftEnvelope(createSpatialDraftEnvelope(room));
  assert.equal(Buffer.byteLength(envelopeJson, "utf8") < 100 * 1024, true);
  assert.match(envelopeJson, /"optionRef"/);
  assert.match(envelopeJson, /"presence\.surface\.display-island"/);
  assert.equal(/\.(?:blend|glb|gltf)(?:["?#]|$)/i.test(envelopeJson), false);
});

test("option refs preserve fallback, media and action meaning through compilation", () => {
  let room = createBlankMobstarSpatialRoom();
  const added = addArrangerOption(room, "presence.surface.display-island");
  assert.equal(added.ok, true);
  if (!added.ok) return;
  room = added.room;
  const placement = room.placements.find((candidate) => candidate.optionRef?.optionId === "presence.surface.display-island");
  assert.ok(placement);

  const media = assignArrangerMedia(room, placement.id, room.media[0]?.id ?? "");
  assert.equal(media.ok, true);
  if (!media.ok) return;
  room = media.room;
  const action = assignArrangerOpenLink(room, placement.id, "Open option", "https://example.com/presence-option");
  assert.equal(action.ok, true);
  if (!action.ok) return;
  room = action.room;

  const compiled = compileSpatialRoom(room);
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;
  assert.ok(compiled.plan.semanticFallback.some((item) => item.label === placement.semanticLabel));
  assert.ok(room.actions.some((candidate) => candidate.kind === "open-link"));
  assert.ok(room.placements.some((candidate) => candidate.mediaRef || candidate.anchor.parentPlacementId === placement.id));
});

test("palette groups expose curated categories without introducing renderer fixture branches", async () => {
  const groups = presenceOptionPaletteGroups();
  assert.ok(groups.some((group) => group.label === "Walls & Dividers"));
  assert.ok(groups.some((group) => group.label === "Works & Media"));
  assert.ok(groups.some((group) => group.label === "Candidate Objects"));
  assert.ok(groups.some((group) => group.label === "Planned Options"));
  assert.ok(groups.some((group) => group.label === "Future Display Systems"));

  const renderer = await readFile(resolve("components/presence-spatial/ThreeSpatialRenderer.tsx"), "utf8");
  assert.equal(renderer.includes("presence.roomkit.dark-boutique"), false);
  assert.equal(renderer.includes("presence.surface.display-island"), false);
  assert.equal(renderer.includes("presence.candidate.stone-plinth"), false);
});
