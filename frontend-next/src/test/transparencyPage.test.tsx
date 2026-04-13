// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const nodeSummaryMock = vi.fn();
const sponsorDisclosuresMock = vi.fn();

vi.mock('@/lib/api/endpoints', () => ({
  transparencyApi: {
    nodeSummary: () => nodeSummaryMock(),
  },
}));

vi.mock('@/lib/api/publicSponsorDisclosures', () => ({
  fetchPublicSponsorDisclosures: () => sponsorDisclosuresMock(),
}));

import TransparencyPage from '@/app/(public)/transparency/page';

describe('TransparencyPage', () => {
  beforeEach(() => {
    nodeSummaryMock.mockReset();
    sponsorDisclosuresMock.mockReset();
  });

  it('renders the public truth surface with pools and receipts when data is live', async () => {
    nodeSummaryMock.mockResolvedValue({
      node: { slug: 'anu', name: 'ANU' },
      totals: { inflows_30d: 1250000, outflows_30d: 830000, admin_ratio_30d: 0.17 },
      pools: [
        {
          slug: 'relief',
          name: 'Relief Pool',
          category: 'Mutual aid',
          target_amount_cents: 5000000,
          balance: 3100000,
          outflows_30d: 225000,
        },
      ],
      relief_capacity: { monthly_grants_remaining: 18, avg_processing_days: 4.5 },
      relief_metrics: { approval_ratio: 0.71, median_response_days: 3.2 },
      receipts: [
        {
          id: 9,
          pool_slug: 'relief',
          pool_name: 'Relief Pool',
          entry_type: 'grant',
          amount_cents: 45000,
          description: 'Emergency support disbursement',
          reference_type: 'relief_grant',
          created_at: '2026-03-22T01:00:00.000Z',
        },
      ],
    });
    sponsorDisclosuresMock.mockResolvedValue({
      disclosures: [
        {
          id: 1,
          slug: 'public-interest-labs-disclosure',
          sponsorName: 'Public Interest Labs',
          sponsorType: 'civic-partner',
          sponsoredSurface: '/transparency',
          placementType: 'supporting-note',
          disclosureLabel: 'Sponsor disclosure',
          publicNote: 'Public Interest Labs supports reporting infrastructure.',
          disclosureText: 'Support does not alter trust-report claims.',
          activeFrom: '2026-04-01T00:00:00Z',
          activeUntil: '2026-05-01T00:00:00Z',
          isActive: true,
          isCurrentlyActive: true,
          trustReportSlug: 'flood-resilience-brief',
          archiveRecordSlug: 'flood-resilience-q2',
          relatedRoutes: {
            surface: '/transparency',
            transparency: '/transparency',
            trustReport: '/transparency?report=flood-resilience-brief',
            archiveRecord: '/archive/flood-resilience-q2',
          },
        },
      ],
      disclosureState: 'live',
      degradedHonesty: { isDegraded: false, reason: null, fallback: null },
    });

    render(<TransparencyPage />);

    await waitFor(() => expect(nodeSummaryMock).toHaveBeenCalled());
    await waitFor(() => expect(sponsorDisclosuresMock).toHaveBeenCalled());

    expect(screen.getByText('Read the commons without exposing the members.')).toBeInTheDocument();
    expect(screen.getByText('Commons-backed liquidity')).toBeInTheDocument();
    expect(screen.getByText('Commons-backed liquidity')).toBeInTheDocument();
    expect(screen.getByText('Relief Pool')).toBeInTheDocument();
    expect(screen.getByText('Visible ledger trail')).toBeInTheDocument();
    expect(screen.getByText('Emergency support disbursement')).toBeInTheDocument();
    expect(screen.getByText('Sponsor disclosures')).toBeInTheDocument();
    expect(screen.getByText('Public Interest Labs')).toBeInTheDocument();
    expect(screen.getByText(/Support does not alter trust-report claims/i)).toBeInTheDocument();
    expect(screen.getByText(/never overwrites trust-report body text/i)).toBeInTheDocument();
  });

  it('renders honest degraded disclosure state when sponsor contract is unavailable', async () => {
    nodeSummaryMock.mockResolvedValue({
      node: { slug: 'anu', name: 'ANU' },
      totals: { inflows_30d: 1250000, outflows_30d: 830000, admin_ratio_30d: 0.17 },
      pools: [],
      relief_capacity: { monthly_grants_remaining: 18, avg_processing_days: 4.5 },
      receipts: [],
    });
    sponsorDisclosuresMock.mockResolvedValue({
      disclosures: [],
      disclosureState: 'degraded',
      degradedHonesty: {
        isDegraded: true,
        reason: 'sponsor_disclosure_http_503',
        fallback: 'Sponsor disclosure contract is temporarily unavailable.',
      },
    });

    render(<TransparencyPage />);
    await waitFor(() => expect(nodeSummaryMock).toHaveBeenCalled());
    await waitFor(() => expect(sponsorDisclosuresMock).toHaveBeenCalled());

    expect(screen.getByText('Disclosure feed degraded')).toBeInTheDocument();
    expect(screen.getByText('Sponsor disclosure contract is temporarily unavailable.')).toBeInTheDocument();
  });
});
