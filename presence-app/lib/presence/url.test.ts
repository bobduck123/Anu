// Presence public URL tests.
//
// Run with:
//   npx tsx lib/presence/url.test.ts

import assert from "node:assert/strict";

import { activePresenceOrigin } from "./url.ts";

let passed = 0;
function it(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`  PASS ${name}`);
  } catch (err) {
    console.log(`  FAIL ${name}`);
    console.error(err);
    process.exit(1);
  }
}

console.log("\nPresence URL helpers:\n");

it("remaps the retired production frontend origin", () => {
  assert.equal(
    activePresenceOrigin("https://presence-gilt.vercel.app"),
    "https://your-presence.vercel.app",
  );
});

it("trims trailing slashes and preserves the active origin", () => {
  assert.equal(
    activePresenceOrigin("https://your-presence.vercel.app///"),
    "https://your-presence.vercel.app",
  );
});

console.log(`\n${passed} URL helper tests passed.`);
