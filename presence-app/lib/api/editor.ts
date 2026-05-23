import { ownerFetch } from "./client.ts";
import type {
  PresenceEditableConfig,
  PresenceEditorAssetsResponse,
  PresenceEditorAttachAssetInput,
  PresenceEditorAttachAssetResponse,
  PresenceEditorDraftResponse,
  PresenceEditorHistoryResponse,
  PresenceEditorOverview,
  PresenceEditorPreviewResponse,
  PresenceEditorPublishResponse,
} from "./types";

const BASE = "/api/presence/owner/rooms";

export type PresenceEditorConfigInput = Partial<
  Pick<
    PresenceEditableConfig,
    | "renderer_key"
    | "scene_config"
    | "style_dna"
    | "motion_config"
    | "asset_config"
    | "content_config"
    | "roomkey_config"
    | "enquiry_config"
    | "locked_fields"
  >
>;

export function getPresenceEditor(roomId: number, token: string) {
  return ownerFetch<PresenceEditorOverview>(`${BASE}/${roomId}/editor`, token);
}

export function getPresenceEditorDraft(roomId: number, token: string) {
  return ownerFetch<PresenceEditorDraftResponse>(`${BASE}/${roomId}/editor/draft`, token);
}

export function createPresenceEditorDraft(
  roomId: number,
  token: string,
  payload?: PresenceEditorConfigInput,
) {
  return ownerFetch<PresenceEditorDraftResponse>(`${BASE}/${roomId}/editor/draft`, token, {
    method: "POST",
    body: payload ? JSON.stringify(payload) : undefined,
  });
}

export function patchPresenceEditorDraft(
  roomId: number,
  token: string,
  payload: PresenceEditorConfigInput,
) {
  return ownerFetch<PresenceEditorDraftResponse>(`${BASE}/${roomId}/editor/draft`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function previewPresenceEditorDraft(roomId: number, token: string) {
  return ownerFetch<PresenceEditorPreviewResponse>(`${BASE}/${roomId}/editor/preview`, token, {
    method: "POST",
  });
}

export function publishPresenceEditorDraft(roomId: number, token: string) {
  return ownerFetch<PresenceEditorPublishResponse>(`${BASE}/${roomId}/editor/publish`, token, {
    method: "POST",
  });
}

export function rollbackPresenceEditor(
  roomId: number,
  token: string,
  payload: { version?: number; config_id?: number; id?: number },
) {
  return ownerFetch<PresenceEditorPublishResponse>(`${BASE}/${roomId}/editor/rollback`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getPresenceEditorHistory(roomId: number, token: string) {
  return ownerFetch<PresenceEditorHistoryResponse>(`${BASE}/${roomId}/editor/history`, token);
}

export function listPresenceEditorAssets(roomId: number, token: string) {
  return ownerFetch<PresenceEditorAssetsResponse>(`${BASE}/${roomId}/assets`, token);
}

export function attachPresenceEditorAsset(
  roomId: number,
  token: string,
  payload: PresenceEditorAttachAssetInput,
) {
  return ownerFetch<PresenceEditorAttachAssetResponse>(`${BASE}/${roomId}/assets/attach`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
