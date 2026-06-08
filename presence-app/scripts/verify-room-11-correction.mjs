/**
 * Room 11 correction verification script.
 * Runs payload hygiene, legacy check, Studio regression, and captures final screenshots.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.PRESENCE_E2E_BASE_URL || "https://your-presence.vercel.app";
const SLUG = "ggm-christina-goddard";
const ROOM_ID = 11;
const LEGACY_SLUG = "hesmaddw";
const EVIDENCE_DIR = path.resolve("docs/program/evidence/presence-room-11-content-media-correction");

const restrictedConfigTerms = [
  "style_dna", "scene_config", "motion_config", "asset_config",
  "content_config", "roomkey_config", "enquiry_config", "editable_config",
  "hiddenPublic", "hiddenMobile", "WILD TRANSFORM SUSPENDED",
  "localStorage", "TemplateKit",
];
const restrictedEditorTerms = [
  "presence-studio-v2-toolbar", "presence-studio-v2-panel",
  "/api/presence/owner", "auth-token", "service_role", "bearer ",
];
const restrictedPublicTerms = ["locked", "pinned", "/studio/", "owner_user_id", "draft_config"];

function scan(text, terms, label) {
  const lowered = text.toLowerCase();
  const found = [];
  for (const term of terms) {
    if (lowered.includes(term.toLowerCase())) found.push(term);
  }
  console.log(`${label}: ${found.length === 0 ? "CLEAN" : "VIOLATIONS: " + found.join(", ")}`);
  return found;
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function signIn(page) {
  await page.goto(`/auth/sign-in?returnTo=${encodeURIComponent(`/studio/${ROOM_ID}/editor`)}`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByLabel("Email").fill(required("PRESENCE_E2E_OWNER_EMAIL"));
  await page.getByLabel("Password").fill(required("PRESENCE_E2E_OWNER_PASSWORD"));
  await page.getByRole("button", { name: /enter studio/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/auth/"), { timeout: 30_000 });
}

async function main() {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const allViolations = [];

  const browser = await chromium.launch({ headless: true });
  try {
    // 1. Public /p/ route
    const ctx1 = await browser.newContext({ baseURL: BASE });
    const p1 = await ctx1.newPage();
    await p1.setViewportSize({ width: 1440, height: 950 });
    await p1.goto(`/p/${SLUG}`, { waitUntil: "networkidle" });
    await p1.waitForTimeout(3000);
    const publicHtml = await p1.content();
    const publicText = await p1.locator("body").innerText();

    console.log("\n=== PUBLIC /p/ SCAN ===");
    allViolations.push(...scan(publicHtml, [...restrictedConfigTerms, ...restrictedEditorTerms, ...restrictedPublicTerms], "HTML"));
    allViolations.push(...scan(publicText, restrictedConfigTerms, "TEXT"));

    // Verify bad asset gone
    if (publicHtml.includes("783471c01a894f9ebddd039f83d4ac68.png")) {
      throw new Error("Bad asset still in public HTML");
    }
    if (publicText.toLowerCase().includes("harmless v1b test") || publicText.toLowerCase().includes("hosted smoke image")) {
      throw new Error("Test text still in public output");
    }

    await p1.screenshot({ path: path.join(EVIDENCE_DIR, "01-public-desktop-threshold-after.png"), fullPage: false });

    // Scroll to chamber and screenshot
    await p1.locator(".v2-public-chamber").first().scrollIntoViewIfNeeded();
    await p1.screenshot({ path: path.join(EVIDENCE_DIR, "02-public-desktop-chamber-after.png"), fullPage: false });

    // Lightbox screenshot
    const firstArtwork = p1.locator(".v2-public-object.is-artwork").first();
    await firstArtwork.scrollIntoViewIfNeeded();
    await firstArtwork.hover();
    await firstArtwork.getByTestId("presence-public-artwork-focus-trigger").click();
    const focus = p1.getByTestId("presence-public-artwork-focus");
    await focus.waitFor({ state: "visible" });
    await focus.screenshot({ path: path.join(EVIDENCE_DIR, "03-public-lightbox-after.png") });
    await p1.keyboard.press("Escape");
    await focus.waitFor({ state: "hidden" });

    await ctx1.close();

    // 2. Public /presence/ route
    const ctx2 = await browser.newContext({ baseURL: BASE });
    const p2 = await ctx2.newPage();
    await p2.goto(`/presence/${SLUG}`, { waitUntil: "networkidle" });
    await p2.waitForTimeout(3000);
    const presenceHtml = await p2.content();
    console.log("\n=== PUBLIC /presence/ SCAN ===");
    allViolations.push(...scan(presenceHtml, [...restrictedConfigTerms, ...restrictedEditorTerms, ...restrictedPublicTerms], "HTML"));
    await ctx2.close();

    // 3. Room key route
    const ctx3 = await browser.newContext({ baseURL: BASE });
    const p3 = await ctx3.newPage();
    await p3.goto(`/room/${ROOM_ID}/key`, { waitUntil: "networkidle" });
    await p3.waitForTimeout(3000);
    const keyHtml = await p3.content();
    console.log("\n=== ROOM KEY SCAN ===");
    allViolations.push(...scan(keyHtml, restrictedConfigTerms, "HTML"));
    await ctx3.close();

    // 4. Mobile viewport public
    const ctx4 = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const p4 = await ctx4.newPage();
    await p4.goto(`/p/${SLUG}`, { waitUntil: "networkidle" });
    await p4.waitForTimeout(3000);
    const mobileHtml = await p4.content();
    console.log("\n=== MOBILE PUBLIC SCAN ===");
    allViolations.push(...scan(mobileHtml, [...restrictedConfigTerms, ...restrictedPublicTerms], "HTML"));
    await p4.screenshot({ path: path.join(EVIDENCE_DIR, "04-public-mobile-threshold-after.png"), fullPage: false });
    await p4.locator(".v2-public-chamber").first().scrollIntoViewIfNeeded();
    await p4.screenshot({ path: path.join(EVIDENCE_DIR, "05-public-mobile-chamber-after.png"), fullPage: false });
    await ctx4.close();

    // 5. Owner preview clean
    const ctx5 = await browser.newContext({ baseURL: BASE });
    const p5 = await ctx5.newPage();
    await signIn(p5);
    await p5.goto(`${BASE}/studio/${ROOM_ID}/editor/preview`, { waitUntil: "networkidle" });
    await p5.waitForTimeout(3000);
    await p5.screenshot({ path: path.join(EVIDENCE_DIR, "06-owner-preview-after.png"), fullPage: false });
    await ctx5.close();

    // 6. Studio regression
    const ctx6 = await browser.newContext({ baseURL: BASE });
    const p6 = await ctx6.newPage();
    await signIn(p6);
    await p6.goto(`${BASE}/studio/${ROOM_ID}/editor`, { waitUntil: "networkidle" });
    await p6.waitForTimeout(3000);
    const studioRoot = p6.getByTestId("presence-studio-v2-root");
    await studioRoot.waitFor({ state: "visible", timeout: 30_000 });
    await p6.screenshot({ path: path.join(EVIDENCE_DIR, "07-studio-editor-after.png"), fullPage: false });
    await ctx6.close();

    // 7. Legacy negative
    const ctx7 = await browser.newContext({ baseURL: BASE });
    const p7 = await ctx7.newPage();
    await p7.goto(`${BASE}/p/${LEGACY_SLUG}`, { waitUntil: "networkidle" });
    await p7.waitForTimeout(3000);
    const legacyV2Count = await p7.locator(".presence-studio-v2-public").count();
    const legacyTransitionCount = await p7.locator(".v2-public-threshold-transition").count();
    console.log("\n=== LEGATIVE NEGATIVE ===");
    console.log("V2 renderer count:", legacyV2Count);
    console.log("Transition count:", legacyTransitionCount);
    await p7.screenshot({ path: path.join(EVIDENCE_DIR, "08-legacy-negative-after.png"), fullPage: false });
    await ctx7.close();

    // Final summary
    console.log("\n=== OVERALL HYGIENE VERDICT ===");
    const uniqueViolations = [...new Set(allViolations)];
    console.log("TOTAL_VIOLATIONS:", uniqueViolations.length);
    console.log("VIOLATIONS:", uniqueViolations.length > 0 ? uniqueViolations.join(", ") : "NONE");
    console.log("PASS:", uniqueViolations.length === 0);

    if (legacyV2Count !== 0 || legacyTransitionCount !== 0) {
      throw new Error("Legacy room regression detected");
    }

    console.log("\nEvidence captured in:", EVIDENCE_DIR);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
