// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

let authenticated = false;
let authLoading = false;

const statusMock = vi.fn();
const poolsListMock = vi.fn();
const impactSummaryMock = vi.fn();
const getCollaborativeMock = vi.fn();
const getPoolMetricsMock = vi.fn();
const getCollectiveStreaksMock = vi.fn();
const getMicrocosmsMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: authenticated,
    isLoading: authLoading,
  }),
}));

vi.mock('@/components/impact/ImpactHeader', () => ({
  default: () => <div>impact-header</div>,
}));

vi.mock('@/components/impact/PoolCards', () => ({
  default: () => <div>pool-cards</div>,
}));

vi.mock('@/components/impact/StreakWidget', () => ({
  default: () => <div>streak-widget</div>,
}));

vi.mock('@/lib/api/endpoints', () => ({
  membershipsApi: { status: () => statusMock() },
  poolsApi: { list: () => poolsListMock() },
  impactApi: { summary: () => impactSummaryMock() },
}));

vi.mock('@/lib/api', () => ({
  api: {
    engagement: {
      getCollaborative: (...args: unknown[]) => getCollaborativeMock(...args),
      getPoolMetrics: (...args: unknown[]) => getPoolMetricsMock(...args),
      getCollectiveStreaks: (...args: unknown[]) => getCollectiveStreaksMock(...args),
    },
    community: {
      getMicrocosms: (...args: unknown[]) => getMicrocosmsMock(...args),
    },
  },
}));

vi.mock('@/lib/brand', () => ({
  brand: { name: 'Manara' },
  manaraPath: () => '/manara',
}));

import ImpactHomePage from '@/app/(app)/impact/page';

describe('ImpactHomePage', () => {
  beforeEach(() => {
    authenticated = false;
    authLoading = false;
    statusMock.mockReset();
    poolsListMock.mockReset();
    impactSummaryMock.mockReset();
    getCollaborativeMock.mockReset();
    getPoolMetricsMock.mockReset();
    getCollectiveStreaksMock.mockReset();
    getMicrocosmsMock.mockReset();
    statusMock.mockResolvedValue({
      is_subscribed: false,
      subscription: null,
    });
    poolsListMock.mockResolvedValue([]);
    impactSummaryMock.mockResolvedValue({
      relief_paid_cents: 18500,
      event_attendance: 42,
      actions_completed: 9,
      volunteer_hours: 18,
    });
    getCollaborativeMock.mockResolvedValue({ challenges: [], scope_name: 'Node' });
    getPoolMetricsMock.mockResolvedValue({
      total_pools: 2,
      active_pools: 1,
      total_target_cents: 250000,
      total_balance_cents: 100000,
    });
    getCollectiveStreaksMock.mockResolvedValue({
      scope: 'node',
      scope_id: 1,
      scope_name: 'Node',
      current_streak: 2,
      best_streak: 4,
      weekly_stats: {},
      reward_milestones: {},
    });
    getMicrocosmsMock.mockResolvedValue([]);
  });

  it('shows connected public pathways around the impact workspace when signed out', async () => {
    render(<ImpactHomePage />);

    await waitFor(() =>
      expect(screen.getByText(/Impact gathers grounded consequence before it rises upward\./i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/Sign in for live pool, streak, and membership data/i)).toBeInTheDocument();
    expect(screen.getByText(/How to read this bridge before sign-in/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open memberships/i })).toHaveAttribute('href', '/memberships');
  });

  it('renders the live bridge shell and outcome threads when signed in', async () => {
    authenticated = true;

    render(<ImpactHomePage />);

    await waitFor(() => expect(statusMock).toHaveBeenCalled());

    expect(screen.getByText('Impact sits between contribution, care, and participation')).toBeInTheDocument();
    expect(screen.getAllByText('Grounded action follow-through').length).toBeGreaterThan(0);
    expect(screen.getByText('How to read this live impact workspace')).toBeInTheDocument();
  });
});
