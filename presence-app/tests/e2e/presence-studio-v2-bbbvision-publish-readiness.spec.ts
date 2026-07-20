import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type Browser, type BrowserContext, type Page } from "playwright/test";

const hostedGate = process.env.PRESENCE_HOSTED_SMOKE === "1";
const draftWriteEnabled = process.env.PRESENCE_HOSTED_DRAFT_WRITE_ENABLED === "1";
const requiredEnv = [
  "PRESENCE_E2E_BASE_URL",
  "PRESENCE_E2E_OWNER_EMAIL",
  "PRESENCE_E2E_OWNER_PASSWORD",
  "PRESENCE_STUDIO_V2_BBBVISION_ROOM_ID",
  "PRESENCE_STUDIO_V2_BBBVISION_SLUG",
  "PRESENCE_STUDIO_V2_BBBVISION_TITLE",
] as const;
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

const baseURL = trimTrailingSlash(process.env.PRESENCE_E2E_BASE_URL || "https://your-presence.vercel.app");
const roomId = Number(process.env.PRESENCE_STUDIO_V2_BBBVISION_ROOM_ID || "0");
const slug = process.env.PRESENCE_STUDIO_V2_BBBVISION_SLUG || "";
const expectedTitle = process.env.PRESENCE_STUDIO_V2_BBBVISION_TITLE || "";
const evidenceDir = path.join(
  process.cwd(),
  "docs",
  "program",
  "evidence",
  "presence-studio-bbbvision-publish-readiness",
);

type RouteStatus = {
  surface: string;
  method: "BROWSER";
  path: string;
  status: number | null;
  ok: boolean;
  source: "hosted-frontend";
  notes: string;
};

type QaIssue = {
  severity: "blocking" | "non-blocking";
  surface: string;
  issue: string;
};

type RouteProof = {
  route: string;
  status: number | null;
  titleVisible: boolean;
  enterPathAvailable: boolean;
  brokenImages: number;
  localOrPrivateAssetRefs: string[];
  privateVisibleTerms: string[];
  editorInstrumentationCount: number;
};

