import assert from "node:assert/strict";
import test from "node:test";

import {
  STUDIO_V3_PRIVATE_METADATA_SCHEMA_VERSION,
  getStudioV3PrivateState,
  replaceStudioV3Draft,
  replaceStudioV3PrivateState,
} from "./studioV3.ts";
import { uploadStudioV3PrivateAsset } from "./editor.ts";
import { makeStudioV3PlacementId, workSourceRef } from "../presence/studio-v3/sourceRefs.ts";

test("Studio V3 client keeps durable state and atomic replacement on owner-only PUT routes", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify({ data: { state: null, draft: {}, committed: {} } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  const base = {
    room_id: 7,
    config_id: 12,
    source_kind: "draft" as const,
    status: "draft" as const,
    version: 3,
    revision: 4,
    schema_version: "presence-editable-config-v1",
    fingerprint: "a".repeat(64),
  };

  try {
    await getStudioV3PrivateState(7, "owner-token");
    await replaceStudioV3PrivateState(7, "owner-token", {
      expected: { ...base, metadata_revision: 0 },
      metadata_schema_version: STUDIO_V3_PRIVATE_METADATA_SCHEMA_VERSION,
      metadata: {
        owner_mode: "simple",
        placements: [{
          id: makeStudioV3PlacementId("gallery", workSourceRef(7)),
          roomId: "gallery",
          objectId: makeStudioV3PlacementId("gallery", workSourceRef(7)),
          sourceRef: workSourceRef(7),
          collectionSourceRef: "collection:loaded-owner-library",
          order: 0,
          status: "placed",
        }],
      },
    });
    await replaceStudioV3Draft(7, "owner-token", {
      expected: {
        room_id: base.room_id,
        config_id: base.config_id,
        version: base.version,
        revision: base.revision,
        schema_version: base.schema_version,
        fingerprint: base.fingerprint,
      },
      config: {
        renderer_key: "presence-studio-v2-room",
        scene_config: {},
        style_dna: {},
        motion_config: {},
        asset_config: {},
        content_config: {},
        roomkey_config: {},
        enquiry_config: {},
        locked_fields: {},
      },
    });

    assert.deepEqual(calls.map((call) => [call.url, call.init.method ?? "GET"]), [
      ["http://localhost:5000/api/presence/owner/rooms/7/editor/v3/state", "GET"],
      ["http://localhost:5000/api/presence/owner/rooms/7/editor/v3/state", "PUT"],
      ["http://localhost:5000/api/presence/owner/rooms/7/editor/v3/draft", "PUT"],
    ]);
    const privateStatePayload = JSON.parse(String(calls[1]!.init.body)) as {
      expected: { metadata_revision: number };
      metadata: { placements: Array<{ collectionSourceRef: string; roomId: string; order: number; status: string }> };
    };
    assert.equal(privateStatePayload.expected.metadata_revision, 0);
    assert.equal(
      privateStatePayload.metadata.placements[0]?.collectionSourceRef,
      "collection:loaded-owner-library",
    );
    assert.deepEqual(privateStatePayload.metadata.placements[0], {
      id: makeStudioV3PlacementId("gallery", workSourceRef(7)),
      roomId: "gallery",
      objectId: makeStudioV3PlacementId("gallery", workSourceRef(7)),
      sourceRef: workSourceRef(7),
      collectionSourceRef: "collection:loaded-owner-library",
      order: 0,
      status: "placed",
    });
    assert.match(String(calls[2]!.init.body), /"locked_fields":\{\}/);
    for (const call of calls) {
      assert.equal((call.init.headers as Record<string, string>).Authorization, "Bearer owner-token");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Studio V3 private media upload uses only the owner inventory endpoint", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify({
      data: {
        draft: null,
        assets: [],
        uploaded_asset: { media_id: "media-private-1", visibility: "private_draft" },
        storage_policy: "private_draft_inventory_only",
      },
    }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  try {
    await uploadStudioV3PrivateAsset(7, "owner-token", {
      file: new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "private-work.png", { type: "image/png" }),
      role: "work",
      altText: "Private work",
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0]!.url, "http://localhost:5000/api/presence/owner/rooms/7/assets/upload");
    assert.equal(calls[0]!.init.method, "POST");
    assert.equal((calls[0]!.init.headers as Record<string, string>).Authorization, "Bearer owner-token");
    assert.equal(calls[0]!.init.body instanceof FormData, true);
    const body = calls[0]!.init.body as FormData;
    assert.equal(body.get("inventory_only"), "1");
    assert.equal(body.get("role"), "work");
    assert.equal(body.get("alt_text"), "Private work");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
