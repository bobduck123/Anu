import Link from 'next/link';
import type { PublicArchivePagination, PublicArchiveSummaryRecord } from '@/lib/api/publicArchive';
import type { ArchiveDegradedHonesty } from '@/lib/api/publicTrust';
import { getRoutePurpose } from '@/ui-system/anu/routePurposeRegistry';
import { getThresholdDefinition, getThresholdForRoute } from '@/ui-system/anu/thresholdRegistry';

interface ArchiveShellProps {
  records: PublicArchiveSummaryRecord[];
  pagination: PublicArchivePagination;
  availableRecordTypes: string[];
  appliedRecordTypeFilter: string | null;
  appliedTitlePrefixFilter: string | null;
  degradedHonesty: ArchiveDegradedHonesty;
}

function formatDate(value: string | null): string {
  if (!value) {
    return 'Unknown';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function toTypeLabel(value: string): string {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

function buildArchiveHref(page: number, recordType: string | null, titlePrefix: string | null): string {
  const params = new URLSearchParams();
  if (recordType) {
    params.set('type', recordType);
  }
  if (titlePrefix) {
    params.set('title_prefix', titlePrefix);
  }
  if (page > 1) {
    params.set('page', String(page));
  }
  const query = params.toString();
  return query ? `/archive?${query}` : '/archive';
}

export function ArchiveShell({
  records,
  pagination,
  availableRecordTypes,
  appliedRecordTypeFilter,
  appliedTitlePrefixFilter,
  degradedHonesty,
}: ArchiveShellProps) {
  const routePurpose = getRoutePurpose('/archive');
  const thresholdKey = getThresholdForRoute('/archive');
  const threshold = getThresholdDefinition(thresholdKey);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="card-civic space-y-3">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">Archive</p>
        <h1 className="text-3xl font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
          Public memory records
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {routePurpose?.purpose ?? 'Canonical institutional memory route for public trust and governance citations.'}
        </p>
        <div className="grid gap-3 text-xs text-[var(--color-muted-foreground)] md:grid-cols-2">
          <p>Threshold: {thresholdKey} ({threshold.summary})</p>
          <p>Trust requirement: {routePurpose?.provenanceTrustRequirement ?? 'Provenance must be explicit.'}</p>
        </div>
      </header>

      <section className="card-civic space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">Record type filters</p>
          <span className="text-xs text-[var(--color-muted-foreground)]">
            Active: {appliedRecordTypeFilter ? toTypeLabel(appliedRecordTypeFilter) : 'All'}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={buildArchiveHref(1, null, appliedTitlePrefixFilter)}
            className={`btn-pill text-sm ${appliedRecordTypeFilter ? 'btn-pill-secondary' : 'btn-pill-primary'}`}
          >
            All records
          </Link>
          {availableRecordTypes.map((recordType) => {
            const isActive = appliedRecordTypeFilter === recordType;
            return (
              <Link
                key={recordType}
                href={buildArchiveHref(1, recordType, appliedTitlePrefixFilter)}
                className={`btn-pill text-sm ${isActive ? 'btn-pill-primary' : 'btn-pill-secondary'}`}
              >
                {toTypeLabel(recordType)}
              </Link>
            );
          })}
        </div>

        <form action="/archive" method="get" className="grid gap-2 rounded-xl border border-[var(--color-border)] p-3 md:grid-cols-[1fr_auto_auto]">
          {appliedRecordTypeFilter ? <input type="hidden" name="type" value={appliedRecordTypeFilter} /> : null}
          <input
            type="text"
            name="title_prefix"
            defaultValue={appliedTitlePrefixFilter ?? ''}
            placeholder="Filter by title prefix"
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
          />
          <button type="submit" className="btn-pill btn-pill-primary text-sm">Apply prefix</button>
          {appliedTitlePrefixFilter ? (
            <Link href={buildArchiveHref(1, appliedRecordTypeFilter, null)} className="btn-pill btn-pill-secondary text-sm">
              Clear
            </Link>
          ) : null}
        </form>
      </section>

      {degradedHonesty.isDegraded ? (
        <section className="card-civic border-[var(--color-warning)]/40">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-warning)]">Degraded honesty</p>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
            {degradedHonesty.fallback ?? 'Live archive records are unavailable right now.'}
          </p>
          {degradedHonesty.reason ? (
            <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">Reason: {degradedHonesty.reason}</p>
          ) : null}
        </section>
      ) : null}

      <section className="card-civic space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">Canonical record index</p>
          <span className="text-xs text-[var(--color-muted-foreground)]">{records.length} visible</span>
        </div>

        {records.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] p-4 text-sm text-[var(--color-muted-foreground)]">
            {appliedRecordTypeFilter && appliedTitlePrefixFilter
              ? `No public archive records are currently available for ${toTypeLabel(appliedRecordTypeFilter)} with title prefix "${appliedTitlePrefixFilter}".`
              : appliedRecordTypeFilter
                ? `No public archive records are currently available for ${toTypeLabel(appliedRecordTypeFilter)}.`
                : appliedTitlePrefixFilter
                  ? `No public archive records are currently available for title prefix "${appliedTitlePrefixFilter}".`
                  : 'No public archive records are currently available for this node scope.'}
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((record) => (
              <article key={record.slug} className="rounded-xl border border-[var(--color-border)] p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
                      {record.title}
                    </h2>
                    <p className="text-[var(--color-muted-foreground)]">{record.summary}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-[var(--color-border)] px-2 py-1 text-xs">
                      {toTypeLabel(record.recordType)}
                    </span>
                    <span className="rounded-full border border-[var(--color-border)] px-2 py-1 text-xs">
                      {record.status}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-xs text-[var(--color-muted-foreground)] md:grid-cols-2">
                  <p>Published: {formatDate(record.publishedAt)}</p>
                  <p>Effective: {formatDate(record.effectiveAt)}</p>
                  <p>Freshness: {record.freshnessHint ?? 'Not provided'}</p>
                  <p>Source route: {record.sourceRoute}</p>
                  <p className="md:col-span-2">Provenance: {record.provenanceLabel}</p>
                </div>

                {record.isTrustLinked ? (
                  <div className="mt-3 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface-alt)]/35 px-3 py-2 text-xs text-[var(--color-muted-foreground)]">
                    Trust-linked record: this summary has a related public trust report and remains separate from sponsor disclosure metadata.
                  </div>
                ) : null}
                {record.isDecisionLinked ? (
                  <div className="mt-3 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface-alt)]/35 px-3 py-2 text-xs text-[var(--color-muted-foreground)]">
                    Decision-linked record: this summary has a public-safe decision register projection, with restricted decision detail remaining docs-only.
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={record.recordRoute} className="btn-pill btn-pill-primary text-sm">
                    Open archive record
                  </Link>
                  {record.relatedDecisionRoute ? (
                    <Link href={record.relatedDecisionRoute} className="btn-pill btn-pill-secondary text-sm">
                      Open decision summary
                    </Link>
                  ) : null}
                  {record.relatedTrustReportRoute ? (
                    <Link href={record.relatedTrustReportRoute} className="btn-pill btn-pill-secondary text-sm">
                      Open related trust context
                    </Link>
                  ) : null}
                  {record.relatedRoute &&
                  record.relatedRoute !== record.relatedTrustReportRoute &&
                  record.relatedRoute !== record.relatedDecisionRoute ? (
                    <Link href={record.relatedRoute} className="btn-pill btn-pill-secondary text-sm">
                      Open source route
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-3">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Page {pagination.page} of {Math.max(1, pagination.totalPages)} | {pagination.totalRecords} total records
          </p>
          <div className="flex flex-wrap gap-2">
            {pagination.hasPrevious && pagination.previousPage ? (
              <Link href={buildArchiveHref(pagination.previousPage, appliedRecordTypeFilter, appliedTitlePrefixFilter)} className="btn-pill btn-pill-secondary text-sm">
                Previous page
              </Link>
            ) : null}
            {pagination.hasMore && pagination.nextPage ? (
              <Link href={buildArchiveHref(pagination.nextPage, appliedRecordTypeFilter, appliedTitlePrefixFilter)} className="btn-pill btn-pill-primary text-sm">
                Next page
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="card-civic">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">Onward links</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/trust" className="btn-pill btn-pill-secondary text-sm">Trust center</Link>
          <Link href="/transparency" className="btn-pill btn-pill-secondary text-sm">Open transparency</Link>
          <Link href="/governance/model-registry" className="btn-pill btn-pill-secondary text-sm">Model registry context</Link>
        </div>
      </section>
    </div>
  );
}
