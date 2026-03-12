'use client';

import { useEffect, useState } from 'react';
import dynamicImport from 'next/dynamic';
import { api, DiscoveryPack, DiscoveryPackDetail, DiscoveryPackItem, Action, Event } from '@/lib/api';
import { MapPin, Gift } from 'lucide-react';

const MapView = dynamicImport(() => import('@/components/shared/MapView'), { ssr: false });

export default function PacksPage() {
  const [packs, setPacks] = useState<DiscoveryPack[]>([]);
  const [selectedPack, setSelectedPack] = useState<DiscoveryPackDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    api.packs.list()
      .then((data) => {
        setPacks(data);
        if (data.length > 0) {
          loadPack(data[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const loadPack = async (packId: number) => {
    const detail = await api.packs.get(packId);
    setSelectedPack(detail);
  };

  const handleComplete = async () => {
    if (!selectedPack) return;
    setCompleting(true);
    try {
      const result = await api.packs.complete(selectedPack.pack.id);
      alert(`Pack completed! Reward: ${result.reward_points} credits`);
    } finally {
      setCompleting(false);
    }
  };

  const markers = (selectedPack?.items || [])
    .map((item: DiscoveryPackItem) => {
      if (item.item_type === 'action') {
        const action = item.item as Action;
        if (!action.location?.coordinates) return null;
        return {
          id: `action-${action._id}`,
          lat: action.location.coordinates[1],
          lng: action.location.coordinates[0],
          title: action.title,
          popup: `<strong>${action.title}</strong>`,
          color: 'sage' as const,
        };
      }
      const event = item.item as Event;
      if (event.latitude == null || event.longitude == null) return null;
      return {
        id: `event-${event.id}`,
        lat: event.latitude,
        lng: event.longitude,
        title: event.title,
        popup: `<strong>${event.title}</strong>`,
        color: 'accent' as const,
      };
    })
    .filter(Boolean) as Array<{ id: string; lat: number; lng: number; title: string; popup: string; color: 'sage' | 'accent' }>;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Discovery Packs</h1>
          <p className="text-[var(--color-muted-foreground)]">Curated local micro-campaigns with rewards.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            {loading && <p className="text-sm text-[var(--color-muted-foreground)]">Loading packs...</p>}
            {packs.map((pack) => (
              <button
                key={pack.id}
                onClick={() => loadPack(pack.id)}
                className={`w-full text-left card-civic ${selectedPack?.pack.id === pack.id ? 'border-[var(--color-institutional)]' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{pack.name}</h3>
                  <span className="text-xs text-[var(--color-muted-foreground)]">{pack.item_count} items</span>
                </div>
                <p className="text-xs text-[var(--color-muted-foreground)]">{pack.description}</p>
                <div className="flex items-center gap-2 text-xs mt-3 text-[var(--color-institutional)]">
                  <MapPin className="w-3 h-3" />
                  <span>{pack.city || 'Global'} {pack.country ? `· ${pack.country}` : ''}</span>
                </div>
              </button>
            ))}
            {packs.length === 0 && !loading && (
              <p className="text-sm text-[var(--color-muted-foreground)]">No packs yet.</p>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            {!selectedPack && (
              <div className="card-civic text-center py-10">
                <p className="text-[var(--color-muted-foreground)]">Select a pack to view details.</p>
              </div>
            )}

            {selectedPack && (
              <>
                <div className="card-civic">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="text-2xl font-semibold">{selectedPack.pack.name}</h2>
                      <p className="text-sm text-[var(--color-muted-foreground)]">{selectedPack.pack.description}</p>
                    </div>
                    <button onClick={handleComplete} disabled={completing} className="btn-pill btn-pill-sage text-sm">
                      <Gift className="w-4 h-4 mr-2" /> {completing ? 'Completing...' : `Complete +${selectedPack.pack.reward_points}`}
                    </button>
                  </div>
                  <div className="text-xs text-[var(--color-muted-foreground)]">
                    {selectedPack.pack.city || 'Global'} {selectedPack.pack.country ? `· ${selectedPack.pack.country}` : ''}
                  </div>
                </div>

                {markers.length > 0 && (
                  <div className="card-civic">
                    <MapView markers={markers} height="360px" />
                  </div>
                )}

                <div className="card-civic">
                  <h3 className="text-lg font-semibold mb-4">Pack Items</h3>
                  <div className="space-y-3">
                    {selectedPack.items.map((item, idx) => (
                      <div key={`${item.item_type}-${idx}`} className="p-3 rounded-lg border border-[var(--color-border)]">
                        <div className="text-xs text-[var(--color-muted-foreground)] uppercase tracking-wide mb-1">
                          {item.item_type}
                        </div>
                        <div className="font-medium">
                          {'title' in item.item ? item.item.title : 'Untitled'}
                        </div>
                        {'details' in item.item && (
                          <p className="text-xs text-[var(--color-muted-foreground)] mt-1">{item.item.details}</p>
                        )}
                        {'description' in item.item && (
                          <p className="text-xs text-[var(--color-muted-foreground)] mt-1">{item.item.description}</p>
                        )}
                      </div>
                    ))}
                    {selectedPack.items.length === 0 && (
                      <p className="text-sm text-[var(--color-muted-foreground)]">No items in this pack yet.</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
