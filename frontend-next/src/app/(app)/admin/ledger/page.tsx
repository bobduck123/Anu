'use client';

import { useState, useEffect } from 'react';
import { Database, Filter } from 'lucide-react';
import { api, type LedgerEntry } from '@/lib/api';
import { Card } from '@/ui-system/primitives/Card';
import { Table, type Column } from '@/ui-system/primitives/Table';
import { LoadingState } from '@/ui-system/states/LoadingState';
import { EmptyState } from '@/ui-system/states/EmptyState';
import { StatusBadge } from '@/ui-system/primitives/StatusBadge';
import { Select } from '@/ui-system/primitives/Form';

export default function AdminLedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [filtered, setFiltered] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [poolFilter, setPoolFilter] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.ledger.getEntries();
        const data = Array.isArray(res) ? res : res?.entries || [];
        setEntries(data);
        setFiltered(data);
      } catch { /* graceful */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  useEffect(() => {
    let f = entries;
    if (typeFilter) f = f.filter((e) => e.entry_type === typeFilter);
    if (poolFilter) f = f.filter((e) => e.pool_label === poolFilter);
    setFiltered(f);
  }, [entries, typeFilter, poolFilter]);

  const entryTypes = [...new Set(entries.map((e) => e.entry_type))];
  const pools = [...new Set(entries.map((e) => e.pool_label).filter(Boolean))];

  const columns: Column<LedgerEntry>[] = [
    { key: 'id', label: '#', sortable: true, className: 'w-16' },
    { key: 'entry_type', label: 'Type', render: (r) => <StatusBadge status={r.entry_type as 'active'} /> },
    { key: 'description', label: 'Description' },
    {
      key: 'amount_cents',
      label: 'Amount',
      sortable: true,
      render: (r) => {
        const val = (r.amount_cents || 0) / 100;
        const color = val >= 0 ? 'text-[var(--color-forest)]' : 'text-[var(--color-danger)]';
        return <span className={`font-mono-data ${color}`}>{val >= 0 ? '+' : ''}{val.toFixed(2)}</span>;
      },
    },
    { key: 'pool_label', label: 'Pool', render: (r) => r.pool_label || '--' },
    { key: 'user_id', label: 'User', render: (r) => r.user_id ? `#${r.user_id}` : '--' },
    {
      key: 'created_at',
      label: 'Date',
      sortable: true,
      render: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString() : '--',
    },
  ];

  if (loading) return <LoadingState fullPage message="Loading ledger..." />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6" style={{ fontFamily: 'var(--font-serif)' }}>Ledger Explorer</h1>

      {/* Filters */}
      <Card padding="md" className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <Filter className="w-5 h-5 text-[var(--color-muted-foreground)]" />
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-48">
            <option value="">All Types</option>
            {entryTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Select value={poolFilter} onChange={(e) => setPoolFilter(e.target.value)} className="w-48">
            <option value="">All Pools</option>
            {pools.map((p) => <option key={p} value={p!}>{p}</option>)}
          </Select>
          <span className="text-sm text-[var(--color-muted-foreground)]">
            {filtered.length} of {entries.length} entries
          </span>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState icon={Database} title="No entries" description="No ledger entries match your filters." />
      ) : (
        <Card padding="md">
          <Table columns={columns} data={filtered} rowKey={(r) => r.id} pageSize={25} />
        </Card>
      )}
    </div>
  );
}
