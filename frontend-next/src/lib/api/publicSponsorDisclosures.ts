import { getCoreApiBase } from '@/lib/runtime';
import type { ArchiveDegradedHonesty } from '@/lib/api/publicTrust';

export interface PublicSponsorDisclosure {
  id: number;
  slug: string;
  sponsorName: string;
  sponsorType: string | null;
  sponsoredSurface: string;
  placementType: string;
  disclosureLabel: string;
  publicNote: string;
  disclosureText: string;
  activeFrom: string | null;
  activeUntil: string | null;
  isActive: boolean;
  isCurrentlyActive: boolean;
  trustReportSlug: string | null;
  archiveRecordSlug: string | null;
  relatedRoutes: {
    surface: string;
    transparency: string;
    trustReport?: string;
    archiveRecord?: string;
  };
}

export interface PublicSponsorDisclosureFeed {
  disclosures: PublicSponsorDisclosure[];
  disclosureState: 'live' | 'none_published' | 'degraded';
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

function toSponsorDisclosure(value: unknown): PublicSponsorDisclosure {
  const row = (value ?? {}) as Record<string, unknown>;
  const relatedRoutesRecord = (row.related_routes ?? {}) as Record<string, unknown>;
  return {
    id: Number(row.id ?? 0),
    slug: String(row.slug ?? ''),
    sponsorName: String(row.sponsor_name ?? ''),
    sponsorType: row.sponsor_type ? String(row.sponsor_type) : null,
    sponsoredSurface: String(row.sponsored_surface ?? ''),
    placementType: String(row.placement_type ?? ''),
    disclosureLabel: String(row.disclosure_label ?? 'Sponsor disclosure'),
    publicNote: String(row.public_note ?? ''),
    disclosureText: String(row.disclosure_text ?? ''),
    activeFrom: row.active_from ? String(row.active_from) : null,
    activeUntil: row.active_until ? String(row.active_until) : null,
    isActive: Boolean(row.is_active),
    isCurrentlyActive: Boolean(row.is_currently_active),
    trustReportSlug: row.trust_report_slug ? String(row.trust_report_slug) : null,
    archiveRecordSlug: row.archive_record_slug ? String(row.archive_record_slug) : null,
    relatedRoutes: {
      surface: String(relatedRoutesRecord.surface ?? ''),
      transparency: String(relatedRoutesRecord.transparency ?? '/transparency'),
      trustReport: relatedRoutesRecord.trust_report ? String(relatedRoutesRecord.trust_report) : undefined,
      archiveRecord: relatedRoutesRecord.archive_record ? String(relatedRoutesRecord.archive_record) : undefined,
    },
  };
}

function buildBaseUrl(): string {
  return getCoreApiBase({ server: typeof window === 'undefined' });
}

function buildQuery(params: {
  surface?: string;
  report?: string;
  archive?: string;
  limit?: number;
  includeInactive?: boolean;
}): string {
  const search = new URLSearchParams();
  if (params.surface) {
    search.set('surface', params.surface);
  }
  if (params.report) {
    search.set('report', params.report);
  }
  if (params.archive) {
    search.set('archive', params.archive);
  }
  if (typeof params.limit === 'number') {
    search.set('limit', String(params.limit));
  }
  if (params.includeInactive) {
    search.set('include_inactive', 'true');
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function fetchPublicSponsorDisclosures(params: {
  surface?: string;
  report?: string;
  archive?: string;
  limit?: number;
  includeInactive?: boolean;
} = {}): Promise<PublicSponsorDisclosureFeed> {
  const base = buildBaseUrl();
  const query = buildQuery(params);

  try {
    const res = await fetch(`${base}/public/transparency/sponsor-disclosures${query}`, { cache: 'no-store' });
    if (!res.ok) {
      return {
        disclosures: [],
        disclosureState: 'degraded',
        degradedHonesty: {
          isDegraded: true,
          reason: `sponsor_disclosure_http_${res.status}`,
          fallback: 'Sponsor disclosure contract is temporarily unavailable.',
        },
      };
    }

    const payload = (await res.json()) as OkEnvelope<{
      disclosures: unknown[];
      disclosure_state: 'live' | 'none_published' | 'degraded';
      degraded_honesty: unknown;
    }>;
    if (!payload?.ok) {
      return {
        disclosures: [],
        disclosureState: 'degraded',
        degradedHonesty: {
          isDegraded: true,
          reason: 'sponsor_disclosure_contract_error',
          fallback: 'Sponsor disclosure payload is not available in this environment.',
        },
      };
    }

    return {
      disclosures: Array.isArray(payload.data.disclosures) ? payload.data.disclosures.map(toSponsorDisclosure) : [],
      disclosureState: payload.data.disclosure_state ?? 'live',
      degradedHonesty: toDegradedHonesty(payload.data.degraded_honesty),
    };
  } catch {
    return {
      disclosures: [],
      disclosureState: 'degraded',
      degradedHonesty: {
        isDegraded: true,
        reason: 'sponsor_disclosure_fetch_failed',
        fallback: 'Sponsor disclosure data could not be loaded.',
      },
    };
  }
}
