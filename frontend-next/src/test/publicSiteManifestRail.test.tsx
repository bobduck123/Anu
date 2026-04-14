// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const { usePathnameMock, useTenantMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
  useTenantMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
}));

vi.mock('@/ui-system/layout/TenantBrandWrapper', () => ({
  useTenant: useTenantMock,
}));

import { PublicSiteManifestRail } from '@/components/public/PublicSiteManifestRail';
import { buildDefaultPublicSiteManifest } from '@/lib/publicSiteManifest';

describe('PublicSiteManifestRail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePathnameMock.mockReturnValue('/trust');
  });

  it('renders manifest-driven site branding and public nav links', () => {
    const siteManifest = buildDefaultPublicSiteManifest({
      tenantId: 5,
      siteKey: 'mudyin-public',
      siteName: 'Mudyin Public Commons',
    });
    siteManifest.tagline = 'Mudyin stories and trust routes.';
    siteManifest.navItems = [
      { label: 'Trust Center', href: '/trust' },
      { label: 'Archive', href: '/archive' },
    ];

    useTenantMock.mockReturnValue({
      siteManifest,
      siteResolution: {
        resolved: true,
        resolutionStatus: 'resolved',
        fallbackNote: null,
        host: 'mudyin.example.com',
      },
    });

    render(<PublicSiteManifestRail />);

    expect(screen.getByTestId('public-site-manifest-rail')).toBeInTheDocument();
    expect(screen.getByText('Mudyin Public Commons')).toBeInTheDocument();
    expect(screen.getByText('Mudyin stories and trust routes.')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Trust Center' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Archive' }).length).toBeGreaterThan(0);
  });

  it('prevents control-plane link leakage from manifest content', () => {
    const siteManifest = buildDefaultPublicSiteManifest({
      tenantId: 7,
      siteKey: 'tenant-public',
      siteName: 'Tenant Public',
    });
    siteManifest.navItems = [
      { label: 'Trust Center', href: '/trust' },
      { label: 'Control Leak Attempt', href: '/control/tenants' },
    ];

    useTenantMock.mockReturnValue({
      siteManifest,
      siteResolution: {
        resolved: true,
        resolutionStatus: 'resolved',
        fallbackNote: null,
        host: 'tenant.example.com',
      },
    });

    render(<PublicSiteManifestRail />);

    expect(screen.getAllByRole('link', { name: 'Trust Center' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'Control Leak Attempt' })).not.toBeInTheDocument();
  });

  it('renders honest fallback note when host resolution is degraded', () => {
    const siteManifest = buildDefaultPublicSiteManifest({
      tenantId: null,
      siteKey: 'anu-public',
      siteName: 'ANU Public Platform',
    });
    useTenantMock.mockReturnValue({
      siteManifest,
      siteResolution: {
        resolved: false,
        resolutionStatus: 'fallback_unknown_host',
        fallbackNote: "Host 'unknown.example' is not mapped to a tenant site.",
        host: 'unknown.example',
      },
    });

    render(<PublicSiteManifestRail />);
    expect(screen.getByTestId('public-site-resolution-fallback')).toHaveTextContent(
      "Host 'unknown.example' is not mapped to a tenant site.",
    );
  });
});
