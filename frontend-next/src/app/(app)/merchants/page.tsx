'use client';

import { useEffect, useState } from 'react';
import { merchantsApi, type Merchant } from '@/lib/api/endpoints';

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    merchantsApi.list()
      .then((data) => setMerchants(data.merchants || []))
      .catch(() => setError('Failed to load merchants'));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Merchant Directory</h1>
          <p className="text-[var(--color-muted-foreground)]">Verified-transaction merchant metrics.</p>
        </div>
        {error && <div className="card-civic text-[var(--color-accent)]">{error}</div>}
        <div className="grid md:grid-cols-2 gap-4">
          {merchants.map((merchant) => (
            <div key={merchant.id} className="card-civic">
              <div className="text-lg font-semibold">{merchant.name}</div>
              <div className="text-xs text-[var(--color-muted-foreground)]">{merchant.domain}</div>
              <p className="text-sm mt-2">{merchant.location_text}</p>
              <div className="mt-3 text-xs text-[var(--color-muted-foreground)]">
                Reliability: {merchant.metrics?.reliability_score ?? 0} · Dispute rate: {merchant.metrics?.dispute_rate ?? 0}
              </div>
            </div>
          ))}
          {merchants.length === 0 && <p className="text-sm text-[var(--color-muted-foreground)]">No merchants yet.</p>}
        </div>
      </div>
    </div>
  );
}
