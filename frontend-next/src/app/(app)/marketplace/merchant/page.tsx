'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DollarSign, Package, TrendingUp, CreditCard } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/ui-system/primitives/Card';
import { LoadingState } from '@/ui-system/states/LoadingState';

export default function MerchantPage() {
  const [balance, setBalance] = useState(0);
  const [listings, setListings] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [balRes, prodRes] = await Promise.allSettled([
          api.credits.balance(),
          api.marketplace.getProducts(),
        ]);
        if (balRes.status === 'fulfilled') setBalance(balRes.value?.balance || 0);
        if (prodRes.status === 'fulfilled') setListings(prodRes.value?.length || 0);
      } catch { /* graceful */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <LoadingState fullPage message="Loading merchant dashboard..." />;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6" style={{ fontFamily: 'var(--font-serif)' }}>Merchant Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-sage-light)]">
              <CreditCard className="w-5 h-5 text-[var(--color-forest)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">Credit Balance</p>
              <p className="text-xl font-bold font-mono-data">{balance}</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-accent-light)]">
              <Package className="w-5 h-5 text-[var(--color-accent)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">Active Listings</p>
              <p className="text-xl font-bold font-mono-data">{listings}</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-institutional-light)]">
              <TrendingUp className="w-5 h-5 text-[var(--color-institutional)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">Tier</p>
              <p className="text-xl font-bold capitalize">Standard</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card padding="md" hover>
          <Link href="/marketplace" className="flex items-center gap-3">
            <Package className="w-6 h-6 text-[var(--color-accent)]" />
            <div>
              <p className="font-semibold">Manage Listings</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">Add, edit, or remove products</p>
            </div>
          </Link>
        </Card>
        <Card padding="md" hover>
          <Link href="/marketplace/orders" className="flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-[var(--color-institutional)]" />
            <div>
              <p className="font-semibold">Order History</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">View all transactions</p>
            </div>
          </Link>
        </Card>
      </div>
    </div>
  );
}
