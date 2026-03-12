'use client';

import { useState, useEffect } from 'react';
import { Wallet, CreditCard } from 'lucide-react';
import { api, type LedgerEntry } from '@/lib/api';
import { Card, CardTitle } from '@/ui-system/primitives/Card';
import { Table, type Column } from '@/ui-system/primitives/Table';
import { LoadingState } from '@/ui-system/states/LoadingState';
import { EmptyState } from '@/ui-system/states/EmptyState';
import { StatusBadge } from '@/ui-system/primitives/StatusBadge';

export default function WalletLedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [ledgerRes, balRes] = await Promise.allSettled([
          api.ledger.getEntries(),
          api.credits.balance(),
        ]);
        if (ledgerRes.status === 'fulfilled') {
          const data = ledgerRes.value;
          setEntries(Array.isArray(data) ? data : data?.entries || []);
        }
        if (balRes.status === 'fulfilled') setBalance(balRes.value?.balance || 0);
      } catch { /* graceful */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

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
    {
      key: 'created_at',
      label: 'Date',
      sortable: true,
      render: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString() : '--',
    },
  ];

  if (loading) return <LoadingState fullPage message="Loading wallet..." />;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6" style={{ fontFamily: 'var(--font-serif)' }}>Wallet & Ledger</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-sage-light)]">
              <CreditCard className="w-5 h-5 text-[var(--color-forest)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">Credit Balance</p>
              <p className="text-2xl font-bold font-mono-data">{balance}</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-institutional-light)]">
              <Wallet className="w-5 h-5 text-[var(--color-institutional)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">Total Transactions</p>
              <p className="text-2xl font-bold font-mono-data">{entries.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {entries.length === 0 ? (
        <EmptyState icon={Wallet} title="No transactions" description="Your transaction history will appear here." />
      ) : (
        <Card padding="md">
          <CardTitle>Transaction History</CardTitle>
          <div className="mt-4">
            <Table columns={columns} data={entries} rowKey={(r) => r.id} pageSize={20} />
          </div>
        </Card>
      )}
    </div>
  );
}
