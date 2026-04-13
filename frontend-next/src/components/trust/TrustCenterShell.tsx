import Link from 'next/link';
import type { PublicTrustReportListResult } from '@/lib/api/publicTrust';
import type { PublicSponsorDisclosureFeed } from '@/lib/api/publicSponsorDisclosures';
import { SponsorDisclosurePanel } from '@/components/transparency/SponsorDisclosurePanel';

interface TrustCenterShellProps {
  trustReports: PublicTrustReportListResult;
  sponsorDisclosures: PublicSponsorDisclosureFeed;
}

function formatDate(value: string | null): string {
  if (!value) {
    return 'Unknown';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

export function TrustCenterShell({ trustReports, sponsorDisclosures }: TrustCenterShellProps) {
  return (
    <div className="min-h-screen px-4 pb-20 pt-20 md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="card-civic space-y-3">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">Trust center</p>
          <h1 className="text-3xl font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
            Public trust, disclosures, and memory links
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            This route separates truth artifacts, sponsor disclosures, and archive memory links so public readers can inspect each layer clearly.
          </p>
        </header>

        <section className="card-civic space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">Latest trust reports</p>
          {trustReports.degradedHonesty.isDegraded ? (
            <div className="rounded-xl border border-[var(--color-warning)]/45 p-4 text-sm">
              <p className="font-medium text-[var(--color-warning)]">Trust report feed degraded</p>
              <p className="mt-1 text-[var(--color-muted-foreground)]">
                {trustReports.degradedHonesty.fallback ?? 'Trust report feed is temporarily unavailable.'}
              </p>
            </div>
          ) : null}

          {trustReports.reports.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] p-4 text-sm text-[var(--color-muted-foreground)]">
              {trustReports.degradedHonesty.fallback ?? 'No public trust reports are currently published.'}
            </div>
          ) : (
            <div className="space-y-3">
              {trustReports.reports.map((report) => (
                <article key={report.slug} className="rounded-xl border border-[var(--color-border)] p-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
                        {report.title}
                      </h2>
                      <p className="mt-1 text-[var(--color-muted-foreground)]">{report.summary}</p>
                    </div>
                    <span className="rounded-full border border-[var(--color-border)] px-2 py-1 text-xs">{report.status}</span>
                  </div>
                  <div className="mt-3 grid gap-1 text-xs text-[var(--color-muted-foreground)] md:grid-cols-2">
                    <p>Published: {formatDate(report.publishedAt)}</p>
                    <p>Freshness: {report.freshnessHint ?? 'Not provided'}</p>
                    <p>Source note: {report.sourceNotes}</p>
                    <p>Type: {report.reportType}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/archive/${report.slug}`} className="btn-pill btn-pill-primary text-sm">Open trust detail</Link>
                    {report.recordRoute ? (
                      <Link href={report.recordRoute} className="btn-pill btn-pill-secondary text-sm">Open archive record</Link>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <SponsorDisclosurePanel
          disclosures={sponsorDisclosures.disclosures}
          disclosureState={sponsorDisclosures.disclosureState}
          degradedHonesty={sponsorDisclosures.degradedHonesty}
          contextLabel="the public trust center"
        />

        <section className="card-civic space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">Archive and public memory links</p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Memory links remain distinct from sponsor material and point to canonical trust/archive records.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/archive" className="btn-pill btn-pill-secondary text-sm">Archive index</Link>
            <Link href="/transparency" className="btn-pill btn-pill-secondary text-sm">Transparency route</Link>
            <Link href="/governance/model-registry" className="btn-pill btn-pill-secondary text-sm">Model registry</Link>
          </div>
          {trustReports.reports.length ? (
            <div className="space-y-2">
              {trustReports.reports.slice(0, 4).map((report) => (
                <div key={`memory-${report.slug}`} className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm">
                  <p className="font-medium">{report.title}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">Trust link: /archive/{report.slug}</p>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
