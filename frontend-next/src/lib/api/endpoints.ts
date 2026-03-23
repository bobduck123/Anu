import { apiFetch } from './client';

export interface MembershipPlan {
  id: number;
  name: string;
  amount_cents: number;
  credit_grant_monthly: number;
  pool_allocation_pct?: string;
  stripe_price_id: string;
}

export interface SubscriptionStatus {
  is_subscribed: boolean;
  subscription: {
    id: number;
    plan_id: number;
    status: string;
    current_period_start?: string;
    current_period_end?: string;
    streak_months: number;
    last_payment_at?: string;
    cancel_at_period_end: boolean;
    created_at: string;
  } | null;
}

export interface ImpactPool {
  id: number;
  slug: string;
  name: string;
  description?: string;
  category?: string;
  target_amount_cents?: number;
  current_balance_cents: number;
  is_active: boolean;
}

export interface PoolDashboard {
  pool: ImpactPool;
  last_30d: {
    inflows: number;
    outflows: number;
  };
}

export interface ReliefRequestInput {
  node_id?: string;
  amount_requested: number;
  purpose: string;
  description?: string;
  urgency: 'low' | 'medium' | 'high';
  contact_preference: 'in-app' | 'email' | 'phone';
  consents: {
    data_processing: boolean;
    case_worker_contact: boolean;
  };
}

export interface ReliefRequestStatus {
  request_id: number;
  status: string;
  queue_position_estimate: number;
  next_update_eta_hours: number;
}

export interface ReliefRequestRecord {
  id?: number;
  request_id?: number;
  amount_requested_cents: number;
  amount?: number;
  purpose: string;
  urgency: 'low' | 'medium' | 'high' | string;
  status: string;
  submitted_at?: string;
  description?: string;
  triage_score?: number;
  triage_reason?: string;
  anon_id?: string;
  queue_position_estimate?: number;
  next_update_eta_hours?: number;
  contact_preference?: string;
  lat?: number;
  lng?: number;
  city?: string;
  country?: string;
}

export interface ReliefDecision {
  id: number;
  decision: 'approve' | 'reject' | 'disburse' | 'escalate' | string;
  created_at: string;
  actor?: string;
  amount_cents?: number;
  reason?: string;
}

export interface ReliefCouncil {
  id: number;
  name: string;
  quorum: number;
}

export interface ReliefCouncilMember {
  user_id?: number;
  username?: string;
  role?: string;
}

export interface ConsentState {
  consents: Record<string, boolean>;
}

export interface TransparencySummary {
  node: { slug: string; name: string };
  totals: { inflows_30d: number; outflows_30d: number; admin_ratio_30d: number };
  pools: Array<{ slug: string; name?: string; category?: string; target_amount_cents?: number; balance: number; outflows_30d: number }>;
  relief_capacity: { monthly_grants_remaining: number; avg_processing_days: number };
  relief_metrics?: { approval_ratio: number; median_response_days: number };
  receipts?: Array<{
    id: number;
    pool_slug?: string;
    pool_name?: string;
    entry_type: string;
    amount_cents: number;
    description?: string;
    reference_type?: string;
    created_at?: string;
  }>;
}

export interface TimeEntry {
  id: number;
  user_id: number;
  microcosm_id?: number;
  guild_id?: number;
  activity_type: string;
  hours: number;
  occurred_at: string;
  verification_status: string;
  proof_ref?: string;
}

export interface CommunityAsset {
  id: number;
  name: string;
  asset_type: string;
  location_text?: string;
  lat?: number;
  lng?: number;
  ownership_type?: string;
  capacity_notes?: string;
  booking_rules_json?: Record<string, unknown>;
  maintenance_notes?: string;
  created_at?: string;
}

export interface Insight {
  id: number;
  author_id: number;
  microcosm_id?: number;
  domain_tag: string;
  title: string;
  body: string;
  verification_level: string;
  evidence_ref?: string;
  created_at?: string;
}

export interface Merchant {
  id: number;
  name: string;
  domain?: string;
  website?: string;
  location_text?: string;
  created_at?: string;
  metrics?: { txn_count: number; dispute_rate: number; reliability_score: number };
}

export interface MerchantTransaction {
  id: number;
  microcosm_id?: number;
  amount: number;
  occurred_at?: string;
  receipt_ref?: string;
  dispute_flag?: boolean;
}

export interface CrisisRun {
  id: number;
  scenario_id: number;
  results: Record<string, unknown> | null;
  computed_at?: string;
}

export interface ConstellationSummary {
  id: number;
  nodeId: number;
  name: string;
  description?: string;
  domain?: string;
  geoLabel?: string;
  active: boolean;
  createdAt?: string;
}

