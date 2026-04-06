'use client';

import { useEffect, useState } from 'react';
import { transparencyApi, ImpactPool, TransparencySummary } from '@/lib/api/endpoints';
import PoolCards from '@/components/impact/PoolCards';
import { AnuActionLink } from '@/ui-system/anu/surfacePrimitives';
import { Droplets, Loader2, Shield } from 'lucide-react';

const toPoolCards = (summary: TransparencySummary): ImpactPool[] =>
  summary.pools.map((pool, index) => ({
    id: index + 1,
    slug: pool.slug,
    name: pool.name || pool.slug.replace(/-/g, ' '),
    description: `${pool.category ? `${pool.category} pool.` : 'Shared civic pool.'} 30-day outflows: $${((pool.outflows_30d || 0) / 100).toLocaleString()}.`,
    category: pool.category,
    target_amount_cents: pool.target_amount_cents,
    current_balance_cents: pool.balance,
    is_active: true,
  }));

const FALLBACK_TRANSPARENCY_SUMMARY: TransparencySummary = {
  node: { slug: 'manara-sandbox', name: 'Manara Sandbox Node' },
  totals: {
    inflows_30d: 462500,
    outflows_30d: 289000,
    admin_ratio_30d: 0.08,
  },
  pools: [
    {
      slug: 'community-relief',
      name: 'Community Relief',
      category: 'relief',
      target_amount_cents: 650000,
      balance: 208000,
      outflows_30d: 87000,
    },
    {
      slug: 'learning-universe',
      name: 'Learning Universe',
      category: 'education',
      target_amount_cents: 520000,
      balance: 164000,
      outflows_30d: 54000,
    },
    {
      slug: 'commons-infrastructure',
      name: 'Commons Infrastructure',
      category: 'infrastructure',
      target_amount_cents: 780000,
      balance: 241000,
      outflows_30d: 91000,
    },
  ],
  relief_capacity: {
    monthly_grants_remaining: 11,
    avg_processing_days: 4,
  },
};

export default function PoolsPage() {
  const [pools, setPools] = useState<ImpactPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    transparencyApi
      .nodeSummary()
      .then((data) => setPools(toPoolCards(data)))
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to load pools';
        setError(`${message} Showing sandbox snapshot data while live reporting reconnects.`);
        setPools(toPoolCards(FALLBACK_TRANSPARENCY_SUMMARY));
      })
      .finally(() => setLoading(false));
  }, []);

  const totalBalance = pools.reduce((sum, p) => sum + (p.current_balance_cents || 0), 0) / 100;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-28 pb-20">
        <div className="mb-10">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-institutional)] mb-3">
            <Droplets className="w-4 h-4" />
            Transparency
          </span>
          <h1
            className="text-3xl md:text-4xl font-semibold text-[var(--color-foreground)] mb-3"
            style={{ fontFamily: 'var(--anu-type-display)' }}
          >
            Impact Pools
          </h1>
          <p className="max-w-2xl text-[color:rgba(246,212,203,0.84)] leading-7">
            See how membership contributions are stewarded. Every dollar is tracked
            on our append-only ledger.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <AnuActionLink href="/impact" tone="secondary">Open impact bridge</AnuActionLink>
            <AnuActionLink href="/transparency" tone="ghost">Open transparency</AnuActionLink>
            <AnuActionLink href="/memberships" tone="ghost">Open memberships</AnuActionLink>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="card-civic">
            <p className="text-xs text-[color:rgba(246,212,203,0.64)] mb-1">Total Balance</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)] font-mono-data">
              ${totalBalance.toLocaleString()}
            </p>
          </div>
          <div className="card-civic">
            <p className="text-xs text-[color:rgba(246,212,203,0.64)] mb-1">Active Pools</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)] font-mono-data">
              {pools.length}
            </p>
          </div>
          <div className="card-civic">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[var(--color-institutional)]" />
              <p className="text-xs text-[color:rgba(246,212,203,0.64)]">Ledger Integrity</p>
            </div>
            <p className="text-2xl font-semibold text-[var(--color-institutional)] mt-1">Append-only</p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-[color:rgba(224,177,21,0.32)] bg-[color:rgba(224,177,21,0.12)] mb-8">
            <p className="text-sm text-[var(--color-foreground)]">
              Public pool reporting is temporarily unavailable. {error}
            </p>
          </div>
        )}

        {!error && (
          <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] mb-8">
            <p className="text-sm text-[color:rgba(246,212,203,0.82)]">
              Public visitors can review current balances here. Detailed pool dashboards and ledger filtering still require sign-in.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--color-institutional)]" />
          </div>
        ) : (
          <PoolCards pools={pools} linkBasePath={null} />
        )}

        <div className="mt-10 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]">
          <p className="text-sm text-[color:rgba(246,212,203,0.82)] text-center">
            <strong className="text-[var(--color-foreground)]">Transparent by design:</strong> All pool transactions are publicly
            viewable. Individual contributor identities remain anonymized.
          </p>
        </div>
      </div>
    </div>
  );
}
