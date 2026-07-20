// Presence Studio tests — manifest adapter + payload shape + label hygiene.
//
// Run with:
//   npx tsx lib/presence/studio/studio.test.ts

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { LOCAL_STUDIO_MANIFEST, findIdentity, findMovement, findWorld } from "./manifest";
import { buildSetupRequestPayload, type SetupFormFields } from "./useStudioState";
import { normaliseBackendManifest } from "./adapter";

// Repo-relative helpers (so the test can scan source files outside lib/).
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..", "..");
const STUDIO_COMPONENTS_DIR = join(repoRoot, "components", "presence", "studio");

// Word-boundary regexes so "Commission Card" doesn't trigger "mission c".
const BANNED_PATTERNS: RegExp[] = [
  /\bmanifest\b/i,
  /\bpayload\b/i,
  /\bschema\b/i,
  /\bdata marker\b/i,
  /\bcustomisation snapshot\b/i,
  /\bbrand pack\b/i,
  /\bmission [abc]\b/i,
  /\bchamber_walk\b/i,
  /\borbit_constellation\b/i,
  /\bobject_tableau\b/i,
  /\bportal_cascade\b/i,
  /\brooms-gallery-painter\b/i,
  /\brooms-underground-dj\b/i,
  /\brooms-material-carpenter\b/i,
];

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

console.log("\nPresence Studio — local manifest + adapter:\n");

it("local manifest has the four engagement dynamics mapped to friendly labels", () => {
  const m = LOCAL_STUDIO_MANIFEST;
  const movements = m.movements.map((mv) => mv.id);
  assert.deepEqual(movements.sort(), ["bench", "doors", "orbit", "rooms"]);
  // Backend IDs (Pass 4–6 internal vocabulary) are preserved on backendId only.
  assert.equal(m.movements.find((mv) => mv.id === "rooms")?.backendId, "chamber_walk");
  assert.equal(m.movements.find((mv) => mv.id === "orbit")?.backendId, "orbit_constellation");
  assert.equal(m.movements.find((mv) => mv.id === "bench")?.backendId, "object_tableau");
  assert.equal(m.movements.find((mv) => mv.id === "doors")?.backendId, "portal_cascade");
});

it("user-facing labels contain no banned internal terms", () => {
  const m = LOCAL_STUDIO_MANIFEST;
  const visibleStrings: string[] = [];
  function gather(obj: unknown) {
    if (typeof obj === "string") visibleStrings.push(obj);
    else if (Array.isArray(obj)) obj.forEach(gather);
    else if (obj && typeof obj === "object") {
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        // backendId / id are internal fields — skip them
        if (k === "backendId" || k === "id" || k === "version" || k === "source" || k === "demoHref") continue;
        gather(v);
      }
    }
  }
  gather(m);
  for (const s of visibleStrings) {
    for (const pattern of BANNED_PATTERNS) {
      assert.ok(
        !pattern.test(s),
        `User-facing string "${s}" matches banned internal pattern ${pattern}`,
      );
    }
  }
});

it("identity recommendations point to real worlds/movements", () => {
  const m = LOCAL_STUDIO_MANIFEST;
  for (const id of m.identities) {
    assert.ok(findWorld(m, id.recommended_world), `${id.id} recommended_world unknown`);
    assert.ok(findMovement(m, id.recommended_movement), `${id.id} recommended_movement unknown`);
  }
});

it("each demo route the studio links to has a corresponding backendId", () => {
  const m = LOCAL_STUDIO_MANIFEST;
  // The studio chooser surfaces these as 'demoHref' links. The
  // backend IDs must still be present so submission stays compatible.
  for (const w of m.worlds) {
    assert.ok(w.backendId.length > 0, `${w.id} missing backendId`);
  }
  for (const mv of m.movements) {
    assert.ok(mv.backendId.length > 0, `${mv.id} missing backendId`);
  }
});

console.log("\nSetup request payload shape:\n");

const sampleFields: SetupFormFields = {
  displayName: "Studio Lévy",
  contactName: "Anouk Lévy",
  email: "anouk@example.com",
  phone: "",
  whatYoureBuilding: "A quiet gallery for my watercolours and small commissions.",
  notes: "",
  doNotWants: "",
  references: ["", ""],
  consentToContact: true,
};