export interface ConstellationDashboard {
  constellation: ConstellationSummary;
  memberCount: number;
  latestWeek?: string | null;
  rankings: Array<{
    microcosmId: number;
    rank: number;
    rawPerf: number;
    featuredScore: number;
    isFeatured: boolean;
  }>;
  featured: Array<{
    microcosmId: number;
    rank: number;
    rawPerf: number;
    featuredScore: number;
    isFeatured: boolean;
  }>;
  activeAlerts: number;
  criticalAlerts: number;
  latestBrief?: {
    weekStart?: string | null;
    summary?: Record<string, unknown> | null;
  } | null;
}

export interface ConstellationRanking {
  id?: number;
  microcosmId: number;
  weekStart?: string | null;
  rank: number;
  rawPerf: number;
  antiCaptureWeight?: number;
  featuredScore: number;
  isFeatured: boolean;
  isBestPractice?: boolean;
  gateFailures?: string[];
  componentContributions?: Record<string, unknown> | null;
  evidenceHash?: string;
  formulaVersion?: number;
}

export interface ConstellationExplain {
  ranking: ConstellationRanking;
  decomposition?: Record<string, unknown> | null;
  rawMetrics?: Record<string, unknown> | null;
}

export interface ConstellationAlert {
  id: number;
  alertType: string;
  severity: string;
  metricKey?: string;
  metricValue?: number;
  threshold?: number;
  responseAction?: string;
  resolved: boolean;
  createdAt?: string;
}

