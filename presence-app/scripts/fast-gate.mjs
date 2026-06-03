import { chromium } from "playwright";
const BASE = "https://your-presence.vercel.app";
const EMAIL = process.env.PRESENCE_E2E_OWNER_EMAIL;
const PASSWORD = process.env.PRESENCE_E2E_OWNER_PASSWORD;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ baseURL: BASE });
const page = await context.newPage();
const errors = [];
page.on("pageerror", e => errors.push(`PAGE: ${e.message}`));
page.on("console", msg => { if (msg.type() === "error") errors.push(`CONSOLE: ${msg.text()}`); });

await page.goto("/auth/sign-in?returnTo=/studio/11/editor", { waitUntil: "domcontentloaded" });
await page.getByLabel("Email").fill(EMAIL);
await page.getByLabel("Password").fill(PASSWORD);
await page.getByRole("button", { name: /enter studio/i }).click();
await page.waitForURL((url) => !url.pathname.includes("/auth/"), { timeout: 30_000 });

await page.goto("/studio/11/editor", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(6000);

const v2Root = await page.locator('[data-testid="presence-studio-v2-root"]').count();
const v2Toolbar = await page.locator('[data-testid="presence-studio-v2-toolbar"]').count();
const v2Save = await page.locator('[data-testid="presence-studio-v2-save"]').count();
const legacyCanvas = await page.locator("text=CANVAS").count();
const legacyInspector = await page.locator("text=INSPECTOR").count();

console.log("V2_ROOT:", v2Root);
console.log("V2_TOOLBAR:", v2Toolbar);
console.log("V2_SAVE:", v2Save);
console.log("LEGACY_CANVAS:", legacyCanvas);
console.log("LEGACY_INSPECTOR:", legacyInspector);
console.log("URL:", page.url());

const text = await page.locator("body").innerText();
const hasGuided = text.includes("Guided") || text.includes("Wild");
const hasMood = text.includes("Mood");
console.log("HAS_GUIDED_WILD:", hasGuided);
console.log("HAS_MOOD:", hasMood);

console.log("ERRORS:", errors.length > 0 ? errors.join(" | ") : "none");

await browser.close();
