import { expect, test, type APIRequestContext, type Page } from "playwright/test";

const hostedGate = process.env.PRESENCE_HOSTED_SMOKE === "1";
const requiredEnv = [
  "PRESENCE_E2E_BASE_URL",
  "PRESENCE_E2E_API_URL",
  "PRESENCE_E2E_OWNER_EMAIL",
  "PRESENCE_E2E_OWNER_PASSWORD",
  "PRESENCE_STUDIO_V2_HOSTED_PILOT_ROOM_ID",
] as const;
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

const restrictedConfigTerms = [
  "style_dna",
  "scene_config",
  "motion_config",
  "asset_config",
  "content_config",
  "roomkey_config",
  "enquiry_config",
  "editable_config",
  "hiddenPublic",
  "hiddenMobile",
  "WILD TRANSFORM SUSPENDED",
  "localStorage",
  "TemplateKit",
] as const;

const restrictedEditorTerms = [
  "presence-studio-v2-toolbar",
  "presence-studio-v2-panel",
  "/api/presence/owner",
  "auth-token",
  "service_role",
  "bearer ",
] as const;

test.describe("hosted Studio V2 owner lifecycle", () => {
  test.skip(!hostedGate, "Set PRESENCE_HOSTED_SMOKE=1 to run the hosted Studio V2 lifecycle smoke.");
  test.skip(
    hostedGate && missingEnv.length > 0,
    `Missing hosted Studio V2 smoke env vars: ${missingEnv.join(", ")}`,
  );

  test("real owner edits, saves, previews, publishes, and renders a flagged V2 room publicly", async ({
    page,
    context,
    request,
  }) => {
    test.setTimeout(180_000);

    const baseURL = required("PRESENCE_E2E_BASE_URL");
    const apiBase = trimTrailingSlash(required("PRESENCE_E2E_API_URL"));
    const roomId = Number(required("PRESENCE_STUDIO_V2_HOSTED_PILOT_ROOM_ID"));
    const marker = `Phase E V2 hosted smoke ${Date.now()}`;
    const visibleTitle = `${marker} visible object`;
    const hiddenTitle = `${marker} hidden object`;
    const moodTitle = `${marker} mood reference`;
    const observedRequests: string[] = [];
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    page.on("request", (req) => observedRequests.push(req.url()));
    page.on("pageerror", (err) => pageErrors.push(err.message));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await test.step("anonymous visitor cannot open owner editor", async () => {
      const anonymous = await context.browser()?.newContext({ baseURL });
      expect(anonymous, "A fresh anonymous browser context should be available.").toBeTruthy();
      const anonymousEditor = await anonymous!.newPage();
      await anonymousEditor.goto(`/studio/${roomId}/editor`, { waitUntil: "domcontentloaded" });
      await expect(anonymousEditor.getByTestId("presence-studio-v2-root")).toHaveCount(0);
      await expect(anonymousEditor.getByText(/sign in|checking access|editor access|node not found/i)).toBeVisible({ timeout: 30_000 });
      await anonymous!.close();
    });

    await signInHostedOwner(page, roomId);
    const token = await readSupabaseAccessToken(page);
    expect(token, "Supabase access token should be available after hosted sign-in.").toBeTruthy();

    const originalOverview = await fetchEditorOverview(request, apiBase, token!, roomId);
    const originalSlug = text(record(originalOverview.room).slug) || process.env.PRESENCE_STUDIO_V2_HOSTED_PILOT_SLUG;
    expect(originalSlug, "Hosted pilot room slug should be available from editor overview or env.").toBeTruthy();
    test.info().annotations.push({ type: "hosted-v2-room-id", description: String(roomId) });
    test.info().annotations.push({ type: "hosted-v2-room-slug", description: originalSlug! });

    try {
      await test.step("open V2 owner editor", async () => {
        await page.goto(`/studio/${roomId}/editor`, { waitUntil: "domcontentloaded" });
        await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible({ timeout: 30_000 });
        await expect(page.getByTestId("studio-room-owner-editor-shell")).toHaveCount(0);
      });

      await test.step("edit V2 room and save through owner draft API", async () => {
        await page.getByRole("button", { name: "+ Add" }).click();
        await fillSidePanelField(page, "Title", visibleTitle);
        await fillSidePanelField(page, "Meta", "Hosted lifecycle visible proof");
        await fillSidePanelField(page, "Detail", "This object proves backend draft persistence for Studio V2.");
        await page.getByRole("button", { name: "Add object" }).click();

        await page.getByRole("button", { name: "+ Add" }).click();
        await fillSidePanelField(page, "Title", hiddenTitle);
        await fillSidePanelField(page, "Meta", "Hidden public projection proof");
        await fillSidePanelField(page, "Detail", "This object must stay out of anonymous public render.");
        await page.getByRole("button", { name: "Add object" }).click();
        await page.getByTitle("Visibility").click();

        await page.getByRole("button", { name: "Mood" }).click();
        await fillSidePanelField(page, "Title", moodTitle);
        await fillSidePanelField(page, "Detail", "Hosted V2 influence persistence");
        await page.getByRole("button", { name: "Add reference" }).click();
        await closeSidePanel(page);

        await page.getByRole("button", { name: "Skin" }).click();
        const objectShape = page.locator(".v2-side-panel .v2-skin-row").filter({ hasText: "Object Shape" }).locator("input[type='range']");
        await expect(objectShape).toBeVisible();
        await objectShape.fill("24");
        await closeSidePanel(page);

        await expect(page.getByTestId("presence-studio-v2-dirty")).toBeVisible();
        const saveResponse = page.waitForResponse(
          (response) =>
            response.url().includes(`/api/presence/owner/rooms/${roomId}/editor/draft`) &&
            ["POST", "PATCH"].includes(response.request().method()),
        );
        await page.getByTestId("presence-studio-v2-save").click();
        const saved = await saveResponse;
        expect(saved.ok()).toBeTruthy();
        await expect(page.getByTestId("presence-studio-v2-saved")).toBeVisible({ timeout: 20_000 });
      });

      await test.step("reload editor and verify backend draft persistence", async () => {
        await page.reload({ waitUntil: "domcontentloaded" });
        await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible({ timeout: 30_000 });
        await expect(page.getByText(visibleTitle)).toBeVisible();
        await expect(page.getByText(hiddenTitle)).toBeVisible();
        await page.getByRole("button", { name: "Mood" }).click();
        await expect(page.getByText(moodTitle)).toBeVisible();
      });

      await test.step("owner draft preview renders sanitized V2 room", async () => {
        await page.goto(`/studio/${roomId}/editor/preview`, { waitUntil: "domcontentloaded" });
        await expect(page.getByText("Draft preview - only you can see this")).toBeVisible({ timeout: 30_000 });
        await expect(page.locator(".presence-studio-v2-public")).toBeVisible();
        await expect(page.getByText(visibleTitle)).toBeVisible();
        await expect(page.getByText(moodTitle)).toBeVisible();
        await expect(page.getByText(hiddenTitle)).toHaveCount(0);
        const rendererHtml = await page.locator(".presence-studio-v2-public").evaluate((el) => el.outerHTML);
        assertNoRestrictedTerms(rendererHtml, [...restrictedConfigTerms, ...restrictedEditorTerms]);
        const previewHtml = await page.content();
        assertNoRestrictedTerms(previewHtml, restrictedConfigTerms);
      });

      await test.step("publish through real owner endpoint", async () => {
        await expect(page.getByTestId("preview-open-to-visitors")).toBeEnabled({ timeout: 20_000 });
        await page.getByTestId("preview-open-to-visitors").click();
        await expect(page.getByRole("dialog", { name: /open your room to visitors/i })).toBeVisible();
        const publishResponse = page.waitForResponse(
          (response) =>
            response.url().includes(`/api/presence/owner/rooms/${roomId}/editor/publish`) &&
            response.request().method() === "POST",
        );
        await page.getByRole("dialog").getByRole("button", { name: "Open room to visitors" }).click();
        const published = await publishResponse;
        expect(published.ok()).toBeTruthy();
        await expect(page.locator(".presence-studio-v2-public")).toBeVisible({ timeout: 30_000 });
      });

      await test.step("anonymous public V2 render is clean on canonical and alias routes", async () => {
        const anonymous = await context.browser()?.newContext({ baseURL });
        expect(anonymous, "A fresh anonymous browser context should be available.").toBeTruthy();
        const publicPage = await anonymous!.newPage();
        await publicPage.goto(`/p/${originalSlug}`, { waitUntil: "domcontentloaded" });
        await expect(publicPage.locator(".presence-studio-v2-public")).toBeVisible({ timeout: 30_000 });
        await expect(publicPage.getByText(visibleTitle)).toBeVisible();
        await expect(publicPage.getByText(moodTitle)).toBeVisible();
        await expect(publicPage.getByText(hiddenTitle)).toHaveCount(0);
        let html = await publicPage.content();
        assertNoRestrictedTerms(html, [...restrictedConfigTerms, ...restrictedEditorTerms, "locked", "pinned", "/studio/"]);

        await publicPage.goto(`/presence/${originalSlug}`, { waitUntil: "domcontentloaded" });
        await expect(publicPage.locator(".presence-studio-v2-public")).toBeVisible({ timeout: 30_000 });
        await expect(publicPage.getByText(visibleTitle)).toBeVisible();
        html = await publicPage.content();
        assertNoRestrictedTerms(html, [...restrictedConfigTerms, ...restrictedEditorTerms, "locked", "pinned", "/studio/"]);

        await publicPage.setViewportSize({ width: 390, height: 844 });
        await publicPage.goto(`/p/${originalSlug}`, { waitUntil: "domcontentloaded" });
        await expect(publicPage.locator(".presence-studio-v2-public")).toBeVisible({ timeout: 30_000 });
        await expect(publicPage.getByText(hiddenTitle)).toHaveCount(0);
        await anonymous!.close();
      });

      await test.step("legacy and room-key negative checks remain safe", async () => {
        const legacySlug = process.env.PRESENCE_STUDIO_V2_HOSTED_LEGACY_SLUG;
        if (legacySlug) {
          const legacyPage = await context.newPage();
          await legacyPage.goto(`/p/${legacySlug}`, { waitUntil: "domcontentloaded" });
          await expect(legacyPage.locator(".presence-studio-v2-public")).toHaveCount(0);
          await legacyPage.close();
        } else {
          test.info().annotations.push({
            type: "hosted-v2-legacy-negative",
            description: "Skipped legacy negative route check; PRESENCE_STUDIO_V2_HOSTED_LEGACY_SLUG was not set.",
          });
        }

        const roomKeyPage = await context.newPage();
        const roomKeyResponse = await roomKeyPage.goto(`/room/${roomId}/key`, { waitUntil: "domcontentloaded" });
        expect(roomKeyResponse?.status() ?? 200).toBeLessThan(500);
        assertNoRestrictedTerms(await roomKeyPage.content(), restrictedConfigTerms);
        await roomKeyPage.close();
      });

      expect(observedRequests.some((url) => url.includes("studio-rooms/from-template-kit"))).toBe(false);
      expect(observedRequests.some((url) => url.includes(`/api/presence/owner/rooms/${roomId}/editor/draft`))).toBe(true);
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    } finally {
      await restoreOriginalHostedRoom(request, apiBase, token!, roomId, originalOverview);
    }
  });
});

