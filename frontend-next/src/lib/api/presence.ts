import { getCoreApiBase } from '@/lib/runtime';
import { apiFetch } from '@/lib/api/client';
import { controlFetchJson } from '@/lib/api/controlClient';

export interface PresenceTemplate {
  id: number;
  name: string;
  description?: string | null;
  node_type: string;
  display_mode?: string;
  preview_image_url?: string | null;
  theme_schema?: Record<string, unknown>;
  layout_schema?: Record<string, unknown>;
  section_schema?: Record<string, unknown>;
  supports_landing_portal?: boolean;
  supports_collections?: boolean;
  supports_business_functions?: boolean;
  supports_tradie_functions?: boolean;
  supports_professional_contract?: boolean;
  is_active: boolean;
  is_premium: boolean;
}

export interface PresenceLink {
  id?: number;
  label: string;
  url: string;
  link_type?: string;
  icon?: string | null;
  sort_order?: number;
  is_visible?: boolean;
}

export interface PresenceService {
  id?: number;
  title: string;
  description?: string | null;
  problem_solved?: string | null;
  who_it_is_for?: string | null;
  format?: string | null;
  deliverables?: string | null;
  price_label?: string | null;
  duration_label?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  enquiry_type?: string | null;
  sort_order?: number;
  is_visible?: boolean;
}

