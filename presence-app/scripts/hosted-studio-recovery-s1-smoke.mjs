import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.PRESENCE_E2E_BASE_URL || "https://your-presence.vercel.app";
const SLUG = process.env.PRESENCE_STUDIO_V2_HOSTED_PILOT_SLUG || "ggm-christina-goddard";
const ROOM_ID = Number(process.env.PRESENCE_STUDIO_V2_HOSTED_PILOT_ROOM_ID || "11");
const LEGACY_ROOM_ID = Number(process.env.PRESENCE_STUDIO_V2_HOSTED_LEGACY_ROOM_ID || "1");
const OUT = process.env.PRESENCE_STUDIO_RECOVERY_S1_HOSTED_OUT
  ? path.resolve(process.cwd(), process.env.PRESENCE_STUDIO_RECOVERY_S1_HOSTED_OUT)
  : path.join(process.cwd(), "docs", "program", "evidence", "presence-studio-v2-studio-recovery-s1-hosted");

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
];

const restrictedEditorTerms = [
  "presence-studio-v2-toolbar",
  "presence-studio-v2-panel",
  "/api/presence/owner",
  "auth-token",
  "service_role",
  "bearer ",
];

const restrictedPublicTerms = ["locked", "pinned", "/studio/", "owner_user_id", "draft_config"];

const results = [];

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for hosted S1 smoke.`);
  return value;
}

function record(stage, checks) {
  results.push({ stage, ...checks });
  console.log(`\n=== ${stage} ===`);
  for (const [key, value] of Object.entries(checks)) {
    console.log(`${key}: ${Array.isArray(value) ? value.join(", ") || "none" : value}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function scan(text, terms) {
  const lowered = text.toLowerCase();
  return terms.filter((term) => lowered.includes(term.toLowerCase()));
}

async function collectErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

