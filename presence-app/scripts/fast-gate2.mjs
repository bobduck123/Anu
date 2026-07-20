import { chromium } from "playwright";
const BASE = "https://your-presence.vercel.app";
const API = "https://anu-back-end.vercel.app";
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

const token = await page.evaluate(() => {
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith("sb-")) continue;
    const value = window.localStorage.getItem(key);
    if (!value) continue;
    try {
      const parsed = JSON.parse(value);
      const tok = parsed?.access_token ?? parsed?.currentSession?.access_token ?? parsed?.session?.access_token;
      if (typeof tok === "string" && tok.length > 20) return tok;
    } catch {}
  }
  return null;
});

const nodeRes = await fetch(`${API}/api/presence/owner/nodes/11`, {
  headers: { Authorization: `Bearer ${token}` },
});
const nodeData = await nodeRes.json();
const node = nodeData.data || {};

console.log("=== NODE DATA ===");
console.log("id:", node.id);
console.log("slug:", node.slug);
console.log("renderer_key:", node.renderer_key);
console.log("editable_config.renderer_key:", node.editable_config?.renderer_key);
console.log("metadata.custom_renderer_key:", node.metadata?.custom_renderer_key);
console.log("metadata.custom_presence.renderer_key:", node.metadata?.custom_presence?.renderer_key);

await page.goto("/studio/11/editor", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(6000);

const v2Root = await page.locator('[data-testid="presence-studio-v2-root"]').count();
const v2Toolbar = await page.locator('[data-testid="presence-studio-v2-toolbar"]').count();
const v2Save = await page.locator('[data-testid="presence-studio-v2-save"]').count();
const legacyCanvas = await page.locator("text=CANVAS").count();

console.log("=== EDITOR ===");
console.log("V2_ROOT:", v2Root);
console.log("V2_TOOLBAR:", v2Toolbar);
console.log("V2_SAVE:", v2Save);
console.log("LEGACY_CANVAS:", legacyCanvas);

const html = await page.content();
console.log("HTML_HAS_PRESENCE_STUDIO_V2:", html.includes("PRESENCE_STUDIO_V2"));
console.log("HTML_HAS_presence-studio-v2-root:", html.includes("presence-studio-v2-root"));
console.log("HTML_HAS_presence-studio-v2-room:", html.includes("presence-studio-v2-room"));

console.log("ERRORS:", errors.length > 0 ? errors.join(" | ") : "none");

await browser.close();
