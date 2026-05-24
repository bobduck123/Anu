import test from "node:test";
import assert from "node:assert/strict";
import { applyFontPack, applyOptionPack, updatePaletteToken } from "./canvasMutations.ts";
import { getOptionPack } from "../presence/option-packs/registry.ts";
import { getFontPack } from "../presence/typography/registry.ts";
import type { PresenceEditableConfig } from "../api/types.ts";

const base = {
  style_dna: { element_styles: { "hero-title": { size: "large" } }, palette: { accent: "#010101" } },
  motion_config: { reduced_motion_fallback: true },
  scene_config: { scenes: [{ id: "work_wall", title: "Works" }] },
} as PresenceEditableConfig;

test("option packs merge into draft without destroying authored element styles or scene copy", () => {
  const next = applyOptionPack(base, getOptionPack("paper-gallery")!);
  assert.deepEqual((next.style_dna?.element_styles as Record<string, unknown>)["hero-title"], { size: "large" });
  assert.equal((next.scene_config?.scenes as Array<Record<string, unknown>>)[0].title, "Works");
  assert.equal((next.scene_config?.scenes as Array<Record<string, unknown>>)[0].layout, "gallery-wall");
});

test("font packs write safe typography identities and palette inputs reject unsafe text", () => {
  const fontConfig = applyFontPack(base, getFontPack("soft-studio")!);
  const typography = fontConfig.style_dna?.typography as Record<string, unknown>;
  assert.equal(typography.heading_font_id, "instrument-serif");
  assert.equal(typography.body_font_id, "inter");
  assert.equal(updatePaletteToken(base, "accent", "url(javascript:bad)"), base);
  assert.equal((updatePaletteToken(base, "accent", "#abcdef").style_dna?.palette as Record<string, unknown>).accent, "#abcdef");
});
