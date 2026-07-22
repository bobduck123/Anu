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
  applyStudioV3LayerOverride,
  findStudioV3ObjectContext,
  moveStudioV3ObjectToZone,
  reorderStudioV3Object,
  replaceStudioV3ObjectMedia,
  setStudioV3ObjectSize,
  setStudioV3ObjectTreatment,
  setStudioV3ObjectVisibility,
  toggleStudioV3ObjectFeatured,
  unplaceStudioV3Object,
  updateStudioV3ObjectCopy,
  upsertStudioV3MediaAsset,
} from "./editing.ts";
import {
  comparableConfigFromEditableConfig,
  fingerprintStudioV3BaseConfig,
  projectStudioV3WireJson,
  studioV3PostPayloadFromComparable,
} from "./fingerprint.ts";
import { shouldUsePresenceStudioV3Editor, STUDIO_V3_BROWSER_PILOT_FLAG } from "./feature.ts";
import {
  deriveStudioV3OwnerPartitionKey,
  clearStudioV3LocalStateForPresence,
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
  isSafeStudioV3MetadataEnvelope,
  isWithinStudioV3MetadataLimits,
  stageStudioV3LookRoomStyleRecommendation,
  stageStudioV3RoomStyle,
  STUDIO_V3_PRIVATE_METADATA_MAX_BYTES,
  STUDIO_V3_PRIVATE_METADATA_SECTION_MAX_BYTES,
  STUDIO_V3_ROOM_STYLE_DEFINITIONS,
} from "./p1State.ts";
import {
  collectionSourceRef,
  containsRawStudioV3SourceRef,
  findStudioV3LegacyPiece,
  findStudioV3Piece,
  isStudioV3PlacementId,
  legacyObjectSourceRef,
  loadedOwnerLibraryCollectionSourceRef,
  makeStudioV3LegacyPieceMapKey,
  makeStudioV3ObjectId,
  makeStudioV3ObjectEditId,
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
  assert.deepEqual(parseStudioV3SourceRef(" work:41 "), { kind: "work", id: "41" });
  assert.equal(parseStudioV3SourceRef("work:0"), null);
  assert.equal(parseStudioV3SourceRef("collection:0"), null);
  assert.equal(parseStudioV3SourceRef("collection:01"), null);
  assert.deepEqual(parseStudioV3SourceRef("work:2147483647"), { kind: "work", id: "2147483647" });
  assert.equal(parseStudioV3SourceRef("work:2147483648"), null);
  const boundedLegacyId = "a:".repeat(64);
  assert.deepEqual(parseStudioV3SourceRef(`legacy-object:${boundedLegacyId}`), {
    kind: "legacy-object",
    id: boundedLegacyId,
  });
  assert.equal(parseStudioV3SourceRef(`legacy-object:${"a".repeat(129)}`), null);
  assert.equal(parseStudioV3SourceRef("legacy-object:room/native"), null);
  assert.equal(parseStudioV3SourceRef("legacy-object:room native"), null);
  assert.throws(() => workSourceRef(0), /positive integer/);
  assert.throws(() => collectionSourceRef(0), /positive integer/);
  assert.throws(() => workSourceRef(2147483648), /supported positive integer/);
  assert.throws(() => collectionSourceRef(Number.MAX_SAFE_INTEGER), /supported positive integer/);
  assert.throws(() => legacyObjectSourceRef("room/native"), /bounded stable-id grammar/);
  assert.throws(() => legacyObjectSourceRef("a".repeat(129)), /bounded stable-id grammar/);
  assert.equal(loadedOwnerLibraryCollectionSourceRef(), STUDIO_V3_LOADED_OWNER_LIBRARY_SOURCE_REF);
  assert.equal(containsRawStudioV3SourceRef(STUDIO_V3_LOADED_OWNER_LIBRARY_SOURCE_REF), true);

  const objectId = makeStudioV3ObjectId("gallery", workSourceRef(41));
  assert.equal(objectId, makeStudioV3ObjectId("gallery", workSourceRef(41)));
  assert.match(objectId, /^studio-v3:gallery:/);
  assert.equal(containsRawStudioV3SourceRef(objectId), false);
  assert.equal(makeStudioV3PlacementId("gallery", legacyObjectSourceRef("p1-proof-work")), "studio-v3:gallery:1d5mwzz");
});

test("Room-qualified runtime Piece keys preserve legacy P1 source identity and restore duplicate object IDs", async () => {
  const config = baseEditableConfig();
  const base = await createStudioV3BaseSnapshot(config, "published");
  const state = baseStudioV2State();
  const duplicate = structuredClone(state.chambers[0]!);
  duplicate.id = "archive";
  duplicate.label = "Archive";
  duplicate.metadata = { role: "archive", isEntry: false };
  duplicate.objects[0] = { ...duplicate.objects[0]!, title: "Archive Legacy Work" };
  state.chambers[0]!.objects[0] = {
    ...state.chambers[0]!.objects[0]!,
    type: "cta",
    title: "Gallery Legacy Work",
  };
  state.chambers.push(duplicate);

  const hydrated = hydrateStudioV3Document({
    nodeId: 29,
    slug: "bbbvision",
    title: "bbb.vision",
    baseConfig: config,
    base,
    studioV2State: state,
    works: baseNode.works ?? [],
    collections: baseNode.collections ?? [],
  });
  const sourceRef = legacyObjectSourceRef("legacy-1");
  const galleryKey = makeStudioV3LegacyPieceMapKey("gallery", "legacy-1");
  const archiveKey = makeStudioV3LegacyPieceMapKey("archive", "legacy-1");
  assert.notEqual(galleryKey, archiveKey);
  assert.equal(hydrated.pieces[galleryKey]?.sourceRef, sourceRef);
  assert.equal(hydrated.pieces[archiveKey]?.sourceRef, sourceRef);
  assert.equal(findStudioV3LegacyPiece(hydrated.pieces, "gallery", "legacy-1")?.title, "Gallery Legacy Work");
  assert.equal(findStudioV3Piece(hydrated.pieces, sourceRef, "archive")?.title, "Archive Legacy Work");
  assert.equal(findStudioV3ObjectContext(hydrated, "gallery", "legacy-1")?.piece.title, "Gallery Legacy Work");
  assert.equal(findStudioV3ObjectContext(hydrated, "archive", "legacy-1")?.piece.title, "Archive Legacy Work");
  const hiddenArchive = setStudioV3ObjectVisibility(hydrated, {
    roomId: "archive",
    objectId: "legacy-1",
    visibility: "hidden",
  });
  assert.equal(hiddenArchive.objectEdits[makeStudioV3ObjectEditId("archive", "legacy-1")]?.visibility, "hidden");
  const hiddenGallery = setStudioV3ObjectVisibility(hydrated, {
    roomId: "gallery",
    objectId: "legacy-1",
    visibility: "hidden",
  });
  assert.equal(hiddenGallery.objectEdits[makeStudioV3ObjectEditId("gallery", "legacy-1")], undefined);

  let edited = updateStudioV3ObjectCopy(hydrated, { roomId: "gallery", objectId: "legacy-1", title: "Edited Gallery" });
  edited = updateStudioV3ObjectCopy(edited, { roomId: "archive", objectId: "legacy-1", title: "Edited Archive" });
  assert.equal(placeStudioV3Piece(edited, "archive", sourceRef), edited);
  const legacyPlacement = {
    id: makeStudioV3PlacementId("archive", sourceRef),
    roomId: "archive",
    sourceRef,
    order: 1,
    status: "placed" as const,
  };
  edited = {
    ...edited,
    rooms: edited.rooms.map((room) => room.id === "archive"
      ? { ...room, placements: [legacyPlacement] }
      : room),
  };
  const stage = stageStudioV3RoomStyle(edited, {
    roomId: "archive",
    roomStyleId: "film-strip-selected-works",
    now: "2026-07-22T00:00:00.000Z",
  });
  const staged = applyStudioV3StructuralStage(stage).document;
  const metadata = projectStudioV3Metadata(staged);
  assert.equal(metadata.placements[0]?.sourceRef, "legacy-object:legacy-1");
  assert.equal(
    staged.savepoints[0]?.rooms.find((room) => room.roomId === "archive")?.placements[0]?.sourceRef,
    "legacy-object:legacy-1",
  );
  assert.match(JSON.stringify(metadata.savepoints), /legacy-object:legacy-1/);
  assert.equal(metadata.object_edits.every((edit) => edit.sourceRef === "legacy-object:legacy-1"), true);
  const compatibilityIdentities = metadata.compatibility.map((row) => `${row.sourceRef}\u001f${row.roomId}\u001f${row.roomStyleId}`);
  assert.equal(new Set(compatibilityIdentities).size, compatibilityIdentities.length);
  const collectionPlacement = structuredClone(metadata);
  collectionPlacement.placements[0] = {
    ...collectionPlacement.placements[0]!,
    sourceRef: "collection:5",
    id: makeStudioV3PlacementId("archive", collectionSourceRef(5)),
  };
  assert.equal(isSafeStudioV3MetadataEnvelope(collectionPlacement), false);
  const collectionRequiredCta = structuredClone(metadata);
  collectionRequiredCta.savepoints[0]!.requiredCta = {
    ...collectionRequiredCta.savepoints[0]!.requiredCta as Record<string, unknown>,
    sourceRef: "collection:5",
  };
  assert.equal(isSafeStudioV3MetadataEnvelope(collectionRequiredCta), false);

  const restored = restoreStudioV3Metadata(hydrated, metadata);
  assert.equal(restored.report.status, "exact");
  assert.equal(restored.document.rooms.find((room) => room.id === "archive")?.placements[0]?.status, "duplicate");
  const compiled = compileStudioV3Document(restored.document, state);
  assert.equal(compiled.studioV2State.chambers.find((room) => room.id === "gallery")?.objects[0]?.title, "Edited Gallery");
  assert.equal(compiled.studioV2State.chambers.find((room) => room.id === "archive")?.objects[0]?.title, "Edited Archive");
});

