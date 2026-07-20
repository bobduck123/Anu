// One-shot hosted verification script (Pass 8.1).
//
// Hits the live backend manifest, runs it through the adapter,
// and prints the resulting StudioManifest source + labels so we can
// see whether the adapter correctly flips data-source to "backend"
// and never lets technical labels leak.
//
//   npx tsx lib/presence/studio/_hosted_verify.ts

import { normaliseBackendManifest } from "./adapter";

async function main() {
  const res = await fetch("https://anu-back-end.vercel.app/api/presence/customisation/manifest");
  const body = await res.json() as { data?: unknown };
  const m = normaliseBackendManifest(body.data ?? body);
  if (!m) {
    console.error("ADAPTER REJECTED backend manifest — would fall back to local.");
    process.exit(1);
  }
  console.log("source:    ", m.source);
  console.log("version:   ", m.version);
  console.log("identities:", m.identities.length, "—", m.identities.map((x) => x.label).join(" / "));
  console.log("worlds:    ", m.worlds.length, "—", m.worlds.map((x) => x.label).join(" / "));
  console.log("movements: ", m.movements.length, "—", m.movements.map((x) => x.label).join(" / "));
  console.log("moods:     ", m.moods.length, "—", m.moods.map((x) => x.label).join(" / "));
  console.log("paces:     ", m.paces.length, "—", m.paces.map((x) => x.label).join(" / "));
  console.log("materials: ", m.materials.length, "—", m.materials.map((x) => x.label).join(" / "));
  // Confirm no technical labels leak into user-facing strings.
  const bad = /\b(chamber_walk|orbit_constellation|object_tableau|portal_cascade|quiet_gallery|gallery_frame_pack|nocturnal_signal|warm_material|material_studio_pack|signal_tile_pack|rooms-gallery-painter|rooms-underground-dj|rooms-material-carpenter|Chamber Walk|Orbit Constellation|Object Tableau|Portal Cascade|Gallery Frame Pack|Underground DJ|Material Carpenter)\b/;
  const allLabels = [
    ...m.identities, ...m.worlds, ...m.movements,
    ...m.moods, ...m.paces, ...m.materials,
  ].map((x) => x.label);
  const leaks = allLabels.filter((l) => bad.test(l));
  console.log("leaks:     ", leaks.length === 0 ? "none ✓" : leaks);
  if (leaks.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error("hosted verify failed:", err);
  process.exit(1);
});
