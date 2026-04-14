import Link from 'next/link';
import type {
  ArchiveDegradedHonesty,
  PublicArchiveRecord,
  PublicDecisionSummary,
  PublicTrustReportDetail,
} from '@/lib/api/publicTrust';
import type { PublicSponsorDisclosureFeed } from '@/lib/api/publicSponsorDisclosures';
import { SponsorDisclosurePanel } from '@/components/transparency/SponsorDisclosurePanel';
import { getRoutePurpose } from '@/ui-system/anu/routePurposeRegistry';
import { getThresholdDefinition, getThresholdForRoute } from '@/ui-system/anu/thresholdRegistry';

interface ArchiveRecordShellProps {
  recordRef: string;
  report: PublicTrustReportDetail | null;
  archiveRecord: PublicArchiveRecord | null;
  degradedHonesty: ArchiveDegradedHonesty;
  sponsorFeed: PublicSponsorDisclosureFeed;
  decisionSummary: PublicDecisionSummary | null;
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

export function ArchiveRecordShell({
  recordRef,
  report,
  archiveRecord,
  degradedHonesty,
  sponsorFeed,
  decisionSummary,
}: ArchiveRecordShellProps) {
  const routePurpose = getRoutePurpose('/archive');
  const thresholdKey = getThresholdForRoute('/archive');
  const threshold = getThresholdDefinition(thresholdKey);

  const title = report?.title ?? archiveRecord?.title ?? recordRef;
  const summary = report?.summary ?? archiveRecord?.summary ?? 'No summary is currently available for this record.';
  const provenance = report?.sourceNotes ?? archiveRecord?.provenanceSummary ?? 'No provenance details are currently available.';
  const status = report?.status ?? archiveRecord?.verificationStatus ?? 'unknown';
  const freshness = report?.freshnessHint ?? archiveRecord?.lastVerifiedAt ?? null;
  const body = report?.body ?? summary;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="card-civic space-y-3">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">Archive record</p>
        <h1 className="text-3xl font-semibold break-words" style={{ fontFamily: 'var(--font-serif)' }}>
          {title}
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">{summary}</p>
        <div className="grid gap-2 text-xs text-[var(--color-muted-foreground)] md:grid-cols-2">
          <p>Threshold: {thresholdKey} ({threshold.summary})</p>
          <p>Route purpose: {routePurpose?.purpose ?? 'Canonical public archive deep-link.'}</p>
          <p>Status: {status}</p>
          <p>Freshness: {freshness ?? 'Unknown'}</p>
        </div>
      </header>

      {degradedHonesty.isDegraded ? (
        <section className="card-civic border-[var(--color-warning)]/40">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-warning)]">Degraded honesty</p>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
            {degradedHonesty.fallback ?? 'Live trust-report context is not available for this archive record.'}
          </p>
          {degradedHonesty.reason ? (
            <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">Reason: {degradedHonesty.reason}</p>
          ) : null}
        </section>
      ) : null}

      <section className="card-civic space-y-4">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">Provenance and trust</p>
        <div className="rounded-xl border border-[var(--color-border)] p-4 text-sm">
          <p className="font-medium">Source label</p>
          <p className="mt-1 text-[var(--color-muted-foreground)]">{provenance}</p>
        </div>

        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div className="rounded-xl border border-[var(--color-border)] p-4">
            <p className="font-medium">Published</p>
            <p className="mt-1 text-[var(--color-muted-foreground)]">{formatDate(report?.publishedAt ?? null)}</p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] p-4">
            <p className="font-medium">Effective</p>
            <p className="mt-1 text-[var(--color-muted-foreground)]">{formatDate(report?.effectiveAt ?? null)}</p>
          </div>
        </div>
      </section>

      <SponsorDisclosurePanel
        disclosures={sponsorFeed.disclosures}
        disclosureState={sponsorFeed.disclosureState}
        degradedHonesty={sponsorFeed.degradedHonesty}
        contextLabel="this archive record"
      />

      {decisionSummary ? (
        <section id="decision-summary" className="card-civic space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">Decision register context</p>
          <div className="rounded-xl border border-[var(--color-border)] p-4 text-sm">
            <p className="font-medium">{decisionSummary.decisionId}: {decisionSummary.title}</p>
            <p className="mt-2 text-[var(--color-muted-foreground)]">{decisionSummary.summary}</p>
            <div className="mt-3 grid gap-2 text-xs text-[var(--color-muted-foreground)] md:grid-cols-2">
              <p>Owner: {decisionSummary.owner}</p>
              <p>Due date: {decisionSummary.dueDate ?? 'Not set'}</p>
              <p>Status: {decisionSummary.currentStatus}</p>
              <p>Scope: {decisionSummary.publicationScope}</p>
            </div>
            <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">
              This is a public-safe decision summary. Restricted decision detail remains docs-only until explicitly published.
            </p>
          </div>
        </section>
      ) : null}

      <section className="card-civic space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">Summary and body</p>
        <article className="rounded-xl border border-[var(--color-border)] p-4 text-sm leading-7 text-[var(--color-foreground)]">
          {body}
        </article>
        {report?.sections?.length ? (
          <div className="space-y-2">
            {report.sections.map((section, index) => {
              const heading = typeof section.heading === 'string' ? section.heading : `Section ${index + 1}`;
              const content = typeof section.content === 'string' ? section.content : '';
              return (
                <div key={`${heading}-${index}`} className="rounded-xl border border-[var(--color-border)] p-4 text-sm">
                  <p className="font-medium">{heading}</p>
                  {content ? <p className="mt-1 text-[var(--color-muted-foreground)]">{content}</p> : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="card-civic">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">Related pathways</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/archive" className="btn-pill btn-pill-secondary text-sm">Back to archive</Link>
          <Link href={report ? `/transparency?report=${encodeURIComponent(report.slug)}` : '/transparency'} className="btn-pill btn-pill-primary text-sm">
            Open transparency context
          </Link>
          {decisionSummary ? (
            <Link href="#decision-summary" className="btn-pill btn-pill-secondary text-sm">
              Open decision summary
            </Link>
          ) : null}
          <Link href="/governance/model-registry" className="btn-pill btn-pill-secondary text-sm">Model registry route</Link>
        </div>
      </section>
    </div>
  );
}
