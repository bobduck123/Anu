import { apiFetch } from './client';

export interface DumbDumbPool {
  id: number;
  slug: string;
  name: string;
  category?: string | null;
  current_balance_cents?: number;
}

export interface DumbDumbOwner {
  id: number;
  username: string;
  pseudonym: string;
  role?: string;
  avatar_url?: string | null;
}

export interface DumbDumbItem {
  id: number;
  list_id: number;
  title: string;
  parody_description?: string;
  image_url?: string | null;
  source_url?: string | null;
  source_site_name?: string | null;
  icon_key?: string | null;
  price_cents: number;
  currency: string;
  actual_funds_label: string;
  impact_title: string;
  impact_description: string;
  quantity_limit?: number | null;
  quantity_sold: number;
  quantity_remaining?: number | null;
  is_active: boolean;
  is_sold_out: boolean;
  destination_pool: DumbDumbPool;
  created_at?: string | null;
  updated_at?: string | null;
  list?: {
    id: number;
    slug: string;
    title: string;
  };
}

export interface DumbDumbList {
  id: number;
  node_id: number;
  owner_user_id: number;
  title: string;
  slug: string;
  intro_text?: string;
  parody_disclaimer: string;
  is_public: boolean;
  is_active: boolean;
  owner?: DumbDumbOwner | null;
  item_count: number;
  items?: DumbDumbItem[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DumbDumbActivityEntry {
  id: number;
  buyer_name: string;
  parody_title: string;
  impact_title: string;
  amount_cents: number;
  pool_name?: string | null;
  created_at?: string | null;
  message: string;
}

export interface DumbDumbHubPayload {
  hero: {
    title: string;
    subtitle: string;
    disclaimer: string;
  };
  stats: {
    lists: number;
    items: number;
    total_raised_cents: number;
    recent_purchases: number;
  };
  featured_lists: DumbDumbList[];
  featured_items: DumbDumbItem[];
  activity_feed: DumbDumbActivityEntry[];
  transparency: {
    headline: string;
    body: string;
    points: string[];
  };
}

export interface DumbDumbPurchase {
  id: number;
  item_id: number;
  list_id: number;
  amount_cents: number;
  currency: string;
  payment_intent_id?: string | null;
  external_payment_id?: string | null;
  checkout_session_id?: string | null;
  status: string;
  destination_pool_id: number;
  receipt_snapshot_json?: Record<string, unknown>;
  buyer?: DumbDumbOwner | null;
  owner?: DumbDumbOwner | null;
  item?: DumbDumbItem | null;
  list?: {
    id: number;
    slug: string;
    title: string;
    parody_disclaimer: string;
  } | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DumbDumbCheckoutResult {
  purchase_id: number;
  checkout_url: string;
  mode: 'demo' | 'live';
  message?: string;
}

export interface DumbDumbSourcePreview {
  source_url: string;
  canonical_url?: string | null;
  source_site_name?: string | null;
  title: string;
  parody_description?: string | null;
  image_url?: string | null;
}

export interface DumbDumbAnalyticsInput {
  event_name:
    | 'dumb_dumb_frontpage_view'
    | 'dumb_dumb_list_view'
    | 'dumb_dumb_item_click'
    | 'dumb_dumb_checkout_started'
    | 'dumb_dumb_purchase_completed'
    | 'dumb_dumb_creator_item_created';
  entity_id?: string;
  entity_type?: string;
  props?: Record<string, unknown>;
}

export const dumbDumbApi = {
  hub: (demo = true) => apiFetch<DumbDumbHubPayload>(`/api/dumb-dumb/hub?demo=${demo ? '1' : '0'}`),
  listPublic: () => apiFetch<DumbDumbList[]>('/api/dumb-dumb/lists'),
  getList: (slug: string) => apiFetch<DumbDumbList>(`/api/dumb-dumb/lists/${encodeURIComponent(slug)}`),
  getItem: (slug: string, itemId: number | string) =>
    apiFetch<DumbDumbItem>(`/api/dumb-dumb/lists/${encodeURIComponent(slug)}/items/${itemId}`),
  getPurchase: (purchaseId: number | string) => apiFetch<DumbDumbPurchase>(`/api/dumb-dumb/purchases/${purchaseId}`),
  myLists: () => apiFetch<DumbDumbList[]>('/api/dumb-dumb/me/lists'),
  createList: (payload: Partial<DumbDumbList>) =>
    apiFetch<DumbDumbList>('/api/dumb-dumb/lists', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateList: (listId: number, payload: Partial<DumbDumbList>) =>
    apiFetch<DumbDumbList>(`/api/dumb-dumb/lists/${listId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  createItem: (listId: number, payload: Partial<DumbDumbItem> & { mutual_aid_pool_id: number }) =>
    apiFetch<DumbDumbItem>(`/api/dumb-dumb/lists/${listId}/items`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateItem: (itemId: number, payload: Partial<DumbDumbItem> & { mutual_aid_pool_id?: number }) =>
    apiFetch<DumbDumbItem>(`/api/dumb-dumb/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  sourcePreview: (source_url: string) =>
    apiFetch<DumbDumbSourcePreview>('/api/dumb-dumb/source-preview', {
      method: 'POST',
      body: JSON.stringify({ source_url }),
    }),
  checkout: (payload: { item_id: number; success_url?: string; cancel_url?: string; mode?: 'live' | 'demo' }) =>
    apiFetch<DumbDumbCheckoutResult>('/api/dumb-dumb/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  adminPurchases: (status?: string) =>
    apiFetch<DumbDumbPurchase[]>(`/api/dumb-dumb/admin/purchases${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  track: (payload: DumbDumbAnalyticsInput) =>
    apiFetch<{ captured: boolean }>('/api/dumb-dumb/analytics', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