const privateVisibleTerms = [
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

test.describe("BBB publish-readiness hosted review", () => {
  test.skip(!hostedGate, "Set PRESENCE_HOSTED_SMOKE=1 to run hosted BBB publish-readiness review.");
  test.skip(hostedGate && missingEnv.length > 0, `Missing hosted BBB readiness env vars: ${missingEnv.join(", ")}`);
  test.skip(
    hostedGate && draftWriteEnabled,
    "Publish-readiness review is read-only. Run with PRESENCE_HOSTED_DRAFT_WRITE_ENABLED=0.",
  );

  test("reviews public BBB routes, Studio parity, mobile, assets, and no-publish safety", async ({ browser, page }) => {
    test.setTimeout(240_000);
    await fs.mkdir(evidenceDir, { recursive: true });

    const routeStatuses: RouteStatus[] = [];
    const qaIssues: QaIssue[] = [];
    const publishRequests: string[] = [];
    const ownerMutations: string[] = [];
    const safePreviewRequests: string[] = [];
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    const recordRequest = (req: { method(): string; url(): string }) => {
      const method = req.method().toUpperCase();
      const url = req.url();
      const lowered = url.toLowerCase();
      if (lowered.includes("publish")) publishRequests.push(`${method} ${redactUrl(url)}`);
      if (method === "POST" && lowered.includes(`/api/presence/owner/rooms/${roomId}/editor/preview`)) {
        safePreviewRequests.push(`${method} ${redactUrl(url)}`);
        return;
      }
      if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && lowered.includes("/api/presence/owner/")) {
        ownerMutations.push(`${method} ${redactUrl(url)}`);
      }
    };

    page.on("request", recordRequest);
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    const beforeCanonical = await reviewPublicRoute(browser, `/p/${slug}`, "public canonical desktop", "01-public-canonical-desktop.png", qaIssues, routeStatuses);
    const beforeLegacy = await reviewPublicRoute(browser, `/presence/${slug}`, "public legacy desktop", "02-public-legacy-desktop.png", qaIssues, routeStatuses);
    expect(beforeCanonical.status).toBe(200);
    expect(beforeLegacy.status).toBe(200);

    await reviewPublicRoute(
      browser,
      `/p/${slug}`,
      "public canonical mobile",
      "03-public-canonical-mobile.png",
      qaIssues,
      routeStatuses,
      { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    );
    await reviewPublicRoute(
      browser,
      `/presence/${slug}`,
      "public legacy mobile",
      "04-public-legacy-mobile.png",
      qaIssues,
      routeStatuses,
      { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    );

    await signInHostedOwner(page);

    await test.step("hosted Studio V2 editor renders for BBB", async () => {
      const response = await page.goto(`/studio/${roomId}/editor`, { waitUntil: "domcontentloaded" });
      routeStatuses.push(routeStatus("hosted Studio V2 editor", `/studio/${roomId}/editor`, response?.status() ?? null, "Owner-authenticated editor route."));
      await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId("presence-studio-v2-field-title").locator("input")).toHaveValue(expectedTitle);
      await expect(page.getByTestId("presence-studio-v2-layout-composer")).toBeVisible();
      await expect(page.getByTestId("presence-studio-v2-layout-zone").first()).toBeVisible();
      await expect(page.getByTestId("presence-studio-v2-placement-controls")).toBeVisible({ timeout: 20_000 }).catch(async () => {
        await page.getByTestId("presence-studio-v2-outline-object").first().click();
        await expect(page.getByTestId("presence-studio-v2-placement-controls")).toBeVisible({ timeout: 20_000 });
      });
      await page.screenshot({ path: path.join(evidenceDir, "05-hosted-studio-v2-editor.png"), fullPage: true });
    });

    await test.step("hosted private preview renders without editor instrumentation", async () => {
      const response = await page.goto(`/studio/${roomId}/editor/preview`, { waitUntil: "domcontentloaded" });
      routeStatuses.push(routeStatus("hosted private preview desktop", `/studio/${roomId}/editor/preview`, response?.status() ?? null, "Owner-authenticated private preview."));
      await expect(page.locator(".presence-studio-v2-public")).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(expectedTitle).first()).toBeVisible();
      await expect(page.getByTestId("presence-studio-v2-inspector")).toHaveCount(0);
      await expect(page.getByTestId("presence-studio-v2-selection-frame")).toHaveCount(0);
      await page.screenshot({ path: path.join(evidenceDir, "06-hosted-private-preview-desktop.png"), fullPage: true });

      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.locator(".presence-studio-v2-public")).toBeVisible({ timeout: 30_000 });
      await page.screenshot({ path: path.join(evidenceDir, "08-hosted-private-preview-mobile.png"), fullPage: true });
    });

    const ctaProof = await captureEnterPathProof(browser, qaIssues, routeStatuses);
    const afterCanonical = await reviewPublicRoute(browser, `/p/${slug}`, "public canonical desktop after private preview", "09-public-canonical-desktop-after.png", qaIssues, routeStatuses);
    const afterLegacy = await reviewPublicRoute(browser, `/presence/${slug}`, "public legacy desktop after private preview", "10-public-legacy-desktop-after.png", qaIssues, routeStatuses);

    expect(afterCanonical.status).toBe(beforeCanonical.status);
    expect(afterLegacy.status).toBe(beforeLegacy.status);
    expect(publishRequests, "Publish-readiness gate must not call publish surfaces.").toEqual([]);
    expect(ownerMutations, "Publish-readiness gate must not call owner mutation routes.").toEqual([]);
    expect(pageErrors, "Readiness gate should not hit page errors on authenticated surfaces.").toEqual([]);
    expect(
      consoleErrors.filter((entry) => !entry.includes("Failed to load resource: the server responded with a status of 404")),
      "Readiness gate should not hit rendering-affecting console errors on authenticated surfaces.",
    ).toEqual([]);
    expect(qaIssues.filter((issue) => issue.severity === "blocking"), "No blocking public/private readiness issues should be present.").toEqual([]);

    await writeRouteMatrix(routeStatuses);
    await writePublicContentQa([beforeCanonical, beforeLegacy, afterCanonical, afterLegacy, ctaProof], qaIssues);
    await writeValidationRecord(routeStatuses, qaIssues, {
      beforeCanonical,
      beforeLegacy,
      afterCanonical,
      afterLegacy,
      ctaProof,
      publishRequests,
      ownerMutations,
      safePreviewRequests,
    });
  });
});

