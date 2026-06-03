/**
 * Room 11 rollback script.
 * Restores the original GGM published config from backup.
 */
import fs from "fs";
import path from "path";

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

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function configInputFromEditableConfig(config: Record<string, unknown>) {
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

async function main() {
  const token = process.env.ROOM11_OWNER_TOKEN;
  if (!token) {
    console.error("Set ROOM11_OWNER_TOKEN environment variable with the owner bearer token.");
    process.exit(1);
  }

  // Load original published config from backup
  const overviewFile = fs.readdirSync(BACKUP_DIR).find((f) => f.startsWith("room-11-editor-overview-"));
  if (!overviewFile) {
    throw new Error("Backup overview not found");
  }

  const overviewData = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, overviewFile), "utf8")) as {
    data: { published: Record<string, unknown> | null; draft: Record<string, unknown> | null };
  };

  const originalPublished = overviewData.data.published;
  const originalDraft = overviewData.data.draft;

  if (!originalPublished || Object.keys(originalPublished).length === 0) {
    console.log("No original published config found. Unpublishing room...");
    await apiCall(token, "POST", `${API_BASE}/api/presence/owner/nodes/${ROOM_ID}/unpublish`);
    console.log("Room unpublished.");
  } else {
    console.log("Restoring original published config...");
    const payload = configInputFromEditableConfig(originalPublished);

    // Upsert draft with original config
    const patch = await fetch(`${API_BASE}/api/presence/owner/rooms/${ROOM_ID}/editor/draft`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!patch.ok) {
      const create = await fetch(`${API_BASE}/api/presence/owner/rooms/${ROOM_ID}/editor/draft`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!create.ok) {
        throw new Error("Failed to restore draft config");
      }
    }

    // Publish original config
    await apiCall(token, "POST", `${API_BASE}/api/presence/owner/rooms/${ROOM_ID}/editor/publish`);
    console.log("Original published config restored.");
  }

  // Restore original draft if it existed
  if (originalDraft && Object.keys(originalDraft).length > 0) {
    console.log("Restoring original draft config...");
    const draftPayload = configInputFromEditableConfig(originalDraft);
    const patch = await fetch(`${API_BASE}/api/presence/owner/rooms/${ROOM_ID}/editor/draft`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(draftPayload),
    });
    if (!patch.ok) {
      await fetch(`${API_BASE}/api/presence/owner/rooms/${ROOM_ID}/editor/draft`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(draftPayload),
      });
    }
    console.log("Original draft config restored.");
  }

  // Restore metadata renderer key to GGM
  console.log("Restoring metadata renderer key to GGM...");
  await apiCall(token, "PATCH", `${API_BASE}/api/presence/owner/nodes/${ROOM_ID}`, {
    metadata: {
      custom_renderer_key: "ggm-faithful-room-v1",
      custom_presence: {
        renderer_key: "ggm-faithful-room-v1",
        custom_renderer_key: "ggm-faithful-room-v1",
      },
    },
  });

  // Verify
  const verifyNode = await apiCall(token, "GET", `${API_BASE}/api/presence/owner/nodes/${ROOM_ID}`);
  const verifyRendererKey = (verifyNode.data as Record<string, unknown>)?.renderer_key;
  const verifyMetadataKey = (verifyNode.data as Record<string, unknown>)?.metadata?.custom_renderer_key;
  console.log("Post-restore metadata.custom_renderer_key:", verifyMetadataKey);
  console.log("Post-restore published.renderer_key will be verified via overview...");

  const verifyOverview = await apiCall(token, "GET", `${API_BASE}/api/presence/owner/rooms/${ROOM_ID}/editor`);
  console.log("Post-restore overview.published.renderer_key:", (verifyOverview.data as Record<string, unknown>)?.published?.renderer_key);

  console.log("Rollback complete.");
}

main().catch((err) => {
  console.error("Rollback failed:", err);
  process.exit(1);
});
