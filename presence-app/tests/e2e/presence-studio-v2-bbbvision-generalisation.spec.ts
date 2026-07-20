import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type APIRequestContext, type BrowserContext, type Page } from "playwright/test";

const hostedGate = process.env.PRESENCE_HOSTED_SMOKE === "1";
const requiredEnv = [
  "PRESENCE_E2E_BASE_URL",
  "PRESENCE_E2E_API_URL",
  "PRESENCE_E2E_OWNER_EMAIL",
  "PRESENCE_E2E_OWNER_PASSWORD",
  "PRESENCE_STUDIO_V2_BBBVISION_ROOM_ID",
  "PRESENCE_STUDIO_V2_BBBVISION_SLUG",
  "PRESENCE_STUDIO_V2_BBBVISION_TITLE",
] as const;
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

const baseURL = trimTrailingSlash(process.env.PRESENCE_E2E_BASE_URL || "https://your-presence.vercel.app");
const apiBase = trimTrailingSlash(process.env.PRESENCE_E2E_API_URL || "https://anu-back-end.vercel.app");
const roomId = Number(process.env.PRESENCE_STUDIO_V2_BBBVISION_ROOM_ID || "0");
const slug = process.env.PRESENCE_STUDIO_V2_BBBVISION_SLUG || "";
const expectedTitle = process.env.PRESENCE_STUDIO_V2_BBBVISION_TITLE || "";
const draftWriteEnabled = process.env.PRESENCE_HOSTED_DRAFT_WRITE_ENABLED === "1";

const evidenceDir = path.join(
  process.cwd(),
  "docs",
  "program",
  "evidence",
  "presence-studio-bbbvision-generalisation-proof",
);
const routeMatrixPath = path.join(evidenceDir, "route-status-matrix.json");

type RouteStatus = {
  surface: string;
  method: "GET" | "BROWSER";
  path: string;
  status: number | null;
  ok: boolean;
  source: "hosted-frontend" | "hosted-backend";
  notes: string;
};

type OwnerIdentity = {
  roomIdMatched: boolean;
  slugMatched: boolean;
  titleMatched: boolean;
  detailStatus: number | null;
  editorStatus: number | null;
  draftStatus: number | null;
};

const restrictedPreviewTerms = [
  "presence-studio-v2-toolbar",
  "presence-studio-v2-panel",
  "presence-studio-v2-selection-frame",
  "presence-studio-v2-resize-handle",
  "presence-studio-v2-rotate-handle",
  "presence-studio-v2-drag-readout",
  "Object inspector",
  "Room inspector",
] as const;

