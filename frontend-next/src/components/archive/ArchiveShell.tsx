import Link from 'next/link';
import type { ArchiveDegradedHonesty, PublicTrustReportSummary } from '@/lib/api/publicTrust';
import { getRoutePurpose } from '@/ui-system/anu/routePurposeRegistry';
import { getThresholdDefinition, getThresholdForRoute } from '@/ui-system/anu/thresholdRegistry';

interface ArchiveShellProps {
  reports: PublicTrustReportSummary[];
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

export function ArchiveShell({ reports, degradedHonesty }: ArchiveShellProps) {
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
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">Published trust records</p>
          <span className="text-xs text-[var(--color-muted-foreground)]">{reports.length} visible</span>
        </div>

        {reports.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] p-4 text-sm text-[var(--color-muted-foreground)]">
            No public trust reports are currently available for this node scope.
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => {
              const detailHref = report.recordRoute ?? `/archive/${report.slug}`;
              return (
                <article key={report.slug} className="rounded-xl border border-[var(--color-border)] p-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
                        {report.title}
                      </h2>
                      <p className="text-[var(--color-muted-foreground)]">{report.summary}</p>
                    </div>
                    <span className="rounded-full border border-[var(--color-border)] px-2 py-1 text-xs">
                      {report.status}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-[var(--color-muted-foreground)] md:grid-cols-2">
                    <p>Published: {formatDate(report.publishedAt)}</p>
                    <p>Freshness: {report.freshnessHint ?? 'Not provided'}</p>
                    <p>Source: {report.sourceNotes}</p>
                    <p>Type: {report.reportType}</p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={detailHref} className="btn-pill btn-pill-primary text-sm">
                      Open archive record
                    </Link>
                    <Link href={`/archive/${report.slug}`} className="btn-pill btn-pill-secondary text-sm">
                      Open trust detail
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="card-civic">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">Onward links</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/transparency" className="btn-pill btn-pill-secondary text-sm">Open transparency</Link>
          <Link href="/governance/model-registry" className="btn-pill btn-pill-secondary text-sm">Model registry context</Link>
          <Link href="/community" className="btn-pill btn-pill-secondary text-sm">Community context</Link>
        </div>
      </section>
    </div>
  );
}
