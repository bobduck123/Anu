'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { poolsApi, PoolDashboard } from '@/lib/api/endpoints';
import { api, LedgerEntry } from '@/lib/api';
import AuthGateCard from '@/components/auth/AuthGateCard';
import {
  ArrowLeft, ArrowDown, ArrowUp, Loader2, Shield,
  TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

export default function PoolDetailPage() {
  const params = useParams<{ poolId: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const poolId = Number(params.poolId);
  const [data, setData] = useState<PoolDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerPages, setLedgerPages] = useState(1);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    poolsApi
      .dashboard(poolId)
      .then(setData)
      .catch((err) => setError(err.message || 'Failed to load pool'))
      .finally(() => setLoading(false));
  }, [authLoading, isAuthenticated, poolId]);

  const fetchLedger = useCallback(async (page: number) => {
    setLedgerLoading(true);
    try {
      const res = await api.ledger.getEntries(page, 50);
      const entries = (res.entries || []).filter((entry) => entry.pool_id === poolId);
      setLedgerEntries(entries);
      setLedgerPages(res.pages || 1);
    } catch {
      // Ledger may not be available yet
    } finally {
      setLedgerLoading(false);
    }
  }, [poolId]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    void fetchLedger(ledgerPage);
  }, [fetchLedger, isAuthenticated, ledgerPage]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-institutional)]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthGateCard
        eyebrow="Pool Dashboard"
        title="Sign in to open detailed pool dashboards"
        description="Public visitors can review current pool balances from the pools overview. Detailed ledger filtering and 30-day flow dashboards are member-only."
        secondaryHref="/pools"
        secondaryLabel="View public pool summaries"
      />
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="max-w-5xl mx-auto px-4 md:px-8 pt-28 pb-20">
          <Link href="/pools" className="inline-flex items-center gap-2 text-sm text-[var(--color-institutional)] hover:gap-3 transition-all mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Pools
          </Link>
          <div className="p-6 rounded-xl bg-[var(--color-accent-light)] border border-[var(--color-accent)]">
            <p className="text-[var(--color-accent)]">{error || 'Pool not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  const pool = data.pool;
  const balance = pool.current_balance_cents / 100;
  const target = pool.target_amount_cents ? pool.target_amount_cents / 100 : null;
  const progress = target ? Math.min(100, (balance / target) * 100) : 0;
  const inflows = data.last_30d.inflows / 100;
  const outflows = data.last_30d.outflows / 100;
  const net = inflows - outflows;

  const entryTypeColor = (type: string) => {
    if (type === 'credit') return 'var(--color-sage)';
    if (type === 'debit') return 'var(--color-accent)';
    return 'var(--color-muted-foreground)';
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-5xl mx-auto px-4 md:px-8 pt-28 pb-20">
        <Link href="/pools" className="inline-flex items-center gap-2 text-sm text-[var(--color-institutional)] hover:gap-3 transition-all mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Pools
        </Link>

        {/* Pool Header */}
        <div className="mb-10">
          {pool.category && (
            <span className="inline-block text-xs font-medium uppercase tracking-wider px-2.5 py-1 rounded-full mb-3"
              style={{ backgroundColor: 'var(--color-institutional-light)', color: 'var(--color-institutional)' }}>
              {pool.category}
            </span>
          )}
          <h1 className="text-3xl md:text-4xl font-semibold text-[var(--color-earth-dark)] mb-3"
            style={{ fontFamily: 'var(--font-serif)' }}>
            {pool.name}
          </h1>
          {pool.description && (
            <p className="text-lg text-[var(--color-earth-medium)] max-w-2xl">{pool.description}</p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="card-civic">
            <p className="text-xs text-[var(--color-earth-medium)] mb-1">Current Balance</p>
            <p className="text-2xl font-semibold text-[var(--color-earth-dark)] font-mono-data">${balance.toLocaleString()}</p>
            {target && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-[var(--color-earth-medium)] mb-1">
                  <span>{progress.toFixed(0)}% of target</span>
                  <span>${target.toLocaleString()}</span>
                </div>
                <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${progress}%` }} /></div>
              </div>
            )}
          </div>
          <div className="card-civic">
            <p className="text-xs text-[var(--color-earth-medium)] mb-1">30-Day Inflows</p>
            <div className="flex items-center gap-2">
              <ArrowDown className="w-4 h-4 text-[var(--color-sage)]" />
              <p className="text-2xl font-semibold text-[var(--color-sage)] font-mono-data">${inflows.toLocaleString()}</p>
            </div>
          </div>
          <div className="card-civic">
            <p className="text-xs text-[var(--color-earth-medium)] mb-1">30-Day Outflows</p>
            <div className="flex items-center gap-2">
              <ArrowUp className="w-4 h-4 text-[var(--color-accent)]" />
              <p className="text-2xl font-semibold text-[var(--color-accent)] font-mono-data">${outflows.toLocaleString()}</p>
            </div>
          </div>
          <div className="card-civic">
            <p className="text-xs text-[var(--color-earth-medium)] mb-1">Net Flow (30d)</p>
            <div className="flex items-center gap-2">
              {net >= 0 ? <TrendingUp className="w-4 h-4 text-[var(--color-forest)]" /> : <TrendingDown className="w-4 h-4 text-[var(--color-danger)]" />}
              <p className="text-2xl font-semibold font-mono-data" style={{ color: net >= 0 ? 'var(--color-forest)' : 'var(--color-danger)' }}>
                {net >= 0 ? '+' : ''}${net.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Ledger Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[var(--color-forest)]" />
              <h2 className="text-xl font-semibold text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
                Ledger Entries
              </h2>
            </div>
            <span className="text-xs text-[var(--color-earth-medium)] bg-[var(--color-forest-light)] px-2.5 py-1 rounded-full">
              Append-only
            </span>
          </div>

          <div className="card-civic p-0 overflow-hidden">
            {ledgerLoading ? (
              <div className="p-6 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--color-institutional)]" />
              </div>
            ) : ledgerEntries.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
                        <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-earth-medium)] uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-earth-medium)] uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-earth-medium)] uppercase tracking-wider">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-earth-medium)] uppercase tracking-wider">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerEntries.map((entry) => (
                        <tr key={entry.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-muted)]">
                          <td className="px-4 py-3 text-[var(--color-earth-medium)] font-mono-data text-xs">
                            {new Date(entry.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                              style={{ color: entryTypeColor(entry.entry_type), backgroundColor: `color-mix(in srgb, ${entryTypeColor(entry.entry_type)} 15%, transparent)` }}>
                              {entry.entry_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono-data font-semibold"
                            style={{ color: entryTypeColor(entry.entry_type) }}>
                            {entry.entry_type === 'debit' ? '-' : entry.entry_type === 'reversal' ? '~' : '+'}
                            ${(entry.amount_cents / 100).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-[var(--color-earth-medium)] text-xs max-w-xs truncate">
                            {entry.description || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {ledgerPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)]">
                    <button onClick={() => setLedgerPage(p => Math.max(1, p - 1))} disabled={ledgerPage <= 1}
                      className="flex items-center gap-1 text-sm text-[var(--color-institutional)] disabled:opacity-30">
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </button>
                    <span className="text-xs text-[var(--color-earth-medium)] font-mono-data">
                      Page {ledgerPage} of {ledgerPages}
                    </span>
                    <button onClick={() => setLedgerPage(p => Math.min(ledgerPages, p + 1))} disabled={ledgerPage >= ledgerPages}
                      className="flex items-center gap-1 text-sm text-[var(--color-institutional)] disabled:opacity-30">
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="p-6 text-center text-[var(--color-earth-medium)]">
                <Shield className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No ledger entries yet.</p>
                <p className="text-xs mt-1">Entries will appear when financial transactions occur.</p>
              </div>
            )}
          </div>
        </section>

        {/* Integrity Notice */}
        <div className="mt-10 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]">
          <p className="text-sm text-[var(--color-earth-medium)] text-center">
            <strong>Append-only ledger:</strong> Entries cannot be modified or deleted.
            Corrections are recorded as reversal entries with full audit trail.
          </p>
        </div>
      </div>
    </div>
  );
}
