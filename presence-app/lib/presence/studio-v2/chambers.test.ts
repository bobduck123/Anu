import assert from "node:assert/strict";
import test from "node:test";
import type { StudioV2Chamber, StudioV2ChamberRole } from "./model.ts";
import {
  getStudioV2ChambersByRole,
  getStudioV2DefaultChamber,
  getStudioV2EntryChamber,
  getStudioV2PublicChambers,
  normalizeStudioV2ChamberLayout,
  normalizeStudioV2ChamberMetadata,
  normalizeStudioV2ChamberRole,
  normalizeStudioV2ChamberTransition,
  normalizeStudioV2Chambers,
  withNormalizedStudioV2ChamberMetadata,
} from "./index.ts";

function makeChamber(overrides: Partial<StudioV2Chamber> & { metadata?: Record<string, unknown> } = {}): StudioV2Chamber {
  return {
    id: "chamber-1",
    label: "Test Chamber",
    objects: [],
    ...overrides,
    metadata: overrides.metadata
      ? normalizeStudioV2ChamberMetadata(overrides.metadata)
      : overrides.metadata === undefined
        ? undefined
        : normalizeStudioV2ChamberMetadata(overrides.metadata),
  };
}

function makeObject(overrides: { public?: boolean; mobile?: boolean } = {}): StudioV2Chamber["objects"][number] {
  return {
    id: "obj-1",
    type: "text",
    title: "Test object",
    visibility: { public: overrides.public ?? true, mobile: overrides.mobile ?? true },
    transform: { x: 0, y: 0, scale: 1, rotation: 0, zIndex: 1 },
    locked: false,
    pinned: false,
    ...overrides,
  } as StudioV2Chamber["objects"][number];
}

// ── Metadata normalization ──

test("valid role values pass normalization", () => {
  assert.equal(normalizeStudioV2ChamberRole("threshold"), "threshold");
  assert.equal(normalizeStudioV2ChamberRole("gallery"), "gallery");
  assert.equal(normalizeStudioV2ChamberRole("practice"), "practice");
  assert.equal(normalizeStudioV2ChamberRole("about"), "about");
  assert.equal(normalizeStudioV2ChamberRole("archive"), "archive");
  assert.equal(normalizeStudioV2ChamberRole("contact"), "contact");
  assert.equal(normalizeStudioV2ChamberRole("index"), "index");
  assert.equal(normalizeStudioV2ChamberRole("custom"), "custom");
});

test("invalid role falls back to custom", () => {
  assert.equal(normalizeStudioV2ChamberRole("unknown"), "custom");
  assert.equal(normalizeStudioV2ChamberRole(""), "custom");
  assert.equal(normalizeStudioV2ChamberRole(123), "custom");
  assert.equal(normalizeStudioV2ChamberRole(null), "custom");
  assert.equal(normalizeStudioV2ChamberRole(undefined), "custom");
  assert.equal(normalizeStudioV2ChamberRole({}), "custom");
});

test("role normalization is case-insensitive", () => {
  assert.equal(normalizeStudioV2ChamberRole("THRESHOLD"), "threshold");
  assert.equal(normalizeStudioV2ChamberRole("Gallery"), "gallery");
  assert.equal(normalizeStudioV2ChamberRole("  PRACTICE  "), "practice");
});

test("valid layout values pass normalization", () => {
  assert.equal(normalizeStudioV2ChamberLayout("stack"), "stack");
  assert.equal(normalizeStudioV2ChamberLayout("focus"), "focus");
  assert.equal(normalizeStudioV2ChamberLayout("grid"), "grid");
  assert.equal(normalizeStudioV2ChamberLayout("sequence"), "sequence");
  assert.equal(normalizeStudioV2ChamberLayout("wall"), "wall");
  assert.equal(normalizeStudioV2ChamberLayout("field"), "field");
});

test("invalid layout falls back to stack", () => {
  assert.equal(normalizeStudioV2ChamberLayout("unknown"), "stack");
  assert.equal(normalizeStudioV2ChamberLayout(""), "stack");
  assert.equal(normalizeStudioV2ChamberLayout(123), "stack");
  assert.equal(normalizeStudioV2ChamberLayout(null), "stack");
  assert.equal(normalizeStudioV2ChamberLayout(undefined), "stack");
});

test("valid transition values pass normalization", () => {
  assert.equal(normalizeStudioV2ChamberTransition("none"), "none");
  assert.equal(normalizeStudioV2ChamberTransition("fade"), "fade");
  assert.equal(normalizeStudioV2ChamberTransition("slide"), "slide");
  assert.equal(normalizeStudioV2ChamberTransition("recede"), "recede");
  assert.equal(normalizeStudioV2ChamberTransition("portal"), "portal");
  assert.equal(normalizeStudioV2ChamberTransition("snap"), "snap");
});

test("invalid transition falls back to none", () => {
  assert.equal(normalizeStudioV2ChamberTransition("unknown"), "none");
  assert.equal(normalizeStudioV2ChamberTransition(""), "none");
  assert.equal(normalizeStudioV2ChamberTransition(123), "none");
  assert.equal(normalizeStudioV2ChamberTransition(null), "none");
  assert.equal(normalizeStudioV2ChamberTransition(undefined), "none");
});

