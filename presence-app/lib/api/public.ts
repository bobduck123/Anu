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

/**
 * Submit a public enquiry. The endpoint accepts anonymous submissions. When an
 * authenticated ANU user submits with a bearer token, the resulting enquiry can
 * link back to their local ANU User row via submitter_user_id.
 */
export function submitEnquiry(
  slug: string,
  payload: PresenceEnquiryInput,
  options: { token?: string | null } = {},
) {
  const headers: Record<string, string> = {};
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  return apiFetch<{
    id: number;
    status: string;
    delivery_status?: string;
    submitter_linked?: boolean;
    message?: string;
  }>(`/api/presence/public/${encodeURIComponent(slug)}/enquiries`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers,
  });
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

export interface PublicPresenceCard {
  id: number;
  slug: string;
  display_name: string;
  headline: string | null;
  bio_excerpt: string | null;
  node_type: string;
  display_mode: string;
  plan_type: string;
  room_type?: string | null;
  theme_preset?: string | null;
  profile_image_url: string | null;
  cover_image_url: string | null;
  hero_image_url?: string | null;
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