async function signIn(page, roomId) {
  await page.goto(`/auth/sign-in?returnTo=${encodeURIComponent(`/studio/${roomId}/editor`)}`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByLabel("Email").fill(required("PRESENCE_E2E_OWNER_EMAIL"));
  await page.getByLabel("Password").fill(required("PRESENCE_E2E_OWNER_PASSWORD"));
  await page.getByRole("button", { name: /enter studio/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/auth/"), { timeout: 30_000 });
}

await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });

try {
  {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 1365, height: 900 } });
    const page = await context.newPage();
    const errors = await collectErrors(page);
    await page.goto(`/p/${SLUG}`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(OUT, "hosted-room11-public-desktop.png"), fullPage: false });
    const html = await page.content();
    const violations = scan(html, [...restrictedConfigTerms, ...restrictedEditorTerms, ...restrictedPublicTerms]);
    assert(html.includes("presence-studio-v2-public"), "Public /p route did not render V2 public room.");
    assert(violations.length === 0, `Public /p payload violations: ${violations.join(", ")}`);
    record("PUBLIC_P", {
      v2_public: true,
      violations,
      errors: errors.length ? errors : "none",
    });
    await context.close();
  }

  {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(`/p/${SLUG}`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(OUT, "hosted-room11-public-mobile.png"), fullPage: true });
    const html = await page.content();
    const violations = scan(html, [...restrictedConfigTerms, ...restrictedPublicTerms]);
    assert(html.includes("presence-studio-v2-public"), "Mobile public route did not render V2 public room.");
    assert(violations.length === 0, `Mobile public payload violations: ${violations.join(", ")}`);
    record("PUBLIC_MOBILE", { v2_public: true, violations });
    await context.close();
  }

  {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 1365, height: 900 } });
    const page = await context.newPage();
    await page.goto(`/presence/${SLUG}`, { waitUntil: "networkidle" });
    const html = await page.content();
    const violations = scan(html, [...restrictedConfigTerms, ...restrictedEditorTerms, ...restrictedPublicTerms]);
    assert(html.includes("presence-studio-v2-public"), "Public /presence alias did not render V2 public room.");
    assert(violations.length === 0, `Public /presence payload violations: ${violations.join(", ")}`);
    record("PUBLIC_PRESENCE", { v2_public: true, violations });
    await context.close();
  }

  {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 1365, height: 900 } });
    const page = await context.newPage();
    const errors = await collectErrors(page);
    await signIn(page, ROOM_ID);
    await page.goto(`/studio/${ROOM_ID}/editor`, { waitUntil: "networkidle" });
    await page.getByTestId("presence-studio-v2-root").waitFor({ timeout: 30_000 });

    await page.screenshot({ path: path.join(OUT, "hosted-room11-full-s1-cockpit.png"), fullPage: false });
    await page.getByTestId("presence-studio-v2-outline").screenshot({
      path: path.join(OUT, "hosted-room11-left-outline-rail.png"),
    });

    const firstObject = page.getByTestId("presence-studio-v2-outline-object").first();
    await firstObject.click();
    await page.getByTestId("presence-studio-v2-inspector").screenshot({
      path: path.join(OUT, "hosted-room11-inspector-content-tab.png"),
    });
    await page.getByTestId("presence-studio-v2-inspector-tab-style").click();
    await page.getByTestId("presence-studio-v2-inspector").screenshot({
      path: path.join(OUT, "hosted-room11-inspector-style-tab.png"),
    });
    await page.getByTestId("presence-studio-v2-inspector-tab-motion").click();
    await page.getByTestId("presence-studio-v2-inspector").screenshot({
      path: path.join(OUT, "hosted-room11-inspector-motion-tab.png"),
    });
    await page.getByTestId("presence-studio-v2-tab-threshold").click();
    await page.screenshot({ path: path.join(OUT, "hosted-room11-threshold-tab.png"), fullPage: false });
    await page.getByTestId("presence-studio-v2-tab-chamber").click();
    await page.screenshot({ path: path.join(OUT, "hosted-room11-chamber-tab.png"), fullPage: false });
    await page.getByTestId("presence-studio-v2-tab-archive").click();
    await page.screenshot({ path: path.join(OUT, "hosted-room11-studio-archive-tab.png"), fullPage: false });

    const v2Root = await page.getByTestId("presence-studio-v2-root").count();
    const outline = await page.getByTestId("presence-studio-v2-outline").count();
    const inspector = await page.getByTestId("presence-studio-v2-inspector").count();
    const topChrome = await page.getByTestId("presence-studio-v2-top-chrome").count();
    const chamberTabs = await page.getByTestId("presence-studio-v2-chamber-tabs").count();
    const legacyShell = await page.getByTestId("studio-room-owner-editor-shell").count();
    assert(v2Root === 1, "V2 editor root missing.");
    assert(outline === 1, "S1 outline missing.");
    assert(inspector === 1, "S1 inspector missing.");
    assert(topChrome === 1, "S1 top chrome missing.");
    assert(chamberTabs === 1, "S1 chamber tabs missing.");
    assert(legacyShell === 0, "Legacy editor shell leaked into V2 room.");
    assert(errors.length === 0, `Owner editor console/page errors: ${errors.join(" | ")}`);
    record("OWNER_EDITOR_S1", {
      v2_root: v2Root,
      outline,
      inspector,
      top_chrome: topChrome,
      chamber_tabs: chamberTabs,
      legacy_shell: legacyShell,
      errors: "none",
    });

    await page.goto(`/studio/${ROOM_ID}/editor/preview`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(OUT, "hosted-room11-owner-preview.png"), fullPage: false });
    const previewHtml = await page.content();
    const previewViolations = scan(previewHtml, [...restrictedConfigTerms, ...restrictedEditorTerms]);
    assert(previewHtml.includes("presence-studio-v2-public"), "Owner preview did not render V2 public room.");
    assert(!previewHtml.includes("presence-studio-v2-root"), "Editor root leaked into owner preview.");
    assert(previewViolations.length === 0, `Owner preview payload violations: ${previewViolations.join(", ")}`);
    record("OWNER_PREVIEW", { v2_public: true, violations: previewViolations });
    await context.close();
  }

  {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 1365, height: 900 } });
    const page = await context.newPage();
    await signIn(page, LEGACY_ROOM_ID);
    await page.goto(`/studio/${LEGACY_ROOM_ID}/editor`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(OUT, "hosted-room1-legacy-negative.png"), fullPage: false });
    const v2Root = await page.getByTestId("presence-studio-v2-root").count();
    const bodyText = await page.locator("body").innerText();
    const legacyPresent = /canvas|inspector|presence studio/i.test(bodyText);
    assert(v2Root === 0, "Legacy room rendered V2 editor root.");
    record("LEGACY_NEGATIVE", { v2_root: v2Root, legacy_present: legacyPresent });
    await context.close();
  }

  {
    const context = await browser.newContext({ baseURL: BASE });
    const page = await context.newPage();
    const response = await page.goto(`/room/${ROOM_ID}/key`, { waitUntil: "networkidle" });
    const html = await page.content();
    const violations = scan(html, restrictedConfigTerms);
    assert((response?.status() ?? 200) < 500, "Room key route returned server error.");
    assert(violations.length === 0, `Room key payload violations: ${violations.join(", ")}`);
    record("ROOM_KEY", { status: response?.status() ?? 200, violations });
    await context.close();
  }
} finally {
  await browser.close();
}

console.log("\n=== HOSTED S1 SMOKE SUMMARY ===");
console.log(JSON.stringify(results, null, 2));
