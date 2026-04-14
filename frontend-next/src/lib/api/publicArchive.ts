import { getCoreApiBase } from '@/lib/runtime';
import type { ArchiveDegradedHonesty } from '@/lib/api/publicTrust';
import { emitPlaneLog } from '@/lib/observability/planeLog';

export interface PublicArchiveSummaryRecord {
  recordRef: string;
  slug: string;
  title: string;
  recordType: string;
  summary: string;
  provenanceLabel: string;
  sourceLabel: string;
  sourceRoute: string;
  verificationStatus: string;
  status: string;
  publishedAt: string | null;
  effectiveAt: string | null;
  freshnessHint: string | null;
  relatedTrustReportSlug: string | null;
  relatedTrustReportRoute: string | null;
  relatedDecisionId: string | null;
  relatedDecisionRoute: string | null;
  relatedRoute: string | null;
  recordRoute: string;
  isTrustLinked: boolean;
  isDecisionLinked: boolean;
}

export interface PublicArchivePagination {
  model: 'offset';
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasMore: boolean;
  hasPrevious: boolean;
  nextPage: number | null;
  previousPage: number | null;
  ordering: string[];
}

export interface PublicArchiveAppliedFilters {
  recordType: string | null;
  titlePrefix: string | null;
  nodeSlug: string | null;
}

export interface PublicArchiveSummaryFeed {
  records: PublicArchiveSummaryRecord[];
  pagination: PublicArchivePagination;
  availableRecordTypes: string[];
  appliedFilters: PublicArchiveAppliedFilters;
  appliedRecordTypeFilter: string | null;
  appliedTitlePrefixFilter: string | null;
  degradedHonesty: ArchiveDegradedHonesty;
}

interface OkEnvelope<T> {
  ok: boolean;
  data: T;
}

function toDegradedHonesty(value: unknown): ArchiveDegradedHonesty {
  const record = (value ?? {}) as Record<string, unknown>;
  return {
    isDegraded: Boolean(record.is_degraded ?? record.isDegraded),
    reason: (record.reason as string | null | undefined) ?? null,
    fallback: (record.fallback as string | null | undefined) ?? null,
  };
}

function toArchiveSummaryRecord(value: unknown): PublicArchiveSummaryRecord {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    recordRef: String(row.record_ref ?? row.slug ?? ''),
    slug: String(row.slug ?? ''),
    title: String(row.title ?? ''),
    recordType: String(row.record_type ?? ''),
    summary: String(row.summary ?? ''),
    provenanceLabel: String(row.provenance_label ?? ''),
    sourceLabel: String(row.source_label ?? ''),
    sourceRoute: String(row.source_route ?? ''),
    verificationStatus: String(row.verification_status ?? ''),
    status: String(row.status ?? ''),
    publishedAt: row.published_at ? String(row.published_at) : null,
    effectiveAt: row.effective_at ? String(row.effective_at) : null,
    freshnessHint: row.freshness_hint ? String(row.freshness_hint) : null,
    relatedTrustReportSlug: row.related_trust_report_slug ? String(row.related_trust_report_slug) : null,
    relatedTrustReportRoute: row.related_trust_report_route ? String(row.related_trust_report_route) : null,
    relatedDecisionId: row.related_decision_id ? String(row.related_decision_id) : null,
    relatedDecisionRoute: row.related_decision_route ? String(row.related_decision_route) : null,
    relatedRoute: row.related_route ? String(row.related_route) : null,
    recordRoute: String(row.record_route ?? `/archive/${String(row.slug ?? '')}`),
    isTrustLinked: Boolean(row.is_trust_linked),
    isDecisionLinked: Boolean(row.is_decision_linked),
  };
}

function toPagination(value: unknown, defaults: { page: number; pageSize: number }): PublicArchivePagination {
  const row = (value ?? {}) as Record<string, unknown>;
  const model = row.model === 'offset' ? 'offset' : 'offset';
  const page = Number(row.page ?? defaults.page);
  const pageSize = Number(row.page_size ?? defaults.pageSize);
  return {
    model,
    page: Number.isFinite(page) && page > 0 ? page : defaults.page,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : defaults.pageSize,
    totalRecords: Number(row.total_records ?? 0),
    totalPages: Number(row.total_pages ?? 0),
    hasMore: Boolean(row.has_more),
    hasPrevious: Boolean(row.has_previous),
    nextPage: typeof row.next_page === 'number' ? row.next_page : null,
    previousPage: typeof row.previous_page === 'number' ? row.previous_page : null,
    ordering: Array.isArray(row.ordering) ? row.ordering.map((entry) => String(entry)) : ['updated_at:desc', 'id:desc'],
  };
}

function toAppliedFilters(value: unknown): PublicArchiveAppliedFilters {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    recordType: row.record_type ? String(row.record_type) : null,
    titlePrefix: row.title_prefix ? String(row.title_prefix) : null,
    nodeSlug: row.node_slug ? String(row.node_slug) : null,
  };
}

function buildBaseUrl(): string {
  return getCoreApiBase({ server: typeof window === 'undefined' });
}

function buildQuery(params: { page?: number; pageSize?: number; recordType?: string; titlePrefix?: string; node?: string }): string {
  const search = new URLSearchParams();
  if (typeof params.page === 'number') {
    search.set('page', String(params.page));
  }
  if (typeof params.pageSize === 'number') {
    search.set('page_size', String(params.pageSize));
  }
  if (params.recordType) {
    search.set('type', params.recordType);
  }
  if (params.titlePrefix) {
    search.set('title_prefix', params.titlePrefix);
  }
  if (params.node) {
    search.set('node', params.node);
  }

  const query = search.toString();
  return query ? `?${query}` : '';
}

