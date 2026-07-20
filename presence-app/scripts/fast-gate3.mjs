import { chromium } from "playwright";
const BASE = "https://your-presence.vercel.app";
const API = "https://anu-back-end.vercel.app";
const EMAIL = process.env.PRESENCE_E2E_OWNER_EMAIL;
const PASSWORD = process.env.PRESENCE_E2E_OWNER_PASSWORD;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ baseURL: BASE });
const page = await context.newPage();

await page.goto("/auth/sign-in?returnTo=/studio/11/editor", { waitUntil: "domcontentloaded" });
await page.getByLabel("Email").fill(EMAIL);
await page.getByLabel("Password").fill(PASSWORD);
await page.getByRole("button", { name: /enter studio/i }).click();
await page.waitForURL((url) => !url.pathname.includes("/auth/"), { timeout: 30_000 });

// Get token
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

console.log("TOKEN_FOUND:", token ? "yes (" + token.slice(0, 20) + "...)" : "no");

// Fetch node with full response logging
const nodeRes = await fetch(`${API}/api/presence/owner/nodes/11`, {
  headers: { Authorization: `Bearer ${token}` },
});
console.log("NODE_API_STATUS:", nodeRes.status);
const nodeData = await nodeRes.json();
console.log("NODE_RESPONSE_KEYS:", Object.keys(nodeData));
const node = nodeData.data || {};
console.log("NODE_DATA_KEYS:", node ? Object.keys(node) : "null");
console.log("NODE_ID:", node.id);
console.log("NODE_SLUG:", node.slug);
console.log("NODE_RENDERER_KEY:", node.renderer_key);

// Check editor page HTML for env evidence
await page.goto("/studio/11/editor", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(6000);
const html = await page.content();

console.log("HTML_HAS_PRESENCE_STUDIO_V2:", html.includes("PRESENCE_STUDIO_V2"));
console.log("HTML_HAS_presence-studio-v2-root:", html.includes("presence-studio-v2-root"));
console.log("HTML_HAS_presence-studio-v2-room:", html.includes("presence-studio-v2-room"));
console.log("HTML_HAS_presence-studio-v2-toolbar:", html.includes("presence-studio-v2-toolbar"));

// Check if any script contains NEXT_PUBLIC env evidence
const scripts = await page.locator("script").allInnerTexts();
let hasEnv = false;
for (const s of scripts) {
  if (s.includes("PRESENCE_STUDIO_V2") || s.includes("presence-studio-v2")) {
    hasEnv = true;
    console.log("SCRIPT_HAS_V2:", s.slice(0, 200));
    break;
  }
}
console.log("ANY_SCRIPT_HAS_V2:", hasEnv);

await browser.close();