async function signInHostedOwner(page: Page, roomId: number) {
  await page.goto(`/auth/sign-in?returnTo=${encodeURIComponent(`/studio/${roomId}/editor`)}`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByLabel("Email").fill(required("PRESENCE_E2E_OWNER_EMAIL"));
  await page.getByLabel("Password").fill(required("PRESENCE_E2E_OWNER_PASSWORD"));
  await page.getByRole("button", { name: /enter studio/i }).click();
  await expect(page).toHaveURL(/\/studio/, { timeout: 30_000 });
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
        // Ignore unrelated localStorage values.
      }
    }
    return null;
  });
  if (fromStorage) return fromStorage;

  const cookies = await page.context().cookies();
  const parts = cookies
    .filter((c) => /sb-[^-]+-auth-token\.\d+$/.test(c.name))
    .sort((a, b) => {
      const aNum = parseInt(a.name.split(".").pop() || "0");
      const bNum = parseInt(b.name.split(".").pop() || "0");
      return aNum - bNum;
    });

  if (parts.length === 0) return null;

  let combined = parts.map((p) => p.value).join("");
  if (combined.startsWith("base64-")) {
    combined = combined.slice("base64-".length);
  }

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

async function fillSidePanelField(page: Page, label: string, value: string) {
  const field = page.locator(".v2-side-panel .v2-field").filter({ hasText: label }).first();
  await field.locator("input, textarea, select").first().fill(value);
}

