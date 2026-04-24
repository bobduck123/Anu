/**
 * WCLE (Weekly Cost-Lowering Engine) — Phase 1 API client
 */
import { normalizeScenarioMeta } from '@/lib/wcle/scenarioConfig';
import type { WCLEComparisonMode, WCLEObjective, WCLEOptimizationScope, WCLEScenarioMeta } from '@/lib/wcle/scenarioConfig';
import { apiFetch } from './client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type { WCLEComparisonMode, WCLEObjective, WCLEOptimizationScope, WCLEScenarioMeta } from '@/lib/wcle/scenarioConfig';

export interface WCLERun {
  id: number;
  title: string;
  supplier_type: string;
  location_name: string | null;
  address: string | null;
  suburb: string | null;
  postcode: string | null;
  lat: number | null;
  lng: number | null;
  organizer_user_id: number;
  microcosm_id: number | null;
  run_date: string;
  pledge_deadline: string;
  pickup_window_start: string | null;
  pickup_window_end: string | null;
  status: 'DRAFT' | 'OPEN' | 'CLOSED' | 'EXECUTED' | 'COMPLETED' | 'CANCELLED';
  coordination_fee_per_household_cents: number;
  max_households: number | null;
  retail_equivalent_total_cents: number | null;
  bulk_estimate_total_cents: number | null;
  bulk_actual_total_cents: number | null;
  created_at: string;
  updated_at: string;
  // Enriched fields from detail endpoint
  packs?: WCLEPack[];
  pledge_count?: number;
  organizer_username?: string | null;
  scenario_meta?: WCLEScenarioMeta | null;
}

export interface WCLEPackItem {
  name: string;
  unit: string;
  qty: number;
  retail_unit_price_cents: number;
  bulk_unit_price_cents: number;
  category: string;
}

export interface WCLEPack {
  id: number;
  run_id: number;
  name: string;
  description: string | null;
  items: WCLEPackItem[];
  adjustable_quantities: boolean;
  waste_buffer_bps: number;
  retail_estimate_cents: number | null;
  bulk_estimate_cents: number | null;
  created_at: string;
  updated_at: string;
}

export interface WCLEPledge {
  id: number;
  run_id: number;
  user_id: number;
  pack_id: number | null;
  custom_items: WCLEPackItem[] | null;
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED' | 'FULFILLED' | 'NO_SHOW';
  estimated_retail_cents: number | null;
  estimated_bulk_cents: number | null;
  final_allocated_bulk_cents: number | null;
  final_coordination_fee_cents: number | null;
  final_total_cents: number | null;
  savings_cents: number | null;
  pickup_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  // Enriched from my-pledges
  run_title?: string | null;
  run_status?: string | null;
  run_date?: string | null;
}

export interface WCLEReceipt {
  id: number;
  run_id: number;
  receipt_type: string;
  receipt_hash: string;
  receipt_meta: Record<string, unknown> | null;
  bulk_actual_total_cents: number;
  created_at: string;
}

export interface WCLEBaselinePrice {
  id: number;
  item_key: string;
  retailer: string;
  price_cents: number;
  unit: string;
  postcode: string | null;
  captured_at: string;
  source_note: string | null;
  created_at: string;
}

export interface WCLESavingsSummary {
  savings_this_week_cents: number;
  savings_this_month_cents: number;
  savings_this_year_cents: number;
  savings_lifetime_cents: number;
  runs_participated: number;
  participation_streak_weeks: number;
}

export interface WCLECommunitySavings {
  total_savings_cents: number;
}

export interface AggregatedItem {
  name: string;
  unit: string;
  total_qty: number;
}

export interface RunsListResponse {
  runs: WCLERun[];
  total: number;
  page: number;
  per_page: number;
}

export interface OrganizerPanelData {
  run: WCLERun;
  packs: WCLEPack[];
  pledges: WCLEPledge[];
  aggregated_quantities: AggregatedItem[];
}

function normalizeRun(run: WCLERun): WCLERun {
  return {
    ...run,
    scenario_meta: normalizeScenarioMeta(run.scenario_meta),
  };
}

function normalizeRunsResponse(response: RunsListResponse): RunsListResponse {
  return {
    ...response,
    runs: (response.runs || []).map(normalizeRun),
  };
}

function normalizeRunPayload(payload: Partial<WCLERun>): Partial<WCLERun> {
  if (!Object.prototype.hasOwnProperty.call(payload, 'scenario_meta')) {
    return payload;
  }

  return {
    ...payload,
    scenario_meta: normalizeScenarioMeta(payload.scenario_meta ?? null),
  };
}

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