it("buildSetupRequestPayload maps human IDs to backend IDs", () => {
  const m = LOCAL_STUDIO_MANIFEST;
  const artist = findIdentity(m, "artist")!;
  const gallery = findWorld(m, "gallery")!;
  const rooms = findMovement(m, "rooms")!;
  const resolved = {
    identity: artist, world: gallery, movement: rooms,
    mood: m.moods[0], material: m.materials[0],
    pace: m.paces[0], contact: m.contacts[0],
    tone: "Plain",
  };
  const payload = buildSetupRequestPayload(sampleFields, resolved, m);
  assert.equal(payload.display_name, "Studio Lévy");
  assert.equal(payload.contact_name, "Anouk Lévy");
  assert.equal(payload.email, "anouk@example.com");
  // Backend-canonical IDs in payload (post Pass 8.1 — these match the
  // backend's customisation manifest v1, so the backend no longer needs
  // to remap normal Studio selections).
  assert.equal(payload.archetype, "artist");
  assert.equal(payload.room_world, "rooms-gallery-painter");
  assert.equal(payload.engagement_dynamic, "chamber_walk");
  assert.equal(payload.motion_profile, "calm");
  assert.equal(payload.object_skin_pack, "gallery_frame_pack");
  assert.equal(payload.atmosphere_pack, "quiet_gallery");
  assert.equal(payload.contact_style, "enquiry");
  assert.equal(payload.copy_tone, "Plain");
  assert.equal(payload.consent_to_contact, true);
  assert.equal(payload.customisation_manifest_version, m.version);
});

it("snapshot includes friendly labels for every chosen field", () => {
  const m = LOCAL_STUDIO_MANIFEST;
  const resolved = {
    identity: m.identities[0],
    world: m.worlds[0],
    movement: m.movements[0],
    mood: m.moods[0],
    material: m.materials[0],
    pace: undefined,
    contact: undefined,
    tone: null,
  };
  const payload = buildSetupRequestPayload(sampleFields, resolved, m);
  const snap = payload.customisation_snapshot as Record<string, { label?: string } | null>;
  assert.equal(snap.identity?.label, m.identities[0].label);
  assert.equal(snap.world?.label, m.worlds[0].label);
  assert.equal(snap.movement?.label, m.movements[0].label);
  assert.equal(snap.pace, null);
});

it("optional fields are omitted when empty", () => {
  const m = LOCAL_STUDIO_MANIFEST;
  const resolved = {
    identity: m.identities[0], world: m.worlds[0], movement: m.movements[0],
    mood: m.moods[0], material: m.materials[0],
    pace: undefined, contact: undefined, tone: null,
  };
  const payload = buildSetupRequestPayload(sampleFields, resolved, m);
  assert.equal(payload.phone, undefined);
  assert.equal(payload.notes, undefined);
  assert.equal(payload.do_not_wants, undefined);
  assert.equal(payload.references, undefined);
  assert.equal(payload.motion_profile, undefined);
});

it("payload sends backend-canonical IDs (not local human ids) for every selected slot", () => {
  const m = LOCAL_STUDIO_MANIFEST;
  // Pick local rows whose ids differ from their canonical backendIds so
  // the test fails loudly if anyone collapses the two back together.
  const sound = m.identities.find((x) => x.id === "sound")!;           // backendId "dj"
  const gallery = m.worlds.find((x) => x.id === "gallery")!;
  const rooms = m.movements.find((x) => x.id === "rooms")!;            // backendId "chamber_walk"
  const northLight = m.moods.find((x) => x.id === "north-light")!;     // backendId "quiet_gallery"
  const paperWall = m.materials.find((x) => x.id === "paper-wall")!;   // backendId "gallery_frame_pack"
  const still = m.paces.find((x) => x.id === "still")!;                // backendId "calm"
  const resolved = {
    identity: sound, world: gallery, movement: rooms,
    mood: northLight, material: paperWall, pace: still,
    contact: m.contacts[0], tone: "Plain",
  };
  const p = buildSetupRequestPayload(sampleFields, resolved, m);
  assert.equal(p.archetype, "dj", "archetype must be backend canonical, not local 'sound'");
  assert.equal(p.engagement_dynamic, "chamber_walk");
  assert.equal(p.motion_profile, "calm");
  assert.equal(p.atmosphere_pack, "quiet_gallery");
  assert.equal(p.object_skin_pack, "gallery_frame_pack");
  assert.equal(p.room_world, "rooms-gallery-painter");
});

