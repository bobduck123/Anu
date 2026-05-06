import { apiFetch } from "./client";
import type {
  PresenceNode,
  PresenceEnquiryInput,
  PublicPresenceWorkDetail,
  PublicPresenceCollectionDetail,
} from "./types";

export function fetchPublicNode(slug: string) {
  return apiFetch<PresenceNode>(`/api/presence/public/${encodeURIComponent(slug)}`);
}

export function fetchPublicWorkDetail(slug: string, workId: number | string) {
  return apiFetch<PublicPresenceWorkDetail>(
    `/api/presence/public/${encodeURIComponent(slug)}/works/${workId}`,
  );
}

export function fetchPublicCollectionDetail(slug: string, collectionId: number | string) {
  return apiFetch<PublicPresenceCollectionDetail>(
    `/api/presence/public/${encodeURIComponent(slug)}/collections/${collectionId}`,
  );
}

export function submitEnquiry(slug: string, payload: PresenceEnquiryInput) {
  return apiFetch<{ enquiry_id: number; connection_id?: number | null }>(
    `/api/presence/public/${encodeURIComponent(slug)}/enquiry`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export function trackView(slug: string, sourceType?: string, sourceCode?: string) {
  return apiFetch<void>(`/api/presence/public/${encodeURIComponent(slug)}/view`, {
    method: "POST",
    body: JSON.stringify({ source_type: sourceType, source_code: sourceCode }),
  }).catch(() => {});
}

export function trackLinkClick(slug: string, url: string, label: string) {
  return apiFetch<void>(`/api/presence/public/${encodeURIComponent(slug)}/link-click`, {
    method: "POST",
    body: JSON.stringify({ url, label }),
  }).catch(() => {});
}
