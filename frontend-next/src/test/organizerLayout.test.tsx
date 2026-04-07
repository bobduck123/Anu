// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const replaceMock = vi.fn();
const organizerStatusMock = vi.fn();

let pathname = '/organizer/intelligence';
let authState = {
  user: null as { role?: string } | null,
  isAuthenticated: false,
  isLoading: false,
};

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('@/lib/api', () => ({
  api: {
    organizer: {
      getStatus: () => organizerStatusMock(),
    },
  },
}));

import OrganizerLayout from '@/app/(app)/organizer/layout';

describe('OrganizerLayout', () => {
  beforeEach(() => {
    replaceMock.mockReset();
    organizerStatusMock.mockReset();
    pathname = '/organizer/intelligence';
    authState = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
    };
  });

  it('redirects guest sessions to on-ramp with preserved next route', async () => {
    render(
      <OrganizerLayout>
        <div>organizer-content</div>
      </OrganizerLayout>,
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/organizer/on-ramp?next=%2Forganizer%2Fintelligence');
    });
  });

  it('renders protected content for organizer role without redirect', async () => {
    authState = {
      user: { role: 'organizer' },
      isAuthenticated: true,
      isLoading: false,
    };

    render(
      <OrganizerLayout>
        <div>organizer-content</div>
      </OrganizerLayout>,
    );

    expect(await screen.findByText('organizer-content')).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('bypasses guard on on-ramp route', async () => {
    pathname = '/organizer/on-ramp';

    render(
      <OrganizerLayout>
        <div>on-ramp-content</div>
      </OrganizerLayout>,
    );

    expect(await screen.findByText('on-ramp-content')).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
