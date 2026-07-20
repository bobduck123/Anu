/**
 * Room 11 V2 conversion script.
 * Reads backup, lifts legacy config to V2, creates draft, publishes, verifies.
 */
import fs from "fs";
import path from "path";

// Import local adapters (pure TS, no React)
import { studioV2FromPresenceConfig, presenceConfigFromStudioV2State } from "../lib/presence/studio-v2/adapters.ts";
import type { PresenceNode, PresenceEditableConfig } from "../lib/api/types.ts";

const API_BASE = "https://anu-back-end.vercel.app";
const ROOM_ID = 11;

const BACKUP_DIR = path.resolve("docs/program/evidence/studio-v2-hosted-room-11-backup");

async function apiCall(token: string, method: string, url: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`API ${method} ${url} failed: ${res.status} ${JSON.stringify(json)}`);
  }
  return json as Record<string, unknown>;
}

async function main() {
  const token = process.env.ROOM11_OWNER_TOKEN;
  if (!token) {
    console.error("Set ROOM11_OWNER_TOKEN environment variable with the owner bearer token.");
    process.exit(1);
  }

  // 1. Load backup data
  const nodeFile = fs.readdirSync(BACKUP_DIR).find((f) => f.startsWith("room-11-owner-node-"));
  const overviewFile = fs.readdirSync(BACKUP_DIR).find((f) => f.startsWith("room-11-editor-overview-"));
  if (!nodeFile || !overviewFile) {
    throw new Error("Backup files not found");
  }

  const nodeData = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, nodeFile), "utf8")) as { data: PresenceNode };
  const overviewData = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, overviewFile), "utf8")) as {
    data: { published: PresenceEditableConfig | null; draft: PresenceEditableConfig | null; room: PresenceNode };
  };

  const node = nodeData.data;
  const publishedConfig = overviewData.data.published;

  console.log("Current renderer_key:", publishedConfig?.renderer_key ?? "(none)");
  console.log("Node display_name:", node.display_name);

  if (!publishedConfig) {
    throw new Error("No published config found in backup");
  }

  // 2. Lift legacy config to V2 state
  console.log("Lifting legacy config to V2 state...");
  const v2State = studioV2FromPresenceConfig(publishedConfig, node);
  console.log("V2 title:", v2State.title);
  console.log("V2 worldId:", v2State.worldId);
  console.log("V2 chambers:", v2State.chambers.length);
  console.log("V2 objects:", v2State.chambers.reduce((sum, ch) => sum + ch.objects.length, 0));

  // 3. Convert V2 state back to config payload
  console.log("Converting V2 state to config payload...");
  const payload = presenceConfigFromStudioV2State(v2State, publishedConfig);
  console.log("Payload renderer_key:", payload.renderer_key);

  // 4. Save proposed payload for audit
  const payloadPath = path.join(BACKUP_DIR, `room-11-proposed-v2-payload-${Date.now()}.json`);
  fs.writeFileSync(payloadPath, JSON.stringify(payload, null, 2));
  console.log("Proposed payload saved to:", payloadPath);

  // 5. Create V2 draft
  console.log("Creating V2 draft via API...");
  const draftRes = await apiCall(token, "POST", `${API_BASE}/api/presence/owner/rooms/${ROOM_ID}/editor/draft`, payload);
  console.log("Draft created:", JSON.stringify(draftRes, null, 2).slice(0, 500));

  // 6. Publish
  console.log("Publishing...");
  const publishRes = await apiCall(token, "POST", `${API_BASE}/api/presence/owner/rooms/${ROOM_ID}/editor/publish`);
  console.log("Published:", JSON.stringify(publishRes, null, 2).slice(0, 500));

  // 7. Verify node now has V2 renderer_key
  console.log("Verifying node update...");
  const verifyNode = await apiCall(token, "GET", `${API_BASE}/api/presence/owner/nodes/${ROOM_ID}`);
  const verifyRendererKey = (verifyNode.data as Record<string, unknown>)?.renderer_key;
  console.log("Post-publish node.renderer_key:", verifyRendererKey);

  if (verifyRendererKey !== "presence-studio-v2-room") {
    console.log("Node renderer_key not updated by publish. Attempting direct node PATCH...");
    const patchRes = await apiCall(token, "PATCH", `${API_BASE}/api/presence/owner/nodes/${ROOM_ID}`, {
      renderer_key: "presence-studio-v2-room",
    });
    console.log("Node PATCH result:", JSON.stringify(patchRes, null, 2).slice(0, 500));

    const verifyAgain = await apiCall(token, "GET", `${API_BASE}/api/presence/owner/nodes/${ROOM_ID}`);
    const verifyAgainKey = (verifyAgain.data as Record<string, unknown>)?.renderer_key;
    console.log("Post-PATCH node.renderer_key:", verifyAgainKey);
  }

  // 8. Verify editor overview
  console.log("Verifying editor overview...");
  const verifyOverview = await apiCall(token, "GET", `${API_BASE}/api/presence/owner/rooms/${ROOM_ID}/editor`);
  const vo = verifyOverview.data as Record<string, unknown>;
  console.log("Overview published renderer_key:", (vo.published as Record<string, unknown>)?.renderer_key);
  console.log("Overview room.renderer_key:", (vo.room as Record<string, unknown>)?.renderer_key);

  console.log("Conversion complete.");
}

main().catch((err) => {
  console.error("Conversion failed:", err);
  process.exit(1);
});