function buildFallbackPagination(params: { page: number; pageSize: number }): PublicArchivePagination {
  return {
    model: 'offset',
    page: params.page,
    pageSize: params.pageSize,
    totalRecords: 0,
    totalPages: 0,
    hasMore: false,
    hasPrevious: params.page > 1,
    nextPage: null,
    previousPage: params.page > 1 ? params.page - 1 : null,
    ordering: ['updated_at:desc', 'id:desc'],
  };
}

function logPublicArchiveEvent(
  eventName: string,
  level: 'debug' | 'info' | 'warn' | 'error',
  context: Record<string, unknown>,
) {
  emitPlaneLog({
    plane: 'public',
    serviceName: 'frontend-next',
    eventName,
    level,
    context,
  });
}

export async function fetchPublicArchiveSummaries(params: {
  page?: number;
  pageSize?: number;
  recordType?: string;
  titlePrefix?: string;
  node?: string;
} = {}): Promise<PublicArchiveSummaryFeed> {
  const safePage = Math.max(1, params.page ?? 1);
  const safePageSize = Math.max(1, Math.min(params.pageSize ?? 12, 100));
  const base = buildBaseUrl();
  const query = buildQuery({ ...params, page: safePage, pageSize: safePageSize });

  try {
    const res = await fetch(`${base}/public/archive/records${query}`, { cache: 'no-store' });
    const responseRequestId = res.headers.get('x-request-id');
    if (!res.ok) {
      logPublicArchiveEvent('public_archive_fetch_http_error', 'warn', {
        status: res.status,
        page: safePage,
        pageSize: safePageSize,
        recordType: params.recordType ?? null,
        titlePrefix: params.titlePrefix ?? null,
        node: params.node ?? null,
        requestId: responseRequestId,
      });
      return {
        records: [],
        pagination: buildFallbackPagination({ page: safePage, pageSize: safePageSize }),
        availableRecordTypes: [],
        appliedFilters: {
          recordType: params.recordType ?? null,
          titlePrefix: params.titlePrefix ?? null,
          nodeSlug: params.node ?? null,
        },
        appliedRecordTypeFilter: params.recordType ?? null,
        appliedTitlePrefixFilter: params.titlePrefix ?? null,
        degradedHonesty: {
          isDegraded: true,
          reason: `archive_summary_http_${res.status}`,
          fallback: 'Archive summary feed is temporarily unavailable.',
        },
      };
    }

    const payload = (await res.json()) as OkEnvelope<{
      records: unknown[];
      pagination: unknown;
      available_record_types: unknown[];
      applied_filters: unknown;
      applied_record_type_filter: string | null;
      applied_title_prefix_filter: string | null;
      degraded_honesty: unknown;
    }>;

    if (!payload?.ok) {
      logPublicArchiveEvent('public_archive_fetch_contract_error', 'warn', {
        page: safePage,
        pageSize: safePageSize,
        recordType: params.recordType ?? null,
        titlePrefix: params.titlePrefix ?? null,
        node: params.node ?? null,
        requestId: responseRequestId,
      });
      return {
        records: [],
        pagination: buildFallbackPagination({ page: safePage, pageSize: safePageSize }),
        availableRecordTypes: [],
        appliedFilters: {
          recordType: params.recordType ?? null,
          titlePrefix: params.titlePrefix ?? null,
          nodeSlug: params.node ?? null,
        },
        appliedRecordTypeFilter: params.recordType ?? null,
        appliedTitlePrefixFilter: params.titlePrefix ?? null,
        degradedHonesty: {
          isDegraded: true,
          reason: 'archive_summary_contract_error',
          fallback: 'Archive summary feed returned an unexpected payload.',
        },
      };
    }

    const projectedResult = {
      records: Array.isArray(payload.data.records) ? payload.data.records.map(toArchiveSummaryRecord) : [],
      pagination: toPagination(payload.data.pagination, { page: safePage, pageSize: safePageSize }),
      availableRecordTypes: Array.isArray(payload.data.available_record_types)
        ? payload.data.available_record_types.map((entry) => String(entry))
        : [],
      appliedFilters: toAppliedFilters(payload.data.applied_filters),
      appliedRecordTypeFilter: payload.data.applied_record_type_filter ?? null,
      appliedTitlePrefixFilter: payload.data.applied_title_prefix_filter ?? null,
      degradedHonesty: toDegradedHonesty(payload.data.degraded_honesty),
    };
    if (projectedResult.degradedHonesty.isDegraded) {
      logPublicArchiveEvent('public_archive_fetch_degraded', 'info', {
        page: safePage,
        pageSize: safePageSize,
        recordType: projectedResult.appliedRecordTypeFilter,
        titlePrefix: projectedResult.appliedTitlePrefixFilter,
        reason: projectedResult.degradedHonesty.reason,
        requestId: responseRequestId,
      });
    }
    return projectedResult;
  } catch {
    logPublicArchiveEvent('public_archive_fetch_failed', 'error', {
      page: safePage,
      pageSize: safePageSize,
      recordType: params.recordType ?? null,
      titlePrefix: params.titlePrefix ?? null,
      node: params.node ?? null,
    });
    return {
      records: [],
      pagination: buildFallbackPagination({ page: safePage, pageSize: safePageSize }),
      availableRecordTypes: [],
      appliedFilters: {
        recordType: params.recordType ?? null,
        titlePrefix: params.titlePrefix ?? null,
        nodeSlug: params.node ?? null,
      },
      appliedRecordTypeFilter: params.recordType ?? null,
      appliedTitlePrefixFilter: params.titlePrefix ?? null,
      degradedHonesty: {
        isDegraded: true,
        reason: 'archive_summary_fetch_failed',
        fallback: 'Archive summary feed could not be loaded.',
      },
    };
  }
}
