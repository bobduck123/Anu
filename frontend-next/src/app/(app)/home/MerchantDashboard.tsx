'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DollarSign, Package, TrendingUp, CreditCard } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/ui-system/primitives/Card';
import { LoadingState } from '@/ui-system/states/LoadingState';

interface MerchantData {
  creditBalance: number;
  listingCount: number;
  revenue: number;
  tier: string;
}

export default function MerchantDashboard() {
  const [data, setData] = useState<MerchantData>({ creditBalance: 0, listingCount: 0, revenue: 0, tier: 'basic' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [balRes, listingsRes] = await Promise.allSettled([
          api.credits.balance(),
          api.marketplace.getProducts(),
        ]);
        setData({
          creditBalance: balRes.status === 'fulfilled' ? (balRes.value?.balance || 0) : 0,
          listingCount: listingsRes.status === 'fulfilled' ? (listingsRes.value?.length || 0) : 0,
          revenue: 0,
          tier: 'standard',
        });
      } catch { /* graceful */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <LoadingState variant="skeleton" />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-serif)' }}>Merchant Dashboard</h1>
        <p className="text-[var(--color-muted-foreground)] mt-1">Track your sales and manage your store.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-sage-light)]">
              <CreditCard className="w-5 h-5 text-[var(--color-forest)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">Credit Balance</p>
              <p className="text-xl font-bold font-mono-data">{data.creditBalance}</p>
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
              <p className="text-xl font-bold font-mono-data">{data.listingCount}</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-institutional-light)]">
              <DollarSign className="w-5 h-5 text-[var(--color-institutional)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">Revenue</p>
              <p className="text-xl font-bold font-mono-data">${data.revenue}</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-sage-light)]">
              <TrendingUp className="w-5 h-5 text-[var(--color-sage)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">Tier</p>
              <p className="text-xl font-bold capitalize">{data.tier}</p>
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
              <p className="text-xs text-[var(--color-muted-foreground)]">Add and edit your products</p>
            </div>
          </Link>
        </Card>
        <Card padding="md" hover>
          <Link href="/wallet/ledger" className="flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-[var(--color-institutional)]" />
            <div>
              <p className="font-semibold">Transaction History</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">View your ledger</p>
            </div>
          </Link>
        </Card>
      </div>
    </div>
  );
}
