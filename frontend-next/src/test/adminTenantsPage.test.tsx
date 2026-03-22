// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const apiFetchMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

import TenantsListPage from '@/app/(app)/admin/tenants/page';

describe('TenantsListPage', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it('renders the tenant registry as an observatory surface', async () => {
    apiFetchMock.mockResolvedValue([
      {
        id: 1,
        name: 'Northern Commons',
        slug: 'north',
        status: 'active',
        member_count: 42,
        created_at: '2026-03-21T00:00:00.000Z',
      },
    ]);

    render(<TenantsListPage />);

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());

    expect(screen.getByText('Tenants and platform nodes')).toBeInTheDocument();
    expect(screen.getByText('Tenant registry')).toBeInTheDocument();
    expect(screen.getByText('Northern Commons')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /provision tenant/i })).toHaveAttribute('href', '/admin/tenants/create');
  });
});
