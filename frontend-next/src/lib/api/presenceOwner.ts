import { ownerFetchJson, unwrapData } from '@/lib/api/ownerClient';
import {
  PresenceNode,
  PresenceNodeInput,
  PresenceWork,
  PresenceCollection,
  PresenceService,
  PresenceNfcTag,
  PresenceEnquiry,
  PresenceAnalyticsSummary,
} from '@/lib/api/presence';

/**
 * Owner Studio API: Supabase JWT authenticated routes for node owners.
 * All routes are scoped to owned nodes (owner_user_id == user.id or platform_admin override).
 */

// Node CRUD

export function listOwnerNodes() {
  return ownerFetchJson<PresenceNode[] | { data: PresenceNode[] }>('nodes').then((payload) =>
    unwrapData<PresenceNode[]>(payload),
  );
}

export function getOwnerNode(nodeId: number) {
  return ownerFetchJson<PresenceNode | { data: PresenceNode }>(`nodes/${nodeId}`).then((payload) =>
    unwrapData<PresenceNode>(payload),
  );
}

export function updateOwnerNode(nodeId: number, payload: PresenceNodeInput) {
  return ownerFetchJson<PresenceNode | { data: PresenceNode }>(`nodes/${nodeId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((responsePayload) => unwrapData<PresenceNode>(responsePayload));
}

export function publishOwnerNode(nodeId: number) {
  return ownerFetchJson<PresenceNode | { data: PresenceNode }>(`nodes/${nodeId}/publish`, {
    method: 'POST',
  }).then((responsePayload) => unwrapData<PresenceNode>(responsePayload));
}

export function unpublishOwnerNode(nodeId: number) {
  return ownerFetchJson<PresenceNode | { data: PresenceNode }>(`nodes/${nodeId}/unpublish`, {
    method: 'POST',
  }).then((responsePayload) => unwrapData<PresenceNode>(responsePayload));
}

export function suspendOwnerNode(nodeId: number) {
  return ownerFetchJson<PresenceNode | { data: PresenceNode }>(`nodes/${nodeId}/suspend`, {
    method: 'POST',
  }).then((responsePayload) => unwrapData<PresenceNode>(responsePayload));
}

// Works

export function listOwnerWorks(nodeId: number) {
  return ownerFetchJson<PresenceWork[] | { data: PresenceWork[] }>(`nodes/${nodeId}/works`).then((payload) =>
    unwrapData<PresenceWork[]>(payload),
  );
}

export function createOwnerWork(nodeId: number, payload: Partial<PresenceWork>) {
  return ownerFetchJson<PresenceWork | { data: PresenceWork }>(`nodes/${nodeId}/works`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((responsePayload) => unwrapData<PresenceWork>(responsePayload));
}

export function updateOwnerWork(workId: number, payload: Partial<PresenceWork>) {
  return ownerFetchJson<PresenceWork | { data: PresenceWork }>(`works/${workId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((responsePayload) => unwrapData<PresenceWork>(responsePayload));
}

export function deleteOwnerWork(workId: number) {
  return ownerFetchJson<{ deleted: boolean; id: number } | { data: { deleted: boolean; id: number } }>(
    `works/${workId}`,
    {
      method: 'DELETE',
    },
  ).then((responsePayload) => unwrapData<{ deleted: boolean; id: number }>(responsePayload));
}

// Collections

export function listOwnerCollections(nodeId: number) {
  return ownerFetchJson<PresenceCollection[] | { data: PresenceCollection[] }>(`nodes/${nodeId}/collections`).then(
    (payload) => unwrapData<PresenceCollection[]>(payload),
  );
}

export function createOwnerCollection(nodeId: number, payload: Partial<PresenceCollection>) {
  return ownerFetchJson<PresenceCollection | { data: PresenceCollection }>(`nodes/${nodeId}/collections`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((responsePayload) => unwrapData<PresenceCollection>(responsePayload));
}

export function updateOwnerCollection(collectionId: number, payload: Partial<PresenceCollection>) {
  return ownerFetchJson<PresenceCollection | { data: PresenceCollection }>(`collections/${collectionId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((responsePayload) => unwrapData<PresenceCollection>(responsePayload));
}

export function deleteOwnerCollection(collectionId: number) {
  return ownerFetchJson<{ deleted: boolean; id: number } | { data: { deleted: boolean; id: number } }>(
    `collections/${collectionId}`,
    {
      method: 'DELETE',
    },
  ).then((responsePayload) => unwrapData<{ deleted: boolean; id: number }>(responsePayload));
}

// Services

export function listOwnerServices(nodeId: number) {
  return ownerFetchJson<PresenceService[] | { data: PresenceService[] }>(`nodes/${nodeId}/services`).then((payload) =>
    unwrapData<PresenceService[]>(payload),
  );
}

export function createOwnerService(nodeId: number, payload: Partial<PresenceService>) {
  return ownerFetchJson<PresenceService | { data: PresenceService }>(`nodes/${nodeId}/services`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((responsePayload) => unwrapData<PresenceService>(responsePayload));
}

export function updateOwnerService(serviceId: number, payload: Partial<PresenceService>) {
  return ownerFetchJson<PresenceService | { data: PresenceService }>(`services/${serviceId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((responsePayload) => unwrapData<PresenceService>(responsePayload));
}

export function deleteOwnerService(serviceId: number) {
  return ownerFetchJson<{ deleted: boolean; id: number } | { data: { deleted: boolean; id: number } }>(
    `services/${serviceId}`,
    {
      method: 'DELETE',
    },
  ).then((responsePayload) => unwrapData<{ deleted: boolean; id: number }>(responsePayload));
}

// NFC Tags

export function listOwnerNfcTags(nodeId: number) {
  return ownerFetchJson<PresenceNfcTag[] | { data: PresenceNfcTag[] }>(`nodes/${nodeId}/nfc-tags`).then((payload) =>
    unwrapData<PresenceNfcTag[]>(payload),
  );
}

export function createOwnerNfcTag(nodeId: number, payload: Partial<PresenceNfcTag>) {
  return ownerFetchJson<PresenceNfcTag | { data: PresenceNfcTag }>(`nodes/${nodeId}/nfc-tags`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((responsePayload) => unwrapData<PresenceNfcTag>(responsePayload));
}

export function updateOwnerNfcTag(tagId: number, payload: Partial<PresenceNfcTag>) {
  return ownerFetchJson<PresenceNfcTag | { data: PresenceNfcTag }>(`nfc-tags/${tagId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((responsePayload) => unwrapData<PresenceNfcTag>(responsePayload));
}

export function deleteOwnerNfcTag(tagId: number) {
  return ownerFetchJson<{ deleted: boolean; id: number } | { data: { deleted: boolean; id: number } }>(
    `nfc-tags/${tagId}`,
    {
      method: 'DELETE',
    },
  ).then((responsePayload) => unwrapData<{ deleted: boolean; id: number }>(responsePayload));
}

// Enquiries

export function listOwnerEnquiries(nodeId: number, params: Record<string, string> = {}) {
  const query = new URLSearchParams(params);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return ownerFetchJson<PresenceEnquiry[] | { data: PresenceEnquiry[] }>(`nodes/${nodeId}/enquiries${suffix}`).then(
    (payload) => unwrapData<PresenceEnquiry[]>(payload),
  );
}

export function updateOwnerEnquiry(enquiryId: number, status: string) {
  return ownerFetchJson<PresenceEnquiry | { data: PresenceEnquiry }>(`enquiries/${enquiryId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }).then((responsePayload) => unwrapData<PresenceEnquiry>(responsePayload));
}

// Analytics

export function getOwnerAnalytics(nodeId: number) {
  return ownerFetchJson<PresenceAnalyticsSummary | { data: PresenceAnalyticsSummary }>(`nodes/${nodeId}/analytics`).then(
    (payload) => unwrapData<PresenceAnalyticsSummary>(payload),
  );
}
