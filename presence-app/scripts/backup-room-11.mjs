/**
 * Room 11 hosted backup script.
 * Signs in via Playwright, extracts owner token, fetches all room data.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = "https://your-presence.vercel.app";
const API_BASE = "https://anu-back-end.vercel.app";
const ROOM_ID = 11;
// Credentials must be supplied via environment variables.
// Example: PRESENCE_E2E_OWNER_EMAIL=owner@example.com PRESENCE_E2E_OWNER_PASSWORD=yourpassword node scripts/backup-room-11.mjs
const EMAIL = process.env.PRESENCE_E2E_OWNER_EMAIL;
const PASSWORD = process.env.PRESENCE_E2E_OWNER_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error("Set PRESENCE_E2E_OWNER_EMAIL and PRESENCE_E2E_OWNER_PASSWORD environment variables.");
  process.exit(1);
}

const BACKUP_DIR = path.resolve(
  "docs/program/evidence/studio-v2-hosted-room-11-backup"
);

function ts() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function signInAndGetToken() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();

  await page.goto(`/auth/sign-in?returnTo=${encodeURIComponent(`/studio/${ROOM_ID}/editor`)}`, {
    waitUntil: "domcontentloaded",
  });

  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /enter studio/i }).click();

  // Wait for redirect to studio
  await page.waitForURL(/\/studio/, { timeout: 30_000 });

  // Extract token from localStorage (Supabase pattern)
  const token = await page.evaluate(() => {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith("sb-")) continue;
      const value = window.localStorage.getItem(key);
      if (!value) continue;
      try {
        const parsed = JSON.parse(value);
        const tok =
          parsed?.access_token ??
          parsed?.currentSession?.access_token ??
          parsed?.session?.access_token;
        if (typeof tok === "string" && tok.length > 20) return tok;
      } catch {
        // ignore
      }
    }
    return null;
  });

  if (!token) {
    // Try cookies as fallback
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
          await browser.close();
          return tok;
        }
      } catch {
        // ignore
      }
    }
    await browser.close();
    throw new Error("Failed to extract access token after sign-in");
  }

  await browser.close();
  return token;
}

async function apiGet(token, url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${url} failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function fetchPublicPage(slug) {
  const res = await fetch(`${BASE_URL}/p/${slug}`);
  return res.text();
}

async function main() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const timestamp = ts();

  console.log("Signing in to hosted environment...");
  const token = await signInAndGetToken();
  console.log("Token acquired.");

  // 1. Owner node
  console.log("Fetching owner node...");
  const nodeData = await apiGet(token, `${API_BASE}/api/presence/owner/nodes/${ROOM_ID}`);
  fs.writeFileSync(
    path.join(BACKUP_DIR, `room-11-owner-node-${timestamp}.json`),
    JSON.stringify(nodeData, null, 2)
  );

  // 2. Editor overview
  console.log("Fetching editor overview...");
  const overviewData = await apiGet(token, `${API_BASE}/api/presence/owner/rooms/${ROOM_ID}/editor`);
  fs.writeFileSync(
    path.join(BACKUP_DIR, `room-11-editor-overview-${timestamp}.json`),
    JSON.stringify(overviewData, null, 2)
  );

  // 3. Editor draft
  console.log("Fetching editor draft...");
  try {
    const draftData = await apiGet(token, `${API_BASE}/api/presence/owner/rooms/${ROOM_ID}/editor/draft`);
    fs.writeFileSync(
      path.join(BACKUP_DIR, `room-11-editor-draft-${timestamp}.json`),
      JSON.stringify(draftData, null, 2)
    );
  } catch (e) {
    console.log("No draft found:", e.message);
    fs.writeFileSync(
      path.join(BACKUP_DIR, `room-11-editor-draft-${timestamp}.json`),
      JSON.stringify({ error: e.message }, null, 2)
    );
  }

  // 4. Editor history
  console.log("Fetching editor history...");
  try {
    const historyData = await apiGet(token, `${API_BASE}/api/presence/owner/rooms/${ROOM_ID}/editor/history`);
    fs.writeFileSync(
      path.join(BACKUP_DIR, `room-11-editor-history-${timestamp}.json`),
      JSON.stringify(historyData, null, 2)
    );
  } catch (e) {
    console.log("History fetch failed:", e.message);
  }

  // 5. Works
  console.log("Fetching works...");
  try {
    const worksData = await apiGet(token, `${API_BASE}/api/presence/owner/nodes/${ROOM_ID}/works`);
    fs.writeFileSync(
      path.join(BACKUP_DIR, `room-11-works-${timestamp}.json`),
      JSON.stringify(worksData, null, 2)
    );
  } catch (e) {
    console.log("Works fetch failed:", e.message);
  }

  // 6. Collections
  console.log("Fetching collections...");
  try {
    const collectionsData = await apiGet(token, `${API_BASE}/api/presence/owner/nodes/${ROOM_ID}/collections`);
    fs.writeFileSync(
      path.join(BACKUP_DIR, `room-11-collections-${timestamp}.json`),
      JSON.stringify(collectionsData, null, 2)
    );
  } catch (e) {
    console.log("Collections fetch failed:", e.message);
  }

  // 7. Services
  console.log("Fetching services...");
  try {
    const servicesData = await apiGet(token, `${API_BASE}/api/presence/owner/nodes/${ROOM_ID}/services`);
    fs.writeFileSync(
      path.join(BACKUP_DIR, `room-11-services-${timestamp}.json`),
      JSON.stringify(servicesData, null, 2)
    );
  } catch (e) {
    console.log("Services fetch failed:", e.message);
  }

  // 8. Public HTML snapshot
  const slug = nodeData?.data?.slug || "ggm-christina-goddard";
  console.log(`Fetching public page /p/${slug}...`);
  const publicHtml = await fetchPublicPage(slug);
  fs.writeFileSync(
    path.join(BACKUP_DIR, `room-11-public-html-${timestamp}.html`),
    publicHtml
  );

  // 9. Public node (anonymous)
  console.log("Fetching public node...");
  try {
    const publicNode = await fetch(`${BASE_URL}/api/presence/rooms/${ROOM_ID}`).then((r) => r.json());
    fs.writeFileSync(
      path.join(BACKUP_DIR, `room-11-public-node-${timestamp}.json`),
      JSON.stringify(publicNode, null, 2)
    );
  } catch (e) {
    console.log("Public node fetch failed:", e.message);
  }

  // 10. Manifest
  const manifest = {
    timestamp,
    roomId: ROOM_ID,
    slug,
    baseUrl: BASE_URL,
    apiBase: API_BASE,
    backupFiles: fs.readdirSync(BACKUP_DIR).filter((f) => f.includes(timestamp)),
    nodeRendererKey: nodeData?.data?.renderer_key,
    nodeDisplayName: nodeData?.data?.display_name,
    hasDraft: Boolean(overviewData?.data?.draft),
    hasPublished: Boolean(overviewData?.data?.published),
  };
  fs.writeFileSync(
    path.join(BACKUP_DIR, `room-11-backup-manifest-${timestamp}.json`),
    JSON.stringify(manifest, null, 2)
  );

  console.log("Backup complete. Files:");
  manifest.backupFiles.forEach((f) => console.log(`  ${f}`));
}

main().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});
