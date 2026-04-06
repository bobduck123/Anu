'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
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

const FALLBACK_SCENARIOS: Scenario[] = [
  {
    id: 9001,
    title: 'Relief queue surge with unstable inflows',
    description: 'Rebalance relief and reserves while preserving member trust signals.',
    risk_tier: 'high',
  },
  {
    id: 9002,
    title: 'Cross-node coordination under civic pressure',
    description: 'Choose coordination posture across transparency, capacity, and delivery speed.',
    risk_tier: 'medium',
  },
];

const FALLBACK_STEPS: Record<number, ScenarioStep[]> = {
  9001: [
    {
      id: 9101,
      sequence: 1,
      prompt: 'What is your immediate treasury posture?',
      options: [
        { value: 'protect_liquidity', label: 'Protect liquidity first' },
        { value: 'balanced_release', label: 'Balanced relief release' },
        { value: 'aggressive_spend', label: 'Aggressive relief spending' },
      ],
    },
    {
      id: 9102,
      sequence: 2,
      prompt: 'How transparent is your public communication?',
      options: [
        { value: 'transparent_briefing', label: 'Transparent public briefing' },
        { value: 'limited_disclosure', label: 'Limited disclosure' },
        { value: 'defer_action', label: 'Delay communication' },
      ],
    },
  ],
  9002: [
    {
      id: 9201,
      sequence: 1,
      prompt: 'How do you coordinate partner nodes?',
      options: [
        { value: 'federated_sync', label: 'Federated synchronous review' },
        { value: 'regional_delegate', label: 'Regional delegated review' },
        { value: 'local_autonomy_only', label: 'Local autonomy only' },
      ],
    },
    {
      id: 9202,
      sequence: 2,
      prompt: 'What is your risk escalation threshold?',
      options: [
        { value: 'early_trigger', label: 'Early trigger + tighter controls' },
        { value: 'balanced_trigger', label: 'Balanced trigger' },
        { value: 'late_trigger', label: 'Late trigger' },
      ],
    },
  ],
};

const DECISION_WEIGHTS: Record<string, number> = {
  protect_liquidity: 6500,
  balanced_release: 2800,
  aggressive_spend: -4200,
  transparent_briefing: 2100,
  limited_disclosure: -1200,
  defer_action: -3200,
  federated_sync: 3600,
  regional_delegate: 1900,
  local_autonomy_only: -2300,
  early_trigger: 2400,
  balanced_trigger: 1100,
  late_trigger: -1700,
};

function buildFallbackImpact(decisionValues: string[]): SimulationImpact {
  const treasuryDelta = decisionValues.reduce((sum, value) => sum + (DECISION_WEIGHTS[value] || 0), 0);

  let riskLevel = 'managed';
  if (treasuryDelta < -5000) {
    riskLevel = 'critical';
  } else if (treasuryDelta < 0) {
    riskLevel = 'elevated';
  }

  return {
    treasury_delta_cents: treasuryDelta,
    risk_level: riskLevel,
  };
}

