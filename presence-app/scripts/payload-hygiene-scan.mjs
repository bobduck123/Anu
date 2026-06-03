import { chromium } from "playwright";

const BASE = "https://your-presence.vercel.app";
const SLUG = "ggm-christina-goddard";
const ROOM_ID = 11;

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

const browser = await chromium.launch({ headless: true });

// 1. Public /p/ route
const ctx1 = await browser.newContext({ baseURL: BASE });
const p1 = await ctx1.newPage();
await p1.goto(`/p/${SLUG}`, { waitUntil: "domcontentloaded" });
await p1.waitForTimeout(3000);
const publicHtml = await p1.content();
const publicText = await p1.locator("body").innerText();
console.log("\n=== PUBLIC /p/ SCAN ===");
const pub1 = scan(publicHtml, [...restrictedConfigTerms, ...restrictedEditorTerms, ...restrictedPublicTerms], "HTML");
const pubText1 = scan(publicText, restrictedConfigTerms, "TEXT");
await ctx1.close();

// 2. Public /presence/ route
const ctx2 = await browser.newContext({ baseURL: BASE });
const p2 = await ctx2.newPage();
await p2.goto(`/presence/${SLUG}`, { waitUntil: "domcontentloaded" });
await p2.waitForTimeout(3000);
const presenceHtml = await p2.content();
console.log("\n=== PUBLIC /presence/ SCAN ===");
const pub2 = scan(presenceHtml, [...restrictedConfigTerms, ...restrictedEditorTerms, ...restrictedPublicTerms], "HTML");
await ctx2.close();

// 3. Room key route
const ctx3 = await browser.newContext({ baseURL: BASE });
const p3 = await ctx3.newPage();
await p3.goto(`/room/${ROOM_ID}/key`, { waitUntil: "domcontentloaded" });
await p3.waitForTimeout(3000);
const keyHtml = await p3.content();
console.log("\n=== ROOM KEY SCAN ===");
const keyScan = scan(keyHtml, restrictedConfigTerms, "HTML");
await ctx3.close();

// 4. Mobile viewport public
const ctx4 = await browser.newContext({ baseURL: BASE });
const p4 = await ctx4.newPage();
await p4.setViewportSize({ width: 390, height: 844 });
await p4.goto(`/p/${SLUG}`, { waitUntil: "domcontentloaded" });
await p4.waitForTimeout(3000);
const mobileHtml = await p4.content();
console.log("\n=== MOBILE PUBLIC SCAN ===");
const mobileScan = scan(mobileHtml, [...restrictedConfigTerms, ...restrictedPublicTerms], "HTML");
await ctx4.close();

const allViolations = [...pub1, ...pubText1, ...pub2, ...keyScan, ...mobileScan];
console.log("\n=== OVERALL HYGIENE VERDICT ===");
console.log("TOTAL_VIOLATIONS:", allViolations.length);
console.log("VIOLATIONS:", allViolations.length > 0 ? [...new Set(allViolations)].join(", ") : "NONE");
console.log("PASS:", allViolations.length === 0);

await browser.close();