test("metadata normalization tolerates malformed input", () => {
  assert.deepEqual(normalizeStudioV2ChamberMetadata(null), {});
  assert.deepEqual(normalizeStudioV2ChamberMetadata(undefined), {});
  assert.deepEqual(normalizeStudioV2ChamberMetadata("string"), {});
  assert.deepEqual(normalizeStudioV2ChamberMetadata(123), {});
  assert.deepEqual(normalizeStudioV2ChamberMetadata([]), {});
});

test("metadata normalization preserves valid fields and drops invalid ones", () => {
  const result = normalizeStudioV2ChamberMetadata({
    role: "gallery",
    layout: "focus",
    transition: "portal",
    isEntry: true,
    isDefault: false,
    description: "A test chamber",
    unknownField: "should be dropped",
    nested: { key: "value" },
  });

  assert.equal(result.role, "gallery");
  assert.equal(result.layout, "focus");
  assert.equal(result.transition, "portal");
  assert.equal(result.isEntry, true);
  assert.equal(result.isDefault, false);
  assert.equal(result.description, "A test chamber");
  assert.equal("unknownField" in result, false);
  assert.equal("nested" in result, false);
});

test("metadata normalization normalizes invalid enum values", () => {
  const result = normalizeStudioV2ChamberMetadata({
    role: "invalid",
    layout: "invalid",
    transition: "invalid",
  });

  assert.equal(result.role, "custom");
  assert.equal(result.layout, "stack");
  assert.equal(result.transition, "none");
});

test("metadata description is trimmed", () => {
  assert.equal(normalizeStudioV2ChamberMetadata({ description: "  hello  " }).description, "hello");
});

test("boolean flags normalize safely", () => {
  assert.equal(normalizeStudioV2ChamberMetadata({ isEntry: true }).isEntry, true);
  assert.equal(normalizeStudioV2ChamberMetadata({ isEntry: false }).isEntry, false);
  assert.equal(normalizeStudioV2ChamberMetadata({ isEntry: "true" }).isEntry, undefined);
  assert.equal(normalizeStudioV2ChamberMetadata({ isEntry: 1 }).isEntry, undefined);

  assert.equal(normalizeStudioV2ChamberMetadata({ isDefault: true }).isDefault, true);
  assert.equal(normalizeStudioV2ChamberMetadata({ isDefault: false }).isDefault, false);
  assert.equal(normalizeStudioV2ChamberMetadata({ isDefault: "false" }).isDefault, undefined);
});

// ── Chamber normalization ──

test("chamber without metadata receives safe normalized behaviour", () => {
  const chamber = makeChamber({ metadata: undefined });
  const result = withNormalizedStudioV2ChamberMetadata(chamber);
  assert.equal(result.metadata, undefined);
  assert.equal(result.id, "chamber-1");
  assert.equal(result.label, "Test Chamber");
});

test("chamber with partial metadata is normalized", () => {
  const chamber = makeChamber({ metadata: { role: "gallery" } });
  const result = withNormalizedStudioV2ChamberMetadata(chamber);
  assert.equal(result.metadata?.role, "gallery");
  assert.equal(result.metadata?.layout, undefined);
  assert.equal(result.metadata?.transition, undefined);
  assert.equal(result.metadata?.isEntry, undefined);
});

test("chamber normalization tolerates malformed metadata", () => {
  const chamber = makeChamber({ metadata: "bad" as unknown as Record<string, unknown> });
  const result = withNormalizedStudioV2ChamberMetadata(chamber);
  assert.deepEqual(result.metadata, {});
});

test("input chamber is not mutated", () => {
  const chamber = makeChamber({ metadata: { role: "gallery" } });
  const before = JSON.stringify(chamber);
  withNormalizedStudioV2ChamberMetadata(chamber);
  assert.equal(JSON.stringify(chamber), before);
});

test("normalizeStudioV2Chambers preserves order", () => {
  const chambers: StudioV2Chamber[] = [
    makeChamber({ id: "a", label: "First" }),
    makeChamber({ id: "b", label: "Second" }),
    makeChamber({ id: "c", label: "Third" }),
  ];
  const result = normalizeStudioV2Chambers(chambers);
  assert.equal(result[0].id, "a");
  assert.equal(result[1].id, "b");
  assert.equal(result[2].id, "c");
});

test("normalizeStudioV2Chambers does not mutate input array", () => {
  const chambers = [makeChamber({ id: "a" }), makeChamber({ id: "b" })];
  const before = JSON.stringify(chambers);
  normalizeStudioV2Chambers(chambers);
  assert.equal(JSON.stringify(chambers), before);
});

// ── Entry/default derivation ──

test("explicit isEntry chamber wins", () => {
  const chambers: StudioV2Chamber[] = [
    makeChamber({ id: "first", metadata: { role: "threshold" } }),
    makeChamber({ id: "second", metadata: { isEntry: true } }),
  ];
  const entry = getStudioV2EntryChamber(chambers);
  assert.equal(entry?.id, "second");
});

