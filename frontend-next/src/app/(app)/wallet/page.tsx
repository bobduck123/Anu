'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, CreditSummary, CreditTx } from '@/lib/api';
import { Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function WalletPage() {
  const [summary, setSummary] = useState<CreditSummary>({ balance: 0, earned: 0, spent: 0 });
  const [transactions, setTransactions] = useState<CreditTx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.credits.balance(), api.credits.history(50)])
      .then(([balance, history]) => {
        setSummary(balance);
        setTransactions(history);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Community Credits Wallet</h1>
          <p className="text-[var(--color-muted-foreground)]">Track credits earned and spent across the commons.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-civic">
            <p className="text-xs text-[var(--color-muted-foreground)]">Balance</p>
            <p className="text-3xl font-semibold font-mono-data text-[var(--color-forest)]">{summary.balance}</p>
          </div>
          <div className="card-civic">
            <p className="text-xs text-[var(--color-muted-foreground)]">Earned</p>
            <p className="text-2xl font-semibold font-mono-data">{summary.earned}</p>
          </div>
          <div className="card-civic">
            <p className="text-xs text-[var(--color-muted-foreground)]">Spent</p>
            <p className="text-2xl font-semibold font-mono-data">{summary.spent}</p>
          </div>
        </div>

        <div className="card-civic flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[var(--color-institutional)]" />
            <div>
              <p className="font-medium">Spend credits on community rewards</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">Redeem in the marketplace.</p>
            </div>
          </div>
          <Link href="/marketplace" className="btn-pill btn-pill-primary text-sm">
            Spend Credits
          </Link>
        </div>

        <div className="card-civic">
          <h2 className="text-lg font-semibold mb-4">Transaction Timeline</h2>
          {loading && <p className="text-sm text-[var(--color-muted-foreground)]">Loading transactions...</p>}
          {!loading && transactions.length === 0 && (
            <p className="text-sm text-[var(--color-muted-foreground)]">No transactions yet.</p>
          )}
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
                <div className="flex items-center gap-2">
                  {tx.tx_type === 'earn' ? (
                    <ArrowDownRight className="w-4 h-4 text-[var(--color-forest)]" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-[var(--color-accent)]" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{tx.description || 'Credit movement'}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {tx.created_at ? new Date(tx.created_at).toLocaleString() : ''}
                    </p>
                  </div>
                </div>
                <span className={`font-mono-data text-sm ${tx.tx_type === 'earn' ? 'text-[var(--color-forest)]' : 'text-[var(--color-accent)]'}`}>
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