test.describe("hosted BBB Studio V2 owner generalisation proof", () => {
  test.skip(!hostedGate, "Set PRESENCE_HOSTED_SMOKE=1 to run the hosted BBB read-only proof.");
  test.skip(
    hostedGate && missingEnv.length > 0,
    `Missing hosted BBB read-only proof env vars: ${missingEnv.join(", ")}`,
  );
  test.skip(
    hostedGate && draftWriteEnabled,
    "This proof is read-only. Do not run it with PRESENCE_HOSTED_DRAFT_WRITE_ENABLED=1.",
  );

  test("BBB owner room loads Studio V2, private preview, and leaves public routes unchanged", async ({
    page,
    context,
    request,
  }) => {
    test.setTimeout(180_000);
    await fs.mkdir(evidenceDir, { recursive: true });

    const routeStatuses: RouteStatus[] = [];
    const mutatingRequests: string[] = [];
    const publishRequests: string[] = [];
    const safePreviewRequests: string[] = [];
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    page.on("request", (req) => {
      const method = req.method().toUpperCase();
      const url = req.url();
      const lowered = url.toLowerCase();
      if (lowered.includes("publish")) publishRequests.push(`${method} ${redactUrl(url)}`);
      if (method === "POST" && lowered.includes(`/api/presence/owner/rooms/${roomId}/editor/preview`)) {
        safePreviewRequests.push(`${method} ${redactUrl(url)}`);
        return;
      }
      if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && lowered.includes("/api/presence/owner/")) {
        mutatingRequests.push(`${method} ${redactUrl(url)}`);
      }
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await signInHostedOwner(page);

    const sessionAuth = await readSupabaseAccessToken(page);
    expect(sessionAuth, "Supabase access sessionAuth should be available after hosted owner sign-in.").toBeTruthy();

    const identity = await verifyOwnerBoundBbb(request, sessionAuth!, routeStatuses);
    expect(identity.roomIdMatched, "Owner detail/editor payload should match the configured BBB room id.").toBe(true);
    expect(identity.slugMatched, "Owner detail/editor payload should match the configured BBB slug.").toBe(true);
    expect(identity.titleMatched, "Owner detail/editor payload should expose a non-empty room display name.").toBe(true);

    const beforePublic = await capturePublicRoutes(context, routeStatuses, "before", {
      canonical: "08-public-canonical-route-before.png",
      legacy: "09-public-legacy-route-before.png",
    });

    await test.step("hosted owner BBB Studio V2 loads with layout-composition controls", async () => {
      const response = await page.goto(`/studio/${roomId}/editor`, { waitUntil: "domcontentloaded" });
      routeStatuses.push(routeStatus("authenticated Studio editor", "BROWSER", `/studio/${roomId}/editor`, response?.status() ?? null, "hosted-frontend"));
      await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId("presence-studio-v2-field-title").locator("input")).toHaveValue(expectedTitle);
      await expect(page.getByTestId("presence-studio-v2-top-chrome")).toBeVisible();
      await expect(page.getByTestId("presence-studio-v2-outline")).toBeVisible();
      await expect(page.getByTestId("presence-studio-v2-inspector")).toBeVisible();
      await expect(page.getByTestId("presence-studio-v2-layout-composer")).toBeVisible();
      await expect(page.getByTestId("presence-studio-v2-environment")).toHaveAttribute("data-environment-runtime", "dom");
      await page.screenshot({
        path: path.join(evidenceDir, "01-bbb-hosted-owner-studio-v2-loaded.png"),
        fullPage: true,
      });

      await expect(page.getByTestId("presence-studio-v2-layout-label").first()).toBeVisible();
      await expect(page.getByTestId("presence-studio-v2-layout-zone").first()).toBeVisible();
      await expect(page.getByTestId("presence-studio-v2-layout-select")).toBeVisible();
      await page.screenshot({
        path: path.join(evidenceDir, "02-bbb-layout-composition-controls.png"),
        fullPage: true,
      });

      const firstObject = page.getByTestId("presence-studio-v2-outline-object").first();
      await expect(firstObject, "BBB room should expose at least one editable Studio V2 object.").toBeVisible();
      await firstObject.click();
      await expect(page.getByTestId("presence-studio-v2-placement-controls")).toBeVisible();
      await expect(page.getByTestId("presence-studio-v2-placement-zone")).toBeVisible();
      await expect(page.getByTestId("presence-studio-v2-placement-size")).toBeVisible();
      await page.screenshot({
        path: path.join(evidenceDir, "03-bbb-environmental-room-editor.png"),
        fullPage: true,
      });
    });

    await test.step("hosted BBB private preview loads without editor instrumentation", async () => {
      const response = await page.goto(`/studio/${roomId}/editor/preview`, { waitUntil: "domcontentloaded" });
      routeStatuses.push(routeStatus("authenticated private preview", "BROWSER", `/studio/${roomId}/editor/preview`, response?.status() ?? null, "hosted-frontend"));
      await expect(page.locator(".presence-studio-v2-public")).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(expectedTitle).first()).toBeVisible();
      await expect(page.getByTestId("presence-studio-v2-preview-environment")).toHaveAttribute("data-environment-runtime", "dom");
      await expect(page.getByTestId("presence-studio-v2-inspector")).toHaveCount(0);
      await expect(page.getByTestId("presence-studio-v2-selection-frame")).toHaveCount(0);
      assertNoTerms(await page.content(), restrictedPreviewTerms);
      await page.screenshot({
        path: path.join(evidenceDir, "04-bbb-private-preview-before-mutation.png"),
        fullPage: true,
      });
    });

    const afterPublic = await capturePublicRoutes(context, routeStatuses, "after", {
      canonical: "10-public-canonical-route-after.png",
      legacy: "11-public-legacy-route-after.png",
    });
    expect(afterPublic.canonical.status, "Canonical public route status should be unchanged by the read-only proof.").toBe(beforePublic.canonical.status);
    expect(afterPublic.legacy.status, "Legacy public route status should be unchanged by the read-only proof.").toBe(beforePublic.legacy.status);

    expect(mutatingRequests, "Read-only BBB hosted proof must not issue owner draft/node mutations.").toEqual([]);
    expect(publishRequests, "Read-only BBB hosted proof must not call or navigate to publish surfaces.").toEqual([]);
    expect(safePreviewRequests.length, "Private preview should use the existing safe preview-generation endpoint.").toBeGreaterThanOrEqual(1);
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);

    await fs.writeFile(routeMatrixPath, `${JSON.stringify(routeStatuses, null, 2)}\n`, "utf-8");
    await writeValidationRecord(routeStatuses, identity, beforePublic, afterPublic);
  });
});

