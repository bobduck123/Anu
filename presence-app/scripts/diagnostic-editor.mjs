import { chromium } from "playwright";

const BASE_URL = "https://your-presence.vercel.app";
const EMAIL = process.env.PRESENCE_E2E_OWNER_EMAIL;
const PASSWORD = process.env.PRESENCE_E2E_OWNER_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error("Set PRESENCE_E2E_OWNER_EMAIL and PRESENCE_E2E_OWNER_PASSWORD");
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ baseURL: BASE_URL });
const page = await context.newPage();

const errors = [];
const networkLog = [];
page.on("pageerror", (err) => errors.push(`PAGEERROR: ${err.message}`));
page.on("console", (msg) => {
  const text = msg.text();
  if (msg.type() === "error") errors.push(`CONSOLE ERROR: ${text}`);
});
page.on("request", (req) => {
  if (req.url().includes("supabase") || req.url().includes("auth")) {
    networkLog.push(`REQ: ${req.method()} ${req.url().slice(0, 120)}`);
  }
});
page.on("response", (res) => {
  if (res.url().includes("supabase") || res.url().includes("auth")) {
    networkLog.push(`RES: ${res.status()} ${res.url().slice(0, 120)}`);
  }
});

// Sign in
await page.goto("/auth/sign-in?returnTo=/studio/11/editor", { waitUntil: "domcontentloaded" });
console.log("On sign-in page:", page.url());

await page.getByLabel("Email").fill(EMAIL);
await page.getByLabel("Password").fill(PASSWORD);

// Wait for button and click
const signInBtn = page.getByRole("button", { name: /enter studio/i });
await signInBtn.waitFor({ state: "visible" });
console.log("Clicking sign in...");
await signInBtn.click();

// Wait for actual navigation away from auth page
try {
  await page.waitForURL((url) => !url.pathname.includes("/auth/"), { timeout: 30_000 });
  console.log("Navigated away from auth. URL:", page.url());
} catch (e) {
  console.log("Did NOT navigate away from auth. URL:", page.url());
}

await page.waitForTimeout(3000);

// Now navigate to editor
await page.goto("/studio/11/editor", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(5000);
console.log("Editor URL:", page.url());

// Check for V2 root
const v2Root = await page.locator('[data-testid="presence-studio-v2-root"]').count();
const legacyShell = await page.locator('[data-testid="studio-room-owner-editor-shell"]').count();
const v2Toolbar = await page.locator('[data-testid="presence-studio-v2-toolbar"]').count();

console.log("V2 root count:", v2Root);
console.log("Legacy shell count:", legacyShell);
console.log("V2 toolbar count:", v2Toolbar);

console.log("\n--- PAGE TEXT ---");
const text = await page.locator("body").innerText();
console.log(text.slice(0, 1500));

console.log("\n--- NETWORK ---");
networkLog.forEach((n) => console.log(n));

console.log("\n--- ERRORS ---");
errors.forEach((e) => console.log(e));
if (errors.length === 0) console.log("(none)");

await browser.close();
