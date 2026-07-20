import { chromium } from "playwright";

const BASE = "https://your-presence.vercel.app";
const browser = await chromium.launch({ headless: true });

async function checkAnonymousEditor() {
  const context = await browser.newContext({ baseURL: BASE });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });

  await page.goto("/studio/11/editor", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const url = page.url();
  const bodyText = await page.locator("body").innerText();
  const hasSignIn = bodyText.toLowerCase().includes("sign in") || bodyText.toLowerCase().includes("enter studio");
  const redirectedToAuth = url.includes("/auth/");

  console.log("ANONYMOUS_EDITOR_URL:", url);
  console.log("ANONYMOUS_REDIRECTED_TO_AUTH:", redirectedToAuth);
  console.log("ANONYMOUS_HAS_SIGN_IN_TEXT:", hasSignIn);
  console.log("ANONYMOUS_ERRORS:", errors.length > 0 ? errors.join(" | ") : "none");

  await context.close();
  return redirectedToAuth || hasSignIn;
}

async function checkLegacyRoom() {
  // Try room 1 or 2 — assume at least one is non-V2 legacy
  const context = await browser.newContext({ baseURL: BASE });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });

  // We'll check the public page for a non-V2 room first
  // Try to find a room that isn't room 11
  const response = await page.goto("/p/ggm-christina-goddard", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  // Room 11 public should be V2
  const v2Public = await page.locator('[data-testid="presence-studio-v2-public"]').count();
  console.log("ROOM11_PUBLIC_V2:", v2Public);

  // Now try to find another room slug. Let's check if we can list rooms via API or guess.
  // For the editor check, we'll try room 1 which is likely legacy
  await page.goto("/studio/1/editor", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);

  const legacyCanvas = await page.locator("text=CANVAS").count();
  const legacyInspector = await page.locator("text=INSPECTOR").count();
  const url = page.url();

  console.log("ROOM1_EDITOR_URL:", url);
  console.log("ROOM1_LEGACY_CANVAS:", legacyCanvas);
  console.log("ROOM1_LEGACY_INSPECTOR:", legacyInspector);
  console.log("ROOM1_ERRORS:", errors.length > 0 ? errors.join(" | ") : "none");

  await context.close();
  return legacyCanvas > 0 || legacyInspector > 0;
}

const anonOk = await checkAnonymousEditor();
const legacyOk = await checkLegacyRoom();

console.log("\n=== STAGE 1 NEGATIVE CHECKS ===");
console.log("ANONYMOUS_BLOCKED:", anonOk);
console.log("LEGACY_ROOM_PRESERVED:", legacyOk);
console.log("STAGE_1_FULL_PASS:", anonOk && legacyOk);

await browser.close();
