import test from "node:test";
import assert from "node:assert/strict";

import { createSpatialGeometryTemplate } from "../../../components/presence-spatial/threeGeometryCache.ts";
import {
  ARRANGER_COMPONENT_OPTIONS,
  ARRANGER_CORE_COMPONENT_OPTIONS,
  addArrangerComponent,
  arrangerComponentCapabilityTags,
  createBlankMobstarSpatialRoom,
} from "./arranger.ts";
import { compileSpatialRoom } from "./compile.ts";
import { spatialAuthoringMaterialSlots, SPATIAL_COMPONENT_CATALOG } from "./registry.ts";

test("the complete authoring palette renders through reusable procedural component references", () => {
  const blank = createBlankMobstarSpatialRoom();
  for (const option of ARRANGER_COMPONENT_OPTIONS) {
    const added = addArrangerComponent(blank, option.componentId);
    assert.equal(added.ok, true, option.componentId);
    if (!added.ok) continue;
    const placement = added.room.placements.find((candidate) => (
      candidate.componentId === option.componentId && candidate.version === option.version
    ));
    assert.ok(placement, option.componentId);
    const compiled = compileSpatialRoom(added.room);
    assert.equal(compiled.ok, true, option.componentId);
    if (!compiled.ok) continue;
    const item = compiled.plan.items.find((candidate) => candidate.placementId === placement.id);
    assert.ok(item, option.componentId);
    const template = createSpatialGeometryTemplate(item);
    assert.equal(template.source, "procedural-primitive", option.componentId);
    assert.ok(template.parts.length > 0, option.componentId);
    assert.equal(item.componentKey, `${option.componentId}@${option.version}`);
  }
});

test("authoring palette capability tags derive from registered component metadata", () => {
  const table = ARRANGER_COMPONENT_OPTIONS.find((option) => option.componentId === "presence.display-table");
  const frame = ARRANGER_COMPONENT_OPTIONS.find((option) => option.componentId === "presence.framed-media");
  const light = ARRANGER_COMPONENT_OPTIONS.find((option) => option.componentId === "presence.light-fixture");
  assert.ok(table);
  assert.ok(frame);
  assert.ok(light);

  assert.deepEqual(arrangerComponentCapabilityTags(table).filter((tag) => tag.endsWith("placeable")), ["floor-placeable"]);
  assert.ok(arrangerComponentCapabilityTags(table).includes("surface-host"));
  assert.ok(arrangerComponentCapabilityTags(table).includes("media-capable"));
  assert.ok(arrangerComponentCapabilityTags(table).includes("material-slots"));
  assert.ok(arrangerComponentCapabilityTags(table).includes("proxy-only"));
  assert.ok(arrangerComponentCapabilityTags(table).includes("fallback-safe"));

  assert.deepEqual(arrangerComponentCapabilityTags(frame).filter((tag) => tag.endsWith("placeable")), ["wall-placeable"]);
  assert.ok(arrangerComponentCapabilityTags(frame).includes("media-capable"));
  assert.ok(arrangerComponentCapabilityTags(frame).includes("action-capable"));

  assert.equal(arrangerComponentCapabilityTags(light).includes("surface-host"), false);
  assert.equal(arrangerComponentCapabilityTags(light).includes("media-capable"), false);
  assert.ok(arrangerComponentCapabilityTags(light).includes("skin-capable"));
});

test("component quality round keeps priority authoring components inspectable and non-placeholder", () => {
  const minimumTemplateParts = new Map([
    ["presence.wall-panel@1.0.0", 6],
    ["presence.divider-wall@1.0.0", 6],
    ["presence.display-table@1.0.0", 5],
    ["presence.retail-rack@1.0.0", 6],
    ["presence.display-plinth@1.0.0", 5],
    ["presence.projection-wall@1.0.0", 6],
    ["presence.rounded-island@1.0.0", 6],
    ["presence.display-shelf@1.0.0", 10],
    ["presence.framed-media@1.0.0", 6],
    ["presence.text-sign-card@1.0.0", 2],
    ["presence.product-display-block@1.0.0", 4],
    ["presence.light-fixture@1.0.0", 5],
    ["presence.drape-divider@1.0.0", 9],
  ]);
  const mediaSurfaceKeys = new Set([
    "presence.wall-panel@1.0.0",
    "presence.projection-wall@1.0.0",
    "presence.framed-media@1.0.0",
    "presence.text-sign-card@1.0.0",
  ]);

  for (const option of ARRANGER_CORE_COMPONENT_OPTIONS) {
    const room = addArrangerComponent(createBlankMobstarSpatialRoom(), option.componentId);
    assert.equal(room.ok, true, option.componentId);
    if (!room.ok) continue;
    const placement = room.room.placements.find((candidate) => (
      candidate.componentId === option.componentId && candidate.version === option.version
    ));
    assert.ok(placement, option.componentId);
    const compiled = compileSpatialRoom(room.room);
    assert.equal(compiled.ok, true, option.componentId);
    if (!compiled.ok) continue;
    const item = compiled.plan.items.find((candidate) => candidate.placementId === placement.id);
    assert.ok(item, option.componentId);

    const template = createSpatialGeometryTemplate(item);
    const componentKey = `${option.componentId}@${option.version}`;
    assert.ok(
      template.parts.length >= (minimumTemplateParts.get(componentKey) ?? 1),
      `${componentKey} exposes layered procedural geometry`,
    );
    const renderedSlots = new Set(template.parts.map((templatePart) => templatePart.materialSlot).filter(Boolean));
    for (const slot of spatialAuthoringMaterialSlots(option)) {
      assert.ok(renderedSlots.has(slot), `${componentKey} renders authorable material slot ${slot}`);
    }
    if (mediaSurfaceKeys.has(componentKey)) {
      assert.ok(template.parts.some((templatePart) => templatePart.mediaSurface), `${componentKey} keeps a media surface`);
    }
  }
});

test("new baseline components remain internal candidates rather than admitted assets", () => {
  const componentIds = new Set([
    "presence.display-shelf",
    "presence.text-sign-card",
    "presence.product-display-block",
    "presence.light-fixture",
    "presence.drape-divider",
  ]);
  const records = SPATIAL_COMPONENT_CATALOG.filter((record) => componentIds.has(record.componentId));
  assert.equal(records.length, componentIds.size);
  for (const record of records) {
    assert.equal(record.assetStrategy, "presence-authored-procedural");
    assert.equal(record.creativeStatus, "prototype");
    assert.equal(record.admissionStatus, "not-evaluated");
    assert.equal(record.rawAssetIncluded, false);
  }
});
