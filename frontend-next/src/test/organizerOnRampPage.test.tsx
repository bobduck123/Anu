// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const organizerStatusMock = vi.fn();

let currentSearchParams = new URLSearchParams();
let authState = {
  isAuthenticated: false,
  isLoading: false,
};

vi.mock('next/navigation', () => ({
  useSearchParams: () => currentSearchParams,
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

vi.mock('@/ui-system/primitives/HoverBubble', () => ({
  HoverBubble: ({ title }: { title: string }) => <span>{title}</span>,
}));

import OrganizerOnRampPage from '@/app/(app)/organizer/on-ramp/page';

describe('OrganizerOnRampPage', () => {
  beforeEach(() => {
    currentSearchParams = new URLSearchParams();
    authState = {
      isAuthenticated: false,
      isLoading: false,
    };
    organizerStatusMock.mockReset();
  });

  it('preserves requested organizer route in sign-in return flow', async () => {
    currentSearchParams = new URLSearchParams('next=%2Forganizer%2Fintelligence');

    render(<OrganizerOnRampPage />);

    expect(await screen.findByText('Requested route preserved:')).toBeInTheDocument();
    expect(screen.getAllByText('/organizer/intelligence').length).toBeGreaterThan(0);

    const signIn = screen.getByRole('link', { name: 'Sign in' });
    expect(signIn.getAttribute('href')).toBe('/auth?returnTo=%2Forganizer%2Fon-ramp%3Fnext%3D%252Forganizer%252Fintelligence');
  });

  it('normalizes unsafe next values to organizer default', async () => {
    currentSearchParams = new URLSearchParams('next=https%3A%2F%2Fevil.example%2Fhack');

    render(<OrganizerOnRampPage />);

    expect(await screen.findByText('Organizer On-ramp')).toBeInTheDocument();
    expect(screen.queryByText('Requested route preserved:')).toBeNull();

    const signIn = screen.getByRole('link', { name: 'Sign in' });
    expect(signIn.getAttribute('href')).toBe('/auth?returnTo=%2Forganizer%2Fon-ramp%3Fnext%3D%252Forganizer');
  });
});