export interface PresenceProofItem {
  id?: number;
  title: string;
  client_label?: string | null;
  industry?: string | null;
  challenge?: string | null;
  approach?: string | null;
  outcome?: string | null;
  metrics?: Record<string, unknown>;
  testimonial?: string | null;
  media_urls?: string[];
  is_public?: boolean;
  sort_order?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PresenceCredential {
  id?: number;
  title: string;
  issuer?: string | null;
  credential_type?: string;
  issued_at?: string | null;
  expires_at?: string | null;
  verification_url?: string | null;
  is_public?: boolean;
}

export interface PresenceProcurementProfile {
  id?: number;
  node_id?: number;
  business_name?: string | null;
  abn_acn_or_registration?: string | null;
  regions_served?: string[];
  contract_types?: string[];
  rate_label?: string | null;
  insurance_status?: string | null;
  nda_ready?: boolean;
  procurement_contact_email?: string | null;
  compliance_notes?: string | null;
  payment_terms_label?: string | null;
}

export interface PresenceNfcTag {
  id?: number;
  node_id?: number;
  tag_uid?: string | null;
  label: string;
  tag_type?: string;
  destination_url?: string | null;
  source_code: string;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PresenceInteraction {
  id: number;
  node_id: number;
  connection_id?: number | null;
  interaction_type: string;
  source_type?: string | null;
  source_tag_id?: number | null;
  metadata?: Record<string, unknown>;
  occurred_at?: string | null;
}

export interface PresenceConnection {
  id: number;
  node_id: number;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  organisation?: string | null;
  source_type: string;
  source_tag_id?: number | null;
  status: string;
  consent_status: string;
  notes?: string | null;
  last_interaction_at?: string | null;
  interactions?: PresenceInteraction[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PresenceQuote {
  id: number;
  node_id: number;
  connection_id?: number | null;
  title: string;
  status: string;
  description?: string | null;
  total_amount?: number | null;
  currency?: string;
  terms?: string | null;
  expires_at?: string | null;
  approved_at?: string | null;
  line_items?: Array<{
    id?: number;
    quote_id?: number;
    label: string;
    description?: string | null;
    quantity?: number | null;
    unit_price?: number | null;
    total_price?: number | null;
    sort_order?: number;
  }>;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PresenceVariation {
  id: number;
  quote_id?: number | null;
  node_id: number;
  connection_id?: number | null;
  title: string;
  reason?: string | null;
  description?: string | null;
  price_delta?: number | null;
  time_delta?: string | null;
  evidence_urls?: string[];
  status: string;
  approved_by_name?: string | null;
  approved_at?: string | null;
}

export interface PresenceInvoiceSupport {
  id: number;
  node_id: number;
  connection_id?: number | null;
  quote_id?: number | null;
  external_invoice_url?: string | null;
  invoice_number?: string | null;
  status: string;
  amount?: number | null;
  currency?: string;
  notes?: string | null;
}

export interface PresenceHandover {
  id: number;
  node_id: number;
  connection_id?: number | null;
  quote_id?: number | null;
  summary?: string | null;
  before_images?: string[];
  after_images?: string[];
  work_notes?: string | null;
  materials_used?: string | null;
  warranty_notes?: string | null;
  customer_acceptance_status?: string;
  accepted_at?: string | null;
}

export interface PresencePortfolioItem {
  id?: number;
  title: string;
  description?: string | null;
  media_url?: string | null;
  thumbnail_url?: string | null;
  external_url?: string | null;
  media_type?: string;
  sort_order?: number;
  is_visible?: boolean;
}

export interface PresenceCollection {
  id?: number;
  node_id?: number | null;
  title: string;
  description?: string | null;
  cover_image_url?: string | null;
  sort_order?: number;
  is_visible?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PresenceWork {
  id?: number;
  collection_id?: number | null;
  slug?: string | null;
  title: string;
  year?: string | null;
  medium?: string | null;
  dimensions?: string | null;
  description?: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  gallery_images?: string[];
  external_url?: string | null;
  availability_status?: string | null;
  price_label?: string | null;
  exhibition_history?: string | null;
  notes?: string | null;
  sort_order?: number;
  is_visible?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PresenceBusinessFunction {
  id?: number;
  function_type: string;
  is_enabled?: boolean;
  config?: Record<string, unknown>;
}

export interface PresenceAvailabilityChip {
  id?: number;
  label: string;
  chip_type?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface PresenceSection {
  id?: number;
  section_type: string;
  title?: string | null;
  content?: string | null;
  sort_order?: number;
  is_visible?: boolean;
  config?: Record<string, unknown>;
}

export interface PresenceAnalyticsSummary {
  total_views: number;
  total_enquiries: number;
  quote_requests?: number;
  conversion_rate: number;
  last_7_days?: Record<string, number>;
  last_30_days?: Record<string, number>;
  top_links?: Array<{ label?: string | null; url?: string | null; count: number }>;
  top_sources?: Array<{ source_type?: string | null; source_code?: string | null; source_tag_id?: number | null; count: number }>;
  recent_events?: Array<{ id: number; event_type: string; created_at?: string | null; metadata?: Record<string, unknown> }>;
}

export interface PublicPresenceWorkDetail {
  node: PresenceNode;
  work: PresenceWork;
  collection?: PresenceCollection | null;
}

export interface PublicPresenceCollectionDetail {
  node: PresenceNode;
  collection: PresenceCollection;
  works: PresenceWork[];
}

export interface PresenceNode {
  id: number;
  owner_user_id?: number | null;
  tenant_id?: number | null;
  organisation_id?: number | null;
  slug: string;
  display_name: string;
  headline?: string | null;
  bio?: string | null;
  node_type: string;
  display_mode: string;
  plan_type?: string;
  status: string;
  visibility: string;
  template_id?: number | null;
  template?: PresenceTemplate | null;
  theme_config?: Record<string, unknown>;
  visual_mood?: string | null;
  custom_typography_config?: Record<string, unknown>;
  custom_spacing_config?: Record<string, unknown>;
  profile_image_url?: string | null;
  cover_image_url?: string | null;
  location_label?: string | null;
  service_area?: string | null;
  primary_cta_label?: string | null;
  primary_cta_url?: string | null;
  landing_enabled?: boolean;
  landing_title?: string | null;
  landing_subtitle?: string | null;
  landing_background_url?: string | null;
  landing_enter_label?: string | null;
  practice_statement?: string | null;
  curatorial_statement?: string | null;
  capability_statement?: string | null;
  proof_summary?: string | null;
  procurement_summary?: string | null;
  business_functions_enabled?: boolean;
  directory_ready?: boolean;
  map_ready?: boolean;
  archive_ready?: boolean;
  marketplace_ready?: boolean;
  white_label_ready?: boolean;
  public_email?: string | null;
  public_phone?: string | null;
  public_url?: string;
  organisation?: { id: number; slug: string; name: string; status: string } | null;
  sections?: PresenceSection[];
  links?: PresenceLink[];
  services?: PresenceService[];
  proof_items?: PresenceProofItem[];
  credentials?: PresenceCredential[];
  procurement_profile?: PresenceProcurementProfile | null;
  collections?: PresenceCollection[];
  works?: PresenceWork[];
  portfolio_items?: PresencePortfolioItem[];
  availability_chips?: PresenceAvailabilityChip[];
  business_functions?: PresenceBusinessFunction[];
  nfc_tags?: PresenceNfcTag[];
  connections?: PresenceConnection[];
  quotes?: PresenceQuote[];
  variations?: PresenceVariation[];
  invoice_support_records?: PresenceInvoiceSupport[];
  handovers?: PresenceHandover[];
  analytics?: PresenceAnalyticsSummary;
  seo?: {
    title: string;
    description: string;
    canonical_url: string;
    image?: string | null;
  };
  created_at?: string | null;
  updated_at?: string | null;
  published_at?: string | null;
  archived_at?: string | null;
}

export interface PresenceEnquiry {
  id: number;
  node_id: number;
  tenant_id?: number | null;
  organisation_id?: number | null;
  connection_id?: number | null;
  enquiry_type: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  role_title?: string | null;
  budget_range?: string | null;
  timeline?: string | null;
  project_type?: string | null;
  urgency?: string | null;
  decision_maker_status?: string | null;
  message: string;
  preferred_contact_method: string;
  metadata?: Record<string, unknown>;
  source_url?: string | null;
  source_type?: string | null;
  source_tag_id?: number | null;
  status: string;
  assigned_to_user_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export type PresenceNodeInput = Partial<Omit<PresenceNode, 'id' | 'template' | 'organisation' | 'analytics' | 'seo'>>;

export interface PresenceEnquiryInput {
  enquiry_type?: string;
  name: string;
  email: string;
  phone?: string;
  preferred_contact_method?: string;
  message: string;
  consent: boolean;
  company?: string;
  role_title?: string;
  budget_range?: string;
  timeline?: string;
  project_type?: string;
  urgency?: string;
  decision_maker_status?: string;
  website?: string;
  form_started_at?: number;
  source_url?: string;
  source_type?: string;
  source_code?: string;
  source_tag_id?: number;
  metadata?: Record<string, unknown>;
  anonymous_session_id?: string;
}

export interface PresenceQuoteRequestInput {
  name: string;
  email: string;
  phone?: string;
  job_type?: string;
  address_suburb?: string;
  preferred_date?: string;
  urgency?: string;
  description: string;
  access_notes?: string;
  budget_range?: string;
  consent: boolean;
  website?: string;
  form_started_at?: number;
  source_url?: string;
  source_type?: string;
  source_code?: string;
  source_tag_id?: number;
  metadata?: Record<string, unknown>;
  anonymous_session_id?: string;
}

function unwrapData<T>(payload: T | { data: T }): T {
  if (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export async function fetchPublicPresenceNode(slug: string, options: { server?: boolean } = {}) {
  const base = getCoreApiBase({ server: options.server });
  const response = await fetch(`${base}/api/presence/public/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    return null;
  }
  const payload = await response.json();
  return unwrapData<PresenceNode>(payload);
}

export async function fetchPublicPresenceWork(slug: string, workId: number | string, options: { server?: boolean } = {}) {
  const base = getCoreApiBase({ server: options.server });
  const response = await fetch(`${base}/api/presence/public/${encodeURIComponent(slug)}/works/${encodeURIComponent(String(workId))}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    return null;
  }
  const payload = await response.json();
  return unwrapData<PublicPresenceWorkDetail>(payload);
}

export async function fetchPublicPresenceCollection(slug: string, collectionId: number | string, options: { server?: boolean } = {}) {
  const base = getCoreApiBase({ server: options.server });
  const response = await fetch(`${base}/api/presence/public/${encodeURIComponent(slug)}/collections/${encodeURIComponent(String(collectionId))}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    return null;
  }
  const payload = await response.json();
  return unwrapData<PublicPresenceCollectionDetail>(payload);
}

export async function submitPresenceEnquiry(slug: string, payload: PresenceEnquiryInput) {
  const base = getCoreApiBase();
  const response = await fetch(`${base}/api/presence/public/${encodeURIComponent(slug)}/enquiries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.ok === false) {
    const message = body?.error?.message || 'Unable to submit enquiry.';
    throw new Error(message);
  }
  return unwrapData<{ id: number; status: string; message: string }>(body);
}

export async function submitPresenceQuoteRequest(slug: string, payload: PresenceQuoteRequestInput) {
  const base = getCoreApiBase();
  const response = await fetch(`${base}/api/presence/public/${encodeURIComponent(slug)}/quote-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.ok === false) {
    const message = body?.error?.message || 'Unable to submit quote request.';
    throw new Error(message);
  }
  return unwrapData<{ enquiry_id: number; connection_id: number; quote_id: number; status: string; message: string }>(body);
}

export async function capturePresenceSourceHit(slug: string, payload: Record<string, unknown>) {
  const base = getCoreApiBase();
  const response = await fetch(`${base}/api/presence/public/${encodeURIComponent(slug)}/nfc-hit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.ok === false) {
    return null;
  }
  return unwrapData<{ captured: boolean; event_type?: string; source_tag_id?: number | null }>(body);
}

export async function capturePresenceEvent(slug: string, event_type: string, metadata: Record<string, unknown> = {}) {
  const base = getCoreApiBase();
  await fetch(`${base}/api/presence/analytics/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      slug,
      event_type,
      metadata,
      anonymous_session_id: getAnonymousPresenceSessionId(),
    }),
  }).catch(() => null);
}

export function getAnonymousPresenceSessionId() {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const key = 'presence_session_id';
  const existing = window.sessionStorage.getItem(key);
  if (existing) {
    return existing;
  }
  const next = `ps_${crypto.randomUUID()}`;
  window.sessionStorage.setItem(key, next);
  return next;
}

export function listControlPresenceNodes(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return controlFetchJson<PresenceNode[] | { data: PresenceNode[] }>(`core/api/control/presence/nodes${suffix}`).then((payload) =>
    unwrapData<PresenceNode[]>(payload),
  );
}

export function getOwnerPresenceNodes() {
  return apiFetch<PresenceNode[]>('/api/presence/owner/nodes');
}

export function getOwnerPresenceNode(id: number) {
  return apiFetch<PresenceNode>(`/api/presence/owner/nodes/${id}`);
}

export function updateOwnerPresenceNode(id: number, payload: PresenceNodeInput) {
  return apiFetch<PresenceNode>(`/api/presence/owner/nodes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function publishOwnerPresenceNode(id: number) {
  return apiFetch<PresenceNode>(`/api/presence/owner/nodes/${id}/publish`, {
    method: 'POST',
  });
}

export function unpublishOwnerPresenceNode(id: number) {
  return apiFetch<PresenceNode>(`/api/presence/owner/nodes/${id}/unpublish`, {
    method: 'POST',
  });
}

export function getOwnerPresenceNodeCollections(nodeId: number) {
  return apiFetch<PresenceCollection[]>(`/api/presence/owner/nodes/${nodeId}/collections`);
}

export function createOwnerPresenceCollection(nodeId: number, payload: Partial<PresenceCollection>) {
  return apiFetch<PresenceCollection>(`/api/presence/owner/nodes/${nodeId}/collections`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateOwnerPresenceCollection(id: number, payload: Partial<PresenceCollection>) {
  return apiFetch<PresenceCollection>(`/api/presence/owner/collections/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function getOwnerPresenceNodeWorks(nodeId: number) {
  return apiFetch<PresenceWork[]>(`/api/presence/owner/nodes/${nodeId}/works`);
}

export function createOwnerPresenceWork(nodeId: number, payload: Partial<PresenceWork>) {
  return apiFetch<PresenceWork>(`/api/presence/owner/nodes/${nodeId}/works`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateOwnerPresenceWork(id: number, payload: Partial<PresenceWork>) {
  return apiFetch<PresenceWork>(`/api/presence/owner/works/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function getOwnerPresenceNodeEnquiries(nodeId: number, params: Record<string, string> = {}) {
  const query = new URLSearchParams(params);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiFetch<PresenceEnquiry[]>(`/api/presence/owner/nodes/${nodeId}/enquiries${suffix}`);
}

export function updateOwnerPresenceEnquiry(id: number, status: string) {
  return apiFetch<PresenceEnquiry>(`/api/presence/owner/enquiries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function getOwnerPresenceNodeAnalytics(nodeId: number) {
  return apiFetch<PresenceAnalyticsSummary>(`/api/presence/owner/nodes/${nodeId}/analytics`);
}

export function getOwnerPresenceNodeNfcTags(nodeId: number) {
  return apiFetch<PresenceNfcTag[]>(`/api/presence/owner/nodes/${nodeId}/nfc-tags`);
}

export function createOwnerPresenceNfcTag(nodeId: number, payload: Partial<PresenceNfcTag>) {
  return apiFetch<PresenceNfcTag>(`/api/presence/owner/nodes/${nodeId}/nfc-tags`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateOwnerPresenceNfcTag(id: number, payload: Partial<PresenceNfcTag>) {
  return apiFetch<PresenceNfcTag>(`/api/presence/owner/nfc-tags/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function createControlPresenceNode(payload: PresenceNodeInput) {
  return controlFetchJson<PresenceNode | { data: PresenceNode }>('core/api/control/presence/nodes', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((responsePayload) => unwrapData<PresenceNode>(responsePayload));
}

export function getControlPresenceNode(id: number) {
  return controlFetchJson<PresenceNode | { data: PresenceNode }>(`core/api/control/presence/nodes/${id}`).then((payload) =>
    unwrapData<PresenceNode>(payload),
  );
}

export function updateControlPresenceNode(id: number, payload: PresenceNodeInput) {
  return controlFetchJson<PresenceNode | { data: PresenceNode }>(`core/api/control/presence/nodes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((responsePayload) => unwrapData<PresenceNode>(responsePayload));
}

export function publishControlPresenceNode(id: number) {
  return controlFetchJson<PresenceNode | { data: PresenceNode }>(`core/api/control/presence/nodes/${id}/publish`, {
    method: 'POST',
  }).then((payload) => unwrapData<PresenceNode>(payload));
}

export function unpublishControlPresenceNode(id: number) {
  return controlFetchJson<PresenceNode | { data: PresenceNode }>(`core/api/control/presence/nodes/${id}/unpublish`, {
    method: 'POST',
  }).then((payload) => unwrapData<PresenceNode>(payload));
}

export function suspendControlPresenceNode(id: number) {
  return controlFetchJson<PresenceNode | { data: PresenceNode }>(`core/api/control/presence/nodes/${id}/suspend`, {
    method: 'POST',
  }).then((payload) => unwrapData<PresenceNode>(payload));
}

export function archiveControlPresenceNode(id: number) {
  return controlFetchJson<PresenceNode | { data: PresenceNode }>(`core/api/control/presence/nodes/${id}/archive`, {
    method: 'POST',
  }).then((payload) => unwrapData<PresenceNode>(payload));
}

export function listControlPresenceTemplates() {
  return controlFetchJson<PresenceTemplate[] | { data: PresenceTemplate[] }>('core/api/control/presence/templates').then((payload) =>
    unwrapData<PresenceTemplate[]>(payload),
  );
}

export function listControlPresenceEnquiries(nodeId: number, params: Record<string, string> = {}) {
  const query = new URLSearchParams(params);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return controlFetchJson<PresenceEnquiry[] | { data: PresenceEnquiry[] }>(
    `core/api/control/presence/nodes/${nodeId}/enquiries${suffix}`,
  ).then((payload) => unwrapData<PresenceEnquiry[]>(payload));
}

export function updateControlPresenceEnquiry(id: number, status: string) {
  return controlFetchJson<PresenceEnquiry | { data: PresenceEnquiry }>(`core/api/control/presence/enquiries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }).then((payload) => unwrapData<PresenceEnquiry>(payload));
}

export function listControlPresenceCollections(nodeId: number) {
  return controlFetchJson<PresenceCollection[] | { data: PresenceCollection[] }>(
    `core/api/control/presence/nodes/${nodeId}/collections`,
  ).then((payload) => unwrapData<PresenceCollection[]>(payload));
}

export function createControlPresenceCollection(nodeId: number, payload: Partial<PresenceCollection>) {
  return controlFetchJson<PresenceCollection | { data: PresenceCollection }>(
    `core/api/control/presence/nodes/${nodeId}/collections`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  ).then((responsePayload) => unwrapData<PresenceCollection>(responsePayload));
}

export function updateControlPresenceCollection(id: number, payload: Partial<PresenceCollection>) {
  return controlFetchJson<PresenceCollection | { data: PresenceCollection }>(`core/api/control/presence/collections/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((responsePayload) => unwrapData<PresenceCollection>(responsePayload));
}

export function deleteControlPresenceCollection(id: number) {
  return controlFetchJson<{ deleted: boolean; id: number } | { data: { deleted: boolean; id: number } }>(
    `core/api/control/presence/collections/${id}`,
    {
      method: 'DELETE',
    },
  ).then((responsePayload) => unwrapData<{ deleted: boolean; id: number }>(responsePayload));
}

export function listControlPresenceWorks(nodeId: number) {
  return controlFetchJson<PresenceWork[] | { data: PresenceWork[] }>(`core/api/control/presence/nodes/${nodeId}/works`).then((payload) =>
    unwrapData<PresenceWork[]>(payload),
  );
}

export function createControlPresenceWork(nodeId: number, payload: Partial<PresenceWork>) {
  return controlFetchJson<PresenceWork | { data: PresenceWork }>(`core/api/control/presence/nodes/${nodeId}/works`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((responsePayload) => unwrapData<PresenceWork>(responsePayload));
}

export function updateControlPresenceWork(id: number, payload: Partial<PresenceWork>) {
  return controlFetchJson<PresenceWork | { data: PresenceWork }>(`core/api/control/presence/works/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((responsePayload) => unwrapData<PresenceWork>(responsePayload));
}

export function deleteControlPresenceWork(id: number) {
  return controlFetchJson<{ deleted: boolean; id: number } | { data: { deleted: boolean; id: number } }>(
    `core/api/control/presence/works/${id}`,
    {
      method: 'DELETE',
    },
  ).then((responsePayload) => unwrapData<{ deleted: boolean; id: number }>(responsePayload));
}

export function listControlPresenceServices(nodeId: number) {
  return controlFetchJson<PresenceService[] | { data: PresenceService[] }>(`core/api/control/presence/nodes/${nodeId}/services`).then((payload) =>
    unwrapData<PresenceService[]>(payload),
  );
}

export function createControlPresenceService(nodeId: number, payload: Partial<PresenceService>) {
  return controlFetchJson<PresenceService | { data: PresenceService }>(`core/api/control/presence/nodes/${nodeId}/services`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((responsePayload) => unwrapData<PresenceService>(responsePayload));
}

export function updateControlPresenceService(id: number, payload: Partial<PresenceService>) {
  return controlFetchJson<PresenceService | { data: PresenceService }>(`core/api/control/presence/services/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((responsePayload) => unwrapData<PresenceService>(responsePayload));
}

export function listControlPresenceProof(nodeId: number) {
  return controlFetchJson<PresenceProofItem[] | { data: PresenceProofItem[] }>(`core/api/control/presence/nodes/${nodeId}/proof`).then(
    (payload) => unwrapData<PresenceProofItem[]>(payload),
  );
}

export function createControlPresenceProof(nodeId: number, payload: Partial<PresenceProofItem>) {
  return controlFetchJson<PresenceProofItem | { data: PresenceProofItem }>(`core/api/control/presence/nodes/${nodeId}/proof`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((responsePayload) => unwrapData<PresenceProofItem>(responsePayload));
}

export function updateControlPresenceProof(id: number, payload: Partial<PresenceProofItem>) {
  return controlFetchJson<PresenceProofItem | { data: PresenceProofItem }>(`core/api/control/presence/proof/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((responsePayload) => unwrapData<PresenceProofItem>(responsePayload));
}

export function getControlPresenceProcurement(nodeId: number) {
  return controlFetchJson<PresenceProcurementProfile | null | { data: PresenceProcurementProfile | null }>(
    `core/api/control/presence/nodes/${nodeId}/procurement`,
  ).then((payload) => unwrapData<PresenceProcurementProfile | null>(payload));
}

export function updateControlPresenceProcurement(nodeId: number, payload: Partial<PresenceProcurementProfile>) {
  return controlFetchJson<PresenceProcurementProfile | { data: PresenceProcurementProfile }>(
    `core/api/control/presence/nodes/${nodeId}/procurement`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  ).then((responsePayload) => unwrapData<PresenceProcurementProfile>(responsePayload));
}

export function listControlPresenceNfcTags(nodeId: number) {
  return controlFetchJson<PresenceNfcTag[] | { data: PresenceNfcTag[] }>(`core/api/control/presence/nodes/${nodeId}/nfc-tags`).then(
    (payload) => unwrapData<PresenceNfcTag[]>(payload),
  );
}

export function createControlPresenceNfcTag(nodeId: number, payload: Partial<PresenceNfcTag>) {
  return controlFetchJson<PresenceNfcTag | { data: PresenceNfcTag }>(`core/api/control/presence/nodes/${nodeId}/nfc-tags`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((responsePayload) => unwrapData<PresenceNfcTag>(responsePayload));
}

export function updateControlPresenceNfcTag(id: number, payload: Partial<PresenceNfcTag>) {
  return controlFetchJson<PresenceNfcTag | { data: PresenceNfcTag }>(`core/api/control/presence/nfc-tags/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((responsePayload) => unwrapData<PresenceNfcTag>(responsePayload));
}

export function listControlPresenceConnections(nodeId: number) {
  return controlFetchJson<PresenceConnection[] | { data: PresenceConnection[] }>(
    `core/api/control/presence/nodes/${nodeId}/connections`,
  ).then((payload) => unwrapData<PresenceConnection[]>(payload));
}

export function getControlPresenceConnection(id: number) {
  return controlFetchJson<PresenceConnection | { data: PresenceConnection }>(`core/api/control/presence/connections/${id}`).then((payload) =>
    unwrapData<PresenceConnection>(payload),
  );
}

export function listControlPresenceQuotes(nodeId: number) {
  return controlFetchJson<PresenceQuote[] | { data: PresenceQuote[] }>(`core/api/control/presence/nodes/${nodeId}/quotes`).then((payload) =>
    unwrapData<PresenceQuote[]>(payload),
  );
}

export function createControlPresenceQuote(nodeId: number, payload: Partial<PresenceQuote>) {
  return controlFetchJson<PresenceQuote | { data: PresenceQuote }>(`core/api/control/presence/nodes/${nodeId}/quotes`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((responsePayload) => unwrapData<PresenceQuote>(responsePayload));
}

export function updateControlPresenceQuote(id: number, payload: Partial<PresenceQuote>) {
  return controlFetchJson<PresenceQuote | { data: PresenceQuote }>(`core/api/control/presence/quotes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((responsePayload) => unwrapData<PresenceQuote>(responsePayload));
}

export function listControlPresenceVariations(nodeId: number) {
  return controlFetchJson<PresenceVariation[] | { data: PresenceVariation[] }>(
    `core/api/control/presence/nodes/${nodeId}/variations`,
  ).then((payload) => unwrapData<PresenceVariation[]>(payload));
}

export function updateControlPresenceVariation(id: number, payload: Partial<PresenceVariation>) {
  return controlFetchJson<PresenceVariation | { data: PresenceVariation }>(`core/api/control/presence/variations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((responsePayload) => unwrapData<PresenceVariation>(responsePayload));
}

export function listControlPresenceInvoiceSupport(nodeId: number) {
  return controlFetchJson<PresenceInvoiceSupport[] | { data: PresenceInvoiceSupport[] }>(
    `core/api/control/presence/nodes/${nodeId}/invoice-support`,
  ).then((payload) => unwrapData<PresenceInvoiceSupport[]>(payload));
}

export function listControlPresenceHandovers(nodeId: number) {
  return controlFetchJson<PresenceHandover[] | { data: PresenceHandover[] }>(
    `core/api/control/presence/nodes/${nodeId}/handovers`,
  ).then((payload) => unwrapData<PresenceHandover[]>(payload));
}

export function presencePublicApiPath(slug: string, suffix = '') {
  return `${getCoreApiBase()}/api/presence/public/${encodeURIComponent(slug)}${suffix}`;
}
