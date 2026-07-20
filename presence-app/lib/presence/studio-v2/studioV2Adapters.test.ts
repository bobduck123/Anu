import assert from "node:assert/strict";
import test from "node:test";
import type { PresenceEditableConfig, PresenceNode } from "../../api/types.ts";
import { findRestrictedPublicPayloadKeys } from "../render/publicPayload.ts";
import {
  DEFAULT_STUDIO_V2_SKIN,
  DEFAULT_STUDIO_V2_TRANSFORM,
  PRESENCE_STUDIO_V2_RENDERER_KEY,
  PRESENCE_STUDIO_V2_SCHEMA_VERSION,
  findStudioV2PublicPayloadLeaks,
  isStudioV2PresenceConfig,
  normalizeTransform,
  presenceConfigFromStudioV2State,
  publicRoomFromStudioV2State,
  safeAssetPath,
  safePublicUrl,
  sanitizeStudioV2PublicPayload,
  shouldUsePresenceStudioV2,
  studioV2FromPresenceConfig,
  type StudioV2State,
  type StudioV2Transform,
} from "./index.ts";

function node(overrides: Partial<PresenceNode> = {}): PresenceNode {
  return {
    id: 42,
    slug: "mara-vale-studio",
    display_name: "Mara Vale Studio",
    headline: "Painter and image-maker",
    bio: "Saltwater memory and private commissions",
    node_type: "artist",
    display_mode: "artist_gallery",
    status: "published",
    visibility: "public",
    renderer_key: PRESENCE_STUDIO_V2_RENDERER_KEY,
    primary_cta_label: "Enquire about available work",
    primary_cta_url: "https://example.com/enquire",
    ...overrides,
  } as PresenceNode;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function studioState(): StudioV2State {
  return {
    schemaVersion: PRESENCE_STUDIO_V2_SCHEMA_VERSION,
    rendererKey: PRESENCE_STUDIO_V2_RENDERER_KEY,
    roomId: "42",
    slug: "mara-vale-studio",
    title: "Mara Vale Studio",
    tagline: "Painter and image-maker",
    worldId: "gallery",
    publicStylePreset: "gallery-p2",
    skin: {
      ...DEFAULT_STUDIO_V2_SKIN,
      accentColor: "#8f6f3f",
      objectRadius: 12,
    },
    cta: {
      label: "Enquire about available work",
      href: "https://example.com/enquire",
    },
    chambers: [
      {
        id: "current-works",
        label: "Current Works",
        objects: [
          {
            id: "work-1",
            type: "image",
            role: "work",
            title: "Bridle Road, after rain",
            meta: "Oil, ground pigment, linen",
            detail: "Part of the Hinterland Weather series.",
            image: { src: "/images/bridle-road.webp", alt: "Oil painting on linen" },
            visibility: { public: true, mobile: true },
            transform: { x: 24, y: -12, scale: 1.1, rotation: -2, zIndex: 4 },
            locked: true,
            pinned: true,
          },
          {
            id: "draft-note",
            type: "note",
            title: "Private install note",
            detail: "Owner-only handling note",
            visibility: { public: false, mobile: false },
            transform: DEFAULT_STUDIO_V2_TRANSFORM,
            locked: false,
            pinned: false,
          },
        ],
      },
    ],
    moodboardRefs: [
      {
        id: "mood-1",
        type: "place",
        label: "Creek road after 4pm",
        detail: "warm shadow, eucalyptus dust",
      },
    ],
    traces: {
      enabled: true,
      demo: true,
      disclosure: "Demo traces",
      entries: 318,
      seeds: 27,
      guestbook: 6,
      guestbookEntries: ["This finally feels like seeing the work in a real room."],
    },
    mobileRecovery: {
      transformsSuspendedOnMobile: true,
      strategy: "suspend-mobile-transforms",
      safeRecoveryAppliedAt: "2026-06-03T00:00:00.000Z",
    },
  };
}

test("Studio V2 state maps into existing nested Presence editable config sections", () => {
  const input = presenceConfigFromStudioV2State(studioState(), {
    renderer_key: "legacy-renderer",
    scene_config: { existing_scene_key: true },
    content_config: { existing_content_key: true },
  } as PresenceEditableConfig);

  assert.equal(input.renderer_key, PRESENCE_STUDIO_V2_RENDERER_KEY);
  assert.equal(input.scene_config?.existing_scene_key, true);
  assert.equal(input.content_config?.existing_content_key, true);
  assert.ok(input.scene_config?.studio_v2);
  assert.ok(input.style_dna?.studio_v2);
  assert.ok(input.motion_config?.studio_v2);
  assert.ok(input.asset_config?.studio_v2);
  assert.ok(input.content_config?.studio_v2);
  assert.ok(input.roomkey_config?.studio_v2);
  assert.ok(input.enquiry_config?.studio_v2);
});

test("Studio V2 config round-trips through the adapter without losing owner edit state", () => {
  const editable = {
    ...presenceConfigFromStudioV2State(studioState(), null),
    status: "draft",
  } as PresenceEditableConfig;

  assert.equal(isStudioV2PresenceConfig(editable), true);
  const restored = studioV2FromPresenceConfig(editable, node());

  assert.equal(restored.worldId, "gallery");
  assert.equal(restored.publicStylePreset, "gallery-p2");
  assert.equal(restored.title, "Mara Vale Studio");
  assert.equal(restored.chambers[0].objects[0].locked, true);
  assert.equal(restored.chambers[0].objects[0].pinned, true);
  assert.equal(restored.chambers[0].objects[0].transform.x, 24);
  assert.equal(restored.moodboardRefs[0].label, "Creek road after 4pm");
  assert.equal(restored.traces.disclosure, "Demo traces");
});

test("public Studio V2 projection strips editor state and hidden public objects", () => {
  const publicRoom = publicRoomFromStudioV2State(studioState());
  const serialized = JSON.stringify(publicRoom);

  assert.equal(publicRoom.chambers[0].objects.length, 1);
  assert.equal(publicRoom.publicStylePreset, "gallery-p2");
  assert.equal(publicRoom.chambers[0].objects[0].id, "work-1");
  assert.equal(publicRoom.chambers[0].objects[0].transform.x, 0);
  assert.equal(serialized.includes("draft-note"), false);
  assert.equal(serialized.includes("locked"), false);
  assert.equal(serialized.includes("pinned"), false);
  assert.equal(serialized.includes("hiddenPublic"), false);
  assert.equal(serialized.includes("hiddenMobile"), false);
  assert.deepEqual(findStudioV2PublicPayloadLeaks(publicRoom, { allowDemoTraces: true }), []);
  assert.deepEqual(findRestrictedPublicPayloadKeys(publicRoom), []);
});

test("Studio V2 public style preset round-trips through style DNA safely", () => {
  const state: StudioV2State = {
    ...studioState(),
    publicStylePreset: "christina-liquid-gallery",
  };
  const editable = presenceConfigFromStudioV2State(state, null) as PresenceEditableConfig;

  assert.equal(record(record(editable.style_dna).studio_v2).publicStylePreset, "christina-liquid-gallery");

  const restored = studioV2FromPresenceConfig(editable, node());
  const publicRoom = publicRoomFromStudioV2State(restored);

  assert.equal(restored.publicStylePreset, "christina-liquid-gallery");
  assert.equal(publicRoom.publicStylePreset, "christina-liquid-gallery");
  assert.deepEqual(findStudioV2PublicPayloadLeaks(publicRoom, { allowDemoTraces: true }), []);
  assert.deepEqual(findRestrictedPublicPayloadKeys(publicRoom), []);
});

test("bbbvision public style preset round-trips through style DNA safely", () => {
  const state: StudioV2State = {
    ...studioState(),
    publicStylePreset: "bbbvision-threshold-gallery",
  };
  const editable = presenceConfigFromStudioV2State(state, null) as PresenceEditableConfig;

  assert.equal(record(record(editable.style_dna).studio_v2).publicStylePreset, "bbbvision-threshold-gallery");

  const restored = studioV2FromPresenceConfig(editable, node());
  const publicRoom = publicRoomFromStudioV2State(restored);

  assert.equal(restored.publicStylePreset, "bbbvision-threshold-gallery");
  assert.equal(publicRoom.publicStylePreset, "bbbvision-threshold-gallery");
  assert.deepEqual(findStudioV2PublicPayloadLeaks(publicRoom, { allowDemoTraces: true }), []);
  assert.deepEqual(findRestrictedPublicPayloadKeys(publicRoom), []);
});

test("invalid Studio V2 public style preset falls back to Gallery P2", () => {
  const editable = presenceConfigFromStudioV2State(studioState(), null) as PresenceEditableConfig;
  editable.style_dna = {
    ...editable.style_dna,
    studio_v2: {
      ...record(record(editable.style_dna).studio_v2),
      publicStylePreset: "unsupported-liquid-engine",
    },
  };

  const restored = studioV2FromPresenceConfig(editable, node());
  const publicRoom = publicRoomFromStudioV2State(restored);

  assert.equal(restored.publicStylePreset, "gallery-p2");
  assert.equal(publicRoom.publicStylePreset, "gallery-p2");
});

test("legacy editable config can be lifted into a safe Studio V2 fallback room", () => {
  const restored = studioV2FromPresenceConfig({
    renderer_key: "ggm-faithful-room-v1",
    status: "draft",
    content_config: {
      display_name: "Draft Artist Room",
      headline: "Draft headline",
    },
    scene_config: {},
    style_dna: {},
    motion_config: {},
    asset_config: {},
    roomkey_config: {},
    enquiry_config: {},
  } as PresenceEditableConfig, node({ renderer_key: "ggm-faithful-room-v1" }));

  assert.equal(restored.rendererKey, PRESENCE_STUDIO_V2_RENDERER_KEY);
  assert.equal(restored.title, "Draft Artist Room");
  assert.ok(restored.chambers.length >= 1);
  assert.ok(restored.chambers[0].objects.length >= 1);
});

test("Studio V2 feature flag requires global enablement and pilot eligibility", () => {
  const editable = {
    renderer_key: PRESENCE_STUDIO_V2_RENDERER_KEY,
  } as PresenceEditableConfig;

  assert.equal(shouldUsePresenceStudioV2({ roomId: 42, config: editable }, {
    NEXT_PUBLIC_PRESENCE_STUDIO_V2: "0",
    NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS: "42",
  }), false);

  assert.equal(shouldUsePresenceStudioV2({ roomId: 42, config: editable }, {
    NEXT_PUBLIC_PRESENCE_STUDIO_V2: "1",
    NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS: "42",
  }), true);

  assert.equal(shouldUsePresenceStudioV2({ roomId: 77, config: editable }, {
    NEXT_PUBLIC_PRESENCE_STUDIO_V2: "1",
    NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS: "42",
  }), false);
});

test("production empty pilot list blocks all rooms unless explicit override", () => {
  const editable = {
    renderer_key: PRESENCE_STUDIO_V2_RENDERER_KEY,
  } as PresenceEditableConfig;

  const env = process.env as Record<string, string | undefined>;
  const previousNodeEnv = env.NODE_ENV;

  try {
    env.NODE_ENV = "production";
    // Production: empty pilot list → blocked
    assert.equal(shouldUsePresenceStudioV2({ roomId: 42, config: editable }, {
      NEXT_PUBLIC_PRESENCE_STUDIO_V2: "1",
    }), false);

    // Production: explicit pilot IDs → allowed
    assert.equal(shouldUsePresenceStudioV2({ roomId: 42, config: editable }, {
      NEXT_PUBLIC_PRESENCE_STUDIO_V2: "1",
      NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS: "42",
    }), true);

    // Dev/test: empty pilot list → allowed (flexible)
    env.NODE_ENV = "development";
    assert.equal(shouldUsePresenceStudioV2({ roomId: 42, config: editable }, {
      NEXT_PUBLIC_PRESENCE_STUDIO_V2: "1",
    }), true);
  } finally {
    env.NODE_ENV = previousNodeEnv;
  }
});

test("sanitizeStudioV2PublicPayload strips restricted keys recursively", () => {
  const dirty = {
    safeKey: "visible",
    locked: "should be removed",
    pinned: "should be removed",
    nested: {
      scene_config: "should be removed",
      style_dna: "should be removed",
      kept: "visible",
    },
    arrayWithBadItems: [
      { token: "should be removed", good: "visible" },
      { hiddenPublic: "should be removed", good: "visible" },
    ],
  };

  const clean = sanitizeStudioV2PublicPayload(dirty);
  assert.equal((clean as Record<string, unknown>).safeKey, "visible");
  assert.equal((clean as Record<string, unknown>).locked, undefined);
  assert.equal((clean as Record<string, unknown>).pinned, undefined);

  const nested = (clean as Record<string, unknown>).nested as Record<string, unknown>;
  assert.equal(nested.kept, "visible");
  assert.equal(nested.scene_config, undefined);
  assert.equal(nested.style_dna, undefined);

  const arr = (clean as Record<string, unknown>).arrayWithBadItems as Array<Record<string, unknown>>;
  assert.equal(arr[0].good, "visible");
  assert.equal(arr[0].token, undefined);
  assert.equal(arr[1].good, "visible");
  assert.equal(arr[1].hiddenPublic, undefined);
});

test("safePublicUrl rejects unsafe URLs", () => {
  // Rejected protocols
  assert.equal(safePublicUrl("file:///etc/passwd"), "");
  assert.equal(safePublicUrl("javascript:alert(1)"), "");
  assert.equal(safePublicUrl("data:text/html,<script>alert(1)</script>"), "");

  // Localhost and loopback
  assert.equal(safePublicUrl("http://localhost:3000/studio"), "");
  assert.equal(safePublicUrl("http://127.0.0.1/api"), "");
  assert.equal(safePublicUrl("http://::1/"), "");
  assert.equal(safePublicUrl("http://0.0.0.0/"), "");

  // Private IP ranges
  assert.equal(safePublicUrl("http://192.168.1.1/secret"), "");
  assert.equal(safePublicUrl("http://10.0.0.1/secret"), "");
  assert.equal(safePublicUrl("http://172.16.0.1/secret"), "");
  assert.equal(safePublicUrl("http://172.20.5.5/secret"), "");
  assert.equal(safePublicUrl("http://172.31.255.255/secret"), "");

  // Control-plane paths
  assert.equal(safePublicUrl("https://example.com/api/presence/owner"), "");
  assert.equal(safePublicUrl("https://example.com/auth/login"), "");
  assert.equal(safePublicUrl("https://example.com/studio/editor"), "");
  assert.equal(safePublicUrl("https://example.com/admin/users"), "");
  assert.equal(safePublicUrl("https://example.com/internal/health"), "");

  // Malformed / edge cases
  assert.equal(safePublicUrl("//evil.com/hijack"), "");
  assert.equal(safePublicUrl("https://example.com//double"), "");

  // Safe URLs
  assert.equal(safePublicUrl("https://example.com/"), "https://example.com/");
  assert.equal(safePublicUrl("https://example.com/public/work.jpg"), "https://example.com/public/work.jpg");
  assert.equal(safePublicUrl("mailto:hello@example.com"), "mailto:hello@example.com");
  assert.equal(safePublicUrl("tel:+1234567890"), "tel:+1234567890");
  assert.equal(safePublicUrl("/images/hero.webp"), "/images/hero.webp");
});

test("safeAssetPath rejects unsafe paths", () => {
  assert.equal(safeAssetPath("/images/valid.webp"), "/images/valid.webp");
  assert.equal(safeAssetPath("/api/secret"), "");
  assert.equal(safeAssetPath("/studio/editor"), "");
  assert.equal(safeAssetPath("//evil.com"), "");
  assert.equal(safeAssetPath("C:\\Windows\\System32"), "");
  assert.equal(safeAssetPath("\\\\server\\share"), "");
  assert.equal(safeAssetPath("file:///etc/passwd"), "");
});

test("normalizeTransform clamps at boundaries", () => {
  // x/y boundaries
  assert.deepEqual(normalizeTransform({ x: 99999, y: -99999, scale: 1, rotation: 0, zIndex: 1 }), {
    x: 2000, y: -2000, scale: 1, rotation: 0, zIndex: 1,
  });

  // scale boundaries
  assert.deepEqual(normalizeTransform({ x: 0, y: 0, scale: 0.01, rotation: 0, zIndex: 1 }), {
    x: 0, y: 0, scale: 0.2, rotation: 0, zIndex: 1,
  });
  assert.deepEqual(normalizeTransform({ x: 0, y: 0, scale: 99, rotation: 0, zIndex: 1 }), {
    x: 0, y: 0, scale: 4, rotation: 0, zIndex: 1,
  });

  // rotation boundaries
  assert.deepEqual(normalizeTransform({ x: 0, y: 0, scale: 1, rotation: -999, zIndex: 1 }), {
    x: 0, y: 0, scale: 1, rotation: -360, zIndex: 1,
  });
  assert.deepEqual(normalizeTransform({ x: 0, y: 0, scale: 1, rotation: 999, zIndex: 1 }), {
    x: 0, y: 0, scale: 1, rotation: 360, zIndex: 1,
  });

  // zIndex boundaries
  assert.deepEqual(normalizeTransform({ x: 0, y: 0, scale: 1, rotation: 0, zIndex: -5 }), {
    x: 0, y: 0, scale: 1, rotation: 0, zIndex: 0,
  });
  assert.deepEqual(normalizeTransform({ x: 0, y: 0, scale: 1, rotation: 0, zIndex: 5000 }), {
    x: 0, y: 0, scale: 1, rotation: 0, zIndex: 999,
  });

  // Default fallback for missing values
  assert.deepEqual(normalizeTransform({} as unknown as StudioV2Transform), {
    x: 0, y: 0, scale: 1, rotation: 0, zIndex: 1,
  });
});

test("studioV2FromStoredConfig recovers from malformed config", () => {
  // Missing objectState entirely
  const missingObjectState = {
    renderer_key: PRESENCE_STUDIO_V2_RENDERER_KEY,
    scene_config: { studio_v2: { chambers: [{ id: "main", label: "Room", objectIds: ["a", "b"] }] } },
    content_config: { studio_v2: { objects: [{ id: "a", type: "text", title: "A" }, { id: "b", type: "note", title: "B" }] } },
    style_dna: { studio_v2: { skin: {} } },
    motion_config: { studio_v2: {} },
    roomkey_config: {},
    enquiry_config: {},
  } as PresenceEditableConfig;

  const restoredMissing = studioV2FromPresenceConfig(missingObjectState, node());
  assert.equal(restoredMissing.chambers.length, 1);
  assert.equal(restoredMissing.chambers[0].objects.length, 2);
  assert.equal(restoredMissing.chambers[0].objects[0].title, "A");

  // Null/garbage V2 content sections
  const garbageContent = {
    renderer_key: PRESENCE_STUDIO_V2_RENDERER_KEY,
    scene_config: { studio_v2: null },
    content_config: { studio_v2: "not-an-object" },
    style_dna: { studio_v2: undefined },
    motion_config: {},
    roomkey_config: {},
    enquiry_config: {},
  } as unknown as PresenceEditableConfig;

  const restoredGarbage = studioV2FromPresenceConfig(garbageContent, node());
  assert.equal(restoredGarbage.rendererKey, PRESENCE_STUDIO_V2_RENDERER_KEY);
  assert.ok(restoredGarbage.chambers.length >= 1);

  // Array where object expected for chambers
  const arrayChambers = {
    renderer_key: PRESENCE_STUDIO_V2_RENDERER_KEY,
    scene_config: { studio_v2: { chambers: "not-array" } },
    content_config: { studio_v2: { objects: "not-array" } },
    style_dna: {},
    motion_config: {},
    roomkey_config: {},
    enquiry_config: {},
  } as unknown as PresenceEditableConfig;

  const restoredArray = studioV2FromPresenceConfig(arrayChambers, node());
  assert.ok(restoredArray.chambers.length >= 1);
});

test("legacy moodboard references lift from multiple config sources", () => {
  const legacyConfig = {
    renderer_key: "ggm-faithful-room-v1",
    content_config: {
      moodboard: [
        { id: "mb-1", label: "Warm light", url: "https://example.com/warm.jpg", type: "image" },
        { label: "No ID ref", detail: "Detail only" },
      ],
      moodboardRefs: [
        { id: "mb-2", label: "Cool shadow", url: "https://example.com/cool.jpg" },
        { id: "mb-1", label: "Warm light", url: "https://example.com/warm.jpg", type: "image" }, // duplicate
      ],
    },
    asset_config: {
      references: [
        { title: "Timber grain", image_url: "/textures/timber.webp", tag: "brown" },
      ],
    },
    scene_config: {},
    style_dna: {},
    motion_config: {},
    roomkey_config: {},
    enquiry_config: {},
  } as PresenceEditableConfig;

  const restored = studioV2FromPresenceConfig(legacyConfig, node({ renderer_key: "ggm-faithful-room-v1" }));

  // Should have 4 unique refs (mb-1 deduplicated, No ID ref has empty URL but distinct label)
  assert.equal(restored.moodboardRefs.length, 4);
  assert.ok(restored.moodboardRefs.some((r) => r.label === "Warm light"));
  assert.ok(restored.moodboardRefs.some((r) => r.label === "Cool shadow"));
  assert.ok(restored.moodboardRefs.some((r) => r.label === "Timber grain"));

  // Unsafe URLs should be stripped
  const unsafeConfig = {
    renderer_key: "ggm-faithful-room-v1",
    content_config: {
      moodboard: [
        { label: "Bad URL", url: "http://localhost/secret" },
        { label: "File path", url: "file:///etc/passwd" },
        { label: "Good URL", url: "https://example.com/safe.jpg" },
      ],
    },
    scene_config: {},
    style_dna: {},
    motion_config: {},
    asset_config: {},
    roomkey_config: {},
    enquiry_config: {},
  } as PresenceEditableConfig;

  const restoredUnsafe = studioV2FromPresenceConfig(unsafeConfig, node({ renderer_key: "ggm-faithful-room-v1" }));
  // Unsafe URLs are stripped; references with labels are kept (text-only references are valid)
  assert.equal(restoredUnsafe.moodboardRefs.length, 3);
  const goodRef = restoredUnsafe.moodboardRefs.find((r) => r.label === "Good URL");
  assert.ok(goodRef);
  assert.equal(goodRef?.url, "https://example.com/safe.jpg");
  const badRef = restoredUnsafe.moodboardRefs.find((r) => r.label === "Bad URL");
  assert.ok(badRef);
  assert.equal(badRef?.url, "");
});

test("legacy world mapping uses explicit room_type first, then substring fallback", () => {
  const testCases: Array<{ roomType: string; displayMode: string; expected: string }> = [
    { roomType: "artist_studio", displayMode: "anything", expected: "gallery" },
    { roomType: "practitioner", displayMode: "anything", expected: "healing" },
    { roomType: "performer_music", displayMode: "anything", expected: "dj" },
    { roomType: "organisation", displayMode: "anything", expected: "archive" },
    { roomType: "minimal_card", displayMode: "anything", expected: "consultant" },
    // Substring fallback
    { roomType: "unknown", displayMode: "zine_layout", expected: "zine" },
    { roomType: "unknown", displayMode: "dj_booth", expected: "dj" },
    { roomType: "unknown", displayMode: "healing_room", expected: "healing" },
    { roomType: "unknown", displayMode: "market_stall", expected: "market" },
    { roomType: "unknown", displayMode: "archive_room", expected: "archive" },
    { roomType: "unknown", displayMode: "carpenter_workshop", expected: "carpenter" },
    { roomType: "unknown", displayMode: "consultant_desk", expected: "consultant" },
    { roomType: "unknown", displayMode: "generic_gallery", expected: "gallery" },
  ];

  for (const tc of testCases) {
    // For substring fallback tests, don't set renderer_key in config so display_mode is used.
    const legacyConfig = {
      renderer_key: tc.roomType === "unknown" ? undefined : "legacy-renderer",
      scene_config: {},
      style_dna: {},
      motion_config: {},
      asset_config: {},
      roomkey_config: {},
      enquiry_config: {},
    } as PresenceEditableConfig;

    const testNode = node({
      renderer_key: tc.roomType === "unknown" ? null : "legacy-renderer",
      room_type: tc.roomType as PresenceNode["room_type"],
      display_mode: tc.displayMode,
    });

    const restored = studioV2FromPresenceConfig(legacyConfig, testNode);
    assert.equal(restored.worldId, tc.expected, `room_type=${tc.roomType}, display_mode=${tc.displayMode} should map to ${tc.expected}`);
  }
});

test("V2 editor title mutation produces saveable config payload and round-trips", () => {
  const state = studioState();
  const updated: StudioV2State = { ...state, title: "Updated Studio Title" };
  const payload = presenceConfigFromStudioV2State(updated, null);

  assert.equal(payload.renderer_key, PRESENCE_STUDIO_V2_RENDERER_KEY);
  assert.ok(payload.content_config?.studio_v2);
  const contentV2 = (payload.content_config as Record<string, unknown>).studio_v2 as Record<string, unknown>;
  assert.equal(contentV2.title, "Updated Studio Title");

  // Round-trip through adapter
  const editable = { ...payload, status: "draft" } as PresenceEditableConfig;
  const roundTripped = studioV2FromPresenceConfig(editable, node());
  assert.equal(roundTripped.title, "Updated Studio Title");
  assert.equal(roundTripped.slug, state.slug);
  assert.equal(roundTripped.worldId, state.worldId);
  assert.equal(roundTripped.chambers.length, state.chambers.length);
});

test("chamber metadata round-trips through adapter save and reload", () => {
  const state: StudioV2State = {
    ...studioState(),
    chambers: [
      {
        id: "threshold-chamber",
        label: "Threshold",
        objects: [
          {
            id: "work-1",
            type: "image",
            role: "work",
            title: "Bridle Road, after rain",
            visibility: { public: true, mobile: true },
            transform: DEFAULT_STUDIO_V2_TRANSFORM,
            locked: false,
            pinned: false,
          },
        ],
        metadata: {
          role: "threshold",
          layout: "focus",
          transition: "portal",
          isEntry: true,
          description: "The opening threshold",
        },
      },
      {
        id: "gallery-chamber",
        label: "Gallery",
        objects: [],
        metadata: {
          role: "gallery",
          layout: "grid",
          transition: "fade",
        },
      },
    ],
  };

  const payload = presenceConfigFromStudioV2State(state, null);
  const sceneV2 = (payload.scene_config as Record<string, unknown>).studio_v2 as Record<string, unknown>;
  const persistedChambers = (sceneV2.chambers as Array<Record<string, unknown>>);

  assert.equal(persistedChambers.length, 2);
  const persistedThreshold = persistedChambers[0];
  assert.equal(persistedThreshold.id, "threshold-chamber");
  assert.equal((persistedThreshold.metadata as Record<string, unknown>).role, "threshold");
  assert.equal((persistedThreshold.metadata as Record<string, unknown>).layout, "focus");
  assert.equal((persistedThreshold.metadata as Record<string, unknown>).transition, "portal");
  assert.equal((persistedThreshold.metadata as Record<string, unknown>).isEntry, true);
  assert.equal((persistedThreshold.metadata as Record<string, unknown>).description, "The opening threshold");

  const editable = { ...payload, status: "draft" } as PresenceEditableConfig;
  const restored = studioV2FromPresenceConfig(editable, node());

  assert.equal(restored.chambers[0].metadata?.role, "threshold");
  assert.equal(restored.chambers[0].metadata?.layout, "focus");
  assert.equal(restored.chambers[0].metadata?.transition, "portal");
  assert.equal(restored.chambers[0].metadata?.isEntry, true);
  assert.equal(restored.chambers[0].metadata?.description, "The opening threshold");
  assert.equal(restored.chambers[1].metadata?.role, "gallery");
  assert.equal(restored.chambers[1].metadata?.layout, "grid");
  assert.equal(restored.chambers[1].metadata?.transition, "fade");
});

test("old chamber config without metadata still loads safely", () => {
  const config = {
    renderer_key: PRESENCE_STUDIO_V2_RENDERER_KEY,
    scene_config: {
      studio_v2: {
        chambers: [{ id: "main", label: "Room", objectIds: ["a"] }],
        objectState: { a: { chamberId: "main", visibility: { public: true, mobile: true }, transform: DEFAULT_STUDIO_V2_TRANSFORM, locked: false, pinned: false } },
      },
    },
    content_config: {
      studio_v2: {
        title: "Legacy Room",
        objects: [{ id: "a", type: "text", title: "Hello" }],
        cta: { label: "Begin" },
        moodboardRefs: [],
        traces: { enabled: false },
      },
    },
    style_dna: { studio_v2: { skin: {} } },
    motion_config: { studio_v2: {} },
    roomkey_config: {},
    enquiry_config: {},
  } as unknown as PresenceEditableConfig;

  const restored = studioV2FromPresenceConfig(config, node());
  assert.equal(restored.chambers.length, 1);
  assert.equal(restored.chambers[0].id, "main");
  assert.equal(restored.chambers[0].metadata, undefined);
});

test("invalid persisted metadata normalizes safely on load", () => {
  const config = {
    renderer_key: PRESENCE_STUDIO_V2_RENDERER_KEY,
    scene_config: {
      studio_v2: {
        chambers: [{
          id: "main",
          label: "Room",
          objectIds: [],
          metadata: {
            role: "invalid-role",
            layout: "invalid-layout",
            transition: "invalid-transition",
            isEntry: "not-a-boolean",
            isDefault: 123,
            description: 456,
          },
        }],
        objectState: {},
      },
    },
    content_config: {
      studio_v2: {
        title: "Test Room",
        objects: [],
        cta: { label: "Begin" },
        moodboardRefs: [],
        traces: { enabled: false },
      },
    },
    style_dna: { studio_v2: { skin: {} } },
    motion_config: { studio_v2: {} },
    roomkey_config: {},
    enquiry_config: {},
  } as unknown as PresenceEditableConfig;

  const restored = studioV2FromPresenceConfig(config, node());
  const metadata = restored.chambers[0].metadata;
  assert.ok(metadata);
  assert.equal(metadata?.role, "custom");
  assert.equal(metadata?.layout, "stack");
  assert.equal(metadata?.transition, "none");
  assert.equal(metadata?.isEntry, undefined);
  assert.equal(metadata?.isDefault, undefined);
  assert.equal(metadata?.description, undefined);
});

test("metadata does not break public projection or payload hygiene", () => {
  const state: StudioV2State = {
    ...studioState(),
    chambers: [
      {
        id: "threshold-chamber",
        label: "Threshold",
        objects: [
          {
            id: "work-1",
            type: "image",
            role: "work",
            title: "Bridle Road, after rain",
            visibility: { public: true, mobile: true },
            transform: DEFAULT_STUDIO_V2_TRANSFORM,
            locked: false,
            pinned: false,
          },
        ],
        metadata: {
          role: "threshold",
          layout: "focus",
          transition: "portal",
          isEntry: true,
          description: "The opening threshold",
        },
      },
    ],
  };

  const publicRoom = publicRoomFromStudioV2State(state);
  assert.equal(publicRoom.chambers[0].metadata?.role, "threshold");
  assert.equal(publicRoom.chambers[0].metadata?.layout, "focus");
  assert.equal(publicRoom.chambers[0].metadata?.transition, "portal");
  assert.equal(publicRoom.chambers[0].metadata?.isEntry, true);
  assert.equal(publicRoom.chambers[0].metadata?.description, "The opening threshold");
  assert.deepEqual(findStudioV2PublicPayloadLeaks(publicRoom, { allowDemoTraces: true }), []);
  assert.deepEqual(findRestrictedPublicPayloadKeys(publicRoom), []);
});

test("existing bbbvision and Gallery P2 style fields still round-trip with metadata", () => {
  for (const preset of ["gallery-p2", "christina-liquid-gallery", "bbbvision-threshold-gallery"] as const) {
    const state: StudioV2State = {
      ...studioState(),
      publicStylePreset: preset,
      chambers: [
        {
          id: "main",
          label: "Room",
          objects: [
            {
              id: "work-1",
              type: "image",
              role: "work",
              title: "Test work",
              visibility: { public: true, mobile: true },
              transform: DEFAULT_STUDIO_V2_TRANSFORM,
              locked: false,
              pinned: false,
            },
          ],
          metadata: { role: "threshold", layout: "focus" },
        },
      ],
    };

    const payload = presenceConfigFromStudioV2State(state, null);
    const editable = { ...payload, status: "draft" } as PresenceEditableConfig;
    const restored = studioV2FromPresenceConfig(editable, node());

    assert.equal(restored.publicStylePreset, preset, `preset ${preset} should round-trip`);
    assert.equal(restored.chambers[0].metadata?.role, "threshold", `preset ${preset} chamber metadata should round-trip`);

    const publicRoom = publicRoomFromStudioV2State(restored);
    assert.equal(publicRoom.publicStylePreset, preset, `preset ${preset} public projection should match`);
    assert.deepEqual(findStudioV2PublicPayloadLeaks(publicRoom, { allowDemoTraces: true }), []);
    assert.deepEqual(findRestrictedPublicPayloadKeys(publicRoom), []);
  }
});
