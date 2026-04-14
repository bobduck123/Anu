// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useParams: () => ({ nodeId: '7' }),
}));

import TenantManifestAuthoringPage from '@/app/(control)/control/tenants/[nodeId]/manifest/page';

describe('TenantManifestAuthoringPage', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders draft preview and published state from saved payload', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            node_id: 7,
            node_slug: 'mudyin',
            revision_token: 'psmrev:abc123',
            published_revision_token: 'psmrev:pub123',
            published_at: '2026-04-14T12:11:00+00:00',
            published_by: 'control-admin',
            authoring: {
              site_name: 'Mudyin Draft',
              tagline: 'Draft tagline',
              nav_items: [{ label: 'Trust', href: '/trust', module: 'trust' }],
              enabled_modules: ['trust', 'archive'],
              footer_links: [{ label: 'Privacy', href: '/privacy' }],
              legal_links: { privacy: '/privacy', terms: '/terms', code_of_conduct: '/code-of-conduct' },
              trust_links: { trust_center: '/trust', transparency: '/transparency', archive: '/archive' },
              contact: { public_contact_url: '/contact' },
            },
            read_only: {
              site_key: 'mudyin-public',
              canonical_domains: ['mudyin.example.com'],
              preview_host: 'mudyin.preview.anu.eco',
            },
            site_manifest: { site_name: 'Mudyin Draft', tagline: 'Draft tagline' },
            published_site_manifest: { site_name: 'Mudyin Published', tagline: 'Published tagline' },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    render(<TenantManifestAuthoringPage />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText('Site name')).toHaveValue('Mudyin Draft');
    expect(screen.getByText('Draft preview (control-only)')).toBeInTheDocument();
    expect(screen.getByText('Published public shell')).toBeInTheDocument();
    expect(screen.getByText(/Draft revision/)).toBeInTheDocument();
    expect(screen.getByText('Draft ahead of live')).toBeInTheDocument();
    expect(screen.getByText(/Published by: control-admin/)).toBeInTheDocument();
  });

  it('shows backend validation errors honestly on draft save', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              node_id: 7,
              node_slug: 'mudyin',
              revision_token: 'psmrev:initial-token',
              published_revision_token: 'psmrev:initial-token',
              published_at: '2026-04-14T12:11:00+00:00',
              published_by: 'control-admin',
              authoring: {
                site_name: 'Mudyin Draft',
                tagline: 'Stories',
                nav_items: [{ label: 'Trust', href: '/trust', module: 'trust' }],
                enabled_modules: ['trust'],
                footer_links: [{ label: 'Privacy', href: '/privacy' }],
                legal_links: { privacy: '/privacy', terms: '/terms', code_of_conduct: '/code-of-conduct' },
                trust_links: { trust_center: '/trust', transparency: '/transparency', archive: '/archive' },
                contact: { public_contact_url: '/contact' },
              },
              read_only: { site_key: 'mudyin-public', canonical_domains: ['mudyin.example.com'], preview_host: null },
              site_manifest: { site_name: 'Mudyin Draft' },
              published_site_manifest: { site_name: 'Mudyin Published' },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              code: 'validation_error',
              message: 'nav_items.0.href must be a public-safe route path',
              details: { 'nav_items.0.href': ['Only public route paths are allowed.'] },
            },
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);

    render(<TenantManifestAuthoringPage />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Live')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Nav href 1'), { target: { value: '/control/tenants' } });
    fireEvent.click(screen.getByRole('button', { name: /save draft/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.getByText('nav_items.0.href must be a public-safe route path')).toBeInTheDocument();
    expect(screen.getByText(/Only public route paths are allowed/)).toBeInTheDocument();
  });

  it('shows stale publish conflict messaging and refreshes latest draft', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              node_id: 7,
              node_slug: 'mudyin',
              revision_token: 'psmrev:old-token',
              published_revision_token: 'psmrev:pub-old',
              published_at: '2026-04-14T12:11:00+00:00',
              published_by: 'control-admin',
              authoring: {
                site_name: 'Old Draft',
                tagline: 'Stories',
                nav_items: [{ label: 'Trust', href: '/trust', module: 'trust' }],
                enabled_modules: ['trust'],
                footer_links: [{ label: 'Privacy', href: '/privacy' }],
                legal_links: { privacy: '/privacy', terms: '/terms', code_of_conduct: '/code-of-conduct' },
                trust_links: { trust_center: '/trust', transparency: '/transparency', archive: '/archive' },
                contact: { public_contact_url: '/contact' },
              },
              read_only: { site_key: 'mudyin-public', canonical_domains: ['mudyin.example.com'], preview_host: null },
              site_manifest: { site_name: 'Old Draft' },
              published_site_manifest: { site_name: 'Mudyin Published' },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              code: 'manifest_publish_revision_conflict',
              message: 'Draft revision is stale. Reload latest draft before publishing.',
              details: {
                latest_revision_token: 'psmrev:new-token',
                conflict_message: 'Draft revision is stale. Reload latest draft before publishing.',
                latest_payload: {
                  node_id: 7,
                  node_slug: 'mudyin',
                  revision_token: 'psmrev:new-token',
                  published_revision_token: 'psmrev:pub-old',
                  published_at: '2026-04-14T12:11:00+00:00',
                  published_by: 'control-admin',
                  authoring: {
                    site_name: 'New Draft',
                    tagline: 'Stories',
                    nav_items: [{ label: 'Trust', href: '/trust', module: 'trust' }],
                    enabled_modules: ['trust'],
                    footer_links: [{ label: 'Privacy', href: '/privacy' }],
                    legal_links: { privacy: '/privacy', terms: '/terms', code_of_conduct: '/code-of-conduct' },
                    trust_links: { trust_center: '/trust', transparency: '/transparency', archive: '/archive' },
                    contact: { public_contact_url: '/contact' },
                  },
                  read_only: { site_key: 'mudyin-public', canonical_domains: ['mudyin.example.com'], preview_host: null },
                  site_manifest: { site_name: 'New Draft' },
                  published_site_manifest: { site_name: 'Mudyin Published' },
                },
              },
            },
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);

    render(<TenantManifestAuthoringPage />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: /publish draft/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.getByText('Draft revision is stale. Reload latest draft before publishing.')).toBeInTheDocument();
    expect(screen.getByLabelText('Site name')).toHaveValue('New Draft');
  });

  it('shows explicit denial when tenant manifest is outside operator scope', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: {
            code: 'tenant_scope_forbidden',
            message: 'Cross-tenant manifest access is not allowed for this operator.',
          },
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    render(<TenantManifestAuthoringPage />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Cross-tenant manifest access is not allowed for this operator.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save draft/i })).not.toBeInTheDocument();
  });
});
