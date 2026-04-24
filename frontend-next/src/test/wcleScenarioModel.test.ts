import { describe, expect, it } from 'vitest';
import { comparePack, filterAndRankRunsByScenario, inferScopeFromRun, rankPacksByScenario } from '@/lib/wcle/scenarioModel';
import type { WCLEPack, WCLERun } from '@/lib/api/wcleApi';

function runFixture(overrides: Partial<WCLERun> = {}): WCLERun {
  return {
    id: 1,
    title: 'Weekly groceries scenario',
    supplier_type: 'FLEMINGTON',
    location_name: 'Commons Hall',
    address: null,
    suburb: 'Marrickville',
    postcode: '2204',
    lat: null,
    lng: null,
    organizer_user_id: 3,
    microcosm_id: null,
    run_date: '2026-05-01T10:00:00Z',
    pledge_deadline: '2026-04-30T10:00:00Z',
    pickup_window_start: null,
    pickup_window_end: null,
    status: 'OPEN',
    coordination_fee_per_household_cents: 300,
    max_households: 80,
    retail_equivalent_total_cents: 30000,
    bulk_estimate_total_cents: 21000,
    bulk_actual_total_cents: null,
    created_at: '2026-04-01T10:00:00Z',
    updated_at: '2026-04-01T10:00:00Z',
    ...overrides,
  };
}

function packFixture(overrides: Partial<WCLEPack> = {}): WCLEPack {
  return {
    id: 11,
    run_id: 1,
    name: 'Core Pack',
    description: null,
    items: [],
    adjustable_quantities: false,
    waste_buffer_bps: 500,
    retail_estimate_cents: 10000,
    bulk_estimate_cents: 7000,
    created_at: '2026-04-01T10:00:00Z',
    updated_at: '2026-04-01T10:00:00Z',
    ...overrides,
  };
}

describe('scenarioModel helpers', () => {
  it('infers scope from run language', () => {
    const energyRun = runFixture({ title: 'Energy co-op baseline scenario' });
    expect(inferScopeFromRun(energyRun)).toBe('energy');
  });

  it('filters and ranks runs by objective and constraints', () => {
    const runs = [
      runFixture({ id: 1, title: 'Groceries A', retail_equivalent_total_cents: 32000, bulk_estimate_total_cents: 22000, coordination_fee_per_household_cents: 200 }),
      runFixture({ id: 2, title: 'Groceries B', retail_equivalent_total_cents: 26000, bulk_estimate_total_cents: 23000, coordination_fee_per_household_cents: 100 }),
      runFixture({ id: 3, supplier_type: 'CUSTOM', title: 'Energy bundle', retail_equivalent_total_cents: 50000, bulk_estimate_total_cents: 43000, coordination_fee_per_household_cents: 600 }),
    ];

    const ranked = filterAndRankRunsByScenario(runs, {
      scope: 'groceries',
      objective: 'max_savings',
      comparisonMode: 'absolute',
      maxCoordinationFeeCents: 500,
      budgetCapCents: null,
    });

    expect(ranked).toHaveLength(2);
    expect(ranked[0]?.run.id).toBe(1);
  });

  it('prefers scenario meta scope over inferred scope when available', () => {
    const runs = [
      runFixture({
        id: 21,
        title: 'Weekly groceries scenario',
        scenario_meta: { scope: 'energy' },
      }),
    ];

    const ranked = filterAndRankRunsByScenario(runs, {
      scope: 'energy',
      objective: 'balanced',
      comparisonMode: 'absolute',
      maxCoordinationFeeCents: null,
      budgetCapCents: null,
    });

    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.metrics.scope).toBe('energy');
  });

  it('supports absolute and percentage pack comparison modes', () => {
    const pack = packFixture({ retail_estimate_cents: 12000, bulk_estimate_cents: 9000 });

    const absolute = comparePack(pack, 'absolute');
    const percentage = comparePack(pack, 'percentage');

    expect(absolute.absoluteSavingsCents).toBe(3000);
    expect(absolute.comparisonValue).toBe(3000);
    expect(percentage.savingsPct).toBe(25);
    expect(percentage.comparisonValue).toBe(25);
  });

  it('ranks packs using objective-aware scoring', () => {
    const packs = [
      packFixture({ id: 1, name: 'Big delta', retail_estimate_cents: 18000, bulk_estimate_cents: 9000, waste_buffer_bps: 1000 }),
      packFixture({ id: 2, name: 'Stable', retail_estimate_cents: 12000, bulk_estimate_cents: 10000, waste_buffer_bps: 200 }),
    ];

    const rankedForSavings = rankPacksByScenario(packs, {
      objective: 'max_savings',
      comparisonMode: 'absolute',
      budgetCapCents: null,
    });
    const rankedForPredictability = rankPacksByScenario(packs, {
      objective: 'max_predictability',
      comparisonMode: 'absolute',
      budgetCapCents: null,
    });

    expect(rankedForSavings[0]?.pack.id).toBe(1);
    expect(rankedForPredictability[0]?.pack.id).toBe(2);
  });
});
