/**
 * API client for the impact-service (port 5003).
 * Handles memberships, pools, credits, and ledger endpoints.
 */

import { buildParticipantRequestHeaders } from '@/lib/api/client';
import { getImpactApiBase } from '@/lib/runtime';

const IMPACT_API_BASE = getImpactApiBase();

async function impactFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${IMPACT_API_BASE}${path}`, {
    ...options,
    headers: await buildParticipantRequestHeaders({
      headers: options.headers,
      includeContentType: true,
    }),
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const message = payload?.error || payload?.message || 'Request failed';
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }
  return (payload?.data ?? payload) as T;
}

// --- Types ---

export interface ImpactMembershipPlan {
  id: string;
  name: string;
  stripePriceId: string;
  amountCents: number;
  intervalMonths: number;
  creditGrantMonthly: number;
  poolAllocationPct: string;
  isActive: boolean;
}

export interface ImpactSubscription {
  id: string;
  userId: string;
  username: string;
  planId: string;
  plan: ImpactMembershipPlan;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  streakMonths: number;
  lastPaymentAt: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface ImpactPool {
  id: string;
  name: string;
  description: string;
  category: string;
  targetAmountCents: number;
  isActive: boolean;
  balance: number; // computed from ledger SUM
}

export interface LedgerEntry {
  id: string;
  poolId: string;
  entryType: string;
  amountCents: number;
  description: string;
  referenceId: string | null;
  referenceType: string | null;
  reversalOf: string | null;
  createdAt: string;
  createdBy: string;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  subscriptionId: string | null;
  transactionType: string;
  amountCredits: number;
  description: string;
  referenceId: string | null;
  createdAt: string;
}

// --- Membership API ---

export const impactMembershipApi = {
  getPlans: () =>
    impactFetch<ImpactMembershipPlan[]>('/api/memberships/plans'),

  getStatus: () =>
    impactFetch<{ subscription: ImpactSubscription | null }>('/api/memberships/status'),

  subscribe: (planId: string) =>
    impactFetch<{ checkoutUrl: string }>('/api/memberships/subscribe', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    }),

  createPortalSession: () =>
    impactFetch<{ portalUrl: string }>('/api/memberships/portal', {
      method: 'POST',
    }),

  cancel: () =>
    impactFetch<{ message: string }>('/api/memberships/cancel', {
      method: 'DELETE',
    }),
};

// --- Pools API ---

export const impactPoolApi = {
  listPools: () =>
    impactFetch<ImpactPool[]>('/api/pools'),

  getPool: (poolId: string) =>
    impactFetch<ImpactPool>(`/api/pools/${poolId}`),

  getPoolLedger: (poolId: string, page = 1, limit = 50) =>
    impactFetch<{ entries: LedgerEntry[]; total: number; page: number }>(
      `/api/pools/${poolId}/ledger?page=${page}&limit=${limit}`
    ),

  createPool: (data: { name: string; description: string; category: string; targetAmountCents: number }) =>
    impactFetch<ImpactPool>('/api/pools', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  creditPool: (poolId: string, amountCents: number, description: string) =>
    impactFetch<LedgerEntry>(`/api/pools/${poolId}/credit`, {
      method: 'POST',
      body: JSON.stringify({ amountCents, description }),
    }),
};

// --- Credits API ---

export const impactCreditsApi = {
  getBalance: () =>
    impactFetch<{ balance: number; username: string }>('/api/credits/balance'),

  getHistory: (page = 1, limit = 50) =>
    impactFetch<{ transactions: CreditTransaction[]; total: number; page: number }>(
      `/api/credits/history?page=${page}&limit=${limit}`
    ),
};
