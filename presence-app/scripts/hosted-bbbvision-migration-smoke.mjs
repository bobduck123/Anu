import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = (process.env.PRESENCE_E2E_BASE_URL || "https://your-presence.vercel.app").replace(/\/+$/, "");
const OUT = path.resolve(
  process.env.PRESENCE_BBBVISION_EVIDENCE_DIR ||
    "docs/program/evidence/presence-v3-bbbvision-canvas-hosted-smoke",
);
const SUMMARY_PATH = path.join(OUT, "hosted_bbbvision_public_smoke_result.json");
const HYGIENE_PATH = path.join(OUT, "hosted_bbbvision_payload_hygiene_result.txt");

const routes = [
  { id: "bbbvision-p", path: "/p/bbbvision", kind: "bbbvision" },
  { id: "bbbvision-presence", path: "/presence/bbbvision", kind: "bbbvision" },
  { id: "room11-p", path: "/p/ggm-christina-goddard", kind: "room11" },
  { id: "room11-presence", path: "/presence/ggm-christina-goddard", kind: "room11" },
  { id: "legacy-hesmaddw", path: "/p/hesmaddw", kind: "legacy" },
];

const directGalleryRoutes = [
  { id: "bbbvision-presence-direct-gallery", path: "/presence/bbbvision#gallery", screenshot: "08-presence-bbbvision-direct-gallery.png" },
  { id: "bbbvision-p-direct-gallery", path: "/p/bbbvision#gallery", screenshot: "09-p-bbbvision-direct-gallery.png" },
];

const forbiddenTerms = [
  "editable_config",
  "draft",
  "owner",
  "hiddenPublic",
  "hiddenMobile",
  "locked",
  "pinned",
  "Room Assets",
  "Derived from current room objects",
  "Upload library later",
  "Media health",
  "Possible test asset",
  "Replace image URL",
  "presence-studio-v2-assets-panel",
  "presence-studio-v2-asset-card",
  "presence-studio-v2-media-health",
  "Public output style",
  "presence-studio-v2-public-style-selector",
  "presence-studio-v2-public-style-option",
  "style selector",
  "TemplateKit",
  "localStorage",
  "auth-token",
  "auth_token",
  "access_token",
  "refresh_token",
  "session",
  "service_role",
  "bearer ",
  "/api/presence/owner",
  "/studio/",
  "private_draft",
  "signed_url",
  "storage_key",
];

const fakeDataTerms = [
  "followers",
  "checkout",
  "upload live",
  "live sale",
  "fake",
  "demo social",
];

const visibleMetadataTerms = [
  "metadata",
  "isEntry",
  "isDefault",
  "role:",
  "chamber role",
  "chamber metadata",
  "data-chamber",
];

await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const summary = {
  base: BASE,
  checked_at: new Date().toISOString(),
  routes: [],
  screenshots: [],
  violations: [],
  runtime_errors: [],
};

