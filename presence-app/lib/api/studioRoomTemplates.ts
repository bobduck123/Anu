import { ownerFetch } from "./client";
import type { PersistedStudioRoomDraftPayload } from "../presence/studio-room/persistedDraft";
import type { TemplateKitDraftInstantiation } from "../presence/studio-room/templateDrafts";

export const TEMPLATE_KIT_START_ENDPOINT = "/api/presence/owner/studio-rooms/from-template-kit";

export interface TemplateKitStartRequest {
  kit_id: string;
  draft_payload: TemplateKitDraftInstantiation["saveablePayload"];
}

interface RawTemplateKitStartResponse {
  node_id: number;
  room_id: number;
  slug: string;
  template_kit_id: string;
  template_kit_name: string;
  support_state: "primary" | string;
  status: string;
  visibility: string;
  public_status?: string | null;
  published: null;
  published_at: null;
  base_published_version: number;
  draft: {
    id?: number;
    version?: number;
    status?: string;
    schema_version?: string;
  };
  contract: string;
  schema_version: string;
  chamber_count: number;
  object_count: number;
  mobile_variant_count: number;
  editor_path: string;
}

export interface CreatedTemplateKitStudioRoomDraft {
  nodeId: number;
  roomId: number;
  slug: string;
  templateKitId: string;
  templateKitName: string;
  supportState: string;
  status: string;
  visibility: string;
  publicStatus: string | null;
  published: null;
  publishedAt: null;
  basePublishedVersion: number;
  draft: RawTemplateKitStartResponse["draft"];
  contract: string;
  schemaVersion: string;
  chamberCount: number;
  objectCount: number;
  mobileVariantCount: number;
  editorPath: string;
}

interface RawStudioRoomDraftSaveResponse {
  room_id: number;
  slug: string;
  template_kit_id: string;
  status: string;
  visibility: string;
  public_status?: string | null;
  published: null;
  published_config_present: boolean;
  published_at: string | null;
  base_published_version: number;
  contract: string;
  draft: {
    id?: number;
    version?: number;
    status?: string;
    updated_at?: string | null;
  };
  studio_room_draft: BackendStudioRoomDraftPayload;
  chamber_count: number;
  object_count: number;
  mobile_variant_count: number;
}

interface BackendStudioRoomDraftPayload {
  contract: string;
  schema_version: string;
  template_kit_id: string;
  template_kit_name?: string;
  support_state?: string;
  base_published_version: number;
  published_state: null;
  room: PersistedStudioRoomDraftPayload["room"];
  required_fields: string[];
  optional_fields: string[];
  copy_scaffolds: PersistedStudioRoomDraftPayload["copyScaffolds"];
  cta_strategy: PersistedStudioRoomDraftPayload["ctaStrategy"];
  source_persistence_boundary?: string | null;
}

export interface SavedStudioRoomDraft {
  roomId: number;
  slug: string;
  templateKitId: string;
  status: string;
  visibility: string;
  publicStatus: string | null;
  published: null;
  publishedConfigPresent: boolean;
  publishedAt: string | null;
  basePublishedVersion: number;
  contract: string;
  draft: RawStudioRoomDraftSaveResponse["draft"];
  studioRoomDraft: PersistedStudioRoomDraftPayload;
  chamberCount: number;
  objectCount: number;
  mobileVariantCount: number;
}

export function buildTemplateKitStartRequest(input: {
  kitId: string;
  draftPayload: TemplateKitDraftInstantiation["saveablePayload"];
}): TemplateKitStartRequest {
  return {
    kit_id: input.kitId,
    draft_payload: input.draftPayload,
  };
}

export async function createStudioRoomFromTemplateKit(
  token: string,
  input: {
    kitId: string;
    draftPayload: TemplateKitDraftInstantiation["saveablePayload"];
  },
): Promise<CreatedTemplateKitStudioRoomDraft> {
  const raw = await ownerFetch<RawTemplateKitStartResponse>(TEMPLATE_KIT_START_ENDPOINT, token, {
    method: "POST",
    body: JSON.stringify(buildTemplateKitStartRequest(input)),
  });
  return {
    nodeId: raw.node_id,
    roomId: raw.room_id,
    slug: raw.slug,
    templateKitId: raw.template_kit_id,
    templateKitName: raw.template_kit_name,
    supportState: raw.support_state,
    status: raw.status,
    visibility: raw.visibility,
    publicStatus: raw.public_status ?? null,
    published: raw.published,
    publishedAt: raw.published_at,
    basePublishedVersion: raw.base_published_version,
    draft: raw.draft,
    contract: raw.contract,
    schemaVersion: raw.schema_version,
    chamberCount: raw.chamber_count,
    objectCount: raw.object_count,
    mobileVariantCount: raw.mobile_variant_count,
    editorPath: raw.editor_path,
  };
}

export function buildStudioRoomDraftSaveRequest(draft: PersistedStudioRoomDraftPayload): {
  studio_room_draft: BackendStudioRoomDraftPayload;
} {
  return {
    studio_room_draft: toBackendStudioRoomDraft(draft),
  };
}

export async function saveStudioRoomDraft(
  roomId: number,
  token: string,
  draft: PersistedStudioRoomDraftPayload,
): Promise<SavedStudioRoomDraft> {
  const raw = await ownerFetch<RawStudioRoomDraftSaveResponse>(
    `/api/presence/owner/studio-rooms/${roomId}/draft`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(buildStudioRoomDraftSaveRequest(draft)),
    },
  );
  return {
    roomId: raw.room_id,
    slug: raw.slug,
    templateKitId: raw.template_kit_id,
    status: raw.status,
    visibility: raw.visibility,
    publicStatus: raw.public_status ?? null,
    published: raw.published,
    publishedConfigPresent: raw.published_config_present,
    publishedAt: raw.published_at,
    basePublishedVersion: raw.base_published_version,
    contract: raw.contract,
    draft: raw.draft,
    studioRoomDraft: fromBackendStudioRoomDraft(raw.studio_room_draft),
    chamberCount: raw.chamber_count,
    objectCount: raw.object_count,
    mobileVariantCount: raw.mobile_variant_count,
  };
}

function toBackendStudioRoomDraft(draft: PersistedStudioRoomDraftPayload): BackendStudioRoomDraftPayload {
  return {
    contract: draft.contract,
    schema_version: draft.schemaVersion,
    template_kit_id: draft.templateKitId,
    template_kit_name: draft.templateKitName,
    support_state: draft.supportState,
    base_published_version: draft.basePublishedVersion,
    published_state: null,
    room: draft.room,
    required_fields: draft.requiredFields,
    optional_fields: draft.optionalFields,
    copy_scaffolds: draft.copyScaffolds,
    cta_strategy: draft.ctaStrategy,
  };
}

function fromBackendStudioRoomDraft(raw: BackendStudioRoomDraftPayload): PersistedStudioRoomDraftPayload {
  return {
    contract: raw.contract,
    schemaVersion: raw.schema_version as PersistedStudioRoomDraftPayload["schemaVersion"],
    templateKitId: raw.template_kit_id,
    templateKitName: raw.template_kit_name,
    supportState: raw.support_state,
    basePublishedVersion: raw.base_published_version,
    publishedState: null,
    room: raw.room,
    requiredFields: raw.required_fields,
    optionalFields: raw.optional_fields,
    copyScaffolds: raw.copy_scaffolds,
    ctaStrategy: raw.cta_strategy,
  };
}
