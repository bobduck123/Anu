import test from "node:test";
import assert from "node:assert/strict";
import { resolveRenderModel } from "./resolver.ts";
import type { PresenceNode } from "../../api/types.ts";

function ggmNode(overrides: Partial<PresenceNode> = {}): PresenceNode {
  return {
    id: 11,
    slug: "ggm-christina-goddard",
    display_name: "Christina Kerkvliet Goddard",
    node_type: "creative",
    display_mode: "artist_gallery",
    status: "published",
    visibility: "public",
    renderer_key: "ggm-faithful-room-v1",
    headline: "Selected watercolour works",
    bio: "Born in Victoria…",
    ...overrides,
  } as PresenceNode;
}

test("empty node renders canonical fallbacks (mode=published)", () => {
  const model = resolveRenderModel(ggmNode(), "published");
  assert.equal(model.mode, "published");
  assert.equal(model.empty, true);
  assert.equal(model.identity.displayName.provenance, "node");
  assert.equal(model.identity.displayName.value, "Christina Kerkvliet Goddard");
  // No published config — but renderer still has a meaningful model
  // to fall back on.
  assert.equal(model.scenes.length, 4);
  assert.equal(model.scenes[0].id, "field");
  assert.equal(model.scenes[3].id, "card");
  // Hero slides fall back to canonical 8 GGM works.
  assert.ok(model.hero.slides.length > 0, "hero should have canonical slides");
});

test("draft mode reads draft config even when status is draft", () => {
  const node = ggmNode({
    editable_config: {
      id: 1,
      room_id: 11,
      status: "draft",
      schema_version: "presence-editable-config-v1",
      renderer_key: "ggm-faithful-room-v1",
      content_config: { display_name: "Draft Name" },
      scene_config: { scenes: [{ id: "artwork_field", title: "Draft title" }] },
      style_dna: {},
      motion_config: {},
      asset_config: {},
      roomkey_config: {},
      enquiry_config: {},
      locked_fields: {},
    } as never,
  });
  const draftModel = resolveRenderModel(node, "draft");
  assert.equal(draftModel.identity.displayName.value, "Draft Name");
  assert.equal(draftModel.identity.displayName.provenance, "authored");
  const fieldScene = draftModel.scenes.find((s) => s.id === "field");
  const titleWidget = fieldScene?.widgets.find((w) => w.type === "hero-title");
  assert.equal((titleWidget?.config as { text: string }).text, "Draft title");
});

test("published mode rejects draft status", () => {
  const node = ggmNode({
    editable_config: {
      id: 1,
      room_id: 11,
      status: "draft",
      renderer_key: "ggm-faithful-room-v1",
      content_config: { display_name: "Should not appear" },
    } as never,
  });
  const publicModel = resolveRenderModel(node, "published");
  // Public mode should NOT see the draft — falls back to node.display_name.
  assert.notEqual(publicModel.identity.displayName.value, "Should not appear");
});

test("authored palette overrides node fallback (provenance flags)", () => {
  const node = ggmNode({
    editable_config: {
      id: 1,
      room_id: 11,
      status: "published",
      renderer_key: "ggm-faithful-room-v1",
      style_dna: { palette: { bg: "#000000" } },
      content_config: {},
      scene_config: { scenes: [] },
      motion_config: {},
      asset_config: {},
      roomkey_config: {},
      enquiry_config: {},
      locked_fields: {},
    } as never,
  });
  const model = resolveRenderModel(node, "published");
  assert.equal(model.palette.bg.value, "#000000");
  assert.equal(model.palette.bg.provenance, "authored");
  // Untouched fields stay canonical.
  assert.equal(model.palette.paper.provenance, "canonical");
});

test("widget instances expose provenance for Canvas editor", () => {
  const node = ggmNode({
    editable_config: {
      id: 1,
      room_id: 11,
      status: "published",
      renderer_key: "ggm-faithful-room-v1",
      scene_config: { scenes: [{ id: "artwork_field", title: "My title" }] },
      content_config: {},
      style_dna: {},
      motion_config: {},
      asset_config: {},
      roomkey_config: {},
      enquiry_config: {},
      locked_fields: {},
    } as never,
  });
  const model = resolveRenderModel(node, "published");
  const fieldScene = model.scenes.find((s) => s.id === "field");
  const titleWidget = fieldScene?.widgets.find((w) => w.type === "hero-title");
  assert.equal(titleWidget?.provenance, "authored");
  const captionWidget = fieldScene?.widgets.find((w) => w.type === "hero-caption");
  assert.equal(captionWidget?.provenance, "node");
});

test("non-GGM renderer falls through to generic model without throwing", () => {
  const node = ggmNode({ renderer_key: "unknown-renderer" });
  const model = resolveRenderModel(node, "published");
  assert.equal(model.identity.rendererKey, "unknown-renderer");
  assert.equal(model.scenes.length, 0);
  // Provenance summary populated.
  assert.ok(model.provenanceSummary.canonical > 0);
});

test("resolved hero imagery, fonts and RoomKey copy come from the selected draft only", () => {
  const node = ggmNode({
    editable_config: {
      status: "draft",
      renderer_key: "ggm-faithful-room-v1",
      asset_config: { hero_image: { url: "/draft-cover.webp", alt_text: "Draft cover" } },
      style_dna: { typography: { heading_stack: "Georgia, serif", heading_font_id: "georgia" } },
      roomkey_config: { provenance_chip_text: "Opened through my card" },
    } as never,
  });
  const draft = resolveRenderModel(node, "draft");
  assert.equal(draft.hero.slides[0].asset.url, "/draft-cover.webp");
  assert.equal(draft.typography.headingFontId.value, "georgia");
  assert.equal(draft.roomKey.provenanceChipText.value, "Opened through my card");
  const published = resolveRenderModel(node, "published");
  assert.notEqual(published.hero.slides[0].asset.url, "/draft-cover.webp");
  assert.notEqual(published.roomKey.provenanceChipText.value, "Opened through my card");
});

test("motion values are safely resolved once rather than silently changed in the renderer", () => {
  const capped = resolveRenderModel(ggmNode({
    editable_config: {
      status: "published",
      renderer_key: "ggm-faithful-room-v1",
      motion_config: { liquid_intensity: 0.95, distortion_scale: 0.9, heavy_motion_enabled: false },
    } as never,
  }), "published");
  assert.equal(capped.motion.requestedLiquidIntensity, 0.95);
  assert.equal(capped.motion.liquidIntensity.value, 0.58);
  assert.equal(capped.motion.safetyCapApplied, true);
  const immersive = resolveRenderModel(ggmNode({
    editable_config: {
      status: "published",
      renderer_key: "ggm-faithful-room-v1",
      motion_config: { liquid_intensity: 0.95, distortion_scale: 0.9, heavy_motion_enabled: true },
    } as never,
  }), "published");
  assert.equal(immersive.motion.liquidIntensity.value, 0.95);
  assert.equal(immersive.motion.safetyCapApplied, false);
});