test("role threshold is fallback entry when no explicit isEntry", () => {
  const chambers: StudioV2Chamber[] = [
    makeChamber({ id: "first", metadata: { role: "gallery" } }),
    makeChamber({ id: "second", metadata: { role: "threshold" } }),
  ];
  const entry = getStudioV2EntryChamber(chambers);
  assert.equal(entry?.id, "second");
});

test("first chamber is final fallback entry", () => {
  const chambers: StudioV2Chamber[] = [
    makeChamber({ id: "first" }),
    makeChamber({ id: "second" }),
  ];
  const entry = getStudioV2EntryChamber(chambers);
  assert.equal(entry?.id, "first");
});

test("empty chamber array returns undefined for entry", () => {
  assert.equal(getStudioV2EntryChamber([]), undefined);
});

test("explicit isDefault chamber wins", () => {
  const chambers: StudioV2Chamber[] = [
    makeChamber({ id: "first", metadata: { role: "threshold" } }),
    makeChamber({ id: "second", metadata: { isDefault: true } }),
  ];
  const def = getStudioV2DefaultChamber(chambers);
  assert.equal(def?.id, "second");
});

test("default falls back to entry chamber", () => {
  const chambers: StudioV2Chamber[] = [
    makeChamber({ id: "first", metadata: { isEntry: true } }),
    makeChamber({ id: "second" }),
  ];
  const def = getStudioV2DefaultChamber(chambers);
  assert.equal(def?.id, "first");
});

test("default falls back to first chamber when no entry or explicit default", () => {
  const chambers: StudioV2Chamber[] = [
    makeChamber({ id: "first" }),
    makeChamber({ id: "second" }),
  ];
  const def = getStudioV2DefaultChamber(chambers);
  assert.equal(def?.id, "first");
});

test("empty chamber array returns undefined for default", () => {
  assert.equal(getStudioV2DefaultChamber([]), undefined);
});

// ── Role helpers ──

test("getStudioV2ChambersByRole returns matching chambers", () => {
  const chambers: StudioV2Chamber[] = [
    makeChamber({ id: "a", metadata: { role: "gallery" } }),
    makeChamber({ id: "b", metadata: { role: "threshold" } }),
    makeChamber({ id: "c", metadata: { role: "gallery" } }),
  ];
  const galleries = getStudioV2ChambersByRole(chambers, "gallery");
  assert.equal(galleries.length, 2);
  assert.equal(galleries[0].id, "a");
  assert.equal(galleries[1].id, "c");
});

test("getStudioV2ChambersByRole returns empty array when no matches", () => {
  const chambers: StudioV2Chamber[] = [
    makeChamber({ id: "a", metadata: { role: "threshold" } }),
  ];
  const practices = getStudioV2ChambersByRole(chambers, "practice" as StudioV2ChamberRole);
  assert.equal(practices.length, 0);
});

test("getStudioV2ChambersByRole tolerates chambers without metadata", () => {
  const chambers: StudioV2Chamber[] = [
    makeChamber({ id: "a" }),
    makeChamber({ id: "b", metadata: { role: "gallery" } }),
  ];
  const galleries = getStudioV2ChambersByRole(chambers, "gallery");
  assert.equal(galleries.length, 1);
  assert.equal(galleries[0].id, "b");
});

// ── Public filtering ──

test("getStudioV2PublicChambers returns only chambers with at least one public object", () => {
  const chambers: StudioV2Chamber[] = [
    makeChamber({ id: "a", objects: [makeObject({ public: true })] }),
    makeChamber({ id: "b", objects: [makeObject({ public: false })] }),
    makeChamber({ id: "c", objects: [makeObject({ public: true }), makeObject({ public: false })] }),
  ];
  const publicChambers = getStudioV2PublicChambers(chambers);
  assert.equal(publicChambers.length, 2);
  assert.equal(publicChambers[0].id, "a");
  assert.equal(publicChambers[1].id, "c");
});

test("getStudioV2PublicChambers returns empty array when all objects hidden", () => {
  const chambers: StudioV2Chamber[] = [
    makeChamber({ id: "a", objects: [makeObject({ public: false })] }),
  ];
  assert.equal(getStudioV2PublicChambers(chambers).length, 0);
});

test("getStudioV2PublicChambers preserves chamber metadata", () => {
  const chambers: StudioV2Chamber[] = [
    makeChamber({ id: "a", metadata: { role: "gallery" }, objects: [makeObject({ public: true })] }),
  ];
  const publicChambers = getStudioV2PublicChambers(chambers);
  assert.equal(publicChambers[0].metadata?.role, "gallery");
});

test("getStudioV2PublicChambers normalizes metadata on output", () => {
  const chambers: StudioV2Chamber[] = [
    makeChamber({
      id: "a",
      metadata: { role: "INVALID" as StudioV2ChamberRole },
      objects: [makeObject({ public: true })],
    }),
  ];
  const publicChambers = getStudioV2PublicChambers(chambers);
  assert.equal(publicChambers[0].metadata?.role, "custom");
});
