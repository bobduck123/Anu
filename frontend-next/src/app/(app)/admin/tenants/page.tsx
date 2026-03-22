'use client';

import { useEffect, useMemo, useState } from 'react';
import { Globe, Network, Plus, ShieldCheck, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
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

interface TenantNode {
  id: number;
  name: string;
  slug: string;
  status: string;
  member_count?: number;
  created_at?: string;
  [key: string]: unknown;
}

export default function TenantsListPage() {
  const [tenants, setTenants] = useState<TenantNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch<TenantNode[] | { nodes: TenantNode[] }>('/api/admin/tenants');
        const data = Array.isArray(res) ? res : (res as { nodes: TenantNode[] })?.nodes || [];
        setTenants(data);
      } catch {
        try {
          const res = await apiFetch<TenantNode[]>('/api/federation/nodes');
          setTenants(Array.isArray(res) ? res : []);
        } catch {
          setTenants([]);
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const activeCount = useMemo(
    () => tenants.filter((tenant) => (tenant.status || 'active').toLowerCase() === 'active').length,
    [tenants],
  );
  const memberTotal = useMemo(
    () => tenants.reduce((sum, tenant) => sum + (Number(tenant.member_count) || 0), 0),
    [tenants],
  );

  const columns: Column<TenantNode>[] = [
    { key: 'id', label: 'ID', sortable: true, className: 'w-16' },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (row) => <span className="font-medium text-[var(--color-foreground)]">{row.name}</span>,
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
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 md:px-8">
        <AnuPageHero
          eyebrow="Admin observatory"
          title="Tenants and platform nodes"
          description="Provision, inspect, and compare tenant nodes from a calmer administrative surface. This route should read as an observatory for platform shape rather than a generic CRUD table."
          actions={
            <AnuControlLink href="/admin/tenants/create" tone="active" iconLeft={Plus}>
              Provision tenant
            </AnuControlLink>
          }
          aside={
            <AnuSurfacePanel tone="quiet" className="h-full p-5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Administrative posture</p>
              <p className="mt-3 text-sm leading-6 text-slate-300/84">
                Admin routes should be calmer than the public shell, with metrics, registries, and comparison rows doing most of the work.
              </p>
            </AnuSurfacePanel>
          }
        >
          <div className="grid gap-4 md:grid-cols-3">
            <AnuHeroMetric
              label="Nodes tracked"
              value={String(tenants.length)}
              detail="Current tenant records available through the admin or federation node contract."
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
            detail="The tenant registry should remain explicit even when fallback federation data is used."
            icon={Network}
            tone="signal"
          />
          <AnuInstrumentationCard
            label="Provisioning"
            value="Manual"
            detail="New tenants are intentionally provisioned with explicit steward action rather than hidden automation."
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
            description="This registry should remain scannable first: name, slug, status, member count, and age are the primary comparison signals."
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
                actionLabel="Create tenant"
                actionHref="/admin/tenants/create"
              />
            </AnuSurfacePanel>
          ) : (
            <AnuSurfacePanel tone="soft" className="mt-8 p-4 md:p-5">
              <Table columns={columns} data={tenants} rowKey={(row) => row.id} pageSize={20} />
            </AnuSurfacePanel>
          )}
        </section>
      </div>
    </div>
  );
}
