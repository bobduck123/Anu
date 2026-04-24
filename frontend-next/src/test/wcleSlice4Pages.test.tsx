// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { WCLERun } from '@/lib/api/wcleApi';

const listRunsMock = vi.fn();
const getRunMock = vi.fn();
const stableSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useSearchParams: () => stableSearchParams,
  useParams: () => ({ id: '42' }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('@/components/wcle/OnboardingWidget', () => ({
  OnboardingWidget: () => <div data-testid="onboarding-widget-stub">onboarding widget</div>,
}));

vi.mock('@/lib/api/wcleApi', () => ({
  wcleApi: {
    listRuns: (...args: unknown[]) => listRunsMock(...args),
    getRun: (...args: unknown[]) => getRunMock(...args),
    createPledge: vi.fn(),
    confirmPledge: vi.fn(),
  },
}));

import CostLoweringPage from '@/app/(app)/cost-lowering/page';
import RunDetailPage from '@/app/(app)/runs/[id]/page';

function runFixture(overrides: Partial<WCLERun> = {}): WCLERun {
  return {
    id: 42,
    title: 'Weekly optimization scenario',
    supplier_type: 'FLEMINGTON',
    location_name: 'Commons Hall',
    address: '12 River St',
    suburb: 'Marrickville',
    postcode: '2204',
    lat: -33.9,
    lng: 151.2,
    organizer_user_id: 1,
    microcosm_id: null,
    run_date: '2026-05-01T09:00:00.000Z',
    pledge_deadline: '2026-04-29T09:00:00.000Z',
    pickup_window_start: '2026-05-01T13:00:00.000Z',
    pickup_window_end: '2026-05-01T15:00:00.000Z',
    status: 'OPEN',
    coordination_fee_per_household_cents: 150,
    max_households: 30,
    retail_equivalent_total_cents: 24000,
    bulk_estimate_total_cents: 18000,
    bulk_actual_total_cents: null,
    created_at: '2026-04-23T00:00:00.000Z',
    updated_at: '2026-04-23T00:00:00.000Z',
    pledge_count: 6,
    organizer_username: 'organizer',
    scenario_meta: null,
    packs: [
      {
        id: 501,
        run_id: 42,
        name: 'Base Pack',
        description: 'Core shared package.',
        items: [
          {
            name: 'Rice',
            unit: 'kg',
            qty: 2,
            retail_unit_price_cents: 320,
            bulk_unit_price_cents: 250,
            category: 'pantry',
          },
        ],
        adjustable_quantities: true,
        waste_buffer_bps: 500,
        retail_estimate_cents: 2400,
        bulk_estimate_cents: 1700,
        created_at: '2026-04-23T00:00:00.000Z',
        updated_at: '2026-04-23T00:00:00.000Z',
      },
    ],
    ...overrides,
  };
}

describe('WCLE Slice 4 pages', () => {
  beforeEach(() => {
    localStorage.clear();
    listRunsMock.mockReset();
    getRunMock.mockReset();
  });

  it('renders cost-lowering KPI dashboard and recommendation explainability', async () => {
    listRunsMock.mockResolvedValue({
      runs: [runFixture()],
      total: 1,
      page: 1,
      per_page: 20,
    });

    render(<CostLoweringPage />);

    await waitFor(() => expect(listRunsMock).toHaveBeenCalled());
    expect(screen.getByText('Baseline KPI dashboard')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Query KPIs' })).toBeInTheDocument();
    expect(screen.getByText('Why this option')).toBeInTheDocument();
    expect(screen.getByText('Tradeoff summary')).toBeInTheDocument();
    expect(screen.getByText('Confidence and sensitivity')).toBeInTheDocument();
  });

  it('renders run detail option explainability and confidence placeholders', async () => {
    getRunMock.mockResolvedValue(runFixture());

    render(<RunDetailPage />);

    await waitFor(() => expect(getRunMock).toHaveBeenCalledWith(42));
    expect(screen.getByText('Scenario options')).toBeInTheDocument();
    expect(screen.getByText('Why this option')).toBeInTheDocument();
    expect(screen.getByText('Tradeoff summary')).toBeInTheDocument();
    expect(screen.getByText('Confidence and sensitivity')).toBeInTheDocument();
  });
});
