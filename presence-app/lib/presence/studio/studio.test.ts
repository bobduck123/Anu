// Presence Studio tests — manifest adapter + payload shape + label hygiene.
//
// Run with:
//   npx tsx lib/presence/studio/studio.test.ts

import assert from "node:assert/strict";

import { LOCAL_STUDIO_MANIFEST, findIdentity, findMovement, findWorld } from "./manifest";
import { buildSetupRequestPayload, type SetupFormFields } from "./useStudioState";

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
  // Backend IDs in payload
  assert.equal(payload.archetype, "artist");
  assert.equal(payload.room_world, "rooms-gallery-painter");
  assert.equal(payload.engagement_dynamic, "chamber_walk");
  assert.equal(payload.motion_profile, "still");
  assert.equal(payload.object_skin_pack, "paper-wall");
  assert.equal(payload.atmosphere_pack, "north-light");
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

console.log(`\n${passed} Presence Studio tests passed ✓\n`);
