'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import AuthGateCard from '@/components/auth/AuthGateCard';
import { api, CreditSummary, CreditTx } from '@/lib/api';
import { Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AnuActionLink } from '@/ui-system/anu/surfacePrimitives';

export default function WalletPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [summary, setSummary] = useState<CreditSummary | null>(null);
  const [transactions, setTransactions] = useState<CreditTx[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      return;
    }

    let cancelled = false;

    Promise.all([api.credits.balance(), api.credits.history(50)])
      .then(([balance, history]) => {
        if (cancelled) {
          return;
        }
        setSummary(balance);
        setTransactions(history);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load wallet data');
        setSummary((current) => current ?? { balance: 0, earned: 0, spent: 0 });
        setTransactions((current) => current ?? []);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated]);

  const dataLoading = isAuthenticated && !authLoading && summary === null && transactions === null && !error;

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-institutional)]"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthGateCard
        eyebrow="Wallet"
        title="Sign in to open your credits wallet"
        description="Your credit balance, transaction history, and marketplace spending power are tied to your member account."
        secondaryHref="/marketplace"
        secondaryLabel="Browse marketplace"
      />
    );
  }

  const resolvedSummary = summary ?? { balance: 0, earned: 0, spent: 0 };
  const resolvedTransactions = transactions ?? [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-semibold mb-2 text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
            Community Credits Wallet
          </h1>
          <p className="text-[color:rgba(246,212,203,0.82)]">Track credits earned and spent across the commons.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <AnuActionLink href="/wallet/ledger" tone="secondary">Open wallet ledger</AnuActionLink>
            <AnuActionLink href="/marketplace" tone="ghost">Open marketplace</AnuActionLink>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-[color:rgba(224,177,21,0.32)] bg-[color:rgba(224,177,21,0.12)]">
            <p className="text-sm text-[var(--color-foreground)]">{error}</p>
            <p className="mt-1 text-xs text-[color:rgba(246,212,203,0.82)]">
              Working now: marketplace browsing and your broader commons routes remain available while wallet sync recovers.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-civic">
            <p className="text-xs text-[color:rgba(246,212,203,0.64)]">Balance</p>
            <p className="text-3xl font-semibold font-mono-data text-[var(--color-institutional)]">{resolvedSummary.balance}</p>
          </div>
          <div className="card-civic">
            <p className="text-xs text-[color:rgba(246,212,203,0.64)]">Earned</p>
            <p className="text-2xl font-semibold font-mono-data text-[var(--color-institutional)]">{resolvedSummary.earned}</p>
          </div>
          <div className="card-civic">
            <p className="text-xs text-[color:rgba(246,212,203,0.64)]">Spent</p>
            <p className="text-2xl font-semibold font-mono-data text-[var(--color-accent)]">{resolvedSummary.spent}</p>
          </div>
        </div>

        <div className="card-civic flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[var(--color-institutional)]" />
            <div>
              <p className="font-medium text-[var(--color-foreground)]">Spend credits on community rewards</p>
              <p className="text-xs text-[color:rgba(246,212,203,0.78)]">Redeem in the marketplace.</p>
            </div>
          </div>
          <Link href="/marketplace" className="btn-pill btn-pill-primary text-sm">
            Spend Credits
          </Link>
        </div>

        <div className="card-civic">
          <h2 className="text-lg font-semibold mb-4 text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>Transaction Timeline</h2>
          {resolvedTransactions.length === 0 && (
            <p className="text-sm text-[color:rgba(246,212,203,0.78)]">No transactions yet.</p>
          )}
          <div className="space-y-3">
            {resolvedTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
                <div className="flex items-center gap-2">
                  {tx.tx_type === 'earn' ? (
                    <ArrowDownRight className="w-4 h-4 text-[var(--color-institutional)]" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-[var(--color-accent)]" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-[var(--color-foreground)]">{tx.description || 'Credit movement'}</p>
                    <p className="text-xs text-[color:rgba(246,212,203,0.72)]">
                      {tx.created_at ? new Date(tx.created_at).toLocaleString() : ''}
                    </p>
                  </div>
                </div>
                <span className={`font-mono-data text-sm ${tx.tx_type === 'earn' ? 'text-[var(--color-institutional)]' : 'text-[var(--color-accent)]'}`}>
                  {tx.tx_type === 'earn' ? '+' : '-'}{tx.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
