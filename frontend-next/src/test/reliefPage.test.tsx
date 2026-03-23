// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

let authenticated = true;
let authLoading = false;

const myRequestsMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: authenticated,
    isLoading: authLoading,
  }),
}));

vi.mock('@/components/relief/ReliefIntakeForm', () => ({
  default: () => <div>relief-intake-form</div>,
}));

vi.mock('@/lib/api/endpoints', () => ({
  reliefApi: {
    myRequests: () => myRequestsMock(),
  },
}));

import ReliefPage from '@/app/(app)/relief/page';

describe('ReliefPage', () => {
  beforeEach(() => {
    authenticated = true;
    authLoading = false;
    myRequestsMock.mockReset();
    myRequestsMock.mockResolvedValue([
      {
        id: 1,
        amount_requested_cents: 25000,
        purpose: 'rent',
        status: 'pending',
        queue_position_estimate: 3,
      },
    ]);
  });

  it('renders relief as a private care route with linked commons surfaces', async () => {
    render(<ReliefPage />);

    await waitFor(() => expect(myRequestsMock).toHaveBeenCalled());

    expect(screen.getByText('Ground private care in a visible route.')).toBeInTheDocument();
    expect(screen.getByText('How the care lane stays accountable')).toBeInTheDocument();
    expect(screen.getByText('Relief stays inside the wider commons loop')).toBeInTheDocument();
    expect(screen.getAllByText('Request #1').length).toBeGreaterThan(0);
    expect(
      screen
        .getAllByRole('link')
        .some((link) => link.getAttribute('href') === '/impact' && /impact bridge/i.test(link.textContent ?? '')),
    ).toBe(true);
  });
});