it("payload includes selected_raw with the visitor's literal local-id picks", () => {
  const m = LOCAL_STUDIO_MANIFEST;
  const sound = m.identities.find((x) => x.id === "sound")!;
  const gallery = m.worlds.find((x) => x.id === "gallery")!;
  const rooms = m.movements.find((x) => x.id === "rooms")!;
  const northLight = m.moods.find((x) => x.id === "north-light")!;
  const paperWall = m.materials.find((x) => x.id === "paper-wall")!;
  const still = m.paces.find((x) => x.id === "still")!;
  const enquiry = m.contacts.find((x) => x.id === "enquiry")!;
  const resolved = { identity: sound, world: gallery, movement: rooms, mood: northLight, material: paperWall, pace: still, contact: enquiry, tone: "Editorial" };
  const p = buildSetupRequestPayload(sampleFields, resolved, m);
  const snap = p.customisation_snapshot as Record<string, unknown>;
  const raw = snap.selected_raw as Record<string, unknown>;
  // selected_raw uses LOCAL human ids (audit trail of what visitor literally picked)
  assert.equal(raw.archetype, "sound");
  assert.equal(raw.room_world, "gallery");
  assert.equal(raw.engagement_dynamic, "rooms");
  assert.equal(raw.motion_profile, "still");
  assert.equal(raw.atmosphere_pack, "north-light");
  assert.equal(raw.object_skin_pack, "paper-wall");
  assert.equal(raw.contact_style, "enquiry");
  assert.equal(raw.copy_tone, "Editorial");
});

it("selected_raw fields are null when no choice was made", () => {
  const m = LOCAL_STUDIO_MANIFEST;
  const resolved = {
    identity: undefined, world: undefined, movement: undefined,
    mood: undefined, material: undefined, pace: undefined, contact: undefined,
    tone: null,
  };
  const p = buildSetupRequestPayload(sampleFields, resolved, m);
  const raw = (p.customisation_snapshot as Record<string, unknown>).selected_raw as Record<string, unknown>;
  for (const k of ["archetype", "room_world", "engagement_dynamic", "motion_profile", "atmosphere_pack", "object_skin_pack", "contact_style", "copy_tone"]) {
    assert.equal(raw[k], null, `selected_raw.${k} should be null when nothing picked`);
  }
});

// ---------------------------------------------------------------------------
// Backend manifest adapter (Pass 8.1).
// ---------------------------------------------------------------------------

console.log("\nBackend manifest adapter (Pass 8.1):\n");

const FIXTURE_PATH = join(here, "__fixtures__", "backend-manifest-v1.json");
const backendFixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as { data: Record<string, unknown> };

it("normaliseBackendManifest accepts the live backend v1 fixture", () => {
  const m = normaliseBackendManifest(backendFixture.data);
  assert.ok(m, "expected manifest, got null");
  assert.equal(m!.source, "backend");
  assert.match(m!.version, /presence-customisation-manifest/);
  // Local rows preserved (not destroyed by merge)
  assert.equal(m!.identities.length, LOCAL_STUDIO_MANIFEST.identities.length);
  assert.equal(m!.worlds.length, LOCAL_STUDIO_MANIFEST.worlds.length);
  assert.equal(m!.movements.length, LOCAL_STUDIO_MANIFEST.movements.length);
});

