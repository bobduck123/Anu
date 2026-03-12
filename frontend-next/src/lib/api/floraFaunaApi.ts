import { brand } from '@/lib/brand';
import { getMemeticsApiBase } from '@/lib/runtime';

const MEMETICS_API_BASE = getMemeticsApiBase();

export class FloraFaunaApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'FloraFaunaApiError';
  }
}

export interface FloraFaunaRequestOptions {
  signal?: AbortSignal;
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function buildApiError(response: Response): Promise<FloraFaunaApiError> {
  let message = `Request failed with ${response.status}`;
  let code: string | undefined;

  try {
    const payload = (await response.json()) as {
      error?: {
        message?: string;
        code?: string;
      };
    };

    if (payload.error?.message) {
      message = payload.error.message;
    }
    if (payload.error?.code) {
      code = payload.error.code;
    }
  } catch {
    // Ignore non-JSON error responses and keep the generic status message.
  }

  return new FloraFaunaApiError(message, response.status, code);
}

async function fetchJson<T>(
  path: string,
  options: RequestInit & {
    fallback?: T;
    fallbackStatuses?: number[];
  } = {},
): Promise<T> {
  const { fallback, fallbackStatuses = [], headers, ...requestOptions } = options;

  try {
    const res = await fetch(`${MEMETICS_API_BASE}${path}`, {
      ...requestOptions,
      headers: {
        Accept: 'application/json',
        ...(requestOptions.body ? { 'Content-Type': 'application/json' } : {}),
        ...(headers || {}),
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      if (fallback !== undefined && fallbackStatuses.includes(res.status)) {
        return fallback;
      }
      throw await buildApiError(res);
    }

    return (await res.json()) as T;
  } catch (error) {
    throw error;
  }
}

export function formatFloraFaunaApiError(error: unknown, fallbackMessage: string): string {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return fallbackMessage;
  }

  if (error instanceof FloraFaunaApiError) {
    if (error.status === 401 || error.status === 403) {
      return 'Organizer access is required to view this data.';
    }
    if (error.status === 404) {
      return `The requested ${brand.memeticsErrorRecordLabel} was not found.`;
    }

    return error.message || fallbackMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

export interface FloraFaunaGeology {
  formKey: string;
  strataSummary: string;
  permeabilityIndex: number;
  volatilityIndex: number;
  stabilityIndex: number;
}

export interface FloraFaunaEcology {
  ecologyIdentity: string;
  identityConfidence: number;
  dominantNutrients: string[];
  nutrientVector: {
    careIndex: number;
    reciprocityIndex: number;
    resonanceIndex: number;
    originalityIndex: number;
    stewardshipIndex: number;
    mycelialDensityIndex: number;
  };
  geology: FloraFaunaGeology;
}

export interface FloraFaunaLineageNode {
  id: string;
  slug: string;
  title: string;
  channelId: string;
}

export interface FloraFaunaLineage {
  parents: Array<{
    relationType: string;
    parentMeme: FloraFaunaLineageNode;
  }>;
  children: Array<{
    relationType: string;
    childMeme: FloraFaunaLineageNode;
  }>;
}

export interface FloraFaunaMeme {
  id: string;
  channelId: string;
  slug: string;
  title: string;
  summary?: string | null;
  body?: string | null;
  mediaUrl?: string | null;
  attentionScore?: number | string | null;
  shareable?: boolean;
  createdAt?: string;
  channel?: {
    id: string;
    slug: string;
    title: string;
  };
  ecology?: FloraFaunaEcology | null;
}

export interface FloraFaunaChannel {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  manifesto?: string | null;
  creatorUserId: string;
  sharePolicy: string;
  createdAt?: string;
  updatedAt?: string;
  memes: FloraFaunaMeme[];
  ecology: FloraFaunaEcology | null;
  moderation: {
    openFlags: number;
    openCases: number;
  };
}

export interface FloraFaunaMemePage extends FloraFaunaMeme {
  lineage: FloraFaunaLineage;
  nutrientSnapshots?: Array<{
    id: string;
    ecologyIdentity: string;
    geologyFormKey?: string;
  }>;
  riskFlags?: Array<{
    id: string;
    flagType: string;
    severity: string;
    reason: string;
  }>;
}

export interface FloraFaunaPool {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  availableBalanceCents: number;
  reservedBalanceCents?: number;
  disbursedBalanceCents?: number;
  policyJson?: Record<string, unknown> | null;
  ledgerAccounts: Array<{
    id: string;
    code: string;
    name: string;
    balanceCents: number;
  }>;
  recentEntries: Array<{
    id: string;
    journalId?: string;
    amountCents: number;
    memo: string;
    createdAt?: string;
    account: {
      code: string;
      name: string;
    };
  }>;
}

export interface FloraFaunaRevenueEvent {
  id: string;
  sourceType: string;
  grossAmountCents: number;
  netAmountCents: number;
  currency: string;
  memo?: string | null;
  recognizedAt: string;
  channel?: { id: string; slug: string; title: string } | null;
  meme?: { id: string; slug: string; title: string } | null;
  subscription?: { id: string; userId: string; username: string } | null;
  attributionSplits: Array<{
    id: string;
    recipientType: string;
    recipientId: string;
    sharePct: number | string;
    amountCents: number;
  }>;
}

export interface FloraFaunaAllocationRequest {
  id: string;
  poolId: string;
  requestedBy: string;
  beneficiaryId: string;
  purpose: string;
  amountCents: number;
  status: string;
  rationale?: string | null;
  createdAt?: string;
  pool?: { id: string; slug: string; name: string };
  disbursements: Array<{
    id: string;
    amountCents: number;
    status: string;
    destinationRef?: string | null;
    createdAt?: string;
  }>;
}

export interface FloraFaunaModerationCase {
  id: string;
  summary: string;
  status: string;
  severity: string;
  createdAt?: string;
  channel?: { id: string; slug: string; title: string } | null;
  meme?: { id: string; slug: string; title: string } | null;
  actions: Array<{
    id: string;
    actionType: string;
    actorId: string;
    notes?: string | null;
    createdAt?: string;
  }>;
  riskFlags: Array<{
    id: string;
    flagType: string;
    severity: string;
    reason: string;
    createdAt?: string;
  }>;
}

export interface FloraFaunaFeedResponse {
  feed: FloraFaunaMeme[];
}

export const floraFaunaApi = {
  getFeed: (options: FloraFaunaRequestOptions = {}) =>
    fetchJson<FloraFaunaFeedResponse>('/api/manara/feed', {
      signal: options.signal,
    }),
  listChannels: (limit = 12, options: FloraFaunaRequestOptions = {}) =>
    fetchJson<{ channels: FloraFaunaChannel[] }>(
      `/api/manara/channels?limit=${limit}`,
      {
        signal: options.signal,
      },
    ),
  listPools: (limit = 12, options: FloraFaunaRequestOptions = {}) =>
    fetchJson<{ pools: FloraFaunaPool[] }>(
      `/api/manara/pools?limit=${limit}`,
      {
        signal: options.signal,
      },
    ),
  getChannel: (channelId: string, options: FloraFaunaRequestOptions = {}) =>
    fetchJson<FloraFaunaChannel | null>(
      `/api/manara/channels/${encodeURIComponent(channelId)}`,
      {
        signal: options.signal,
        fallback: null,
        fallbackStatuses: [404],
      },
    ),
  getEcology: (channelId: string, options: FloraFaunaRequestOptions = {}) =>
    fetchJson<FloraFaunaEcology | null>(
      `/api/manara/channels/${encodeURIComponent(channelId)}/ecology`,
      {
        signal: options.signal,
        fallback: null,
        fallbackStatuses: [404],
      },
    ),
  getMeme: (memeId: string, options: FloraFaunaRequestOptions = {}) =>
    fetchJson<FloraFaunaMemePage | null>(
      `/api/manara/memes/${encodeURIComponent(memeId)}`,
      {
        signal: options.signal,
        fallback: null,
        fallbackStatuses: [404],
      },
    ),
  getPool: (poolId: string, options: FloraFaunaRequestOptions = {}) =>
    fetchJson<FloraFaunaPool | null>(
      `/api/manara/pools/${encodeURIComponent(poolId)}`,
      {
        signal: options.signal,
        fallback: null,
        fallbackStatuses: [404],
      },
    ),
  listRevenueEvents: (limit = 50, options: FloraFaunaRequestOptions = {}) =>
    fetchJson<{ events: FloraFaunaRevenueEvent[] }>(
      `/api/manara/revenue-events?limit=${limit}`,
      {
        signal: options.signal,
        headers: getAuthHeaders(),
      },
    ),
  listAllocationRequests: (limit = 50, poolId?: string, options: FloraFaunaRequestOptions = {}) =>
    fetchJson<{ requests: FloraFaunaAllocationRequest[] }>(
      `/api/manara/allocations?limit=${limit}${poolId ? `&poolId=${encodeURIComponent(poolId)}` : ''}`,
      {
        signal: options.signal,
        headers: getAuthHeaders(),
      },
    ),
  listModerationCases: (limit = 50, status?: string, options: FloraFaunaRequestOptions = {}) =>
    fetchJson<{ cases: FloraFaunaModerationCase[] }>(
      `/api/manara/moderation/cases?limit=${limit}${status ? `&status=${encodeURIComponent(status)}` : ''}`,
      {
        signal: options.signal,
        headers: getAuthHeaders(),
      },
    ),
};

export default floraFaunaApi;