try {
  for (const route of routes) {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 1440, height: 960 } });
    const page = await context.newPage();
    collectRuntimeErrors(page, summary.runtime_errors, route.id);
    const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => undefined);
    await page.waitForTimeout(1800);

    const html = await page.content();
    const text = await page.locator("body").innerText().catch(() => "");
    summary.violations.push(...scan(route.id, "html", html, forbiddenTerms));
    summary.violations.push(...scan(route.id, "text", text, forbiddenTerms));
    summary.violations.push(...scan(route.id, "text", text, fakeDataTerms));
    summary.violations.push(...scan(route.id, "text", text, visibleMetadataTerms));

    const routeResult = {
      id: route.id,
      path: route.path,
      status: response?.status() ?? null,
      ok: response?.ok() ?? false,
      kind: route.kind,
      title: await page.title(),
      v2_public_count: await page.locator(".presence-studio-v2-public").count(),
      bbbvision_style_count: await page.getByTestId("presence-public-style-bbbvision-threshold-gallery").count(),
      bbbvision_threshold_count: await page.getByTestId("presence-public-bbbvision-threshold").count(),
      bbbvision_gallery_count: await page.getByTestId("presence-public-bbbvision-gallery").count(),
      bbbvision_threshold_role: await page.getByTestId("presence-public-bbbvision-threshold").first().getAttribute("data-chamber-role").catch(() => null),
      bbbvision_threshold_layout: await page.getByTestId("presence-public-bbbvision-threshold").first().getAttribute("data-chamber-layout").catch(() => null),
      bbbvision_threshold_transition: await page.getByTestId("presence-public-bbbvision-threshold").first().getAttribute("data-chamber-transition").catch(() => null),
      source_asset_count: await page.locator('img[src*="bbbvision.vercel.app/assets/"]').count(),
      broken_visible_image_count: await brokenImageCount(page),
    };

    if (route.kind === "bbbvision") {
      assert(routeResult.ok, `${route.path} did not return HTTP 2xx`);
      assert(routeResult.bbbvision_style_count > 0, `${route.path} did not render bbbvision public style`);
      assert(routeResult.bbbvision_threshold_count > 0, `${route.path} did not render bbbvision threshold`);
      assert(routeResult.bbbvision_gallery_count === 0, `${route.path} dumped bbbvision gallery on the threshold`);
      assert(routeResult.source_asset_count >= 10, `${route.path} did not expose expected source asset images`);
      assert(text.includes("bbb.vision"), `${route.path} did not include bbb.vision title`);
      assert(text.toLowerCase().includes("enter"), `${route.path} did not include Enter CTA`);
      assert(routeResult.broken_visible_image_count === 0, `${route.path} had broken visible images`);

      if (route.id === "bbbvision-p") {
        await screenshot(page, "01-published-p-bbbvision-threshold-desktop.png", summary);
        await page.getByTestId("presence-public-bbbvision-enter").click();
        await page.getByTestId("presence-public-bbbvision-gallery").waitFor({ state: "visible", timeout: 10_000 });
        routeResult.bbbvision_gallery_after_enter_count = await page.getByTestId("presence-public-bbbvision-gallery").count();
        routeResult.bbbvision_gallery_role_after_enter = await page.getByTestId("presence-public-bbbvision-gallery").first().getAttribute("data-chamber-role").catch(() => null);
        routeResult.bbbvision_gallery_layout_after_enter = await page.getByTestId("presence-public-bbbvision-gallery").first().getAttribute("data-chamber-layout").catch(() => null);
        routeResult.bbbvision_metadata_source =
          isMetadataRole(routeResult.bbbvision_threshold_role) || isMetadataRole(routeResult.bbbvision_gallery_role_after_enter)
            ? "metadata"
            : "fallback";
        assert(routeResult.bbbvision_gallery_after_enter_count > 0, `${route.path} did not enter bbbvision gallery`);
        const constellationCount = await page.getByTestId("presence-public-bbbvision-constellation").count();
        assert(constellationCount > 0, `${route.path} gallery regressed to flat page — no canvas constellation found`);
        const afterEnterText = await page.locator("body").innerText().catch(() => "");
        summary.violations.push(...scan(route.id, "text-after-enter", afterEnterText, visibleMetadataTerms));
        await waitForCanvasReady(page, route.path);
        await page.waitForTimeout(700);
        await screenshot(page, "02a-published-p-bbbvision-canvas-ready.png", summary);
        await screenshot(page, "02-published-p-bbbvision-gallery-desktop.png", summary);
        await openFocusFromCanvas(page, route.path);
        routeResult.focus_overlay_count = await page.getByTestId("presence-public-bbbvision-focus").count();
        await screenshot(page, "03a-published-p-bbbvision-focus-overlay.png", summary);
        await page.keyboard.press("Escape");
        // Navigate with keyboard arrow to verify movement still works
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(700);
        await screenshot(page, "03-published-p-bbbvision-gallery-next-state.png", summary);
      } else {
        await screenshot(page, "04-published-presence-bbbvision-desktop.png", summary);
        await page.getByTestId("presence-public-bbbvision-enter").click();
        await page.getByTestId("presence-public-bbbvision-gallery").waitFor({ state: "visible", timeout: 10_000 });
        routeResult.bbbvision_gallery_after_enter_count = await page.getByTestId("presence-public-bbbvision-gallery").count();
        routeResult.bbbvision_gallery_role_after_enter = await page.getByTestId("presence-public-bbbvision-gallery").first().getAttribute("data-chamber-role").catch(() => null);
        routeResult.bbbvision_metadata_source =
          isMetadataRole(routeResult.bbbvision_threshold_role) || isMetadataRole(routeResult.bbbvision_gallery_role_after_enter)
            ? "metadata"
            : "fallback";
        assert(routeResult.bbbvision_gallery_after_enter_count > 0, `${route.path} did not enter bbbvision gallery`);
        const constellationCount = await page.getByTestId("presence-public-bbbvision-constellation").count();
        assert(constellationCount > 0, `${route.path} gallery regressed to flat page — no canvas constellation found`);
        const afterEnterText = await page.locator("body").innerText().catch(() => "");
        summary.violations.push(...scan(route.id, "text-after-enter", afterEnterText, visibleMetadataTerms));
        await waitForCanvasReady(page, route.path);
      }
    }

    if (route.kind === "room11") {
      assert(routeResult.ok, `${route.path} did not return HTTP 2xx`);
      assert(routeResult.v2_public_count > 0, `${route.path} did not render Studio V2 public output`);
      if (route.id === "room11-p") {
        await screenshot(page, "06-room11-regression-p-public.png", summary);
      }
    }

    if (route.kind === "legacy") {
      assert(routeResult.ok, `${route.path} did not return HTTP 2xx`);
      assert(routeResult.v2_public_count === 0, `${route.path} unexpectedly rendered Studio V2 output`);
      await screenshot(page, "07-legacy-hesmaddw-negative.png", summary);
    }

    summary.routes.push(routeResult);
    await context.close();
  }

  for (const route of directGalleryRoutes) {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 1440, height: 960 } });
    const page = await context.newPage();
    collectRuntimeErrors(page, summary.runtime_errors, route.id);
    const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => undefined);
    await page.getByTestId("presence-public-bbbvision-gallery").waitFor({ state: "visible", timeout: 10_000 });
    await waitForCanvasReady(page, route.path);

    const html = await page.content();
    const text = await page.locator("body").innerText().catch(() => "");
    summary.violations.push(...scan(route.id, "html", html, forbiddenTerms));
    summary.violations.push(...scan(route.id, "text", text, forbiddenTerms));
    summary.violations.push(...scan(route.id, "text", text, visibleMetadataTerms));

    const routeResult = {
      id: route.id,
      path: route.path,
      status: response?.status() ?? null,
      ok: response?.ok() ?? false,
      kind: "bbbvision-direct-gallery",
      bbbvision_gallery_count: await page.getByTestId("presence-public-bbbvision-gallery").count(),
      bbbvision_constellation_count: await page.getByTestId("presence-public-bbbvision-constellation").count(),
      loader_state: await page.getByTestId("presence-public-bbbvision-canvas-shell").first().getAttribute("data-loader-state").catch(() => null),
      broken_visible_image_count: await brokenImageCount(page),
    };
    assert(routeResult.ok, `${route.path} did not return HTTP 2xx`);
    assert(routeResult.bbbvision_gallery_count > 0, `${route.path} did not render direct gallery`);
    assert(routeResult.bbbvision_constellation_count > 0, `${route.path} direct gallery had no canvas constellation`);
    assert(routeResult.loader_state === "ready", `${route.path} canvas loader did not settle`);
    assert(routeResult.broken_visible_image_count === 0, `${route.path} had broken visible images`);
    await screenshot(page, route.screenshot, summary);

    if (route.id === "bbbvision-presence-direct-gallery") {
      await openFocusFromCanvas(page, route.path);
      routeResult.focus_overlay_count = await page.getByTestId("presence-public-bbbvision-focus").count();
      await screenshot(page, "10-presence-bbbvision-focus-overlay.png", summary);
      await page.keyboard.press("Escape");
    }

    summary.routes.push(routeResult);
    await context.close();
  }

  const mobile = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 }, isMobile: true });
  const mobilePage = await mobile.newPage();
  collectRuntimeErrors(mobilePage, summary.runtime_errors, "bbbvision-mobile");
  const mobileResponse = await mobilePage.goto("/p/bbbvision", { waitUntil: "domcontentloaded" });
  await mobilePage.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => undefined);
  await mobilePage.waitForTimeout(1800);
  const mobileHtml = await mobilePage.content();
  const mobileText = await mobilePage.locator("body").innerText().catch(() => "");
  summary.violations.push(...scan("bbbvision-mobile", "html", mobileHtml, forbiddenTerms));
  summary.violations.push(...scan("bbbvision-mobile", "text", mobileText, forbiddenTerms));
  summary.violations.push(...scan("bbbvision-mobile", "text", mobileText, visibleMetadataTerms));
  const mobileResult = {
    id: "bbbvision-mobile",
    path: "/p/bbbvision",
    status: mobileResponse?.status() ?? null,
    ok: mobileResponse?.ok() ?? false,
    kind: "bbbvision-mobile",
    bbbvision_style_count: await mobilePage.getByTestId("presence-public-style-bbbvision-threshold-gallery").count(),
    bbbvision_threshold_count: await mobilePage.getByTestId("presence-public-bbbvision-threshold").count(),
    bbbvision_gallery_count: await mobilePage.getByTestId("presence-public-bbbvision-gallery").count(),
    bbbvision_threshold_role: await mobilePage.getByTestId("presence-public-bbbvision-threshold").first().getAttribute("data-chamber-role").catch(() => null),
    source_asset_count: await mobilePage.locator('img[src*="bbbvision.vercel.app/assets/"]').count(),
    broken_visible_image_count: await brokenImageCount(mobilePage),
  };
  assert(mobileResult.ok, "mobile /p/bbbvision did not return HTTP 2xx");
  assert(mobileResult.bbbvision_style_count > 0, "mobile /p/bbbvision did not render bbbvision public style");
  assert(mobileResult.bbbvision_threshold_count > 0, "mobile /p/bbbvision did not render threshold");
  assert(mobileResult.bbbvision_gallery_count === 0, "mobile /p/bbbvision dumped gallery on the threshold");
  assert(mobileText.includes("bbb.vision"), "mobile /p/bbbvision did not include bbb.vision title");
  assert(mobileResult.broken_visible_image_count === 0, "mobile /p/bbbvision had broken visible images");
  await screenshot(mobilePage, "05-published-p-bbbvision-mobile-threshold.png", summary);
  await mobilePage.getByTestId("presence-public-bbbvision-enter").click();
  await mobilePage.getByTestId("presence-public-bbbvision-gallery").waitFor({ state: "visible", timeout: 10_000 });
  mobileResult.bbbvision_gallery_after_enter_count = await mobilePage.getByTestId("presence-public-bbbvision-gallery").count();
  mobileResult.bbbvision_gallery_role_after_enter = await mobilePage.getByTestId("presence-public-bbbvision-gallery").first().getAttribute("data-chamber-role").catch(() => null);
  mobileResult.bbbvision_metadata_source =
    isMetadataRole(mobileResult.bbbvision_threshold_role) || isMetadataRole(mobileResult.bbbvision_gallery_role_after_enter)
      ? "metadata"
      : "fallback";
  assert(mobileResult.bbbvision_gallery_after_enter_count > 0, "mobile /p/bbbvision did not enter gallery");
  const mobileConstellationCount = await mobilePage.getByTestId("presence-public-bbbvision-constellation").count();
  assert(mobileConstellationCount > 0, "mobile /p/bbbvision gallery regressed to flat page — no canvas constellation found");
  await waitForCanvasReady(mobilePage, "mobile /p/bbbvision");
  const mobileAfterEnterText = await mobilePage.locator("body").innerText().catch(() => "");
  summary.violations.push(...scan("bbbvision-mobile", "text-after-enter", mobileAfterEnterText, visibleMetadataTerms));
  await mobilePage.waitForTimeout(700);
  await screenshot(mobilePage, "05b-published-p-bbbvision-mobile-gallery.png", summary);
  summary.routes.push(mobileResult);
  await mobile.close();

  const reduced = await browser.newContext({
    baseURL: BASE,
    viewport: { width: 1440, height: 960 },
    reducedMotion: "reduce",
  });
  const reducedPage = await reduced.newPage();
  collectRuntimeErrors(reducedPage, summary.runtime_errors, "bbbvision-reduced-motion");
  const reducedResponse = await reducedPage.goto("/presence/bbbvision#gallery", { waitUntil: "domcontentloaded" });
  await reducedPage.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => undefined);
  await reducedPage.getByTestId("presence-public-bbbvision-gallery").waitFor({ state: "visible", timeout: 10_000 });
  await waitForCanvasReady(reducedPage, "reduced motion /presence/bbbvision#gallery");
  const reducedText = await reducedPage.locator("body").innerText().catch(() => "");
  summary.violations.push(...scan("bbbvision-reduced-motion", "text", reducedText, forbiddenTerms));
  summary.violations.push(...scan("bbbvision-reduced-motion", "text", reducedText, visibleMetadataTerms));
  await screenshot(reducedPage, "11-presence-bbbvision-reduced-motion-gallery.png", summary);
  await openFocusFromCanvas(reducedPage, "reduced motion /presence/bbbvision#gallery");
  await screenshot(reducedPage, "12-presence-bbbvision-reduced-motion-focus.png", summary);
  summary.routes.push({
    id: "bbbvision-reduced-motion",
    path: "/presence/bbbvision#gallery",
    status: reducedResponse?.status() ?? null,
    ok: reducedResponse?.ok() ?? false,
    kind: "bbbvision-reduced-motion",
    bbbvision_gallery_count: await reducedPage.getByTestId("presence-public-bbbvision-gallery").count(),
    bbbvision_constellation_count: await reducedPage.getByTestId("presence-public-bbbvision-constellation").count(),
    focus_overlay_count: await reducedPage.getByTestId("presence-public-bbbvision-focus").count(),
    loader_state: await reducedPage.getByTestId("presence-public-bbbvision-canvas-shell").first().getAttribute("data-loader-state").catch(() => null),
  });
  await reduced.close();

  const uniqueViolations = unique(summary.violations);
  const hygieneText = [
    "=== HOSTED BBBVISION PAYLOAD HYGIENE ===",
    `BASE: ${BASE}`,
    `ROUTES: ${routes.map((route) => route.path).join(", ")}, ${directGalleryRoutes.map((route) => route.path).join(", ")}, /p/bbbvision mobile, /presence/bbbvision#gallery reduced-motion`,
    `TOTAL_VIOLATIONS: ${uniqueViolations.length}`,
    `VIOLATIONS: ${uniqueViolations.length ? uniqueViolations.map((item) => `${item.route}:${item.surface}:${item.term}`).join(", ") : "NONE"}`,
    `RUNTIME_ERRORS: ${summary.runtime_errors.length}`,
    `PASS: ${uniqueViolations.length === 0 && summary.runtime_errors.length === 0}`,
    "",
  ].join("\n");
  await fs.writeFile(HYGIENE_PATH, hygieneText, "utf8");
  await fs.writeFile(SUMMARY_PATH, JSON.stringify({ ...summary, violations: uniqueViolations }, null, 2) + "\n", "utf8");
  console.log(hygieneText);

  if (uniqueViolations.length > 0) {
    process.exitCode = 1;
  }
  if (summary.runtime_errors.length > 0) {
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}