export default function GovernanceSimulationsPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selected, setSelected] = useState<Scenario | null>(null);
  const [steps, setSteps] = useState<ScenarioStep[]>([]);
  const [decisions, setDecisions] = useState<Record<number, string>>({});
  const [result, setResult] = useState<SimulationImpact | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [degraded, setDegraded] = useState(false);

  useEffect(() => {
    let active = true;

    const loadScenarios = async () => {
      setError('');
      setNotice(null);
      setDegraded(false);

      try {
        const response = await fetch(`${API_BASE}/api/governance-simulations/`, { headers: getAuthHeaders() });
        if (!response.ok) {
          throw new Error('Live simulations unavailable');
        }

        const data = (await response.json()) as { data?: { scenarios?: Scenario[] } };
        const liveScenarios = data.data?.scenarios || [];

        if (!active) return;

        if (liveScenarios.length < 1) {
          setScenarios(FALLBACK_SCENARIOS);
          setDegraded(true);
          setNotice('No live simulations are published yet. Running fallback scenario briefings.');
        } else {
          setScenarios(liveScenarios);
        }
      } catch {
        if (!active) return;

        setScenarios(FALLBACK_SCENARIOS);
        setDegraded(true);
        setError('Live simulation feed is unavailable in this environment.');
        setNotice('Working now: fallback governance scenario practice remains available while simulation services recover.');
      }
    };

    void loadScenarios();

    return () => {
      active = false;
    };
  }, []);

  const sortedSteps = useMemo(
    () => [...steps].sort((a, b) => a.sequence - b.sequence),
    [steps],
  );

  const loadSteps = async (scenario: Scenario) => {
    setSelected(scenario);
    setResult(null);
    setDecisions({});
    setError('');

    if (degraded) {
      setSteps(FALLBACK_STEPS[scenario.id] || []);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/governance-simulations/${scenario.id}`, { headers: getAuthHeaders() });
      if (!response.ok) {
        throw new Error('Live scenario step feed unavailable');
      }

      const data = (await response.json()) as { data?: { steps?: ScenarioStep[] } };
      const liveSteps = data.data?.steps || [];

      if (liveSteps.length < 1) {
        setSteps(FALLBACK_STEPS[scenario.id] || []);
        setNotice('Scenario steps are unavailable. Loaded fallback briefing steps instead.');
        setDegraded(true);
        return;
      }

      setSteps(liveSteps);
    } catch {
      setSteps(FALLBACK_STEPS[scenario.id] || []);
      setNotice('Scenario step service is unavailable. Loaded fallback briefing steps instead.');
      setDegraded(true);
    }
  };

  const runSimulation = async () => {
    if (!selected) return;

    const orderedDecisionValues = sortedSteps
      .map((step) => decisions[step.id])
      .filter((value): value is string => Boolean(value));

    if (orderedDecisionValues.length < 1) {
      setNotice('Pick at least one decision before running the simulation.');
      return;
    }

    if (degraded) {
      setResult(buildFallbackImpact(orderedDecisionValues));
      setNotice('Simulation executed in fallback mode using local impact estimation.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/governance-simulations/${selected.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ decisions: orderedDecisionValues }),
      });

      if (!response.ok) {
        throw new Error('Live simulation run failed');
      }

      const data = (await response.json()) as { data?: { impact?: SimulationImpact | null } };
      setResult(data.data?.impact || null);
    } catch {
      setDegraded(true);
      setResult(buildFallbackImpact(orderedDecisionValues));
      setNotice('Live simulation run is unavailable. Returned a fallback local impact estimate instead.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-semibold mb-2 text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
            Governance Simulations
          </h1>
          <p className="text-[color:rgba(246,212,203,0.82)]">
            Scenario-driven practice without ledger mutation.
          </p>
        </div>

        {error || notice ? (
          <div className="rounded-2xl border border-[color:rgba(224,177,21,0.28)] bg-[color:rgba(224,177,21,0.1)] p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 text-[var(--color-foreground)]" />
              <div className="min-w-0">
                {error ? <p className="text-sm text-[var(--color-foreground)]">{error}</p> : null}
                {notice ? <p className="text-sm leading-6 text-[color:rgba(246,212,203,0.86)]">{notice}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href="/governance" className="btn-pill btn-pill-outline text-xs">Open governance index</Link>
                  <Link href="/transparency" className="btn-pill btn-pill-outline text-xs">Open transparency</Link>
                  <Link href="/docs" className="btn-pill btn-pill-outline text-xs">Open docs</Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-[300px_1fr]">
          <div className="card-civic space-y-3">
            <h2 className="text-2xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Scenarios
            </h2>
            {scenarios.length === 0 ? (
              <p className="text-sm text-[color:rgba(246,212,203,0.72)]">No scenarios yet.</p>
            ) : null}
            {scenarios.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => void loadSteps(scenario)}
                className={`w-full text-left px-3 py-2 rounded-lg border ${
                  selected?.id === scenario.id
                    ? 'border-[var(--color-institutional)] bg-[var(--color-institutional-light)]'
                    : 'border-[var(--color-border)]'
                }`}
              >
                <div className="font-semibold text-[var(--color-foreground)]">{scenario.title}</div>
                <div className="text-xs text-[color:rgba(246,212,203,0.7)]">{scenario.risk_tier || 'low'} risk</div>
                {degraded ? <div className="mt-1 text-[11px] text-[color:rgba(246,212,203,0.62)]">Fallback mode</div> : null}
              </button>
            ))}
          </div>

          <div className="card-civic space-y-4">
            <h2 className="text-2xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Scenario Details
            </h2>
            {!selected ? <p className="text-sm text-[color:rgba(246,212,203,0.72)]">Select a scenario to begin.</p> : null}
            {selected ? (
              <>
                <p className="text-sm text-[color:rgba(246,212,203,0.78)]">{selected.description}</p>
                <div className="space-y-4">
                  {sortedSteps.map((step) => (
                    <div key={step.id} className="space-y-2">
                      <div className="font-medium text-[var(--color-foreground)]">{step.prompt}</div>
                      <div className="flex flex-wrap gap-2">
                        {(step.options || []).map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setDecisions((current) => ({ ...current, [step.id]: option.value }))}
                            className={`px-3 py-1.5 rounded-full text-sm border ${
                              decisions[step.id] === option.value
                                ? 'border-[var(--color-institutional)] bg-[var(--color-institutional-light)]'
                                : 'border-[var(--color-border)]'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <button className="btn-pill btn-pill-primary" onClick={() => void runSimulation()}>
                  Run Simulation
                </button>
                {result ? (
                  <div className="rounded-lg border border-[var(--color-border)] p-4">
                    <div className="text-sm text-[color:rgba(246,212,203,0.72)]">Simulated impact</div>
                    <div className="font-mono-data text-lg text-[var(--color-foreground)]">
                      {typeof result.treasury_delta_cents === 'number' ? `${result.treasury_delta_cents} cents` : 'n/a'}
                    </div>
                    <div className="text-sm text-[color:rgba(246,212,203,0.78)]">Risk level: {result.risk_level || 'n/a'}</div>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
