import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type APIRequestContext, type Browser, type BrowserContext, type Page } from "playwright/test";

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
const evidenceDir = path.join(
  process.cwd(),
  "docs",
  "program",
  "evidence",
  "presence-studio-bbbvision-publish-execution",
);

type Method = "GET" | "POST" | "BROWSER";
type RouteStatus = {
  phase: "pre-change" | "action" | "post-change" | "rollback";
  surface: string;
  method: Method;
  path: string;
  status: number | null;
  ok: boolean;
  notes: string;
};

type PublicProof = {
  route: string;
  status: number | null;
  titleVisible: boolean;
  enterPathAvailable: boolean;
  brokenImages: number;
  privateTerms: string[];
  editorInstrumentationCount: number;
  localOrPrivateAssetRefs: number;
};

type ConfigSummary = {
  present: boolean;
  id: string | null;
  version: string | null;
  status: string | null;
  rendererKey: string | null;
  schemaVersion: string | null;
  updatedAt: string | null;
  publishedAt: string | null;
  fingerprint: string | null;
};

const publicPrivateTerms = [
  "draft preview",
  "only you can see this",
  "back to editor",
  "open room to visitors",
  "sign out",
  "object inspector",
  "room inspector",
  "loading studio v2 editor",
] as const;

const editorSelectors = [
  "[data-testid='presence-studio-v2-root']",
  "[data-testid='presence-studio-v2-inspector']",
  "[data-testid='presence-studio-v2-selection-frame']",
  "[data-testid='presence-studio-v2-toolbar']",
  "[data-testid='presence-studio-v2-panel']",
] as const;

