import test from "node:test";
import assert from "node:assert/strict";
import type { PresenceEditableConfig, PresenceNode } from "../../api/types.ts";
import { presenceConfigFromStudioV2State, studioV2FromPresenceConfig } from "../studio-v2/adapters.ts";
import {
  DEFAULT_STUDIO_V2_SKIN,
  DEFAULT_STUDIO_V2_TRANSFORM,
  PRESENCE_STUDIO_V2_RENDERER_KEY,
  PRESENCE_STUDIO_V2_SCHEMA_VERSION,
  type StudioV2State,
} from "../studio-v2/model.ts";
import {
  applyStudioV3Look,
  compileStudioV3Document,
  createStudioV3BaseSnapshot,
  hydrateStudioV3Document,
  lockStudioV3Layer,
  placeStudioV3Collection,
  placeStudioV3Piece,
  saveStudioV3NamedLook,
  STUDIO_V3_LOOK_ROOM_STYLE_COMPATIBILITY,
  STUDIO_V3_P1_LOOKS,
  STUDIO_V3_SOFT_EDITORIAL_LOOK,
  STUDIO_V3_ZINE_ARCHIVE_LOOK,
} from "./compiler.ts";
import {
  comparableConfigFromEditableConfig,
  fingerprintStudioV3BaseConfig,
  projectStudioV3WireJson,
  studioV3PostPayloadFromComparable,
} from "./fingerprint.ts";
import { shouldUsePresenceStudioV3Editor, STUDIO_V3_BROWSER_PILOT_FLAG } from "./feature.ts";
import {
  deriveStudioV3OwnerPartitionKey,
  clearStudioV3LocalStateForOwnerPartition,
  validateStudioV3PresenceEnvelope,
  validateStudioV3RoomEnvelope,
  pruneStudioV3LocalEnvelopesForOwnerSwitch,
  readStudioV3LocalSnapshot,
  studioV3SnapshotKey,
  writeStudioV3LocalSnapshot,
} from "./localState.ts";
import {
  STUDIO_V3_HIDDEN_OR_UNAVAILABLE_REASON,
  STUDIO_V3_LOCAL_SCHEMA_VERSION,
  type StudioV3ComparableConfig,
} from "./model.ts";
import {
  applyStudioV3StructuralStage,
  cancelStudioV3StructuralStage,
  compareStudioV3StructuralStage,
  hasStudioV3ServerRevision,
  projectStudioV3Metadata,
  resolveStudioV3ScopedValue,
  restoreStudioV3Metadata,
  restoreStudioV3Savepoint,
  stageStudioV3LookRoomStyleRecommendation,
  stageStudioV3RoomStyle,
  STUDIO_V3_ROOM_STYLE_DEFINITIONS,
} from "./p1State.ts";
import {
  collectionSourceRef,
  containsRawStudioV3SourceRef,
  isStudioV3PlacementId,
  loadedOwnerLibraryCollectionSourceRef,
  makeStudioV3ObjectId,
  makeStudioV3PlacementId,
  parseStudioV3SourceRef,
  STUDIO_V3_LOADED_OWNER_LIBRARY_SOURCE_REF,
  workSourceRef,
} from "./sourceRefs.ts";
import { validateStudioV2EditorBridgeResult, type PresenceStudioV2EditorIntent } from "./editorBridge.ts";

const baseIdentity = {
  sourceKind: "published" as const,
  configId: 101,
  roomId: 29,
  version: 7,
  revision: 3,
  status: "published",
  schemaVersion: "presence-editable-v1",
  updatedAt: "2026-07-21T00:00:00.000Z",
};

function baseStudioV2State(): StudioV2State {
  return {
    schemaVersion: PRESENCE_STUDIO_V2_SCHEMA_VERSION,
    rendererKey: PRESENCE_STUDIO_V2_RENDERER_KEY,
    roomId: "29",
    slug: "bbbvision",
    title: "bbb.vision",
    tagline: "Boundary practice",
    worldId: "gallery",
    publicStylePreset: "bbbvision-threshold-gallery",
    skin: { ...DEFAULT_STUDIO_V2_SKIN, background: "#000000", accentColor: "#ffd84d", motionIntensity: "gentle" },
    cta: { label: "Enter", href: "/presence/bbbvision" },
    chambers: [
      {
        id: "gallery",
        label: "Gallery",
        metadata: { role: "gallery", isEntry: true },
        objects: [
          {
            id: "legacy-1",
            type: "image",
            role: "piece",
            title: "Legacy Work",
            detail: "Existing public renderer object",
            image: { src: "/media/legacy-work.jpg", alt: "Legacy Work" },
            visibility: { public: true, mobile: true },
            transform: { ...DEFAULT_STUDIO_V2_TRANSFORM, zIndex: 1 },
            locked: false,
            pinned: false,
          },
        ],
      },
    ],
    moodboardRefs: [],
    traces: { enabled: false, demo: false, disclosure: "Demo traces" },
    mobileRecovery: { transformsSuspendedOnMobile: false, strategy: "preserve" },
  };
}

function baseEditableConfig(): PresenceEditableConfig {
  const state = baseStudioV2State();
  const projected = presenceConfigFromStudioV2State(state, { schema_version: baseIdentity.schemaVersion });
  return {
    id: baseIdentity.configId,
    room_id: baseIdentity.roomId,
    version: baseIdentity.version,
    revision: baseIdentity.revision,
    status: baseIdentity.status,
    schema_version: baseIdentity.schemaVersion,
    updated_at: baseIdentity.updatedAt,
    renderer_key: projected.renderer_key,
    scene_config: projected.scene_config,
    style_dna: projected.style_dna,
    motion_config: projected.motion_config,
    asset_config: projected.asset_config,
    content_config: projected.content_config,
    roomkey_config: projected.roomkey_config,
    enquiry_config: projected.enquiry_config,
    locked_fields: projected.locked_fields,
  };
}

const baseNode: PresenceNode = {
  id: 29,
  owner_user_id: 11,
  slug: "bbbvision",
  display_name: "bbb.vision",
  node_type: "artist",
  display_mode: "presence",
  status: "active",
  visibility: "public",
  works: [
    {
      id: 41,
      collection_id: 5,
      title: "Ochre Study",
      year: "2026",
      description: "A studio test work.",
      image_url: "/media/ochre-study.jpg",
      sort_order: 1,
      is_visible: true,
    },
  ],
  collections: [{ id: 5, title: "Threshold Studies", is_visible: true }],
};

async function hydratedP1Fixture(node: PresenceNode = baseNode) {
  const config = baseEditableConfig();
  const base = await createStudioV3BaseSnapshot(config, "published");
  const baseState = studioV2FromPresenceConfig(config, node);
  return {
    baseState,
    document: hydrateStudioV3Document({
      nodeId: 29,
      slug: "bbbvision",
      title: "bbb.vision",
      baseConfig: config,
      base,
      studioV2State: baseState,
      works: node.works ?? [],
      collections: node.collections ?? [],
    }),
  };
}

test("BBB hydration retains the P0 Nocturnal editor when its public baseline remains Gallery P2", async () => {
  const config = baseEditableConfig();
  const base = await createStudioV3BaseSnapshot(config, "published");
  const publicBaseline = { ...baseStudioV2State(), publicStylePreset: "gallery-p2" as const };
  const document = hydrateStudioV3Document({
    nodeId: 29,
    slug: "bbbvision",
    title: "bbb.vision",
    baseConfig: config,
    base,
    studioV2State: publicBaseline,
    works: baseNode.works ?? [],
    collections: baseNode.collections ?? [],
  });

  assert.equal(document.activeLookId, "nocturnal-gallery");
  assert.equal(compileStudioV3Document(document, publicBaseline).studioV2State.publicStylePreset, "bbbvision-threshold-gallery");
});

