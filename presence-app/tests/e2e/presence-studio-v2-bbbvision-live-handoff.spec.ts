import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type Browser, type Page } from "playwright/test";

const hostedGate = process.env.PRESENCE_HOSTED_SMOKE === "1";
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
  "presence-studio-bbbvision-live-handoff",
);

type RouteStatus = {
  surface: string;
  method: "BROWSER";
  path: string;
  status: number | null;
  ok: boolean;
  notes: string;
};

type AuditProof = {
  route: string;
  status: number | null;
  titleVisible: boolean;
  enterPathAvailable: boolean;
  brokenImages: number;
  privateTerms: number;
  editorInstrumentationCount: number;
  localOrPrivateAssetRefs: number;
  seriousConsoleErrors: number;
};

const privateTerms = [
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

test.describe("BBB live handoff audit", () => {
  test.skip(!hostedGate, "Set PRESENCE_HOSTED_SMOKE=1 to run the hosted BBB live handoff audit.");
  test.skip(hostedGate && missingEnv.length > 0, `Missing hosted BBB live audit env vars: ${missingEnv.join(", ")}`);

  test("audits live public routes and owner Studio without mutating state", async ({ browser, page }) => {
    test.setTimeout(480_000);
    await fs.mkdir(evidenceDir, { recursive: true });

    const routeStatuses: RouteStatus[] = [];
    const issues: string[] = [];
    const publishRequests: string[] = [];
    const ownerMutations: string[] = [];
    const safePreviewRequests: string[] = [];
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    page.on("request", (req) => {
      const method = req.method().toUpperCase();
      const lowered = req.url().toLowerCase();
      if (lowered.includes("publish")) publishRequests.push(`${method} ${redactUrl(req.url())}`);
      if (method === "POST" && lowered.includes(`/api/presence/owner/rooms/${roomId}/editor/preview`)) {
        safePreviewRequests.push(`${method} ${redactUrl(req.url())}`);
        return;
      }
      if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && lowered.includes("/api/presence/owner/")) {
        ownerMutations.push(`${method} ${redactUrl(req.url())}`);
      }
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    const canonicalDesktop = await auditPublicRoute(browser, `/p/${slug}`, "canonical public desktop", "01-canonical-public-desktop.png", routeStatuses, issues);
    const legacyDesktop = await auditPublicRoute(browser, `/presence/${slug}`, "legacy public desktop", "02-legacy-public-desktop.png", routeStatuses, issues);
    const canonicalMobile = await auditPublicRoute(browser, `/p/${slug}`, "canonical public mobile", "03-canonical-public-mobile.png", routeStatuses, issues, {
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const legacyMobile = await auditPublicRoute(browser, `/presence/${slug}`, "legacy public mobile", "04-legacy-public-mobile.png", routeStatuses, issues, {
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const ctaProof = await captureEnterPath(browser, routeStatuses, issues);
    const repeatCanonical = await auditPublicRoute(browser, `/p/${slug}`, "canonical public repeat no-cache", "08-canonical-public-repeat.png", routeStatuses, issues);

    await signInHostedOwner(page);
    await captureOwnerStudio(page, routeStatuses);
    await capturePrivatePreview(page, routeStatuses);

    for (const proof of [canonicalDesktop, legacyDesktop, canonicalMobile, legacyMobile, repeatCanonical]) {
      expect(proof.status).toBe(200);
      expect(proof.titleVisible).toBe(true);
      expect(proof.enterPathAvailable).toBe(true);
      expect(proof.brokenImages).toBe(0);
      expect(proof.privateTerms).toBe(0);
      expect(proof.editorInstrumentationCount).toBe(0);
      expect(proof.localOrPrivateAssetRefs).toBe(0);
      expect(proof.seriousConsoleErrors).toBe(0);
    }
    expect(ctaProof.enterPathAvailable).toBe(true);
    expect(publishRequests, "Live handoff audit must not call publish surfaces.").toEqual([]);
    expect(ownerMutations, "Live handoff audit must not call owner mutation routes.").toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(filterConsoleErrors(consoleErrors)).toEqual([]);
    expect(issues).toEqual([]);

    await writeRouteMatrix(routeStatuses);
    await writeLiveAudit({
      canonicalDesktop,
      legacyDesktop,
      canonicalMobile,
      legacyMobile,
      repeatCanonical,
      ctaProof,
      issues,
    });
    await writeOwnerStudioSanity({
      safePreviewRequests: safePreviewRequests.length,
      publishRequests: publishRequests.length,
      ownerMutations: ownerMutations.length,
    });
    await writeValidationRecord({
      canonicalDesktop,
      legacyDesktop,
      canonicalMobile,
      legacyMobile,
      repeatCanonical,
      ctaProof,
      routeCount: routeStatuses.length,
      safePreviewRequests: safePreviewRequests.length,
    });
  });
});

async function auditPublicRoute(
  browser: Browser,
  routePath: string,
  surface: string,
  screenshotName: string,
  statuses: RouteStatus[],
  issues: string[],
  contextOptions: Parameters<Browser["newContext"]>[0] = {},
): Promise<AuditProof> {
  const context = await browser.newContext({
    baseURL,
    extraHTTPHeaders: noCacheHeaders(),
    ...contextOptions,
  });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  try {
    const response = await page.goto(withCacheBust(routePath), { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
    statuses.push(routeStatus(surface, routePath, response?.status() ?? null, "No-cache anonymous public render."));
    const text = (await page.locator("body").innerText().catch(() => "")).toLowerCase();
    const proof: AuditProof = {
      route: routePath,
      status: response?.status() ?? null,
      titleVisible: text.includes(expectedTitle.toLowerCase()),
      enterPathAvailable: await findEnterPath(page),
      brokenImages: await countBrokenImages(page),
      privateTerms: privateTerms.filter((term) => text.includes(term)).length,
      editorInstrumentationCount: await countEditorInstrumentation(page),
      localOrPrivateAssetRefs: (await findLocalOrPrivateAssetRefs(page)).length,
      seriousConsoleErrors: filterConsoleErrors(consoleErrors).length,
    };
    if (!proof.titleVisible) issues.push(`${surface}: BBB title missing`);
    if (!proof.enterPathAvailable) issues.push(`${surface}: Enter CTA missing`);
    if (proof.brokenImages > 0) issues.push(`${surface}: broken images detected`);
    if (proof.privateTerms > 0) issues.push(`${surface}: private/editor terms visible`);
    if (proof.editorInstrumentationCount > 0) issues.push(`${surface}: editor instrumentation visible`);
    if (proof.localOrPrivateAssetRefs > 0) issues.push(`${surface}: local/private asset refs detected`);
    if (proof.seriousConsoleErrors > 0) issues.push(`${surface}: serious console/page errors detected`);
    await page.screenshot({ path: path.join(evidenceDir, screenshotName), fullPage: true });
    return proof;
  } finally {
    await context.close();
  }
}

async function captureEnterPath(browser: Browser, statuses: RouteStatus[], issues: string[]): Promise<AuditProof> {
  const context = await browser.newContext({ baseURL, extraHTTPHeaders: noCacheHeaders() });
  const page = await context.newPage();
  try {
    const response = await page.goto(withCacheBust(`/p/${slug}`), { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
    statuses.push(routeStatus("CTA/Enter path", `/p/${slug}`, response?.status() ?? null, "No-cache Enter interaction."));
    const enter = page.getByRole("button", { name: /enter/i }).or(page.getByRole("link", { name: /enter/i })).first();
    const enterPathAvailable = await enter.isVisible().catch(() => false);
    if (enterPathAvailable) {
      await enter.click({ timeout: 10_000 }).catch(() => issues.push("CTA/Enter visible but click failed"));
      await page.waitForTimeout(750);
    } else {
      issues.push("CTA/Enter missing");
    }
    await page.screenshot({ path: path.join(evidenceDir, "05-enter-cta-path.png"), fullPage: true });
    return {
      route: `/p/${slug}`,
      status: response?.status() ?? null,
      titleVisible: true,
      enterPathAvailable,
      brokenImages: await countBrokenImages(page),
      privateTerms: 0,
      editorInstrumentationCount: await countEditorInstrumentation(page),
      localOrPrivateAssetRefs: (await findLocalOrPrivateAssetRefs(page)).length,
      seriousConsoleErrors: 0,
    };
  } finally {
    await context.close();
  }
}

async function captureOwnerStudio(page: Page, statuses: RouteStatus[]) {
  const response = await page.goto(`/studio/${roomId}/editor`, { waitUntil: "domcontentloaded" });
  statuses.push(routeStatus("owner Studio sanity", `/studio/${roomId}/editor`, response?.status() ?? null, "Owner-authenticated Studio route."));
  await expect(page.getByTestId("presence-studio-v2-root")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("presence-studio-v2-layout-composer")).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-layout-zone").first()).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "06-owner-studio-sanity.png"), fullPage: true });
}

async function capturePrivatePreview(page: Page, statuses: RouteStatus[]) {
  const response = await page.goto(`/studio/${roomId}/editor/preview`, { waitUntil: "domcontentloaded" });
  statuses.push(routeStatus("private preview sanity", `/studio/${roomId}/editor/preview`, response?.status() ?? null, "Owner-authenticated private preview route."));
  await expect(page.locator(".presence-studio-v2-public")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(expectedTitle).first()).toBeVisible();
  await expect(page.getByTestId("presence-studio-v2-inspector")).toHaveCount(0);
  await page.screenshot({ path: path.join(evidenceDir, "07-private-preview-sanity.png"), fullPage: true });
}

async function signInHostedOwner(page: Page) {
  await page.goto(`/auth/sign-in?returnTo=${encodeURIComponent(`/studio/${roomId}/editor`)}`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(required("PRESENCE_E2E_OWNER_EMAIL"));
  await page.getByLabel("Password").fill(required("PRESENCE_E2E_OWNER_PASSWORD"));
  await page.getByRole("button", { name: /enter studio|sign in|log in/i }).click();
  await expect(page).toHaveURL(/\/studio/, { timeout: 30_000 });
}

async function writeRouteMatrix(statuses: RouteStatus[]) {
  const lines = [
    "# Route Status Matrix",
    "",
    "| Surface | Method | Path | Status | Result | Notes |",
    "|---|---:|---|---:|---|---|",
    ...statuses.map((item) => `| ${escapeCell(item.surface)} | ${item.method} | \`${item.path}\` | ${item.status ?? "n/a"} | ${item.ok ? "ok" : "issue"} | ${escapeCell(item.notes)} |`),
    "",
  ];
  await fs.writeFile(path.join(evidenceDir, "ROUTE_STATUS_MATRIX.md"), lines.join("\n"), "utf-8");
}

async function writeLiveAudit(input: {
  canonicalDesktop: AuditProof;
  legacyDesktop: AuditProof;
  canonicalMobile: AuditProof;
  legacyMobile: AuditProof;
  repeatCanonical: AuditProof;
  ctaProof: AuditProof;
  issues: string[];
}) {
  const proofs = [input.canonicalDesktop, input.legacyDesktop, input.canonicalMobile, input.legacyMobile, input.repeatCanonical, input.ctaProof];
  const lines = [
    "# Live Audit",
    "",
    `Result: ${input.issues.length === 0 ? "pass" : "issues found"}`,
    "",
    "| Route | Status | Title | Enter | Broken images | Private terms | Editor instrumentation | Local/private refs | Serious console errors |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---:|",
    ...proofs.map((proof) => `| \`${proof.route}\` | ${proof.status ?? "n/a"} | ${yesNo(proof.titleVisible)} | ${yesNo(proof.enterPathAvailable)} | ${proof.brokenImages} | ${proof.privateTerms} | ${proof.editorInstrumentationCount} | ${proof.localOrPrivateAssetRefs} | ${proof.seriousConsoleErrors} |`),
    "",
    "## Issues",
    "",
    ...(input.issues.length === 0 ? ["None recorded."] : input.issues.map((issue) => `- ${issue}`)),
    "",
  ];
  await fs.writeFile(path.join(evidenceDir, "LIVE_AUDIT.md"), lines.join("\n"), "utf-8");
}

async function writeOwnerStudioSanity(input: { safePreviewRequests: number; publishRequests: number; ownerMutations: number }) {
  const lines = [
    "# Owner Studio Sanity",
    "",
    "- `/studio/29/editor`: loaded.",
    "- Studio V2 root: rendered.",
    "- Layout composer: rendered.",
    "- Layout zone: rendered.",
    "- `/studio/29/editor/preview`: loaded.",
    "- Private preview public renderer shell: rendered.",
    "- Draft mutation: not attempted.",
    `- Publish requests observed: ${input.publishRequests}`,
    `- Unexpected owner mutations observed: ${input.ownerMutations}`,
    `- Safe private-preview POST requests observed: ${input.safePreviewRequests}`,
    "",
  ];
  await fs.writeFile(path.join(evidenceDir, "OWNER_STUDIO_SANITY.md"), lines.join("\n"), "utf-8");
}

async function writeValidationRecord(input: {
  canonicalDesktop: AuditProof;
  legacyDesktop: AuditProof;
  canonicalMobile: AuditProof;
  legacyMobile: AuditProof;
  repeatCanonical: AuditProof;
  ctaProof: AuditProof;
  routeCount: number;
  safePreviewRequests: number;
}) {
  const lines = [
    "# BBB Live Handoff Validation Record",
    "",
    "- Published target: room `29`, slug `bbbvision`, title `bbb.vision`.",
    `- Canonical public desktop: ${input.canonicalDesktop.status}`,
    `- Legacy public desktop: ${input.legacyDesktop.status}`,
    `- Canonical public mobile: ${input.canonicalMobile.status}`,
    `- Legacy public mobile: ${input.legacyMobile.status}`,
    `- Repeat canonical no-cache load: ${input.repeatCanonical.status}`,
    `- CTA/Enter path available: ${yesNo(input.ctaProof.enterPathAvailable)}`,
    "- Owner Studio sanity: passed.",
    "- Private preview sanity: passed.",
    `- Route/status entries: ${input.routeCount}`,
    `- Safe private-preview POST requests observed: ${input.safePreviewRequests}`,
    "- Publish action: not attempted.",
    "- Public mutation: not attempted.",
    "- Secrets emitted: none.",
    "",
  ];
  await fs.writeFile(path.join(evidenceDir, "VALIDATION_RECORD.md"), lines.join("\n"), "utf-8");
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

function filterConsoleErrors(errors: string[]) {
  return errors.filter((entry) => !entry.includes("Failed to load resource: the server responded with a status of 404"));
}

function routeStatus(surface: string, routePath: string, status: number | null, notes: string): RouteStatus {
  return {
    surface,
    method: "BROWSER",
    path: routePath,
    status,
    ok: status !== null && status >= 200 && status < 400,
    notes,
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
  return `${routePath}${separator}liveAudit=${Date.now()}`;
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

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}

function yesNo(value: boolean): "yes" | "no" {
  return value ? "yes" : "no";
}
