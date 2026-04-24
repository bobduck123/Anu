import type { WCLEPack, WCLERun } from '@/lib/api/wcleApi';
import { normalizeScenarioMeta, type ScenarioScopeFilter, type WCLEComparisonMode, type WCLEObjective } from '@/lib/wcle/scenarioConfig';

export type OptimizationScope = ScenarioScopeFilter;
export type ScenarioObjective = WCLEObjective;
export type ScenarioComparisonMode = WCLEComparisonMode;
export type ScenarioConfidence = 'provisional' | 'indicative' | 'observed';

export interface ScenarioPreferences {
  scope: OptimizationScope;
  objective: ScenarioObjective;
  comparisonMode: ScenarioComparisonMode;
  maxCoordinationFeeCents: number | null;
  budgetCapCents: number | null;
}

export interface RunScenarioMetrics {
  scope: Exclude<OptimizationScope, 'all'>;
  estimatedSavingsCents: number;
  estimatedSavingsPct: number;
  confidence: ScenarioConfidence;
}

export interface ScoredRun {
  run: WCLERun;
  metrics: RunScenarioMetrics;
  score: number;
}

export function inferScopeFromRun(run: Pick<WCLERun, 'title' | 'supplier_type' | 'location_name'>): Exclude<OptimizationScope, 'all'> {
  const source = `${run.title} ${run.supplier_type} ${run.location_name || ''}`.toLowerCase();

  if (source.includes('energy') || source.includes('power') || source.includes('solar')) return 'energy';
  if (source.includes('transport') || source.includes('mobility') || source.includes('fuel')) return 'mobility';
  if (source.includes('household') || source.includes('cleaning')) return 'household';
  return 'groceries';
}

export function deriveRunScenarioMetrics(run: WCLERun): RunScenarioMetrics {
  const estimatedSavingsCents = (run.retail_equivalent_total_cents || 0) - (run.bulk_estimate_total_cents || 0);
  const retailBase = run.retail_equivalent_total_cents || 0;
  const estimatedSavingsPct = retailBase > 0 ? Math.round((estimatedSavingsCents / retailBase) * 100) : 0;
  const normalizedMeta = normalizeScenarioMeta(run.scenario_meta);

  let confidence: ScenarioConfidence = 'provisional';
  if (run.status === 'COMPLETED') {
    confidence = 'observed';
  } else if (run.status === 'OPEN' || run.status === 'CLOSED') {
    confidence = 'indicative';
  }

  return {
    scope: normalizedMeta.scope ?? inferScopeFromRun(run),
    estimatedSavingsCents,
    estimatedSavingsPct,
    confidence,
  };
}

export function filterAndRankRunsByScenario(runs: WCLERun[], preferences: ScenarioPreferences): ScoredRun[] {
  return runs
    .map((run) => {
      const metrics = deriveRunScenarioMetrics(run);
      const score = scoreRun(run, metrics, preferences);
      return { run, metrics, score };
    })
    .filter(({ run, metrics }) => {
      if (preferences.scope !== 'all' && metrics.scope !== preferences.scope) {
        return false;
      }

      if (
        preferences.maxCoordinationFeeCents != null
        && run.coordination_fee_per_household_cents > preferences.maxCoordinationFeeCents
      ) {
        return false;
      }

      if (
        preferences.budgetCapCents != null
        && run.bulk_estimate_total_cents != null
        && run.bulk_estimate_total_cents > preferences.budgetCapCents
      ) {
        return false;
      }

      return true;
    })
    .sort((a, b) => b.score - a.score);
}

function scoreRun(run: WCLERun, metrics: RunScenarioMetrics, preferences: ScenarioPreferences): number {
  const confidenceWeight = metrics.confidence === 'observed' ? 1 : metrics.confidence === 'indicative' ? 0.7 : 0.4;
  const savingsWeight = Math.max(0, metrics.estimatedSavingsCents) / 100;
  const pctWeight = Math.max(0, metrics.estimatedSavingsPct);
  const feePenalty = run.coordination_fee_per_household_cents / 100;

  if (preferences.objective === 'max_savings') {
    return (savingsWeight * 0.8) + (pctWeight * 0.2) - (feePenalty * 0.1);
  }

  if (preferences.objective === 'max_predictability') {
    return (confidenceWeight * 100) + (pctWeight * 0.15) - (feePenalty * 0.2);
  }

  return (savingsWeight * 0.45) + (pctWeight * 0.25) + (confidenceWeight * 30) - (feePenalty * 0.15);
}

export interface PackComparison {
  absoluteSavingsCents: number;
  savingsPct: number;
  comparisonValue: number;
}

export interface RankedPack {
  pack: WCLEPack;
  comparison: PackComparison;
  score: number;
}

export function comparePack(pack: WCLEPack, mode: ScenarioComparisonMode): PackComparison {
  const retail = pack.retail_estimate_cents || 0;
  const bulk = pack.bulk_estimate_cents || 0;
  const absoluteSavingsCents = retail - bulk;
  const savingsPct = retail > 0 ? Math.round((absoluteSavingsCents / retail) * 100) : 0;

  return {
    absoluteSavingsCents,
    savingsPct,
    comparisonValue: mode === 'absolute' ? absoluteSavingsCents : savingsPct,
  };
}

export function rankPacksByScenario(
  packs: WCLEPack[],
  preferences: Pick<ScenarioPreferences, 'objective' | 'comparisonMode' | 'budgetCapCents'>,
): RankedPack[] {
  return packs
    .filter((pack) => (
      preferences.budgetCapCents == null
      || pack.bulk_estimate_cents == null
      || pack.bulk_estimate_cents <= preferences.budgetCapCents
    ))
    .map((pack) => {
      const comparison = comparePack(pack, preferences.comparisonMode);
      return {
        pack,
        comparison,
        score: scorePack(pack, comparison, preferences.objective),
      };
    })
    .sort((a, b) => b.score - a.score);
}

function scorePack(pack: WCLEPack, comparison: PackComparison, objective: ScenarioObjective): number {
  const savingsWeight = Math.max(0, comparison.absoluteSavingsCents) / 100;
  const pctWeight = Math.max(0, comparison.savingsPct);
  const predictabilityWeight = Math.max(0, 100 - (pack.waste_buffer_bps / 100));
  const flexibilityWeight = pack.adjustable_quantities ? 10 : 5;

  if (objective === 'max_savings') {
    return (savingsWeight * 0.8) + (pctWeight * 0.2);
  }

  if (objective === 'max_predictability') {
    return (predictabilityWeight * 0.75) + (pctWeight * 0.15) + (flexibilityWeight * 0.1);
  }

  return (savingsWeight * 0.45) + (pctWeight * 0.2) + (predictabilityWeight * 0.25) + (flexibilityWeight * 0.1);
}
