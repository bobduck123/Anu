import { ownerFetch, ownerReadFetch } from "./client.ts";
import type { PresenceEditableConfig } from "./types.ts";

const OWNER_ROOM_BASE = "/api/presence/owner/rooms";

export const STUDIO_V3_PRIVATE_METADATA_SCHEMA_VERSION = "presence-studio-v3-private-v1" as const;

export interface StudioV3ServerBase {
  config_id: number;
  source_kind: "draft" | "published";
  status: "draft" | "published";
  version: number;
  revision: number;
  schema_version: string;
  fingerprint: string;
}

export interface StudioV3PrivateState {
  id: number;
  room_id: number;
  metadata_schema_version: typeof STUDIO_V3_PRIVATE_METADATA_SCHEMA_VERSION;
  metadata_revision: number;
  base: StudioV3ServerBase;
  metadata: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}

export interface StudioV3PrivateStateResponse {
  state: StudioV3PrivateState | null;
}

export interface ReplaceStudioV3PrivateStateInput {
  expected: StudioV3ServerBase & {
    room_id: number;
    metadata_revision: number;
  };
  metadata_schema_version: typeof STUDIO_V3_PRIVATE_METADATA_SCHEMA_VERSION;
  metadata: Record<string, unknown>;
}

export interface ReplaceStudioV3DraftInput {
  expected: {
    room_id: number;
    config_id: number;
    version: number;
    revision: number;
    schema_version: string;
    fingerprint: string;
  };
  config: {
    renderer_key: string | null;
    scene_config: Record<string, unknown>;
    style_dna: Record<string, unknown>;
    motion_config: Record<string, unknown>;
    asset_config: Record<string, unknown>;
    content_config: Record<string, unknown>;
    roomkey_config: Record<string, unknown>;
    enquiry_config: Record<string, unknown>;
    locked_fields: Record<string, unknown>;
  };
}

export interface ReplaceStudioV3DraftResponse {
  draft: PresenceEditableConfig;
  committed: {
    room_id: number;
    config_id: number;
    version: number;
    revision: number;
    status: "draft";
    schema_version: string;
    fingerprint: string;
  };
}

export function getStudioV3PrivateState(roomId: number, token: string) {
  return ownerReadFetch<StudioV3PrivateStateResponse>(
    `${OWNER_ROOM_BASE}/${roomId}/editor/v3/state`,
    token,
    {},
    { sessionPresent: true, retryAuthOnce: true },
  );
}

export function replaceStudioV3PrivateState(
  roomId: number,
  token: string,
  payload: ReplaceStudioV3PrivateStateInput,
) {
  return ownerFetch<StudioV3PrivateStateResponse>(
    `${OWNER_ROOM_BASE}/${roomId}/editor/v3/state`,
    token,
    { method: "PUT", body: JSON.stringify(payload) },
  );
}

/**
 * Typed transport seam for the reviewed atomic contract. P1 deliberately does
 * not expose this as a product action until a real existing draft is present
 * and the compiled nine-field payload can be verified against its base.
 */
export function replaceStudioV3Draft(
  roomId: number,
  token: string,
  payload: ReplaceStudioV3DraftInput,
) {
  return ownerFetch<ReplaceStudioV3DraftResponse>(
    `${OWNER_ROOM_BASE}/${roomId}/editor/v3/draft`,
    token,
    { method: "PUT", body: JSON.stringify(payload) },
  );
}
