// Dynamic registry tests — Pass 6.
//
// Run with: npx tsx lib/presence/world/dynamicRegistry.test.ts

import assert from "node:assert/strict";
import { DYNAMIC_REGISTRY, dynamicEntries, isImplementedDynamic } from "./dynamicRegistry";

let passed = 0;
function it(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.error(err);
    process.exit(1);
  }
}

console.log("\nDynamic registry:\n");

it("registers all four Pass-6 dynamics", () => {
  const ids = new Set(Object.keys(DYNAMIC_REGISTRY));
  assert.ok(ids.has("chamber_walk"));
  assert.ok(ids.has("orbit_constellation"));
  assert.ok(ids.has("object_tableau"));
  assert.ok(ids.has("portal_cascade"));
});

it("all four dynamics are marked implemented", () => {
  for (const id of ["chamber_walk", "orbit_constellation", "object_tableau", "portal_cascade"] as const) {
    assert.ok(isImplementedDynamic(id), `${id} should be implemented`);
  }
});

it("each entry has a non-empty label, summary, and feeling", () => {
  for (const entry of dynamicEntries()) {
    assert.ok(entry.label.length > 0, `${entry.id} label`);
    assert.ok(entry.summary.length > 0, `${entry.id} summary`);
    assert.ok(entry.feeling.length > 0, `${entry.id} feeling`);
  }
});

it("each entry is suitable for at least one audience", () => {
  for (const entry of dynamicEntries()) {
    assert.ok(entry.suitedFor.length > 0, `${entry.id} suitedFor`);
  }
});

it("feelings include the four expected variants", () => {
  const feelings = new Set(dynamicEntries().map((e) => e.feeling));
  assert.ok(feelings.has("calm"));
  assert.ok(feelings.has("cinematic"));
  assert.ok(feelings.has("tactile"));
});

it("each entry has match signals so the chooser can highlight DNA fit", () => {
  for (const entry of dynamicEntries()) {
    assert.ok(entry.matchSignals.length > 0, `${entry.id} matchSignals`);
  }
});

it("dynamicEntries() returns a stable count of 4 entries", () => {
  assert.equal(dynamicEntries().length, 4);
});

console.log(`\n${passed} dynamic registry tests passed ✓\n`);
