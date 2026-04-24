import { describe, expect, it } from 'vitest';
import {
  buildScenarioInputQueryString,
  createScenarioInputModel,
  createScenarioInputModelFromMeta,
  normalizeScenarioMeta,
  parseScenarioInputQuery,
} from '@/lib/wcle/scenarioConfig';

describe('scenarioConfig helpers', () => {
  it('normalizes invalid scenario meta fields to safe defaults', () => {
    const normalized = normalizeScenarioMeta({
      objective: 'invalid-objective' as never,
      comparison_mode: 'invalid-mode' as never,
      budget_cap_cents: -400,
      max_coordination_fee_cents: 325,
    });

    expect(normalized.objective).toBe('balanced');
    expect(normalized.comparison_mode).toBe('absolute');
    expect(normalized.budget_cap_cents).toBeNull();
    expect(normalized.max_coordination_fee_cents).toBe(325);
  });

  it('builds model defaults from scenario meta with explicit overrides', () => {
    const model = createScenarioInputModelFromMeta(
      {
        scope: 'mobility',
        objective: 'max_predictability',
        comparison_mode: 'percentage',
        budget_cap_cents: 12000,
      },
      { objective: 'max_savings' },
    );

    expect(model.scope).toBe('mobility');
    expect(model.objective).toBe('max_savings');
    expect(model.comparisonMode).toBe('percentage');
    expect(model.budgetCapCents).toBe(12000);
    expect(model.maxCoordinationFeeCents).toBeNull();
  });

  it('serializes and parses query fields for model continuity', () => {
    const query = buildScenarioInputQueryString(createScenarioInputModel({
      scope: 'energy',
      objective: 'max_savings',
      comparisonMode: 'percentage',
      budgetCapCents: 4500,
      maxCoordinationFeeCents: 300,
    }));
    const parsed = parseScenarioInputQuery(new URLSearchParams(query));

    expect(parsed.scope).toBe('energy');
    expect(parsed.objective).toBe('max_savings');
    expect(parsed.comparisonMode).toBe('percentage');
    expect(parsed.budgetCapCents).toBe(4500);
    expect(parsed.maxCoordinationFeeCents).toBe(300);
  });
});
