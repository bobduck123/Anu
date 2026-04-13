'use client';

import { useEffect, useState } from 'react';
import { getCoreApiBase } from '@/lib/runtime';
import { getParticipantAuthHeaders } from '@/lib/api/client';

const API_BASE = getCoreApiBase();

const getAuthHeaders = async (): Promise<Record<string, string>> =>
  getParticipantAuthHeaders({ allowLegacyTokenFallback: false });

type SystemicSimulationRun = {
  id: number | string;
  started_at?: string | null;
  resilience_score?: number | null;
  outputs?: Record<string, unknown> | null;
};

export default function SystemicSimulationsPage() {
  const [runs, setRuns] = useState<SystemicSimulationRun[]>([]);
  const [error, setError] = useState('');

  const loadRuns = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/systemic/simulations`, { headers: await getAuthHeaders() });
      const data = (await res.json()) as { data?: { runs?: SystemicSimulationRun[] } };
      setRuns(data.data?.runs || []);
    } catch {
      setError('Failed to load simulations');
    }
  };

  useEffect(() => {
    void loadRuns();
  }, []);

  const runSimulation = async () => {
    const payload = {
      runs: 3,
      shocks: [
        { type: 'DonationShock', value: 0.35 },
        { type: 'ReliefSpike', value: 2.0 },
        { type: 'OnboardingSurge', value: 300 },
        { type: 'BurnoutShock', value: 1.4 },
      ],
      agents: [
        { type: 'SybilCluster', strength: 1.3 },
        { type: 'EndorsementRing', strength: 1.0 },
      ],
    };
    const res = await fetch(`${API_BASE}/api/systemic/simulations/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setError('Failed to run simulation');
      return;
    }
    void loadRuns();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
            Systemic Shock Simulations
          </h1>
          <p className="text-[var(--color-muted-foreground)]">Internal adversarial simulations and outcomes.</p>
        </div>

        {error && <div className="card-civic text-[var(--color-accent)]">{error}</div>}

        <div className="card-civic flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Run compound scenario</h2>
            <p className="text-sm text-[var(--color-muted-foreground)]">Deterministic simulation (seeded).</p>
          </div>
          <button className="btn-pill btn-pill-primary" onClick={runSimulation}>
            Run Simulation
          </button>
        </div>

        <div className="grid gap-4">
          {runs.map((run) => (
            <div key={run.id} className="card-civic">
              <div className="flex items-center justify-between">
                <div className="text-sm text-[var(--color-muted-foreground)]">
                  {run.started_at ? new Date(run.started_at).toLocaleString() : 'n/a'}
                </div>
                <div className="text-sm font-semibold">
                  Resilience: {typeof run.resilience_score === 'number' ? run.resilience_score.toFixed(2) : 'n/a'}
                </div>
              </div>
              <pre className="text-xs mt-3 whitespace-pre-wrap">{JSON.stringify(run.outputs, null, 2)}</pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}




