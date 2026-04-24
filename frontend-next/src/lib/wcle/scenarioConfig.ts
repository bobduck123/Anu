export const wcleOptimizationScopes = ['groceries', 'household', 'energy', 'mobility', 'mixed'] as const;
export const wcleObjectives = ['max_savings', 'max_predictability', 'balanced'] as const;
export const wcleComparisonModes = ['absolute', 'percentage'] as const;

export type WCLEOptimizationScope = (typeof wcleOptimizationScopes)[number];
export type WCLEObjective = (typeof wcleObjectives)[number];
export type WCLEComparisonMode = (typeof wcleComparisonModes)[number];
export type ScenarioScopeFilter = 'all' | WCLEOptimizationScope;

export interface WCLEScenarioMeta {
  scope?: WCLEOptimizationScope;
  objective?: WCLEObjective;
  comparison_mode?: WCLEComparisonMode;
  budget_cap_cents?: number | null;
  max_coordination_fee_cents?: number | null;
}

export interface ScenarioInputModel {
  scope: ScenarioScopeFilter;
  objective: WCLEObjective;
  comparisonMode: WCLEComparisonMode;
  budgetCapCents: number | null;
  maxCoordinationFeeCents: number | null;
}

export const scenarioScopeOptions: ReadonlyArray<{ value: ScenarioScopeFilter; label: string }> = [
  { value: 'all', label: 'All scopes' },
  { value: 'groceries', label: 'Groceries' },
  { value: 'household', label: 'Household essentials' },
  { value: 'energy', label: 'Energy' },
  { value: 'mobility', label: 'Mobility' },
  { value: 'mixed', label: 'Mixed domain' },
];

export const scenarioObjectiveOptions: ReadonlyArray<{ value: WCLEObjective; label: string }> = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'max_savings', label: 'Maximum savings' },
  { value: 'max_predictability', label: 'Predictable outcomes' },
];

export const scenarioComparisonModeOptions: ReadonlyArray<{ value: WCLEComparisonMode; label: string }> = [
  { value: 'absolute', label: 'Absolute delta ($)' },
  { value: 'percentage', label: 'Percentage delta (%)' },
];

export const DEFAULT_SCENARIO_INPUT_MODEL: ScenarioInputModel = {
  scope: 'all',
  objective: 'balanced',
  comparisonMode: 'absolute',
  budgetCapCents: null,
  maxCoordinationFeeCents: null,
};

function isScope(value: unknown): value is WCLEOptimizationScope {
  return typeof value === 'string' && (wcleOptimizationScopes as readonly string[]).includes(value);
}

function isScopeFilter(value: unknown): value is ScenarioScopeFilter {
  return value === 'all' || isScope(value);
}

function isObjective(value: unknown): value is WCLEObjective {
  return typeof value === 'string' && (wcleObjectives as readonly string[]).includes(value);
}

function isComparisonMode(value: unknown): value is WCLEComparisonMode {
  return typeof value === 'string' && (wcleComparisonModes as readonly string[]).includes(value);
}

function parseOptionalCents(value: unknown): number | null {
  if (value == null || value === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed);
}

export function parseDollarInputToCents(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const dollars = Number(normalized);
  if (!Number.isFinite(dollars) || dollars < 0) {
    return null;
  }

  return Math.round(dollars * 100);
}

