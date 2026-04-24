'use client';

import { useMemo, useState } from 'react';

interface EstimateResult {
  weeklyRange: [number, number];
  annualRange: [number, number];
}

const scopeProfiles: Record<string, { captureRate: number; lowGain: number; highGain: number }> = {
  groceries: { captureRate: 0.6, lowGain: 0.25, highGain: 0.4 },
  household: { captureRate: 0.5, lowGain: 0.18, highGain: 0.32 },
  energy: { captureRate: 0.45, lowGain: 0.12, highGain: 0.24 },
  mobility: { captureRate: 0.4, lowGain: 0.1, highGain: 0.2 },
};

function estimateSavings(scope: string, weeklySpend: number, commitmentLevel: number): EstimateResult {
  const profile = scopeProfiles[scope] || scopeProfiles.groceries;
  const commitmentMultiplier = commitmentLevel / 100;

  const eligibleSpend = weeklySpend * profile.captureRate * commitmentMultiplier;
  const low = Math.round(eligibleSpend * profile.lowGain);
  const high = Math.round(eligibleSpend * profile.highGain);

  return {
    weeklyRange: [low, high],
    annualRange: [low * 52, high * 52],
  };
}

export function OnboardingWidget() {
  const [scope, setScope] = useState('groceries');
  const [postcode, setPostcode] = useState('');
  const [weeklySpend, setWeeklySpend] = useState(180);
  const [commitmentLevel, setCommitmentLevel] = useState(70);
  const [householdSize, setHouseholdSize] = useState(2);
  const [result, setResult] = useState<EstimateResult | null>(null);

  const scopeHint = useMemo(() => {
    if (scope === 'energy') return 'Energy scenarios usually have lower weekly variance but stronger long-term impact.';
    if (scope === 'mobility') return 'Mobility scenarios often depend on route and timing constraints.';
    if (scope === 'household') return 'Household essentials tend to produce consistent repeat savings.';
    return 'Groceries generally have the widest short-term savings spread.';
  }, [scope]);

  function handleEstimate() {
    setResult(estimateSavings(scope, weeklySpend, commitmentLevel));
  }

  return (
    <div className="card-civic border border-[color:rgba(246,212,203,0.16)]">
      <p className="text-xs uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.64)]">Scenario setup</p>
      <h3 className="text-lg font-semibold text-[var(--color-foreground)] mt-2 mb-1">Estimate your optimization potential</h3>
      <p className="text-sm text-[color:rgba(246,212,203,0.74)] mb-4">
        Define your scope and constraints. This estimate helps compare options before committing.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs text-[color:rgba(246,212,203,0.72)] mb-1">Optimization scope</label>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="input-civic w-full"
          >
            <option value="groceries">Groceries</option>
            <option value="household">Household essentials</option>
            <option value="energy">Energy</option>
            <option value="mobility">Mobility</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-[color:rgba(246,212,203,0.72)] mb-1">Postcode</label>
          <input
            type="text"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            placeholder="2042"
            className="input-civic w-full"
          />
        </div>

        <div>
          <label className="block text-xs text-[color:rgba(246,212,203,0.72)] mb-1">Current weekly spend ($)</label>
          <input
            type="number"
            value={weeklySpend}
            onChange={(e) => setWeeklySpend(Number(e.target.value || 0))}
            className="input-civic w-full"
          />
        </div>

        <div>
          <label className="block text-xs text-[color:rgba(246,212,203,0.72)] mb-1">Household size</label>
          <select value={householdSize} onChange={(e) => setHouseholdSize(Number(e.target.value))} className="input-civic w-full">
            <option value={1}>1 person</option>
            <option value={2}>2 people</option>
            <option value={3}>3 people</option>
            <option value={4}>4 people</option>
            <option value={5}>5+ people</option>
          </select>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.04)] px-3 py-2.5">
        <label className="block text-xs text-[color:rgba(246,212,203,0.72)] mb-1">Commitment level: {commitmentLevel}%</label>
        <input
          type="range"
          min={20}
          max={100}
          step={5}
          value={commitmentLevel}
          onChange={(e) => setCommitmentLevel(Number(e.target.value))}
          className="w-full"
        />
        <p className="mt-1 text-xs text-[color:rgba(246,212,203,0.68)]">{scopeHint}</p>
      </div>

      <button onClick={handleEstimate} className="w-full btn-pill btn-pill-primary text-sm">
        Calculate estimate
      </button>

      {result ? (
        <div className="mt-4 rounded-lg border border-[color:rgba(246,212,203,0.14)] bg-[color:rgba(30,2,39,0.36)] p-4 text-center">
          <p className="text-sm text-[color:rgba(246,212,203,0.74)]">Estimated weekly range</p>
          <p className="text-2xl font-bold text-[#665700] mt-1">
            ${result.weeklyRange[0]} - ${result.weeklyRange[1]}
          </p>
          <p className="text-xs text-[color:rgba(246,212,203,0.7)] mt-1">
            Annual projection: ${result.annualRange[0]} - ${result.annualRange[1]}
          </p>
        </div>
      ) : null}
    </div>
  );
}
