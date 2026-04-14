'use client';

import { useEffect, useMemo, useState } from 'react';
import { Globe, Network, Plus, ShieldCheck, Users } from 'lucide-react';
import {
  listControlTenants,
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
            <AnuControlLink href="/control/tenants/create" tone="active" iconLeft={Plus}>
              Provision tenant
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
                actionLabel="Create tenant"
                actionHref="/control/tenants/create"
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