async function verifyOwnerBoundBbb(request: APIRequestContext, sessionAuth: string, statuses: RouteStatus[]): Promise<OwnerIdentity> {
  const ownerList = await ownerGet(request, "/api/presence/owner/nodes", sessionAuth, statuses, "owner list");
  expect(ownerList.response.ok(), "Owner list must be readable.").toBeTruthy();

  const detail = await ownerGet(request, `/api/presence/owner/nodes/${roomId}`, sessionAuth, statuses, "owner node detail");
  expect(detail.response.ok(), "BBB owner node detail must be readable.").toBeTruthy();

  const editor = await ownerGet(request, `/api/presence/owner/rooms/${roomId}/editor`, sessionAuth, statuses, "editor overview");
  expect(editor.response.ok(), "BBB editor overview must be readable.").toBeTruthy();

  const draft = await ownerGet(request, `/api/presence/owner/rooms/${roomId}/editor/draft`, sessionAuth, statuses, "editor draft");
  expect(draft.response.ok(), "BBB editor draft read must be readable.").toBeTruthy();

  const detailBody = await detail.response.json();
  const editorBody = await editor.response.json();
  const candidates = [
    record(apiData(detailBody)),
    record(record(apiData(detailBody)).node),
    record(apiData(editorBody)),
    record(record(apiData(editorBody)).node),
    record(record(apiData(editorBody)).room),
    record(record(apiData(editorBody)).presence),
  ];

  return {
    roomIdMatched: candidates.some((candidate) => text(candidate.id) === String(roomId) || text(candidate.room_id) === String(roomId)),
    slugMatched: candidates.some((candidate) => text(candidate.slug) === slug),
    titleMatched: candidates.some((candidate) => Boolean(text(candidate.title) || text(candidate.name) || text(candidate.display_name))),
    detailStatus: detail.response.status(),
    editorStatus: editor.response.status(),
    draftStatus: draft.response.status(),
  };
}

async function ownerGet(
  request: APIRequestContext,
  routePath: string,
  sessionAuth: string,
  statuses: RouteStatus[],
  surface: string,
) {
  const response = await request.get(`${apiBase}${routePath}`, {
    headers: { Authorization: `Bearer ${sessionAuth}` },
  });
  statuses.push(routeStatus(surface, "GET", routePath, response.status(), "hosted-backend"));
  return { response };
}

async function capturePublicRoutes(
  context: BrowserContext,
  statuses: RouteStatus[],
  phase: "before" | "after",
  filenames: { canonical: string; legacy: string },
) {
  const anonymous = await context.browser()?.newContext({ baseURL });
  expect(anonymous, "A fresh anonymous browser context should be available.").toBeTruthy();
  const publicPage = await anonymous!.newPage();
  try {
    const canonical = await visitPublic(publicPage, `/p/${slug}`, `${phase} canonical public route`);
    statuses.push(canonical);
    await publicPage.screenshot({ path: path.join(evidenceDir, filenames.canonical), fullPage: true });

    const legacy = await visitPublic(publicPage, `/presence/${slug}`, `${phase} legacy public route`);
    statuses.push(legacy);
    await publicPage.screenshot({ path: path.join(evidenceDir, filenames.legacy), fullPage: true });

    return { canonical, legacy };
  } finally {
    await anonymous!.close();
  }
}

