import assert from "node:assert/strict";
import test from "node:test";

import {
  canExposePublicDemoReference,
  canUsePublicDemoProfileFallback,
  isPubliclyContainedPresenceSlug,
} from "./publicContainment.ts";
import { demoProfileForSlug } from "./demo/profiles.ts";

test("GGM is contained only on anonymous public fallback paths", () => {
  assert.equal(isPubliclyContainedPresenceSlug("ggm-christina-goddard"), true);
  assert.equal(isPubliclyContainedPresenceSlug(" GGM-CHRISTINA-GODDARD "), true);
  assert.equal(canUsePublicDemoProfileFallback("ggm-christina-goddard"), false);
  assert.equal(canExposePublicDemoReference("ggm-christina-goddard"), false);
});

test("containment preserves non-GGM demos and retained GGM migration source", () => {
  assert.equal(isPubliclyContainedPresenceSlug("rooms-underground-dj"), false);
  assert.equal(canUsePublicDemoProfileFallback("rooms-underground-dj"), true);
  assert.ok(demoProfileForSlug("rooms-underground-dj"));
  assert.ok(demoProfileForSlug("ggm-christina-goddard"));
});
