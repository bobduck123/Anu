'use client';

import { useState } from 'react';

interface EstimateResult {
  weeklyRange: [number, number]; // [low, high] in dollars
}

function estimateSavings(householdSize: number, weeklyGrocery: number): EstimateResult {
  // Conservative estimate: 25-40% savings on the bulk portion
  // Assume ~60% of grocery spend can go through bulk runs
  const bulkable = weeklyGrocery * 0.6;
  const low = bulkable * 0.25;
  const high = bulkable * 0.40;
  return { weeklyRange: [Math.round(low), Math.round(high)] };
}

export function OnboardingWidget() {
  const [postcode, setPostcode] = useState('');
  const [householdSize, setHouseholdSize] = useState(2);
  const [weeklyGrocery, setWeeklyGrocery] = useState(150);
  const [diet, setDiet] = useState('mixed');
  const [result, setResult] = useState<EstimateResult | null>(null);

  function handleEstimate() {
    const est = estimateSavings(householdSize, weeklyGrocery);
    setResult(est);
  }

  return (
    <div className="bg-[#665700] border border-[#665700] rounded-xl p-6">
      <h3 className="text-lg font-semibold text-[#1e0227] mb-1">
        How much could you save?
      </h3>
      <p className="text-sm text-[#7c413c] mb-4">
        Tell us about your household and we&apos;ll estimate your weekly savings.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs text-[#1e0227] mb-1">Postcode</label>
          <input
            type="text"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            placeholder="2042"
            className="w-full border border-[#7c413c] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-[#665700]"
          />
        </div>
        <div>
          <label className="block text-xs text-[#1e0227] mb-1">Household size</label>
          <select
            value={householdSize}
            onChange={(e) => setHouseholdSize(Number(e.target.value))}
            className="w-full border border-[#7c413c] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-[#665700]"
          >
            <option value={1}>1 person</option>
            <option value={2}>2 people</option>
            <option value={3}>3 people</option>
            <option value={4}>4 people</option>
            <option value={5}>5+ people</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#1e0227] mb-1">Weekly grocery ($)</label>
          <input
            type="number"
            value={weeklyGrocery}
            onChange={(e) => setWeeklyGrocery(Number(e.target.value))}
            className="w-full border border-[#7c413c] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-[#665700]"
          />
        </div>
        <div>
          <label className="block text-xs text-[#1e0227] mb-1">Diet preference</label>
          <select
            value={diet}
            onChange={(e) => setDiet(e.target.value)}
            className="w-full border border-[#7c413c] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-[#665700]"
          >
            <option value="mixed">Mixed (meat + veg)</option>
            <option value="vegetarian">Vegetarian</option>
            <option value="vegan">Vegan</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleEstimate}
        className="w-full bg-[#665700] text-[var(--color-foreground)] py-2.5 rounded-lg text-sm font-medium hover:bg-[#665700] transition-colors"
      >
        Estimate My Savings
      </button>

      {result && (
        <div className="mt-4 bg-[var(--color-foreground)] border border-[#665700] rounded-lg p-4 text-center">
          <p className="text-sm text-[#7c413c]">Estimated weekly savings</p>
          <p className="text-2xl font-bold text-[#665700] mt-1">
            ${result.weeklyRange[0]} &ndash; ${result.weeklyRange[1]}
          </p>
          <p className="text-xs text-[#7c413c] mt-1">
            That&apos;s ${result.weeklyRange[0] * 52} &ndash; ${result.weeklyRange[1] * 52} per year
          </p>
        </div>
      )}
    </div>
  );
}
