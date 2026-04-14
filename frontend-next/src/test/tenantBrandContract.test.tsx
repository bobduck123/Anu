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
      <div data-testid="tenant-site-key">{tenant.siteManifest.siteKey}</div>
      <div data-testid="tenant-site-tagline">{tenant.siteManifest.tagline}</div>
      <div data-testid="tenant-site-nav">
        {tenant.siteManifest.navItems.map((item) => item.href).join(',')}
      </div>
      <div data-testid="tenant-site-resolution">{tenant.siteResolution.resolutionStatus}</div>
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
          site_resolution: {
            resolved: true,
            resolution_status: 'resolved',
            fallback_note: null,
            host: 'impact.example.com',
          },
          site_manifest: {
            tenant_id: 7,
            site_key: 'sydney-public',
            site_name: 'Sydney Public Commons',
            tagline: 'Sydney public routes on ANU rails.',
            nav_items: [
              { label: 'Trust', href: '/trust' },
              { label: 'Control Leak Attempt', href: '/control/tenants' },
            ],
            footer_links: [{ label: 'Privacy', href: '/privacy' }],
            legal_links: { privacy: '/privacy', terms: '/terms', code_of_conduct: '/code-of-conduct' },
            trust_links: { trust_center: '/trust', transparency: '/transparency', archive: '/archive' },
            contact: { public_contact_url: '/contact', email: 'hello@example.com' },
            enabled_public_modules: ['trust', 'archive'],
            canonical_domains: ['impact.example.com'],
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
    expect(screen.getByTestId('tenant-site-key')).toHaveTextContent('sydney-public');
    expect(screen.getByTestId('tenant-site-tagline')).toHaveTextContent('Sydney public routes on ANU rails.');
    expect(screen.getByTestId('tenant-site-nav')).toHaveTextContent('/trust');
    expect(screen.getByTestId('tenant-site-nav')).not.toHaveTextContent('/control/tenants');
    expect(screen.getByTestId('tenant-site-resolution')).toHaveTextContent('resolved');
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
    expect(screen.getByTestId('tenant-site-key')).toHaveTextContent('manara');
  });

  it('surfaces host fallback resolution honestly when tenant host mapping is unavailable', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          contract_version: '2026-04-10',
          node_id: 9,
          node_slug: 'anu-platform',
          node_name: 'ANU Platform',
          semantic_key: 'anu-platform',
          white_label: false,
          brand: {
            primary_color: '#1e0227',
          },
          site_resolution: {
            resolved: false,
            resolution_status: 'fallback_unknown_host',
            fallback_note: "Host 'unknown.example' is not mapped to this tenant; default tenant manifest is shown.",
            host: 'unknown.example',
          },
          site_manifest: {
            tenant_id: 9,
            site_key: 'anu-public',
            site_name: 'ANU Public Platform',
            tagline: 'Fallback public shell',
            nav_items: [
              { label: 'Trust', href: '/trust' },
              { label: 'Control Leak Attempt', href: '/control/tenants' },
            ],
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
      expect(screen.getByTestId('tenant-site-key')).toHaveTextContent('anu-public');
    });

    expect(screen.getByTestId('tenant-site-resolution')).toHaveTextContent('fallback_unknown_host');
    expect(screen.getByTestId('tenant-site-nav')).toHaveTextContent('/trust');
    expect(screen.getByTestId('tenant-site-nav')).not.toHaveTextContent('/control/tenants');
  });
});