test("Studio V3 gate is default-off, production-off, and limited to BBB when enabled", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalPilotEnv = process.env.NEXT_PUBLIC_PRESENCE_STUDIO_V3_BBB_PILOT;
  const mutableEnv = process.env as Record<string, string | undefined>;
  delete process.env.NEXT_PUBLIC_PRESENCE_STUDIO_V3_BBB_PILOT;
  delete (globalThis as { window?: unknown }).window;

  assert.equal(shouldUsePresenceStudioV3Editor({ roomId: 29, slug: "bbbvision" }), false);

  process.env.NEXT_PUBLIC_PRESENCE_STUDIO_V3_BBB_PILOT = "1";
  mutableEnv.NODE_ENV = "production";
  assert.equal(shouldUsePresenceStudioV3Editor({ roomId: 29, slug: "bbbvision" }), false);

  mutableEnv.NODE_ENV = "test";
  assert.equal(shouldUsePresenceStudioV3Editor({ roomId: 29, slug: "bbbvision" }), true);
  assert.equal(shouldUsePresenceStudioV3Editor({ roomId: 30, slug: "other-room" }), false);

  delete process.env.NEXT_PUBLIC_PRESENCE_STUDIO_V3_BBB_PILOT;
  (globalThis as { window?: unknown }).window = {
    localStorage: { getItem: (key: string) => key === STUDIO_V3_BROWSER_PILOT_FLAG ? "1" : null },
  };
  assert.equal(shouldUsePresenceStudioV3Editor({ roomId: 29, slug: "bbbvision" }), true);

  if (originalNodeEnv === undefined) delete mutableEnv.NODE_ENV;
  else mutableEnv.NODE_ENV = originalNodeEnv;
  if (originalPilotEnv === undefined) delete process.env.NEXT_PUBLIC_PRESENCE_STUDIO_V3_BBB_PILOT;
  else process.env.NEXT_PUBLIC_PRESENCE_STUDIO_V3_BBB_PILOT = originalPilotEnv;
  delete (globalThis as { window?: unknown }).window;
});

test("source refs parse, object ids are deterministic, and public ids are opaque", () => {
  assert.deepEqual(parseStudioV3SourceRef("work:41"), { kind: "work", id: "41" });
  assert.deepEqual(parseStudioV3SourceRef("collection:5"), { kind: "collection", id: "5" });
  assert.deepEqual(parseStudioV3SourceRef(STUDIO_V3_LOADED_OWNER_LIBRARY_SOURCE_REF), {
    kind: "collection",
    id: "loaded-owner-library",
  });
  assert.deepEqual(parseStudioV3SourceRef("legacy-object:legacy-1"), { kind: "legacy-object", id: "legacy-1" });
  assert.equal(parseStudioV3SourceRef("work:0"), null);
  assert.equal(parseStudioV3SourceRef("collection:0"), null);
  assert.equal(parseStudioV3SourceRef("collection:01"), null);
  assert.throws(() => workSourceRef(0), /positive integer/);
  assert.throws(() => collectionSourceRef(0), /positive integer/);
  assert.equal(loadedOwnerLibraryCollectionSourceRef(), STUDIO_V3_LOADED_OWNER_LIBRARY_SOURCE_REF);
  assert.equal(containsRawStudioV3SourceRef(STUDIO_V3_LOADED_OWNER_LIBRARY_SOURCE_REF), true);

  const objectId = makeStudioV3ObjectId("gallery", workSourceRef(41));
  assert.equal(objectId, makeStudioV3ObjectId("gallery", workSourceRef(41)));
  assert.match(objectId, /^studio-v3:gallery:/);
  assert.equal(containsRawStudioV3SourceRef(objectId), false);
});

test("wire JSON projection rejects lossy payloads but allows nested object undefined elision", () => {
  assert.deepEqual(projectStudioV3WireJson({ a: 1, nested: { keep: true, drop: undefined } }), { a: 1, nested: { keep: true } });
  assert.throws(() => projectStudioV3WireJson([1, undefined]), /sparse or undefined array/);
  const sparse: unknown[] = [];
  sparse[1] = "x";
  assert.throws(() => projectStudioV3WireJson(sparse), /sparse or undefined array/);
  assert.throws(() => projectStudioV3WireJson(undefined), /root undefined/);

  const comparable = comparableConfigFromEditableConfig(baseEditableConfig());
  const payload = studioV3PostPayloadFromComparable(comparable);
  assert.deepEqual(Object.keys(payload).sort(), [
    "asset_config",
    "content_config",
    "enquiry_config",
    "locked_fields",
    "motion_config",
    "renderer_key",
    "roomkey_config",
    "scene_config",
    "style_dna",
  ]);

  const badComparable = { ...comparable, scene_config: undefined as unknown as Record<string, unknown> };
  assert.throws(() => studioV3PostPayloadFromComparable(badComparable), /exactly the nine transport fields|lost required field/);
});

test("fingerprint strips only private-draft transport fields with media identity", async () => {
  const comparable = comparableConfigFromEditableConfig(baseEditableConfig());
  const privateDraft = (url: string, expires = 1000): StudioV3ComparableConfig => ({
    ...comparable,
    asset_config: {
      ...comparable.asset_config,
      image: { media_id: "media-1", visibility: "private_draft", url, preview_expires_at: expires, alt: "Alt" },
    },
  });
  assert.equal(await fingerprintStudioV3BaseConfig(privateDraft("https://signed-a", 1)), await fingerprintStudioV3BaseConfig(privateDraft("https://signed-b", 2)));
  assert.notEqual(
    await fingerprintStudioV3BaseConfig(privateDraft("https://signed-a", 1)),
    await fingerprintStudioV3BaseConfig({ ...privateDraft("https://signed-a", 1), asset_config: { image: { media_id: "media-2", visibility: "private_draft", url: "https://signed-a", preview_expires_at: 1, alt: "Alt" } } }),
  );
  assert.notEqual(
    await fingerprintStudioV3BaseConfig(privateDraft("https://signed-a", 1)),
    await fingerprintStudioV3BaseConfig({ ...privateDraft("https://signed-a", 1), asset_config: { image: { media_id: "media-1", visibility: "public_published", url: "https://signed-a", preview_expires_at: 1, alt: "Alt" } } }),
  );
  assert.notEqual(
    await fingerprintStudioV3BaseConfig(privateDraft("https://signed-a", 1)),
    await fingerprintStudioV3BaseConfig({ ...privateDraft("https://signed-a", 1), asset_config: { image: { media_id: "media-1", visibility: "private_draft", url: "https://signed-a", preview_expires_at: 1, alt: "Changed" } } }),
  );
});

test("fingerprint matches backend SHA-256 vectors including hostile Unicode key order", async () => {
  const baseline: StudioV3ComparableConfig = {
    schema_version: "presence-editable-config-v1",
    renderer_key: "presence-studio-v2-room",
    scene_config: { private: { media_id: "media-1", visibility: "private_draft", url: "https://signed-a", preview_expires_at: 1, image_url: "https://stored/image.webp" } },
    style_dna: { studio_v2: { skin: "dark" } },
    motion_config: { studio_v2: { intensity: "gentle" } },
    asset_config: {},
    content_config: {},
    roomkey_config: {},
    enquiry_config: {},
    locked_fields: {},
  };
  assert.equal(
    await fingerprintStudioV3BaseConfig(baseline),
    "34c344608ab7982fe799d9dc7d6cbad3bc628b7d00a4ecd814286031c170bdad",
  );
  assert.equal(
    await fingerprintStudioV3BaseConfig({
      ...baseline,
      content_config: {
        z: 1,
        A: 2,
        _: 3,
        é: 4,
        ä: 5,
        Ω: 6,
        "😀": 7,
        nested: { b: true, B: false, ø: "safe" },
      },
    }),
    "d8c99f6f5bea90b68cd55f4e43dfb96ecf7b05707473e4f66a1811ac55b272f0",
  );
  assert.equal(
    await fingerprintStudioV3BaseConfig({
      schema_version: "presence-editable-config-v1",
      renderer_key: "presence-studio-v2-room",
      scene_config: {},
      style_dna: {},
      motion_config: {},
      asset_config: {},
      content_config: {
        integer_float: 1,
        negative_zero: -0,
        small: 1e-7,
        fixed: 1e-6,
      },
      roomkey_config: {},
      enquiry_config: {},
      locked_fields: {},
    }),
    "30b59ddb5e9536abd41453fcb17a6ed9f520bec0ae196e1b2ad92ab5f31f2d09",
  );
  assert.throws(
    () => projectStudioV3WireJson({ unsafe: Number.MAX_SAFE_INTEGER + 1 }),
    /unsafe integer/,
  );
  assert.equal(
    await fingerprintStudioV3BaseConfig({
      schema_version: "presence-editable-config-v1",
      renderer_key: "presence-studio-v2-room",
      scene_config: {},
      style_dna: { studio_v2: { x: "\ud800" } },
      motion_config: {},
      asset_config: {},
      content_config: {},
      roomkey_config: {},
      enquiry_config: {},
      locked_fields: {},
    }),
    "1b4d9d279927deee13626ae9eefeef490ad67ff1949861e329784a554c685bfc",
  );
});

