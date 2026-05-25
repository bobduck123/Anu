import assert from "node:assert/strict";
import test from "node:test";

import {
  attachPresenceEditorAsset,
  createPresenceEditorDraft,
  getPresenceEditor,
  getPresenceEditorDraft,
  getPresenceEditorHistory,
  listPresenceEditorAssets,
  patchPresenceEditorDraft,
  previewPresenceEditorDraft,
  publishPresenceEditorDraft,
  rollbackPresenceEditor,
  uploadPresenceEditorAsset,
} from "./editor.ts";

test("presence editor client uses owner-only routes and bearer auth", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify({ data: { draft: null, items: [], history: [], assets: [] } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  try {
    await getPresenceEditor(7, "tok");
    await getPresenceEditorDraft(7, "tok");
    await createPresenceEditorDraft(7, "tok", { renderer_key: "ggm-faithful-room-v1" });
    await patchPresenceEditorDraft(7, "tok", { scene_config: { scenes: [] } });
    await previewPresenceEditorDraft(7, "tok");
    await publishPresenceEditorDraft(7, "tok");
    await rollbackPresenceEditor(7, "tok", { version: 1 });
    await getPresenceEditorHistory(7, "tok");
    await listPresenceEditorAssets(7, "tok");
    await attachPresenceEditorAsset(7, "tok", { slot: "hero_image", url: "/ggm/works/willow-of-port-arthur-2019.webp" });
    await uploadPresenceEditorAsset(7, "tok", {
      file: new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "cover.png", { type: "image/png" }),
      role: "cover",
      altText: "Uploaded cover",
    });

    assert.equal(calls[0]!.url, "http://localhost:5000/api/presence/owner/rooms/7/editor");
    assert.equal(calls[1]!.url, "http://localhost:5000/api/presence/owner/rooms/7/editor/draft");
    assert.equal(calls[2]!.init.method, "POST");
    assert.equal(calls[3]!.init.method, "PATCH");
    assert.equal(calls[4]!.url, "http://localhost:5000/api/presence/owner/rooms/7/editor/preview");
    assert.equal(calls[5]!.url, "http://localhost:5000/api/presence/owner/rooms/7/editor/publish");
    assert.equal(calls[6]!.url, "http://localhost:5000/api/presence/owner/rooms/7/editor/rollback");
    assert.equal(calls[7]!.url, "http://localhost:5000/api/presence/owner/rooms/7/editor/history");
    assert.equal(calls[8]!.url, "http://localhost:5000/api/presence/owner/rooms/7/assets");
    assert.equal(calls[9]!.url, "http://localhost:5000/api/presence/owner/rooms/7/assets/attach");
    assert.equal(calls[10]!.url, "http://localhost:5000/api/presence/owner/rooms/7/assets/upload");
    assert.equal(calls[10]!.init.method, "POST");
    assert.equal(calls[10]!.init.body instanceof FormData, true);
    for (const call of calls) {
      assert.equal((call.init.headers as Record<string, string>).Authorization, "Bearer tok");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
