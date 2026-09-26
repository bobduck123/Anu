import test from "node:test";
import assert from "node:assert/strict";

import { compileSpatialRoom } from "./compile.ts";
import { requireSpatialLightingProfile, SPATIAL_LIGHTING_PROFILES } from "./lighting.ts";
import {
  materialPresetMatchesSlot,
  SPATIAL_MATERIAL_PRESETS,
  SPATIAL_MATERIAL_SLOTS,
  SPATIAL_MATERIAL_STYLE_PRESETS,
} from "./materials.ts";
import { spatialComponentCatalogMetadata } from "./registry.ts";
import { createSpatialDraftEnvelope } from "./storage.ts";
import { SPATIAL_LAYOUT_JSON_BUDGET_BYTES, validateSpatialRoomDefinition } from "./validate.ts";
import { ALPHA_GARMENT_RACK_FIXTURE } from "./fixtures/alphaGarmentRack.ts";

const PROFILE_ID = "lookbook-rack-warm";
const LOOKBOOK_PRESETS = [
  "rack-lookbook-steel",
  "wall-lookbook-graphite",
  "floor-lookbook-slate",
  "tabletop-lookbook-riser",
] as const;

test("the lookbook rack lighting profile exists and resolves", () => {
  const profile = requireSpatialLightingProfile(PROFILE_ID);
  assert.equal(profile.id, PROFILE_ID);
  assert.ok(profile.lights.length >= 3, "a readable rack needs key, fill and ambient at minimum");
  assert.ok(profile.toneMappingExposure > 0 && profile.toneMappingExposure < 2);
  assert.match(profile.background, /^#[0-9a-f]{6}$/i);

  for (const light of profile.lights) {
    assert.ok(light.intensity > 0, `${light.id} must contribute light`);
    assert.match(light.color, /^#[0-9a-f]{6}$/i, light.id);
  }
});

test("the rack lighting profile is reusable rather than pinned to one fixture", () => {
  const profile = requireSpatialLightingProfile(PROFILE_ID);

  // This is the substantive anti-hardcoding guarantee, not just a naming rule.
  // Spot and point lights only illuminate what sits near their world position,
  // so a profile built from them silently belongs to one room's coordinates —
  // which is exactly what `boutique-product-warm` is. Hemisphere, ambient and
  // directional lights are position-independent in effect, so this profile
  // lights a rack correctly wherever that rack stands.
  for (const light of profile.lights) {
    assert.ok(
      light.kind === "hemisphere" || light.kind === "ambient" || light.kind === "directional",
      `${light.id} is a ${light.kind}, which pins the profile to one fixture's coordinates`,
    );
    assert.equal(light.distance, undefined, `${light.id} must not depend on a falloff distance`);
  }

  // And it must not be named for, or scoped to, a single client.
  const serialised = JSON.stringify(profile).toLowerCase();
  for (const client of ["mobstar", "bbb", "ggm"]) {
    assert.ok(!serialised.includes(client), `the profile must stay generic (found "${client}")`);
  }
});

test("a black garment cannot fall to pure black under the rack profile", () => {
  const profile = requireSpatialLightingProfile(PROFILE_ID);
  // Ambient plus the hemisphere ground term is what keeps a dark garment from
  // disappearing into the background instead of keeping its silhouette.
  const ambient = profile.lights.find((light) => light.kind === "ambient");
  assert.ok(ambient, "the profile needs an ambient term");
  assert.ok(ambient.intensity >= 0.2, "ambient is too weak to hold a dark garment");

  const hemisphere = profile.lights.find((light) => light.kind === "hemisphere");
  assert.ok(hemisphere?.groundColor, "the hemisphere needs a lifted ground colour");
  assert.notEqual(hemisphere.groundColor.toLowerCase(), "#000000");
});

test("the lookbook material presets exist, match their slots and stay reusable", () => {
  for (const id of LOOKBOOK_PRESETS) {
    const preset = SPATIAL_MATERIAL_PRESETS[id];
    assert.ok(preset, `${id} must be registered`);
    assert.equal(materialPresetMatchesSlot(preset.slot, id), true, id);
    assert.match(preset.baseColor, /^#[0-9a-f]{6}$/i, id);
    assert.ok(preset.roughness >= 0 && preset.roughness <= 1, id);
    assert.ok(preset.metalness >= 0 && preset.metalness <= 1, id);
    // No heavy treatment: these are flat presets, not textured or emissive.
    assert.equal(preset.emissive, undefined, `${id} must not glow`);
  }
});

test("the lookbook rack metal is lightable without an environment map", () => {
  // The defect this preset exists to fix: `rack-matte-black` is nearly black at
  // metalness 0.86, and this renderer has no environment map, so a strongly
  // metallic surface has nothing to reflect and renders as a black silhouette —
  // rail, uprights and every hanger vanish. A metalness the direct lights can
  // actually model is what makes rack hardware readable.
  const steel = SPATIAL_MATERIAL_PRESETS["rack-lookbook-steel"];
  assert.ok(steel.metalness < 0.5, `metalness ${steel.metalness} is too high to read without an env map`);

  const brightness = Number.parseInt(steel.baseColor.slice(1, 3), 16);
  assert.ok(brightness > 0x30, "rack metal needs a base colour the lights can pick up");

  // But hardware must not become the loudest thing in frame: it stays darker
  // than the pale display surfaces it used to be brighter than.
  const riser = SPATIAL_MATERIAL_PRESETS["tabletop-lookbook-riser"];
  const riserBrightness = Number.parseInt(riser.baseColor.slice(1, 3), 16);
  assert.ok(
    riserBrightness < Number.parseInt(SPATIAL_MATERIAL_PRESETS["tabletop-warm-stone"].baseColor.slice(1, 3), 16),
    "the rack riser must be subordinate to the garments, not the brightest surface in frame",
  );
});

test("the lookbook rack style resolves every material slot", () => {
  const style = SPATIAL_MATERIAL_STYLE_PRESETS["lookbook-rack"];
  assert.ok(style);
  assert.deepEqual(Object.keys(style.slotPresets).sort(), [...SPATIAL_MATERIAL_SLOTS].sort());
  for (const slot of SPATIAL_MATERIAL_SLOTS) {
    assert.equal(materialPresetMatchesSlot(slot, style.slotPresets[slot]), true, slot);
  }
});

test("the alpha garment rack fixture uses the lookbook treatment", () => {
  assert.equal(ALPHA_GARMENT_RACK_FIXTURE.lightingProfileId, PROFILE_ID);

  const skin = ALPHA_GARMENT_RACK_FIXTURE.skins[0];
  assert.equal(skin.materialPresets["rack-metal"], "rack-lookbook-steel");
  assert.equal(skin.materialPresets.wall, "wall-lookbook-graphite");
  assert.equal(skin.materialPresets.floor, "floor-lookbook-slate");
  assert.equal(skin.materialPresets.tabletop, "tabletop-lookbook-riser");

  // The treatment must reach the compiled plan, not just the room definition.
  const compiled = compileSpatialRoom(ALPHA_GARMENT_RACK_FIXTURE);
  assert.equal(compiled.ok, true, compiled.ok ? "" : JSON.stringify(compiled.issues));
  if (!compiled.ok) return;
  assert.equal(compiled.plan.lighting.id, PROFILE_ID);

  const rack = compiled.plan.items.find((item) => item.placementId === "garment-rack");
  assert.ok(rack);
  assert.equal(rack.materials.find((material) => material.slot === "rack-metal")?.presetId, "rack-lookbook-steel");
  // The large rack riser renders on the tabletop slot; it must be the subdued one.
  assert.equal(rack.materials.find((material) => material.slot === "tabletop")?.presetId, "tabletop-lookbook-riser");
});

test("the treated fixture keeps every garment and its artwork intact", () => {
  assert.equal(validateSpatialRoomDefinition(ALPHA_GARMENT_RACK_FIXTURE).ok, true);
  const compiled = compileSpatialRoom(ALPHA_GARMENT_RACK_FIXTURE);
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;

  const garments = compiled.plan.items.filter((item) => item.garment);
  assert.equal(garments.length, 6, "lighting work must not change the content");
  assert.equal(garments.filter((item) => item.garment?.missingArtwork === true).length, 1);
  // Artwork still resolves; a lighting pass must never quietly drop media.
  assert.equal(
    garments.filter((item) => item.garment?.frontMedia ?? item.garment?.displayMedia).length,
    5,
  );
});

test("the lighting treatment changes no payload or admission behaviour", () => {
  const json = JSON.stringify(createSpatialDraftEnvelope(ALPHA_GARMENT_RACK_FIXTURE, "2026-08-20T00:00:00.000Z"));

  assert.ok(!json.includes("data:image"), "no inline image payloads");
  assert.ok(!/data:[a-z]+\/[a-z0-9.+-]+;base64/i.test(json), "no data: URLs");
  assert.ok(!/\.(?:glb|gltf)\b/i.test(json), "no raw model paths");
  assert.ok(!json.toLowerCase().includes("presence pieces"), "no source garment folder path");
  assert.ok(Buffer.byteLength(json, "utf8") < SPATIAL_LAYOUT_JSON_BUDGET_BYTES);

  // Materials and lighting are referenced by id; no material payload is inlined.
  assert.ok(json.includes("lookbook-rack-warm"));
  assert.ok(json.includes("rack-lookbook-steel"));

  for (const placement of ALPHA_GARMENT_RACK_FIXTURE.placements) {
    assert.notEqual(
      spatialComponentCatalogMetadata(placement)?.admissionStatus,
      "admitted",
      `${placement.componentId} must remain an internal candidate`,
    );
  }
});

test("existing lighting profiles are unchanged by this pass", () => {
  // The new profile is additive. Rooms that never asked for it must render
  // exactly as before, so the shared defaults stay put.
  assert.equal(SPATIAL_LIGHTING_PROFILES["spatial-core-neutral"].toneMappingExposure, 0.95);
  assert.equal(SPATIAL_LIGHTING_PROFILES["spatial-core-neutral"].background, "#111318");
  assert.equal(SPATIAL_LIGHTING_PROFILES["gallery-soft"].background, "#e4e1d9");
  assert.equal(SPATIAL_LIGHTING_PROFILES["boutique-product-warm"].toneMappingExposure, 1.34);

  // And the material presets other fixtures depend on are untouched.
  assert.equal(SPATIAL_MATERIAL_PRESETS["rack-matte-black"].baseColor, "#101114");
  assert.equal(SPATIAL_MATERIAL_PRESETS["rack-matte-black"].metalness, 0.86);
  assert.equal(SPATIAL_MATERIAL_PRESETS["wall-charcoal"].baseColor, "#111214");
  assert.equal(SPATIAL_MATERIAL_PRESETS["floor-dark-stone"].baseColor, "#17181a");
  assert.equal(SPATIAL_MATERIAL_PRESETS["tabletop-warm-stone"].baseColor, "#bdb7aa");
});
