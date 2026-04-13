// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TenantBrandWrapper, useTenant } from '@/ui-system/layout/TenantBrandWrapper';

vi.mock('@/lib/runtime', () => ({
  getCoreApiBase: vi.fn(() => '/_core'),
}));

function TenantProbe() {
  const tenant = useTenant();
  return (
    <div>
      <div data-testid="tenant-name">{tenant.name}</div>
      <div data-testid="tenant-slug">{tenant.slug}</div>
      <div data-testid="tenant-semantic-key">{tenant.semanticKey}</div>
      <div data-testid="tenant-white-label">{String(tenant.isWhiteLabel)}</div>
      <div data-testid="tenant-module-impact">{String(tenant.modules.impact)}</div>
      <div data-testid="tenant-logo">{tenant.logo}</div>
      <div data-testid="tenant-primary-color">{tenant.primaryColor}</div>
    </div>
  );
}

describe('TenantBrandWrapper contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('consumes canonical ANU-003 public node config endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          contract_version: '2026-04-10',
          node_id: 7,
          node_slug: 'au-nsw-sydney',
          node_name: 'Sydney Node',
          semantic_key: 'sydney-alpha',
          white_label: true,
          brand: {
            primary_color: '#112233',
            secondary_color: '#223344',
            accent_color: '#445566',
            logo_url: 'https://cdn.example/logo.svg',
          },
          modules: {
            impact: true,
            community: true,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <TenantBrandWrapper>
        <TenantProbe />
      </TenantBrandWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('tenant-name')).toHaveTextContent('Sydney Node');
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/_core/api/public/nodes/current/config',
      expect.objectContaining({
        credentials: 'include',
      }),
    );

    expect(screen.getByTestId('tenant-slug')).toHaveTextContent('au-nsw-sydney');
    expect(screen.getByTestId('tenant-semantic-key')).toHaveTextContent('sydney-alpha');
    expect(screen.getByTestId('tenant-white-label')).toHaveTextContent('true');
    expect(screen.getByTestId('tenant-module-impact')).toHaveTextContent('true');
    expect(screen.getByTestId('tenant-logo')).toHaveTextContent('https://cdn.example/logo.svg');
    expect(screen.getByTestId('tenant-primary-color')).toHaveTextContent('#112233');
  });

  it('keeps default tenant config when endpoint request fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('boom', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);

    render(
      <TenantBrandWrapper>
        <TenantProbe />
      </TenantBrandWrapper>,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    expect(screen.getByTestId('tenant-name')).toHaveTextContent('Manara');
    expect(screen.getByTestId('tenant-semantic-key')).toHaveTextContent('manara');
    expect(screen.getByTestId('tenant-white-label')).toHaveTextContent('false');
  });
});
