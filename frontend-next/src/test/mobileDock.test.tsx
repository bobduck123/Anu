// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MobileDock } from '@/ui-system/layout/MobileDock';

let currentPathname = '/education';
let authenticated = false;
let role = 'participant';

vi.mock('next/navigation', () => ({
  usePathname: () => currentPathname,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: authenticated,
    user: authenticated ? { role } : null,
  }),
}));

describe('MobileDock', () => {
  it('shows sign-in destination when user is not authenticated', () => {
    currentPathname = '/education';
    authenticated = false;
    role = 'participant';

    render(<MobileDock />);

    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/auth');
    expect(screen.getByRole('link', { name: /learn/i })).toHaveAttribute('href', '/education');
  });

  it('shows profile destination when user is authenticated', () => {
    currentPathname = '/cost-lowering';
    authenticated = true;
    role = 'participant';

    render(<MobileDock />);

    expect(screen.getByRole('link', { name: /profile/i })).toHaveAttribute('href', '/profile');
    expect(screen.getByRole('link', { name: /tasks/i })).toHaveAttribute('href', '/cost-lowering');
  });

  it('switches to sandbox links for steward-only internal routes', () => {
    currentPathname = '/sandbox/ui-lab';
    authenticated = true;
    role = 'organizer';

    render(<MobileDock />);

    expect(screen.getByRole('link', { name: /ui lab/i })).toHaveAttribute('href', '/sandbox/ui-lab');
    expect(screen.getByRole('link', { name: /maps/i })).toHaveAttribute('href', '/sandbox/maps');
    expect(screen.getByText(/sandbox and lab/i)).toBeInTheDocument();
  });
});