test("missing WebCrypto disables persistence without synthesizing a backend fingerprint or blocking render", async () => {
  const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", { configurable: true, value: undefined });
  try {
    const config = baseEditableConfig();
    const comparable = comparableConfigFromEditableConfig(config);
    await assert.rejects(
      fingerprintStudioV3BaseConfig(comparable),
      /WebCrypto SHA-256 is unavailable/,
    );

    const base = await createStudioV3BaseSnapshot(config, "published");
    assert.equal(base.fingerprint, "unavailable");
    assert.equal(base.localPersistence, "memory-only");
    assert.equal(base.reason, "WebCrypto SHA-256 is unavailable");

    const baseState = studioV2FromPresenceConfig(config, baseNode);
    const document = hydrateStudioV3Document({
      nodeId: 29,
      slug: "bbbvision",
      title: "bbb.vision",
      baseConfig: config,
      base,
      studioV2State: baseState,
      works: baseNode.works ?? [],
      collections: baseNode.collections ?? [],
    });
    const compiled = compileStudioV3Document(document, baseState);
    assert.equal(compiled.publicRoom.slug, "bbbvision");
    assert.equal(compiled.issues.some((issue) => issue.severity === "error"), false);
  } finally {
    if (cryptoDescriptor) Object.defineProperty(globalThis, "crypto", cryptoDescriptor);
    else Reflect.deleteProperty(globalThis, "crypto");
  }
});

test("local envelopes require exact identity/fingerprint and reject URL-bearing state", async () => {
  const partition = await deriveStudioV3OwnerPartitionKey({ deploymentScope: "test.local", validatedOwnerSubject: 11 });
  assert.ok(partition.key);
  const common = {
    ownerPartitionKey: partition.key,
    presenceId: 29,
    baseIdentity,
    baseFingerprint: "abc123",
  };
  const presenceEnvelope = {
    schemaVersion: STUDIO_V3_LOCAL_SCHEMA_VERSION,
    scope: "presence" as const,
    ...common,
    metadataRevision: 0,
    metadata: localPrivateMetadata(),
    mode: "advanced-creative",
    activeRoomId: "gallery",
    activeLookId: "soft-editorial",
    namedLooks: [],
    locks: [],
    updatedAt: "2026-07-21T00:00:00.000Z",
  };
  assert.equal(validateStudioV3PresenceEnvelope(presenceEnvelope, common)?.mode, "advanced-creative");
  assert.equal(validateStudioV3PresenceEnvelope(presenceEnvelope, common)?.activeRoomId, "gallery");
  assert.equal(validateStudioV3PresenceEnvelope({ ...presenceEnvelope, baseFingerprint: "mismatch" }, common), null);
  assert.equal(validateStudioV3PresenceEnvelope({ ...presenceEnvelope, baseIdentity: { ...baseIdentity, copied: true } }, common), null);
  assert.equal(validateStudioV3PresenceEnvelope({ ...presenceEnvelope, preview_url: "https://signed.example" }, common), null);
  assert.equal(validateStudioV3PresenceEnvelope({ ...presenceEnvelope, preview_url: "ftp://signed.example" }, common), null);
  assert.equal(validateStudioV3PresenceEnvelope({ ...presenceEnvelope, copiedPayload: "safe-looking" }, common), null);
  assert.equal(validateStudioV3PresenceEnvelope({ ...presenceEnvelope, namedLooks: [{ id: "broken-look" }] }, common), null);
  assert.equal(validateStudioV3PresenceEnvelope({
    ...presenceEnvelope,
    namedLooks: [{
      id: "soft-editorial",
      name: "Fake Soft",
      origin: "owner",
      provenance: "saved-from:soft-editorial",
      values: STUDIO_V3_SOFT_EDITORIAL_LOOK.values,
    }],
  }, common), null);
  assert.equal(validateStudioV3PresenceEnvelope({ ...presenceEnvelope, locks: [{ id: "bad", value: null }] }, common), null);
  assert.equal(validateStudioV3PresenceEnvelope({
    ...presenceEnvelope,
    locks: [{
      id: "room:gallery:motion-atmosphere",
      scopeKind: "room",
      scopeId: "gallery",
      layer: "motion-atmosphere",
      value: { motionIntensity: "still", background: "#fff" },
      reason: "wrong envelope",
    }],
  }, common), null);
  assert.equal(validateStudioV3PresenceEnvelope({ ...presenceEnvelope, mode: "broken" }, common), null);
  assert.equal(validateStudioV3PresenceEnvelope({ ...presenceEnvelope, namedLooks: [], locks: [], css: 'image-set("https://signed.example")' }, common), null);

  const roomPlacementId = makeStudioV3PlacementId("gallery", workSourceRef(41));
  const roomEnvelope = {
    schemaVersion: STUDIO_V3_LOCAL_SCHEMA_VERSION,
    scope: "room" as const,
    ...common,
    roomId: "gallery",
    placementSourceRefs: { [roomPlacementId]: workSourceRef(41) },
    placements: [{
      id: roomPlacementId,
      roomId: "gallery",
      sourceRef: workSourceRef(41),
      order: 1,
      status: "placed" as const,
    }],
    locks: [],
    updatedAt: "2026-07-21T00:00:00.000Z",
  };
  assert.deepEqual(validateStudioV3RoomEnvelope(roomEnvelope, { ...common, roomId: "gallery" })?.placementSourceRefs, { [roomPlacementId]: "work:41" });
  assert.equal(validateStudioV3RoomEnvelope(roomEnvelope, { ...common, roomId: "gallery" })?.placements?.length, 1);
  assert.equal(validateStudioV3RoomEnvelope({
    ...roomEnvelope,
    placements: [{ ...roomEnvelope.placements[0], id: "work:41" }],
  }, { ...common, roomId: "gallery" }), null);
  assert.equal(validateStudioV3RoomEnvelope({
    ...roomEnvelope,
    placements: [{ ...roomEnvelope.placements[0], roomId: "other" }],
  }, { ...common, roomId: "gallery" }), null);
  assert.equal(validateStudioV3RoomEnvelope({
    ...roomEnvelope,
    placements: [{ ...roomEnvelope.placements[0], copiedPayload: true }],
  }, { ...common, roomId: "gallery" }), null);
  assert.equal(validateStudioV3RoomEnvelope({ ...roomEnvelope, placementSourceRefs: { one: 41 } }, { ...common, roomId: "gallery" }), null);
  const duplicatePlacementId = makeStudioV3PlacementId("gallery", workSourceRef(41), 1);
  const duplicateRoomEnvelope = {
    ...roomEnvelope,
    placementSourceRefs: {
      [roomPlacementId]: workSourceRef(41),
      [duplicatePlacementId]: workSourceRef(41),
    },
    placements: [
      ...roomEnvelope.placements,
      {
        ...roomEnvelope.placements[0],
        id: duplicatePlacementId,
        order: 2,
        status: "duplicate" as const,
        collectionSourceRef: collectionSourceRef(5),
        reason: "Already placed in this Room.",
      },
    ],
  };
  assert.equal(validateStudioV3RoomEnvelope(duplicateRoomEnvelope, { ...common, roomId: "gallery" })?.placements?.length, 2);
  const sentinelRoomEnvelope = {
    ...duplicateRoomEnvelope,
    placements: duplicateRoomEnvelope.placements.map((placement) => (
      placement.status === "duplicate"
        ? { ...placement, collectionSourceRef: loadedOwnerLibraryCollectionSourceRef() }
        : placement
    )),
  };
  assert.equal(validateStudioV3RoomEnvelope(sentinelRoomEnvelope, { ...common, roomId: "gallery" })?.placements?.length, 2);
  assert.equal(validateStudioV3RoomEnvelope({
    ...sentinelRoomEnvelope,
    placements: sentinelRoomEnvelope.placements.map((placement) => (
      placement.status === "duplicate" ? { ...placement, collectionSourceRef: "collection:0" } : placement
    )),
  }, { ...common, roomId: "gallery" }), null);
  assert.equal(validateStudioV3RoomEnvelope({
    ...sentinelRoomEnvelope,
    placements: sentinelRoomEnvelope.placements.map((placement) => (
      placement.status === "duplicate" ? { ...placement, collectionSourceRef: "collection:loaded-owner-library-copy" } : placement
    )),
  }, { ...common, roomId: "gallery" }), null);
  assert.equal(validateStudioV3RoomEnvelope({
    ...duplicateRoomEnvelope,
    placementSourceRefs: { [roomPlacementId]: workSourceRef(41) },
  }, { ...common, roomId: "gallery" }), null);
  assert.equal(validateStudioV3RoomEnvelope({
    ...duplicateRoomEnvelope,
    placements: duplicateRoomEnvelope.placements.map((placement) => ({ ...placement, id: roomPlacementId })),
  }, { ...common, roomId: "gallery" }), null);
  assert.equal(validateStudioV3RoomEnvelope({
    ...roomEnvelope,
    locks: [{
      id: "room:other:motion-atmosphere",
      scopeKind: "room",
      scopeId: "other",
      layer: "motion-atmosphere",
      value: { motionIntensity: "still", background: "#fff" },
      reason: "bad scope",
    }],
  }, { ...common, roomId: "gallery" }), null);
  assert.equal(validateStudioV3RoomEnvelope({
    ...roomEnvelope,
    locks: [{
      id: "room:gallery:motion-atmosphere",
      scopeKind: "room",
      scopeId: "gallery",
      layer: "motion-atmosphere",
      value: { arbitrary: true },
      reason: "bad payload",
    }],
  }, { ...common, roomId: "gallery" }), null);
  assert.equal(validateStudioV3RoomEnvelope({ ...roomEnvelope, roomId: "other" }, { ...common, roomId: "gallery" }), null);

  const storage = new MemoryStorage();
  storage.setItem(`presence-studio-v3:prototype:${common.ownerPartitionKey}:presence:29:published:1:abc123`, "{}");
  storage.setItem(`presence-studio-v3:prototype:${common.ownerPartitionKey}:presence:29:published:1:oldbase`, "{}");
  storage.setItem(`presence-studio-v3:prototype:${common.ownerPartitionKey}:room:29:gallery:published:1:oldbase`, "{}");
  storage.setItem("presence-studio-v3:prototype:old-owner:presence:29:published:1:abc123", "{}");
  storage.setItem("presence-studio-v3:prototype:old-owner:room:29:gallery:published:1:abc123", "{}");
  storage.setItem("presence-studio-v3:prototype:old-owner:presence:30:published:1:abc123", "{}");
  storage.setItem(`presence-studio-v3:prototype:${common.ownerPartitionKey}:presence:30:published:1:abc123`, "{}");
  assert.equal(pruneStudioV3LocalEnvelopesForOwnerSwitch({
    storage,
    ownerPartitionKey: common.ownerPartitionKey,
    currentPresence: {
      presenceId: 29,
      baseKind: "published",
      configId: 1,
      baseFingerprint: "abc123",
      roomIds: ["gallery"],
    },
  }), 2);
  assert.equal(storage.getItem(`presence-studio-v3:prototype:${common.ownerPartitionKey}:presence:29:published:1:abc123`), "{}");
  assert.equal(storage.getItem(`presence-studio-v3:prototype:${common.ownerPartitionKey}:presence:29:published:1:oldbase`), null);
  assert.equal(storage.getItem(`presence-studio-v3:prototype:${common.ownerPartitionKey}:room:29:gallery:published:1:oldbase`), null);
  assert.equal(storage.getItem("presence-studio-v3:prototype:old-owner:presence:29:published:1:abc123"), "{}");
  assert.equal(storage.getItem("presence-studio-v3:prototype:old-owner:room:29:gallery:published:1:abc123"), "{}");
  assert.equal(storage.getItem("presence-studio-v3:prototype:old-owner:presence:30:published:1:abc123"), "{}");
  assert.equal(storage.getItem(`presence-studio-v3:prototype:${common.ownerPartitionKey}:presence:30:published:1:abc123`), "{}");
});

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