async function signInHostedOwner(page: Page) {
  await page.goto(`/auth/sign-in?returnTo=${encodeURIComponent(`/studio/${roomId}/editor`)}`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByLabel("Email").fill(required("PRESENCE_E2E_OWNER_EMAIL"));
  await page.getByLabel("Password").fill(required("PRESENCE_E2E_OWNER_PASSWORD"));
  await page.getByRole("button", { name: /enter studio|sign in|log in/i }).click();
  await expect(page).toHaveURL(/\/studio/, { timeout: 30_000 });
}

async function visitPublic(page: Page, routePath: string, surface: string): Promise<RouteStatus> {
  const response = await page.goto(routePath, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
  await expect(page.getByTestId("presence-studio-v2-inspector")).toHaveCount(0);
  await expect(page.getByTestId("presence-studio-v2-selection-frame")).toHaveCount(0);
  assertNoTerms(await page.content(), restrictedPreviewTerms);
  return routeStatus(surface, "BROWSER", routePath, response?.status() ?? null, "hosted-frontend");
}

async function readSupabaseAccessToken(page: Page): Promise<string | null> {
  const fromStorage = await page.evaluate(() => {
    function extractSessionAuth(rawValue: string): string | null {
      const candidates = [rawValue];
      try {
        candidates.push(decodeURIComponent(rawValue));
      } catch {
        // Ignore non-URI-encoded values.
      }

      for (const candidate of candidates) {
        const values = [candidate];
        if (candidate.startsWith("base64-")) {
          try {
            values.push(atob(candidate.slice("base64-".length)));
          } catch {
            // Ignore malformed base64 values.
          }
        }
        for (const value of values) {
          try {
            const parsed = JSON.parse(value);
            const sessionAuth =
              parsed?.access_token ??
              parsed?.currentSession?.access_token ??
              parsed?.session?.access_token;
            if (typeof sessionAuth === "string" && sessionAuth.length > 20) return sessionAuth;
          } catch {
            // Ignore unrelated auth storage values.
          }
        }
      }

      return null;
    }

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key) continue;
      const value = window.localStorage.getItem(key);
      if (!value || !key.startsWith("sb-")) continue;
      const sessionAuth = extractSessionAuth(value);
      if (sessionAuth) return sessionAuth;
    }
    return null;
  });
  if (fromStorage) return fromStorage;

  const cookies = await page.context().cookies();
  const parts = cookies
    .filter((cookie) => /^sb-.+-auth-token(?:\.\d+)?$/.test(cookie.name))
    .sort((a, b) => {
      const aNum = Number.parseInt(a.name.includes(".") ? a.name.split(".").pop() || "0" : "0", 10);
      const bNum = Number.parseInt(b.name.includes(".") ? b.name.split(".").pop() || "0" : "0", 10);
      return aNum - bNum;
    });

  if (parts.length === 0) return null;

  let combined = parts.map((part) => part.value).join("");
  try {
    combined = decodeURIComponent(combined);
  } catch {
    // Ignore non-URI-encoded cookie values.
  }
  if (combined.startsWith("base64-")) combined = combined.slice("base64-".length);

  try {
    const decoded = Buffer.from(combined, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);
    const sessionAuth = parsed?.access_token ?? parsed?.currentSession?.access_token ?? parsed?.session?.access_token;
    if (typeof sessionAuth === "string" && sessionAuth.length > 20) return sessionAuth;
  } catch {
    // Ignore malformed cookie values.
  }

  return null;
}

async function writeValidationRecord(
  routeStatuses: RouteStatus[],
  identity: OwnerIdentity,
  beforePublic: { canonical: RouteStatus; legacy: RouteStatus },
  afterPublic: { canonical: RouteStatus; legacy: RouteStatus },
) {
  const passedRoutes = routeStatuses.filter((item) => item.ok).length;
  const lines = [
    "# BBB Hosted Studio V2 Generalisation Validation Record",
    "",
    "- Hosted owner auth: passed",
    `- BBB room id matched: ${identity.roomIdMatched}`,
    `- BBB slug matched: ${identity.slugMatched}`,
    `- BBB owner payload display name present: ${identity.titleMatched}`,
    "- BBB title expected in editor UI/private preview: `bbb.vision`",
    "- Studio V2 root: rendered",
    "- Layout-composition controls: rendered",
    "- Environmental editor layer: rendered with DOM runtime",
    "- Private preview: rendered with DOM runtime and no editor instrumentation",
    "- Draft write/revert: not attempted; `PRESENCE_HOSTED_DRAFT_WRITE_ENABLED=0`",
    "- Publish action: not triggered",
    "- Public state mutation: not attempted",
    `- Canonical public route status unchanged: ${beforePublic.canonical.status} -> ${afterPublic.canonical.status}`,
    `- Legacy public route status unchanged: ${beforePublic.legacy.status} -> ${afterPublic.legacy.status}`,
    `- Route/status entries recorded: ${routeStatuses.length}`,
    `- Route/status entries ok: ${passedRoutes}`,
    "- Secrets emitted: none by design; matrix records only route paths, status codes, and redacted notes",
    "",
  ];
  await fs.writeFile(path.join(evidenceDir, "VALIDATION_RECORD.md"), `${lines.join("\n")}\n`, "utf-8");
}

function routeStatus(
  surface: string,
  method: "GET" | "BROWSER",
  routePath: string,
  status: number | null,
  source: "hosted-frontend" | "hosted-backend",
): RouteStatus {
  return {
    surface,
    method,
    path: routePath,
    status,
    ok: status !== null && status >= 200 && status < 500,
    source,
    notes: "Read-only proof route check; no payload body recorded.",
  };
}

function apiData(payload: unknown): unknown {
  const body = record(payload);
  return body.data ?? payload;
}

function required(key: (typeof requiredEnv)[number]): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function redactUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value.replace(/[?].*$/, "");
  }
}

function assertNoTerms(html: string, terms: readonly string[]) {
  const lowered = html.toLowerCase();
  for (const term of terms) {
    expect(lowered, `Preview/public HTML should not expose editor term: ${term}`).not.toContain(
      term.toLowerCase(),
    );
  }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}
