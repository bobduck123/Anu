import { BBB_PROJECTION_WALL_FIXTURE } from "../lib/presence/spatial/fixtures/bbbProjectionWall.ts";
import { MOBSTAR_SPATIAL_ROOM_FIXTURE } from "../lib/presence/spatial/fixtures/mobstar.ts";
import { createSpatialDraftEnvelope } from "../lib/presence/spatial/storage.ts";

const fixtureName = process.argv[2];
const fixture = fixtureName === "mobstar"
  ? MOBSTAR_SPATIAL_ROOM_FIXTURE
  : fixtureName === "bbb"
    ? BBB_PROJECTION_WALL_FIXTURE
    : undefined;

if (!fixture) {
  throw new Error("Usage: npx tsx scripts/generate-spatial-layout-evidence.ts <mobstar|bbb>");
}

const envelope = createSpatialDraftEnvelope(fixture, "2026-08-17T00:00:00.000Z");
process.stdout.write(`${JSON.stringify(envelope, null, 2)}\n`);
