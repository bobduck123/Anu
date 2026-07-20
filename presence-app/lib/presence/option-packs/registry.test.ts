import test from "node:test";
import assert from "node:assert/strict";
import { optionPacksForPilot, optionPackToConfigPatch } from "./registry.ts";

test("pilot option packs expose only publicly rendered layout tokens", () => {
  const packs = optionPacksForPilot();
  assert.deepEqual(packs.map((pack) => pack.id), ["paper-gallery", "ink-room"]);
  assert.ok(packs.every((pack) => pack.layout.scenes.wall === "gallery-wall"));
  assert.ok(packs.every((pack) => pack.publicRendererSupport));
});

test("option pack typography includes loader identities without font binaries", () => {
  const patch = optionPackToConfigPatch(optionPacksForPilot()[0]);
  const typography = patch.style_dna.typography as Record<string, unknown>;
  assert.equal(typography.heading_font_id, "inter-tight");
  assert.equal(typeof typography.body_stack, "string");
});
