'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Globe } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import { Card } from '@/ui-system/primitives/Card';
import { Button } from '@/ui-system/primitives/Button';
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
        // Fallback: try the federation nodes endpoint
        try {
          const res = await apiFetch<TenantNode[]>('/api/federation/nodes');
          setTenants(Array.isArray(res) ? res : []);
        } catch { /* graceful */ }
      }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const columns: Column<TenantNode>[] = [
    { key: 'id', label: 'ID', sortable: true, className: 'w-16' },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-[var(--color-foreground)]">{row.name}</span>
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
      render: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : '--',
    },
  ];

  if (loading) return <LoadingState fullPage message="Loading tenants..." />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-serif)' }}>Tenants</h1>
          <p className="text-[var(--color-muted-foreground)] mt-1">Manage platform nodes and their configurations.</p>
        </div>
        <Link href="/admin/tenants/create">
          <Button variant="primary" icon={Plus}>Provision Tenant</Button>
        </Link>
      </div>

      {tenants.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="No tenants"
          description="Provision your first tenant to get started."
          actionLabel="Create Tenant"
          actionHref="/admin/tenants/create"
        />
      ) : (
        <Card padding="md">
          <Table columns={columns} data={tenants} rowKey={(r) => r.id} pageSize={20} />
        </Card>
      )}
    </div>
  );
}