export function formatCentsForDollarInput(cents: number | null): string {
  if (cents == null) {
    return '';
  }

  return (cents / 100).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

export function normalizeScenarioMeta(meta: WCLEScenarioMeta | null | undefined): WCLEScenarioMeta {
  const source = meta ?? {};
  const scope = isScope(source.scope) ? source.scope : undefined;

  return {
    ...(scope ? { scope } : {}),
    objective: isObjective(source.objective) ? source.objective : DEFAULT_SCENARIO_INPUT_MODEL.objective,
    comparison_mode: isComparisonMode(source.comparison_mode) ? source.comparison_mode : DEFAULT_SCENARIO_INPUT_MODEL.comparisonMode,
    budget_cap_cents: parseOptionalCents(source.budget_cap_cents),
    max_coordination_fee_cents: parseOptionalCents(source.max_coordination_fee_cents),
  };
}

export function createScenarioInputModel(overrides: Partial<ScenarioInputModel> = {}): ScenarioInputModel {
  return {
    scope: isScopeFilter(overrides.scope) ? overrides.scope : DEFAULT_SCENARIO_INPUT_MODEL.scope,
    objective: isObjective(overrides.objective) ? overrides.objective : DEFAULT_SCENARIO_INPUT_MODEL.objective,
    comparisonMode: isComparisonMode(overrides.comparisonMode) ? overrides.comparisonMode : DEFAULT_SCENARIO_INPUT_MODEL.comparisonMode,
    budgetCapCents: parseOptionalCents(overrides.budgetCapCents),
    maxCoordinationFeeCents: parseOptionalCents(overrides.maxCoordinationFeeCents),
  };
}

export function createScenarioInputModelFromMeta(
  meta: WCLEScenarioMeta | null | undefined,
  overrides: Partial<ScenarioInputModel> = {},
): ScenarioInputModel {
  const normalized = normalizeScenarioMeta(meta);

  return createScenarioInputModel({
    scope: normalized.scope ?? DEFAULT_SCENARIO_INPUT_MODEL.scope,
    objective: normalized.objective ?? DEFAULT_SCENARIO_INPUT_MODEL.objective,
    comparisonMode: normalized.comparison_mode ?? DEFAULT_SCENARIO_INPUT_MODEL.comparisonMode,
    budgetCapCents: normalized.budget_cap_cents ?? null,
    maxCoordinationFeeCents: normalized.max_coordination_fee_cents ?? null,
    ...overrides,
  });
}

type ScenarioQueryLike = Pick<URLSearchParams, 'get'>;

export function parseScenarioInputQuery(
  query: ScenarioQueryLike | null | undefined,
): Partial<ScenarioInputModel> {
  if (!query) {
    return {};
  }

  const scope = query.get('scope');
  const objective = query.get('objective');
  const comparisonMode = query.get('comparison_mode');
  const budgetCapCents = query.get('budget_cap_cents');
  const maxCoordinationFeeCents = query.get('max_coordination_fee_cents');

  const parsed: Partial<ScenarioInputModel> = {};
  if (isScopeFilter(scope)) parsed.scope = scope;
  if (isObjective(objective)) parsed.objective = objective;
  if (isComparisonMode(comparisonMode)) parsed.comparisonMode = comparisonMode;
  if (budgetCapCents != null) parsed.budgetCapCents = parseOptionalCents(budgetCapCents);
  if (maxCoordinationFeeCents != null) parsed.maxCoordinationFeeCents = parseOptionalCents(maxCoordinationFeeCents);

  return parsed;
}

export function buildScenarioInputQueryString(model: ScenarioInputModel): string {
  const params = new URLSearchParams();
  if (model.scope !== 'all') {
    params.set('scope', model.scope);
  }
  params.set('objective', model.objective);
  params.set('comparison_mode', model.comparisonMode);
  if (model.budgetCapCents != null) {
    params.set('budget_cap_cents', String(model.budgetCapCents));
  }
  if (model.maxCoordinationFeeCents != null) {
    params.set('max_coordination_fee_cents', String(model.maxCoordinationFeeCents));
  }
  return params.toString();
}

export function toScenarioMeta(model: ScenarioInputModel): WCLEScenarioMeta {
  return normalizeScenarioMeta({
    scope: model.scope === 'all' ? undefined : model.scope,
    objective: model.objective,
    comparison_mode: model.comparisonMode,
    budget_cap_cents: model.budgetCapCents,
    max_coordination_fee_cents: model.maxCoordinationFeeCents,
  });
}
