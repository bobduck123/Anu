// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { SponsorDisclosurePanel } from '@/components/transparency/SponsorDisclosurePanel';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('SponsorDisclosurePanel', () => {
  it('renders disclosure as distinct metadata and preserves non-distortion language', () => {
    render(
      <SponsorDisclosurePanel
        disclosures={[
          {
            id: 7,
            slug: 'sponsor-note-1',
            sponsorName: 'Civic Foundations Guild',
            sponsorType: 'foundation',
            sponsoredSurface: '/archive',
            placementType: 'supporting-note',
            disclosureLabel: 'Sponsor disclosure',
            publicNote: 'Support applies to publication infrastructure only.',
            disclosureText: 'Disclosure text should be visible separately from editorial truth content.',
            activeFrom: null,
            activeUntil: null,
            isActive: true,
            isCurrentlyActive: true,
            trustReportSlug: 'trust-brief',
            archiveRecordSlug: 'trust-record',
            relatedRoutes: {
              surface: '/archive',
              transparency: '/transparency',
              trustReport: '/transparency?report=trust-brief',
              archiveRecord: '/archive/trust-record',
            },
          },
        ]}
        disclosureState="live"
        degradedHonesty={{ isDegraded: false, reason: null, fallback: null }}
        contextLabel="archive trust records"
      />,
    );

    expect(screen.getByText('Sponsor disclosures')).toBeInTheDocument();
    expect(screen.getByText('Civic Foundations Guild')).toBeInTheDocument();
    expect(screen.getByText(/Disclosure text should be visible separately/i)).toBeInTheDocument();
    expect(screen.getByText(/never overwrites trust-report body text/i)).toBeInTheDocument();
  });

  it('renders degraded honesty when disclosure contract is unavailable', () => {
    render(
      <SponsorDisclosurePanel
        disclosures={[]}
        disclosureState="degraded"
        degradedHonesty={{
          isDegraded: true,
          reason: 'sponsor_disclosure_fetch_failed',
          fallback: 'Sponsor disclosure data could not be loaded.',
        }}
      />,
    );

    expect(screen.getByText('Disclosure feed degraded')).toBeInTheDocument();
    expect(screen.getByText('Sponsor disclosure data could not be loaded.')).toBeInTheDocument();
  });
});
