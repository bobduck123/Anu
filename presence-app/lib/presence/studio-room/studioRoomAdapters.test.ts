import assert from "node:assert/strict";
import test from "node:test";
import type { PresenceEditableConfig, PresenceNode } from "../../api/types.ts";
import {
  SAMPLE_ROOM,
  createEditorDraftFromPublished,
  createStudioRoomState,
  getRoomForState,
  hasUnpublishedDraft,
  publishEditorDraft,
  renderModelFromStudioRoom,
  studioRoomFromEditableConfig,
  studioRoomFromPresenceNode,
  toPublicRoomPayload,
} from "./index.ts";
import { findRestrictedPublicPayloadKeys } from "../render/publicPayload.ts";

function node(overrides: Partial<PresenceNode> = {}): PresenceNode {
  return {
    id: 11,
    slug: "ggm-christina-goddard",
    display_name: "Christina Kerkvliet Goddard",
    headline: "Selected watercolour works",
    bio: "Studio biography",
    node_type: "artist",
    display_mode: "artist_gallery",
    status: "published",
    visibility: "public",
    renderer_key: "ggm-faithful-room-v1",
    works: [
      {
        id: 1,
        slug: "blue-work",
        title: "Blue Work",
        description: "A blue study.",
        image_url: "/works/blue.webp",
        thumbnail_url: "/works/blue-thumb.webp",
        is_visible: true,
      },
    ],
    ...overrides,
  } as PresenceNode;
}

const editableConfig: PresenceEditableConfig = {
  id: 101,
  room_id: 11,
  status: "draft",
  renderer_key: "ggm-faithful-room-v1",
  content_config: {
    display_name: "Draft Studio Room",
    headline: "Draft headline",
    about: { artist_statement: "Draft statement" },
  },
  scene_config: {
    scenes: [
      { id: "artwork_field", title: "Draft entrance title", statement: "Draft caption" },
      { id: "work_wall", title: "Draft wall", artwork_order: ["blue-work"] },
    ],
  },
  style_dna: {
    palette: { bg: "#111111", paper: "#eeeeee", ink: "#f8f2e8", muted: "#bbbbbb", accent: "#cc8844" },
    typography: { heading_stack: "Georgia, serif", body_stack: "Inter, sans-serif" },
  },
  motion_config: { intensity: "gentle" },
  asset_config: { hero_image: { url: "/hero/draft.webp", alt_text: "Draft hero" } },
  roomkey_config: {},
  enquiry_config: { cta_label: "Visit studio" },
  locked_fields: {},
};

test("existing editable config maps core identity, content and theme fields into Studio Room", () => {
  const room = studioRoomFromEditableConfig(editableConfig, node(), { mode: "draft" });
  assert.equal(room.id, "11");
  assert.equal(room.slug, "ggm-christina-goddard");
  assert.equal(room.title, "Draft Studio Room");
  assert.equal(room.state, "draft");
  assert.equal(room.theme.background, "#111111");
  assert.equal(room.theme.fontHeading, "Georgia, serif");
  assert.equal(room.chambers[0].type, "entrance");
  assert.ok(room.chambers.some((chamber) => chamber.objects.some((object) => object.id === "hero-image")));
});

test("missing editable fields apply safe defaults and do not crash the bridge", () => {
  const room = studioRoomFromPresenceNode(node({ editable_config: null }), { mode: "published" });
  assert.equal(room.title, "Christina Kerkvliet Goddard");
  assert.equal(room.entryChamberId, "field");
  assert.ok(room.chambers.length >= 1);
  assert.ok(room.theme.background.startsWith("#"));
});

test("Studio Room to render-model adapter strips editor metadata before public rendering", () => {
  const model = renderModelFromStudioRoom(SAMPLE_ROOM);
  const serialized = JSON.stringify(model);
  assert.deepEqual(findRestrictedPublicPayloadKeys(model), []);
  assert.equal(serialized.includes("sample-internal-audit"), false);
  assert.equal(serialized.includes("draftNotes"), false);
});

test("draft room can differ from published room and promotion stays explicit", () => {
  const state = createStudioRoomState(SAMPLE_ROOM, 2);
  const draft = createEditorDraftFromPublished(state.published, (room) => ({
    ...room,
    title: "Draft-only room title",
  }));
  const withDraft = { ...state, draft };

  assert.equal(hasUnpublishedDraft(withDraft), true);
  assert.equal(getRoomForState(withDraft, "published").title, SAMPLE_ROOM.title);
  assert.equal(getRoomForState(withDraft, "draft").title, "Draft-only room title");

  const published = publishEditorDraft(withDraft);
  assert.equal(published.published.room.title, "Draft-only room title");
  assert.equal(published.draft, undefined);
});

test("public Studio Room payload remains sanitized after adapter round trip", () => {
  const room = studioRoomFromEditableConfig({
    ...editableConfig,
    internal: { owner_user_id: 123 },
  } as PresenceEditableConfig, node(), { mode: "draft" });
  const publicPayload = toPublicRoomPayload(room);
  assert.equal(JSON.stringify(publicPayload).includes("sourceRendererKey"), false);
  assert.deepEqual(findRestrictedPublicPayloadKeys(publicPayload), []);
});
