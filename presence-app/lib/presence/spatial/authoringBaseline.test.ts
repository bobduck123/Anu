import test from "node:test";
import assert from "node:assert/strict";

import { createSpatialGeometryTemplate } from "../../../components/presence-spatial/threeGeometryCache.ts";
import {
  ARRANGER_COMPONENT_OPTIONS,
  addArrangerComponent,
  createBlankMobstarSpatialRoom,
} from "./arranger.ts";
import { compileSpatialRoom } from "./compile.ts";
import { SPATIAL_COMPONENT_CATALOG } from "./registry.ts";

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
