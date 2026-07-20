/**
 * Room 11 hosted content/media correction script.
 * Replaces the blue smoke-test threshold image with the real willow artwork.
 * Assumes an owner draft already exists; patches it and publishes.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.PRESENCE_E2E_BASE_URL || "https://your-presence.vercel.app";
const API_BASE = (process.env.PRESENCE_E2E_API_URL || "https://anu-back-end.vercel.app").replace(/\/+$/, "");
const ROOM_ID = Number(process.env.PRESENCE_STUDIO_V2_HOSTED_PILOT_ROOM_ID || "11");
const EVIDENCE_DIR = path.resolve("docs/program/evidence/presence-room-11-content-media-correction");

const CORRECTION_LOG = path.join(EVIDENCE_DIR, `room-11-correction-log-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
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
    renderer_key: String(config.renderer_key || ""),
    scene_config: config.scene_config && typeof config.scene_config === "object" ? config.scene_config : {},
    style_dna: config.style_dna && typeof config.style_dna === "object" ? config.style_dna : {},
    motion_config: config.motion_config && typeof config.motion_config === "object" ? config.motion_config : {},
    asset_config: config.asset_config && typeof config.asset_config === "object" ? config.asset_config : {},
    content_config: config.content_config && typeof config.content_config === "object" ? config.content_config : {},
    roomkey_config: config.roomkey_config && typeof config.roomkey_config === "object" ? config.roomkey_config : {},
    enquiry_config: config.enquiry_config && typeof config.enquiry_config === "object" ? config.enquiry_config : {},
    locked_fields: config.locked_fields && typeof config.locked_fields === "object" ? config.locked_fields : {},
  };
}

async function apiGet(token, url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GET ${url} failed: ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function apiPatch(token, url, body) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PATCH ${url} failed: ${res.status} ${text.slice(0, 500)}`);
  }
  return res.json();
}

async function apiPost(token, url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST ${url} failed: ${res.status} ${text.slice(0, 500)}`);
  }
  return res.json();
}

async function main() {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const log = {
    startedAt: new Date().toISOString(),
    steps: [],
  };

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ baseURL: BASE });
    const page = await context.newPage();

    log.steps.push({ step: "sign-in", status: "started" });
    await signIn(page);
    const token = await readAccessToken(page);
    if (!token) throw new Error("Could not read hosted owner access token.");
    log.steps.push({ step: "sign-in", status: "ok" });

    // Fetch current editor overview
    log.steps.push({ step: "fetch-overview", status: "started" });
    const overviewRes = await apiGet(token, `${API_BASE}/api/presence/owner/rooms/${ROOM_ID}/editor`);
    const overview = overviewRes.data ?? overviewRes;
    log.steps.push({ step: "fetch-overview", status: "ok", draftVersion: overview.draft?.version, publishedVersion: overview.published?.version });

    // Identify the bad asset
    const draft = overview.draft;
    const v2 = draft?.content_config?.studio_v2;
    if (!v2 || !Array.isArray(v2.objects)) {
      throw new Error("No V2 objects found in draft.");
    }

    const badObjectIndex = v2.objects.findIndex((obj) =>
      obj?.image?.src?.includes("783471c01a894f9ebddd039f83d4ac68.png")
    );

    if (badObjectIndex === -1) {
      throw new Error("Bad asset (783471c01a894f9ebddd039f83d4ac68.png) not found in draft.");
    }

    const badObject = v2.objects[badObjectIndex];
    const identified = {
      index: badObjectIndex,
      id: badObject.id,
      type: badObject.type,
      role: badObject.role,
      title: badObject.title,
      oldSrc: badObject.image.src,
      oldAlt: badObject.image.alt,
    };
    log.steps.push({ step: "identify-bad-asset", status: "ok", identified });

    // Find a suitable replacement image already in the room
    const replacementCandidate = v2.objects.find((obj) =>
      obj?.image?.src?.includes("willow-of-port-arthur-2019.webp")
    );

    if (!replacementCandidate) {
      throw new Error("No suitable replacement image found in draft.");
    }

    const newSrc = replacementCandidate.image.src;
    const newAlt = replacementCandidate.image.alt || badObject.image.alt;

    // Apply correction
    const corrected = JSON.parse(JSON.stringify(draft));
    corrected.content_config.studio_v2.objects[badObjectIndex].image.src = newSrc;
    corrected.content_config.studio_v2.objects[badObjectIndex].image.alt = newAlt;

    log.steps.push({
      step: "apply-correction",
      status: "ok",
      newSrc,
      newAlt,
      objectTitle: corrected.content_config.studio_v2.objects[badObjectIndex].title,
    });

    // Save corrected draft
    log.steps.push({ step: "patch-draft", status: "started" });
    const patchBody = configInputFromEditableConfig(corrected);
    const patchRes = await apiPatch(token, `${API_BASE}/api/presence/owner/rooms/${ROOM_ID}/editor/draft`, patchBody);
    log.steps.push({ step: "patch-draft", status: "ok", response: patchRes });

    // Reload editor overview to verify draft persisted
    log.steps.push({ step: "verify-draft-reload", status: "started" });
    const overviewAfter = await apiGet(token, `${API_BASE}/api/presence/owner/rooms/${ROOM_ID}/editor`);
    const draftAfter = overviewAfter.data?.draft ?? overviewAfter.draft;
    const objAfter = draftAfter?.content_config?.studio_v2?.objects[badObjectIndex];
    if (!objAfter || objAfter.image.src !== newSrc) {
      throw new Error("Draft reload did not show corrected image.");
    }
    log.steps.push({ step: "verify-draft-reload", status: "ok", correctedSrc: objAfter.image.src });

    // Open owner preview and screenshot
    log.steps.push({ step: "owner-preview", status: "started" });
    await page.goto(`${BASE}/studio/${ROOM_ID}/editor/preview`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);
    const previewPath = path.join(EVIDENCE_DIR, "owner-preview-after-correction.png");
    await page.screenshot({ path: previewPath, fullPage: false });
    log.steps.push({ step: "owner-preview", status: "ok", screenshot: previewPath });

    // Publish
    log.steps.push({ step: "publish", status: "started" });
    const publishRes = await apiPost(token, `${API_BASE}/api/presence/owner/rooms/${ROOM_ID}/editor/publish`);
    log.steps.push({ step: "publish", status: "ok", response: publishRes });

    // Verify public page
    log.steps.push({ step: "verify-public", status: "started" });
    await page.goto(`${BASE}/p/ggm-christina-goddard`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);
    const publicHtml = await page.content();
    const publicText = await page.locator("body").innerText();

    if (publicHtml.includes("783471c01a894f9ebddd039f83d4ac68.png")) {
      throw new Error("Bad asset still visible in public HTML after publish.");
    }
    if (publicText.toLowerCase().includes("harmless v1b test") || publicText.toLowerCase().includes("hosted smoke image")) {
      throw new Error("Test asset text still visible in public output.");
    }

    const publicPath = path.join(EVIDENCE_DIR, "public-desktop-after-correction.png");
    await page.screenshot({ path: publicPath, fullPage: false });
    log.steps.push({ step: "verify-public", status: "ok", screenshot: publicPath });

    log.completedAt = new Date().toISOString();
    fs.writeFileSync(CORRECTION_LOG, JSON.stringify(log, null, 2));
    console.log("Correction complete.");
    console.log("Log:", CORRECTION_LOG);
  } catch (err) {
    log.error = err.message;
    log.completedAt = new Date().toISOString();
    fs.writeFileSync(CORRECTION_LOG, JSON.stringify(log, null, 2));
    console.error("Correction failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
