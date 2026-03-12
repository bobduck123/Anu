'use client';

import { useEffect, useState } from 'react';
import { crisisSimApi, type CrisisRun } from '@/lib/api/endpoints';

export default function CrisisSimPage() {
  const [runs, setRuns] = useState<CrisisRun[]>([]);
  const [error, setError] = useState('');

  const runSim = async () => {
    try {
      await crisisSimApi.run({ type: 'supply_shock', params: { shock_factor: 0.15 } });
      const data = await crisisSimApi.runs();
      setRuns(data.runs || []);
    } catch {
      setError('Failed to run simulation');
    }
  };

  useEffect(() => {
    crisisSimApi.runs()
      .then((data) => setRuns(data.runs || []))
      .catch(() => setError('Failed to load runs'));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-serif)' }}>Crisis Simulation</h1>
            <p className="text-[var(--color-muted-foreground)]">Synthetic stress tests (no real funds).</p>
          </div>
          <button onClick={runSim} className="btn-pill btn-pill-primary text-sm">Run Simulation</button>
        </div>
        {error && <div className="card-civic text-[var(--color-accent)]">{error}</div>}
        <div className="space-y-3">
          {runs.map((run) => (
            <div key={run.id} className="card-civic">
              <div className="text-sm text-[var(--color-muted-foreground)]">Run #{run.id}</div>
              <pre className="text-xs mt-2 whitespace-pre-wrap">{JSON.stringify(run.results, null, 2)}</pre>
            </div>
          ))}
          {runs.length === 0 && <p className="text-sm text-[var(--color-muted-foreground)]">No runs yet.</p>}
        </div>
      </div>
    </div>
  );
}