it("normaliseBackendManifest preserves warm local labels (does not regress to backend bucket labels)", () => {
  const m = normaliseBackendManifest(backendFixture.data)!;
  // Local labels are authoritative — backend's coarser "Chamber Walk" /
  // "Underground DJ" / "Gallery Frame Pack" labels must NEVER overwrite
  // our editorial UI copy. Multiple local rows also collapse onto a
  // single backend canonical id (e.g. Cinematic + Editorial both map to
  // `quiet_gallery`); if the adapter blindly applied the backend label
  // those distinct moods would all be relabelled to "Quiet Gallery".
  const walk = m.movements.find((x) => x.backendId === "chamber_walk");
  assert.equal(walk?.label, "Walk the Rooms");
  const orbit = m.movements.find((x) => x.backendId === "orbit_constellation");
  assert.equal(orbit?.label, "Orbit the Work");
  const gallery = m.worlds.find((x) => x.backendId === "rooms-gallery-painter");
  assert.equal(gallery?.label, "The Quiet Gallery");
  const sound = m.worlds.find((x) => x.backendId === "rooms-underground-dj");
  assert.equal(sound?.label, "The Sound Room");
  // Multiple moods collapse onto quiet_gallery — each must keep its
  // distinct local label.
  const moodLabels = m.moods.map((x) => x.label);
  assert.ok(moodLabels.includes("North Light"));
  assert.ok(moodLabels.includes("Cinematic"));
  assert.ok(moodLabels.includes("Editorial"));
  // No technical backend label leaks.
  const bad = /^(Chamber Walk|Orbit Constellation|Object Tableau|Portal Cascade|Underground DJ|Material Carpenter|Gallery Painter|Gallery Frame Pack|Material Studio Pack|Signal Tile Pack)$/;
  const all = [...m.identities, ...m.worlds, ...m.movements, ...m.moods, ...m.paces, ...m.materials];
  for (const row of all) assert.doesNotMatch(row.label, bad, `label "${row.label}" is the technical backend label, not the friendly UI label`);
});

it("normaliseBackendManifest flips source to 'backend' and stamps the manifest version", () => {
  const m = normaliseBackendManifest(backendFixture.data)!;
  assert.equal(m.source, "backend");
  assert.equal(m.version, "presence-customisation-manifest-v1");
});

it("normaliseBackendManifest accepts the legacy UI-shaped manifest", () => {
  const legacy = {
    identities: [{ id: "artist", label: "Artist (legacy)" }],
    worlds: [{ id: "gallery", label: "Gallery (legacy)" }],
    movements: [{ id: "rooms", label: "Rooms (legacy)" }],
    version: "studio-v1-legacy-test",
  };
  const m = normaliseBackendManifest(legacy);
  assert.ok(m);
  assert.equal(m!.source, "backend");
  assert.equal(m!.identities[0].label, "Artist (legacy)");
  assert.equal(m!.worlds[0].label, "Gallery (legacy)");
});

it("normaliseBackendManifest returns null for malformed input (so caller falls back)", () => {
  assert.equal(normaliseBackendManifest(null), null);
  assert.equal(normaliseBackendManifest(undefined), null);
  assert.equal(normaliseBackendManifest("not an object"), null);
  assert.equal(normaliseBackendManifest({}), null, "empty object has no recognisable key");
  assert.equal(normaliseBackendManifest({ randomKey: 1 }), null);
});

it("normaliseBackendManifest tolerates missing optional canonical arrays", () => {
  // Backend only sends archetypes — every other slot should remain local fallback.
  const partial = {
    schema_version: "presence-customisation-manifest-v1",
    archetypes: backendFixture.data.archetypes,
  };
  const m = normaliseBackendManifest(partial)!;
  assert.equal(m.source, "backend");
  // The other slots are still populated from the local fallback
  assert.ok(m.worlds.length > 0);
  assert.ok(m.movements.length > 0);
  assert.ok(m.moods.length > 0);
});

