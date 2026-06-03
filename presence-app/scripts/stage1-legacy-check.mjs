import { chromium } from "playwright";

const BASE = "https://your-presence.vercel.app";
const EMAIL = process.env.PRESENCE_E2E_OWNER_EMAIL;
const PASSWORD = process.env.PRESENCE_E2E_OWNER_PASSWORD;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ baseURL: BASE });
const page = await context.newPage();
const errors = [];
page.on("pageerror", e => errors.push(e.message));
page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });

// Sign in
await page.goto("/auth/sign-in?returnTo=/studio/1/editor", { waitUntil: "domcontentloaded" });
await page.getByLabel("Email").fill(EMAIL);
await page.getByLabel("Password").fill(PASSWORD);
await page.getByRole("button", { name: /enter studio/i }).click();
await page.waitForURL((url) => !url.pathname.includes("/auth/"), { timeout: 30_000 });

// Check Room 1 editor (should be legacy)
await page.goto("/studio/1/editor", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(5000);

const url = page.url();
const bodyText = await page.locator("body").innerText();
const hasCanvas = bodyText.includes("CANVAS");
const hasInspector = bodyText.includes("INSPECTOR");
const hasPilot = bodyText.includes("Pilot");
const v2Root = await page.locator('[data-testid="presence-studio-v2-root"]').count();

console.log("ROOM1_EDITOR_URL:", url);
console.log("ROOM1_HAS_CANVAS_TEXT:", hasCanvas);
console.log("ROOM1_HAS_INSPECTOR_TEXT:", hasInspector);
console.log("ROOM1_HAS_PILOT_TEXT:", hasPilot);
console.log("ROOM1_V2_ROOT:", v2Root);
console.log("ROOM1_ERRORS:", errors.length > 0 ? errors.join(" | ") : "none");
console.log("LEGACY_PRESERVED:", (hasCanvas || hasInspector || hasPilot) && v2Root === 0);

await browser.close();
