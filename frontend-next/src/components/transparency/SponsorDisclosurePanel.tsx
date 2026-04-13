import Link from 'next/link';
import type { ArchiveDegradedHonesty } from '@/lib/api/publicTrust';
import type { PublicSponsorDisclosure } from '@/lib/api/publicSponsorDisclosures';

interface SponsorDisclosurePanelProps {
  disclosures: PublicSponsorDisclosure[];
  degradedHonesty: ArchiveDegradedHonesty;
  disclosureState: 'live' | 'none_published' | 'degraded';
  contextLabel?: string;
}

function formatDate(value: string | null): string {
  if (!value) {
    return 'Not specified';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

export function SponsorDisclosurePanel({
  disclosures,
  degradedHonesty,
  disclosureState,
  contextLabel = 'public trust surfaces',
}: SponsorDisclosurePanelProps) {
  return (
    <section className="card-civic space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">Sponsor disclosures</p>
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
          Sponsor disclosures are published separately from trust-report and archive truth content for {contextLabel}.
        </p>
      </div>

      {disclosureState === 'degraded' || degradedHonesty.isDegraded ? (
        <div className="rounded-xl border border-[var(--color-warning)]/45 p-4 text-sm">
          <p className="font-medium text-[var(--color-warning)]">Disclosure feed degraded</p>
          <p className="mt-1 text-[var(--color-muted-foreground)]">
            {degradedHonesty.fallback ?? 'Sponsor disclosure status is currently unavailable.'}
          </p>
          {degradedHonesty.reason ? (
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">Reason: {degradedHonesty.reason}</p>
          ) : null}
        </div>
      ) : null}

      {disclosureState === 'none_published' && disclosures.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] p-4 text-sm text-[var(--color-muted-foreground)]">
          {degradedHonesty.fallback ?? 'No active sponsor disclosures are published for this surface at this time.'}
        </div>
      ) : null}

      {disclosures.length > 0 ? (
        <div className="space-y-3">
          {disclosures.map((disclosure) => (
            <article key={disclosure.slug} className="rounded-xl border border-[var(--color-border)] p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{disclosure.disclosureLabel}</p>
                  <p className="mt-1 text-[var(--color-muted-foreground)]">{disclosure.sponsorName}</p>
                </div>
                <span className="rounded-full border border-[var(--color-border)] px-2 py-1 text-xs">
                  {disclosure.isCurrentlyActive ? 'Active placement' : 'Inactive placement'}
                </span>
              </div>

              <p className="mt-3 text-[var(--color-muted-foreground)]">{disclosure.publicNote}</p>
              <p className="mt-2 text-[var(--color-muted-foreground)]">{disclosure.disclosureText}</p>

              <div className="mt-3 grid gap-1 text-xs text-[var(--color-muted-foreground)] md:grid-cols-2">
                <p>Sponsor type: {disclosure.sponsorType ?? 'Not specified'}</p>
                <p>Placement: {disclosure.placementType}</p>
                <p>Valid from: {formatDate(disclosure.activeFrom)}</p>
                <p>Valid until: {formatDate(disclosure.activeUntil)}</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={disclosure.relatedRoutes.transparency} className="btn-pill btn-pill-secondary text-sm">
                  Transparency context
                </Link>
                {disclosure.relatedRoutes.archiveRecord ? (
                  <Link href={disclosure.relatedRoutes.archiveRecord} className="btn-pill btn-pill-secondary text-sm">
                    Linked archive record
                  </Link>
                ) : null}
                {disclosure.relatedRoutes.trustReport ? (
                  <Link href={disclosure.relatedRoutes.trustReport} className="btn-pill btn-pill-secondary text-sm">
                    Linked trust report
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <p className="text-xs text-[var(--color-muted-foreground)]">
        Disclosure metadata never overwrites trust-report body text or archive record verification fields.
      </p>
    </section>
  );
}
