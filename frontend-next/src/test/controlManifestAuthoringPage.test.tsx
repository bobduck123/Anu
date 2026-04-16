// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useParams: () => ({ nodeId: '7' }),
}));

import TenantManifestAuthoringPage from '@/app/(control)/control/tenants/[nodeId]/manifest/page';

type DomainBindingErrorConfig = {
  status: number;
  code: string;
  message: string;
};

type MockOptions = {
  manifestGet?: Response;
  manifestPatch?: Response;
  manifestPublish?: Response;
  domainGet?: Response;
  domainPut?: Response;
  domainGetError?: DomainBindingErrorConfig;
  readinessGet?: Response;
  readinessGetError?: DomainBindingErrorConfig;
};

function createJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function buildManifestPayload(overrides: Record<string, unknown> = {}) {
  return {
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
    ...overrides,
  };
}

function buildDomainPayload(overrides: Record<string, unknown> = {}) {
  return {
    node_id: 7,
    node_slug: 'mudyin',
    canonical_domains: ['mudyin.example.com'],
    domain_bindings: [
      {
        domain: 'mudyin.example.com',
        status: 'active',
        tls_ready: true,
        created_at: '2026-04-14T12:11:00+00:00',
      },
    ],
    ...overrides,
  };
}

function buildReadinessPayload(overrides: Record<string, unknown> = {}) {
  return {
    node_id: 7,
    node_slug: 'mudyin',
    ready: true,
    blocking_issues: [],
    warnings: [],
    checks: {
      canonical_domain_binding_present: true,
      published_manifest_present: true,
      required_legal_links_present: true,
      required_trust_links_present: true,
    },
    ...overrides,
  };
}

function createPageFetchMock(options: MockOptions = {}) {
  const manifestGet =
    options.manifestGet ||
    createJsonResponse({
      ok: true,
      data: buildManifestPayload(),
    });
  const domainGet =
    options.domainGet ||
    createJsonResponse({
      ok: true,
      data: buildDomainPayload(),
    });
  const readinessGet =
    options.readinessGet ||
    createJsonResponse({
      ok: true,
      data: buildReadinessPayload(),
    });

  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = (init?.method || 'GET').toUpperCase();

    if (url === '/api/control/core/control/sites/7/manifest-authoring' && method === 'GET') {
      return manifestGet;
    }
    if (url === '/api/control/core/control/sites/7/manifest-authoring' && method === 'PATCH') {
      if (options.manifestPatch) {
        return options.manifestPatch;
      }
      return createJsonResponse({
        ok: true,
        data: buildManifestPayload(),
      });
    }
    if (url === '/api/control/core/control/sites/7/manifest-authoring/publish' && method === 'POST') {
      if (options.manifestPublish) {
        return options.manifestPublish;
      }
      return createJsonResponse({
        ok: true,
        data: buildManifestPayload({ published_revision_token: 'psmrev:abc123' }),
      });
    }

    if (url === '/api/control/core/control/sites/7/domain-bindings' && method === 'GET') {
      if (options.domainGetError) {
        return createJsonResponse(
          {
            error: {
              code: options.domainGetError.code,
              message: options.domainGetError.message,
            },
          },
          options.domainGetError.status,
        );
      }
      return domainGet;
    }
    if (url === '/api/control/core/control/sites/7/domain-bindings' && method === 'PUT') {
      if (options.domainPut) {
        return options.domainPut;
      }
      return createJsonResponse({
        ok: true,
        data: buildDomainPayload(),
      });
    }

    if (url === '/api/control/core/control/sites/7/publish-readiness' && method === 'GET') {
      if (options.readinessGetError) {
        return createJsonResponse(
          {
            error: {
              code: options.readinessGetError.code,
              message: options.readinessGetError.message,
            },
          },
          options.readinessGetError.status,
        );
      }
      return readinessGet;
    }

    return createJsonResponse(
      {
        error: {
          code: 'not_found',
          message: `Unhandled ${method} ${url}`,
        },
      },
      404,
    );
  });
}