class ManifestFailureStorage extends MemoryStorage {
  failPromotion = false;

  setItem(key: string, value: string): void {
    if (this.failPromotion && key.includes(":manifest:")) throw new Error("manifest write failed");
    super.setItem(key, value);
  }
}

function localSnapshotFixture(ownerPartitionKey: string, updatedAt: string) {
  const placementId = makeStudioV3PlacementId("gallery", workSourceRef(41));
  const expected = {
    ownerPartitionKey,
    presenceId: 29,
    baseIdentity,
    baseFingerprint: "atomic-base",
    roomIds: ["gallery"],
  };
  return {
    expected,
    presence: {
      schemaVersion: STUDIO_V3_LOCAL_SCHEMA_VERSION,
      ownerPartitionKey,
      scope: "presence" as const,
      presenceId: 29,
      baseIdentity,
      baseFingerprint: "atomic-base",
      metadataRevision: 0,
      metadata: localPrivateMetadata(),
      mode: "advanced-creative" as const,
      activeRoomId: "gallery",
      activeLookId: "soft-editorial",
      namedLooks: [],
      locks: [],
      updatedAt,
    },
    rooms: [{
      schemaVersion: STUDIO_V3_LOCAL_SCHEMA_VERSION,
      ownerPartitionKey,
      scope: "room" as const,
      presenceId: 29,
      roomId: "gallery",
      baseIdentity,
      baseFingerprint: "atomic-base",
      placementSourceRefs: { [placementId]: workSourceRef(41) },
      placements: [{
        id: placementId,
        roomId: "gallery",
        sourceRef: workSourceRef(41),
        order: 1,
        status: "placed" as const,
      }],
      locks: [],
      updatedAt,
    }],
  };
}

function localPrivateMetadata() {
  const placementId = makeStudioV3ObjectId("gallery", workSourceRef(41));
  return {
    owner_mode: "advanced-creative" as const,
    named_looks: [],
    layer_locks: [],
    savepoints: [],
    placements: [{
      id: placementId,
      roomId: "gallery",
      sourceRef: workSourceRef(41),
      objectId: placementId,
      order: 1,
      status: "placed",
    }],
    restore: {
      activeRoomId: "gallery",
      activeLookId: "soft-editorial",
      roomStyles: [{ roomId: "gallery", styleId: "gallery-wall", compositionToken: "gallery-wall" }],
      unresolvedRefs: [],
    },
    compatibility: [],
  };
}

