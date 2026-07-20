import assert from "node:assert/strict";
import test from "node:test";

import { fontLoaderHref, fontPacksForPilot, fontsForPilot } from "./registry.ts";

test("pilot typography exposes only approved choices", () => {
  assert.ok(fontsForPilot().every((font) => font.pilotSafe));
  assert.ok(fontPacksForPilot().every((pack) => pack.pilotSafe));
  assert.equal(fontsForPilot().some((font) => font.id === "caveat"), false);
});

test("font loader uses the curated stylesheet endpoint without bundled font assets", () => {
  assert.equal(fontLoaderHref("system-sans", "georgia"), null);

  const href = fontLoaderHref("instrument-serif", "inter");
  assert.ok(href?.startsWith("https://fonts.googleapis.com/css2?"));
  assert.match(href ?? "", /Instrument\+Serif/);
  assert.match(href ?? "", /Inter/);
  assert.doesNotMatch(href ?? "", /\.(woff2?|ttf|otf)(?:$|\?)/i);
});
