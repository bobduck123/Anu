import { expect, test, type APIRequestContext, type Page } from "playwright/test";

const hostedGate = process.env.PRESENCE_HOSTED_SMOKE === "1";
const requiredEnv = [
  "PRESENCE_E2E_BASE_URL",
  "PRESENCE_E2E_API_URL",
  "PRESENCE_E2E_OWNER_EMAIL",
  "PRESENCE_E2E_OWNER_PASSWORD",
] as const;
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

const primaryKits = [
  { id: "gallery-artist", name: "Gallery Artist" },
  { id: "cultural-community-artist", name: "Cultural-Community Artist / Practice Archive" },
  { id: "material-tradie-proof-card", name: "Material / Tradie Proof Card" },
  { id: "healing-practitioner", name: "Healing Practitioner" },
  { id: "consultant-contractor", name: "Consultant / Contractor" },
] as const;

const primaryKitIds = primaryKits.map((k) => k.id);

test.describe("hosted multi-kit Studio Room owner lifecycle", () => {
  test.skip(!hostedGate, "Set PRESENCE_HOSTED_SMOKE=1 to run the hosted multi-kit lifecycle smoke.");
  test.skip(
    hostedGate && missingEnv.length > 0,
    `Missing hosted smoke env vars: ${missingEnv.join(", ")}`,
  );

  for (const kit of primaryKits) {
    test(`${kit.id} creates, edits, saves, reloads, and stays private on hosted`, async ({
      page,
      context,
      request,
    }) => {
      test.setTimeout(120_000);
      const apiBase = required("PRESENCE_E2E_API_URL");
      const marker = `Hosted multi-kit proof: ${kit.id} ${Date.now()}`;
      const observedRequests: string[] = [];
      page.on("request", (req) => observedRequests.push(req.url()));

      await signInHostedOwner(page);

      await page.goto("/studio/template-kits", { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("template-kit-starter")).toBeVisible();
      await expect(page.locator('[data-testid^="template-kit-card-"]')).toHaveCount(5);
      for (const kitId of primaryKitIds) {
        await expect(page.getByTestId(`template-kit-card-${kitId}`)).toBeVisible();
      }
      await expect(page.getByTestId("template-kit-card-underground-dj-portal")).toHaveCount(0);
      await expect(page.getByText("Underground DJ / Minimal Performer Portal")).toHaveCount(0);

      await page.getByTestId(`template-kit-select-${kit.id}`).click();
      const createResponse = page.waitForResponse(
        (response) =>
          response.url().includes("/api/presence/owner/studio-rooms/from-template-kit") &&
          response.request().method() === "POST",
      );
      await page.getByTestId("template-kit-create-draft").click();
      const created = await createResponse;
      expect(created.status()).toBe(201);
      const createdBody = await created.json();
      expect(createdBody.data).toMatchObject({
        template_kit_id: kit.id,
        template_kit_name: kit.name,
        support_state: "primary",
        status: "draft",
        visibility: "private",
        public_status: "draft",
        published: null,
        published_at: null,
      });

      const roomId = createdBody.data.room_id as number;
      const slug = createdBody.data.slug as string;
      test.info().annotations.push({ type: "hosted-created-room-id", description: String(roomId) });
      test.info().annotations.push({ type: "hosted-created-room-slug", description: slug });

      await expect(page).toHaveURL(new RegExp(`/studio/${roomId}/studio-room$`));
      await expect(page.getByTestId("studio-room-owner-editor-shell")).toBeVisible();
      await expect(page.getByTestId("studio-room-draft-warning")).toContainText("private draft only");
      await expect(page.getByTestId("studio-room-chamber-panel")).toBeVisible();
      await expect(page.getByTestId("studio-room-inspector-panel")).toBeVisible();
      await expect(page.getByTestId("studio-room-preview-panel")).toBeVisible();
      await expect(page.getByTestId("studio-room-canvas-shell")).toBeVisible();

      // Studio Guide renders for draft rooms and shows deterministic guidance
      await expect(page.getByTestId("studio-room-guide-panel")).toBeVisible();
      const guideIssueCount = await page.locator('[data-testid="studio-room-guide-panel"] .ps-guide-item').count();
      expect(guideIssueCount).toBeGreaterThanOrEqual(1);

      await expect(
        page.locator(`[data-testid="studio-room-canvas"][data-template-kit-id="${kit.id}"]`),
      ).toBeVisible();
      await expect(page.getByTestId("studio-room-mobile-primary-cta")).toBeVisible();
      await expect(page.getByTestId("studio-room-mobile-sticky-cta")).toBeVisible();
      await expect(page.getByTestId("studio-room-save-draft")).toBeDisabled();
      await expect(page.getByRole("button", { name: /publish/i })).toHaveCount(0);
      await expect(page.locator('a[href^="/p/"], a[href^="/presence/"]')).toHaveCount(0);

      await page.getByLabel("Chamber summary").fill(marker);
      await expect(page.getByTestId("studio-room-save-draft")).toBeEnabled();
      await expect(page.getByTestId("studio-room-canvas-shell")).toContainText(marker);

      const saveResponse = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/presence/owner/studio-rooms/${roomId}/draft`) &&
          response.request().method() === "PATCH",
      );
      await page.getByTestId("studio-room-save-draft").click();
      const saved = await saveResponse;
      expect(saved.ok()).toBeTruthy();
      const savedBody = await saved.json();
      expect(savedBody.data).toMatchObject({
        room_id: roomId,
        template_kit_id: kit.id,
        status: "draft",
        visibility: "private",
        public_status: "draft",
        published: null,
        published_config_present: false,
        published_at: null,
      });
      await expect(page.getByText("Draft saved. Public routes are unchanged.")).toBeVisible();
      await expect(page.getByTestId("studio-room-canvas-shell")).toContainText(marker);
      await expect(page.getByTestId("studio-room-canvas-shell")).toHaveAttribute("data-dirty", "false");
      await expect(page.getByTestId("studio-room-save-draft")).toBeDisabled();

      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(new RegExp(`/studio/${roomId}/studio-room$`));
      await expect(
        page.locator(`[data-testid="studio-room-canvas"][data-template-kit-id="${kit.id}"]`),
      ).toBeVisible();
      await expect(page.getByTestId("studio-room-canvas-shell")).toContainText(marker);
      await expect(page.getByRole("button", { name: /publish/i })).toHaveCount(0);
      await expect(page.locator('a[href^="/p/"], a[href^="/presence/"]')).toHaveCount(0);

      const token = await readSupabaseAccessToken(page);
      expect(token, "Supabase access token should be available after hosted sign-in.").toBeTruthy();

      const publicApi = await request.get(`${trimTrailingSlash(apiBase)}/api/presence/public/${slug}`);
      expect(publicApi.status()).toBe(404);

      const publicPage = await context.newPage();
      await publicPage.goto(`/p/${slug}`, { waitUntil: "domcontentloaded" });
      await expect(publicPage.getByText("Presence not public yet")).toBeVisible();
      await expect(publicPage.getByText(marker)).toHaveCount(0);
      await publicPage.close();

      // Candidate rejection: only test once per suite to avoid redundant backend calls
      if (kit.id === primaryKits[primaryKits.length - 1].id) {
        const candidateCreate = await request.post(
          `${trimTrailingSlash(apiBase)}/api/presence/owner/studio-rooms/from-template-kit`,
          {
            headers: { Authorization: `Bearer ${token}` },
            data: {
              kit_id: "underground-dj-portal",
              draft_payload: {},
            },
          },
        );
        expect(candidateCreate.status()).toBe(403);
      }

      expect(observedRequests.some(isPublishLifecycleRequest)).toBe(false);
      await attemptOptionalCleanup(request, roomId);
    });
  }
});

async function signInHostedOwner(page: Page) {
  await page.goto(`/auth/sign-in?returnTo=${encodeURIComponent("/studio/template-kits")}`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByLabel("Email").fill(required("PRESENCE_E2E_OWNER_EMAIL"));
  await page.getByLabel("Password").fill(required("PRESENCE_E2E_OWNER_PASSWORD"));
  await page.getByRole("button", { name: /enter studio/i }).click();
  await expect(page).toHaveURL(/\/studio\/template-kits|\/studio(?:\?|$)/, { timeout: 30_000 });
  await page.goto("/studio/template-kits", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("template-kit-starter")).toBeVisible({ timeout: 30_000 });
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

function isPublishLifecycleRequest(value: string): boolean {
  try {
    const parsed = new URL(value);
    const path = parsed.pathname.toLowerCase();
    if (!path.includes("publish")) return false;
    return path.includes("/api/") || path.includes("/studio");
  } catch {
    const lowered = value.toLowerCase();
    return lowered.includes("publish") && (lowered.includes("/api/") || lowered.includes("/studio"));
  }
}

async function attemptOptionalCleanup(request: APIRequestContext, roomId: number) {
  if (process.env.PRESENCE_E2E_CLEANUP_STRATEGY !== "control-delete") {
    test.info().annotations.push({
      type: "hosted-cleanup",
      description: `manual cleanup required for room ${roomId}; no safe cleanup strategy was enabled`,
    });
    return;
  }
  const apiBase = required("PRESENCE_E2E_API_URL");
  const token = process.env.PRESENCE_E2E_CONTROL_TOKEN;
  const secret = process.env.PRESENCE_E2E_CONTROL_SECRET;
  if (!token || !secret) {
    test.info().annotations.push({
      type: "hosted-cleanup",
      description: `manual cleanup required for room ${roomId}; control cleanup env vars were missing`,
    });
    return;
  }
  const response = await request.delete(`${trimTrailingSlash(apiBase)}/api/control/presence/nodes/${roomId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Control-Plane-Secret": secret,
    },
  });
  expect(response.ok(), "control cleanup should delete only the created hosted smoke draft").toBeTruthy();
  test.info().annotations.push({ type: "hosted-cleanup", description: "control-delete completed" });
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required hosted smoke env var: ${name}`);
  return value;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
