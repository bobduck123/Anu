import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { BBB_PROJECTION_WALL_FIXTURE } from "./fixtures/bbbProjectionWall.ts";
import { MOBSTAR_SPATIAL_ROOM_FIXTURE } from "./fixtures/mobstar.ts";
import { createSpatialDraftEnvelope } from "./storage.ts";

const FIXED_SAVED_AT = "2026-08-17T00:00:00.000Z";

test("checked-in saved-layout envelopes byte-match deterministic fixture generation", async (t) => {
  const cases = [
    {
      name: "mobstar",
      fixture: MOBSTAR_SPATIAL_ROOM_FIXTURE,
      file: "../../../docs/program/evidence/presence-spatial-object-model-shift/saved-layouts/mobstar-spatial-draft-v1.json",
    },
    {
      name: "bbb",
      fixture: BBB_PROJECTION_WALL_FIXTURE,
      file: "../../../docs/program/evidence/presence-spatial-object-model-shift/saved-layouts/bbb-projection-wall-draft-v1.json",
    },
  ] as const;

  for (const item of cases) {
    await t.test(item.name, () => {
      const expected = `${JSON.stringify(createSpatialDraftEnvelope(item.fixture, FIXED_SAVED_AT), null, 2)}\n`;
      const checkedIn = readFileSync(new URL(item.file, import.meta.url), "utf8");
      assert.equal(checkedIn, expected);
    });
  }
});

test("BBB public media byte declarations match the real checked-in PNG files", () => {
  for (const asset of BBB_PROJECTION_WALL_FIXTURE.assets) {
    assert.equal(asset.locator.startsWith("public:"), true);
    const publicPath = asset.locator.slice("public:".length);
    const file = new URL(`../../../public/${publicPath}`, import.meta.url);
    assert.equal(statSync(file).size, asset.compressedBytes, asset.id);
  }
});
