// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const nodeSummaryMock = vi.fn();

vi.mock('@/lib/api/endpoints', () => ({
  transparencyApi: {
    nodeSummary: () => nodeSummaryMock(),
  },
}));

import TransparencyPage from '@/app/(public)/transparency/page';

describe('TransparencyPage', () => {
  beforeEach(() => {
    nodeSummaryMock.mockReset();
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

    render(<TransparencyPage />);

    await waitFor(() => expect(nodeSummaryMock).toHaveBeenCalled());

    expect(screen.getByText('Read the commons without exposing the members.')).toBeInTheDocument();
    expect(screen.getByText('Commons-backed liquidity')).toBeInTheDocument();
    expect(screen.getByText('Relief Pool')).toBeInTheDocument();
    expect(screen.getByText('Visible ledger trail')).toBeInTheDocument();
    expect(screen.getByText('Emergency support disbursement')).toBeInTheDocument();
  });
});