test("browser-local snapshots promote only complete generations and recover the previous good generation", () => {
  const storage = new MemoryStorage();
  const first = localSnapshotFixture("subject-a", "2026-07-21T00:00:00.000Z");
  const second = localSnapshotFixture("subject-a", "2026-07-21T00:01:00.000Z");
  writeStudioV3LocalSnapshot({ storage, ...first, generation: "good-generation" });
  writeStudioV3LocalSnapshot({ storage, ...second, generation: "torn-generation" });

  const tornKey = studioV3SnapshotKey({ ...second.expected, generation: "torn-generation" });
  storage.setItem(tornKey, JSON.stringify({
    schemaVersion: STUDIO_V3_LOCAL_SCHEMA_VERSION,
    ownerPartitionKey: "subject-a",
    presenceId: 29,
    baseIdentity,
    baseFingerprint: "atomic-base",
    generation: "torn-generation",
    presence: second.presence,
    rooms: [],
  }));
  const recovered = readStudioV3LocalSnapshot({ storage, expected: second.expected });
  assert.equal(recovered.source, "previous");
  assert.equal(recovered.snapshot?.generation, "good-generation");

  writeStudioV3LocalSnapshot({ storage, ...second, generation: "new-active" });
  storage.setItem(studioV3SnapshotKey({ ...second.expected, generation: "new-active" }), "{corrupt");
  assert.equal(readStudioV3LocalSnapshot({ storage, expected: second.expected }).snapshot?.generation, "good-generation");

  storage.setItem(studioV3SnapshotKey({ ...second.expected, generation: "good-generation" }), "{corrupt");
  assert.equal(readStudioV3LocalSnapshot({ storage, expected: second.expected }).snapshot, null);
});

test("browser-local snapshots retain the prior active generation when staging or promotion fails", () => {
  const storage = new ManifestFailureStorage();
  const first = localSnapshotFixture("subject-a", "2026-07-21T00:00:00.000Z");
  const second = localSnapshotFixture("subject-a", "2026-07-21T00:01:00.000Z");
  writeStudioV3LocalSnapshot({ storage, ...first, generation: "previous-good" });
  storage.failPromotion = true;
  assert.throws(() => writeStudioV3LocalSnapshot({ storage, ...second, generation: "candidate-failed" }), /manifest write failed/);
  assert.equal(storage.getItem(studioV3SnapshotKey({ ...second.expected, generation: "candidate-failed" })), null);
  assert.equal(readStudioV3LocalSnapshot({ storage, expected: first.expected }).snapshot?.generation, "previous-good");
});

test("browser-local snapshots retain only active and previous complete generations", () => {
  const storage = new MemoryStorage();
  const fixture = localSnapshotFixture("subject-a", "2026-07-21T00:00:00.000Z");
  writeStudioV3LocalSnapshot({ storage, ...fixture, generation: "one" });
  writeStudioV3LocalSnapshot({ storage, ...fixture, generation: "two" });
  writeStudioV3LocalSnapshot({ storage, ...fixture, generation: "three" });
  assert.equal(storage.getItem(studioV3SnapshotKey({ ...fixture.expected, generation: "one" })), null);
  assert.ok(storage.getItem(studioV3SnapshotKey({ ...fixture.expected, generation: "two" })));
  assert.ok(storage.getItem(studioV3SnapshotKey({ ...fixture.expected, generation: "three" })));
});

test("browser-local snapshots reject missing, malformed, and stale room generations as whole snapshots", () => {
  const storage = new MemoryStorage();
  const first = localSnapshotFixture("subject-a", "2026-07-21T00:00:00.000Z");
  const second = localSnapshotFixture("subject-a", "2026-07-21T00:01:00.000Z");
  writeStudioV3LocalSnapshot({ storage, ...first, generation: "previous-good" });
  writeStudioV3LocalSnapshot({ storage, ...second, generation: "invalid-active" });
  const activeKey = studioV3SnapshotKey({ ...second.expected, generation: "invalid-active" });
  const active = JSON.parse(storage.getItem(activeKey) ?? "{}");
  active.rooms[0].baseFingerprint = "stale-base";
  active.rooms[0].placements[0].id = "malformed-placement";
  storage.setItem(activeKey, JSON.stringify(active));
  const recovered = readStudioV3LocalSnapshot({ storage, expected: second.expected });
  assert.equal(recovered.source, "previous");
  assert.equal(recovered.snapshot?.generation, "previous-good");
});

test("browser-local snapshots isolate authenticated subjects and degrade honestly when storage is unavailable", () => {
  const storage = new MemoryStorage();
  const subjectA = localSnapshotFixture("subject-a", "2026-07-21T00:00:00.000Z");
  const subjectB = localSnapshotFixture("subject-b", "2026-07-21T00:00:00.000Z");
  writeStudioV3LocalSnapshot({ storage, ...subjectA, generation: "same-subject" });
  assert.equal(readStudioV3LocalSnapshot({ storage, expected: subjectA.expected }).source, "active");
  assert.equal(readStudioV3LocalSnapshot({ storage, expected: subjectB.expected }).snapshot, null);
  assert.ok(clearStudioV3LocalStateForOwnerPartition({ storage, ownerPartitionKey: "subject-a" }) > 0);
  assert.equal(readStudioV3LocalSnapshot({ storage, expected: subjectA.expected }).snapshot, null);

  const unavailable = new MemoryStorage();
  unavailable.getItem = () => { throw new Error("storage unavailable"); };
  assert.equal(readStudioV3LocalSnapshot({ storage: unavailable, expected: subjectA.expected }).snapshot, null);
});

test("compiler places Piece and Collection deterministically without leaking raw source refs to public room", async () => {
  const config = baseEditableConfig();
  const base = await createStudioV3BaseSnapshot(config, "published");
  const baseState = studioV2FromPresenceConfig(config, baseNode);
  let document = hydrateStudioV3Document({
    nodeId: 29,
    slug: "bbbvision",
    title: "bbb.vision",
    baseConfig: config,
    base,
    studioV2State: baseState,
    works: baseNode.works ?? [],
    collections: baseNode.collections ?? [],
  });

  document = placeStudioV3Piece(document, "gallery", workSourceRef(41));
  const firstPlacementId = document.rooms[0].placements[0].id;
  document = placeStudioV3Collection(document, "gallery", collectionSourceRef(5));
  assert.equal(firstPlacementId, makeStudioV3ObjectId("gallery", workSourceRef(41)));
  const duplicatePlacement = document.rooms[0].placements.find((placement) => placement.status === "duplicate");
  assert.equal(duplicatePlacement?.id, makeStudioV3PlacementId("gallery", workSourceRef(41), 1));
  assert.equal(isStudioV3PlacementId(duplicatePlacement?.id ?? "", "gallery", workSourceRef(41)), true);
  assert.equal(new Set(document.rooms[0].placements.map((placement) => placement.id)).size, document.rooms[0].placements.length);

  const compiled = compileStudioV3Document(document, baseState);
  assert.equal(compiled.issues.filter((issue) => issue.severity === "error").length, 0);
  assert.equal(containsRawStudioV3SourceRef(compiled.publicRoom), false);
  assert.ok(compiled.publicRoom.chambers[0].objects.some((object) => object.id === firstPlacementId));
});

test("fallback owner Library Collection uses the registered sentinel and survives metadata roundtrip", async () => {
  const fallbackNode: PresenceNode = { ...baseNode, collections: [] };
  const fixture = await hydratedP1Fixture(fallbackNode);
  const collectionRef = loadedOwnerLibraryCollectionSourceRef();
  assert.deepEqual(Object.keys(fixture.document.collections), [collectionRef]);
  assert.equal(fixture.document.collections[collectionRef]?.sourceRef, collectionRef);

  const placed = placeStudioV3Collection(fixture.document, "gallery", collectionRef);
  assert.equal(placed.rooms[0].placements[0]?.collectionSourceRef, collectionRef);
  const metadata = projectStudioV3Metadata(placed);
  assert.equal(metadata.placements[0]?.collectionSourceRef, collectionRef);

  const restored = restoreStudioV3Metadata(fixture.document, metadata);
  assert.equal(restored.report.status, "exact");
  assert.equal(restored.document.rooms[0].placements[0]?.collectionSourceRef, collectionRef);
  const compiled = compileStudioV3Document(restored.document, fixture.baseState);
  assert.equal(containsRawStudioV3SourceRef(compiled.publicRoom), false);
});

