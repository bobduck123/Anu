import { getCoreApiBase } from '@/lib/runtime';

export interface ArchiveDegradedHonesty {
  isDegraded: boolean;
  reason: string | null;
  fallback: string | null;
}

export interface PublicTrustReportSummary {
  id: number;
  slug: string;
  title: string;
  summary: string;
  reportType: string;
  status: string;
  nodeSlug: string;
  jurisdiction: string | null;
  publishedAt: string | null;
  effectiveAt: string | null;
  sourceNotes: string;
  freshnessHint: string | null;
  publicVisibility: boolean;
  recordRoute: string | null;
}

export interface PublicTrustReportDetail extends PublicTrustReportSummary {
  body: string;
  sections: Array<Record<string, unknown>>;
  provenanceSummary: string;
  archiveRecordId: number | null;
  sponsorDisclosureRef: string | null;
}

export interface PublicArchiveRecord {
  id: number;
  slug: string;
  recordType: string;
  title: string;
  summary: string;
  nodeSlug: string;
  visibilityClass: string;
  verificationStatus: string;
  lastVerifiedAt: string | null;
  sourceRoute: string;
  provenanceSummary: string;
  sponsorContext: string | null;
  redactionNote: string | null;
}

export interface PublicTrustReportListResult {
  reports: PublicTrustReportSummary[];
  degradedHonesty: ArchiveDegradedHonesty;
}

export interface PublicTrustReportDetailResult {
  report: PublicTrustReportDetail | null;
  archiveRecord: PublicArchiveRecord | null;
  degradedHonesty: ArchiveDegradedHonesty;
}

export interface PublicArchiveHandoffResult {
  archiveRecord: PublicArchiveRecord;
  trustReport: PublicTrustReportDetail | null;
  deepLinks: {
    archive: string;
    transparency: string;
  };
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

function toTrustReportSummary(value: unknown): PublicTrustReportSummary {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    id: Number(row.id ?? 0),
    slug: String(row.slug ?? ''),
    title: String(row.title ?? ''),
    summary: String(row.summary ?? ''),
    reportType: String(row.report_type ?? ''),
    status: String(row.status ?? ''),
    nodeSlug: String(row.node_slug ?? ''),
    jurisdiction: row.jurisdiction ? String(row.jurisdiction) : null,
    publishedAt: row.published_at ? String(row.published_at) : null,
    effectiveAt: row.effective_at ? String(row.effective_at) : null,
    sourceNotes: String(row.source_notes ?? ''),
    freshnessHint: row.freshness_hint ? String(row.freshness_hint) : null,
    publicVisibility: Boolean(row.public_visibility),
    recordRoute: row.record_route ? String(row.record_route) : null,
  };
}

function toTrustReportDetail(value: unknown): PublicTrustReportDetail {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    ...toTrustReportSummary(row),
    body: String(row.body ?? ''),
    sections: Array.isArray(row.sections) ? (row.sections as Array<Record<string, unknown>>) : [],
    provenanceSummary: String(row.provenance_summary ?? ''),
    archiveRecordId: typeof row.archive_record_id === 'number' ? row.archive_record_id : null,
    sponsorDisclosureRef: row.sponsor_disclosure_ref ? String(row.sponsor_disclosure_ref) : null,
  };
}

function toArchiveRecord(value: unknown): PublicArchiveRecord {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    id: Number(row.id ?? 0),
    slug: String(row.slug ?? ''),
    recordType: String(row.record_type ?? ''),
    title: String(row.title ?? ''),
    summary: String(row.summary ?? ''),
    nodeSlug: String(row.node_slug ?? ''),
    visibilityClass: String(row.visibility_class ?? ''),
    verificationStatus: String(row.verification_status ?? ''),
    lastVerifiedAt: row.last_verified_at ? String(row.last_verified_at) : null,
    sourceRoute: String(row.source_route ?? ''),
    provenanceSummary: String(row.provenance_summary ?? ''),
    sponsorContext: row.sponsor_context ? String(row.sponsor_context) : null,
    redactionNote: row.redaction_note ? String(row.redaction_note) : null,
  };
}

