// Presence Graph copy hygiene tests.
//
// Run with:
//   npx tsx lib/presence/graph/copy.test.ts

import assert from "node:assert/strict";

import {
  PATH_DIRECTION_LABELS,
  PRESENCE_GRAPH_COPY,
  ROOM_KEY_TYPE_LABELS,
  ROOM_KEY_USE_HINTS,
  pathDirectionLabel,
  roomKeyTypeLabel,
  roomKeyUseHint,
} from "./copy.ts";

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

console.log("\nPresence Graph copy hygiene:\n");

it("canonical copy uses real apostrophes (no 'Youve' / 'youre' / 'cant' artefacts)", () => {
  for (const [key, value] of Object.entries(PRESENCE_GRAPH_COPY)) {
    // Detect a common-word contraction that's missing its apostrophe — these
    // creep in via straight ASCII edits and look bad on the splash surface.
    const broken = /\b(youve|youre|youll|youd|cant|wont|dont|isnt|hasnt|its|theyve|theyre)\b/gi;
    const m = value.match(broken);
    assert.equal(m, null, `PRESENCE_GRAPH_COPY.${key} contains an apostrophe-less contraction: ${m?.join(", ")}`);
  }
});

it("canonical copy never exposes a raw backend ID", () => {
  // The brief explicitly banned these in user-facing UI.
  const banned = [
    /\bchamber_walk\b/i,
    /\borbit_constellation\b/i,
    /\bobject_tableau\b/i,
    /\bportal_cascade\b/i,
    /\bquiet_gallery\b/i,
    /\bgallery_frame_pack\b/i,
    /\bnocturnal_signal\b/i,
    /\bwarm_material\b/i,
    /\bcustomisation_snapshot\b/i,
    /\bnfc_card\b/i,
    /\brooms-gallery-painter\b/i,
  ];
  for (const [key, value] of Object.entries(PRESENCE_GRAPH_COPY)) {
    for (const pattern of banned) {
      assert.doesNotMatch(value, pattern, `PRESENCE_GRAPH_COPY.${key} leaks raw backend ID "${pattern}"`);
    }
  }
});

it("canonical copy uses the exact product lines the brief mandates", () => {
  assert.equal(PRESENCE_GRAPH_COPY.roomEntry, "You’ve entered this Room.");
  assert.equal(PRESENCE_GRAPH_COPY.observerUpgrade, "Create an Observer Mask to remember this Room.");
  assert.equal(PRESENCE_GRAPH_COPY.moodBoard, "Mood Boards are maps of taste.");
  assert.equal(PRESENCE_GRAPH_COPY.paths, "Choose a direction.");
  assert.match(PRESENCE_GRAPH_COPY.world, /The World is forming\./);
});

console.log("\nDirection label humanisation:\n");

it("pathDirectionLabel returns a warm phrase for every documented direction", () => {
  // The brief names these six direction families explicitly.
  const checks: Record<string, string> = {
    place: "Follow the place",
    mood: "Follow the mood",
    influence: "Follow the influences",
    similar_rooms: "Follow similar Rooms",
    people: "Follow people who saved this",
    surprise: "Surprise me",
  };
  for (const [input, expected] of Object.entries(checks)) {
    assert.equal(pathDirectionLabel(input), expected, `direction "${input}" should humanise to "${expected}"`);
  }
});

it("pathDirectionLabel falls back to a humanised raw value (no crash, no underscores)", () => {
  assert.equal(pathDirectionLabel("unknown_direction"), "unknown direction");
  assert.equal(pathDirectionLabel(null), "Choose a direction");
  assert.equal(pathDirectionLabel(undefined), "Choose a direction");
});

it("PATH_DIRECTION_LABELS never returns a bare backend-style key", () => {
  for (const [key, label] of Object.entries(PATH_DIRECTION_LABELS)) {
    assert.doesNotMatch(label, /_/, `direction label for "${key}" still contains an underscore: "${label}"`);
  }
});

console.log("\nRoom Key type humanisation:\n");

it("roomKeyTypeLabel returns warm labels for every common key type", () => {
  assert.equal(roomKeyTypeLabel("nfc"), "NFC Card");
  assert.equal(roomKeyTypeLabel("nfc_card"), "NFC Card");
  assert.equal(roomKeyTypeLabel("qr"), "QR Code");
  assert.equal(roomKeyTypeLabel("qr_poster"), "QR Poster");
  assert.equal(roomKeyTypeLabel("badge"), "Event Badge");
  assert.equal(roomKeyTypeLabel("event_badge"), "Event Badge");
  assert.equal(roomKeyTypeLabel("sticker"), "Sticker");
  assert.equal(roomKeyTypeLabel("business_card"), "Business Card");
  assert.equal(roomKeyTypeLabel("short_link"), "Direct Share");
  assert.equal(roomKeyTypeLabel("direct"), "Direct Share");
  assert.equal(roomKeyTypeLabel("wallet"), "Wallet");
});

it("roomKeyTypeLabel falls back to a title-cased value, never an empty string", () => {
  assert.equal(roomKeyTypeLabel("custom_thing"), "Custom Thing");
  assert.equal(roomKeyTypeLabel(null), "Direct Share");
  assert.equal(roomKeyTypeLabel(""), "Direct Share");
});

it("roomKeyUseHint returns practical microcopy for every key type", () => {
  // Each hint should be a sentence telling the owner where to put the URL.
  for (const [key, hint] of Object.entries(ROOM_KEY_USE_HINTS)) {
    assert.ok(hint.length > 20, `hint for "${key}" is suspiciously short: "${hint}"`);
    assert.match(hint, /[.!?]$/, `hint for "${key}" must end in punctuation`);
  }
});

it("roomKeyUseHint falls back without crashing on unknown / null key", () => {
  assert.ok(roomKeyUseHint("unknown").length > 10);
  assert.ok(roomKeyUseHint(null).length > 10);
  assert.ok(roomKeyUseHint(undefined).length > 10);
});

it("ROOM_KEY_TYPE_LABELS never exposes a bare backend-style key", () => {
  for (const [key, label] of Object.entries(ROOM_KEY_TYPE_LABELS)) {
    assert.doesNotMatch(label, /_/, `key-type label for "${key}" still contains an underscore: "${label}"`);
  }
});

console.log(`\n${passed} Presence Graph copy tests passed ✓\n`);
