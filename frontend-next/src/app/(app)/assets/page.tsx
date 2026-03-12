'use client';

import { useEffect, useState } from 'react';
import { assetsRegistryApi, type CommunityAsset } from '@/lib/api/endpoints';

export default function AssetsRegistryPage() {
  const [assets, setAssets] = useState<CommunityAsset[]>([]);
  const [error, setError] = useState('');
  const [bookingAssetId, setBookingAssetId] = useState<number | null>(null);

  useEffect(() => {
    assetsRegistryApi.list()
      .then((data) => setAssets(data.assets || []))
      .catch(() => setError('Failed to load assets registry'));
  }, []);

  const requestBooking = async (assetId: number) => {
    try {
      const start = new Date();
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
      await assetsRegistryApi.book(assetId, {
        start_at: start.toISOString(),
        end_at: end.toISOString(),
      });
      setBookingAssetId(assetId);
    } catch {
      setError('Failed to request booking');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Community Assets</h1>
          <p className="text-[var(--color-muted-foreground)]">Shared assets and booking requests.</p>
        </div>
        {error && <div className="card-civic text-[var(--color-accent)]">{error}</div>}
        <div className="grid md:grid-cols-2 gap-4">
          {assets.map((asset) => (
            <div key={asset.id} className="card-civic">
              <div className="text-lg font-semibold">{asset.name}</div>
              <div className="text-xs text-[var(--color-muted-foreground)]">{asset.asset_type}</div>
              <p className="text-sm mt-2">{asset.capacity_notes}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
                <span>{asset.location_text}</span>
                <span>{asset.ownership_type}</span>
              </div>
              <button className="btn-pill btn-pill-primary text-sm mt-4" onClick={() => requestBooking(asset.id)}>
                Request Booking
              </button>
              {bookingAssetId === asset.id && (
                <p className="text-xs text-[var(--color-sage)] mt-2">Booking requested.</p>
              )}
            </div>
          ))}
          {assets.length === 0 && <p className="text-sm text-[var(--color-muted-foreground)]">No assets yet.</p>}
        </div>
      </div>
    </div>
  );
}
