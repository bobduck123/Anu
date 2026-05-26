import assert from "node:assert/strict";
import test from "node:test";
import type { PresenceNode } from "../../api/types.ts";
import { createPublicRenderPayload, findRestrictedPublicPayloadKeys } from "./publicPayload.ts";

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
});

test("public payload key scanner finds nested forbidden architecture terms", () => {
  assert.deepEqual(
    findRestrictedPublicPayloadKeys({
      nested: { content_config: {}, preview_token: "x", draft_storage_key: "private/path", signed_url: "secret-link" },
    }),
    ["content_config", "draft_storage_key", "preview_token", "signed_url"],
  );
});