describe('TenantManifestAuthoringPage', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders draft preview and published state from saved payload', async () => {
    const fetchMock = createPageFetchMock();
    vi.stubGlobal('fetch', fetchMock);

    render(<TenantManifestAuthoringPage />);

    await waitFor(() => expect(screen.getByLabelText('Site name')).toHaveValue('Mudyin Draft'));
    expect(screen.getByText('Draft preview (control-only)')).toBeInTheDocument();
    expect(screen.getByText('Published public shell')).toBeInTheDocument();
    expect(screen.getByText(/Draft revision/)).toBeInTheDocument();
    expect(screen.getByText('Draft ahead of live')).toBeInTheDocument();
    expect(screen.getByText(/Published by: control-admin/)).toBeInTheDocument();
  });

  it('shows backend validation errors honestly on draft save', async () => {
    const fetchMock = createPageFetchMock({
      manifestGet: createJsonResponse({
        ok: true,
        data: buildManifestPayload({
          revision_token: 'psmrev:initial-token',
          published_revision_token: 'psmrev:initial-token',
        }),
      }),
      manifestPatch: createJsonResponse(
        {
          error: {
            code: 'validation_error',
            message: 'nav_items.0.href must be a public-safe route path',
            details: { 'nav_items.0.href': ['Only public route paths are allowed.'] },
          },
        },
        400,
      ),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<TenantManifestAuthoringPage />);

    await waitFor(() => expect(screen.getByText('Live')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Nav href 1'), { target: { value: '/control/tenants' } });
    fireEvent.click(screen.getByRole('button', { name: /save draft/i }));

    await waitFor(() => expect(screen.getByText('nav_items.0.href must be a public-safe route path')).toBeInTheDocument());
    expect(screen.getByText(/Only public route paths are allowed/)).toBeInTheDocument();
  });

  it('shows stale publish conflict messaging and refreshes latest draft', async () => {
    const fetchMock = createPageFetchMock({
      manifestGet: createJsonResponse({
        ok: true,
        data: buildManifestPayload({
          revision_token: 'psmrev:old-token',
          published_revision_token: 'psmrev:pub-old',
          authoring: {
            ...buildManifestPayload().authoring,
            site_name: 'Old Draft',
          },
          site_manifest: { site_name: 'Old Draft', tagline: 'Draft tagline' },
        }),
      }),
      manifestPublish: createJsonResponse(
        {
          error: {
            code: 'manifest_publish_revision_conflict',
            message: 'Draft revision is stale. Reload latest draft before publishing.',
            details: {
              latest_revision_token: 'psmrev:new-token',
              conflict_message: 'Draft revision is stale. Reload latest draft before publishing.',
              latest_payload: buildManifestPayload({
                revision_token: 'psmrev:new-token',
                published_revision_token: 'psmrev:pub-old',
                authoring: {
                  ...buildManifestPayload().authoring,
                  site_name: 'New Draft',
                },
                site_manifest: { site_name: 'New Draft', tagline: 'Draft tagline' },
              }),
            },
          },
        },
        409,
      ),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<TenantManifestAuthoringPage />);

    await waitFor(() => expect(screen.getByLabelText('Site name')).toHaveValue('Old Draft'));

    fireEvent.click(screen.getByRole('button', { name: /publish draft/i }));

    await waitFor(() =>
      expect(screen.getByText('Draft revision is stale. Reload latest draft before publishing.')).toBeInTheDocument(),
    );
    expect(screen.getByLabelText('Site name')).toHaveValue('New Draft');
  });

  it('shows explicit denial when tenant manifest is outside operator scope', async () => {
    const fetchMock = createPageFetchMock({
      manifestGet: createJsonResponse(
        {
          error: {
            code: 'tenant_scope_forbidden',
            message: 'Cross-tenant manifest access is not allowed for this operator.',
          },
        },
        403,
      ),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<TenantManifestAuthoringPage />);

    await waitFor(() =>
      expect(screen.getByText('Cross-tenant manifest access is not allowed for this operator.')).toBeInTheDocument(),
    );
    expect(screen.queryByRole('button', { name: /save draft/i })).not.toBeInTheDocument();
  });

  it('platform admin can read current domain bindings', async () => {
    const fetchMock = createPageFetchMock({
      domainGet: createJsonResponse({
        ok: true,
        data: buildDomainPayload({ canonical_domains: ['mudyin.example.com', 'www.mudyin.example.com'] }),
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<TenantManifestAuthoringPage />);

    await waitFor(() => expect(screen.getByText('Platform-admin domain bindings')).toBeInTheDocument());
    expect(screen.getByText('mudyin.example.com')).toBeInTheDocument();
    expect(screen.getByText('www.mudyin.example.com')).toBeInTheDocument();
  });

  it('renders publish readiness state clearly for ready and blocked payloads', async () => {
    const readyMock = createPageFetchMock({
      readinessGet: createJsonResponse({
        ok: true,
        data: buildReadinessPayload(),
      }),
    });
    vi.stubGlobal('fetch', readyMock);

    const { rerender } = render(<TenantManifestAuthoringPage />);
    await waitFor(() => expect(screen.getByText('Publish readiness')).toBeInTheDocument());
    expect(screen.getByText('Ready for public launch preflight.')).toBeInTheDocument();
    expect(screen.getAllByText('None').length).toBeGreaterThan(0);

    const blockedMock = createPageFetchMock({
      readinessGet: createJsonResponse({
        ok: true,
        data: buildReadinessPayload({
          ready: false,
          blocking_issues: [
            { code: 'missing_domain_binding', message: 'At least one canonical domain binding is required before public launch.' },
          ],
          warnings: [{ code: 'domain_tls_not_ready', message: 'One or more canonical domains report tls_ready=false.' }],
        }),
      }),
    });
    vi.stubGlobal('fetch', blockedMock);
    rerender(<TenantManifestAuthoringPage key="blocked" />);

    await waitFor(() => expect(screen.getByText('Not ready for public launch preflight.')).toBeInTheDocument());
    expect(
      screen.getByText('At least one canonical domain binding is required before public launch.'),
    ).toBeInTheDocument();
    expect(screen.getByText('One or more canonical domains report tls_ready=false.')).toBeInTheDocument();
  });

  it('platform admin can update domain bindings', async () => {
    const fetchMock = createPageFetchMock({
      domainPut: createJsonResponse({
        ok: true,
        data: buildDomainPayload({
          canonical_domains: ['launch.mudyin.example.com'],
          domain_bindings: [
            {
              domain: 'launch.mudyin.example.com',
              status: 'active',
              tls_ready: false,
              created_at: '2026-04-15T09:10:00+00:00',
            },
          ],
          mutation: {
            applied: true,
            added_domains: ['launch.mudyin.example.com'],
            removed_domains: ['mudyin.example.com'],
            normalized_domains: ['launch.mudyin.example.com'],
            idempotent_noop: false,
          },
        }),
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<TenantManifestAuthoringPage />);

    await waitFor(() => expect(screen.getByLabelText('Canonical domains')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Canonical domains'), { target: { value: '  LAUNCH.MUDYIN.EXAMPLE.COM  ' } });
    fireEvent.click(screen.getByRole('button', { name: /save domain bindings/i }));

    await waitFor(() => expect(screen.getByText('Published domain bindings updated.')).toBeInTheDocument());
    expect(screen.getAllByText('launch.mudyin.example.com').length).toBeGreaterThan(0);
  });

  it('hides domain-management UI for non-platform operators', async () => {
    const fetchMock = createPageFetchMock({
      domainGetError: {
        status: 403,
        code: 'platform_admin_required',
        message: 'Platform admin role is required for domain binding management.',
      },
      readinessGetError: {
        status: 403,
        code: 'platform_admin_required',
        message: 'Platform admin role is required for publish readiness checks.',
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<TenantManifestAuthoringPage />);

    await waitFor(() => expect(screen.getByLabelText('Site name')).toBeInTheDocument());
    expect(screen.queryByText('Platform-admin domain bindings')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Canonical domains')).not.toBeInTheDocument();
    expect(screen.queryByText('Publish readiness')).not.toBeInTheDocument();
  });

  it('surfaces domain binding errors honestly', async () => {
    const fetchMock = createPageFetchMock({
      domainGetError: {
        status: 503,
        code: 'service_unavailable',
        message: 'Domain bindings temporarily unavailable.',
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<TenantManifestAuthoringPage />);

    await waitFor(() => expect(screen.getByText('Platform-admin domain bindings')).toBeInTheDocument());
    expect(screen.getByText('Domain bindings temporarily unavailable.')).toBeInTheDocument();
  });
});