test.describe("BBB publish execution proof", () => {
  test.skip(!hostedGate, "Set PRESENCE_HOSTED_SMOKE=1 to run hosted BBB publish execution proof.");
  test.skip(hostedGate && missingEnv.length > 0, `Missing hosted BBB publish execution env vars: ${missingEnv.join(", ")}`);

  test("captures state, publishes only if needed, verifies hosted public output, and writes rollback packet", async ({
    browser,
    page,
    request,
  }) => {
    test.setTimeout(360_000);
    await fs.mkdir(evidenceDir, { recursive: true });

    const routeStatuses: RouteStatus[] = [];
    const qaIssues: string[] = [];
    const publishRequests: string[] = [];
    const unexpectedMutations: string[] = [];
    const safePreviewRequests: string[] = [];
    let action: "no-op" | "publish-draft" = "no-op";
    let sessionAuth: string | null = null;

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
        && !(method === "POST" && lowered.includes(`/api/presence/owner/rooms/${roomId}/editor/publish`))
      ) {
        unexpectedMutations.push(`${method} ${redactUrl(url)}`);
      }
    });

    await signInHostedOwner(page);
    sessionAuth = await readSupabaseAccessToken(page);
    expect(sessionAuth, "Owner auth must provide a session token.").toBeTruthy();

    const preDetail = await ownerGet(request, `/api/presence/owner/nodes/${roomId}`, sessionAuth!, routeStatuses, "pre-change", "owner room detail");
    const preOverview = await ownerGet(request, `/api/presence/owner/rooms/${roomId}/editor`, sessionAuth!, routeStatuses, "pre-change", "editor overview");
    const preDraft = await ownerGet(request, `/api/presence/owner/rooms/${roomId}/editor/draft`, sessionAuth!, routeStatuses, "pre-change", "editor draft");

    const preDetailData = apiData(await preDetail.json());
    const preOverviewData = record(apiData(await preOverview.json()));
    const preDraftData = record(apiData(await preDraft.json()));
    const preNode = findNode(preDetailData, preOverviewData);
    const draft = record(preDraftData.draft) || record(preOverviewData.draft);
    const published = record(preOverviewData.published);
    const publishedPublic = record(preOverviewData.published_public_config);
    const effectivePublished = Object.keys(publishedPublic).length > 0 ? publishedPublic : published;
    const draftSummary = configSummary(draft);
    const publishedSummary = configSummary(effectivePublished);

    expect(text(preNode.id) || text(preNode.room_id), "Owner detail should expose the target room id.").toBe(String(roomId));
    expect(text(preNode.slug), "Owner detail should expose the target slug.").toBe(slug);
    expect(draftSummary.present, "BBB draft config must exist before publish execution.").toBe(true);

    const prePublicCanonical = await reviewPublicRoute(browser, "pre-change", `/p/${slug}`, "pre-public-canonical-desktop.png", qaIssues, routeStatuses);
    const prePublicLegacy = await reviewPublicRoute(browser, "pre-change", `/presence/${slug}`, "pre-public-legacy-desktop.png", qaIssues, routeStatuses);
    await capturePrivatePreview(page, "pre-private-preview.png", routeStatuses, "pre-change");

    await writePreChangeState({
      node: preNode,
      draft: draftSummary,
      published: publishedSummary,
      canonical: prePublicCanonical,
      legacy: prePublicLegacy,
    });
    await writeJson("pre-change-route-status.json", routeStatuses.filter((item) => item.phase === "pre-change"));

    const draftEqualsPublished = draftSummary.fingerprint !== null && draftSummary.fingerprint === publishedSummary.fingerprint;
    const publicAlreadyReviewed = prePublicCanonical.status === 200
      && prePublicLegacy.status === 200
      && prePublicCanonical.titleVisible
      && prePublicLegacy.titleVisible
      && prePublicCanonical.editorInstrumentationCount === 0
      && prePublicLegacy.editorInstrumentationCount === 0
      && prePublicCanonical.privateTerms.length === 0
      && prePublicLegacy.privateTerms.length === 0;

    if (draftEqualsPublished && publicAlreadyReviewed) {
      action = "no-op";
      await writePublishActionLog({
        action,
        status: null,
        reason: "Draft fingerprint already matched the effective published public config and public routes already rendered the reviewed BBB state.",
        preDraft: draftSummary,
        prePublished: publishedSummary,
      });
    } else if (!draftEqualsPublished && publishedSummary.present && publicAlreadyReviewed) {
      action = "publish-draft";
      const publishResponse = await request.post(`${apiBase}/api/presence/owner/rooms/${roomId}/editor/publish`, {
        headers: authHeaders(sessionAuth!),
      });
      routeStatuses.push(routeStatus("action", "editor publish", "POST", `/api/presence/owner/rooms/${roomId}/editor/publish`, publishResponse.status(), "Existing intended owner editor publish endpoint."));
      expect(publishResponse.ok(), "Approved BBB editor publish endpoint should succeed.").toBeTruthy();
      const publishBody = record(apiData(await publishResponse.json()));
      await writePublishActionLog({
        action,
        status: publishResponse.status(),
        reason: "Draft fingerprint differed from the effective published public config; executed the existing intended owner editor publish endpoint once.",
        preDraft: draftSummary,
        prePublished: publishedSummary,
        published: configSummary(record(publishBody.published)),
        publicConfig: configSummary(record(publishBody.public_config)),
      });
    } else {
      throw new Error("BLOCKED — PUBLISH ACTION NOT SAFELY IDENTIFIED");
    }

    expect(unexpectedMutations, "No unexpected owner mutations should occur.").toEqual([]);

    const postDetail = await ownerGet(request, `/api/presence/owner/nodes/${roomId}`, sessionAuth!, routeStatuses, "post-change", "owner room detail after action");
    const postOverview = await ownerGet(request, `/api/presence/owner/rooms/${roomId}/editor`, sessionAuth!, routeStatuses, "post-change", "editor overview after action");
    const postDraft = await ownerGet(request, `/api/presence/owner/rooms/${roomId}/editor/draft`, sessionAuth!, routeStatuses, "post-change", "editor draft after action");
    const postNode = findNode(apiData(await postDetail.json()), record(apiData(await postOverview.json())));
    expect(postDetail.ok()).toBeTruthy();
    expect(postOverview.ok()).toBeTruthy();
    expect(postDraft.ok()).toBeTruthy();
    expect(text(postNode.slug), "Slug should remain unchanged.").toBe(slug);

    const postCanonical = await reviewPublicRoute(browser, "post-change", `/p/${slug}`, "01-public-canonical-desktop-after-action.png", qaIssues, routeStatuses, { noCache: true });
    const postLegacy = await reviewPublicRoute(browser, "post-change", `/presence/${slug}`, "02-public-legacy-desktop-after-action.png", qaIssues, routeStatuses, { noCache: true });
    const postMobileCanonical = await reviewPublicRoute(browser, "post-change", `/p/${slug}`, "03-public-canonical-mobile-after-action.png", qaIssues, routeStatuses, {
      noCache: true,
      contextOptions: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    });
    const postMobileLegacy = await reviewPublicRoute(browser, "post-change", `/presence/${slug}`, "04-public-legacy-mobile-after-action.png", qaIssues, routeStatuses, {
      noCache: true,
      contextOptions: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    });
    const cta = await captureEnterPathProof(browser, routeStatuses, qaIssues);
    await captureStudio(page, "06-owner-studio-after-action.png", routeStatuses, "post-change");
    await capturePrivatePreview(page, "07-private-preview-after-action.png", routeStatuses, "post-change");

    for (const proof of [postCanonical, postLegacy, postMobileCanonical, postMobileLegacy]) {
      expect(proof.status).toBe(200);
      expect(proof.titleVisible).toBe(true);
      expect(proof.brokenImages).toBe(0);
      expect(proof.privateTerms).toEqual([]);
      expect(proof.editorInstrumentationCount).toBe(0);
      expect(proof.localOrPrivateAssetRefs).toBe(0);
    }
    expect(cta.enterPathAvailable).toBe(true);
    expect(qaIssues, "No public/private QA issue should be detected after action.").toEqual([]);

    await writePostChangeVerification({
      action,
      canonical: postCanonical,
      legacy: postLegacy,
      mobileCanonical: postMobileCanonical,
      mobileLegacy: postMobileLegacy,
      cta,
      safePreviewRequests,
      publishRequests,
      unexpectedMutations,
    });
    await writeRouteMatrix(routeStatuses);
    await writeRollbackPacket({
      action,
      preDraft: draftSummary,
      prePublished: publishedSummary,
      preNode,
    });
    await writeValidationRecord({
      action,
      preCanonical: prePublicCanonical,
      preLegacy: prePublicLegacy,
      postCanonical,
      postLegacy,
      postMobileCanonical,
      postMobileLegacy,
      cta,
      publishRequestCount: publishRequests.length,
      unexpectedMutationCount: unexpectedMutations.length,
      safePreviewRequestCount: safePreviewRequests.length,
    });
  });
});

