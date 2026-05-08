import { ownerFetch, ownerMultipartFetch } from "./client";
import type {
  PresenceNode,
  PresenceNodeInput,
  PresenceWork,
  PresenceCollection,
  PresenceMediaTarget,
  PresenceMediaUploadResult,
  PresenceService,
  PresenceNfcTag,
  PresenceEnquiry,
  PresenceAnalyticsSummary,
} from "./types";

const BASE = "/api/presence/owner";

// Nodes
export const listNodes = (t: string) =>
  ownerFetch<PresenceNode[]>(`${BASE}/nodes`, t);

export const getNode = (id: number, t: string) =>
  ownerFetch<PresenceNode>(`${BASE}/nodes/${id}`, t);

export const updateNode = (id: number, payload: PresenceNodeInput, t: string) =>
  ownerFetch<PresenceNode>(`${BASE}/nodes/${id}`, t, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const uploadNodeMedia = (
  nodeId: number,
  t: string,
  input: {
    targetType: PresenceMediaTarget;
    file: File;
    workId?: number;
    collectionId?: number;
  },
) => {
  const form = new FormData();
  form.append("target_type", input.targetType);
  form.append("file", input.file);
  if (input.workId) form.append("work_id", String(input.workId));
  if (input.collectionId) form.append("collection_id", String(input.collectionId));
  return ownerMultipartFetch<PresenceMediaUploadResult>(`${BASE}/nodes/${nodeId}/media`, t, form);
};

export const clearNodeMedia = (
  nodeId: number,
  t: string,
  targetType: PresenceMediaTarget,
  input: { workId?: number; collectionId?: number } = {},
) =>
  ownerFetch<PresenceMediaUploadResult>(`${BASE}/nodes/${nodeId}/media/clear`, t, {
    method: "POST",
    body: JSON.stringify({
      target_type: targetType,
      work_id: input.workId,
      collection_id: input.collectionId,
    }),
  });

export const publishNode = (id: number, t: string) =>
  ownerFetch<PresenceNode>(`${BASE}/nodes/${id}/publish`, t, { method: "POST" });

export const unpublishNode = (id: number, t: string) =>
  ownerFetch<PresenceNode>(`${BASE}/nodes/${id}/unpublish`, t, { method: "POST" });

// Works
export const listWorks = (nodeId: number, t: string) =>
  ownerFetch<PresenceWork[]>(`${BASE}/nodes/${nodeId}/works`, t);

export const createWork = (nodeId: number, payload: Partial<PresenceWork>, t: string) =>
  ownerFetch<PresenceWork>(`${BASE}/nodes/${nodeId}/works`, t, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateWork = (workId: number, payload: Partial<PresenceWork>, t: string) =>
  ownerFetch<PresenceWork>(`${BASE}/works/${workId}`, t, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const deleteWork = (workId: number, t: string) =>
  ownerFetch<{ deleted: boolean; id: number }>(`${BASE}/works/${workId}`, t, {
    method: "DELETE",
  });

// Collections
export const listCollections = (nodeId: number, t: string) =>
  ownerFetch<PresenceCollection[]>(`${BASE}/nodes/${nodeId}/collections`, t);

export const createCollection = (nodeId: number, payload: Partial<PresenceCollection>, t: string) =>
  ownerFetch<PresenceCollection>(`${BASE}/nodes/${nodeId}/collections`, t, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateCollection = (id: number, payload: Partial<PresenceCollection>, t: string) =>
  ownerFetch<PresenceCollection>(`${BASE}/collections/${id}`, t, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const deleteCollection = (id: number, t: string) =>
  ownerFetch<{ deleted: boolean; id: number }>(`${BASE}/collections/${id}`, t, {
    method: "DELETE",
  });

// Services
export const listServices = (nodeId: number, t: string) =>
  ownerFetch<PresenceService[]>(`${BASE}/nodes/${nodeId}/services`, t);

export const createService = (nodeId: number, payload: Partial<PresenceService>, t: string) =>
  ownerFetch<PresenceService>(`${BASE}/nodes/${nodeId}/services`, t, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateService = (id: number, payload: Partial<PresenceService>, t: string) =>
  ownerFetch<PresenceService>(`${BASE}/services/${id}`, t, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

// NFC Tags
export const listNfcTags = (nodeId: number, t: string) =>
  ownerFetch<PresenceNfcTag[]>(`${BASE}/nodes/${nodeId}/nfc-tags`, t);

export const createNfcTag = (nodeId: number, payload: Partial<PresenceNfcTag>, t: string) =>
  ownerFetch<PresenceNfcTag>(`${BASE}/nodes/${nodeId}/nfc-tags`, t, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateNfcTag = (id: number, payload: Partial<PresenceNfcTag>, t: string) =>
  ownerFetch<PresenceNfcTag>(`${BASE}/nfc-tags/${id}`, t, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

// Enquiries
export const listEnquiries = (nodeId: number, t: string) =>
  ownerFetch<PresenceEnquiry[]>(`${BASE}/nodes/${nodeId}/enquiries`, t);

export const updateEnquiry = (id: number, status: string, t: string) =>
  ownerFetch<PresenceEnquiry>(`${BASE}/enquiries/${id}`, t, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

// Analytics
export const getAnalytics = (nodeId: number, t: string) =>
  ownerFetch<PresenceAnalyticsSummary>(`${BASE}/nodes/${nodeId}/analytics`, t);