async function reviewPublicRoute(
  browser: Browser,
  routePath: string,
  surface: string,
  screenshotName: string,
  qaIssues: QaIssue[],
  routeStatuses: RouteStatus[],
  contextOptions: Parameters<Browser["newContext"]>[0] = {},
): Promise<RouteProof> {
  const context = await browser.newContext({ baseURL, ...contextOptions });
  const page = await context.newPage();
  const renderingErrors: string[] = [];
  page.on("pageerror", (error) => renderingErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") renderingErrors.push(message.text());
  });
  try {
    const response = await page.goto(routePath, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
    routeStatuses.push(routeStatus(surface, routePath, response?.status() ?? null, "Anonymous public route render."));

    const bodyText = (await page.locator("body").innerText().catch(() => "")).toLowerCase();
    const titleVisible = bodyText.includes(expectedTitle.toLowerCase());
    const privateTerms = privateVisibleTerms.filter((term) => bodyText.includes(term));
    const instrumentationCount = await countEditorInstrumentation(page);
    const brokenImages = await countBrokenImages(page);
    const localOrPrivateAssetRefs = await findLocalOrPrivateAssetRefs(page);
    const enterPathAvailable = await findEnterPath(page);

    if (!titleVisible) addIssue(qaIssues, "blocking", surface, "Expected BBB title was not visible.");
    if (privateTerms.length > 0) addIssue(qaIssues, "blocking", surface, "Public page exposed private/editor-only visible terms.");
    if (instrumentationCount > 0) addIssue(qaIssues, "blocking", surface, "Public page exposed Studio editor instrumentation.");
    if (brokenImages > 0) addIssue(qaIssues, "blocking", surface, "Public page has broken image elements.");
    if (localOrPrivateAssetRefs.length > 0) addIssue(qaIssues, "blocking", surface, "Public page has local/private-looking asset references.");
    if (!enterPathAvailable) addIssue(qaIssues, "non-blocking", surface, "Enter CTA was not found as a button or link.");
    for (const error of renderingErrors) {
      if (!error.includes("Failed to load resource: the server responded with a status of 404")) {
        addIssue(qaIssues, "blocking", surface, "Rendering-affecting console/page error occurred.");
      }
    }

    await page.screenshot({ path: path.join(evidenceDir, screenshotName), fullPage: true });
    return {
      route: routePath,
      status: response?.status() ?? null,
      titleVisible,
      enterPathAvailable,
      brokenImages,
      localOrPrivateAssetRefs,
      privateVisibleTerms: privateTerms,
      editorInstrumentationCount: instrumentationCount,
    };
  } finally {
    await context.close();
  }
}