async function ownerGet(
  request: APIRequestContext,
  routePath: string,
  sessionAuth: string,
  statuses: RouteStatus[],
  phase: RouteStatus["phase"],
  surface: string,
) {
  const response = await request.get(`${apiBase}${routePath}`, {
    headers: authHeaders(sessionAuth),
  });
  statuses.push(routeStatus(phase, surface, "GET", routePath, response.status(), "Owner-scoped read; payload body not recorded."));
  expect(response.ok(), `${surface} should be readable.`).toBeTruthy();
  return response;
}

async function reviewPublicRoute(
  browser: Browser,
  phase: RouteStatus["phase"],
  routePath: string,
  screenshotName: string,
  qaIssues: string[],
  statuses: RouteStatus[],
  options: { noCache?: boolean; contextOptions?: Parameters<Browser["newContext"]>[0] } = {},
): Promise<PublicProof> {
  const context = await browser.newContext({
    baseURL,
    extraHTTPHeaders: options.noCache ? noCacheHeaders() : {},
    ...options.contextOptions,
  });
  const page = await context.newPage();
  try {
    const proofPath = options.noCache ? withCacheBust(routePath) : routePath;
    const response = await page.goto(proofPath, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
    statuses.push(routeStatus(phase, `public ${routePath}`, "BROWSER", routePath, response?.status() ?? null, options.noCache ? "Anonymous public no-cache render." : "Anonymous public render."));
    const bodyText = (await page.locator("body").innerText().catch(() => "")).toLowerCase();
    const privateTerms = publicPrivateTerms.filter((term) => bodyText.includes(term));
    const proof = {
      route: routePath,
      status: response?.status() ?? null,
      titleVisible: bodyText.includes(expectedTitle.toLowerCase()),
      enterPathAvailable: await findEnterPath(page),
      brokenImages: await countBrokenImages(page),
      privateTerms,
      editorInstrumentationCount: await countEditorInstrumentation(page),
      localOrPrivateAssetRefs: (await findLocalOrPrivateAssetRefs(page)).length,
    };
    if (!proof.titleVisible) qaIssues.push(`${routePath}: expected title not visible`);
    if (proof.brokenImages > 0) qaIssues.push(`${routePath}: broken images detected`);
    if (proof.privateTerms.length > 0) qaIssues.push(`${routePath}: private/editor terms visible`);
    if (proof.editorInstrumentationCount > 0) qaIssues.push(`${routePath}: editor instrumentation visible`);
    if (proof.localOrPrivateAssetRefs > 0) qaIssues.push(`${routePath}: local/private asset refs detected`);
    await page.screenshot({ path: path.join(evidenceDir, screenshotName), fullPage: true });
    return proof;
  } finally {
    await context.close();
  }
}

async function captureEnterPathProof(
  browser: Browser,
  statuses: RouteStatus[],
  qaIssues: string[],
): Promise<PublicProof> {
  const context = await browser.newContext({ baseURL, extraHTTPHeaders: noCacheHeaders() });
  const page = await context.newPage();
  try {
    const response = await page.goto(withCacheBust(`/p/${slug}`), { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
    statuses.push(routeStatus("post-change", "CTA/Enter path", "BROWSER", `/p/${slug}`, response?.status() ?? null, "No-cache CTA/Enter interaction proof."));
    const enter = page.getByRole("button", { name: /enter/i }).or(page.getByRole("link", { name: /enter/i })).first();
    const enterPathAvailable = await enter.isVisible().catch(() => false);
    if (enterPathAvailable) {
      await enter.click({ timeout: 10_000 }).catch(() => qaIssues.push("CTA/Enter visible but click did not complete"));
      await page.waitForTimeout(750);
    } else {
      qaIssues.push("CTA/Enter path not visible");
    }
    await page.screenshot({ path: path.join(evidenceDir, "05-cta-enter-path-after-action.png"), fullPage: true });
    return {
      route: `/p/${slug}`,
      status: response?.status() ?? null,
      titleVisible: true,
      enterPathAvailable,
      brokenImages: await countBrokenImages(page),
      privateTerms: [],
      editorInstrumentationCount: await countEditorInstrumentation(page),
      localOrPrivateAssetRefs: (await findLocalOrPrivateAssetRefs(page)).length,
    };
  } finally {
    await context.close();
  }
}

async function captureStudio(page: Page, screenshotName: string, statuses: RouteStatus[], phase: RouteStatus["phase"]) {
  const response = await page.goto(`/studio/${roomId}/editor`, { waitUntil: "domcontentloaded" });
  statuses.push(routeStatus(phase, "owner Studio editor", "BROWSER", `/studio/${roomId}/editor`, response?.status() ?? null, "Owner-authenticated Studio route."));
  await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("presence-studio-v2-field-title").locator("input")).toHaveValue(expectedTitle);
  await page.screenshot({ path: path.join(evidenceDir, screenshotName), fullPage: true });
}

async function capturePrivatePreview(page: Page, screenshotName: string, statuses: RouteStatus[], phase: RouteStatus["phase"]) {
  const response = await page.goto(`/studio/${roomId}/editor/preview`, { waitUntil: "domcontentloaded" });
  statuses.push(routeStatus(phase, "owner private preview", "BROWSER", `/studio/${roomId}/editor/preview`, response?.status() ?? null, "Owner-authenticated private preview."));
  await expect(page.locator(".presence-studio-v2-public")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(expectedTitle).first()).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-inspector")).toHaveCount(0);
  await page.screenshot({ path: path.join(evidenceDir, screenshotName), fullPage: true });
}

async function signInHostedOwner(page: Page) {
  await page.goto(`/auth/sign-in?returnTo=${encodeURIComponent(`/studio/${roomId}/editor`)}`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(required("PRESENCE_E2E_OWNER_EMAIL"));
  await page.getByLabel("Password").fill(required("PRESENCE_E2E_OWNER_PASSWORD"));
  await page.getByRole("button", { name: /enter studio|sign in|log in/i }).click();
  await expect(page).toHaveURL(/\/studio/, { timeout: 30_000 });
}

async function readSupabaseAccessToken(page: Page): Promise<string | null> {
  const fromStorage = await page.evaluate(() => {
    function extractSessionAuth(rawValue: string): string | null {
      const candidates = [rawValue];
      try {
        candidates.push(decodeURIComponent(rawValue));
      } catch {
        // Ignore non-URI encoded values.
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
            const token = parsed?.access_token ?? parsed?.currentSession?.access_token ?? parsed?.session?.access_token;
            if (typeof token === "string" && token.length > 20) return token;
          } catch {
            // Ignore unrelated storage values.
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
      const token = extractSessionAuth(value);
      if (token) return token;
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
    // Ignore non-URI encoded cookie values.
  }
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

async function countBrokenImages(page: Page): Promise<number> {
  return page.evaluate(() => Array.from(document.images).filter((image) => image.complete && image.naturalWidth === 0).length);
}

async function countEditorInstrumentation(page: Page): Promise<number> {
  let count = 0;
  for (const selector of editorSelectors) count += await page.locator(selector).count();
  return count;
}

async function findLocalOrPrivateAssetRefs(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const values = Array.from(document.querySelectorAll("[src], [href]"))
      .map((element) => element.getAttribute("src") || element.getAttribute("href") || "")
      .filter(Boolean);
    return values
      .filter((value) =>
        /(?:^file:|localhost|127\.0\.0\.1|\\Users\\|C:\\|\.env|token=|access_token|auth-token|private|signed)/i.test(value),
      )
      .map((value) => value.replace(/[?#].*$/, ""));
  });
}

async function findEnterPath(page: Page): Promise<boolean> {
  const enter = page.getByRole("button", { name: /enter/i }).or(page.getByRole("link", { name: /enter/i })).first();
  return enter.isVisible().catch(() => false);
}

async function writePreChangeState(input: {
  node: Record<string, unknown>;
  draft: ConfigSummary;
  published: ConfigSummary;
  canonical: PublicProof;
  legacy: PublicProof;
}) {
  const fields = publicStatusFields(input.node);
  const lines = [
    "# Pre-change state",
    "",
    "- Owner room detail: captured through owner-scoped GET; raw payload not recorded.",
    "- Editor overview: captured through owner-scoped GET; raw payload not recorded.",
    "- Editor draft: captured through owner-scoped GET; raw payload not recorded.",
    `- Room id matched: ${text(input.node.id) || text(input.node.room_id) === String(roomId) ? "yes" : "no"}`,
    `- Slug matched: ${text(input.node.slug) === slug ? "yes" : "no"}`,
    `- Title expected: \`${expectedTitle}\``,
    `- Node status: ${fields.status ?? "not recorded"}`,
    `- Node visibility: ${fields.visibility ?? "not recorded"}`,
    `- Node public_status: ${fields.publicStatus ?? "not recorded"}`,
    `- Draft present: ${yesNo(input.draft.present)}`,
    `- Draft version: ${input.draft.version ?? "not recorded"}`,
    `- Draft status: ${input.draft.status ?? "not recorded"}`,
    `- Draft fingerprint: ${input.draft.fingerprint ?? "not recorded"}`,
    `- Effective published config present: ${yesNo(input.published.present)}`,
    `- Effective published version: ${input.published.version ?? "not recorded"}`,
    `- Effective published status: ${input.published.status ?? "not recorded"}`,
    `- Effective published fingerprint: ${input.published.fingerprint ?? "not recorded"}`,
    `- Public canonical status: ${input.canonical.status}`,
    `- Public legacy status: ${input.legacy.status}`,
    "",
    "No secrets, tokens, cookies, auth subjects, credential values, or raw payload bodies were recorded.",
    "",
  ];
  await fs.writeFile(path.join(evidenceDir, "PRE_CHANGE_STATE.md"), lines.join("\n"), "utf-8");
}

async function writePublishActionLog(input: {
  action: "no-op" | "publish-draft";
  status: number | null;
  reason: string;
  preDraft: ConfigSummary;
  prePublished: ConfigSummary;
  published?: ConfigSummary;
  publicConfig?: ConfigSummary;
}) {
  const lines = [
    "# Publish action log",
    "",
    `- Action identified: ${input.action}`,
    `- Mutation endpoint status: ${input.status ?? "not called"}`,
    `- Reason: ${input.reason}`,
    `- Pre-change draft fingerprint: ${input.preDraft.fingerprint ?? "not recorded"}`,
    `- Pre-change effective published fingerprint: ${input.prePublished.fingerprint ?? "not recorded"}`,
    `- Returned published fingerprint: ${input.published?.fingerprint ?? "not applicable"}`,
    `- Returned public config fingerprint: ${input.publicConfig?.fingerprint ?? "not applicable"}`,
    "- Slug/title/domain/owner mutation: not attempted.",
    "- Backend auth/tenant/control-plane mutation: not attempted.",
    "",
  ];
  await fs.writeFile(path.join(evidenceDir, "PUBLISH_ACTION_LOG.md"), lines.join("\n"), "utf-8");
}

async function writePostChangeVerification(input: {
  action: "no-op" | "publish-draft";
  canonical: PublicProof;
  legacy: PublicProof;
  mobileCanonical: PublicProof;
  mobileLegacy: PublicProof;
  cta: PublicProof;
  safePreviewRequests: string[];
  publishRequests: string[];
  unexpectedMutations: string[];
}) {
  const lines = [
    "# Post-change verification",
    "",
    `- Action result: ${input.action}`,
    `- Public canonical status: ${input.canonical.status}`,
    `- Public legacy status: ${input.legacy.status}`,
    `- Mobile canonical status: ${input.mobileCanonical.status}`,
    `- Mobile legacy status: ${input.mobileLegacy.status}`,
    `- CTA/Enter available: ${yesNo(input.cta.enterPathAvailable)}`,
    `- Publish requests observed by browser page instrumentation: ${input.publishRequests.length}`,
    `- Unexpected owner mutations observed by browser page instrumentation: ${input.unexpectedMutations.length}`,
    `- Safe private-preview POST requests observed: ${input.safePreviewRequests.length}`,
    "- Public editor instrumentation: none detected.",
    "- Public draft/private labels: none detected.",
    "- Broken public image elements: none detected.",
    "- Local/private-looking asset refs: none detected.",
    "",
  ];
  await fs.writeFile(path.join(evidenceDir, "POST_CHANGE_VERIFICATION.md"), lines.join("\n"), "utf-8");
}

async function writeRollbackPacket(input: {
  action: "no-op" | "publish-draft";
  preDraft: ConfigSummary;
  prePublished: ConfigSummary;
  preNode: Record<string, unknown>;
}) {
  const lines = [
    "# Rollback packet",
    "",
    `- Publish execution action: ${input.action}`,
    "- Rollback executed in this pass: no",
    "- Pre-change state location: `PRE_CHANGE_STATE.md` and `pre-change-route-status.json`",
    `- Pre-change draft fingerprint: ${input.preDraft.fingerprint ?? "not recorded"}`,
    `- Pre-change effective published fingerprint: ${input.prePublished.fingerprint ?? "not recorded"}`,
    `- Pre-change effective published config id: ${input.prePublished.id ?? "not recorded"}`,
    `- Pre-change effective published version: ${input.prePublished.version ?? "not recorded"}`,
    "",
    "## Rollback command/endpoint plan",
    "",
    "If rollback is required after a publish-draft action, use the existing owner editor rollback endpoint for room `29` with the captured pre-change published config id or version:",
    "",
    "- `POST /api/presence/owner/rooms/29/editor/rollback`",
    "- Payload option A: `{ \"config_id\": <pre-change effective published config id> }`",
    "- Payload option B: `{ \"version\": <pre-change effective published version> }`",
    "",
    "Do not alter slug, title, domain, owner, tenant, auth, analytics, enquiries, media, or unrelated Presence records during rollback.",
    "",
    "## Rollback verification routes",
    "",
    "- `/p/bbbvision`",
    "- `/presence/bbbvision`",
    "- `/studio/29/editor`",
    "- `/studio/29/editor/preview`",
    "",
  ];
  await fs.writeFile(path.join(evidenceDir, "ROLLBACK_PACKET.md"), lines.join("\n"), "utf-8");
}

async function writeRouteMatrix(routeStatuses: RouteStatus[]) {
  const lines = [
    "# Route status matrix",
    "",
    "| Phase | Surface | Method | Path | Status | Result | Notes |",
    "|---|---|---:|---|---:|---|---|",
    ...routeStatuses.map((item) =>
      `| ${item.phase} | ${escapeCell(item.surface)} | ${item.method} | \`${item.path}\` | ${item.status ?? "n/a"} | ${item.ok ? "ok" : "issue"} | ${escapeCell(item.notes)} |`,
    ),
    "",
  ];
  await fs.writeFile(path.join(evidenceDir, "ROUTE_STATUS_MATRIX.md"), lines.join("\n"), "utf-8");
}

async function writeValidationRecord(input: {
  action: "no-op" | "publish-draft";
  preCanonical: PublicProof;
  preLegacy: PublicProof;
  postCanonical: PublicProof;
  postLegacy: PublicProof;
  postMobileCanonical: PublicProof;
  postMobileLegacy: PublicProof;
  cta: PublicProof;
  publishRequestCount: number;
  unexpectedMutationCount: number;
  safePreviewRequestCount: number;
}) {
  const lines = [
    "# BBB Publish Execution Validation Record",
    "",
    "- Human approval for controlled BBB publish/migration action: recorded in task prompt.",
    `- Action result: ${input.action}`,
    `- Public canonical status before/after: ${input.preCanonical.status} -> ${input.postCanonical.status}`,
    `- Public legacy status before/after: ${input.preLegacy.status} -> ${input.postLegacy.status}`,
    `- Mobile canonical status after action: ${input.postMobileCanonical.status}`,
    `- Mobile legacy status after action: ${input.postMobileLegacy.status}`,
    `- CTA/Enter path available after action: ${yesNo(input.cta.enterPathAvailable)}`,
    "- Owner Studio after action: rendered.",
    "- Private preview after action: rendered.",
    `- Browser-observed publish requests: ${input.publishRequestCount}`,
    `- Browser-observed unexpected owner mutations: ${input.unexpectedMutationCount}`,
    `- Safe private-preview POST requests: ${input.safePreviewRequestCount}`,
    "- Raw payloads recorded: no.",
    "- Secrets emitted: no.",
    "",
  ];
  await fs.writeFile(path.join(evidenceDir, "VALIDATION_RECORD.md"), lines.join("\n"), "utf-8");
}

async function writeJson(filename: string, value: unknown) {
  await fs.writeFile(path.join(evidenceDir, filename), `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

function configSummary(config: Record<string, unknown>): ConfigSummary {
  const present = Object.keys(config).length > 0;
  return {
    present,
    id: text(config.id) || null,
    version: text(config.version) || null,
    status: text(config.status) || null,
    rendererKey: text(config.renderer_key) || null,
    schemaVersion: text(config.schema_version) || null,
    updatedAt: text(config.updated_at) || null,
    publishedAt: text(config.published_at) || null,
    fingerprint: present ? fingerprintConfig(config) : null,
  };
}

function fingerprintConfig(config: Record<string, unknown>): string {
  const editableOnly = {
    renderer_key: config.renderer_key ?? null,
    scene_config: config.scene_config ?? null,
    style_dna: config.style_dna ?? null,
    motion_config: config.motion_config ?? null,
    asset_config: config.asset_config ?? null,
    content_config: config.content_config ?? null,
    roomkey_config: config.roomkey_config ?? null,
    enquiry_config: config.enquiry_config ?? null,
    locked_fields: config.locked_fields ?? null,
  };
  return crypto.createHash("sha256").update(stableJson(editableOnly)).digest("hex").slice(0, 16);
}

function publicStatusFields(node: Record<string, unknown>) {
  return {
    status: text(node.status) || null,
    visibility: text(node.visibility) || null,
    publicStatus: text(node.public_status) || text(node.publicStatus) || null,
  };
}

function findNode(detail: unknown, overview: Record<string, unknown>) {
  const candidates = [
    record(detail),
    record(record(detail).node),
    record(overview),
    record(overview.node),
    record(overview.room),
    record(overview.presence),
  ];
  return candidates.find((candidate) => text(candidate.id) === String(roomId) || text(candidate.room_id) === String(roomId)) ?? {};
}

function routeStatus(
  phase: RouteStatus["phase"],
  surface: string,
  method: Method,
  routePath: string,
  status: number | null,
  notes: string,
): RouteStatus {
  return {
    phase,
    surface,
    method,
    path: routePath,
    status,
    ok: status !== null && status >= 200 && status < 400,
    notes,
  };
}

function authHeaders(sessionAuth: string) {
  return {
    Authorization: `Bearer ${sessionAuth}`,
    ...noCacheHeaders(),
  };
}

function noCacheHeaders() {
  return {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}

function withCacheBust(routePath: string) {
  const separator = routePath.includes("?") ? "&" : "?";
  return `${routePath}${separator}presenceProof=${Date.now()}`;
}

function apiData(payload: unknown): unknown {
  const body = record(payload);
  return body.data ?? payload;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function required(key: (typeof requiredEnv)[number]): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, val]) => [key, sortDeep(val)]));
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

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}

function yesNo(value: boolean): "yes" | "no" {
  return value ? "yes" : "no";
}
