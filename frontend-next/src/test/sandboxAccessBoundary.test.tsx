// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SandboxAccessBoundary, hasSandboxAccessRole } from '@/ui-system/anu/SandboxAccessBoundary';

let authState = {
  isLoading: false,
  isAuthenticated: false,
  user: null as null | { role: string },
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

describe('SandboxAccessBoundary', () => {
  it('treats steward roles as sandbox-capable', () => {
    expect(hasSandboxAccessRole('organizer')).toBe(true);
    expect(hasSandboxAccessRole('platform_admin')).toBe(true);
    expect(hasSandboxAccessRole('participant')).toBe(false);
  });

  it('shows a sign-in gate for anonymous users', () => {
    authState = {
      isLoading: false,
      isAuthenticated: false,
      user: null,
    };

    render(
      <SandboxAccessBoundary returnTo="/sandbox/ui-lab">
        <div>Lab body</div>
      </SandboxAccessBoundary>,
    );

    expect(screen.getByRole('heading', { name: /Sign in to open the ANU sandbox/i })).toBeInTheDocument();
  });

  it('blocks signed-in non-steward users', () => {
    authState = {
      isLoading: false,
      isAuthenticated: true,
      user: { role: 'participant' },
    };

    render(
      <SandboxAccessBoundary returnTo="/sandbox/ui-lab">
        <div>Lab body</div>
      </SandboxAccessBoundary>,
    );

    expect(screen.getByRole('heading', { name: /The sandbox is restricted to steward and admin roles/i })).toBeInTheDocument();
  });

  it('renders children for steward-capable users', () => {
    authState = {
      isLoading: false,
      isAuthenticated: true,
      user: { role: 'organizer' },
    };

    render(
      <SandboxAccessBoundary returnTo="/sandbox/ui-lab">
        <div>Lab body</div>
      </SandboxAccessBoundary>,
    );

    expect(screen.getByText('Lab body')).toBeInTheDocument();
  });
});
