import assert from "node:assert/strict";
import test from "node:test";

import {
  STUDIO_V3_PRIVATE_METADATA_SCHEMA_VERSION,
  getStudioV3PrivateState,
  replaceStudioV3Draft,
  replaceStudioV3PrivateState,
} from "./studioV3.ts";

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
          sourceRef: "work:7",
          collectionSourceRef: "collection:loaded-owner-library",
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
      metadata: { placements: Array<{ collectionSourceRef: string }> };
    };
    assert.equal(privateStatePayload.expected.metadata_revision, 0);
    assert.equal(
      privateStatePayload.metadata.placements[0]?.collectionSourceRef,
      "collection:loaded-owner-library",
    );
    assert.match(String(calls[2]!.init.body), /"locked_fields":\{\}/);
    for (const call of calls) {
      assert.equal((call.init.headers as Record<string, string>).Authorization, "Bearer owner-token");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
