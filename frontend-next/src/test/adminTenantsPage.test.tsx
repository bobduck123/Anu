// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import TenantsListPage from '@/app/(app)/admin/tenants/page';

describe('TenantsListPage', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the tenant registry as an observatory surface', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify([
          {
            id: 1,
            name: 'Northern Commons',
            slug: 'north',
            status: 'active',
            member_count: 42,
            created_at: '2026-03-21T00:00:00.000Z',
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ));
    vi.stubGlobal('fetch', fetchMock);

    render(<TenantsListPage />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/control/core/api/admin/tenants',
      expect.objectContaining({
        credentials: 'include',
        cache: 'no-store',
      }),
    );

    expect(screen.getByText('Tenants and platform nodes')).toBeInTheDocument();
    expect(screen.getByText('Tenant registry')).toBeInTheDocument();
    expect(screen.getByText('Northern Commons')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /provision tenant/i })).toHaveAttribute('href', '/control/tenants/create');
  });

  it('only exposes tenant manifest actions for tenants returned by control scope', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify([
          {
            id: 7,
            name: 'Scoped Tenant',
            slug: 'scoped-tenant',
            status: 'active',
            member_count: 9,
            created_at: '2026-03-21T00:00:00.000Z',
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ));
    vi.stubGlobal('fetch', fetchMock);

    render(<TenantsListPage />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(screen.getByText('Scoped Tenant')).toBeInTheDocument();
    expect(screen.queryByText('Unscoped Tenant')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit public manifest' })).toHaveAttribute('href', '/control/tenants/7/manifest');
  });
});
