import assert from "node:assert/strict";
import test from "node:test";

import { buildApiUrl, ownerFetch, PresenceApiError } from "./client.ts";

test("buildApiUrl joins configured API base and relative paths", () => {
  assert.equal(
    buildApiUrl("/api/presence/owner/beta/start"),
    "http://localhost:5000/api/presence/owner/beta/start",
  );
  assert.equal(
    buildApiUrl("api/presence/owner/beta/start"),
    "http://localhost:5000/api/presence/owner/beta/start",
  );
});

test("ownerFetch posts to the owner beta start route with supported CORS headers", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(
      JSON.stringify({
        data: {
          id: 42,
          slug: "test-presence",
          display_name: "Test Presence",
          status: "draft",
          visibility: "private",
          display_mode: "standard",
          visual_mood: null,
        },
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      },
    );
  }) as typeof fetch;

  try {
    const result = await ownerFetch<{ slug: string }>(
      "/api/presence/owner/beta/start",
      "test-token",
      {
        method: "POST",
        body: JSON.stringify({ display_name: "Test Presence", presence_type: "artist" }),
      },
    );

    assert.equal(result.slug, "test-presence");
    assert.equal(calls.length, 1);
    assert.equal(
      calls[0]!.url,
      "http://localhost:5000/api/presence/owner/beta/start",
    );
    assert.equal(calls[0]!.init.method, "POST");

    const headers = calls[0]!.init.headers as Record<string, string>;
    assert.equal(headers.Authorization, "Bearer test-token");
    assert.equal(headers["Content-Type"], "application/json");
    assert.equal(headers.Accept, "application/json");
    assert.deepEqual(
      Object.keys(headers).sort(),
      ["Accept", "Authorization", "Content-Type"].sort(),
      "beta start should only send headers allowed by backend CORS",
    );
    assert.equal(
      calls[0]!.init.body,
      JSON.stringify({ display_name: "Test Presence", presence_type: "artist" }),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("api errors preserve auth response status instead of collapsing to unreachable", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ msg: "Missing Authorization Header" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;

  try {
    await assert.rejects(
      () =>
        ownerFetch("/api/presence/owner/beta/start", "", {
          method: "POST",
          body: JSON.stringify({ display_name: "Test Presence", presence_type: "artist" }),
        }),
      (error) => {
        assert.ok(error instanceof PresenceApiError);
        assert.equal(error.status, 401);
        assert.equal(error.code, "auth_required");
        assert.equal(error.message, "Missing Authorization Header");
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
