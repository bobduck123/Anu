'use client';

import { useEffect, useMemo, useState } from 'react';
import { Globe, Network, Plus, ShieldCheck, Users } from 'lucide-react';
import {
  assignControlSiteOperatorUsername,
  createControlSiteBootstrap,
  ControlApiError,
  getControlSiteOperatorAssignments,
  listControlTenants,
  normalizeControlCanonicalDomain,
  normalizeControlOperatorUsername,
  unassignControlSiteOperatorUsername,
  type ControlTenantNode,
} from '@/lib/api/controlClient';
import {
  AnuControlLink,
  AnuHeroMetric,
  AnuInstrumentationCard,
  AnuPageHero,
  AnuSectionHeading,
  AnuSurfacePanel,
} from '@/ui-system/anu/surfacePrimitives';
import { Table, type Column } from '@/ui-system/primitives/Table';
import { LoadingState } from '@/ui-system/states/LoadingState';
import { EmptyState } from '@/ui-system/states/EmptyState';
import { StatusBadge } from '@/ui-system/primitives/StatusBadge';

export default function ControlTenantsPage() {
  const [tenants, setTenants] = useState<ControlTenantNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [operatorAssignments, setOperatorAssignments] = useState<string[]>([]);
  const [assignmentPanelVisibility, setAssignmentPanelVisibility] = useState<'unknown' | 'visible' | 'hidden'>('unknown');
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentMutating, setAssignmentMutating] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(null);
  const [assignUsernameInput, setAssignUsernameInput] = useState('');
  const [unassignUsernameInput, setUnassignUsernameInput] = useState('');
  const [bootstrapNodeName, setBootstrapNodeName] = useState('');
  const [bootstrapNodeSlug, setBootstrapNodeSlug] = useState('');
  const [bootstrapSiteName, setBootstrapSiteName] = useState('');
  const [bootstrapSiteKey, setBootstrapSiteKey] = useState('');
  const [bootstrapCanonicalDomainsInput, setBootstrapCanonicalDomainsInput] = useState('');
  const [bootstrapOperatorUsernamesInput, setBootstrapOperatorUsernamesInput] = useState('');
  const [bootstrapSubmitting, setBootstrapSubmitting] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [bootstrapMessage, setBootstrapMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await listControlTenants();
        if (!active) {
          return;
        }
        setTenants(Array.isArray(data) ? data : []);
      } catch {
        if (!active) {
          return;
        }
        setTenants([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (tenants.length === 0) {
      setSelectedTenantId(null);
      return;
    }

    setSelectedTenantId((current) => {
      if (current && tenants.some((tenant) => tenant.id === current)) {
        return current;
      }
      return tenants[0].id;
    });
  }, [tenants]);

  useEffect(() => {
    if (!selectedTenantId || assignmentPanelVisibility === 'hidden') {
      return;
    }

    let active = true;
    setAssignmentLoading(true);
    setAssignmentError(null);
    setAssignmentMessage(null);

    const loadAssignments = async () => {
      try {
        const payload = await getControlSiteOperatorAssignments(selectedTenantId);
        if (!active) {
          return;
        }
        setAssignmentPanelVisibility('visible');
        setOperatorAssignments(payload.assignments?.usernames || []);
      } catch (error) {
        if (!active) {
          return;
        }
        if (error instanceof ControlApiError && error.code === 'platform_admin_required') {
          setAssignmentPanelVisibility('hidden');
          setOperatorAssignments([]);
          return;
        }
        setAssignmentPanelVisibility('visible');
        setOperatorAssignments([]);
        setAssignmentError(error instanceof Error ? error.message : 'Unable to load operator assignments.');
      } finally {
        if (active) {
          setAssignmentLoading(false);
        }
      }
    };

    void loadAssignments();

    return () => {
      active = false;
    };
  }, [selectedTenantId]);

  const handleAssignmentMutation = async (action: 'assign' | 'unassign', rawUsername: string) => {
    if (!selectedTenantId) {
      return;
    }

    const normalizedUsername = normalizeControlOperatorUsername(rawUsername);
    if (!normalizedUsername) {
      setAssignmentError('Operator username is required.');
      setAssignmentMessage(null);
      return;
    }

    setAssignmentMutating(true);
    setAssignmentError(null);
    setAssignmentMessage(null);

    try {
      const payload =
        action === 'assign'
          ? await assignControlSiteOperatorUsername(selectedTenantId, normalizedUsername)
          : await unassignControlSiteOperatorUsername(selectedTenantId, normalizedUsername);

      setOperatorAssignments(payload.assignments?.usernames || []);
      const mutation = payload.mutation;
      const mutationUsername = mutation?.normalized_username || normalizedUsername;

      if (mutation?.idempotent_noop) {
        setAssignmentMessage(
          action === 'assign'
            ? `${mutationUsername} is already assigned to this tenant.`
            : `${mutationUsername} is not currently assigned to this tenant.`,
        );
      } else {
        setAssignmentMessage(
          action === 'assign'
            ? `${mutationUsername} assigned to this tenant.`
            : `${mutationUsername} unassigned from this tenant.`,
        );
      }

      if (action === 'assign') {
        setAssignUsernameInput('');
      } else {
        setUnassignUsernameInput('');
      }
    } catch (error) {
      setAssignmentError(error instanceof Error ? error.message : 'Unable to update operator assignments.');
    } finally {
      setAssignmentMutating(false);
    }
  };

  const parseCsvInput = (raw: string) =>
    raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

  const handleBootstrapSubmit = async () => {
    const nodeName = bootstrapNodeName.trim();
    const siteName = bootstrapSiteName.trim();
    const nodeSlug = bootstrapNodeSlug.trim();
    const siteKey = bootstrapSiteKey.trim();
    const canonicalDomains = parseCsvInput(bootstrapCanonicalDomainsInput)
      .map((value) => normalizeControlCanonicalDomain(value))
      .filter(Boolean);
    const operatorUsernames = parseCsvInput(bootstrapOperatorUsernamesInput)
      .map((value) => normalizeControlOperatorUsername(value))
      .filter(Boolean);

    if (!nodeName) {
      setBootstrapError('Node display name is required.');
      setBootstrapMessage(null);
      return;
    }
    if (!siteName) {
      setBootstrapError('Initial site name is required.');
      setBootstrapMessage(null);
      return;
    }

    setBootstrapSubmitting(true);
    setBootstrapError(null);
    setBootstrapMessage(null);

    try {
      const payload = await createControlSiteBootstrap({
        node_name: nodeName,
        ...(nodeSlug ? { node_slug: nodeSlug } : {}),
        site_name: siteName,
        ...(siteKey ? { site_key: siteKey } : {}),
        ...(canonicalDomains.length > 0 ? { canonical_domains: canonicalDomains } : {}),
        ...(operatorUsernames.length > 0 ? { operator_usernames: operatorUsernames } : {}),
      });

      const refreshedTenants = await listControlTenants();
      const nextTenants = Array.isArray(refreshedTenants) ? refreshedTenants : [];
      setTenants(nextTenants);
      if (payload.node?.id) {
        setSelectedTenantId(payload.node.id);
      }

      setBootstrapNodeName('');
      setBootstrapNodeSlug('');
      setBootstrapSiteName('');
      setBootstrapSiteKey('');
      setBootstrapCanonicalDomainsInput('');
      setBootstrapOperatorUsernamesInput('');
      setBootstrapMessage(`Node ${payload.node.slug} created and bootstrapped.`);
    } catch (error) {
      setBootstrapError(error instanceof Error ? error.message : 'Unable to create node bootstrap.');
    } finally {
      setBootstrapSubmitting(false);
    }
  };

  const activeCount = useMemo(
    () => tenants.filter((tenant) => (tenant.status || 'active').toLowerCase() === 'active').length,
    [tenants],
  );
  const memberTotal = useMemo(
    () => tenants.reduce((sum, tenant) => sum + (Number(tenant.member_count) || 0), 0),
    [tenants],
  );

  const columns: Column<ControlTenantNode>[] = [
    { key: 'id', label: 'ID', sortable: true, className: 'w-16' },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-[var(--color-foreground)]">{row.name}</span>
          <AnuControlLink href={`/control/tenants/${row.id}/manifest`} tone="default" className="text-[11px]">
            Edit public manifest
          </AnuControlLink>
        </div>
      ),
    },
    { key: 'slug', label: 'Slug' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={(row.status || 'active') as 'active'} dot />,
    },
    {
      key: 'member_count',
      label: 'Members',
      sortable: true,
      render: (row) => <span className="font-mono-data">{row.member_count ?? '--'}</span>,
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (row) => (row.created_at ? new Date(row.created_at).toLocaleDateString() : '--'),
    },
  ];

  if (loading) {
    return <LoadingState fullPage message="Loading tenants..." />;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-2">
        <AnuPageHero
          eyebrow="Control observatory"
          title="Tenants and platform nodes"
          description="Control-plane tenant registry. Requests in this route flow only through the server-side control proxy boundary."
          actions={
            <AnuControlLink href="#node-bootstrap" tone="active" iconLeft={Plus}>
              Bootstrap node
            </AnuControlLink>
          }
          aside={
            <AnuSurfacePanel tone="quiet" className="h-full p-5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[color:rgba(246,212,203,0.64)]">Control boundary</p>
              <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.84)]">
                Browser calls stay on <code>/api/control/*</code>. Upstream privileged auth is injected server-side.
              </p>
            </AnuSurfacePanel>
          }
        >
          <div className="grid gap-4 md:grid-cols-3">
            <AnuHeroMetric
              label="Nodes tracked"
              value={String(tenants.length)}
              detail="Current tenant records available through the control proxy."
            />
            <AnuHeroMetric
              label="Active nodes"
              value={String(activeCount)}
              detail="Nodes with active status in the current registry view."
            />
            <AnuHeroMetric
              label="Members visible"
              value={memberTotal ? String(memberTotal) : '--'}
              detail="Aggregate member count across nodes when member counts are available."
            />
          </div>
        </AnuPageHero>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <AnuInstrumentationCard
            label="Registry state"
            value={tenants.length ? 'Populated' : 'Empty'}
            detail="Tenant rows are fetched via the control proxy route family."
            icon={Network}
            tone="signal"
          />
          <AnuInstrumentationCard
            label="Provisioning"
            value="Manual"
            detail="New tenants are intentionally provisioned with explicit steward action."
            icon={Globe}
          />
          <AnuInstrumentationCard
            label="Accountability"
            value="Visible status"
            detail="Status and member counts make cross-node comparison possible from a single observatory surface."
            icon={Users}
          />
        </section>

        <section className="mt-12">
          <AnuSectionHeading
            eyebrow="Tenant registry"
            title="Compare node state"
            description="Scannable tenant comparison with a strict control-plane boundary."
            action={
              <AnuControlLink href="/governance/federation" tone="default" iconLeft={ShieldCheck}>
                Federation metrics
              </AnuControlLink>
            }
          />

          {tenants.length === 0 ? (
            <AnuSurfacePanel tone="soft" className="mt-8 p-0">
              <EmptyState
                icon={Globe}
                title="No tenants"
                description="Provision your first tenant to establish the node registry."
                actionLabel="Bootstrap node"
                actionHref="#node-bootstrap"
              />
            </AnuSurfacePanel>
          ) : (
            <AnuSurfacePanel tone="soft" className="mt-8 p-4 md:p-5">
              <Table columns={columns} data={tenants} rowKey={(row) => row.id} pageSize={20} />
            </AnuSurfacePanel>
          )}
        </section>

        {assignmentPanelVisibility === 'visible' ? (
          <section className="mt-12" id="node-bootstrap">
            <AnuSectionHeading
              eyebrow="Platform admin"
              title="Node bootstrap"
              description="Create a new white-label node with a minimal published manifest scaffold."
            />

            <AnuSurfacePanel tone="soft" className="mt-8 p-4 md:p-5">
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleBootstrapSubmit();
                }}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm text-[color:rgba(246,212,203,0.84)]">
                    Node display name
                    <input
                      value={bootstrapNodeName}
                      onChange={(event) => setBootstrapNodeName(event.target.value)}
                      placeholder="Mudyin Public"
                      className="rounded-md border border-[color:rgba(246,212,203,0.28)] bg-[color:rgba(39,10,42,0.62)] px-3 py-2 text-sm text-[var(--color-foreground)]"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm text-[color:rgba(246,212,203,0.84)]">
                    Initial site name
                    <input
                      value={bootstrapSiteName}
                      onChange={(event) => setBootstrapSiteName(event.target.value)}
                      placeholder="Mudyin Public Commons"
                      className="rounded-md border border-[color:rgba(246,212,203,0.28)] bg-[color:rgba(39,10,42,0.62)] px-3 py-2 text-sm text-[var(--color-foreground)]"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm text-[color:rgba(246,212,203,0.84)]">
                    Node slug (optional)
                    <input
                      value={bootstrapNodeSlug}
                      onChange={(event) => setBootstrapNodeSlug(event.target.value)}
                      placeholder="mudyin-public"
                      className="rounded-md border border-[color:rgba(246,212,203,0.28)] bg-[color:rgba(39,10,42,0.62)] px-3 py-2 text-sm text-[var(--color-foreground)]"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm text-[color:rgba(246,212,203,0.84)]">
                    Site key (optional)
                    <input
                      value={bootstrapSiteKey}
                      onChange={(event) => setBootstrapSiteKey(event.target.value)}
                      placeholder="mudyin-public-site"
                      className="rounded-md border border-[color:rgba(246,212,203,0.28)] bg-[color:rgba(39,10,42,0.62)] px-3 py-2 text-sm text-[var(--color-foreground)]"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm text-[color:rgba(246,212,203,0.84)] md:col-span-2">
                    Canonical domains (optional, comma-separated)
                    <input
                      value={bootstrapCanonicalDomainsInput}
                      onChange={(event) => setBootstrapCanonicalDomainsInput(event.target.value)}
                      placeholder="example.org, www.example.org"
                      className="rounded-md border border-[color:rgba(246,212,203,0.28)] bg-[color:rgba(39,10,42,0.62)] px-3 py-2 text-sm text-[var(--color-foreground)]"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm text-[color:rgba(246,212,203,0.84)] md:col-span-2">
                    Initial operator usernames (optional, comma-separated)
                    <input
                      value={bootstrapOperatorUsernamesInput}
                      onChange={(event) => setBootstrapOperatorUsernamesInput(event.target.value)}
                      placeholder="operator-a, operator-b"
                      className="rounded-md border border-[color:rgba(246,212,203,0.28)] bg-[color:rgba(39,10,42,0.62)] px-3 py-2 text-sm text-[var(--color-foreground)]"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={bootstrapSubmitting}
                  className="rounded-md border border-[color:rgba(246,212,203,0.3)] px-3 py-2 text-sm text-[var(--color-foreground)] disabled:opacity-60"
                >
                  Create node
                </button>
              </form>

              {bootstrapMessage ? (
                <p className="mt-4 text-sm text-[color:rgba(190,246,206,0.92)]">{bootstrapMessage}</p>
              ) : null}
              {bootstrapError ? <p className="mt-4 text-sm text-red-200">{bootstrapError}</p> : null}
            </AnuSurfacePanel>
          </section>
        ) : null}

        {assignmentPanelVisibility === 'visible' && selectedTenantId ? (
          <section className="mt-12">
            <AnuSectionHeading
              eyebrow="Platform admin"
              title="Operator assignment management"
              description="Platform-admin-only tenant operator assignment controls."
            />

            <AnuSurfacePanel tone="soft" className="mt-8 p-4 md:p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-[color:rgba(246,212,203,0.84)]">
                  Tenant node
                  <select
                    value={String(selectedTenantId)}
                    onChange={(event) => {
                      setSelectedTenantId(Number(event.target.value));
                      setAssignmentError(null);
                      setAssignmentMessage(null);
                    }}
                    className="rounded-md border border-[color:rgba(246,212,203,0.28)] bg-[color:rgba(39,10,42,0.62)] px-3 py-2 text-sm text-[var(--color-foreground)]"
                  >
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name} ({tenant.slug})
                      </option>
                    ))}
                  </select>
                </label>
                <div className="rounded-md border border-[color:rgba(246,212,203,0.2)] bg-[color:rgba(39,10,42,0.45)] p-3 text-xs text-[color:rgba(246,212,203,0.84)]">
                  Operator usernames are normalized to lowercase before persistence and comparison.
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <form
                  className="space-y-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleAssignmentMutation('assign', assignUsernameInput);
                  }}
                >
                  <label className="flex flex-col gap-2 text-sm text-[color:rgba(246,212,203,0.84)]">
                    Assign operator username
                    <input
                      value={assignUsernameInput}
                      onChange={(event) => setAssignUsernameInput(event.target.value)}
                      placeholder="operator-username"
                      className="rounded-md border border-[color:rgba(246,212,203,0.28)] bg-[color:rgba(39,10,42,0.62)] px-3 py-2 text-sm text-[var(--color-foreground)]"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={assignmentMutating || assignmentLoading}
                    className="rounded-md border border-[color:rgba(246,212,203,0.3)] px-3 py-2 text-sm text-[var(--color-foreground)] disabled:opacity-60"
                  >
                    Assign
                  </button>
                </form>

                <form
                  className="space-y-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleAssignmentMutation('unassign', unassignUsernameInput);
                  }}
                >
                  <label className="flex flex-col gap-2 text-sm text-[color:rgba(246,212,203,0.84)]">
                    Unassign operator username
                    <input
                      value={unassignUsernameInput}
                      onChange={(event) => setUnassignUsernameInput(event.target.value)}
                      placeholder="operator-username"
                      className="rounded-md border border-[color:rgba(246,212,203,0.28)] bg-[color:rgba(39,10,42,0.62)] px-3 py-2 text-sm text-[var(--color-foreground)]"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={assignmentMutating || assignmentLoading}
                    className="rounded-md border border-[color:rgba(246,212,203,0.3)] px-3 py-2 text-sm text-[var(--color-foreground)] disabled:opacity-60"
                  >
                    Unassign
                  </button>
                </form>
              </div>

              <div className="mt-6 rounded-md border border-[color:rgba(246,212,203,0.2)] bg-[color:rgba(39,10,42,0.45)] p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-[color:rgba(246,212,203,0.64)]">Assigned operators</p>
                {assignmentLoading ? (
                  <p className="mt-3 text-sm text-[color:rgba(246,212,203,0.84)]">Loading operator assignments...</p>
                ) : operatorAssignments.length === 0 ? (
                  <p className="mt-3 text-sm text-[color:rgba(246,212,203,0.84)]">
                    No delegated operators are currently assigned for this tenant.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {operatorAssignments.map((username) => (
                      <li key={username} className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-mono-data">{username}</span>
                        <button
                          type="button"
                          disabled={assignmentMutating || assignmentLoading}
                          onClick={() => void handleAssignmentMutation('unassign', username)}
                          className="rounded-md border border-[color:rgba(246,212,203,0.3)] px-3 py-1 text-xs text-[var(--color-foreground)] disabled:opacity-60"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {assignmentMessage ? (
                <p className="mt-4 text-sm text-[color:rgba(190,246,206,0.92)]">{assignmentMessage}</p>
              ) : null}
              {assignmentError ? <p className="mt-4 text-sm text-red-200">{assignmentError}</p> : null}
            </AnuSurfacePanel>
          </section>
        ) : null}
      </div>
    </div>
  );
}
