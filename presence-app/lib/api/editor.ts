import { ownerFetch, ownerMultipartFetch, ownerReadFetch } from "./client.ts";
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
  PresenceEditorUploadAssetResponse,
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
  return ownerReadFetch<PresenceEditorOverview>(`${BASE}/${roomId}/editor`, token, {}, {
    sessionPresent: true,
    retryAuthOnce: true,
  });
}

export function getPresenceEditorDraft(roomId: number, token: string) {
  return ownerReadFetch<PresenceEditorDraftResponse>(`${BASE}/${roomId}/editor/draft`, token, {}, {
    sessionPresent: true,
    retryAuthOnce: true,
  });
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
  return ownerReadFetch<PresenceEditorPreviewResponse>(
    `${BASE}/${roomId}/editor/preview`,
    token,
    { method: "POST" },
    { safeEnsurePost: true, sessionPresent: true, retryAuthOnce: true },
  );
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
  return ownerReadFetch<PresenceEditorHistoryResponse>(`${BASE}/${roomId}/editor/history`, token, {}, {
    sessionPresent: true,
    retryAuthOnce: true,
  });
}

export function listPresenceEditorAssets(roomId: number, token: string) {
  return ownerReadFetch<PresenceEditorAssetsResponse>(`${BASE}/${roomId}/assets`, token, {}, {
    sessionPresent: true,
    retryAuthOnce: true,
  });
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

export function uploadPresenceEditorAsset(
  roomId: number,
  token: string,
  input: { file: File; altText?: string; role?: string },
) {
  const form = new FormData();
  form.append("file", input.file);
  form.append("role", input.role ?? "unused");
  if (input.altText?.trim()) form.append("alt_text", input.altText.trim());
  return ownerMultipartFetch<PresenceEditorUploadAssetResponse>(`${BASE}/${roomId}/assets/upload`, token, form);
}
