// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import TenantsListPage from '@/app/(app)/admin/tenants/page';

type AssignmentErrorConfig = {
  status: number;
  code: string;
  message: string;
};

type FetchMockOptions = {
  assignmentReadError?: AssignmentErrorConfig;
  bootstrapCreateError?: AssignmentErrorConfig;
};

const TENANTS = [
  {
    id: 7,
    name: 'Scoped Tenant',
    slug: 'scoped-tenant',
    status: 'active',
    member_count: 9,
    created_at: '2026-03-21T00:00:00.000Z',
  },
];

function createJsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function createFetchMock(
  initialAssignments: string[] = ['tenant-operator'],
  options: FetchMockOptions = {},
) {
  const assignmentsByNode = new Map<number, string[]>([[7, [...initialAssignments]]]);
  const tenants = [...TENANTS];
  let nextTenantId = 8;

  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = (init?.method || 'GET').toUpperCase();

    if (url === '/api/control/core/api/admin/tenants' && method === 'GET') {
      return createJsonResponse(tenants);
    }

    if (url === '/api/control/core/control/sites/bootstrap' && method === 'POST') {
      if (options.bootstrapCreateError) {
        return createJsonResponse(
          {
            error: {
              code: options.bootstrapCreateError.code,
              message: options.bootstrapCreateError.message,
            },
          },
          options.bootstrapCreateError.status,
        );
      }

      const payload = JSON.parse(String(init?.body || '{}')) as {
        node_name?: string;
        node_slug?: string;
        site_name?: string;
        operator_usernames?: string[];
      };
      const slug =
        String(payload.node_slug || '')
          .trim()
          .toLowerCase() ||
        String(payload.node_name || '')
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

      if (tenants.some((tenant) => tenant.slug === slug)) {
        return createJsonResponse(
          {
            error: {
              code: 'identifier_conflict',
              message: 'A tenant node with this slug already exists.',
            },
          },
          409,
        );
      }

      const nextTenant = {
        id: nextTenantId,
        name: String(payload.node_name || 'New Tenant').trim(),
        slug,
        status: 'active',
        member_count: 0,
        created_at: '2026-04-15T00:00:00.000Z',
      };
      nextTenantId += 1;
      tenants.push(nextTenant);
      assignmentsByNode.set(nextTenant.id, payload.operator_usernames || []);

      return createJsonResponse({
        ok: true,
        data: {
          node: {
            id: nextTenant.id,
            name: nextTenant.name,
            slug: nextTenant.slug,
            status: nextTenant.status,
          },
          site_manifest: {
            site_key: `${nextTenant.slug}-public`,
            site_name: String(payload.site_name || '').trim(),
            tagline: 'Public civic routes hosted on ANU platform rails.',
            canonical_domains: [],
            preview_host: `${nextTenant.slug}.preview.anu.eco`,
          },
          domain_bindings: {
            canonical_domains: [],
            count: 0,
          },
          operator_assignments: {
            usernames: payload.operator_usernames || [],
            user_ids: [],
            count: (payload.operator_usernames || []).length,
          },
        },
      });
    }

    const assignmentRoute = url.match(/^\/api\/control\/core\/control\/sites\/(\d+)\/operator-assignments(?:\/([^/?#]+))?$/);
    if (!assignmentRoute) {
      return createJsonResponse(
        {
          error: {
            code: 'not_found',
            message: `Unhandled ${method} ${url}`,
          },
        },
        404,
      );
    }

    const nodeId = Number(assignmentRoute[1]);
    const routeUsername = assignmentRoute[2] ? decodeURIComponent(assignmentRoute[2]) : '';
    const currentAssignments = assignmentsByNode.get(nodeId) ?? [];

    if (method === 'GET') {
      if (options.assignmentReadError) {
        return createJsonResponse(
          {
            error: {
              code: options.assignmentReadError.code,
              message: options.assignmentReadError.message,
            },
          },
          options.assignmentReadError.status,
        );
      }
      return createJsonResponse({
        ok: true,
        data: {
          node_id: nodeId,
          assignments: {
            usernames: currentAssignments,
            user_ids: [],
            count: currentAssignments.length,
          },
        },
      });
    }

    if (method === 'POST') {
      const payload = JSON.parse(String(init?.body || '{}')) as { username?: string };
      const normalizedUsername = String(payload.username || '').trim().toLowerCase();
      const alreadyAssigned = currentAssignments.includes(normalizedUsername);
      const nextAssignments = alreadyAssigned ? currentAssignments : [...currentAssignments, normalizedUsername];
      assignmentsByNode.set(nodeId, nextAssignments);

      return createJsonResponse({
        ok: true,
        data: {
          node_id: nodeId,
          assignments: {
            usernames: nextAssignments,
            user_ids: [],
            count: nextAssignments.length,
          },
          mutation: {
            action: 'assign',
            requested_username: normalizedUsername,
            normalized_username: normalizedUsername,
            operator_user_id: null,
            applied: !alreadyAssigned,
            idempotent_noop: alreadyAssigned,
          },
        },
      });
    }

    if (method === 'DELETE') {
      const normalizedUsername = routeUsername.trim().toLowerCase();
      const existed = currentAssignments.includes(normalizedUsername);
      const nextAssignments = currentAssignments.filter((username) => username !== normalizedUsername);
      assignmentsByNode.set(nodeId, nextAssignments);

      return createJsonResponse({
        ok: true,
        data: {
          node_id: nodeId,
          assignments: {
            usernames: nextAssignments,
            user_ids: [],
            count: nextAssignments.length,
          },
          mutation: {
            action: 'unassign',
            requested_username: normalizedUsername,
            normalized_username: normalizedUsername,
            operator_user_id: null,
            applied: existed,
            idempotent_noop: !existed,
          },
        },
      });
    }

    return createJsonResponse(
      {
        error: {
          code: 'method_not_allowed',
          message: `Unhandled ${method} ${url}`,
        },
      },
      405,
    );
  });
}

describe('TenantsListPage', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('platform admin can load assignment list', async () => {
    const fetchMock = createFetchMock(['tenant-operator']);
    vi.stubGlobal('fetch', fetchMock);

    render(<TenantsListPage />);

    await waitFor(() => expect(screen.getByText('Operator assignment management')).toBeInTheDocument());
    expect(screen.getByText('tenant-operator')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/control/core/control/sites/7/operator-assignments',
      expect.objectContaining({
        credentials: 'include',
        cache: 'no-store',
      }),
    );
  });

  it('platform admin can assign username', async () => {
    const fetchMock = createFetchMock([]);
    vi.stubGlobal('fetch', fetchMock);

    render(<TenantsListPage />);

    await waitFor(() => expect(screen.getByText('Operator assignment management')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Assign operator username'), { target: { value: '  SECOND-OPERATOR  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Assign' }));

    await waitFor(() => expect(screen.getByText('second-operator assigned to this tenant.')).toBeInTheDocument());
    expect(screen.getByText('second-operator')).toBeInTheDocument();
  });

  it('platform admin can unassign username', async () => {
    const fetchMock = createFetchMock(['tenant-operator']);
    vi.stubGlobal('fetch', fetchMock);

    render(<TenantsListPage />);

    await waitFor(() => expect(screen.getByText('tenant-operator')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() => expect(screen.getByText('tenant-operator unassigned from this tenant.')).toBeInTheDocument());
    expect(screen.getByText('No delegated operators are currently assigned for this tenant.')).toBeInTheDocument();
  });

  it('renders idempotent no-op states honestly', async () => {
    const fetchMock = createFetchMock(['tenant-operator']);
    vi.stubGlobal('fetch', fetchMock);

    render(<TenantsListPage />);

    await waitFor(() => expect(screen.getByText('tenant-operator')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Assign operator username'), { target: { value: 'TENANT-OPERATOR' } });
    fireEvent.click(screen.getByRole('button', { name: 'Assign' }));
    await waitFor(() => expect(screen.getByText('tenant-operator is already assigned to this tenant.')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Unassign operator username'), { target: { value: 'missing-user' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unassign' }));
    await waitFor(() =>
      expect(screen.getByText('missing-user is not currently assigned to this tenant.')).toBeInTheDocument(),
    );
  });

  it('non-platform users do not get assignment-management UI', async () => {
    const fetchMock = createFetchMock([], {
      assignmentReadError: {
        status: 403,
        code: 'platform_admin_required',
        message: 'Platform admin role is required for operator assignment management.',
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<TenantsListPage />);

    await waitFor(() => expect(screen.getByText('Scoped Tenant')).toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText('Operator assignment management')).not.toBeInTheDocument());
  });

  it('surfaces assignment endpoint errors honestly', async () => {
    const fetchMock = createFetchMock([], {
      assignmentReadError: {
        status: 503,
        code: 'service_unavailable',
        message: 'Operator assignment endpoint unavailable.',
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<TenantsListPage />);

    await waitFor(() => expect(screen.getByText('Operator assignment management')).toBeInTheDocument());
    expect(screen.getByText('Operator assignment endpoint unavailable.')).toBeInTheDocument();
  });

  it('platform admin can create a bootstrapped node from minimal control form', async () => {
    const fetchMock = createFetchMock([]);
    vi.stubGlobal('fetch', fetchMock);

    render(<TenantsListPage />);

    await waitFor(() => expect(screen.getByText('Node bootstrap')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Node display name'), { target: { value: 'Mudyin North' } });
    fireEvent.change(screen.getByLabelText('Initial site name'), { target: { value: 'Mudyin North Public' } });
    fireEvent.change(screen.getByLabelText('Initial operator usernames (optional, comma-separated)'), {
      target: { value: '  TENANT-OPERATOR ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create node' }));

    await waitFor(() => expect(screen.getByText('Node mudyin-north created and bootstrapped.')).toBeInTheDocument());
    expect(screen.getByText('Mudyin North')).toBeInTheDocument();
  });

  it('surfaces bootstrap conflict errors honestly', async () => {
    const fetchMock = createFetchMock([], {
      bootstrapCreateError: {
        status: 409,
        code: 'identifier_conflict',
        message: 'A tenant node with this slug already exists.',
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<TenantsListPage />);

    await waitFor(() => expect(screen.getByText('Node bootstrap')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Node display name'), { target: { value: 'Existing Node' } });
    fireEvent.change(screen.getByLabelText('Initial site name'), { target: { value: 'Existing Site' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create node' }));

    await waitFor(() => expect(screen.getByText('A tenant node with this slug already exists.')).toBeInTheDocument());
  });

  it('non-platform users do not get bootstrap UI', async () => {
    const fetchMock = createFetchMock([], {
      assignmentReadError: {
        status: 403,
        code: 'platform_admin_required',
        message: 'Platform admin role is required for operator assignment management.',
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<TenantsListPage />);

    await waitFor(() => expect(screen.getByText('Scoped Tenant')).toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText('Node bootstrap')).not.toBeInTheDocument());
  });
});
