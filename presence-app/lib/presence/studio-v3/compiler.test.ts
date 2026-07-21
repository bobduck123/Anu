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
  STUDIO_V3_SOFT_EDITORIAL_LOOK,
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
import { STUDIO_V3_LOCAL_SCHEMA_VERSION, type StudioV3ComparableConfig } from "./model.ts";
import {
  collectionSourceRef,
  containsRawStudioV3SourceRef,
  makeStudioV3ObjectId,
  parseStudioV3SourceRef,
  workSourceRef,
} from "./sourceRefs.ts";
import { validateStudioV2EditorBridgeResult, type PresenceStudioV2EditorIntent } from "./editorBridge.ts";

const baseIdentity = {
  sourceKind: "published" as const,
  configId: 101,
  roomId: 29,
  version: 7,
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
  assert.deepEqual(parseStudioV3SourceRef("legacy-object:legacy-1"), { kind: "legacy-object", id: "legacy-1" });

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

  const roomEnvelope = {
    schemaVersion: STUDIO_V3_LOCAL_SCHEMA_VERSION,
    scope: "room" as const,
    ...common,
    roomId: "gallery",
    placementSourceRefs: { one: workSourceRef(41) },
    placements: [{
      id: makeStudioV3ObjectId("gallery", workSourceRef(41)),
      roomId: "gallery",
      sourceRef: workSourceRef(41),
      order: 1,
      status: "placed" as const,
    }],
    locks: [],
    updatedAt: "2026-07-21T00:00:00.000Z",
  };
  assert.deepEqual(validateStudioV3RoomEnvelope(roomEnvelope, { ...common, roomId: "gallery" })?.placementSourceRefs, { one: "work:41" });
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
      placementSourceRefs: { first: workSourceRef(41) },
      placements: [{
        id: makeStudioV3ObjectId("gallery", workSourceRef(41)),
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
  assert.equal(document.rooms[0].placements.some((placement) => placement.status === "duplicate"), true);

  const compiled = compileStudioV3Document(document, baseState);
  assert.equal(compiled.issues.filter((issue) => issue.severity === "error").length, 0);
  assert.equal(containsRawStudioV3SourceRef(compiled.publicRoom), false);
  assert.ok(compiled.publicRoom.chambers[0].objects.some((object) => object.id === firstPlacementId));
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

  const compiled = compileStudioV3Document(document, baseState);
  assert.equal(compiled.publicRoom.chambers[0].objects.some((object) => object.title === "Hidden Study"), false);
  assert.equal(containsRawStudioV3SourceRef(compiled.publicRoom), false);
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

test("bridge result validation enforces synchronous suppression contract", () => {
  const activate: PresenceStudioV2EditorIntent = { kind: "activate-piece", pieceId: "studio-v3:gallery:abc", input: "pointer" };
  assert.equal(validateStudioV2EditorBridgeResult(activate, { kind: "piece-selected", pieceId: "studio-v3:gallery:abc", suppressVisitor: true }), true);
  assert.equal(validateStudioV2EditorBridgeResult(activate, { kind: "room-selected", roomId: "gallery", suppressVisitor: true }), false);
  const navigate: PresenceStudioV2EditorIntent = { kind: "navigate-room", roomId: "gallery", source: "direct" };
  assert.equal(validateStudioV2EditorBridgeResult(navigate, { kind: "room-selected", roomId: "gallery", suppressVisitor: true }), true);
});