it("every local backendId for canonical slots is present in the backend fixture", () => {
  // Catches drift: if anyone changes a local backendId so it no longer
  // matches the backend canonical set, this test fails loudly.
  const data = backendFixture.data;
  const backendIds = (arr: unknown, key: string): Set<string> => {
    const out = new Set<string>();
    if (Array.isArray(arr)) for (const row of arr) {
      const r = row as Record<string, unknown>;
      if (typeof r.id === "string") out.add(r.id);
    }
    if (out.size === 0) throw new Error(`fixture missing ${key}`);
    return out;
  };
  const archIds = backendIds(data.archetypes, "archetypes");
  const worldIds = backendIds(data.room_worlds, "room_worlds");
  const dynIds = backendIds(data.engagement_dynamics, "engagement_dynamics");
  const moodIds = backendIds(data.atmosphere_packs, "atmosphere_packs");
  const matIds = backendIds(data.object_skin_packs, "object_skin_packs");
  const paceIds = backendIds(data.motion_profiles, "motion_profiles");

  for (const id of LOCAL_STUDIO_MANIFEST.identities) assert.ok(archIds.has(id.backendId), `identity ${id.id} backendId ${id.backendId} missing from backend archetypes`);
  for (const w of LOCAL_STUDIO_MANIFEST.worlds) assert.ok(worldIds.has(w.backendId), `world ${w.id} backendId ${w.backendId} missing`);
  for (const mv of LOCAL_STUDIO_MANIFEST.movements) assert.ok(dynIds.has(mv.backendId), `movement ${mv.id} backendId ${mv.backendId} missing`);
  for (const m of LOCAL_STUDIO_MANIFEST.moods) assert.ok(moodIds.has(m.backendId), `mood ${m.id} backendId ${m.backendId} missing`);
  for (const m of LOCAL_STUDIO_MANIFEST.materials) assert.ok(matIds.has(m.backendId), `material ${m.id} backendId ${m.backendId} missing`);
  for (const p of LOCAL_STUDIO_MANIFEST.paces) assert.ok(paceIds.has(p.backendId), `pace ${p.id} backendId ${p.backendId} missing`);
});

// ---------------------------------------------------------------------------
// Component-source banned-term scan.
//
// The manifest test above scans manifest data. This test scans the actual
// .tsx files we ship to the visitor so a banned term cannot smuggle into a
// JSX literal (e.g. "Powered by chamber_walk" in a header). String literals
// inside imports, type annotations, and `data-*` attribute values are
// stripped before matching — those are internal and never reach the visitor.
// ---------------------------------------------------------------------------

console.log("\nComponent-source label hygiene:\n");

function walkTsx(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walkTsx(p));
    else if (name.endsWith(".tsx") || name.endsWith(".ts")) out.push(p);
  }
  return out;
}

// Component scan uses a tightened set of HIGH-SIGNAL patterns only.
// Single-word terms like "manifest" or "payload" are legitimate TypeScript
// identifiers (prop names, variable names) and would produce false positives
// without a full AST parse. The patterns below are unambiguous leaks if they
// appear anywhere in component source: backend ids contain underscores or
// dashes that never legitimately appear in English UI copy, and the multi-
// word internal phrases were coined inside this team and have no UI use.
const COMPONENT_BANNED_PATTERNS: RegExp[] = [
  /\bchamber_walk\b/i,
  /\borbit_constellation\b/i,
  /\bobject_tableau\b/i,
  /\bportal_cascade\b/i,
  /\brooms-gallery-painter\b/i,
  /\brooms-underground-dj\b/i,
  /\brooms-material-carpenter\b/i,
  /\bdata marker\b/i,
  /\bcustomisation snapshot\b/i,
  /\bbrand pack\b/i,
  /\bmission [abc]\b/i,
];

// Strip imports + comments before scanning so the kebab/underscore ids that
// legitimately appear in import paths (e.g. for adapter type imports) don't
// register. Anything in JSX text / props / template literals still gets seen.
function stripImportsAndComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/^\s*import[\s\S]*?;\s*$/gm, "");
}

it("component sources do not leak high-signal internal terms", () => {
  const files = walkTsx(STUDIO_COMPONENTS_DIR);
  assert.ok(files.length >= 6, `expected at least 6 studio component files, found ${files.length}`);
  const failures: string[] = [];
  for (const file of files) {
    const cleaned = stripImportsAndComments(readFileSync(file, "utf8"));
    for (const pattern of COMPONENT_BANNED_PATTERNS) {
      const m = cleaned.match(pattern);
      if (m) failures.push(`${file.replace(repoRoot, "")} → ${pattern} (token: "${m[0]}")`);
    }
  }
  assert.deepEqual(failures, [], `Component source leaks:\n  ${failures.join("\n  ")}`);
});

console.log(`\n${passed} Presence Studio tests passed ✓\n`);
