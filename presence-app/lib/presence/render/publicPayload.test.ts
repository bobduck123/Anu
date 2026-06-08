import assert from "node:assert/strict";
import test from "node:test";
import type { PresenceNode } from "../../api/types.ts";
import {
  createPublicRenderPayload,
  findRestrictedPublicPayloadFragments,
  findRestrictedPublicPayloadKeys,
} from "./publicPayload.ts";
import {
  DEFAULT_STUDIO_V2_SKIN,
  DEFAULT_STUDIO_V2_TRANSFORM,
  PRESENCE_STUDIO_V2_RENDERER_KEY,
  PRESENCE_STUDIO_V2_SCHEMA_VERSION,
  presenceConfigFromStudioV2State,
  type StudioV2State,
} from "../studio-v2/index.ts";

const node = {
  id: 11,
  slug: "ggm-christina-goddard",
  display_name: "Christina Kerkvliet Goddard",
  node_type: "artist",
  display_mode: "artist_gallery",
  status: "published",
  visibility: "public",
  renderer_key: "ggm-faithful-room-v1",
  owner_user_id: 22,
  metadata: {
    style_dna: { renderer_key: "ggm-faithful-room-v1" },
    platform_admin: true,
    presence_dna: { personality: { warmth: "warm" } },
  },
  analytics: { auth_subject: "private-auth-subject" },
  editable_config: {
    id: 7,
    room_id: 11,
    schema_version: "presence-editable-v1",
    version: 4,
    status: "published",
    renderer_key: "ggm-faithful-room-v1",
    scene_config: { scenes: [{ id: "artwork_field", title: "Published visible title" }] },
    style_dna: { palette: { ink: "#101010" } },
    motion_config: { intensity: "gentle" },
    asset_config: { hero_image: { url: "/images/live.webp", alt_text: "Painted coast" } },
    content_config: { display_name: "Published Artist" },
    roomkey_config: {},
    enquiry_config: {},
    locked_fields: [],
  },
} as unknown as PresenceNode;

test("public render payload omits nested editor and control-plane keys while retaining visible published values", () => {
  const payload = createPublicRenderPayload(node);
  assert.deepEqual(findRestrictedPublicPayloadKeys(payload), []);
  assert.equal(payload.node.editable_config, undefined);
  assert.equal(payload.node.owner_user_id, undefined);
  assert.equal(payload.node.analytics, undefined);
  assert.deepEqual(payload.node.metadata, { presence_dna: { personality: { warmth: "warm" } } });
  assert.equal(payload.renderModel.identity.displayName.value, "Published Artist");
  assert.equal(payload.renderModel.hero.slides[0]?.asset.url, "/images/live.webp");
  assert.equal(payload.studioV2Room, undefined);
});

test("public payload key scanner finds nested forbidden architecture terms", () => {
  assert.deepEqual(
    findRestrictedPublicPayloadKeys({
      nested: { content_config: {}, scene_config: {}, preview_token: "x", draft_storage_key: "private/path", signed_url: "secret-link" },
    }),
    ["content_config", "draft_storage_key", "preview_token", "scene_config", "signed_url"],
  );
});

test("public payload scanners find restricted V2/editor strings and private media fragments", () => {
  assert.deepEqual(
    findRestrictedPublicPayloadKeys({
      owner: {},
      draft: {},
      locked: true,
      pinned: true,
      hiddenPublic: true,
      hiddenMobile: true,
      auth: "x",
      session: "x",
      token: "x",
      localStorage: "x",
    }),
    ["auth", "draft", "hiddenmobile", "hiddenpublic", "localstorage", "locked", "owner", "pinned", "session", "token"],
  );

  assert.deepEqual(
    findRestrictedPublicPayloadFragments({
      labels: [
        "WILD TRANSFORM SUSPENDED",
        "v2-toolbar",
        "v2-side-panel",
        "v2-float",
        "localStorage",
        "/api/presence/owner/studio-rooms/1/draft",
        "private_draft",
        "draft_uploaded",
        "signed_url",
        "storage_key",
        "TemplateKit",
      ],
    }),
    [
      "/api/presence/owner",
      "/api/presence/owner/studio-rooms",
      "TemplateKit",
      "WILD TRANSFORM SUSPENDED",
      "draft_uploaded",
      "localStorage",
      "private_draft",
      "signed_url",
      "storage_key",
      "v2-float",
      "v2-side-panel",
      "v2-toolbar",
    ],
  );
});