export const wcleApi = {
  // Runs
  listRuns: (params?: { postcode?: string; supplier_type?: string; status?: string; page?: number }) => {
    const query = new URLSearchParams();
    if (params?.postcode) query.set('postcode', params.postcode);
    if (params?.supplier_type) query.set('supplier_type', params.supplier_type);
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));
    const qs = query.toString();
    return apiFetch<RunsListResponse>(`/api/wcle/runs${qs ? `?${qs}` : ''}`)
      .then(normalizeRunsResponse);
  },

  getRun: (id: number) =>
    apiFetch<WCLERun>(`/api/wcle/runs/${id}`)
      .then(normalizeRun),

  createRun: (data: Partial<WCLERun>) =>
    apiFetch<WCLERun>('/api/wcle/runs', {
      method: 'POST',
      body: JSON.stringify(normalizeRunPayload(data)),
    })
      .then(normalizeRun),

  updateRun: (id: number, data: Partial<WCLERun>) =>
    apiFetch<WCLERun>(`/api/wcle/runs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(normalizeRunPayload(data)),
    })
      .then(normalizeRun),

  openRun: (id: number) =>
    apiFetch<WCLERun>(`/api/wcle/runs/${id}/open`, { method: 'POST' })
      .then(normalizeRun),

  closeRun: (id: number) =>
    apiFetch<WCLERun>(`/api/wcle/runs/${id}/close`, { method: 'POST' })
      .then(normalizeRun),

  executeRun: (id: number) =>
    apiFetch<WCLERun>(`/api/wcle/runs/${id}/execute`, { method: 'POST' })
      .then(normalizeRun),

  completeRun: (id: number, bulk_actual_total_cents?: number) =>
    apiFetch<WCLERun>(`/api/wcle/runs/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ bulk_actual_total_cents }),
    })
      .then(normalizeRun),

  cancelRun: (id: number) =>
    apiFetch<WCLERun>(`/api/wcle/runs/${id}/cancel`, { method: 'POST' })
      .then(normalizeRun),

  getOrganizerPanel: (id: number) =>
    apiFetch<OrganizerPanelData>(`/api/wcle/runs/${id}/organizer`)
      .then((panel) => ({
        ...panel,
        run: normalizeRun(panel.run),
      })),

  myRuns: () =>
    apiFetch<WCLERun[]>('/api/wcle/my-runs')
      .then((runs) => runs.map(normalizeRun)),

  // Packs
  listPacks: (runId: number) =>
    apiFetch<WCLEPack[]>(`/api/wcle/runs/${runId}/packs`),

  createPack: (runId: number, data: { name: string; items: WCLEPackItem[]; description?: string; adjustable_quantities?: boolean; waste_buffer_bps?: number }) =>
    apiFetch<WCLEPack>(`/api/wcle/runs/${runId}/packs`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Pledges
  listPledges: (runId: number, status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return apiFetch<WCLEPledge[]>(`/api/wcle/runs/${runId}/pledges${qs}`);
  },

  createPledge: (runId: number, data: { pack_id?: number; custom_items?: WCLEPackItem[] }) =>
    apiFetch<WCLEPledge>(`/api/wcle/runs/${runId}/pledges`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  confirmPledge: (pledgeId: number) =>
    apiFetch<WCLEPledge>(`/api/wcle/pledges/${pledgeId}/confirm`, { method: 'POST' }),

  cancelPledge: (pledgeId: number) =>
    apiFetch<WCLEPledge>(`/api/wcle/pledges/${pledgeId}/cancel`, { method: 'POST' }),

  fulfilPledge: (pledgeId: number) =>
    apiFetch<WCLEPledge>(`/api/wcle/pledges/${pledgeId}/fulfil`, { method: 'POST' }),

  noShowPledge: (pledgeId: number) =>
    apiFetch<WCLEPledge>(`/api/wcle/pledges/${pledgeId}/no-show`, { method: 'POST' }),

  myPledges: () =>
    apiFetch<WCLEPledge[]>('/api/wcle/my-pledges'),

  // Receipts
  listReceipts: (runId: number) =>
    apiFetch<WCLEReceipt[]>(`/api/wcle/runs/${runId}/receipts`),

  createReceipt: (runId: number, data: { bulk_actual_total_cents: number; receipt_type?: string; receipt_meta?: Record<string, unknown> }) =>
    apiFetch<WCLEReceipt>(`/api/wcle/runs/${runId}/receipts`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Baseline Prices
  listBaselinePrices: (params?: { item_key?: string; retailer?: string }) => {
    const query = new URLSearchParams();
    if (params?.item_key) query.set('item_key', params.item_key);
    if (params?.retailer) query.set('retailer', params.retailer);
    const qs = query.toString();
    return apiFetch<WCLEBaselinePrice[]>(`/api/wcle/baseline-prices${qs ? `?${qs}` : ''}`);
  },

  // Savings
  mySavings: () =>
    apiFetch<WCLESavingsSummary>('/api/wcle/savings/me'),

  communitySavings: (microcosmId?: number) => {
    const qs = microcosmId ? `?microcosm_id=${microcosmId}` : '';
    return apiFetch<WCLECommunitySavings>(`/api/wcle/savings/community${qs}`);
  },
};