test("explicit placement overlays preserve empty Rooms instead of resurrecting durable placements", async () => {
  const fixture = await hydratedP1Fixture();
  const gallery = fixture.document.rooms[0]!;
  const twoRoomBase = {
    ...fixture.document,
    rooms: [
      { ...gallery, placements: [] },
      {
        ...gallery,
        id: "archive",
        label: "Archive",
        baseObjectIds: [],
        placements: [],
      },
    ],
    navigation: {
      ...fixture.document.navigation,
      roomOrder: [gallery.id, "archive"],
    },
  };
  const sourceRef = workSourceRef(41);
  const durable = placeStudioV3Piece(placeStudioV3Piece(twoRoomBase, gallery.id, sourceRef), "archive", sourceRef);
  assert.equal(durable.rooms.find((room) => room.id === gallery.id)?.placements.length, 1);
  assert.equal(durable.rooms.find((room) => room.id === "archive")?.placements.length, 1);

  const durableMetadata = projectStudioV3Metadata(durable);
  const archiveOnlyMetadata = {
    ...durableMetadata,
    placements: durableMetadata.placements.filter((placement) => placement.roomId === "archive"),
  };
  const archiveOnly = restoreStudioV3Metadata(durable, archiveOnlyMetadata);
  assert.equal(archiveOnly.report.status, "exact");
  assert.equal(archiveOnly.document.rooms.find((room) => room.id === gallery.id)?.placements.length, 0);
  assert.equal(archiveOnly.document.rooms.find((room) => room.id === "archive")?.placements.length, 1);

  const emptyOverlay = restoreStudioV3Metadata(durable, { ...durableMetadata, placements: [] });
  assert.equal(emptyOverlay.report.status, "exact");
  assert.equal(emptyOverlay.document.rooms.every((room) => room.placements.length === 0), true);

  const { placements: _omitted, ...metadataWithoutPlacementOverlay } = durableMetadata;
  const inherited = restoreStudioV3Metadata(durable, metadataWithoutPlacementOverlay);
  assert.equal(inherited.report.status, "exact");
  assert.equal(inherited.document.rooms.every((room) => room.placements.length === 1), true);
  assert.equal(durable.rooms.every((room) => room.placements.length === 1), true);
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

test("discard local changes clears only the current Presence/base snapshot", () => {
  const storage = new MemoryStorage();
  const current = localSnapshotFixture("subject-a", "2026-07-21T00:00:00.000Z");
  const otherOwner = localSnapshotFixture("subject-b", "2026-07-21T00:00:00.000Z");
  writeStudioV3LocalSnapshot({ storage, ...current, generation: "current-presence" });
  writeStudioV3LocalSnapshot({ storage, ...otherOwner, generation: "other-owner" });

  assert.ok(clearStudioV3LocalStateForPresence({ storage, expected: current.expected }) > 0);
  assert.equal(readStudioV3LocalSnapshot({ storage, expected: current.expected }).snapshot, null);
  assert.equal(readStudioV3LocalSnapshot({ storage, expected: otherOwner.expected }).snapshot?.generation, "other-owner");
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
  const collectionAccounted = document;
  document = placeStudioV3Collection(document, "gallery", collectionSourceRef(5));
  assert.equal(document, collectionAccounted);

  const compiled = compileStudioV3Document(document, baseState);
  assert.equal(compiled.issues.filter((issue) => issue.severity === "error").length, 0);
  assert.equal(containsRawStudioV3SourceRef(compiled.publicRoom), false);
  assert.ok(compiled.publicRoom.chambers[0].objects.some((object) => object.id === firstPlacementId));
});

test("owner Library exposes only canonical Collections and never synthesizes a fallback grouping", async () => {
  const fallbackNode: PresenceNode = { ...baseNode, collections: [] };
  const fallbackFixture = await hydratedP1Fixture(fallbackNode);
  const collectionRef = loadedOwnerLibraryCollectionSourceRef();
  assert.deepEqual(Object.keys(fallbackFixture.document.collections), []);

  const placed = placeStudioV3Collection(fallbackFixture.document, "gallery", collectionRef);
  assert.equal(placed.rooms[0].placements.length, 0);
  assert.equal(placed.diagnostics.at(-1)?.code, "collection-unavailable");

  const fixture = await hydratedP1Fixture();
  const canonicalCollectionRef = collectionSourceRef(5);
  const emptyCollection = {
    ...fixture.document,
    collections: {
      ...fixture.document.collections,
      [canonicalCollectionRef]: {
        ...fixture.document.collections[canonicalCollectionRef],
        memberSourceRefs: [],
      },
    },
  };
  assert.equal(placeStudioV3Collection(emptyCollection, "gallery", canonicalCollectionRef), emptyCollection);

  let incompatibleCollection = {
    ...fixture.document,
    pieces: {
      ...fixture.document.pieces,
      [workSourceRef(41)]: {
        ...fixture.document.pieces[workSourceRef(41)],
        compatibleRoomStyles: ["threshold-portal" as const],
      },
    },
  };
  incompatibleCollection = placeStudioV3Collection(incompatibleCollection, "gallery", canonicalCollectionRef);
  assert.equal(incompatibleCollection.rooms[0].placements[0]?.status, "incompatible");
  assert.equal(incompatibleCollection.rooms[0].placements[0]?.collectionSourceRef, canonicalCollectionRef);
  const incompatibleAccounted = incompatibleCollection;
  incompatibleCollection = placeStudioV3Collection(incompatibleCollection, "gallery", canonicalCollectionRef);
  assert.equal(incompatibleCollection, incompatibleAccounted);

  const capacityFixture = await hydratedP1Fixture();
  const secondWorkRef = workSourceRef(42);
  const capacityDocument = {
    ...capacityFixture.document,
    pieces: {
      ...capacityFixture.document.pieces,
      [secondWorkRef]: { ...capacityFixture.document.pieces[workSourceRef(41)]!, id: secondWorkRef, sourceRef: secondWorkRef },
    },
    collections: {
      ...capacityFixture.document.collections,
      [canonicalCollectionRef]: {
        ...capacityFixture.document.collections[canonicalCollectionRef]!,
        memberSourceRefs: [workSourceRef(41), secondWorkRef],
      },
    },
    rooms: capacityFixture.document.rooms.map((room) => ({
      ...room,
      placements: Array.from({ length: 159 }, (_, index) => ({
        id: makeStudioV3PlacementId(room.id, workSourceRef(41), index),
        roomId: room.id,
        sourceRef: workSourceRef(41),
        order: index,
        status: "duplicate" as const,
      })),
    })),
  };
  const capacityBlocked = placeStudioV3Collection(capacityDocument, "gallery", canonicalCollectionRef);
  assert.equal(capacityBlocked.rooms[0]!.placements.length, 159);
  assert.equal(capacityBlocked.diagnostics.at(-1)?.code, "collection-capacity");

  const roomNativeTemplate = findStudioV3LegacyPiece(capacityFixture.document.pieces, "gallery", "legacy-1")!;
  const saturatedBaseObjectIds = Array.from({ length: 160 }, (_, index) => `base-${index}`);
  const saturatedLegacyPieces = Object.fromEntries(saturatedBaseObjectIds.map((objectId) => [
    makeStudioV3LegacyPieceMapKey("gallery", objectId),
    {
      ...roomNativeTemplate,
      id: objectId,
      sourceRef: legacyObjectSourceRef(objectId),
      roomId: "gallery",
    },
  ]));
  const compatibilitySaturated = {
    ...capacityFixture.document,
    pieces: { ...capacityFixture.document.pieces, ...saturatedLegacyPieces },
    rooms: capacityFixture.document.rooms.map((room) => ({
      ...room,
      baseObjectIds: saturatedBaseObjectIds,
      placements: [],
    })),
  };
  assert.equal(placeStudioV3Piece(compatibilitySaturated, "gallery", workSourceRef(41)), compatibilitySaturated);
});

test("M1 object edits compile copy and reference-only media for base and placed objects", async () => {
  const fixture = await hydratedP1Fixture();
  let document = upsertStudioV3MediaAsset(fixture.document, {
    media_id: "media-draft-41",
    url: "/api/presence/editor/assets/media-draft-41/preview",
    alt_text: "Private draft detail",
    status: "draft_uploaded",
    visibility: "private_draft",
    asset_type: "image",
  });
  document = upsertStudioV3MediaAsset(document, {
    media_id: "media-local-preview",
    url: "http://127.0.0.1:5105/api/presence/media/private/media-local-preview?signature=safe-runtime-only",
    alt_text: "Local protected preview",
    status: "draft_uploaded",
    visibility: "private_draft",
    asset_type: "image",
  });
  assert.equal(document.mediaAssets["media-local-preview"]?.sourceStatus, "current");

  document = updateStudioV3ObjectCopy(document, {
    roomId: "gallery",
    objectId: "legacy-1",
    title: "Edited threshold work",
    body: "Edited directly on the Studio V3 canvas.",
    caption: "Threshold caption",
  });
  document = replaceStudioV3ObjectMedia(document, {
    roomId: "gallery",
    objectId: "legacy-1",
    mediaSourceRef: workSourceRef(41),
    mediaAlt: "Ochre replacement",
  });
  document = placeStudioV3Piece(document, "gallery", workSourceRef(41));
  const placedId = document.rooms[0].placements[0]!.id;
  document = updateStudioV3ObjectCopy(document, {
    roomId: "gallery",
    objectId: placedId,
    title: "Placed work title",
    body: "Placed work detail",
  });
  document = replaceStudioV3ObjectMedia(document, {
    roomId: "gallery",
    objectId: placedId,
    mediaId: "media-draft-41",
    mediaAlt: "Draft replacement",
  });

  assert.equal(findStudioV3ObjectContext(document, "gallery", placedId)?.sourceRef, workSourceRef(41));
  assert.equal(findStudioV3ObjectContext(document, "gallery", placedId)?.placement?.id, placedId);
  const compiled = compileStudioV3Document(document, fixture.baseState);
  const baseObject = compiled.studioV2State.chambers[0].objects.find((object) => object.id === "legacy-1");
  const placedObject = compiled.studioV2State.chambers[0].objects.find((object) => object.id === placedId);
  assert.equal(baseObject?.title, "Edited threshold work");
  assert.equal(baseObject?.detail, "Edited directly on the Studio V3 canvas.");
  assert.deepEqual(baseObject?.image, { src: "/media/ochre-study.jpg", alt: "Ochre replacement" });
  assert.equal(placedObject?.title, "Placed work title");
  assert.equal(placedObject?.image?.src, "/api/presence/editor/assets/media-draft-41/preview");

  const metadata = projectStudioV3Metadata(document);
  assert.equal(metadata.object_edits.length, 2);
  assert.equal(JSON.stringify(metadata).includes("/media/"), false);
  assert.equal(JSON.stringify(metadata).includes("/preview"), false);
  assert.equal(JSON.stringify(metadata).includes("media-draft-41"), true);
  const restored = restoreStudioV3Metadata(fixture.document, metadata);
  assert.equal(restored.report.status, "partial");
  assert.equal(Object.keys(restored.document.objectEdits).length, 2);
  assert.equal(restored.document.objectEdits[makeStudioV3ObjectEditId("gallery", "legacy-1")]?.mediaSourceRef, workSourceRef(41));
  assert.equal(restored.document.objectEdits[makeStudioV3ObjectEditId("gallery", placedId)]?.mediaId, undefined);
});

test("M1 direct manipulation accepts registered zones, rejects unsafe moves, and preserves bounded visibility", async () => {
  const fixture = await hydratedP1Fixture();
  let document = placeStudioV3Piece(fixture.document, "gallery", workSourceRef(41));
  const placedId = document.rooms[0].placements[0]!.id;

  const moved = moveStudioV3ObjectToZone(document, fixture.baseState, {
    roomId: "gallery",
    objectId: placedId,
    zoneId: "main-wall",
  });
  assert.equal(moved.error, undefined);
  document = moved.document;
  assert.equal(document.objectEdits[makeStudioV3ObjectEditId("gallery", placedId)]?.zoneId, "main-wall");

  const resized = setStudioV3ObjectSize(document, fixture.baseState, {
    roomId: "gallery",
    objectId: placedId,
    size: "large",
  });
  assert.equal(resized.error, undefined);
  document = resized.document;
  assert.equal(document.objectEdits[makeStudioV3ObjectEditId("gallery", placedId)]?.size, "large");

  const treated = setStudioV3ObjectTreatment(document, fixture.baseState, {
    roomId: "gallery",
    objectId: placedId,
    treatment: "captioned",
  });
  assert.equal(treated.error, undefined);
  document = treated.document;
  assert.equal(document.objectEdits[makeStudioV3ObjectEditId("gallery", placedId)]?.treatment, "captioned");
  assert.equal(
    compileStudioV3Document(document, fixture.baseState).studioV2State.chambers[0].composition?.placements
      .find((placement) => placement.objectId === placedId)?.treatment,
    "captioned",
  );

  const unsupportedSize = setStudioV3ObjectSize(document, fixture.baseState, {
    roomId: "gallery",
    objectId: placedId,
    size: "feature",
  });
  assert.match(unsupportedSize.error ?? "", /not registered/);
  assert.equal(unsupportedSize.document, document);

  const rejected = moveStudioV3ObjectToZone(document, fixture.baseState, {
    roomId: "gallery",
    objectId: placedId,
    zoneId: "off-canvas-arbitrary-zone",
  });
  assert.match(rejected.error ?? "", /not available/);
  assert.equal(rejected.document, document);

  const reordered = reorderStudioV3Object(document, fixture.baseState, {
    roomId: "gallery",
    objectId: placedId,
    direction: "earlier",
  });
  assert.equal(reordered.error, undefined);
  document = reordered.document;

  const featured = toggleStudioV3ObjectFeatured(document, fixture.baseState, {
    roomId: "gallery",
    objectId: placedId,
  });
  assert.match(featured.error ?? "", /only supports|available/i);
  assert.equal(featured.document, document);

  document = setStudioV3ObjectVisibility(document, { roomId: "gallery", objectId: placedId, visibility: "hidden" });
  assert.equal(compileStudioV3Document(document, fixture.baseState).studioV2State.chambers[0].objects.some((object) => object.id === placedId), false);
  document = setStudioV3ObjectVisibility(document, { roomId: "gallery", objectId: placedId, visibility: "visible" });
  assert.equal(compileStudioV3Document(document, fixture.baseState).studioV2State.chambers[0].objects.some((object) => object.id === placedId), true);

  const unplaced = unplaceStudioV3Object(document, { roomId: "gallery", objectId: placedId });
  assert.equal(unplaced.rooms[0].placements.length, 0);
  assert.equal(unplaced.objectEdits[makeStudioV3ObjectEditId("gallery", placedId)], undefined);
});

test("M1 composition edits resolve final zone capacity independently of object-id order", async () => {
  const state = baseStudioV2State();
  const template = state.chambers[0]!.objects[0]!;
  const orderedIds = ["capacity-alpha", "capacity-bravo", "capacity-charlie"]
    .sort((left, right) => makeStudioV3ObjectEditId("gallery", left).localeCompare(makeStudioV3ObjectEditId("gallery", right)));
  const incomingId = orderedIds[0]!;
  const residentId = orderedIds[orderedIds.length - 1]!;
  state.chambers[0]!.objects = [
    { ...structuredClone(template), id: residentId, title: "Resident" },
    { ...structuredClone(template), id: incomingId, title: "Incoming" },
  ];
  const projected = presenceConfigFromStudioV2State(state, { schema_version: baseIdentity.schemaVersion });
  const config: PresenceEditableConfig = {
    ...baseEditableConfig(),
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
  const base = await createStudioV3BaseSnapshot(config, "published");
  const initial = hydrateStudioV3Document({
    nodeId: 29,
    slug: "bbbvision",
    title: "bbb.vision",
    baseConfig: config,
    base,
    studioV2State: state,
    works: [],
    collections: [],
  });

  const residentMoved = moveStudioV3ObjectToZone(initial, state, {
    roomId: "gallery",
    objectId: residentId,
    zoneId: "main-wall",
  });
  assert.equal(residentMoved.error, undefined);
  const incomingMoved = moveStudioV3ObjectToZone(residentMoved.document, state, {
    roomId: "gallery",
    objectId: incomingId,
    zoneId: "opening-work",
  });
  assert.equal(incomingMoved.error, undefined);
  assert.ok(makeStudioV3ObjectEditId("gallery", incomingId) < makeStudioV3ObjectEditId("gallery", residentId));

  const compiled = compileStudioV3Document(incomingMoved.document, state).studioV2State.chambers[0]!.composition!;
  assert.equal(compiled.placements.find((placement) => placement.objectId === residentId)?.zoneId, "main-wall");
  assert.equal(compiled.placements.find((placement) => placement.objectId === incomingId)?.zoneId, "opening-work");

  const restored = restoreStudioV3Metadata(initial, projectStudioV3Metadata(incomingMoved.document));
  assert.equal(restored.report.status, "exact");
  const restoredComposition = compileStudioV3Document(restored.document, state).studioV2State.chambers[0]!.composition!;
  assert.equal(restoredComposition.placements.find((placement) => placement.objectId === residentId)?.zoneId, "main-wall");
  assert.equal(restoredComposition.placements.find((placement) => placement.objectId === incomingId)?.zoneId, "opening-work");
});

test("M1 metadata strictly persists stable edits and layer values while rejecting raw media and ambiguous refs", async () => {
  const fixture = await hydratedP1Fixture();
  let document = updateStudioV3ObjectCopy(fixture.document, {
    roomId: "gallery",
    objectId: "legacy-1",
    title: "Private edit",
  });
  document = applyStudioV3LayerOverride(document, {
    scopeKind: "presence",
    scopeId: "29",
    layer: "motion-atmosphere",
    value: { background: "#102030", motionIntensity: "still" },
    provenance: "owner-m1",
  });
  document = applyStudioV3LayerOverride(document, {
    scopeKind: "presence",
    scopeId: "29",
    layer: "presence-look",
    value: { accentColor: "#405060" },
    provenance: "owner-m1",
  });
  document = applyStudioV3LayerOverride(document, {
    scopeKind: "presence",
    scopeId: "29",
    layer: "presence-look",
    value: { objectRadius: 12 },
    provenance: "owner-m1",
  });
  assert.deepEqual(document.layerOverrides.find((override) => override.layer === "presence-look")?.value, {
    accentColor: "#405060",
    objectRadius: 12,
  });
  const metadata = projectStudioV3Metadata(document);
  assert.deepEqual(Object.keys(metadata).sort(), [
    "compatibility",
    "layer_locks",
    "layer_values",
    "named_looks",
    "object_edits",
    "owner_mode",
    "placements",
    "restore",
    "savepoints",
  ]);
  assert.equal(isSafeStudioV3MetadataEnvelope(metadata), true);

  const restored = restoreStudioV3Metadata(fixture.document, metadata);
  assert.equal(restored.report.status, "exact");
  assert.equal(restored.document.objectEdits[makeStudioV3ObjectEditId("gallery", "legacy-1")]?.title, "Private edit");
  assert.deepEqual(restored.document.layerOverrides[0]?.value, { background: "#102030", motionIntensity: "still" });
  assert.equal(compileStudioV3Document(restored.document, fixture.baseState).studioV2State.skin.background, "#102030");

  const locked = lockStudioV3Layer(restored.document, {
    scopeKind: "presence",
    scopeId: "29",
    layer: "motion-atmosphere",
    value: { background: "#000000", motionIntensity: "still" },
  });
  const blockedByLock = applyStudioV3LayerOverride(locked, {
    scopeKind: "presence",
    scopeId: "29",
    layer: "motion-atmosphere",
    value: { background: "#ffffff" },
    provenance: "owner-m1",
  });
  assert.equal(blockedByLock, locked);
  const lockedMetadata = projectStudioV3Metadata(locked);
  const duplicateLockScope = structuredClone(lockedMetadata);
  duplicateLockScope.layer_locks.push({
    ...duplicateLockScope.layer_locks[0]!,
    id: "different-lock-id",
  });
  assert.equal(isSafeStudioV3MetadataEnvelope(duplicateLockScope), false);

  for (const [scopeKind, scopeId] of [
    ["room", "missing-room"],
    ["collection", "collection:999"],
    ["piece", "legacy-object:missing"],
  ] as const) {
    const orphanLock = structuredClone(lockedMetadata);
    orphanLock.layer_locks[0] = {
      ...orphanLock.layer_locks[0]!,
      id: `${scopeKind}:${scopeId}:motion-atmosphere`,
      scopeKind,
      scopeId,
    };
    assert.equal(isSafeStudioV3MetadataEnvelope(orphanLock), true);
    const orphanRestore = restoreStudioV3Metadata(fixture.document, orphanLock);
    assert.equal(orphanRestore.report.status, "partial");
    assert.equal(orphanRestore.document.locks.length, 0);
    assert.deepEqual(orphanRestore.report.issues, [{ kind: "invalid-reference", reference: scopeId }]);
  }

  const duplicateCompatibility = structuredClone(metadata);
  duplicateCompatibility.compatibility.push({
    ...duplicateCompatibility.compatibility[0]!,
    status: "shelved",
    reasonCode: "duplicate-semantic-row",
  });
  assert.equal(isSafeStudioV3MetadataEnvelope(duplicateCompatibility), false);

  const rawUrl = structuredClone(metadata);
  rawUrl.object_edits[0] = { ...rawUrl.object_edits[0], preview_url: "https://forbidden.example/private" };
  assert.equal(isSafeStudioV3MetadataEnvelope(rawUrl), false);
  const ambiguous = structuredClone(metadata);
  ambiguous.object_edits[0] = { ...ambiguous.object_edits[0], mediaSourceRef: "work:41", mediaId: "media-draft-41" };
  assert.equal(isSafeStudioV3MetadataEnvelope(ambiguous), false);

  const appearanceWithoutZone = structuredClone(metadata);
  appearanceWithoutZone.object_edits[0] = { ...appearanceWithoutZone.object_edits[0], size: "large" };
  assert.equal(isSafeStudioV3MetadataEnvelope(appearanceWithoutZone), false);
  const contradictoryFeaturedSize = structuredClone(metadata);
  contradictoryFeaturedSize.object_edits[0] = {
    ...contradictoryFeaturedSize.object_edits[0],
    zoneId: "main-wall",
    size: "large",
    featured: true,
  };
  assert.equal(isSafeStudioV3MetadataEnvelope(contradictoryFeaturedSize), false);
  const contradictoryUnfeaturedSize = structuredClone(metadata);
  contradictoryUnfeaturedSize.object_edits[0] = {
    ...contradictoryUnfeaturedSize.object_edits[0],
    zoneId: "opening-work",
    size: "feature",
    featured: false,
  };
  assert.equal(isSafeStudioV3MetadataEnvelope(contradictoryUnfeaturedSize), false);

  const wrongLayoutZone = structuredClone(metadata);
  wrongLayoutZone.object_edits[0] = {
    ...wrongLayoutZone.object_edits[0],
    zoneId: "threshold-image",
    size: "feature",
    treatment: "signal",
    featured: true,
  };
  assert.equal(isSafeStudioV3MetadataEnvelope(wrongLayoutZone), true);
  const wrongLayoutRestore = restoreStudioV3Metadata(fixture.document, wrongLayoutZone);
  const wrongLayoutEditId = String(wrongLayoutZone.object_edits[0]!.id);
  assert.equal(wrongLayoutRestore.report.status, "partial");
  assert.equal(wrongLayoutRestore.document.objectEdits[wrongLayoutEditId]?.title, "Private edit");
  assert.equal(wrongLayoutRestore.document.objectEdits[wrongLayoutEditId]?.zoneId, undefined);
  assert.equal(wrongLayoutRestore.document.objectEdits[wrongLayoutEditId]?.size, undefined);
  assert.equal(wrongLayoutRestore.document.objectEdits[wrongLayoutEditId]?.treatment, undefined);
  assert.equal(wrongLayoutRestore.document.objectEdits[wrongLayoutEditId]?.featured, undefined);

  const unsupportedZoneValues = structuredClone(metadata);
  unsupportedZoneValues.object_edits[0] = {
    ...unsupportedZoneValues.object_edits[0],
    zoneId: "main-wall",
    size: "feature",
    treatment: "signal",
    featured: true,
  };
  assert.equal(isSafeStudioV3MetadataEnvelope(unsupportedZoneValues), true);
  const unsupportedZoneRestore = restoreStudioV3Metadata(fixture.document, unsupportedZoneValues);
  const unsupportedZoneEditId = String(unsupportedZoneValues.object_edits[0]!.id);
  assert.equal(unsupportedZoneRestore.report.status, "partial");
  assert.equal(unsupportedZoneRestore.document.objectEdits[unsupportedZoneEditId]?.zoneId, "main-wall");
  assert.equal(unsupportedZoneRestore.document.objectEdits[unsupportedZoneEditId]?.size, undefined);
  assert.equal(unsupportedZoneRestore.document.objectEdits[unsupportedZoneEditId]?.treatment, undefined);
  assert.equal(unsupportedZoneRestore.document.objectEdits[unsupportedZoneEditId]?.featured, undefined);

  const capacityDocument = placeStudioV3Piece(fixture.document, "gallery", workSourceRef(41));
  const capacityPlacement = capacityDocument.rooms[0]!.placements[0]!;
  const hiddenForMove = setStudioV3ObjectVisibility(capacityDocument, {
    roomId: "gallery",
    objectId: "legacy-1",
    visibility: "hidden",
  });
  const moveIntoFreedZone = moveStudioV3ObjectToZone(hiddenForMove, fixture.baseState, {
    roomId: "gallery",
    objectId: capacityPlacement.id,
    zoneId: "opening-work",
  });
  assert.equal(moveIntoFreedZone.error, undefined);
  assert.equal(
    moveIntoFreedZone.document.objectEdits[makeStudioV3ObjectEditId("gallery", capacityPlacement.id)]?.zoneId,
    "opening-work",
  );
  const capacityMetadata = projectStudioV3Metadata(capacityDocument);
  capacityMetadata.object_edits = [{
    id: makeStudioV3ObjectEditId("gallery", capacityPlacement.id),
    roomId: "gallery",
    objectId: capacityPlacement.id,
    sourceRef: capacityPlacement.sourceRef,
    zoneId: "opening-work",
    size: "large",
    treatment: "framed",
  }];
  assert.equal(isSafeStudioV3MetadataEnvelope(capacityMetadata), true);
  const fullZoneRestore = restoreStudioV3Metadata(fixture.document, capacityMetadata);
  assert.equal(fullZoneRestore.report.status, "partial");
  assert.equal(fullZoneRestore.document.objectEdits[makeStudioV3ObjectEditId("gallery", capacityPlacement.id)], undefined);
  assert.equal(fullZoneRestore.report.issues.some((issue) => issue.reference.endsWith(":capacity")), true);

  const capacitySwap = structuredClone(capacityMetadata);
  capacitySwap.object_edits = [
    {
      id: makeStudioV3ObjectEditId("gallery", "legacy-1"),
      roomId: "gallery",
      objectId: "legacy-1",
      sourceRef: legacyObjectSourceRef("legacy-1"),
      zoneId: "main-wall",
      size: "large",
      treatment: "framed",
    },
    {
      id: makeStudioV3ObjectEditId("gallery", capacityPlacement.id),
      roomId: "gallery",
      objectId: capacityPlacement.id,
      sourceRef: capacityPlacement.sourceRef,
      zoneId: "opening-work",
      size: "large",
      treatment: "framed",
    },
  ];
  const capacitySwapRestore = restoreStudioV3Metadata(fixture.document, capacitySwap);
  assert.equal(capacitySwapRestore.report.status, "exact");
  const capacitySwapComposition = compileStudioV3Document(capacitySwapRestore.document, fixture.baseState)
    .studioV2State.chambers[0]!.composition!;
  assert.equal(capacitySwapComposition.placements.find((placement) => placement.objectId === "legacy-1")?.zoneId, "main-wall");
  assert.equal(capacitySwapComposition.placements.find((placement) => placement.objectId === capacityPlacement.id)?.zoneId, "opening-work");

  const hiddenResident = structuredClone(capacityMetadata);
  hiddenResident.object_edits = [
    {
      id: makeStudioV3ObjectEditId("gallery", "legacy-1"),
      roomId: "gallery",
      objectId: "legacy-1",
      sourceRef: legacyObjectSourceRef("legacy-1"),
      visibility: "hidden",
    },
    {
      id: makeStudioV3ObjectEditId("gallery", capacityPlacement.id),
      roomId: "gallery",
      objectId: capacityPlacement.id,
      sourceRef: capacityPlacement.sourceRef,
      zoneId: "opening-work",
      size: "large",
      treatment: "framed",
    },
  ];
  const hiddenResidentRestore = restoreStudioV3Metadata(fixture.document, hiddenResident);
  assert.equal(hiddenResidentRestore.report.status, "exact");
  const hiddenResidentComposition = compileStudioV3Document(hiddenResidentRestore.document, fixture.baseState)
    .studioV2State.chambers[0]!.composition!;
  assert.equal(hiddenResidentComposition.placements.some((placement) => placement.objectId === "legacy-1"), false);
  assert.equal(hiddenResidentComposition.placements.find((placement) => placement.objectId === capacityPlacement.id)?.zoneId, "opening-work");

  const wrongPresenceScope = structuredClone(metadata);
  wrongPresenceScope.layer_values[0] = { ...wrongPresenceScope.layer_values[0], scopeId: "999" };
  assert.equal(isSafeStudioV3MetadataEnvelope(wrongPresenceScope), true);
  assert.equal(restoreStudioV3Metadata(fixture.document, wrongPresenceScope).report.status, "rejected");
  const hostileRuntimeScope = {
    ...restored.document,
    layerOverrides: restored.document.layerOverrides.map((override) => ({ ...override, scopeId: "999" })),
  };
  assert.equal(
    compileStudioV3Document(hostileRuntimeScope, fixture.baseState).studioV2State.skin.background,
    compileStudioV3Document(fixture.document, fixture.baseState).studioV2State.skin.background,
  );

  const collectionEdit = structuredClone(metadata);
  collectionEdit.object_edits[0] = { ...collectionEdit.object_edits[0], sourceRef: "collection:5" };
  assert.equal(isSafeStudioV3MetadataEnvelope(collectionEdit), false);

  const partialV1 = {
    object_edits: metadata.object_edits,
    layer_values: metadata.layer_values,
  };
  assert.equal(isSafeStudioV3MetadataEnvelope(partialV1), true);
  assert.equal(restoreStudioV3Metadata(fixture.document, partialV1).report.status, "exact");

  const motionOnly = lockStudioV3Layer(fixture.document, {
    scopeKind: "presence",
    scopeId: "29",
    layer: "motion-atmosphere",
    value: { motionIntensity: "still" },
  });
  const motionOnlyMetadata = projectStudioV3Metadata(motionOnly);
  assert.equal(isSafeStudioV3MetadataEnvelope(motionOnlyMetadata), true);
  assert.equal(restoreStudioV3Metadata(fixture.document, motionOnlyMetadata).report.status, "exact");

  for (const unsafeCopy of [
    "artist@example.com",
    "example.com/private",
    "See example.com for context",
    "Visit example.com.",
    "See (example.com).",
    "Visit%20example.com%2Fprivate",
    "C:\\private\\image.png",
    "<script>alert(1)</script>",
    "api_key=do-not-store-this",
    "A".repeat(64),
  ]) {
    const rejectedCopy = updateStudioV3ObjectCopy(fixture.document, {
      roomId: "gallery",
      objectId: "legacy-1",
      title: unsafeCopy,
    });
    assert.equal(rejectedCopy, fixture.document, `unsafe copy should be rejected: ${unsafeCopy.slice(0, 24)}`);
  }
  const routeLikeCopy = updateStudioV3ObjectCopy(fixture.document, {
    roomId: "gallery",
    objectId: "legacy-1",
    body: "/opening is the name of this chapter",
  });
  assert.notEqual(routeLikeCopy, fixture.document);
});

test("M1 required navigation CTA cannot be hidden or given an empty label", async () => {
  const fixture = await hydratedP1Fixture();
  const placed = placeStudioV3Piece(fixture.document, "gallery", workSourceRef(41));
  const placement = placed.rooms[0]!.placements[0]!;
  const document = {
    ...placed,
    navigation: {
      ...placed.navigation,
      requiredCta: {
        visible: true,
        sourceRef: placement.sourceRef,
        destinationToken: "existing-base" as const,
      },
    },
  };

  assert.equal(setStudioV3ObjectVisibility(document, {
    roomId: "gallery",
    objectId: placement.id,
    visibility: "hidden",
  }), document);
  assert.equal(updateStudioV3ObjectCopy(document, {
    roomId: "gallery",
    objectId: placement.id,
    title: "   ",
  }), document);
  assert.equal(unplaceStudioV3Object(document, {
    roomId: "gallery",
    objectId: placement.id,
  }), document);

  const renamed = updateStudioV3ObjectCopy(document, {
    roomId: "gallery",
    objectId: placement.id,
    title: "Continue",
  });
  assert.equal(renamed.objectEdits[makeStudioV3ObjectEditId("gallery", placement.id)]?.title, "Continue");

  const hiddenPlacementMetadata = projectStudioV3Metadata(document);
  hiddenPlacementMetadata.placements[0] = {
    ...hiddenPlacementMetadata.placements[0],
    status: "shelved",
    visibility: "hidden",
  };
  assert.equal(restoreStudioV3Metadata(document, hiddenPlacementMetadata).report.status, "rejected");

  const omittedPlacementMetadata = projectStudioV3Metadata(document);
  omittedPlacementMetadata.placements = [];
  assert.equal(restoreStudioV3Metadata(document, omittedPlacementMetadata).report.status, "rejected");

  const hostileEditMetadata = projectStudioV3Metadata(document);
  hostileEditMetadata.object_edits = [{
    id: makeStudioV3ObjectEditId("gallery", placement.id),
    roomId: "gallery",
    objectId: placement.id,
    sourceRef: placement.sourceRef,
    title: "",
    visibility: "hidden",
  }];
  assert.equal(restoreStudioV3Metadata(document, hostileEditMetadata).report.status, "rejected");

  const hostileRuntimeDocument = {
    ...document,
    rooms: document.rooms.map((room) => room.id !== "gallery" ? room : {
      ...room,
      placements: room.placements.map((candidate) => candidate.id !== placement.id ? candidate : {
        ...candidate,
        status: "shelved" as const,
        visibility: "hidden" as const,
      }),
    }),
    objectEdits: {
      ...document.objectEdits,
      [makeStudioV3ObjectEditId("gallery", placement.id)]: {
        id: makeStudioV3ObjectEditId("gallery", placement.id),
        roomId: "gallery",
        objectId: placement.id,
        sourceRef: placement.sourceRef,
        title: "",
        visibility: "hidden" as const,
      },
    },
  };
  const compiledRequiredCta = compileStudioV3Document(hostileRuntimeDocument, fixture.baseState)
    .studioV2State.chambers[0]!.objects.find((object) => object.id === placement.id);
  assert.ok(compiledRequiredCta);
  assert.equal(compiledRequiredCta.title, "Ochre Study");

  const boundedCtaDocument = structuredClone(fixture.document);
  const requiredCtaPiece = findStudioV3LegacyPiece(boundedCtaDocument.pieces, "gallery", "legacy-1")!;
  requiredCtaPiece.snapshotType = "cta";
  const optionalCtaSourceRef = legacyObjectSourceRef("legacy-2");
  boundedCtaDocument.pieces[makeStudioV3LegacyPieceMapKey("gallery", "legacy-2")] = {
    ...requiredCtaPiece,
    id: "legacy-2",
    sourceRef: optionalCtaSourceRef,
    title: "Optional action",
  };
  boundedCtaDocument.rooms[0] = {
    ...boundedCtaDocument.rooms[0]!,
    baseObjectIds: ["legacy-2", "legacy-1"],
    composition: {
      layoutId: "gallery-wall",
      placements: [{
        objectId: "legacy-2",
        chamberId: "gallery",
        layoutId: "gallery-wall",
        zoneId: "cta-exit",
        order: 0,
        size: "medium",
        treatment: "signal",
      }],
    },
  };
  boundedCtaDocument.navigation.requiredCta = {
    visible: true,
    sourceRef: requiredCtaPiece.sourceRef,
    destinationToken: "existing-base",
  };
  const boundedCtaStage = stageStudioV3RoomStyle(boundedCtaDocument, {
    roomId: "gallery",
    roomStyleId: "gallery-wall",
    now: "2026-07-22T01:00:00.000Z",
  });
  assert.equal(boundedCtaStage.status, "ready");
  assert.equal(
    boundedCtaStage.impact.accounting.find((item) => item.objectId === "legacy-1")?.afterZoneId,
    "cta-exit",
  );
  assert.equal(
    boundedCtaStage.impact.accounting.find((item) => item.objectId === "legacy-2")?.outcome,
    "shelved",
  );
});

test("M1 metadata byte, section, key/item, and depth gates accept exact limits and reject one byte beyond", () => {
  const jsonSize = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).byteLength;
  const safeFill = (length: number) => "studio practice ".repeat(Math.ceil(length / 16)).slice(0, length);
  const objectEdits: Array<Record<string, unknown>> = [];
  while (jsonSize(objectEdits) < STUDIO_V3_PRIVATE_METADATA_SECTION_MAX_BYTES) {
    const index = objectEdits.length;
    const row = {
      id: makeStudioV3ObjectEditId("gallery", `object-${index}`),
      roomId: "gallery",
      objectId: `object-${index}`,
      sourceRef: `legacy-object:object-${index}`,
      body: "",
    };
    objectEdits.push(row);
    const remaining = STUDIO_V3_PRIVATE_METADATA_SECTION_MAX_BYTES - jsonSize(objectEdits);
    if (remaining <= 4000) {
      row.body = safeFill(remaining);
      break;
    }
    row.body = safeFill(4000);
  }
  assert.equal(jsonSize(objectEdits), STUDIO_V3_PRIVATE_METADATA_SECTION_MAX_BYTES);
  const atSectionLimit = { object_edits: objectEdits };
  assert.equal(isSafeStudioV3MetadataEnvelope(atSectionLimit), true);
  const overSectionLimit = structuredClone(atSectionLimit);
  overSectionLimit.object_edits.at(-1)!.body += "x";
  assert.equal(isSafeStudioV3MetadataEnvelope(overSectionLimit), false);

  const atTotalLimit = { a: "x".repeat(87_000), b: "x".repeat(87_000), c: "" };
  atTotalLimit.c = "x".repeat(STUDIO_V3_PRIVATE_METADATA_MAX_BYTES - jsonSize(atTotalLimit));
  assert.equal(jsonSize(atTotalLimit), STUDIO_V3_PRIVATE_METADATA_MAX_BYTES);
  assert.equal(isWithinStudioV3MetadataLimits(atTotalLimit), true);
  assert.equal(isWithinStudioV3MetadataLimits({ ...atTotalLimit, c: `${atTotalLimit.c}x` }), false);

  let atDepth: unknown = "leaf";
  for (let depth = 1; depth < 9; depth += 1) atDepth = { child: atDepth };
  assert.equal(isWithinStudioV3MetadataLimits(atDepth as Record<string, unknown>), true);
  assert.equal(isWithinStudioV3MetadataLimits({ child: atDepth }), false);
  assert.equal(isWithinStudioV3MetadataLimits({ section: Array.from({ length: 160 }, () => 1) }), true);
  assert.equal(isWithinStudioV3MetadataLimits({ section: Array.from({ length: 161 }, () => 1) }), false);
});

test("M1 named Looks preserve effective overrides and accept backend-compatible media IDs", async () => {
  const fixture = await hydratedP1Fixture();
  let document = applyStudioV3LayerOverride(fixture.document, {
    scopeKind: "presence",
    scopeId: "29",
    layer: "presence-look",
    value: { background: "#102030", headingWeight: 800 },
    provenance: "owner-m1",
  });
  document = saveStudioV3NamedLook(document, "Owner Override", "2026-07-22T00:00:00.000Z");
  assert.equal(document.namedLooks[0]?.values.background, "#102030");
  assert.equal(document.namedLooks[0]?.values.headingWeight, 800);

  const metadata = projectStudioV3Metadata(document);
  metadata.named_looks[0] = { ...metadata.named_looks[0], mediaIds: ["media-owner-1"] };
  assert.equal(isSafeStudioV3MetadataEnvelope(metadata), true);
  const restored = restoreStudioV3Metadata(fixture.document, metadata);
  assert.equal(restored.report.status, "exact");
  assert.deepEqual(restored.document.namedLooks[0]?.mediaIds, ["media-owner-1"]);

  const bounded = saveStudioV3NamedLook(fixture.document, "x".repeat(81), "2026-07-22T00:00:01.000Z");
  assert.equal(bounded.namedLooks[0]?.name, "Named Look");

  const oversized = structuredClone(metadata);
  oversized.named_looks = Array.from({ length: 161 }, (_, index) => ({
    ...metadata.named_looks[0]!,
    id: `named-look-${index}`,
    name: `Named Look ${index}`,
  }));
  assert.equal(isSafeStudioV3MetadataEnvelope(oversized), false);
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
  const duplicateAccounted = document;
  document = placeStudioV3Piece(document, "gallery", sourceRef);
  assert.equal(document, duplicateAccounted);
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

test("hidden object edits consume no bounded Room Style capacity in Gallery Wall or Film Strip", async () => {
  const fixture = await hydratedP1Fixture();
  const withoutRequiredCta = {
    ...fixture.document,
    navigation: {
      ...fixture.document.navigation,
      requiredCta: { ...fixture.document.navigation.requiredCta, visible: false },
    },
  };
  const hiddenResident = setStudioV3ObjectVisibility(withoutRequiredCta, {
    roomId: "gallery",
    objectId: "legacy-1",
    visibility: "hidden",
  });
  const document = placeStudioV3Piece(hiddenResident, "gallery", workSourceRef(41));
  const placedObjectId = document.rooms[0]!.placements[0]!.id;

  for (const [roomStyleId, featureZoneId] of [
    ["gallery-wall", "opening-work"],
    ["film-strip-selected-works", "active-work-stage"],
  ] as const) {
    const stage = stageStudioV3RoomStyle(document, {
      roomId: "gallery",
      roomStyleId,
      now: "2026-07-22T02:00:00.000Z",
    });
    assert.equal(stage.status, "ready");
    const hiddenAccounting = stage.impact.accounting.find((item) => item.objectId === "legacy-1");
    assert.equal(hiddenAccounting?.outcome, "shelved");
    assert.equal(hiddenAccounting?.afterZoneId, undefined);
    const visibleAccounting = stage.impact.accounting.find((item) => item.objectId === placedObjectId);
    assert.equal(visibleAccounting?.outcome, "placed");
    assert.equal(visibleAccounting?.afterZoneId, featureZoneId);

    const applied = applyStudioV3StructuralStage(stage);
    const compiled = compileStudioV3Document(applied.document, fixture.baseState).studioV2State.chambers[0]!;
    assert.equal(compiled.objects.some((object) => object.id === "legacy-1"), false);
    assert.equal(compiled.composition?.placements.some((placement) => placement.objectId === "legacy-1"), false);
    assert.equal(
      compiled.composition?.placements.find((placement) => placement.objectId === placedObjectId)?.zoneId,
      featureZoneId,
    );
    assert.equal(cancelStudioV3StructuralStage(stage).report.status, "exact");
  }

  const mismatchedEditId = makeStudioV3ObjectEditId("gallery", "legacy-1");
  const mismatchedSource = {
    ...withoutRequiredCta,
    objectEdits: {
      [mismatchedEditId]: {
        id: mismatchedEditId,
        roomId: "gallery",
        objectId: "legacy-1",
        sourceRef: workSourceRef(41),
        visibility: "hidden" as const,
        zoneId: "main-wall",
      },
    },
  };
  const sourceSafeStage = stageStudioV3RoomStyle(mismatchedSource, {
    roomId: "gallery",
    roomStyleId: "gallery-wall",
    now: "2026-07-22T02:01:00.000Z",
  });
  assert.equal(sourceSafeStage.status, "ready");
  const sourceSafeAccounting = sourceSafeStage.impact.accounting.find((item) => item.objectId === "legacy-1");
  assert.equal(sourceSafeAccounting?.outcome, "placed");
  assert.notEqual(sourceSafeAccounting?.afterZoneId, "main-wall");

  const explicitlyClearedMetadata = { object_edits: [] };
  const explicitlyCleared = restoreStudioV3Metadata(hiddenResident, explicitlyClearedMetadata);
  assert.equal(explicitlyCleared.report.status, "exact");
  assert.deepEqual(explicitlyCleared.document.objectEdits, {});
  assert.equal(
    compileStudioV3Document(explicitlyCleared.document, fixture.baseState)
      .studioV2State.chambers[0]!.objects.some((object) => object.id === "legacy-1"),
    true,
  );
});

test("private restore keeps visible residents in place while a hidden resident frees an explicitly arranged zone", async () => {
  const fixture = await hydratedP1Fixture();
  const residentBaseState = structuredClone(fixture.baseState);
  const residentDocument = structuredClone(fixture.document);
  const sourceObject = residentBaseState.chambers[0]!.objects[0]!;
  const sourcePiece = findStudioV3LegacyPiece(residentDocument.pieces, "gallery", "legacy-1")!;
  const residentSourceRef = legacyObjectSourceRef("legacy-2");
  const residentObject = { ...structuredClone(sourceObject), id: "legacy-2", title: "Visible resident" };
  residentBaseState.chambers[0]!.objects.push(residentObject);
  residentBaseState.chambers[0]!.composition = {
    layoutId: "gallery-wall",
    placements: [
      {
        objectId: "legacy-1",
        chamberId: "gallery",
        layoutId: "gallery-wall",
        zoneId: "opening-work",
        order: 0,
        size: "feature",
        treatment: "framed",
      },
      {
        objectId: "legacy-2",
        chamberId: "gallery",
        layoutId: "gallery-wall",
        zoneId: "main-wall",
        order: 0,
        size: "medium",
        treatment: "framed",
      },
    ],
  };
  residentDocument.pieces[makeStudioV3LegacyPieceMapKey("gallery", "legacy-2")] = {
    ...sourcePiece,
    id: "legacy-2",
    sourceRef: residentSourceRef,
    title: "Visible resident",
  };
  residentDocument.rooms[0] = {
    ...residentDocument.rooms[0]!,
    baseObjectIds: ["legacy-1", "legacy-2"],
    composition: structuredClone(residentBaseState.chambers[0]!.composition),
  };

  let edited = placeStudioV3Piece(residentDocument, "gallery", workSourceRef(41));
  edited = setStudioV3ObjectVisibility(edited, {
    roomId: "gallery",
    objectId: "legacy-1",
    visibility: "hidden",
  });
  const placedObjectId = edited.rooms[0]!.placements[0]!.id;
  const arranged = moveStudioV3ObjectToZone(edited, residentBaseState, {
    roomId: "gallery",
    objectId: placedObjectId,
    zoneId: "opening-work",
  });
  assert.equal(arranged.error, undefined);

  const restored = restoreStudioV3Metadata(residentDocument, projectStudioV3Metadata(arranged.document));
  assert.equal(restored.report.status, "exact");
  const composition = compileStudioV3Document(restored.document, residentBaseState)
    .studioV2State.chambers[0]!.composition!;
  assert.equal(composition.placements.some((placement) => placement.objectId === "legacy-1"), false);
  assert.equal(composition.placements.find((placement) => placement.objectId === "legacy-2")?.zoneId, "main-wall");
  assert.equal(composition.placements.find((placement) => placement.objectId === placedObjectId)?.zoneId, "opening-work");
});

test("placed Piece visibility remains an overlay through structural save, restore, and Show", async () => {
  const fixture = await hydratedP1Fixture();
  const placed = placeStudioV3Piece(fixture.document, "gallery", workSourceRef(41));
  const placedObjectId = placed.rooms[0]!.placements[0]!.id;
  const hidden = setStudioV3ObjectVisibility(placed, {
    roomId: "gallery",
    objectId: placedObjectId,
    visibility: "hidden",
  });
  const stage = stageStudioV3RoomStyle(hidden, {
    roomId: "gallery",
    roomStyleId: "gallery-wall",
    now: "2026-07-22T02:02:00.000Z",
  });
  assert.equal(stage.status, "ready");
  const applied = applyStudioV3StructuralStage(stage).document;
  assert.equal(applied.rooms[0]!.placements[0]!.status, "placed");
  assert.equal(stage.impact.accounting.find((item) => item.objectId === placedObjectId)?.outcome, "shelved");

  const restored = restoreStudioV3Metadata(fixture.document, projectStudioV3Metadata(applied));
  assert.equal(restored.report.status, "exact");
  assert.equal(restored.document.rooms[0]!.placements[0]!.status, "placed");
  const shown = setStudioV3ObjectVisibility(restored.document, {
    roomId: "gallery",
    objectId: placedObjectId,
    visibility: "visible",
  });
  const compiled = compileStudioV3Document(shown, fixture.baseState).studioV2State.chambers[0]!;
  assert.equal(compiled.objects.some((object) => object.id === placedObjectId), true);
  assert.equal(compiled.composition?.placements.some((placement) => placement.objectId === placedObjectId), true);
});

test("legacy placement visibility can be shown and survives private metadata reload", async () => {
  const fixture = await hydratedP1Fixture();
  const placed = placeStudioV3Piece(fixture.document, "gallery", workSourceRef(41));
  const placedObjectId = placed.rooms[0]!.placements[0]!.id;
  const legacyHidden = {
    ...placed,
    rooms: placed.rooms.map((room) => room.id !== "gallery" ? room : {
      ...room,
      placements: room.placements.map((placement) => placement.id !== placedObjectId ? placement : {
        ...placement,
        visibility: "hidden" as const,
      }),
    }),
  };
  const restoredHidden = restoreStudioV3Metadata(fixture.document, projectStudioV3Metadata(legacyHidden));
  assert.equal(restoredHidden.report.status, "exact");
  assert.equal(restoredHidden.document.rooms[0]!.placements[0]!.visibility, "hidden");
  assert.equal(restoredHidden.document.rooms[0]!.placements[0]!.status, "shelved");

  const shown = setStudioV3ObjectVisibility(restoredHidden.document, {
    roomId: "gallery",
    objectId: placedObjectId,
    visibility: "visible",
  });
  assert.equal(shown.rooms[0]!.placements[0]!.visibility, undefined);
  assert.equal(shown.rooms[0]!.placements[0]!.status, "placed");
  assert.equal(shown.rooms[0]!.composition?.placements.some((placement) => placement.objectId === placedObjectId), true);

  const reloaded = restoreStudioV3Metadata(fixture.document, projectStudioV3Metadata(shown));
  assert.equal(reloaded.report.status, "exact");
  assert.equal(reloaded.document.rooms[0]!.placements[0]!.visibility, undefined);
  assert.equal(reloaded.document.rooms[0]!.placements[0]!.status, "placed");
  const compiled = compileStudioV3Document(reloaded.document, fixture.baseState).studioV2State.chambers[0]!;
  assert.equal(compiled.objects.some((object) => object.id === placedObjectId), true);
  assert.equal(compiled.composition?.placements.some((placement) => placement.objectId === placedObjectId), true);
});

test("different Room Style clears stale arrangement fields and preserves independent edits", async () => {
  const fixture = await hydratedP1Fixture();
  const placed = placeStudioV3Piece(fixture.document, "gallery", workSourceRef(41));
  const placedObjectId = placed.rooms[0]!.placements[0]!.id;
  const withCopy = updateStudioV3ObjectCopy(placed, {
    roomId: "gallery",
    objectId: placedObjectId,
    title: "Arrangement-independent title",
  });
  const arranged = moveStudioV3ObjectToZone(withCopy, fixture.baseState, {
    roomId: "gallery",
    objectId: placedObjectId,
    zoneId: "main-wall",
  });
  assert.equal(arranged.error, undefined);
  const editId = makeStudioV3ObjectEditId("gallery", placedObjectId);
  assert.equal(arranged.document.objectEdits[editId]?.zoneId, "main-wall");

  const stage = stageStudioV3RoomStyle(arranged.document, {
    roomId: "gallery",
    roomStyleId: "film-strip-selected-works",
    now: "2026-07-22T02:03:00.000Z",
  });
  assert.equal(stage.status, "ready");
  const applied = applyStudioV3StructuralStage(stage).document;
  const retainedEdit = applied.objectEdits[editId];
  assert.equal(retainedEdit?.title, "Arrangement-independent title");
  assert.equal(retainedEdit?.zoneId, undefined);
  assert.equal(retainedEdit?.order, undefined);
  assert.equal(retainedEdit?.size, undefined);
  assert.equal(retainedEdit?.treatment, undefined);
  assert.equal(retainedEdit?.featured, undefined);
  assert.equal(applied.rooms[0]!.composition?.layoutId, "film-strip-selected-works");

  const reloaded = restoreStudioV3Metadata(fixture.document, projectStudioV3Metadata(applied));
  assert.equal(reloaded.report.status, "exact");
  assert.equal(reloaded.document.objectEdits[editId]?.title, "Arrangement-independent title");
  const compiled = compileStudioV3Document(reloaded.document, fixture.baseState).studioV2State.chambers[0]!;
  assert.equal(compiled.composition?.layoutId, "film-strip-selected-works");
  assert.equal(compiled.objects.find((object) => object.id === placedObjectId)?.title, "Arrangement-independent title");
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
    "layer_values",
    "named_looks",
    "object_edits",
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
  assert.equal(recovered.snapshot?.presence.metadata.savepoints?.length, 1);
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
