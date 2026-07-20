import { chromium } from "playwright";

const BASE_URL = "https://your-presence.vercel.app";
// Credentials must be supplied via environment variables.
// Example: PRESENCE_E2E_OWNER_EMAIL=owner@example.com PRESENCE_E2E_OWNER_PASSWORD=yourpassword node scripts/get-hosted-token.mjs
const EMAIL = process.env.PRESENCE_E2E_OWNER_EMAIL;
const PASSWORD = process.env.PRESENCE_E2E_OWNER_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error("Set PRESENCE_E2E_OWNER_EMAIL and PRESENCE_E2E_OWNER_PASSWORD environment variables.");
  process.exit(1);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();

  await page.goto(`/auth/sign-in?returnTo=${encodeURIComponent("/studio/11/editor")}`, {
    waitUntil: "domcontentloaded",
  });

  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /enter studio/i }).click();

  await page.waitForURL(/\/studio/, { timeout: 30_000 });

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

  if (!token) {
    const cookies = await context.cookies();
    const parts = cookies
      .filter((c) => /sb-[^-]+-auth-token\.\d+$/.test(c.name))
      .sort((a, b) => {
        const aNum = parseInt(a.name.split(".").pop() || "0");
        const bNum = parseInt(b.name.split(".").pop() || "0");
        return aNum - bNum;
      });
    if (parts.length > 0) {
      let combined = parts.map((p) => p.value).join("");
      if (combined.startsWith("base64-")) combined = combined.slice("base64-".length);
      try {
        const decoded = Buffer.from(combined, "base64").toString("utf-8");
        const parsed = JSON.parse(decoded);
        const tok = parsed?.access_token ?? parsed?.currentSession?.access_token ?? parsed?.session?.access_token;
        if (typeof tok === "string" && tok.length > 20) {
          console.log(tok);
          await browser.close();
          return;
        }
      } catch {}
    }
  }

  await browser.close();
  if (token) {
    console.log(token);
  } else {
    console.error("Failed to get token");
    process.exit(1);
  }
}

main();
