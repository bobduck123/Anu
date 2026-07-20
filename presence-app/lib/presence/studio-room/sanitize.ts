import type { Room } from "./model.ts";

const INTERNAL_KEYS = new Set([
  "editorOnly",
  "internal",
  "audit",
  "superUser",
  "_debug",
  "ownerUserId",
  "authSubject",
  "draftStorageKey",
  "signedPreviewUrl",
  "editable_config",
  "asset_config",
  "content_config",
  "style_dna",
  "motion_config",
  "draft_config",
  "owner_user_id",
  "auth_subject",
  "platform_admin",
  "internal_lifetime_free",
  "preview_token",
  "bearer",
  "service_role",
  "draft_storage_key",
  "published_storage_key",
  "signed_url",
  "preview_expires_at",
]);

export type PublicRoomPayload = Room;

export function stripEditorOnlyFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => stripEditorOnlyFields(entry)) as T;
  }
  if (!value || typeof value !== "object") return value;

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !INTERNAL_KEYS.has(key))
    .map(([key, entry]) => [key, stripEditorOnlyFields(entry)]);
  return Object.fromEntries(entries) as T;
}

export function toPublicRoomPayload(room: Room): PublicRoomPayload {
  return stripEditorOnlyFields(room);
}
