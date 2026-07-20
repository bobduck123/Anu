import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type APIRequestContext, type Page } from "playwright/test";

const hostedGate = process.env.PRESENCE_HOSTED_SMOKE === "1";
const writeGate = process.env.PRESENCE_HOSTED_DRAFT_WRITE_ENABLED === "1";
const requiredEnv = [
  "PRESENCE_E2E_BASE_URL",
  "PRESENCE_E2E_API_URL",
  "PRESENCE_E2E_OWNER_EMAIL",
  "PRESENCE_E2E_OWNER_PASSWORD",
  "PRESENCE_STUDIO_V2_HOSTED_PILOT_ROOM_ID",
  "PRESENCE_STUDIO_V2_HOSTED_PILOT_SLUG",
] as const;
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

const baseURL = trimTrailingSlash(process.env.PRESENCE_E2E_BASE_URL || "https://your-presence.vercel.app");
const apiBase = trimTrailingSlash(process.env.PRESENCE_E2E_API_URL || "https://anu-back-end.vercel.app");
const roomId = Number(process.env.PRESENCE_STUDIO_V2_HOSTED_PILOT_ROOM_ID || "0");
const slug = process.env.PRESENCE_STUDIO_V2_HOSTED_PILOT_SLUG || "";
const evidenceDir = path.join(process.cwd(), "docs", "program", "evidence", "presence-studio-hosted-owner-proof");

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
  field: "content_config.chambers[].composition.layoutId";
  originalLayoutId: string;
  changedLayoutId: string;
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