async function closeSidePanel(page: Page) {
  await page.locator(".v2-side-panel .v2-panel-head button").first().click();
  await expect(page.locator(".v2-side-panel")).toHaveCount(0);
}

async function fetchEditorOverview(
  request: APIRequestContext,
  apiBase: string,
  token: string,
  roomId: number,
): Promise<Record<string, unknown>> {
  const response = await request.get(`${apiBase}/api/presence/owner/rooms/${roomId}/editor`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok(), "hosted owner editor overview should load before mutation").toBeTruthy();
  return apiData<Record<string, unknown>>(await response.json());
}

async function restoreOriginalHostedRoom(
  request: APIRequestContext,
  apiBase: string,
  token: string,
  roomId: number,
  originalOverview: Record<string, unknown>,
) {
  const originalPublished = record(originalOverview.published);
  const originalDraft = record(originalOverview.draft);
  const restoreAnnotations: string[] = [];

  if (Object.keys(originalPublished).length > 0) {
    await upsertDraftConfig(request, apiBase, token, roomId, originalPublished);
    const publish = await request.post(`${apiBase}/api/presence/owner/rooms/${roomId}/editor/publish`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(publish.ok(), "cleanup should restore the original published V2 config").toBeTruthy();
    restoreAnnotations.push("published config restored");
  } else {
    const unpublish = await request.post(`${apiBase}/api/presence/owner/nodes/${roomId}/unpublish`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(unpublish.ok(), "cleanup should return originally unpublished room to private/unpublished").toBeTruthy();
    restoreAnnotations.push("room unpublished to match original state");
  }

  if (Object.keys(originalDraft).length > 0) {
    await upsertDraftConfig(request, apiBase, token, roomId, originalDraft);
    restoreAnnotations.push("draft config restored");
  }

  test.info().annotations.push({
    type: "hosted-v2-cleanup",
    description: restoreAnnotations.join("; ") || "no original config restoration was required",
  });
}

async function upsertDraftConfig(
  request: APIRequestContext,
  apiBase: string,
  token: string,
  roomId: number,
  config: Record<string, unknown>,
) {
  const payload = configInputFromEditableConfig(config);
  const patch = await request.patch(`${apiBase}/api/presence/owner/rooms/${roomId}/editor/draft`, {
    headers: { Authorization: `Bearer ${token}` },
    data: payload,
  });
  if (patch.ok()) return;
  const create = await request.post(`${apiBase}/api/presence/owner/rooms/${roomId}/editor/draft`, {
    headers: { Authorization: `Bearer ${token}` },
    data: payload,
  });
  expect(create.ok(), "cleanup should be able to recreate an owner draft").toBeTruthy();
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

function apiData<T>(payload: unknown): T {
  const body = record(payload);
  return (body.data ?? payload) as T;
}

function assertNoRestrictedTerms(value: string, terms: readonly string[]) {
  const lowered = value.toLowerCase();
  for (const term of terms) {
    expect(lowered, `output should not expose ${term}`).not.toContain(term.toLowerCase());
  }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required hosted smoke env var: ${name}`);
  return value;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
