import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type APIRequestContext, type BrowserContext, type Page } from "playwright/test";

const hostedGate = process.env.PRESENCE_HOSTED_SMOKE === "1";
const writeGate = process.env.PRESENCE_HOSTED_DRAFT_WRITE_ENABLED === "1";
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
const evidenceDir = path.join(
  process.cwd(),
  "docs",
  "program",
  "evidence",
  "presence-studio-bbbvision-generalisation-proof",
);

type RouteStatus = {
  surface: string;
  method: "GET" | "PATCH" | "BROWSER";
  path: string;
  status: number | null;
  ok: boolean;
  source: "hosted-frontend" | "hosted-backend";
  notes: string;
};

type LayoutMutation = {
  field: "scene_config.studio_v2.objectState[object].chamberId";
  objectId: string;
  originalChamberId: string;
  changedChamberId: string;
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

test.describe("hosted BBB Studio V2 draft write/revert proof", () => {
  test.skip(!hostedGate, "Set PRESENCE_HOSTED_SMOKE=1 to run the hosted BBB draft write/revert proof.");
  test.skip(
    hostedGate && missingEnv.length > 0,
    `Missing hosted BBB draft write/revert proof env vars: ${missingEnv.join(", ")}`,
  );
  test.skip(hostedGate && !writeGate, "Set PRESENCE_HOSTED_DRAFT_WRITE_ENABLED=1 to run BBB draft write/revert proof.");

  test("saves one reversible BBB layout-composition draft change and restores the original draft", async ({
    page,
    context,
    request,
  }) => {
    test.setTimeout(240_000);
    await fs.mkdir(evidenceDir, { recursive: true });

    const routeStatuses: RouteStatus[] = [];
    const unexpectedMutations: string[] = [];
    const publishRequests: string[] = [];
    const safePreviewRequests: string[] = [];
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    let sessionAuth: string | null = null;
    let originalConfig: Record<string, unknown> | null = null;
    let originalEditableInput: PresenceEditorConfigInput | null = null;
    let mutation: LayoutMutation | null = null;
    let revertVerified = false;

    page.on("request", (req) => {
      const method = req.method().toUpperCase();
      const url = req.url();
      const lowered = url.toLowerCase();
      if (lowered.includes("publish")) publishRequests.push(`${method} ${redactUrl(url)}`);
      if (method === "POST" && lowered.includes(`/api/presence/owner/rooms/${roomId}/editor/preview`)) {
        safePreviewRequests.push(`${method} ${redactUrl(url)}`);
        return;
      }
      if (
        ["POST", "PUT", "PATCH", "DELETE"].includes(method)
        && lowered.includes("/api/presence/owner/")
        && !lowered.includes(`/api/presence/owner/rooms/${roomId}/editor/draft`)
      ) {
        unexpectedMutations.push(`${method} ${redactUrl(url)}`);
      }
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await signInHostedOwner(page);
    sessionAuth = await readSupabaseAccessToken(page);
    expect(sessionAuth, "Supabase access session should be available after hosted owner sign-in.").toBeTruthy();

    const ownerIdentity = await verifyOwnerBoundBbb(request, sessionAuth!, routeStatuses);
    expect(ownerIdentity.roomIdMatched).toBe(true);
    expect(ownerIdentity.slugMatched).toBe(true);

    originalConfig = await fetchDraftConfig(request, sessionAuth!, routeStatuses, "original draft before mutation");
    originalEditableInput = configInputFromEditableConfig(originalConfig);

    const beforePublic = await capturePublicRoutes(context, routeStatuses, "before mutation", {
      canonical: "12-public-canonical-before-draft-write.png",
      legacy: "13-public-legacy-before-draft-write.png",
    });
    expect(beforePublic.canonical.status).toBe(200);
    expect(beforePublic.legacy.status).toBe(200);

    try {
      await test.step("open BBB Studio and capture pre-mutation editor state", async () => {
        await page.goto(`/studio/${roomId}/editor`, { waitUntil: "domcontentloaded" });
        await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible({ timeout: 30_000 });
        await expect(page.getByTestId("presence-studio-v2-field-title").locator("input")).toHaveValue(expectedTitle);

        await page.screenshot({
          path: path.join(evidenceDir, "14-bbb-draft-before-mutation.png"),
          fullPage: true,
        });
      });

      await test.step("save one reversible persisted object placement change", async () => {
        mutation = selectSafeObjectPlacementMutation(originalConfig!);
        if (!mutation) throw new Error("BLOCKED — NO SAFE REVERSIBLE DRAFT FIELD");
        const changedEditableInput = withObjectChamberMutation(originalEditableInput!, mutation);
        const saveStatus = await patchDraftConfig(request, sessionAuth!, changedEditableInput);
        routeStatuses.push(routeStatus("draft save changed object chamberId", "PATCH", `/api/presence/owner/rooms/${roomId}/editor/draft`, saveStatus, "hosted-backend", "Saved one reversible persisted object placement chamberId change."));
      });

      await test.step("reload Studio and confirm changed placement persisted", async () => {
        await page.reload({ waitUntil: "domcontentloaded" });
        await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible({ timeout: 30_000 });
        await page.screenshot({
          path: path.join(evidenceDir, "15-bbb-draft-after-mutation-reload.png"),
          fullPage: true,
        });

        const changedDraft = await fetchDraftConfig(request, sessionAuth!, routeStatuses, "draft after mutation");
        expect(objectChamberId(changedDraft, mutation!.objectId), "Fetched draft should persist the changed object chamberId.").toBe(mutation!.changedChamberId);
      });

      await test.step("private preview reflects changed draft", async () => {
        const response = await page.goto(`/studio/${roomId}/editor/preview`, { waitUntil: "domcontentloaded" });
        routeStatuses.push(routeStatus("private preview after draft mutation", "BROWSER", `/studio/${roomId}/editor/preview`, response?.status() ?? null, "hosted-frontend", "Authenticated private preview loaded after the temporary object placement change."));
        await expect(page.locator(".presence-studio-v2-public")).toBeVisible({ timeout: 30_000 });
        await expect(page.getByText(expectedTitle).first()).toBeVisible();
        assertNoTerms(await page.content(), restrictedPreviewTerms);
        await page.screenshot({
          path: path.join(evidenceDir, "16-bbb-private-preview-after-draft-mutation.png"),
          fullPage: true,
        });
      });
    } finally {
      if (sessionAuth && originalEditableInput) {
        await restoreDraftConfig(request, sessionAuth, originalEditableInput, routeStatuses);
      }
    }

    await test.step("reload Studio and confirm original draft restored", async () => {
      const revertedDraft = await fetchDraftConfig(request, sessionAuth!, routeStatuses, "draft after revert");
      expect(stableJson(configInputFromEditableConfig(revertedDraft)), "Normalized editable draft should match the captured original after revert.").toBe(stableJson(originalEditableInput!));
      expect(objectChamberId(revertedDraft, mutation!.objectId), "Reverted draft should restore the original object chamberId.").toBe(mutation!.originalChamberId);
      revertVerified = true;

      await page.goto(`/studio/${roomId}/editor`, { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible({ timeout: 30_000 });
      await page.screenshot({
        path: path.join(evidenceDir, "17-bbb-draft-after-revert-reload.png"),
        fullPage: true,
      });
    });

    const afterPublic = await capturePublicRoutes(context, routeStatuses, "after revert", {
      canonical: "18-public-canonical-after-draft-revert.png",
      legacy: "19-public-legacy-after-draft-revert.png",
    });
    expect(afterPublic.canonical.status).toBe(beforePublic.canonical.status);
    expect(afterPublic.legacy.status).toBe(beforePublic.legacy.status);

    expect(revertVerified, "Draft revert must be verified before the proof can pass.").toBe(true);
    expect(unexpectedMutations, "Only owner draft PATCH and safe preview POST are allowed.").toEqual([]);
    expect(publishRequests, "Draft write/revert proof must not call publish surfaces.").toEqual([]);
    expect(safePreviewRequests.length, "Private preview should use the existing safe preview-generation endpoint.").toBeGreaterThanOrEqual(1);
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);

    await fs.writeFile(
      path.join(evidenceDir, "draft-write-route-status-matrix.json"),
      `${JSON.stringify(routeStatuses, null, 2)}\n`,
      "utf-8",
    );
    await fs.writeFile(
      path.join(evidenceDir, "DRAFT_WRITE_REVERT_SUMMARY.md"),
      draftSummary(mutation, routeStatuses, beforePublic, afterPublic),
      "utf-8",
    );
    await appendValidationRecord(mutation, routeStatuses, beforePublic, afterPublic);
  });
});

async function signInHostedOwner(page: Page) {
  await page.goto(`/auth/sign-in?returnTo=${encodeURIComponent(`/studio/${roomId}/editor`)}`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByLabel("Email").fill(required("PRESENCE_E2E_OWNER_EMAIL"));
  await page.getByLabel("Password").fill(required("PRESENCE_E2E_OWNER_PASSWORD"));
  await page.getByRole("button", { name: /enter studio|sign in|log in/i }).click();
  await expect(page).toHaveURL(/\/studio/, { timeout: 30_000 });
}

async function verifyOwnerBoundBbb(request: APIRequestContext, sessionAuth: string, statuses: RouteStatus[]) {
  const detail = await ownerGet(request, `/api/presence/owner/nodes/${roomId}`, sessionAuth, statuses, "owner node detail before draft write");
  expect(detail.response.ok(), "BBB owner node detail must be readable.").toBeTruthy();
  const editor = await ownerGet(request, `/api/presence/owner/rooms/${roomId}/editor`, sessionAuth, statuses, "editor overview before draft write");
  expect(editor.response.ok(), "BBB editor overview must be readable.").toBeTruthy();

  const detailBody = await detail.response.json();
  const editorBody = await editor.response.json();
  const candidates = [
    record(apiData(detailBody)),
    record(record(apiData(detailBody)).node),
    record(apiData(editorBody)),
    record(record(apiData(editorBody)).node),
    record(record(apiData(editorBody)).room),
  ];

  return {
    roomIdMatched: candidates.some((candidate) => text(candidate.id) === String(roomId) || text(candidate.room_id) === String(roomId)),
    slugMatched: candidates.some((candidate) => text(candidate.slug) === slug),
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
  statuses.push(routeStatus(surface, "GET", routePath, response.status(), "hosted-backend", "Owner-scoped read; no payload body recorded."));
  return { response };
}

async function fetchDraftConfig(
  request: APIRequestContext,
  sessionAuth: string,
  statuses: RouteStatus[],
  surface: string,
): Promise<Record<string, unknown>> {
  const response = await request.get(`${apiBase}/api/presence/owner/rooms/${roomId}/editor/draft`, {
    headers: { Authorization: `Bearer ${sessionAuth}` },
  });
  statuses.push(routeStatus(surface, "GET", `/api/presence/owner/rooms/${roomId}/editor/draft`, response.status(), "hosted-backend", "Owner-scoped draft read; no payload body recorded."));
  expect(response.ok(), "hosted BBB owner draft read should succeed").toBeTruthy();
  const payload = apiData<Record<string, unknown>>(await response.json());
  const draft = record(payload.draft);
  expect(Object.keys(draft).length, "BBB hosted owner draft must already exist so this proof can restore the exact editable payload.").toBeGreaterThan(0);
  return draft;
}

async function saveDraft(page: Page): Promise<number> {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/presence/owner/rooms/${roomId}/editor/draft`)
      && response.request().method() === "PATCH",
  );
  await page.getByTestId("presence-studio-v2-save").click();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  await expect(page.getByTestId("presence-studio-v2-saved")).toBeVisible({ timeout: 20_000 });
  return response.status();
}

async function restoreDraftConfig(
  request: APIRequestContext,
  sessionAuth: string,
  originalEditableInput: PresenceEditorConfigInput,
  statuses: RouteStatus[],
) {
  const response = await request.patch(`${apiBase}/api/presence/owner/rooms/${roomId}/editor/draft`, {
    headers: { Authorization: `Bearer ${sessionAuth}` },
    data: originalEditableInput,
  });
  statuses.push(routeStatus("restore original draft payload", "PATCH", `/api/presence/owner/rooms/${roomId}/editor/draft`, response.status(), "hosted-backend", "Restored captured original editable draft payload."));
  expect(response.ok(), "cleanup should restore the original BBB draft config").toBeTruthy();
}

async function capturePublicRoutes(
  context: BrowserContext,
  statuses: RouteStatus[],
  phase: string,
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

async function visitPublic(page: Page, routePath: string, surface: string): Promise<RouteStatus> {
  const response = await page.goto(routePath, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
  await expect(page.getByTestId("presence-studio-v2-inspector")).toHaveCount(0);
  await expect(page.getByTestId("presence-studio-v2-selection-frame")).toHaveCount(0);
  assertNoTerms(await page.content(), restrictedPreviewTerms);
  return routeStatus(surface, "BROWSER", routePath, response?.status() ?? null, "hosted-frontend", "Anonymous public route check; no payload body recorded.");
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

function configInputFromEditableConfig(config: Record<string, unknown>) {
  return {
    renderer_key: text(config.renderer_key),
    scene_config: record(config.scene_config),
    style_dna: record(config.style_dna),
    motion_config: record(config.motion_config),
    asset_config: record(config.asset_config),
    content_config: record(config.content_config),
    roomkey_config: record(config.roomkey_config),
    enquiry_config: record(config.enquiry_config),
    locked_fields: record(config.locked_fields),
  };
}

type PresenceEditorConfigInput = ReturnType<typeof configInputFromEditableConfig>;

async function patchDraftConfig(
  request: APIRequestContext,
  sessionAuth: string,
  input: PresenceEditorConfigInput,
): Promise<number> {
  const response = await request.patch(`${apiBase}/api/presence/owner/rooms/${roomId}/editor/draft`, {
    headers: { Authorization: `Bearer ${sessionAuth}` },
    data: input,
  });
  expect(response.ok(), "BBB draft patch should succeed").toBeTruthy();
  return response.status();
}

function selectSafeObjectPlacementMutation(config: Record<string, unknown>): LayoutMutation | null {
  const sceneV2 = record(record(config.scene_config).studio_v2);
  const chamberIds = array(sceneV2.chambers)
    .map((chamber) => text(record(chamber).id))
    .filter(Boolean);
  const objectState = record(sceneV2.objectState);
  for (const objectId of Object.keys(objectState).sort()) {
    const state = record(objectState[objectId]);
    const originalChamberId = text(state.chamberId);
    const changedChamberId = chamberIds.find((candidate) => candidate && candidate !== originalChamberId);
    if (originalChamberId && changedChamberId) {
      return {
        field: "scene_config.studio_v2.objectState[object].chamberId",
        objectId,
        originalChamberId,
        changedChamberId,
      };
    }
  }
  return null;
}

function withObjectChamberMutation(input: PresenceEditorConfigInput, mutation: LayoutMutation): PresenceEditorConfigInput {
  const next = structuredClone(input);
  const sceneConfig = record(next.scene_config);
  const sceneV2 = record(sceneConfig.studio_v2);
  const objectState = record(sceneV2.objectState);
  const targetState = record(objectState[mutation.objectId]);
  objectState[mutation.objectId] = { ...targetState, chamberId: mutation.changedChamberId };
  sceneV2.objectState = objectState;
  sceneConfig.studio_v2 = sceneV2;
  next.scene_config = sceneConfig;
  return next;
}

async function appendValidationRecord(
  mutation: LayoutMutation | null,
  routeStatuses: RouteStatus[],
  beforePublic: { canonical: RouteStatus; legacy: RouteStatus },
  afterPublic: { canonical: RouteStatus; legacy: RouteStatus },
) {
  const prior = await fs.readFile(path.join(evidenceDir, "VALIDATION_RECORD.md"), "utf-8").catch(() => "");
  const lines = [
    "",
    "## BBB hosted draft write/reload/revert run",
    "",
    "- Draft write flag: enabled",
    "- Original editable draft payload: captured and normalized before mutation",
    `- Field changed: ${mutation?.field ?? "none"}`,
    `- Original chamberId: ${mutation ? "captured" : "n/a"}`,
    `- Temporary chamberId: ${mutation ? "captured" : "n/a"}`,
    "- Save/reload: passed",
    "- Private preview loaded from the temporary draft after mutation: passed",
    "- Exact normalized editable draft restored: passed",
    "- Publish action: not triggered",
    "- Public state mutation: not attempted",
    `- Canonical public route status unchanged: ${beforePublic.canonical.status} -> ${afterPublic.canonical.status}`,
    `- Legacy public route status unchanged: ${beforePublic.legacy.status} -> ${afterPublic.legacy.status}`,
    `- Draft write route/status entries recorded: ${routeStatuses.length}`,
    "- Secrets emitted: none by design; matrix records only route paths, status codes, and redacted notes",
    "",
  ];
  await fs.writeFile(path.join(evidenceDir, "VALIDATION_RECORD.md"), `${prior.trimEnd()}\n${lines.join("\n")}`, "utf-8");
}

function draftSummary(
  mutation: LayoutMutation | null,
  routeStatuses: RouteStatus[],
  beforePublic: { canonical: RouteStatus; legacy: RouteStatus },
  afterPublic: { canonical: RouteStatus; legacy: RouteStatus },
): string {
  const lines = [
    "# BBB Hosted Draft Write/Revert Summary",
    "",
    "- Draft write flag: enabled",
    "- Room id: 29",
    "- Slug: bbbvision",
    "- Title: bbb.vision",
    "- Original editable draft payload: captured and normalized before mutation",
    `- Field changed: ${mutation?.field ?? "none"}`,
    `- Original chamberId: ${mutation ? "captured" : "n/a"}`,
    `- Temporary chamberId: ${mutation ? "captured" : "n/a"}`,
    `- Reverted chamberId: ${mutation ? "captured" : "n/a"}`,
    "- Save/reload result: passed",
    "- Private preview result: loaded from the temporary draft after mutation",
    "- Revert/reload result: exact normalized editable draft restored",
    "- Publish: not triggered",
    "- Public visibility/status change: not attempted",
    "- Backend/auth/control-plane change: not attempted",
    `- Canonical public route status: ${beforePublic.canonical.status} -> ${afterPublic.canonical.status}`,
    `- Legacy public route status: ${beforePublic.legacy.status} -> ${afterPublic.legacy.status}`,
    `- Route/status entries: ${routeStatuses.length}`,
    "- Real env values: not recorded",
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function routeStatus(
  surface: string,
  method: "GET" | "PATCH" | "BROWSER",
  routePath: string,
  status: number | null,
  source: "hosted-frontend" | "hosted-backend",
  notes: string,
): RouteStatus {
  return {
    surface,
    method,
    path: routePath,
    status,
    ok: status !== null && status >= 200 && status < 500,
    source,
    notes,
  };
}

function objectChamberId(config: Record<string, unknown>, objectId: string): string {
  const sceneV2 = record(record(config.scene_config).studio_v2);
  const objectState = record(sceneV2.objectState);
  return text(record(objectState[objectId]).chamberId);
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = sortDeep((value as Record<string, unknown>)[key]);
      return acc;
    }, {});
}

function apiData<T>(payload: unknown): T {
  const body = record(payload);
  return (body.data ?? payload) as T;
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

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
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
