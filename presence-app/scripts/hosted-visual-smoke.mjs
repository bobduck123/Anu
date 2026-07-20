import { chromium } from "playwright";

const BASE = "https://your-presence.vercel.app";
const SLUG = "ggm-christina-goddard";
const ROOM_ID = 11;
const OUT = "docs/program/evidence/presence-studio-v2-hosted-visual-smoke";

const browser = await chromium.launch({ headless: true });
const results = [];

function log(stage, checks) {
  results.push({ stage, ...checks });
  console.log(`\n=== ${stage} ===`);
  for (const [k, v] of Object.entries(checks)) {
    console.log(`${k}: ${v}`);
  }
}

// ── 1. Public desktop /p/ ──
{
  const ctx = await browser.newContext({ baseURL: BASE, viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });

  await page.goto(`/p/${SLUG}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);

  const html = await page.content();
  const text = await page.locator("body").innerText();
  const hasV2Public = html.includes("presence-studio-v2-public");
  const hasThreshold = html.includes("v2-public-threshold");
  const hasCinemaShadow = html.includes("p-cinema-shadow");
  const hasWorldGallery = html.includes("world-gallery");
  const hasArtifact = html.includes("v2-public-threshold-artifact");
  const hasChamber = html.includes("v2-public-chamber");
  const hasEditorChrome = html.includes("presence-studio-v2-toolbar") || html.includes("presence-studio-v2-panel");

  await page.screenshot({ path: `${OUT}/hosted-room11-public-desktop.png`, fullPage: false });
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/hosted-room11-public-chamber.png`, fullPage: false });

  log("PUBLIC_DESKTOP /p/", {
    v2_public_class: hasV2Public,
    threshold: hasThreshold,
    cinema_shadow_token: hasCinemaShadow,
    world_gallery: hasWorldGallery,
    artifact: hasArtifact,
    chamber: hasChamber,
    editor_chrome: hasEditorChrome,
    errors: errors.length > 0 ? errors.join(" | ") : "none",
  });
  await ctx.close();
}

// ── 2. Public desktop /presence/ ──
{
  const ctx = await browser.newContext({ baseURL: BASE, viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  await page.goto(`/presence/${SLUG}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);

  const html = await page.content();
  const hasV2Public = html.includes("presence-studio-v2-public");
  const hasThreshold = html.includes("v2-public-threshold");

  log("PUBLIC_DESKTOP /presence/", {
    v2_public_class: hasV2Public,
    threshold: hasThreshold,
    matches_p_route: hasV2Public && hasThreshold,
  });
  await ctx.close();
}

// ── 3. Public mobile ──
{
  const ctx = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });

  await page.goto(`/p/${SLUG}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);

  const html = await page.content();
  const text = await page.locator("body").innerText();
  const hasV2Public = html.includes("presence-studio-v2-public");
  const hasThreshold = html.includes("v2-public-threshold");
  const hasMobileMuted = html.includes("is-mobile-muted");
  const hasCta = text.toLowerCase().includes("begin") || text.toLowerCase().includes("conversation") || text.toLowerCase().includes("partner");
  const hasEditorChrome = html.includes("presence-studio-v2-toolbar") || html.includes("presence-studio-v2-panel");

  await page.screenshot({ path: `${OUT}/hosted-room11-public-mobile.png`, fullPage: true });

  log("PUBLIC_MOBILE", {
    v2_public_class: hasV2Public,
    threshold: hasThreshold,
    cta_present: hasCta,
    mobile_muted_class: hasMobileMuted,
    editor_chrome: hasEditorChrome,
    errors: errors.length > 0 ? errors.join(" | ") : "none",
  });
  await ctx.close();
}

// ── 4. Owner editor ──
{
  const EMAIL = process.env.PRESENCE_E2E_OWNER_EMAIL;
  const PASSWORD = process.env.PRESENCE_E2E_OWNER_PASSWORD;
  if (!EMAIL || !PASSWORD) {
    log("OWNER_EDITOR", { skipped: "No credentials in env" });
  } else {
    const ctx = await browser.newContext({ baseURL: BASE, viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });

    await page.goto(`/auth/sign-in?returnTo=/studio/${ROOM_ID}/editor`, { waitUntil: "domcontentloaded" });
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: /enter studio/i }).click();
    await page.waitForURL((url) => !url.pathname.includes("/auth/"), { timeout: 30_000 });

    await page.goto(`/studio/${ROOM_ID}/editor`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(6000);

    const v2Root = await page.locator('[data-testid="presence-studio-v2-root"]').count();
    const legacyCanvas = await page.locator("text=CANVAS").count();
    const legacyInspector = await page.locator("text=INSPECTOR").count();
    const saveBtn = await page.locator('[data-testid="presence-studio-v2-save"]').count();
    const hasDarkCockpit = await page.locator("body").evaluate((b) => getComputedStyle(b).backgroundColor.includes("rgb(14, 13, 11)") || getComputedStyle(b).backgroundColor.includes("rgb(15, 14, 12)") || b.innerHTML.includes("v2-cockpit"));
    const url = page.url();

    await page.screenshot({ path: `${OUT}/hosted-room11-editor-cockpit.png`, fullPage: false });

    log("OWNER_EDITOR", {
      v2_root_count: v2Root,
      legacy_canvas: legacyCanvas,
      legacy_inspector: legacyInspector,
      save_button: saveBtn,
      dark_cockpit: hasDarkCockpit,
      url,
      errors: errors.length > 0 ? errors.join(" | ") : "none",
    });
    await ctx.close();
  }
}

// ── 5. Legacy negative (Room 1) ──
{
  const EMAIL = process.env.PRESENCE_E2E_OWNER_EMAIL;
  const PASSWORD = process.env.PRESENCE_E2E_OWNER_PASSWORD;
  if (!EMAIL || !PASSWORD) {
    log("LEGACY_NEGATIVE", { skipped: "No credentials in env" });
  } else {
    const ctx = await browser.newContext({ baseURL: BASE, viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();
    await page.goto(`/auth/sign-in?returnTo=/studio/1/editor`, { waitUntil: "domcontentloaded" });
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: /enter studio/i }).click();
    await page.waitForURL((url) => !url.pathname.includes("/auth/"), { timeout: 30_000 });

    await page.goto("/studio/1/editor", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);

    const bodyText = await page.locator("body").innerText();
    const hasLegacy = bodyText.includes("CANVAS") || bodyText.includes("INSPECTOR");
    const v2Root = await page.locator('[data-testid="presence-studio-v2-root"]').count();

    await page.screenshot({ path: `${OUT}/hosted-room1-legacy-editor.png`, fullPage: false });

    log("LEGACY_NEGATIVE Room 1", {
      legacy_editor_present: hasLegacy,
      v2_root_count: v2Root,
    });
    await ctx.close();
  }
}

// ── Summary ──
console.log("\n=== HOSTED VISUAL SMOKE SUMMARY ===");
for (const r of results) {
  const status = Object.entries(r).every(([k, v]) => k === "stage" || k === "errors" || v !== false && v !== 0) ? "PASS" : "CHECK";
  console.log(`${status}: ${r.stage}`);
}

await browser.close();
