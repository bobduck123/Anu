'use client';

import { useEffect, useState } from 'react';
import { poolsApi, ImpactPool } from '@/lib/api/endpoints';
import PoolCards from '@/components/impact/PoolCards';
import { Droplets, Loader2, Shield } from 'lucide-react';

const FALLBACK_POOLS: ImpactPool[] = [
  {
    id: 1,
    slug: 'relief',
    name: 'Relief Pool',
    description: 'Emergency support and stabilization grants.',
    category: 'relief',
    target_amount_cents: 200000,
    current_balance_cents: 52000,
    is_active: true,
  },
  {
    id: 2,
    slug: 'sovereignty',
    name: 'Sovereignty Pool',
    description: 'Local stewardship and community ownership projects.',
    category: 'sovereignty',
    target_amount_cents: 300000,
    current_balance_cents: 98000,
    is_active: true,
  },
  {
    id: 3,
    slug: 'infrastructure',
    name: 'Infrastructure Pool',
    description: 'Tools, tech, and shared civic infrastructure.',
    category: 'infrastructure',
    target_amount_cents: 250000,
    current_balance_cents: 76000,
    is_active: true,
  },
];

export default function PoolsPage() {
  const [pools, setPools] = useState<ImpactPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    poolsApi
      .list()
      .then((data) => setPools(data.length ? data : FALLBACK_POOLS))
      .catch((err) => {
        setError(err.message || 'Failed to load pools');
        setPools(FALLBACK_POOLS);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalBalance = pools.reduce((sum, p) => sum + (p.current_balance_cents || 0), 0) / 100;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-28 pb-20">
        {/* Header */}
        <div className="mb-10">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-institutional)] mb-3">
            <Droplets className="w-4 h-4" />
            Transparency
          </span>
          <h1
            className="text-3xl md:text-4xl font-semibold text-[var(--color-earth-dark)] mb-3"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Impact Pools
          </h1>
          <p className="text-[var(--color-earth-medium)] max-w-xl">
            See how membership contributions are stewarded. Every dollar is tracked
            on our append-only ledger.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="card-civic">
            <p className="text-xs text-[var(--color-earth-medium)] mb-1">Total Balance</p>
            <p className="text-2xl font-semibold text-[var(--color-earth-dark)] font-mono-data">
              ${totalBalance.toLocaleString()}
            </p>
          </div>
          <div className="card-civic">
            <p className="text-xs text-[var(--color-earth-medium)] mb-1">Active Pools</p>
            <p className="text-2xl font-semibold text-[var(--color-earth-dark)] font-mono-data">
              {pools.length}
            </p>
          </div>
          <div className="card-civic">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[var(--color-forest)]" />
              <p className="text-xs text-[var(--color-earth-medium)]">Ledger Integrity</p>
            </div>
            <p className="text-2xl font-semibold text-[var(--color-forest)] mt-1">Append-only</p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-[var(--color-accent-light)] border border-[var(--color-accent)] mb-8">
            <p className="text-sm text-[var(--color-accent)]">
              Using offline data — {error}
            </p>
          </div>
        )}

        {/* Pool Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--color-institutional)]" />
          </div>
        ) : (
          <PoolCards pools={pools} />
        )}

        {/* Privacy Notice */}
        <div className="mt-10 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]">
          <p className="text-sm text-[var(--color-earth-medium)] text-center">
            <strong>Transparent by design:</strong> All pool transactions are publicly
            viewable. Individual contributor identities remain anonymized.
          </p>
        </div>
      </div>
    </div>
  );
}
