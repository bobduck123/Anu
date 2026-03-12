'use client';

import { useEffect, useState } from 'react';
import { api, CapitalSnapshot, CapitalStressFlag, CapitalResilience } from '@/lib/api';

export default function CapitalDashboardPage() {
  const [snapshots, setSnapshots] = useState<CapitalSnapshot[]>([]);
  const [flags, setFlags] = useState<CapitalStressFlag[]>([]);
  const [resilience, setResilience] = useState<CapitalResilience | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.capital.getHeatmap(),
      api.capital.getResilience(),
    ])
      .then(([heatmap, res]) => {
        setSnapshots(heatmap.snapshots || []);
        setFlags(heatmap.flags || []);
        setResilience(res);
      })
      .catch((err) => setError(err.message || 'Failed to load capital dashboard'));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Capital Heatmap</h1>
          <p className="text-[var(--color-muted-foreground)]">Governance-only treasury intelligence.</p>
        </div>

        {error && <div className="card-civic text-[var(--color-accent)]">{error}</div>}

        {resilience && (
          <div className="card-civic">
            <p className="text-xs text-[var(--color-muted-foreground)]">Resilience Index (v{resilience.formula_version})</p>
            <p className="text-3xl font-semibold font-mono-data">{resilience.index_value}</p>
          </div>
        )}

        <div className="card-civic">
          <h2 className="text-lg font-semibold mb-3">Stress Flags</h2>
          {flags.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">No active stress flags.</p>
          ) : (
            <div className="space-y-2">
              {flags.map((flag, idx) => (
                <div key={`${flag.flag_type}-${idx}`} className="text-sm">
                  <span className="font-medium">{flag.flag_type}</span> — {flag.message}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-civic">
          <h2 className="text-lg font-semibold mb-3">Snapshots (latest)</h2>
          <p className="text-xs text-[var(--color-muted-foreground)]">{snapshots.length} records</p>
        </div>
      </div>
    </div>
  );
}
