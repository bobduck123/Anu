// Uniqueness assertions for the six Presence DNA demo rooms.
//
// HOW TO RUN
//   This file is type-checked by `npm run typecheck`. To execute the
//   assertions you need a TypeScript node runner. The simplest option:
//
//     npm i -D tsx
//     npx tsx lib/presence/uniqueness.test.ts
//
//   Exit code is 0 on success, 1 on any failure. Output lists every
//   pairwise comparison and any "too similar" warnings.
//
// WHY IT EXISTS
//   This is the guardrail behind the proof case: the two carpenter
//   rooms must not collapse into the same template. The script asserts
//   that no two of the six demo rooms cross the `TOO_SIMILAR_THRESHOLD`
//   and prints the most-similar pair so we always know where we're
//   closest to colour-swap territory.

import assert from "node:assert/strict";

import { demoProfileSlugs, demoProfileForSlug } from "./demo/profiles";
import { resolvePresenceDna } from "./dna/overlay";
import { deriveThemeGenome } from "./theme/genome";
import { ctaLabel, selectBlueprint } from "./blueprints/select";
import { fallbackBlueprint } from "./blueprints/registry";
import { pairwise, TOO_SIMILAR_THRESHOLD } from "./uniqueness";
import type { PresenceNode } from "@/lib/api/types";
import type { UniquenessInputs } from "./dna/types";

function uniquenessInputsFor(node: PresenceNode): UniquenessInputs {
  const dna = resolvePresenceDna(node);
  const theme = deriveThemeGenome(dna, node.accent_color ?? null);
  const blueprint = fallbackBlueprint(selectBlueprint(dna));

  const totalMedia = (node.works ?? []).length + (node.media_embeds ?? []).length;
  const media_density: UniquenessInputs["media_density"] =
    totalMedia >= 9 ? "high" : totalMedia >= 4 ? "medium" : "low";

  // Compose the canonical section order that the chosen blueprint
  // surfaces. Kept stable per-blueprint so comparisons are meaningful.
  const sectionOrderByBlueprint: Record<string, string[]> = {
    nocturnal_sonic: ["front", "audio", "wall", "archive", "booking"],
    glitch_gallery: ["front", "wall", "contact"],
    editorial_identity: ["hero", "story", "works", "cases", "proof", "contact"],
    material_studio: ["hero", "story", "works", "pathway", "proof", "contact"],
    trust_conversion: ["hero", "proof-wall", "services", "testimonials", "contact"],
    program: ["hero", "services", "pathway", "method", "booking"],
  };

  return {
    blueprint,
    section_order: sectionOrderByBlueprint[blueprint] ?? ["hero", "contact"],
    entry_type: dna.composition.entry_type,
    palette_mode: theme.palette_mode,
    typography_mode: theme.typography_mode,
    proof_density: dna.proof.proof_density,
    proof_position: dna.proof.proof_position,
    cta_label: ctaLabel(dna),
    media_density,
    signature_module: dna.signature.signature_module,
    motion_preset: theme.motion_preset,
    navigation_mode: dna.composition.navigation_mode,
    image_treatment: theme.image_treatment,
  };
}

function main() {
  const slugs = demoProfileSlugs();
  console.log(`\nUniqueness check across ${slugs.length} demo rooms:\n`);

  const map: Record<string, UniquenessInputs> = {};
  for (const slug of slugs) {
    const node = demoProfileForSlug(slug);
    assert.ok(node, `demo profile missing for ${slug}`);
    map[slug] = uniquenessInputsFor(node);
    console.log(`  ${slug.padEnd(28)} → blueprint=${map[slug].blueprint}, signature=${map[slug].signature_module}, motion=${map[slug].motion_preset}`);
  }

  const findings = pairwise(map);
  findings.sort((a, b) => b.report.score - a.report.score);

  console.log(`\nPairwise comparisons (threshold ${TOO_SIMILAR_THRESHOLD}):\n`);
  let failures = 0;
  for (const f of findings) {
    const tag = f.report.too_similar ? "TOO SIMILAR" : "ok";
    console.log(`  [${tag}] ${f.a} ~ ${f.b}  score=${f.report.score.toFixed(3)}`);
    if (f.report.too_similar) {
      failures += 1;
      for (const rec of f.report.recommendations) {
        console.log(`           → ${rec}`);
      }
    }
  }

  // Proof case: the two carpenters MUST land below threshold.
  const carpenters = findings.find(
    (f) =>
      (f.a === "rooms-material-carpenter" && f.b === "rooms-local-carpenter") ||
      (f.b === "rooms-material-carpenter" && f.a === "rooms-local-carpenter"),
  );
  assert.ok(carpenters, "carpenter pairwise comparison missing");
  assert.ok(
    !carpenters.report.too_similar,
    `PROOF CASE FAILED: material-carpenter and local-carpenter scored ${carpenters.report.score.toFixed(3)} — should be < ${TOO_SIMILAR_THRESHOLD}`,
  );

  // Whole-set assertion: no two rooms may cross the threshold.
  assert.equal(failures, 0, `${failures} room pair(s) above similarity threshold`);

  console.log("\nAll pairs distinct. Proof case passes. ✓\n");
}

main();
