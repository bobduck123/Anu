import assert from "node:assert/strict";
import test from "node:test";

import { fallbackBlueprint } from "../blueprints/registry";
import { selectBlueprint } from "../blueprints/select";
import { demoProfileForSlug, demoProfileSlugs } from "../demo/profiles";
import { deriveThemeGenome } from "../theme/genome";
import { resolvePresenceDna } from "./overlay";

const EXPECTED_SIGNATURES: Record<string, string> = {
  "rooms-underground-dj": "glitch_gallery",
  "rooms-gallery-painter": "gallery_wall",
  "rooms-material-carpenter": "materials_board",
  "rooms-local-carpenter": "before_after_slider",
  "rooms-community-healer": "ritual_booking_panel",
  "rooms-sharp-consultant": "quote_oracle",
  "ggm-christina-goddard": "archive_wall",
};

test("all local demo slugs resolve Presence DNA from fixture-backed metadata, not overlays", () => {
  assert.deepEqual(new Set(demoProfileSlugs()), new Set(Object.keys(EXPECTED_SIGNATURES)));

  for (const slug of demoProfileSlugs()) {
    const node = demoProfileForSlug(slug);
    assert.ok(node, `demo profile missing for ${slug}`);
    const persisted = (node.metadata as { presence_dna?: unknown } | null | undefined)?.presence_dna;
    assert.ok(persisted && typeof persisted === "object", `${slug} must carry metadata.presence_dna`);

    const dna = resolvePresenceDna(node);
    assert.equal(dna.source, "backend_persisted", `${slug} must resolve from metadata.presence_dna`);
    assert.equal(dna.signature.signature_module, EXPECTED_SIGNATURES[slug]);
  }
});

test("GGM resolves cultural-community DNA from persisted metadata without demo overlay injection", () => {
  const node = demoProfileForSlug("ggm-christina-goddard");
  assert.ok(node);

  const dna = resolvePresenceDna(node);
  const theme = deriveThemeGenome(dna, node.accent_color ?? null);
  const blueprint = fallbackBlueprint(selectBlueprint(dna));

  assert.equal(dna.source, "backend_persisted");
  assert.equal(dna.practice.field, "culture");
  assert.equal(dna.practice.practice_mode, "program");
  assert.equal(dna.composition.entry_type, "archive_first");
  assert.equal(dna.composition.navigation_mode, "story_path");
  assert.equal(dna.visual.palette_mode, "cultural");
  assert.equal(dna.visual.image_treatment, "archive");
  assert.equal(dna.signature.signature_module, "archive_wall");
  assert.equal(dna.goal.primary_goal, "grant_readiness");
  assert.equal(theme.motion_preset, "editorial_snap");
  assert.equal(blueprint, "program");
});