test("compiler shelves hidden/unavailable Pieces and excludes them from public-shaped output", async () => {
  const hiddenNode: PresenceNode = {
    ...baseNode,
    works: [
      ...(baseNode.works ?? []),
      {
        id: 42,
        collection_id: 5,
        title: "Hidden Study",
        year: "2026",
        description: "Should not compile to public output.",
        image_url: "/media/hidden-study.jpg",
        sort_order: 2,
        is_visible: false,
      },
    ],
  };
  const config = baseEditableConfig();
  const base = await createStudioV3BaseSnapshot(config, "published");
  const baseState = studioV2FromPresenceConfig(config, hiddenNode);
  let document = hydrateStudioV3Document({
    nodeId: 29,
    slug: "bbbvision",
    title: "bbb.vision",
    baseConfig: config,
    base,
    studioV2State: baseState,
    works: hiddenNode.works ?? [],
    collections: hiddenNode.collections ?? [],
  });

  document = placeStudioV3Piece(document, "gallery", workSourceRef(42));
  assert.equal(document.rooms[0].placements[0].status, "shelved");
  assert.match(document.rooms[0].placements[0].reason ?? "", /hidden or unavailable/);

  const hiddenPlacementId = document.rooms[0].placements[0].id;
  document = {
    ...document,
    rooms: document.rooms.map((room) => ({
      ...room,
      placements: room.placements.map((placement) => ({ ...placement, status: "placed" as const })),
      composition: {
        layoutId: "gallery-wall",
        placements: [{
          objectId: hiddenPlacementId,
          chamberId: room.id,
          layoutId: "gallery-wall",
          zoneId: "opening-work",
          order: 0,
          size: "feature",
          treatment: "framed",
        }],
      },
    })),
  };

  const compiled = compileStudioV3Document(document, baseState);
  assert.equal(compiled.publicRoom.chambers[0].objects.some((object) => object.title === "Hidden Study"), false);
  assert.equal(compiled.publicRoom.chambers[0].composition?.placements.some((placement) => placement.objectId === hiddenPlacementId), false);
  assert.equal(containsRawStudioV3SourceRef(compiled.publicRoom), false);

  const remapped = stageStudioV3RoomStyle(document, {
    roomId: "gallery",
    roomStyleId: "film-strip-selected-works",
    now: "2026-07-21T01:00:00.000Z",
  });
  const remappedPlacement = remapped.stagedDocument.rooms[0].placements[0];
  assert.equal(remappedPlacement.status, "shelved");
  assert.equal(remappedPlacement.reason, STUDIO_V3_HIDDEN_OR_UNAVAILABLE_REASON);
  assert.equal(remapped.stagedDocument.rooms[0].composition?.placements.some((placement) => placement.objectId === hiddenPlacementId), false);
});

test("hidden placement stays private through metadata projection and restore", async () => {
  const fixture = await hydratedP1Fixture();
  const sourceRef = workSourceRef(41);
  const placed = placeStudioV3Piece(fixture.document, "gallery", sourceRef);
  const hiddenPlacementId = placed.rooms[0].placements[0].id;
  const hidden = {
    ...placed,
    rooms: placed.rooms.map((room) => ({
      ...room,
      placements: room.placements.map((placement) => ({
        ...placement,
        status: "placed" as const,
        visibility: "hidden" as const,
      })),
    })),
  };
  const metadata = projectStudioV3Metadata(hidden);
  assert.equal(metadata.placements[0]?.visibility, "hidden");

  const restored = restoreStudioV3Metadata(fixture.document, metadata);
  assert.equal(restored.report.status, "exact");
  assert.equal(restored.document.rooms[0].placements[0]?.status, "shelved");
  assert.equal(restored.document.rooms[0].placements[0]?.reason, STUDIO_V3_HIDDEN_OR_UNAVAILABLE_REASON);
  const compiled = compileStudioV3Document(restored.document, fixture.baseState);
  assert.equal(compiled.publicRoom.chambers[0].objects.some((object) => object.id === hiddenPlacementId), false);
  assert.equal(compiled.publicRoom.chambers[0].composition?.placements.some((placement) => placement.objectId === hiddenPlacementId), false);
});

test("compiler marks incompatible and direct duplicate placements without publishing them twice", async () => {
  const config = baseEditableConfig();
  const base = await createStudioV3BaseSnapshot(config, "published");
  const baseState = studioV2FromPresenceConfig(config, baseNode);
  let document = hydrateStudioV3Document({
    nodeId: 29,
    slug: "bbbvision",
    title: "bbb.vision",
    baseConfig: config,
    base,
    studioV2State: baseState,
    works: baseNode.works ?? [],
    collections: baseNode.collections ?? [],
  });
  const sourceRef = workSourceRef(41);
  document = {
    ...document,
    pieces: {
      ...document.pieces,
      [sourceRef]: {
        ...document.pieces[sourceRef],
        compatibleRoomStyles: ["threshold-portal"],
      },
    },
  };
  document = placeStudioV3Piece(document, "gallery", sourceRef);
  assert.equal(document.rooms[0].placements[0].status, "incompatible");

  document = {
    ...document,
    rooms: document.rooms.map((room) => ({ ...room, placements: [] })),
    pieces: {
      ...document.pieces,
      [sourceRef]: {
        ...document.pieces[sourceRef],
        compatibleRoomStyles: ["gallery-wall"],
      },
    },
  };
  document = placeStudioV3Piece(document, "gallery", sourceRef);
  document = placeStudioV3Piece(document, "gallery", sourceRef);
  assert.equal(document.rooms[0].placements.filter((placement) => placement.status === "placed").length, 1);
  assert.equal(document.rooms[0].placements.filter((placement) => placement.status === "duplicate").length, 1);
  assert.deepEqual(document.rooms[0].placements.map((placement) => placement.id), [
    makeStudioV3PlacementId("gallery", sourceRef),
    makeStudioV3PlacementId("gallery", sourceRef, 1),
  ]);
});

test("layer lock and named Look restore do not mutate placements", async () => {
  const config = baseEditableConfig();
  const base = await createStudioV3BaseSnapshot(config, "published");
  const baseState = studioV2FromPresenceConfig(config, baseNode);
  let document = hydrateStudioV3Document({
    nodeId: 29,
    slug: "bbbvision",
    title: "bbb.vision",
    baseConfig: config,
    base,
    studioV2State: baseState,
    works: baseNode.works ?? [],
    collections: baseNode.collections ?? [],
  });
  document = placeStudioV3Piece(document, "gallery", workSourceRef(41));
  const placementsBefore = JSON.stringify(document.rooms.map((room) => room.placements));

  document = lockStudioV3Layer(document, {
    scopeKind: "presence",
    scopeId: "29",
    layer: "motion-atmosphere",
    value: { motionIntensity: "still", background: "#f7f3ea" },
  });
  assert.equal(lockStudioV3Layer(document, {
    scopeKind: "presence",
    scopeId: "29",
    layer: "motion-atmosphere",
    value: { arbitrary: true },
  }).locks.length, document.locks.length);
  document = saveStudioV3NamedLook(applyStudioV3Look(document, "soft-editorial"), "Saved Soft", "2026-07-21T00:00:00.000Z");
  document = saveStudioV3NamedLook(document, "https://bad.example/look", "2026-07-21T00:00:01.000Z");
  assert.equal(document.namedLooks[1].name, "Named Look");
  const named = document.namedLooks[0];
  document = applyStudioV3Look(applyStudioV3Look(document, "nocturnal-gallery"), named.id);

  assert.equal(JSON.stringify(document.rooms.map((room) => room.placements)), placementsBefore);
});

