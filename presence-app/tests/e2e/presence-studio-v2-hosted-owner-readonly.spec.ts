import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type APIRequestContext, type Page } from "playwright/test";

const hostedGate = process.env.PRESENCE_HOSTED_SMOKE === "1";
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
const legacySlug = process.env.PRESENCE_STUDIO_V2_HOSTED_LEGACY_SLUG || "";
const draftWriteEnabled = process.env.PRESENCE_HOSTED_DRAFT_WRITE_ENABLED === "1";

const evidenceDir = path.join(
  process.cwd(),
  "docs",
  "program",
  "evidence",
  "presence-studio-hosted-owner-proof",
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

test.describe("hosted Studio V2 owner read-only proof", () => {
  test.skip(!hostedGate, "Set PRESENCE_HOSTED_SMOKE=1 to run the hosted owner read-only proof.");
  test.skip(
    hostedGate && missingEnv.length > 0,
    `Missing hosted owner read-only proof env vars: ${missingEnv.join(", ")}`,
  );
  test.skip(
    hostedGate && draftWriteEnabled,
    "This spec is read-only. Use a separately reviewed write/revert spec when PRESENCE_HOSTED_DRAFT_WRITE_ENABLED=1.",
  );

  test("owner auth, editor, draft, private preview, and public routes are readable without publish or draft mutation", async ({
    page,
    context,
    request,
  }) => {
    test.setTimeout(180_000);
    await fs.mkdir(evidenceDir, { recursive: true });

    const routeStatuses: RouteStatus[] = [];
    const mutatingRequests: string[] = [];
    const publishRequests: string[] = [];
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    page.on("request", (req) => {
      const method = req.method().toUpperCase();
      const url = req.url();
      const lowered = url.toLowerCase();
      if (lowered.includes("publish")) publishRequests.push(`${method} ${redactUrl(url)}`);
      if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && lowered.includes("/api/presence/owner/")) {
        mutatingRequests.push(`${method} ${redactUrl(url)}`);
      }
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await signInHostedOwner(page);

    const token = await readSupabaseAccessToken(page);
    expect(token, "Supabase access token should be available after hosted owner sign-in.").toBeTruthy();

    routeStatuses.push(await getOwnerStatus(request, "/api/presence/owner/nodes", token!, "owner list"));
    routeStatuses.push(await getOwnerStatus(request, `/api/presence/owner/nodes/${roomId}`, token!, "owner node detail"));
    routeStatuses.push(await getOwnerStatus(request, `/api/presence/owner/rooms/${roomId}/editor`, token!, "editor overview"));
    routeStatuses.push(await getOwnerStatus(request, `/api/presence/owner/rooms/${roomId}/editor/draft`, token!, "editor draft"));

    await test.step("hosted owner Studio loads with layout-composition controls", async () => {
      await page.goto(`/studio/${roomId}/editor`, { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId("presence-studio-v2-top-chrome")).toBeVisible();
      await expect(page.getByTestId("presence-studio-v2-outline")).toBeVisible();
      await expect(page.getByTestId("presence-studio-v2-inspector")).toBeVisible();
      await expect(page.getByTestId("presence-studio-v2-layout-label").first()).toBeVisible();
      await expect(page.getByTestId("presence-studio-v2-layout-zone").first()).toBeVisible();

      const firstObject = page.getByTestId("presence-studio-v2-outline-object").first();
      await expect(firstObject, "Hosted pilot room should expose at least one editable object.").toBeVisible();
      await firstObject.click();
      await expect(page.getByTestId("presence-studio-v2-placement-controls")).toBeVisible();
      await expect(page.getByTestId("presence-studio-v2-placement-zone")).toBeVisible();
      await expect(page.getByTestId("presence-studio-v2-placement-size")).toBeVisible();

      await page.screenshot({
        path: path.join(evidenceDir, "01-hosted-layout-composition-controls.png"),
        fullPage: true,
      });
    });

    await test.step("hosted private preview loads without editor instrumentation", async () => {
      const response = await page.goto(`/studio/${roomId}/editor/preview`, { waitUntil: "domcontentloaded" });
      routeStatuses.push({
        surface: "private preview",
        method: "BROWSER",
        path: `/studio/${roomId}/editor/preview`,
        status: response?.status() ?? null,
        ok: Boolean(response?.ok()),
        source: "hosted-frontend",
        notes: "Authenticated owner private preview.",
      });
      await expect(page.locator(".presence-studio-v2-public")).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId("presence-studio-v2-inspector")).toHaveCount(0);
      await expect(page.getByTestId("presence-studio-v2-selection-frame")).toHaveCount(0);
      const previewHtml = await page.content();
      assertNoTerms(previewHtml, restrictedPreviewTerms);
      await page.screenshot({
        path: path.join(evidenceDir, "02-hosted-private-preview-readonly.png"),
        fullPage: true,
      });
    });

    await test.step("public routes remain anonymous, read-only, and unchanged by this proof", async () => {
      const anonymous = await context.browser()?.newContext({ baseURL });
      expect(anonymous, "A fresh anonymous browser context should be available.").toBeTruthy();
      const publicPage = await anonymous!.newPage();
      try {
        routeStatuses.push(await visitPublic(publicPage, `/p/${slug}`, "canonical public route"));
        await publicPage.screenshot({
          path: path.join(evidenceDir, "03-public-canonical-route-readonly.png"),
          fullPage: true,
        });
        routeStatuses.push(await visitPublic(publicPage, `/presence/${slug}`, "legacy public route"));
        await publicPage.screenshot({
          path: path.join(evidenceDir, "04-public-legacy-route-readonly.png"),
          fullPage: true,
        });
        if (legacySlug) {
          routeStatuses.push(await visitPublic(publicPage, `/p/${legacySlug}`, "optional legacy negative route"));
        }
      } finally {
        await anonymous!.close();
      }
    });

    expect(mutatingRequests, "Read-only hosted proof must not issue owner draft/node mutations.").toEqual([]);
    expect(publishRequests, "Read-only hosted proof must not call or navigate to publish surfaces.").toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);

    await fs.writeFile(routeMatrixPath, `${JSON.stringify(routeStatuses, null, 2)}\n`, "utf-8");
    await writeValidationRecord(routeStatuses);
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

async function getOwnerStatus(
  request: APIRequestContext,
  routePath: string,
  token: string,
  surface: string,
): Promise<RouteStatus> {
  const response = await request.get(`${apiBase}${routePath}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return {
    surface,
    method: "GET",
    path: routePath,
    status: response.status(),
    ok: response.ok(),
    source: "hosted-backend",
    notes: response.ok() ? "Readable with owner token." : "Owner read failed.",
  };
}

async function visitPublic(page: Page, routePath: string, surface: string): Promise<RouteStatus> {
  const response = await page.goto(routePath, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
  await expect(page.getByTestId("presence-studio-v2-inspector")).toHaveCount(0);
  await expect(page.getByTestId("presence-studio-v2-selection-frame")).toHaveCount(0);
  const html = await page.content();
  assertNoTerms(html, restrictedPreviewTerms);
  return {
    surface,
    method: "BROWSER",
    path: routePath,
    status: response?.status() ?? null,
    ok: Boolean(response && response.status() < 500),
    source: "hosted-frontend",
    notes: "Anonymous public route was loaded without editor instrumentation.",
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
        const token =
          parsed?.access_token ??
          parsed?.currentSession?.access_token ??
          parsed?.session?.access_token;
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
    .sort((a, b) => {
      const aNum = Number.parseInt(a.name.split(".").pop() || "0", 10);
      const bNum = Number.parseInt(b.name.split(".").pop() || "0", 10);
      return aNum - bNum;
    });

  if (parts.length === 0) return null;

  let combined = parts.map((part) => part.value).join("");
  if (combined.startsWith("base64-")) combined = combined.slice("base64-".length);

  try {
    const decoded = Buffer.from(combined, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);
    const token = parsed?.access_token ?? parsed?.currentSession?.access_token ?? parsed?.session?.access_token;
    if (typeof token === "string" && token.length > 20) return token;
  } catch {
    // Ignore malformed cookie values.
  }

  return null;
}

async function writeValidationRecord(routeStatuses: RouteStatus[]) {
  const passedRoutes = routeStatuses.filter((item) => item.ok).length;
  const lines = [
    "# Hosted Owner Read-Only Validation Record",
    "",
    "- Hosted owner auth: passed",
    "- Draft write/revert: not attempted; `PRESENCE_HOSTED_DRAFT_WRITE_ENABLED` was not enabled for this read-only proof",
    "- Publish action: not triggered",
    "- Public state mutation: not attempted",
    `- Route/status entries recorded: ${routeStatuses.length}`,
    `- Route/status entries ok: ${passedRoutes}`,
    "- Secrets emitted: none by design; matrix records only route paths, status codes, and redacted notes",
    "",
  ];
  await fs.writeFile(path.join(evidenceDir, "VALIDATION_RECORD.md"), `${lines.join("\n")}\n`, "utf-8");
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
    expect(lowered, `Public/private preview HTML should not expose editor term: ${term}`).not.toContain(
      term.toLowerCase(),
    );
  }
}
