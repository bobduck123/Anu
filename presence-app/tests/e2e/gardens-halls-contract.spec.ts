/**
 * Real-backend contract smoke spec.
 *
 * This spec targets the canonical Presence Gardens + Halls API contract
 * described in:
 *   Flora_fauna/docs/program/specs/PRESENCE_GARDENS_HALLS_API_CONTRACT_2026-05-21.md
 *
 * It is intentionally separate from `gardens-halls.spec.ts` (which uses the
 * in-process mock API). This spec uses the Playwright `request` fixture to
 * hit the real backend directly — no browser, no dev server needed.
 *
 * It runs only when `PRESENCE_REAL_BACKEND_URL` is set. CI or a developer
 * can run:
 *
 *   PRESENCE_REAL_BACKEND_URL=http://127.0.0.1:5000 \
 *   PRESENCE_REAL_OBSERVER_TOKEN=<jwt> \
 *   PRESENCE_REAL_OWNER_TOKEN=<jwt> \
 *   PRESENCE_REAL_HALL_SLUG=open-studio-friday \
 *   PRESENCE_REAL_OWNER_ROOM_ID=101 \
 *   npx playwright test gardens-halls-contract.spec.ts
 *
 * If `PRESENCE_REAL_BACKEND_URL` is unset, every test in the file is
 * skipped (not failed). This keeps `npm run test:e2e` green in environments
 * without a backend while still letting us prove canonical contract shapes
 * when one is available.
 */

import { expect, test, type APIRequestContext } from "playwright/test";

const REAL_BACKEND_URL = process.env.PRESENCE_REAL_BACKEND_URL ?? "";
const OBSERVER_TOKEN = process.env.PRESENCE_REAL_OBSERVER_TOKEN ?? "";
const OWNER_TOKEN = process.env.PRESENCE_REAL_OWNER_TOKEN ?? "";
const HALL_SLUG = process.env.PRESENCE_REAL_HALL_SLUG ?? "";
const OWNER_ROOM_ID = process.env.PRESENCE_REAL_OWNER_ROOM_ID
  ? Number(process.env.PRESENCE_REAL_OWNER_ROOM_ID)
  : 0;

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  if (!REAL_BACKEND_URL) {
    test.skip(true, "Set PRESENCE_REAL_BACKEND_URL to run the contract smoke");
  }
});

async function get<T>(request: APIRequestContext, path: string, token?: string): Promise<{ status: number; body: T | null }> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await request.get(`${REAL_BACKEND_URL}${path}`, { headers });
  let body: T | null = null;
  try {
    const parsed = await res.json();
    body = parsed?.data ?? parsed;
  } catch {
    body = null;
  }
  return { status: res.status(), body };
}

async function post<T>(
  request: APIRequestContext,
  path: string,
  data: unknown,
  token?: string,
): Promise<{ status: number; body: T | null }> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await request.post(`${REAL_BACKEND_URL}${path}`, {
    headers,
    data: data ?? {},
  });
  let body: T | null = null;
  try {
    const parsed = await res.json();
    body = parsed?.data ?? parsed;
  } catch {
    body = null;
  }
  return { status: res.status(), body };
}

test.describe("Real backend — Public Halls", () => {
  test("GET /api/halls returns canonical list envelope", async ({ request }) => {
    const res = await get<{ items: unknown[]; total: number; live_count: number; scheduled_count: number }>(
      request,
      "/api/halls",
    );
    expect(res.status, "List Halls must return 200").toBe(200);
    expect(res.body).not.toBeNull();
    expect(Array.isArray(res.body?.items)).toBe(true);
    expect(typeof res.body?.total).toBe("number");
    expect(typeof res.body?.live_count).toBe("number");
    expect(typeof res.body?.scheduled_count).toBe("number");
  });

  test("GET /api/halls/:slug responds with canonical Hall shape when slug is provided", async ({ request }) => {
    test.skip(!HALL_SLUG, "Set PRESENCE_REAL_HALL_SLUG to verify Hall detail shape");
    const res = await get<{
      id: number;
      slug: string;
      title: string;
      hall_type: string;
      status: string;
      visibility: string;
      participants_count?: number;
      zones?: unknown[];
      stalls?: unknown[];
      portals?: unknown[];
    }>(request, `/api/halls/${encodeURIComponent(HALL_SLUG)}`);
    expect(res.status).toBe(200);
    expect(res.body?.slug).toBe(HALL_SLUG);
    expect(typeof res.body?.id).toBe("number");
    expect(typeof res.body?.title).toBe("string");
    expect(typeof res.body?.hall_type).toBe("string");
    expect(typeof res.body?.status).toBe("string");
  });
});

test.describe("Real backend — Guest Hall join", () => {
  test("POST /api/halls/:slug/join allows guest with no token on public Halls", async ({ request }) => {
    test.skip(!HALL_SLUG, "Set PRESENCE_REAL_HALL_SLUG");
    const res = await post<{ joined?: boolean; identity_type?: string; available_actions?: string[] }>(
      request,
      `/api/halls/${encodeURIComponent(HALL_SLUG)}/join`,
      {},
    );
    // Backend may accept guest join (200/201) or refuse with 401 if Hall is
    // invite-only. Both are valid canonical responses.
    expect([200, 201, 401, 403]).toContain(res.status);
    if (res.status < 400) {
      expect(res.body?.joined).toBe(true);
    }
  });
});

test.describe("Real backend — Observer Garden", () => {
  test.beforeAll(() => {
    if (!OBSERVER_TOKEN) {
      test.skip(true, "Set PRESENCE_REAL_OBSERVER_TOKEN to run Garden contract checks");
    }
  });

  test("GET /api/garden/home returns observer + sections", async ({ request }) => {
    const res = await get<{ observer: { alias?: string }; sections: Array<{ id: string }> }>(
      request,
      "/api/garden/home",
      OBSERVER_TOKEN,
    );
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body?.observer).toBeTruthy();
      expect(Array.isArray(res.body?.sections)).toBe(true);
      // Sections may be empty for a brand-new observer but the shape must hold.
      for (const section of res.body!.sections) {
        expect(typeof section.id).toBe("string");
      }
    }
  });

  test("POST /api/observations enforces self-promotion guardrail", async ({ request }) => {
    const res = await post<unknown>(
      request,
      "/api/observations",
      {
        observation_kind: "text",
        body: "Hire me at https://example.com",
        visibility: "public",
      },
      OBSERVER_TOKEN,
    );
    // Backend must reject commercial content with a validation_error and an
    // upgrade-to-Room prompt.
    expect([400, 422]).toContain(res.status);
  });
});

test.describe("Real backend — Owner / Studio Halls", () => {
  test.beforeAll(() => {
    if (!OWNER_TOKEN || !OWNER_ROOM_ID) {
      test.skip(true, "Set PRESENCE_REAL_OWNER_TOKEN and PRESENCE_REAL_OWNER_ROOM_ID");
    }
  });

  test("GET /api/presence/owner/halls returns owner Halls envelope", async ({ request }) => {
    const res = await get<{ items: unknown[] }>(
      request,
      `/api/presence/owner/halls?room_id=${OWNER_ROOM_ID}`,
      OWNER_TOKEN,
    );
    expect([200, 403, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body?.items)).toBe(true);
    }
  });
});

test.describe("Real backend — World still hidden", () => {
  test("/api/admin/presence/world-readiness must not be public", async ({ request }) => {
    const res = await get<unknown>(request, "/api/admin/presence/world-readiness");
    // Without control auth this must NOT return ready/open world status.
    expect([401, 403, 404]).toContain(res.status);
  });
});