export const membershipsApi = {
  listPlans: () => apiFetch<MembershipPlan[]>('/api/memberships/plans'),
  createCheckout: (plan_id: number) =>
    apiFetch<{ checkout_url: string; subscription_id: number }>('/api/memberships/checkout-session', {
      method: 'POST',
      body: JSON.stringify({ plan_id }),
    }),
  status: () => apiFetch<SubscriptionStatus>('/api/memberships/status'),
  createPlan: (payload: {
    node_id: string;
    name: string;
    amount_cents: number;
    credit_grant_monthly: number;
    pool_allocation_pct?: string;
    stripe_price_id: string;
    is_active: boolean;
  }) =>
    apiFetch<{ id: number }>('/api/memberships/plans', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export const poolsApi = {
  list: () => apiFetch<ImpactPool[]>('/api/pools'),
  dashboard: (poolId: number) => apiFetch<PoolDashboard>(`/api/pools/${poolId}/dashboard`),
};

export const reliefApi = {
  createRequest: (payload: ReliefRequestInput) =>
    apiFetch<ReliefRequestStatus>('/api/relief/requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  myRequests: () => apiFetch<ReliefRequestRecord[]>('/api/relief/requests/me'),
  queue: () => apiFetch<ReliefRequestRecord[]>('/api/relief/queue'),
  vote: (requestId: number, vote: 'approve' | 'reject') =>
    apiFetch<{ finalized: boolean; status: string }>(`/api/relief/requests/${requestId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ vote }),
    }),
  approve: (requestId: number, amount_cents: number, second_approver_id?: number) =>
    apiFetch<{ status: string; approved_amount_cents: number }>(`/api/relief/requests/${requestId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ amount_cents, second_approver_id }),
    }),
  disburse: (requestId: number, amount_cents: number) =>
    apiFetch<{ disbursement_id: number; status: string }>(`/api/relief/requests/${requestId}/disburse`, {
      method: 'POST',
      body: JSON.stringify({ amount_cents }),
    }),
  getRequest: (requestId: number) => apiFetch<ReliefRequestRecord>(`/api/relief/requests/${requestId}`),
  decisions: (requestId: number) => apiFetch<ReliefDecision[]>(`/api/relief/requests/${requestId}/decisions`),
  overrideTriage: (requestId: number, triage_score: number, triage_reason?: string, triage_tags?: string[]) =>
    apiFetch<{ id: number; triage_score: number; triage_reason: string }>(`/api/relief/requests/${requestId}/triage`, {
      method: 'POST',
      body: JSON.stringify({ triage_score, triage_reason, triage_tags }),
    }),
  metrics: () => apiFetch<{ approval_ratio: number; median_response_days: number; disbursements_by_purpose: Record<string, number> }>(`/api/relief/metrics`),
  councils: () => apiFetch<ReliefCouncil[]>(`/api/relief/councils`),
  councilMembers: (councilId: number) => apiFetch<ReliefCouncilMember[]>(`/api/relief/councils/${councilId}/members`),
  addCouncilMember: (councilId: number, user_id: number, role?: string) =>
    apiFetch<{ id: number }>(`/api/relief/councils/${councilId}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id, role }),
    }),
};

export const consentApi = {
  get: () => apiFetch<ConsentState>('/api/consent'),
  update: (consents: Record<string, boolean>) =>
    apiFetch<ConsentState>('/api/consent', { method: 'POST', body: JSON.stringify({ consents }) }),
};

export const transparencyApi = {
  nodeSummary: (node?: string) =>
    apiFetch<TransparencySummary>(`/public/transparency/node-summary${node ? `?node=${node}` : ''}`),
};

export const timebankApi = {
  list: () => apiFetch<{ entries: TimeEntry[] }>('/api/time_entries'),
  create: (payload: Partial<TimeEntry>) =>
    apiFetch<{ id: number; status: string }>('/api/time_entries', { method: 'POST', body: JSON.stringify(payload) }),
};

export const assetsRegistryApi = {
  list: () => apiFetch<{ assets: CommunityAsset[] }>('/api/assets/registry'),
  create: (payload: Partial<CommunityAsset>) =>
    apiFetch<{ id: number }>('/api/assets/registry', { method: 'POST', body: JSON.stringify(payload) }),
  book: (assetId: number, payload: { start_at: string; end_at: string; microcosm_id?: number }) =>
    apiFetch<{ id: number; status: string }>(`/api/assets/registry/${assetId}/bookings`, { method: 'POST', body: JSON.stringify(payload) }),
};

export const insightsApi = {
  list: (domainTag?: string) =>
    apiFetch<{ insights: Insight[] }>(`/api/insights${domainTag ? `?domain_tag=${encodeURIComponent(domainTag)}` : ''}`),
  create: (payload: Partial<Insight>) =>
    apiFetch<{ id: number }>('/api/insights', { method: 'POST', body: JSON.stringify(payload) }),
};

export const merchantsApi = {
  list: () => apiFetch<{ merchants: Merchant[] }>('/api/merchants'),
  get: (merchantId: number) =>
    apiFetch<{ merchant: Merchant; metrics: Record<string, unknown>; transactions: MerchantTransaction[] }>(
      `/api/merchants/${merchantId}`,
    ),
  addTransaction: (merchantId: number, payload: Partial<MerchantTransaction> & { amount: number }) =>
    apiFetch<{ id: number }>(`/api/merchants/${merchantId}/transactions`, { method: 'POST', body: JSON.stringify(payload) }),
};

export const treasuryApi = {
  pools: () =>
    apiFetch<{
      pools: Array<{
        id: number;
        slug: string;
        name: string;
        category?: string;
        target_amount_cents?: number;
        balance_cents: number;
        policy?: Record<string, unknown>;
      }>;
    }>('/api/treasury/pools'),
  draw: (poolId: number, payload: { amount_cents: number; event_type?: string; description?: string }) =>
    apiFetch<{ entry_id: number }>(`/api/treasury/pools/${poolId}/draw`, { method: 'POST', body: JSON.stringify(payload) }),
};

export const burnoutApi = {
  me: () => apiFetch<{ score: number; risk: string; reasons: Record<string, unknown> }>('/api/burnout/me'),
  microcosm: (microcosmId: number) => apiFetch<{ avg_score: number; high_risk_count: number }> (`/api/burnout/microcosm/${microcosmId}`),
};

export const crisisSimApi = {
  run: (payload: { type: string; params?: Record<string, unknown> }) =>
    apiFetch<{ scenario_id: number; run_id: number; results: Record<string, unknown> }>('/api/crisis/run', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  runs: () => apiFetch<{ runs: CrisisRun[] }>('/api/crisis/runs'),
};

export const impactApi = {
  summary: () => apiFetch<Record<string, unknown>>('/api/impact/summary'),
};

export const synergyApi = {
  constellationPairs: () => apiFetch<{ pairs: Array<Record<string, unknown>> }>('/api/synergy/constellations'),
};

export const constellationsApi = {
  list: (domain?: string) =>
    apiFetch<{ constellations: ConstellationSummary[]; total: number; page: number; pages: number }>(
      `/api/constellations${domain ? `?domain=${encodeURIComponent(domain)}` : ''}`,
    ),
  get: (constellationId: number) =>
    apiFetch<{ constellation: ConstellationSummary; microcosms: Array<{ id: number; name: string; joinedAt?: string | null }> }>(
      `/api/constellations/${constellationId}`,
    ),
  dashboard: (constellationId: number) =>
    apiFetch<ConstellationDashboard>(`/api/constellations/${constellationId}/dashboard`),
  rankings: (constellationId: number, week?: string) =>
    apiFetch<{ rankings: ConstellationRanking[]; total: number; page: number }>(
      `/api/constellations/${constellationId}/rankings${week ? `?week=${week}` : ''}`,
    ),
  explain: (constellationId: number, microcosmId: number, week?: string) =>
    apiFetch<ConstellationExplain>(
      `/api/constellations/${constellationId}/rankings/${microcosmId}/explain${week ? `?week=${week}` : ''}`,
    ),
  alerts: (constellationId: number, resolved?: boolean) =>
    apiFetch<{ alerts: ConstellationAlert[]; total: number; page: number }>(
      `/api/constellations/${constellationId}/drift/alerts${resolved !== undefined ? `?resolved=${resolved}` : ''}`,
    ),
  resolveAlert: (constellationId: number, alertId: number) =>
    apiFetch<{ alert: ConstellationAlert }>(
      `/api/constellations/${constellationId}/drift/alerts/${alertId}/resolve`,
      { method: 'POST' },
    ),
};
