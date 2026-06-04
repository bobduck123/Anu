import { chromium } from "playwright";

const BASE = process.env.PRESENCE_E2E_BASE_URL || "https://your-presence.vercel.app";
const API_BASE = (process.env.PRESENCE_E2E_API_URL || "https://anu-back-end.vercel.app").replace(/\/+$/, "");
const ROOM_ID = Number(process.env.PRESENCE_STUDIO_V2_HOSTED_PILOT_ROOM_ID || "11");

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for hosted cleanup.`);
  return value;
}

function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function text(value) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
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

async function readAccessToken(page) {
  const fromStorage = await page.evaluate(() => {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !key.startsWith("sb-")) continue;
      const value = window.localStorage.getItem(key);
      if (!value) continue;
      try {
        const parsed = JSON.parse(value);
        const token = parsed?.access_token ?? parsed?.currentSession?.access_token ?? parsed?.session?.access_token;
        if (typeof token === "string" && token.length > 20) return token;
      } catch {
        // Ignore unrelated localStorage values.
      }
    }
    return null;
  });
  if (fromStorage) return fromStorage;

  const cookies = await page.context().cookies();
  const parts = cookies
    .filter((cookie) => /sb-[^-]+-auth-token\.\d+$/.test(cookie.name))
    .sort((a, b) => {
      const aNum = parseInt(a.name.split(".").pop() || "0", 10);
      const bNum = parseInt(b.name.split(".").pop() || "0", 10);
      return aNum - bNum;
    });

  if (parts.length === 0) return null;

  let combined = parts.map((part) => part.value).join("");
  if (combined.startsWith("base64-")) combined = combined.slice("base64-".length);

  try {
    const decoded = Buffer.from(combined, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);
    const token = parsed?.access_token ?? parsed?.currentSession?.access_token ?? parsed?.session?.access_token;
    if (typeof token === "string" && token.length > 20) return token;
  } catch {
    // Ignore malformed cookie values.
  }

  return null;
}

function configInputFromEditableConfig(config) {
  return {
    renderer_key: text(config.renderer_key),
    scene_config: record(config.scene_config),
    style_dna: record(config.style_dna),
    motion_config: record(config.motion_config),
    asset_config: record(config.asset_config),
    content_config: record(config.content_config),
    roomkey_config: record(config.roomkey_config),
    enquiry_config: record(config.enquiry_config),
    locked_fields: record(config.locked_fields),
  };
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ baseURL: BASE });
  const page = await context.newPage();
  await signIn(page);
  const token = await readAccessToken(page);
  if (!token) throw new Error("Could not read hosted owner access token.");

  const overviewResponse = await fetch(`${API_BASE}/api/presence/owner/rooms/${ROOM_ID}/editor`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!overviewResponse.ok) throw new Error(`Editor overview failed: ${overviewResponse.status}`);
  const overviewBody = await overviewResponse.json();
  const overview = overviewBody.data ?? overviewBody;
  const published = record(overview.published);
  if (Object.keys(published).length === 0) throw new Error("No published config available to restore draft from.");

  const draftText = JSON.stringify(overview.draft ?? {});
  const hadSmokeDraft =
    draftText.includes("Phase E V2 hosted smoke") ||
    draftText.includes("Hosted lifecycle visible proof") ||
    draftText.includes("Hidden public projection proof");

  if (hadSmokeDraft) {
    const patchResponse = await fetch(`${API_BASE}/api/presence/owner/rooms/${ROOM_ID}/editor/draft`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(configInputFromEditableConfig(published)),
    });
    if (!patchResponse.ok) throw new Error(`Draft restore failed: ${patchResponse.status}`);
  }

  console.log(JSON.stringify({
    roomId: ROOM_ID,
    hadSmokeDraft,
    action: hadSmokeDraft ? "draft restored from current published config" : "no smoke draft residue found",
  }, null, 2));
  await context.close();
} finally {
  await browser.close();
}
