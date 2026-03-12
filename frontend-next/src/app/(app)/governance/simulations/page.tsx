'use client';

import { useEffect, useState } from 'react';
import { getCoreApiBase } from '@/lib/runtime';

const API_BASE = getCoreApiBase();

type Scenario = {
  id: number;
  title: string;
  description?: string;
  risk_tier?: string;
};

type ScenarioStep = {
  id: number;
  prompt: string;
  options: Array<{ value: string; label: string }>;
  sequence: number;
};

type SimulationImpact = {
  treasury_delta_cents?: number;
  risk_level?: string;
};

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function GovernanceSimulationsPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selected, setSelected] = useState<Scenario | null>(null);
  const [steps, setSteps] = useState<ScenarioStep[]>([]);
  const [decisions, setDecisions] = useState<Record<number, string>>({});
  const [result, setResult] = useState<SimulationImpact | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/governance-simulations/`, { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data) => setScenarios(data.data?.scenarios || []))
      .catch(() => setError('Failed to load simulations'));
  }, []);

  const loadSteps = (scenario: Scenario) => {
    setSelected(scenario);
    setResult(null);
    fetch(`${API_BASE}/api/governance-simulations/${scenario.id}`, { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data) => setSteps(data.data?.steps || []))
      .catch(() => setError('Failed to load scenario steps'));
  };

  const runSimulation = async () => {
    if (!selected) return;
    const ordered = steps
      .sort((a, b) => a.sequence - b.sequence)
      .map((step) => decisions[step.id])
      .filter(Boolean);
    const res = await fetch(`${API_BASE}/api/governance-simulations/${selected.id}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ decisions: ordered }),
    });
    if (!res.ok) {
      setError('Failed to run simulation');
      return;
    }
    const data = (await res.json()) as { data?: { impact?: SimulationImpact | null } };
    setResult(data.data?.impact || null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
            Governance Simulations
          </h1>
          <p className="text-[var(--color-muted-foreground)]">
            Scenario-driven practice without ledger mutation.
          </p>
        </div>

        {error && <div className="card-civic text-[var(--color-accent)]">{error}</div>}

        <div className="grid gap-6 md:grid-cols-[300px_1fr]">
          <div className="card-civic space-y-3">
            <h2 className="text-lg font-semibold">Scenarios</h2>
            {scenarios.length === 0 && (
              <p className="text-sm text-[var(--color-muted-foreground)]">No scenarios yet.</p>
            )}
            {scenarios.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => loadSteps(scenario)}
                className={`w-full text-left px-3 py-2 rounded-lg border ${
                  selected?.id === scenario.id
                    ? 'border-[var(--color-institutional)] bg-[var(--color-institutional-light)]'
                    : 'border-[var(--color-border)]'
                }`}
              >
                <div className="font-semibold">{scenario.title}</div>
                <div className="text-xs text-[var(--color-muted-foreground)]">{scenario.risk_tier || 'low'} risk</div>
              </button>
            ))}
          </div>

          <div className="card-civic space-y-4">
            <h2 className="text-lg font-semibold">Scenario Details</h2>
            {!selected && <p className="text-sm text-[var(--color-muted-foreground)]">Select a scenario to begin.</p>}
            {selected && (
              <>
                <p className="text-sm text-[var(--color-muted-foreground)]">{selected.description}</p>
                <div className="space-y-4">
                  {steps
                    .sort((a, b) => a.sequence - b.sequence)
                    .map((step) => (
                      <div key={step.id} className="space-y-2">
                        <div className="font-medium">{step.prompt}</div>
                        <div className="flex flex-wrap gap-2">
                          {(step.options || []).map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => setDecisions((prev) => ({ ...prev, [step.id]: opt.value }))}
                              className={`px-3 py-1.5 rounded-full text-sm border ${
                                decisions[step.id] === opt.value
                                  ? 'border-[var(--color-institutional)] bg-[var(--color-institutional-light)]'
                                  : 'border-[var(--color-border)]'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
                <button className="btn-pill btn-pill-primary" onClick={runSimulation}>
                  Run Simulation
                </button>
                {result && (
                  <div className="rounded-lg border border-[var(--color-border)] p-4">
                    <div className="text-sm text-[var(--color-muted-foreground)]">Simulated Impact</div>
                    <div className="font-mono-data text-lg">{result.treasury_delta_cents} cents</div>
                    <div className="text-sm">Risk level: {result.risk_level}</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


