// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const listPlansMock = vi.fn();
const statusMock = vi.fn();
const createCheckoutMock = vi.fn();

let authLoading = false;
let authenticated = false;

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: authenticated,
    isLoading: authLoading,
  }),
}));

vi.mock('@/lib/api/endpoints', () => ({
  membershipsApi: {
    listPlans: () => listPlansMock(),
    status: () => statusMock(),
    createCheckout: (planId: number) => createCheckoutMock(planId),
  },
}));

import MembershipsPage from '@/app/(app)/memberships/page';

const plans = [
  {
    id: 1,
    name: 'Seed',
    amount_cents: 1200,
    credit_grant_monthly: 12,
    pool_allocation_pct: '15%',
    stripe_price_id: 'seed',
  },
  {
    id: 2,
    name: 'Sapling',
    amount_cents: 2400,
    credit_grant_monthly: 30,
    pool_allocation_pct: '25%',
    stripe_price_id: 'sapling',
  },
];

describe('MembershipsPage', () => {
  beforeEach(() => {
    authLoading = false;
    authenticated = false;
    listPlansMock.mockReset();
    statusMock.mockReset();
    createCheckoutMock.mockReset();
    listPlansMock.mockResolvedValue(plans);
    statusMock.mockResolvedValue({
      is_subscribed: false,
      subscription: null,
    });
  });

  it('keeps memberships public while gating checkout behind sign-in', async () => {
    render(<MembershipsPage />);

    await waitFor(() => expect(listPlansMock).toHaveBeenCalled());

    expect(screen.getByText('Sustain the Commons')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in to begin/i })).toHaveAttribute('href', '/auth');
    expect(screen.getAllByRole('link', { name: /sign in to subscribe/i }).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/plans are public\. sign in when you are ready to start secure checkout/i),
    ).toBeInTheDocument();
  });

  it('shows active membership state when a subscription is already live', async () => {
    authenticated = true;
    statusMock.mockResolvedValue({
      is_subscribed: true,
      subscription: {
        id: 12,
        plan_id: 2,
        status: 'active',
        streak_months: 4,
        cancel_at_period_end: false,
        created_at: '2026-03-22T00:00:00.000Z',
      },
    });

    render(<MembershipsPage />);

    await waitFor(() => expect(statusMock).toHaveBeenCalled());

    expect(screen.getByText(/current plan sapling with active status and 4 month streak/i)).toBeInTheDocument();
    expect(screen.getByText('Active membership')).toBeInTheDocument();
  });
});
