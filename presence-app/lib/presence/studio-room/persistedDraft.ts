import type { PresenceEditableConfig } from "../../api/types";
import type { Room, StudioRoomTemplateKit } from "./model";

export const TEMPLATE_KIT_DRAFT_CONTRACT_VERSION = "presence-editable-config-compat-v1" as const;

export interface PersistedStudioRoomDraftPayload {
  contract: typeof TEMPLATE_KIT_DRAFT_CONTRACT_VERSION | string;
  schemaVersion: Room["schemaVersion"];
  templateKitId: string;
  templateKitName?: string;
  supportState?: string;
  basePublishedVersion: number;
  publishedState: null;
  room: Room;
  requiredFields: string[];
  optionalFields: string[];
  copyScaffolds: StudioRoomTemplateKit["copyScaffolds"];
  ctaStrategy: StudioRoomTemplateKit["ctaStrategy"];
}

export function extractPersistedStudioRoomDraft(
  config: PresenceEditableConfig | null | undefined,
): PersistedStudioRoomDraftPayload | null {
  const content = record(config?.content_config);
  const source = record(content?.studio_room_draft) ?? record(content?.studio_room);
  if (!source) return null;
  const room = record(source.room);
  if (!room) return null;
  const schemaVersion = stringValue(source.schema_version) ?? stringValue(room.schemaVersion);
  const templateKitId = stringValue(source.template_kit_id) ?? stringValue(room.templateKitId);
  if (!schemaVersion || !templateKitId) return null;
  return {
    contract: stringValue(source.contract) ?? TEMPLATE_KIT_DRAFT_CONTRACT_VERSION,
    schemaVersion: schemaVersion as Room["schemaVersion"],
    templateKitId,
    templateKitName: stringValue(source.template_kit_name) ?? undefined,
    supportState: stringValue(source.support_state) ?? undefined,
    basePublishedVersion: numberValue(source.base_published_version) ?? 0,
    publishedState: null,
    room: room as unknown as Room,
    requiredFields: stringArray(source.required_fields),
    optionalFields: stringArray(source.optional_fields),
    copyScaffolds: arrayValue(source.copy_scaffolds) as StudioRoomTemplateKit["copyScaffolds"],
    ctaStrategy: (record(source.cta_strategy) ?? {}) as unknown as StudioRoomTemplateKit["ctaStrategy"],
  };
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
