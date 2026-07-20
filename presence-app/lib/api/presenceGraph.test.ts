import assert from "node:assert/strict";
import test from "node:test";

import {
  addMoodBoardItem,
  captureRoomEncounter,
  createMoodBoard,
  createObserverProfile,
  createPresencePass,
  createRoomKey,
  generatePathFromRoom,
  getPath,
  getPassport,
  listPresencePasses,
  resolveRoomEntry,
  resolveRoomKey,
  saveRoom,
} from "./presenceGraph.ts";

test("presence graph client calls the RoomKey resolve endpoint", async () => {
  const calls: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request) => {
    calls.push(String(url));
    return new Response(JSON.stringify({ data: { message: "Youve entered this Room.", room: {}, available_actions: [] } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  try {
    await resolveRoomKey("abc 123");
    assert.equal(calls[0], "http://localhost:5000/api/presence/keys/abc%20123/resolve");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("presence graph client calls the published direct room entry endpoint", async () => {
  const calls: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request) => {
    calls.push(String(url));
    return new Response(JSON.stringify({ data: { message: "Youve entered this Room.", room: {}, available_actions: [] } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  try {
    await resolveRoomEntry(7);
    assert.equal(calls[0], "http://localhost:5000/api/presence/rooms/7/key-entry");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("presence graph client sends observer auth only to observer endpoints", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify({ data: { id: 1, items: [], connection: { id: 2 } } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  try {
    await createObserverProfile({ alias: "quiet-walker" }, "tok");
    await saveRoom(12, "tok");
    await getPassport("tok");
    const headers = calls.map((call) => call.init.headers as Record<string, string>);
    assert.equal(headers[0]!.Authorization, "Bearer tok");
    assert.equal(headers[1]!.Authorization, "Bearer tok");
    assert.equal(headers[2]!.Authorization, "Bearer tok");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("presence graph client covers public, path, and owner route construction", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify({ data: { id: 1, items: [] } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  try {
    await captureRoomEncounter(7, { source: "nfc", anonymous_visitor_id: "anon" });
    await createMoodBoard({ title: "Materials" }, "tok");
    await addMoodBoardItem(9, { item_type: "room", item_id: 7 }, "tok");
    await generatePathFromRoom(7);
    await getPath(3);
    await listPresencePasses(7, "tok");
    await createPresencePass(7, { pass_type: "nfc_card", label: "NFC card" }, "tok");
    await createRoomKey(7, { key_type: "qr" }, "tok");

    assert.equal(calls[0]!.url, "http://localhost:5000/api/presence/rooms/7/encounters");
    assert.equal(calls[3]!.url, "http://localhost:5000/api/paths/generate/from-room/7");
    assert.equal(calls[4]!.url, "http://localhost:5000/api/paths/3");
    assert.equal(calls[5]!.url, "http://localhost:5000/api/presence/owner/rooms/7/passes");
    assert.equal((calls[5]!.init.headers as Record<string, string>).Authorization, "Bearer tok");
    assert.equal(calls[7]!.url, "http://localhost:5000/api/presence/owner/rooms/7/keys");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
