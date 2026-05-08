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
    `/api/presence/public/${encodeURIComponent(slug)}/enquiries`,
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

// ── v1.1: Public list endpoint for /gallery ────────────────────────────────

export interface PublicPresenceCard {
  id: number;
  slug: string;
  display_name: string;
  headline: string | null;
  bio_excerpt: string | null;
  node_type: string;
  display_mode: string;
  plan_type: string;
  profile_image_url: string | null;
  cover_image_url: string | null;
  location_label: string | null;
  visual_mood: string | null;
  public_url: string;
  published_at: string | null;
}

export interface PublicPresenceList {
  items: PublicPresenceCard[];
  total: number;
  limit: number;
  offset: number;
}

export interface PublicListQuery {
  limit?: number;
  offset?: number;
  presence_type?: string;
  display_mode?: string;
  plan_type?: string;
  search?: string;
}

export function listPublicPresences(query: PublicListQuery = {}): Promise<PublicPresenceList> {
  const params = new URLSearchParams();
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.offset !== undefined) params.set("offset", String(query.offset));
  if (query.presence_type) params.set("presence_type", query.presence_type);
  if (query.display_mode) params.set("display_mode", query.display_mode);
  if (query.plan_type) params.set("plan_type", query.plan_type);
  if (query.search) params.set("search", query.search);
  const suffix = params.toString();
  return apiFetch<PublicPresenceList>(
    `/api/presence/public/nodes${suffix ? `?${suffix}` : ""}`,
  );
}
