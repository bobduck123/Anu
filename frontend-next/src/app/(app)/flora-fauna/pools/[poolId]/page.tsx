'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { startTransition, useEffect, useState } from 'react';
import { ArrowRight, BookOpenText, Coins, Shield } from 'lucide-react';
import { manaraPath } from '@/lib/brand';
import floraFaunaApi, { FloraFaunaPool, formatFloraFaunaApiError } from '@/lib/api/floraFaunaApi';
import { toActionableSurfaceError } from '@/lib/ui/actionableErrors';

export default function FloraFaunaPoolPage() {
  const params = useParams<{ poolId: string }>();
  const poolId = params?.poolId || '';
  const [pool, setPool] = useState<FloraFaunaPool | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!poolId) {
      return;
    }
    const controller = new AbortController();

    startTransition(() => {
      setPool(null);
      setError(null);
    });

    void floraFaunaApi.getPool(poolId, { signal: controller.signal }).then((data) => {
      if (controller.signal.aborted) return;
      startTransition(() => setPool(data));
    }).catch((err: unknown) => {
      if (controller.signal.aborted) return;
      setError(formatFloraFaunaApiError(err, 'Unable to load liquidity pool'));
    });

    return () => controller.abort();
  }, [poolId]);

  if (!poolId) {
    return <div className="min-h-screen pt-28 px-4 md:px-8">Missing pool identifier.</div>;
  }

  if (!pool && !error) {
    return <div className="min-h-screen pt-28 px-4 md:px-8">Loading liquidity pool...</div>;
  }

  if (!pool) {
    const actionableError = toActionableSurfaceError({
      area: 'Liquidity pool',
      rawMessage: error,
      fallbackHref: manaraPath(),
      fallbackLabel: 'Back to Manara feed',
    });

    return (
      <div className="min-h-screen pt-28 px-4 md:px-8">
        <div className="card-civic max-w-2xl mx-auto">
          <h1 className="text-2xl text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
            {actionableError.headline}
          </h1>
          <p className="mt-3 text-sm text-[var(--color-earth-medium)]">{actionableError.detail}</p>
          <Link href={actionableError.fallbackHref} className="mt-4 inline-flex btn-pill btn-pill-outline text-sm">
            {actionableError.fallbackLabel}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'radial-gradient(circle at top right, rgba(30,2,39,0.16), transparent 25%), linear-gradient(180deg, rgba(246,212,203,1) 0%, rgba(246,212,203,1) 100%)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-28 pb-20 space-y-8">
        <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr] items-start">
          <div className="card-civic">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-institutional)] bg-[var(--color-institutional-light)] mb-4">
                  <Coins className="w-3.5 h-3.5" />
                  Liquidity Pool
                </div>
                <h1 className="text-4xl md:text-5xl text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
                  {pool.name}
                </h1>
                <p className="mt-4 text-lg text-[var(--color-earth-medium)] leading-relaxed">
                  {pool.description}
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[color:rgba(246,212,203,0.75)] px-5 py-5 min-w-[280px]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-earth-medium)]">
                      Spendable balance
                    </p>
                    <p className="text-4xl font-semibold font-mono-data text-[var(--color-earth-dark)] mt-2">
                      ${(pool.availableBalanceCents / 100).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-earth-medium)]">
                      Reserved
                    </p>
                    <p className="text-3xl font-semibold font-mono-data text-[var(--color-earth-dark)] mt-2">
                      ${((pool.reservedBalanceCents || 0) / 100).toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-[var(--color-earth-medium)] mt-4">
                  Approved allocations move from treasury into reserve before disbursement.
                </p>
              </div>
            </div>
          </div>

          <div className="card-civic">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--color-earth-medium)] mb-3">
              <Shield className="w-3.5 h-3.5" />
              Allocation Policy
            </div>
            <div className="space-y-3 text-sm">
              {Object.entries(pool.policyJson || {}).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between gap-4 rounded-[1rem] bg-[var(--color-muted)] px-4 py-3">
                  <span className="text-[var(--color-earth-medium)]">{key}</span>
                  <strong className="text-[var(--color-earth-dark)] font-mono-data">{String(value)}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="card-civic">
            <div className="flex items-center gap-2 mb-4">
              <BookOpenText className="w-4 h-4 text-[var(--color-institutional)]" />
              <h2 className="text-2xl text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
                Ledger Accounts
              </h2>
            </div>

            <div className="space-y-3">
              {pool.ledgerAccounts.map((account) => (
                <div key={account.id} className="rounded-[1.25rem] border border-[var(--color-border)] bg-[color:rgba(246,212,203,0.8)] px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-earth-dark)]">{account.name}</p>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-earth-medium)] mt-1">
                        {account.code}
                      </p>
                    </div>
                    <p className="text-2xl font-semibold font-mono-data text-[var(--color-earth-dark)]">
                      ${(account.balanceCents / 100).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card-civic">
            <div className="flex items-end justify-between gap-4 mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-earth-medium)] mb-2">
                  Recent Ledger Entries
                </p>
                <h2 className="text-2xl text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
                  Public journal trail
                </h2>
              </div>
              <Link href={manaraPath()} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-institutional)]">
                Back to feed
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="space-y-3">
              {pool.recentEntries.map((entry) => (
                <div key={entry.id} className="rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[var(--color-earth-dark)]">{entry.memo}</p>
                      <p className="text-sm text-[var(--color-earth-medium)] mt-1">
                        Account: {entry.account.name} ({entry.account.code})
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold font-mono-data text-[var(--color-earth-dark)]">
                        {(entry.amountCents < 0 ? '-' : '+')}${Math.abs(entry.amountCents / 100).toLocaleString()}
                      </p>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-earth-medium)] mt-1">
                        {entry.journalId}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