async function captureEnterPathProof(
  browser: Browser,
  qaIssues: QaIssue[],
  routeStatuses: RouteStatus[],
): Promise<RouteProof> {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  try {
    const response = await page.goto(`/p/${slug}`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
    routeStatuses.push(routeStatus("CTA/Enter path proof", `/p/${slug}`, response?.status() ?? null, "Anonymous public route with Enter CTA interaction."));
    const enter = page.getByRole("button", { name: /enter/i }).or(page.getByRole("link", { name: /enter/i })).first();
    const enterPathAvailable = await enter.isVisible().catch(() => false);
    if (enterPathAvailable) {
      await enter.click({ timeout: 10_000 }).catch(() => addIssue(qaIssues, "non-blocking", "CTA/Enter path proof", "Enter CTA was visible but click did not complete."));
      await page.waitForTimeout(500);
    } else {
      addIssue(qaIssues, "non-blocking", "CTA/Enter path proof", "Enter CTA was not visible.");
    }
    await page.screenshot({ path: path.join(evidenceDir, "07-cta-enter-path-proof.png"), fullPage: true });
    return {
      route: `/p/${slug}`,
      status: response?.status() ?? null,
      titleVisible: (await page.locator("body").innerText().catch(() => "")).toLowerCase().includes(expectedTitle.toLowerCase()),
      enterPathAvailable,
      brokenImages: await countBrokenImages(page),
      localOrPrivateAssetRefs: await findLocalOrPrivateAssetRefs(page),
      privateVisibleTerms: [],
      editorInstrumentationCount: await countEditorInstrumentation(page),
    };
  } finally {
    await context.close();
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

async function countEditorInstrumentation(page: Page): Promise<number> {
  let count = 0;
  for (const selector of editorSelectors) count += await page.locator(selector).count();
  return count;
}

async function countBrokenImages(page: Page): Promise<number> {
  return page.evaluate(() => {
    return Array.from(document.images).filter((image) => image.complete && image.naturalWidth === 0).length;
  });
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

async function writeRouteMatrix(routeStatuses: RouteStatus[]) {
  const lines = [
    "# BBB Publish-Readiness Route Status Matrix",
    "",
    "| Surface | Method | Path | Status | Result | Notes |",
    "|---|---:|---|---:|---|---|",
    ...routeStatuses.map((item) =>
      `| ${escapeCell(item.surface)} | ${item.method} | \`${item.path}\` | ${item.status ?? "n/a"} | ${item.ok ? "ok" : "issue"} | ${escapeCell(item.notes)} |`,
    ),
    "",
  ];
  await fs.writeFile(path.join(evidenceDir, "ROUTE_STATUS_MATRIX.md"), lines.join("\n"), "utf-8");
}

async function writePublicContentQa(proofs: RouteProof[], qaIssues: QaIssue[]) {
  const blocking = qaIssues.filter((issue) => issue.severity === "blocking");
  const nonBlocking = qaIssues.filter((issue) => issue.severity === "non-blocking");
  const lines = [
    "# Public Content QA",
    "",
    `Result: ${blocking.length === 0 ? "pass" : "issues found"}`,
    "",
    "## Checks",
    "",
    "| Route | Status | BBB title visible | Enter path available | Broken images | Private/editor terms | Editor instrumentation | Local/private asset refs |",
    "|---|---:|---:|---:|---:|---:|---:|---:|",
    ...proofs.map((proof) =>
      `| \`${proof.route}\` | ${proof.status ?? "n/a"} | ${yesNo(proof.titleVisible)} | ${yesNo(proof.enterPathAvailable)} | ${proof.brokenImages} | ${proof.privateVisibleTerms.length} | ${proof.editorInstrumentationCount} | ${proof.localOrPrivateAssetRefs.length} |`,
    ),
    "",
    "## Blocking issues",
    "",
    ...(blocking.length === 0 ? ["None recorded."] : blocking.map((issue) => `- ${issue.surface}: ${issue.issue}`)),
    "",
    "## Non-blocking issues",
    "",
    ...(nonBlocking.length === 0 ? ["None recorded."] : nonBlocking.map((issue) => `- ${issue.surface}: ${issue.issue}`)),
    "",
    "No payload bodies, credentials, cookies, tokens, auth subjects, or private values were recorded.",
    "",
  ];
  await fs.writeFile(path.join(evidenceDir, "PUBLIC_CONTENT_QA.md"), lines.join("\n"), "utf-8");
}

async function writeValidationRecord(
  routeStatuses: RouteStatus[],
  qaIssues: QaIssue[],
  result: {
    beforeCanonical: RouteProof;
    beforeLegacy: RouteProof;
    afterCanonical: RouteProof;
    afterLegacy: RouteProof;
    ctaProof: RouteProof;
    publishRequests: string[];
    ownerMutations: string[];
    safePreviewRequests: string[];
  },
) {
  const lines = [
    "# BBB Publish-Readiness Validation Record",
    "",
    "- Hosted frontend: production `your-presence.vercel.app`",
    "- Backend: hosted backend from ignored local env; private values not recorded",
    "- Room: `29`",
    "- Slug: `bbbvision`",
    "- Title: `bbb.vision`",
    `- Public canonical status before/after: ${result.beforeCanonical.status} -> ${result.afterCanonical.status}`,
    `- Public legacy status before/after: ${result.beforeLegacy.status} -> ${result.afterLegacy.status}`,
    "- Studio V2 editor: rendered",
    "- Private preview desktop/mobile: rendered",
    `- CTA/Enter path available: ${yesNo(result.ctaProof.enterPathAvailable)}`,
    `- Route/status entries: ${routeStatuses.length}`,
    `- Blocking QA issues: ${qaIssues.filter((issue) => issue.severity === "blocking").length}`,
    `- Non-blocking QA issues: ${qaIssues.filter((issue) => issue.severity === "non-blocking").length}`,
    `- Publish requests observed: ${result.publishRequests.length}`,
    `- Owner mutation requests observed: ${result.ownerMutations.length}`,
    `- Safe private-preview POST requests observed: ${result.safePreviewRequests.length}`,
    "- Draft write/revert: not attempted in this readiness pass",
    "- Public state mutation: not attempted",
    "- Slug/title/domain/status mutation: not attempted",
    "- Secrets emitted: none by design",
    "",
  ];
  await fs.writeFile(path.join(evidenceDir, "VALIDATION_RECORD.md"), lines.join("\n"), "utf-8");
}

function routeStatus(surface: string, routePath: string, status: number | null, notes: string): RouteStatus {
  return {
    surface,
    method: "BROWSER",
    path: routePath,
    status,
    ok: status !== null && status >= 200 && status < 400,
    source: "hosted-frontend",
    notes,
  };
}

function addIssue(issues: QaIssue[], severity: QaIssue["severity"], surface: string, issue: string) {
  issues.push({ severity, surface, issue });
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

function yesNo(value: boolean): "yes" | "no" {
  return value ? "yes" : "no";
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}
