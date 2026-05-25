import assert from "node:assert/strict";
import test from "node:test";
import { ownerReadFetch } from "./client.ts";

test("ownerReadFetch recovers from a transient hosted read failure", async () => {
  const originalFetch = globalThis.fetch;
  const originalInfo = console.info;
  let calls = 0;
  console.info = () => undefined;
  globalThis.fetch = (async () => {
    calls += 1;
    if (calls === 1) {
      return new Response(JSON.stringify({ error: { code: "cold_start", message: "Warming up." } }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ data: { ok: true } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  try {
    const data = await ownerReadFetch<{ ok: boolean }>("/api/presence/owner/nodes/11", "tok", {}, {
      sessionPresent: true,
      maxAttempts: 2,
    });
    assert.equal(data.ok, true);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    console.info = originalInfo;
  }
});

test("ownerReadFetch recovers from one network failure but does not retry a confirmed non-owner response", async () => {
  const originalFetch = globalThis.fetch;
  const originalInfo = console.info;
  let networkCalls = 0;
  console.info = () => undefined;
  globalThis.fetch = (async () => {
    networkCalls += 1;
    if (networkCalls === 1) throw new TypeError("cold connection");
    return new Response(JSON.stringify({ data: { ok: true } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  try {
    await ownerReadFetch("/api/presence/owner/nodes/11", "tok", {}, {
      sessionPresent: true,
      maxAttempts: 2,
    });
    assert.equal(networkCalls, 2);

    let deniedCalls = 0;
    globalThis.fetch = (async () => {
      deniedCalls += 1;
      return new Response(JSON.stringify({ error: { code: "forbidden", message: "Not your Room." } }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;
    await assert.rejects(() => ownerReadFetch("/api/presence/owner/nodes/11", "tok", {}, {
      sessionPresent: true,
      retryAuthOnce: true,
    }));
    assert.equal(deniedCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    console.info = originalInfo;
  }
});

test("ownerReadFetch never retries an unclassified mutation", async () => {
  const originalFetch = globalThis.fetch;
  const originalInfo = console.info;
  let calls = 0;
  console.info = () => undefined;
  globalThis.fetch = (async () => {
    calls += 1;
    return new Response(JSON.stringify({ error: { code: "unavailable", message: "Try again." } }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  try {
    await assert.rejects(() => ownerReadFetch("/api/presence/owner/rooms/11/editor/publish", "tok", {
      method: "POST",
    }, {
      sessionPresent: true,
    }));
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    console.info = originalInfo;
  }
});