function scan(route, surface, text, terms) {
  const lowered = String(text || "").toLowerCase();
  return terms
    .filter((term) => lowered.includes(term.toLowerCase()))
    .map((term) => ({ route, surface, term }));
}

function unique(violations) {
  const seen = new Set();
  const items = [];
  for (const item of violations) {
    const key = `${item.route}\0${item.surface}\0${item.term.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }
  return items;
}

function isMetadataRole(value) {
  return Boolean(value && value !== "fallback");
}

async function screenshot(page, fileName, summary) {
  const filePath = path.join(OUT, fileName);
  await page.screenshot({ path: filePath, fullPage: false });
  summary.screenshots.push(fileName);
}

async function waitForCanvasReady(page, route) {
  const shell = page.getByTestId("presence-public-bbbvision-canvas-shell").first();
  await shell.waitFor({ state: "visible", timeout: 10_000 });
  await page.waitForFunction(
    () => document.querySelector('[data-testid="presence-public-bbbvision-canvas-shell"]')?.getAttribute("data-loader-state") === "ready",
    undefined,
    { timeout: 15_000 },
  );
  const loaderState = await shell.getAttribute("data-loader-state").catch(() => null);
  assert(loaderState === "ready", `${route} canvas loader did not reach ready`);
}

async function openFocusFromCanvas(page, route) {
  await waitForCanvasReady(page, route);
  const canvas = page.locator(".v2-bbb-canvas").first();
  await canvas.waitFor({ state: "visible", timeout: 10_000 });
  const box = await canvas.boundingBox();
  assert(box, `${route} canvas had no clickable bounds`);
  const targets = [
    [0.5, 0.5],
    [0.44, 0.46],
    [0.56, 0.46],
    [0.45, 0.58],
    [0.57, 0.58],
  ];
  for (const [x, y] of targets) {
    await canvas.click({ position: { x: box.width * x, y: box.height * y } });
    await page.waitForTimeout(450);
    if ((await page.getByTestId("presence-public-bbbvision-focus").count()) > 0) break;
  }
  assert((await page.getByTestId("presence-public-bbbvision-focus").count()) > 0, `${route} did not open focus overlay`);
  await page.getByTestId("presence-public-bbbvision-focus-image").waitFor({ state: "visible", timeout: 10_000 });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function collectRuntimeErrors(page, errors, route) {
  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error" && !text.includes("Failed to load resource: net::ERR_NAME_NOT_RESOLVED")) {
      errors.push({ route, type: "console", message: text });
    }
  });
  page.on("pageerror", (error) => errors.push({ route, type: "pageerror", message: error.message }));
}

async function brokenImageCount(page) {
  return page.locator("img").evaluateAll((images) =>
    images.filter((image) => {
      const rect = image.getBoundingClientRect();
      const visible = rect.width > 0 && rect.height > 0;
      return visible && image.complete && image.naturalWidth === 0;
    }).length,
  );
}
