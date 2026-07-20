import { chromium } from "playwright";

const BASE = "https://your-presence.vercel.app";
const SLUG = "ggm-christina-goddard";

const browser = await chromium.launch({ headless: true });

// Check public page for smoke markers
const ctx = await browser.newContext({ baseURL: BASE });
const page = await ctx.newPage();
await page.goto(`/p/${SLUG}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
const text = await page.locator("body").innerText();
const hasSmokeMarker = text.includes("Phase E V2 hosted smoke");
const hasVisibleProof = text.includes("Hosted lifecycle visible proof");
const hasHiddenProof = text.includes("Hidden public projection proof");
const hasMoodProof = text.includes("Hosted V2 influence persistence");

console.log("CLEANUP_STATUS:");
console.log("  smoke_marker_present:", hasSmokeMarker);
console.log("  visible_proof_present:", hasVisibleProof);
console.log("  hidden_proof_present:", hasHiddenProof);
console.log("  mood_proof_present:", hasMoodProof);
console.log("  CLEAN:", !hasSmokeMarker && !hasVisibleProof && !hasHiddenProof && !hasMoodProof);

// Check legacy room 1 still shows legacy
const ctx2 = await browser.newContext({ baseURL: BASE });
const page2 = await ctx2.newPage();
await page2.goto("/auth/sign-in?returnTo=/studio/1/editor", { waitUntil: "domcontentloaded" });
await page2.getByLabel("Email").fill(process.env.PRESENCE_E2E_OWNER_EMAIL);
await page2.getByLabel("Password").fill(process.env.PRESENCE_E2E_OWNER_PASSWORD);
await page2.getByRole("button", { name: /enter studio/i }).click();
await page2.waitForURL((url) => !url.pathname.includes("/auth/"), { timeout: 30000 });
await page2.goto("/studio/1/editor", { waitUntil: "domcontentloaded" });
await page2.waitForTimeout(5000);
const bodyText = await page2.locator("body").innerText();
const legacyPreserved = bodyText.includes("CANVAS") || bodyText.includes("INSPECTOR");
console.log("\nLEGACY_CHECK:");
console.log("  room_1_legacy_editor_present:", legacyPreserved);

await browser.close();