test("P1 exposes three materially distinct Looks and a complete 3x3 compatibility registry", () => {
  assert.deepEqual(STUDIO_V3_P1_LOOKS.map((look) => look.id), [
    "soft-editorial",
    "nocturnal-gallery",
    "zine-archive",
  ]);
  assert.equal(new Set(STUDIO_V3_P1_LOOKS.map((look) => look.values.atmosphere)).size, 3);
  assert.equal(new Set(STUDIO_V3_P1_LOOKS.map((look) => look.values.density)).size, 3);
  assert.equal(new Set(STUDIO_V3_P1_LOOKS.map((look) => look.values.pieceTreatment)).size, 3);
  assert.equal(new Set(STUDIO_V3_P1_LOOKS.map((look) => look.values.motionIntensity)).size, 3);
  assert.equal(STUDIO_V3_ZINE_ARCHIVE_LOOK.values.atmosphere, "ledger-scan");
  assert.equal(STUDIO_V3_ZINE_ARCHIVE_LOOK.values.roomStyleId, "film-strip-selected-works");

  assert.equal(STUDIO_V3_LOOK_ROOM_STYLE_COMPATIBILITY.length, 9);
  assert.equal(new Set(STUDIO_V3_LOOK_ROOM_STYLE_COMPATIBILITY.map((item) => `${item.lookId}:${item.roomStyleId}`)).size, 9);
  for (const look of STUDIO_V3_P1_LOOKS) {
    for (const style of STUDIO_V3_ROOM_STYLE_DEFINITIONS) {
      assert.ok(STUDIO_V3_LOOK_ROOM_STYLE_COMPATIBILITY.some((item) => item.lookId === look.id && item.roomStyleId === style.id));
    }
  }
  const filmMappings = STUDIO_V3_LOOK_ROOM_STYLE_COMPATIBILITY.filter((item) => item.roomStyleId === "film-strip-selected-works");
  assert.equal(filmMappings.every((item) => item.v2LayoutId === "film-strip-selected-works"), true);
  assert.equal(filmMappings.some((item) => item.publicStylePreset === "christina-liquid-gallery"), false);
});

test("Look facets compile into visible V2 experience axes while Room Style remains chamber-scoped", async () => {
  const fixture = await hydratedP1Fixture();
  const expectations = [
    ["soft-editorial", "spacious", "paper-light", "quiet-framed", "editorial-browse", "gallery-p2", "gallery"],
    ["nocturnal-gallery", "focused", "nocturnal-depth", "luminous-depth", "threshold-reveal", "bbbvision-threshold-gallery", "gallery"],
    ["zine-archive", "dense", "ledger-scan", "captioned-ledger", "archive-index", "gallery-p2", "zine"],
  ] as const;
  for (const [lookId, density, atmosphere, treatment, journey, preset, worldId] of expectations) {
    const compiled = compileStudioV3Document(applyStudioV3Look(fixture.document, lookId), fixture.baseState);
    assert.equal(compiled.studioV2State.skin.experienceDensity, density);
    assert.equal(compiled.studioV2State.skin.experienceAtmosphere, atmosphere);
    assert.equal(compiled.studioV2State.skin.experiencePieceTreatment, treatment);
    assert.equal(compiled.studioV2State.skin.experienceJourney, journey);
    assert.equal(compiled.studioV2State.publicStylePreset, preset);
    assert.equal(compiled.studioV2State.worldId, worldId);
  }

  const nocturnal = applyStudioV3Look(fixture.document, "nocturnal-gallery");
  const stage = stageStudioV3RoomStyle(nocturnal, {
    roomId: "gallery",
    roomStyleId: "film-strip-selected-works",
    now: "2026-07-21T00:55:00.000Z",
  });
  const compiledFilm = compileStudioV3Document(applyStudioV3StructuralStage(stage).document, fixture.baseState);
  assert.equal(compiledFilm.studioV2State.publicStylePreset, "bbbvision-threshold-gallery");
  assert.equal(compiledFilm.studioV2State.worldId, "gallery");
  assert.equal(compiledFilm.studioV2State.chambers[0].composition?.layoutId, "film-strip-selected-works");
});

test("base identity carries monotonic revision without including it in the semantic fingerprint", async () => {
  const withRevision = baseEditableConfig();
  withRevision.revision = 9;
  const withoutRevision = { ...withRevision };
  delete withoutRevision.revision;
  const first = await createStudioV3BaseSnapshot(withRevision, "draft");
  const legacy = await createStudioV3BaseSnapshot(withoutRevision, "draft");

  assert.equal(first.identity.revision, 9);
  assert.equal(hasStudioV3ServerRevision(first.identity), true);
  assert.equal(legacy.identity.revision, null);
  assert.equal(hasStudioV3ServerRevision(legacy.identity), false);
  assert.equal(first.fingerprint, legacy.fingerprint);
});

test("Film Strip stages explicitly and compiles as the exact bounded V2 composition", async () => {
  const fixture = await hydratedP1Fixture();
  let document = placeStudioV3Piece(fixture.document, "gallery", workSourceRef(41));
  document = applyStudioV3Look(document, "zine-archive");
  assert.equal(document.rooms[0].styleId, "gallery-wall", "Look choice is a recommendation and must not move Room structure");

  const stage = stageStudioV3RoomStyle(document, {
    roomId: "gallery",
    roomStyleId: "film-strip-selected-works",
    now: "2026-07-21T01:00:00.000Z",
  });
  assert.equal(stage.status, "ready");
  assert.equal(stage.stagedDocument.rooms[0].styleId, "film-strip-selected-works");
  assert.equal(document.rooms[0].styleId, "gallery-wall");
  assert.notEqual(stage.compare.before.fingerprint, stage.compare.after.fingerprint);

  const applied = applyStudioV3StructuralStage(stage);
  const compiled = compileStudioV3Document(applied.document, fixture.baseState);
  assert.equal(compiled.studioV2State.chambers[0].composition?.layoutId, "film-strip-selected-works");
  assert.equal(compiled.publicRoom.chambers[0].composition?.layoutId, "film-strip-selected-works");
  assert.equal(compiled.studioV2State.publicStylePreset, "gallery-p2");
  assert.equal(compiled.studioV2State.chambers[0].composition?.placements.some((item) => item.zoneId === "active-work-stage"), true);
  assert.equal(compiled.studioV2State.chambers[0].composition?.placements.some((item) => item.zoneId === "sequence-index"), true);
});

test("structural staging is reference-only, deterministic, fully accounted, and exactly cancellable", async () => {
  const fixture = await hydratedP1Fixture();
  const document = placeStudioV3Piece(fixture.document, "gallery", workSourceRef(41));
  const first = stageStudioV3RoomStyle(document, {
    roomId: "gallery",
    roomStyleId: "film-strip-selected-works",
    now: "2026-07-21T01:05:00.000Z",
  });
  const second = stageStudioV3RoomStyle(document, {
    roomId: "gallery",
    roomStyleId: "film-strip-selected-works",
    now: "2026-07-21T01:05:00.000Z",
  });

  assert.deepEqual(first.savepoint, second.savepoint);
  assert.deepEqual(first.impact.accounting, second.impact.accounting);
  assert.equal(first.impact.accounting.length, document.rooms[0].baseObjectIds.length + document.rooms[0].placements.length);
  assert.equal(first.impact.accounting.every((item) => ["placed", "shelved", "unplaced", "duplicate"].includes(item.outcome)), true);
  const serialized = JSON.stringify(first.savepoint);
  assert.equal(serialized.includes("/media/"), false);
  assert.equal(serialized.includes("comparableConfig"), false);
  assert.equal(serialized.includes("diagnostics"), false);
  assert.equal(serialized.includes("fromWork"), false);

  const cancelled = cancelStudioV3StructuralStage(first);
  assert.equal(cancelled.report.status, "exact");
  assert.deepEqual(compareStudioV3StructuralStage(first, "before"), compareStudioV3StructuralStage({
    ...first,
    stagedDocument: cancelled.document,
  }, "after"));
});

