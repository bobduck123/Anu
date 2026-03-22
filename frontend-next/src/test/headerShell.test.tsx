// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Header } from '@/ui-system/layout/Header';

let currentPathname = '/sandbox/ui-lab';
let authState = {
  isAuthenticated: true,
  user: {
    role: 'organizer',
    pseudonym: 'Signal Steward',
    username: 'signal-steward',
  },
  logout: vi.fn(),
};

vi.mock('next/navigation', () => ({
  usePathname: () => currentPathname,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('@/ui-system/layout/TenantBrandWrapper', () => ({
  useTenant: () => ({
    name: 'Manara',
    logo: null,
  }),
}));

vi.mock('@/ui-system/ThemeToggle', () => ({
  ThemeToggle: () => <button type="button">Theme</button>,
}));

describe('Header shell signaling', () => {
  it('shows sandbox route identity and steward lab access in the doorway menu', () => {
    render(<Header onMenuToggle={vi.fn()} />);

    expect(screen.getByText('Sandbox and lab')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Open profile menu/i }));
    expect(screen.getByRole('link', { name: 'UI Lab' })).toHaveAttribute('href', '/sandbox/ui-lab');
  });

  it('uses community route signaling outside sandbox', () => {
    currentPathname = '/community';

    render(<Header onMenuToggle={vi.fn()} />);

    expect(screen.getByText('Community mesh')).toBeInTheDocument();
  });
});