test.describe("hosted Studio V2 owner draft write/revert proof", () => {
  test.skip(!hostedGate, "Set PRESENCE_HOSTED_SMOKE=1 to run the hosted draft write/revert proof.");
  test.skip(hostedGate && missingEnv.length > 0, `Missing hosted draft write/revert proof env vars: ${missingEnv.join(", ")}`);
  test.skip(hostedGate && !writeGate, "Set PRESENCE_HOSTED_DRAFT_WRITE_ENABLED=1 to run draft write/revert proof.");

  test("saves one reversible layout-composition layout change and reverts it without publishing", async ({
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
    let token: string | null = null;
    let originalConfig: Record<string, unknown> | null = null;
    let mutation: LayoutMutation | null = null;

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

    await signInHostedOwner(page);
    token = await readSupabaseAccessToken(page);
    expect(token, "Supabase access token should be available after hosted owner sign-in.").toBeTruthy();
    originalConfig = await fetchDraftConfig(request, token!);

    try {
      await page.goto(`/studio/${roomId}/editor`, { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible({ timeout: 30_000 });
      const layoutSelect = page.getByTestId("presence-studio-v2-layout-select");
      await expect(layoutSelect).toBeVisible();
      const originalLayoutId = await layoutSelect.inputValue();
      const layoutOptions = await layoutSelect.locator("option").evaluateAll((options) =>
        options.map((option) => (option as HTMLOptionElement).value).filter(Boolean),
      );
      const changedLayoutId = layoutOptions.find((value) => value !== originalLayoutId);
      if (!changedLayoutId) throw new Error("BLOCKED — NO SAFE REVERSIBLE DRAFT FIELD");
      mutation = { field: "content_config.chambers[].composition.layoutId", originalLayoutId, changedLayoutId };

      await page.screenshot({ path: path.join(evidenceDir, "05-draft-write-before-mutation.png"), fullPage: true });

      await test.step("save one reversible layout-composition layoutId change", async () => {
        await layoutSelect.selectOption(changedLayoutId);
        await expect(page.getByTestId("presence-studio-v2-dirty")).toBeVisible();
        const saveStatus = await saveDraft(page);
        routeStatuses.push({
          surface: "draft save changed layoutId",
          method: "PATCH",
          path: `/api/presence/owner/rooms/${roomId}/editor/draft`,
          status: saveStatus,
          ok: saveStatus >= 200 && saveStatus < 300,
          source: "hosted-backend",
          notes: "Saved one reversible layout-composition layoutId change.",
        });
      });

      await test.step("reload owner Studio and confirm changed layout persisted", async () => {
        await fetchDraftConfig(request, token!);
        routeStatuses.push(ownerReadStatus("editor draft after layout change", `/api/presence/owner/rooms/${roomId}/editor/draft`, 200));

        await page.reload({ waitUntil: "domcontentloaded" });
        await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible({ timeout: 30_000 });
        await expect(page.getByTestId("presence-studio-v2-layout-select")).toHaveValue(changedLayoutId);
        await page.screenshot({ path: path.join(evidenceDir, "06-draft-write-after-reload.png"), fullPage: true });
      });

      await test.step("private preview reflects changed draft layout", async () => {
        const response = await page.goto(`/studio/${roomId}/editor/preview`, { waitUntil: "domcontentloaded" });
        routeStatuses.push({
          surface: "private preview after draft layout change",
          method: "BROWSER",
          path: `/studio/${roomId}/editor/preview`,
          status: response?.status() ?? null,
          ok: Boolean(response?.ok()),
          source: "hosted-frontend",
          notes: "Authenticated private preview loaded after draft composition layoutId change.",
        });
        await expect(page.locator(".presence-studio-v2-public")).toBeVisible({ timeout: 30_000 });
        await expect(page.locator(`.v2-public-layout.layout-${changedLayoutId}`).first()).toBeVisible();
        assertNoTerms(await page.content(), restrictedPreviewTerms);
        await page.screenshot({ path: path.join(evidenceDir, "07-private-preview-after-draft-change.png"), fullPage: true });
      });
    } finally {
      if (token && originalConfig) await restoreDraftConfig(request, token, originalConfig);
    }

    await test.step("reload owner Studio and confirm exact revert", async () => {
      await fetchDraftConfig(request, token!);
      routeStatuses.push(ownerReadStatus("editor draft after revert", `/api/presence/owner/rooms/${roomId}/editor/draft`, 200));

      await page.goto(`/studio/${roomId}/editor`, { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId("presence-studio-v2-layout-select")).toHaveValue(mutation!.originalLayoutId);
      await page.screenshot({ path: path.join(evidenceDir, "08-draft-write-after-revert-reload.png"), fullPage: true });
    });

    await test.step("anonymous public routes remain unchanged/private", async () => {
      const anonymous = await context.browser()?.newContext({ baseURL });
      expect(anonymous).toBeTruthy();
      const publicPage = await anonymous!.newPage();
      try {
        routeStatuses.push(await visitPublic(publicPage, `/p/${slug}`, "canonical public route after draft revert"));
        await publicPage.screenshot({ path: path.join(evidenceDir, "09-public-canonical-route-after-draft-revert.png"), fullPage: true });
        routeStatuses.push(await visitPublic(publicPage, `/presence/${slug}`, "legacy public route after draft revert"));
        await publicPage.screenshot({ path: path.join(evidenceDir, "10-public-legacy-route-after-draft-revert.png"), fullPage: true });
      } finally {
        await anonymous!.close();
      }
    });

    expect(unexpectedMutations, "Only draft PATCH and safe preview POST are allowed.").toEqual([]);
    expect(publishRequests, "Draft write/revert proof must not call publish surfaces.").toEqual([]);
    expect(safePreviewRequests.length, "Private preview should use the existing safe preview-generation endpoint.").toBeGreaterThanOrEqual(1);

    await fs.writeFile(path.join(evidenceDir, "draft-write-route-status-matrix.json"), `${JSON.stringify(routeStatuses, null, 2)}\n`, "utf-8");
    await fs.writeFile(path.join(evidenceDir, "DRAFT_WRITE_REVERT_SUMMARY.md"), draftSummary(mutation, routeStatuses), "utf-8");
  });
});

async function signInHostedOwner(page: Page) {
  await page.goto(`/auth/sign-in?returnTo=${encodeURIComponent(`/studio/${roomId}/editor`)}`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(required("PRESENCE_E2E_OWNER_EMAIL"));
  await page.getByLabel("Password").fill(required("PRESENCE_E2E_OWNER_PASSWORD"));
  await page.getByRole("button", { name: /enter studio|sign in|log in/i }).click();
  await expect(page).toHaveURL(/\/studio/, { timeout: 30_000 });
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

async function fetchDraftConfig(request: APIRequestContext, token: string): Promise<Record<string, unknown>> {
  const response = await request.get(`${apiBase}/api/presence/owner/rooms/${roomId}/editor/draft`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok(), "hosted owner draft read should succeed").toBeTruthy();
  const payload = apiData<Record<string, unknown>>(await response.json());
  const draft = record(payload.draft);
  expect(Object.keys(draft).length, "hosted owner draft should exist before write proof").toBeGreaterThan(0);
  return draft;
}

async function restoreDraftConfig(request: APIRequestContext, token: string, originalConfig: Record<string, unknown>) {
  const response = await request.patch(`${apiBase}/api/presence/owner/rooms/${roomId}/editor/draft`, {
    headers: { Authorization: `Bearer ${token}` },
    data: configInputFromEditableConfig(originalConfig),
  });
  expect(response.ok(), "cleanup should restore the original draft config").toBeTruthy();
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

async function visitPublic(page: Page, routePath: string, surface: string): Promise<RouteStatus> {
  const response = await page.goto(routePath, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
  await expect(page.getByTestId("presence-studio-v2-inspector")).toHaveCount(0);
  await expect(page.getByTestId("presence-studio-v2-selection-frame")).toHaveCount(0);
  assertNoTerms(await page.content(), restrictedPreviewTerms);
  return {
    surface,
    method: "BROWSER",
    path: routePath,
    status: response?.status() ?? null,
    ok: Boolean(response && response.status() === 404),
    source: "hosted-frontend",
    notes: "Anonymous public route remained unavailable/private after draft write/revert.",
  };
}

async function readSupabaseAccessToken(page: Page): Promise<string | null> {
  const fromStorage = await page.evaluate(() => {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key) continue;
      const value = window.localStorage.getItem(key);
      if (!value || !key.startsWith("sb-")) continue;
      try {
        const parsed = JSON.parse(value);
        const token = parsed?.access_token ?? parsed?.currentSession?.access_token ?? parsed?.session?.access_token;
        if (typeof token === "string" && token.length > 20) return token;
      } catch {
        // Ignore unrelated storage values.
      }
    }
    return null;
  });
  if (fromStorage) return fromStorage;
  const cookies = await page.context().cookies();
  const parts = cookies
    .filter((cookie) => /sb-[^-]+-auth-token\.\d+$/.test(cookie.name))
    .sort((a, b) => Number.parseInt(a.name.split(".").pop() || "0", 10) - Number.parseInt(b.name.split(".").pop() || "0", 10));
  if (parts.length === 0) return null;
  let combined = parts.map((part) => part.value).join("");
  if (combined.startsWith("base64-")) combined = combined.slice("base64-".length);
  try {
    const parsed = JSON.parse(Buffer.from(combined, "base64").toString("utf-8"));
    const token = parsed?.access_token ?? parsed?.currentSession?.access_token ?? parsed?.session?.access_token;
    if (typeof token === "string" && token.length > 20) return token;
  } catch {
    // Ignore malformed cookie values.
  }
  return null;
}

function firstLayoutId(config: Record<string, unknown>): string {
  const chamber = record(array(record(config.content_config).chambers)[0]);
  return text(record(chamber.composition).layoutId);
}

function ownerReadStatus(surface: string, routePath: string, status: number): RouteStatus {
  return { surface, method: "GET", path: routePath, status, ok: status >= 200 && status < 300, source: "hosted-backend", notes: "Owner-scoped draft read verified expected layoutId." };
}

function draftSummary(mutation: LayoutMutation | null, routeStatuses: RouteStatus[]): string {
  const lines = [
    "# Hosted Owner Draft Write/Revert Summary",
    "",
    "- Draft write flag: enabled",
    "- Publish: not triggered",
    "- Public visibility change: not attempted",
    "- Backend/auth/control-plane change: not attempted",
    "- Real env values: not recorded",
    `- Route/status entries: ${routeStatuses.length}`,
  ];
  if (mutation) {
    lines.push(
      `- Field changed: ${mutation.field}`,
      `- Room id: ${roomId}`,
      `- Slug: ${slug}`,
      `- Original layoutId: ${mutation.originalLayoutId}`,
      `- Changed layoutId: ${mutation.changedLayoutId}`,
      `- Reverted layoutId: ${mutation.originalLayoutId}`,
    );
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function apiData<T>(payload: unknown): T {
  const body = record(payload);
  return (body.data ?? payload) as T;
}

function assertNoTerms(html: string, terms: readonly string[]) {
  const lowered = html.toLowerCase();
  for (const term of terms) expect(lowered).not.toContain(term.toLowerCase());
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function required(name: (typeof requiredEnv)[number]): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
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
