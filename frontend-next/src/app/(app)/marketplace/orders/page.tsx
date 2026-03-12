'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import { Card } from '@/ui-system/primitives/Card';
import { Table, type Column } from '@/ui-system/primitives/Table';
import { LoadingState } from '@/ui-system/states/LoadingState';
import { EmptyState } from '@/ui-system/states/EmptyState';
import { StatusBadge } from '@/ui-system/primitives/StatusBadge';

interface Order {
  id: number;
  total_cents: number;
  status: string;
  created_at: string;
  items_count: number;
  [key: string]: unknown;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch<Order[]>('/api/marketplace/orders');
        setOrders(res || []);
      } catch { /* no orders endpoint yet — show empty state */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const columns: Column<Order>[] = [
    { key: 'id', label: 'Order #', sortable: true },
    {
      key: 'total_cents',
      label: 'Total',
      sortable: true,
      render: (row) => <span className="font-mono-data">${((row.total_cents || 0) / 100).toFixed(2)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status as 'pending' | 'completed'} />,
    },
    {
      key: 'created_at',
      label: 'Date',
      sortable: true,
      render: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : '--',
    },
  ];

  if (loading) return <LoadingState fullPage message="Loading orders..." />;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6" style={{ fontFamily: 'var(--font-serif)' }}>Order History</h1>
      {orders.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="No orders yet" description="Your purchase history will appear here." actionLabel="Browse Marketplace" actionHref="/marketplace" />
      ) : (
        <Card padding="md">
          <Table columns={columns} data={orders} rowKey={(r) => r.id} pageSize={15} />
        </Card>
      )}
    </div>
  );
}