test("structural restore reports unresolved references and retains current canonical indexes", async () => {
  const fixture = await hydratedP1Fixture();
  const sourceRef = workSourceRef(41);
  const document = placeStudioV3Piece(fixture.document, "gallery", sourceRef);
  const stage = stageStudioV3RoomStyle(document, {
    roomId: "gallery",
    roomStyleId: "film-strip-selected-works",
    now: "2026-07-21T01:10:00.000Z",
  });
  const current = structuredClone(stage.stagedDocument);
  delete current.pieces[sourceRef];
  const restored = restoreStudioV3Savepoint(current, stage.savepoint);

  assert.equal(restored.report.status, "partial");
  assert.equal(restored.report.issues.some((issue) => issue.kind === "missing-piece" && issue.reference === sourceRef), true);
  assert.equal(restored.document.pieces[sourceRef], undefined);
  assert.equal(restored.document.collections, current.collections);
  assert.equal(restored.document.base, current.base);
});

test("Look recommendations preserve Room locks and higher-precedence Room overrides", async () => {
  const fixture = await hydratedP1Fixture();
  const locked = {
    ...fixture.document,
    locks: [{
      id: "room:gallery:room-style",
      scopeKind: "room" as const,
      scopeId: "gallery",
      layer: "room-style" as const,
      value: { roomStyleId: "gallery-wall" },
      reason: "Keep this room",
    }],
  };
  const lockedStage = stageStudioV3LookRoomStyleRecommendation(locked, {
    roomId: "gallery",
    lookId: "zine-archive",
    now: "2026-07-21T01:15:00.000Z",
  });
  assert.equal(lockedStage.stagedDocument.rooms[0].styleId, "gallery-wall");
  assert.deepEqual(lockedStage.impact.preservedByLock, ["room:gallery:room-style"]);

  const overridden = {
    ...fixture.document,
    layerOverrides: [{
      id: "room:gallery:room-style",
      scopeKind: "room" as const,
      scopeId: "gallery",
      layer: "room-style" as const,
      value: { roomStyleId: "gallery-wall" as const },
      provenance: "custom-for-this-room",
    }],
  };
  const overrideStage = stageStudioV3LookRoomStyleRecommendation(overridden, {
    roomId: "gallery",
    lookId: "zine-archive",
    now: "2026-07-21T01:16:00.000Z",
  });
  assert.equal(overrideStage.stagedDocument.rooms[0].styleId, "gallery-wall");
  assert.deepEqual(overrideStage.impact.preservedByOverride, ["room:gallery:room-style"]);

  const resolved = resolveStudioV3ScopedValue({
    presence: { value: "presence", provenance: "system" },
    room: { value: "room", provenance: "room" },
    collection: { value: "collection", provenance: "collection" },
    piece: { value: "piece", provenance: "piece" },
  });
  assert.deepEqual(resolved, { value: "piece", provenance: "piece", scopeKind: "piece" });
});

test("reference metadata uses strict state categories and restores without canonical copies or writes", async () => {
  const fixture = await hydratedP1Fixture();
  let document = placeStudioV3Piece(fixture.document, "gallery", workSourceRef(41));
  document = placeStudioV3Collection(document, "gallery", collectionSourceRef(5));
  assert.equal(document.rooms[0].placements.length, 2);
  assert.equal(new Set(document.rooms[0].placements.map((placement) => placement.id)).size, 2);
  const stage = stageStudioV3RoomStyle(document, {
    roomId: "gallery",
    roomStyleId: "film-strip-selected-works",
    now: "2026-07-21T01:20:00.000Z",
  });
  const applied = applyStudioV3StructuralStage(stage);
  const metadata = projectStudioV3Metadata(applied.document, {
    savepoint: stage.savepoint,
    restoreReport: { status: "exact", issues: [] },
  });
  assert.deepEqual(Object.keys(metadata).sort(), [
    "compatibility",
    "layer_locks",
    "named_looks",
    "owner_mode",
    "placements",
    "restore",
    "savepoints",
  ]);
  const serialized = JSON.stringify(metadata);
  for (const forbidden of ["/media/", "comparableConfig", "fromWork", "fromCollection", "diagnostics", "owner_user_id"]) {
    assert.equal(serialized.includes(forbidden), false, `${forbidden} must not enter metadata`);
  }

  const restored = restoreStudioV3Metadata(fixture.document, metadata);
  assert.equal(restored.report.status, "exact");
  assert.equal(restored.document.rooms[0].styleId, "film-strip-selected-works");
  assert.equal(restored.document.savepoints.length, 1);
  assert.equal(restored.document.savepoints[0]?.fingerprint, stage.savepoint.fingerprint);
  const priorStructure = restoreStudioV3Savepoint(restored.document, restored.document.savepoints[0]!);
  assert.equal(priorStructure.report.status, "exact");
  assert.equal(priorStructure.document.rooms[0].styleId, "gallery-wall");
  assert.equal(restored.document.pieces, fixture.document.pieces);
  assert.equal(restored.document.collections, fixture.document.collections);

  const ownerPartitionKey = "duplicate-attempt-owner";
  const updatedAt = "2026-07-21T01:21:00.000Z";
  const expected = {
    ownerPartitionKey,
    presenceId: 29,
    baseIdentity: applied.document.base.identity,
    baseFingerprint: applied.document.base.fingerprint,
    roomIds: applied.document.rooms.map((room) => room.id),
  };
  const storage = new MemoryStorage();
  writeStudioV3LocalSnapshot({
    storage,
    expected,
    generation: "placed-plus-duplicate",
    presence: {
      schemaVersion: applied.document.schemaVersion,
      ownerPartitionKey,
      scope: "presence",
      presenceId: 29,
      baseIdentity: applied.document.base.identity,
      baseFingerprint: applied.document.base.fingerprint,
      metadataRevision: 0,
      metadata,
      mode: applied.document.mode,
      activeRoomId: applied.document.activeRoomId,
      activeLookId: applied.document.activeLookId,
      namedLooks: applied.document.namedLooks,
      locks: applied.document.locks.filter((lock) => lock.scopeKind === "presence"),
      updatedAt,
    },
    rooms: applied.document.rooms.map((room) => ({
      schemaVersion: applied.document.schemaVersion,
      ownerPartitionKey,
      scope: "room" as const,
      presenceId: 29,
      roomId: room.id,
      baseIdentity: applied.document.base.identity,
      baseFingerprint: applied.document.base.fingerprint,
      placementSourceRefs: Object.fromEntries(room.placements.map((placement) => [placement.id, placement.sourceRef])),
      placements: room.placements.map((placement) => ({
        id: placement.id,
        roomId: placement.roomId,
        sourceRef: placement.sourceRef,
        collectionSourceRef: placement.collectionSourceRef,
        order: placement.order,
        status: placement.status,
        reason: placement.reason,
      })),
      locks: applied.document.locks.filter((lock) => lock.scopeKind === "room" && lock.scopeId === room.id),
      updatedAt,
    })),
  });
  const recovered = readStudioV3LocalSnapshot({ storage, expected });
  assert.equal(recovered.source, "active");
  assert.equal(recovered.snapshot?.presence.metadata.savepoints.length, 1);
  assert.equal(recovered.snapshot?.rooms[0]?.placements?.length, 2);
  assert.equal(Object.keys(recovered.snapshot?.rooms[0]?.placementSourceRefs ?? {}).length, 2);

  const rejected = restoreStudioV3Metadata(fixture.document, {
    ...metadata,
    owner_mode: { preview_url: "https://forbidden.example" },
  });
  assert.equal(rejected.report.status, "rejected");
  assert.equal(rejected.document, fixture.document);
});

test("bridge result validation enforces synchronous suppression contract", () => {
  const activate: PresenceStudioV2EditorIntent = { kind: "activate-piece", pieceId: "studio-v3:gallery:abc", input: "pointer" };
  assert.equal(validateStudioV2EditorBridgeResult(activate, { kind: "piece-selected", pieceId: "studio-v3:gallery:abc", suppressVisitor: true }), true);
  assert.equal(validateStudioV2EditorBridgeResult(activate, { kind: "room-selected", roomId: "gallery", suppressVisitor: true }), false);
  const navigate: PresenceStudioV2EditorIntent = { kind: "navigate-room", roomId: "gallery", source: "direct" };
  assert.equal(validateStudioV2EditorBridgeResult(navigate, { kind: "room-selected", roomId: "gallery", suppressVisitor: true }), true);
});