test("public payload can include sanitized Studio V2 projection when the pilot flag is enabled", () => {
  const previousEnabled = process.env.NEXT_PUBLIC_PRESENCE_STUDIO_V2;
  const previousPilotIds = process.env.NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS;
  process.env.NEXT_PUBLIC_PRESENCE_STUDIO_V2 = "1";
  process.env.NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS = "11";

  try {
    const state: StudioV2State = {
      schemaVersion: PRESENCE_STUDIO_V2_SCHEMA_VERSION,
      rendererKey: PRESENCE_STUDIO_V2_RENDERER_KEY,
      roomId: "11",
      slug: "ggm-christina-goddard",
      title: "Published Artist",
      worldId: "gallery",
      publicStylePreset: "gallery-p2",
      skin: DEFAULT_STUDIO_V2_SKIN,
      cta: { label: "Visit studio", href: "https://example.com/studio" },
      chambers: [{
        id: "wall",
        label: "Wall",
        objects: [
          {
            id: "public-work",
            type: "image",
            title: "Blue Work",
            visibility: { public: true, mobile: true },
            transform: { ...DEFAULT_STUDIO_V2_TRANSFORM, x: 20 },
            locked: true,
            pinned: true,
          },
          {
            id: "private-note",
            type: "note",
            title: "Private note",
            visibility: { public: false, mobile: false },
            transform: DEFAULT_STUDIO_V2_TRANSFORM,
            locked: false,
            pinned: false,
          },
        ],
      }],
      moodboardRefs: [],
      traces: { enabled: false, demo: true, disclosure: "Demo traces" },
      mobileRecovery: { transformsSuspendedOnMobile: true, strategy: "suspend-mobile-transforms" },
    };
    const payload = createPublicRenderPayload({
      ...node,
      renderer_key: PRESENCE_STUDIO_V2_RENDERER_KEY,
      editable_config: {
        ...presenceConfigFromStudioV2State(state, null),
        status: "published",
      },
    } as PresenceNode);

    assert.ok(payload.studioV2Room);
    assert.equal(payload.studioV2Room.chambers[0].objects.length, 1);
    assert.equal(payload.studioV2Room.chambers[0].objects[0].id, "public-work");
    assert.equal(JSON.stringify(payload).includes("private-note"), false);
    assert.deepEqual(findRestrictedPublicPayloadKeys(payload), []);
    assert.deepEqual(findRestrictedPublicPayloadFragments(payload), []);
  } finally {
    process.env.NEXT_PUBLIC_PRESENCE_STUDIO_V2 = previousEnabled;
    process.env.NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS = previousPilotIds;
  }
});

test("public payload includes disclosed demo traces only when present in sanitized Studio V2 room", () => {
  const previousEnabled = process.env.NEXT_PUBLIC_PRESENCE_STUDIO_V2;
  const previousPilotIds = process.env.NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS;
  process.env.NEXT_PUBLIC_PRESENCE_STUDIO_V2 = "1";
  process.env.NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS = "11";

  try {
    const state: StudioV2State = {
      schemaVersion: PRESENCE_STUDIO_V2_SCHEMA_VERSION,
      rendererKey: PRESENCE_STUDIO_V2_RENDERER_KEY,
      roomId: "11",
      slug: "ggm-christina-goddard",
      title: "Published Artist",
      worldId: "gallery",
      publicStylePreset: "gallery-p2",
      skin: DEFAULT_STUDIO_V2_SKIN,
      cta: { label: "Visit studio", href: "https://example.com/studio" },
      chambers: [{ id: "wall", label: "Wall", objects: [] }],
      moodboardRefs: [],
      traces: {
        enabled: true,
        demo: true,
        disclosure: "Demo traces",
        entries: 12,
        seeds: 3,
        guestbook: 1,
        guestbookEntries: ["Illustrative room note."],
      },
      mobileRecovery: { transformsSuspendedOnMobile: false, strategy: "preserve" },
    };
    const payload = createPublicRenderPayload({
      ...node,
      renderer_key: PRESENCE_STUDIO_V2_RENDERER_KEY,
      editable_config: {
        ...presenceConfigFromStudioV2State(state, null),
        status: "published",
      },
    } as PresenceNode);

    assert.equal(payload.studioV2Room?.traces?.disclosure, "Demo traces");
    assert.equal(payload.studioV2Room?.traces?.guestbookEntries?.[0], "Illustrative room note.");
    assert.deepEqual(findRestrictedPublicPayloadKeys(payload), []);
    assert.deepEqual(findRestrictedPublicPayloadFragments(payload), []);
  } finally {
    process.env.NEXT_PUBLIC_PRESENCE_STUDIO_V2 = previousEnabled;
    process.env.NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS = previousPilotIds;
  }
});