function getPublicApiBase(): string {
  return getCoreApiBase({ server: true });
}

export async function fetchPublicTrustReports(limit: number = 12): Promise<PublicTrustReportListResult> {
  const base = getPublicApiBase();
  try {
    const res = await fetch(`${base}/public/trust/reports?limit=${encodeURIComponent(String(limit))}`, { cache: 'no-store' });
    if (!res.ok) {
      return {
        reports: [],
        degradedHonesty: {
          isDegraded: true,
          reason: `trust_report_list_http_${res.status}`,
          fallback: 'Trust report index is temporarily unavailable.',
        },
      };
    }

    const payload = (await res.json()) as OkEnvelope<{
      reports: unknown[];
      degraded_honesty: unknown;
    }>;
    if (!payload?.ok) {
      return {
        reports: [],
        degradedHonesty: {
          isDegraded: true,
          reason: 'trust_report_list_contract_error',
          fallback: 'Trust report index returned an unexpected payload.',
        },
      };
    }

    return {
      reports: Array.isArray(payload.data.reports) ? payload.data.reports.map(toTrustReportSummary) : [],
      degradedHonesty: toDegradedHonesty(payload.data.degraded_honesty),
    };
  } catch {
    return {
      reports: [],
      degradedHonesty: {
        isDegraded: true,
        reason: 'trust_report_list_fetch_failed',
        fallback: 'Trust report index could not be loaded.',
      },
    };
  }
}

export async function fetchPublicTrustReportDetail(reportRef: string): Promise<PublicTrustReportDetailResult> {
  const base = getPublicApiBase();
  try {
    const res = await fetch(`${base}/public/trust/reports/${encodeURIComponent(reportRef)}`, { cache: 'no-store' });
    if (!res.ok) {
      return {
        report: null,
        archiveRecord: null,
        degradedHonesty: {
          isDegraded: true,
          reason: `trust_report_detail_http_${res.status}`,
          fallback: 'Trust report detail is not available for this record.',
        },
      };
    }

    const payload = (await res.json()) as OkEnvelope<{
      report: unknown;
      archive_record: unknown | null;
      degraded_honesty: unknown;
    }>;
    if (!payload?.ok || !payload.data?.report) {
      return {
        report: null,
        archiveRecord: null,
        degradedHonesty: {
          isDegraded: true,
          reason: 'trust_report_detail_contract_error',
          fallback: 'Trust report detail returned an unexpected payload.',
        },
      };
    }

    return {
      report: toTrustReportDetail(payload.data.report),
      archiveRecord: payload.data.archive_record ? toArchiveRecord(payload.data.archive_record) : null,
      degradedHonesty: toDegradedHonesty(payload.data.degraded_honesty),
    };
  } catch {
    return {
      report: null,
      archiveRecord: null,
      degradedHonesty: {
        isDegraded: true,
        reason: 'trust_report_detail_fetch_failed',
        fallback: 'Trust report detail could not be loaded.',
      },
    };
  }
}

export async function fetchPublicArchiveHandoff(recordSlug: string): Promise<PublicArchiveHandoffResult | null> {
  const base = getPublicApiBase();
  try {
    const res = await fetch(`${base}/public/archive-handoffs/${encodeURIComponent(recordSlug)}`, { cache: 'no-store' });
    if (!res.ok) {
      return null;
    }

    const payload = (await res.json()) as OkEnvelope<{
      archive_record: unknown;
      trust_report: unknown | null;
      deep_links: { archive: string; transparency: string };
    }>;
    if (!payload?.ok || !payload.data?.archive_record) {
      return null;
    }

    return {
      archiveRecord: toArchiveRecord(payload.data.archive_record),
      trustReport: payload.data.trust_report ? toTrustReportDetail(payload.data.trust_report) : null,
      deepLinks: payload.data.deep_links,
    };
  } catch {
    return null;
  }
}
