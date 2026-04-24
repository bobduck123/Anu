'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { wcleApi, WCLERun } from '@/lib/api/wcleApi';
import { OnboardingWidget } from '@/components/wcle/OnboardingWidget';
import { toActionableSurfaceError } from '@/lib/ui/actionableErrors';
import { buildAuthHref } from '@/lib/auth/returnTo';
import {
  buildScenarioInputQueryString,
  createScenarioInputModel,
  formatCentsForDollarInput,
  parseDollarInputToCents,
  parseScenarioInputQuery,
  scenarioComparisonModeOptions,
  scenarioObjectiveOptions,
  scenarioScopeOptions,
  type ScenarioInputModel,
} from '@/lib/wcle/scenarioConfig';
import {
  filterAndRankRunsByScenario,
  type RunScenarioMetrics,
  type ScenarioPreferences,
} from '@/lib/wcle/scenarioModel';
import {
  queryWcleFunnelSummary,
  trackWcleFunnelEvent,
  wcleFunnelWindowHours,
  type WcleFunnelEventPayload,
  type WcleFunnelSummary,
  type WcleFunnelWindowHours,
} from '@/lib/wcle/funnelTelemetry';

function cents(v: number | null | undefined): string {
  if (v == null) return '$0.00';
  return `$${(v / 100).toFixed(2)}`;
}

function supplierBadge(type: string) {
  const colors: Record<string, string> = {
    FLEMINGTON: 'bg-[color:rgba(102,87,0,0.2)] text-[#f6d4cb]',
    COSTCO: 'bg-[color:rgba(124,65,60,0.2)] text-[#7c413c]',
    BUTCHER: 'bg-[color:rgba(124,65,60,0.2)] text-[#f6d4cb]',
    ALDI: 'bg-[color:rgba(224,177,21,0.2)] text-[#e0b115]',
    CUSTOM: 'bg-[color:rgba(246,212,203,0.15)] text-[color:rgba(246,212,203,0.85)]',
  };
  return colors[type] || colors.CUSTOM;
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    DRAFT: 'bg-[color:rgba(246,212,203,0.15)] text-[color:rgba(246,212,203,0.7)]',
    OPEN: 'bg-[color:rgba(102,87,0,0.2)] text-[#f6d4cb]',
    CLOSED: 'bg-[color:rgba(224,177,21,0.2)] text-[#e0b115]',
    EXECUTED: 'bg-[color:rgba(124,65,60,0.2)] text-[#7c413c]',
    COMPLETED: 'bg-[color:rgba(102,87,0,0.25)] text-[#665700]',
    CANCELLED: 'bg-[color:rgba(124,65,60,0.2)] text-[#f6d4cb]',
  };
  return colors[status] || 'bg-[color:rgba(246,212,203,0.15)] text-[color:rgba(246,212,203,0.7)]';
}

const stageRail = ['Define objective', 'Configure constraints', 'Review options', 'Compare tradeoffs', 'Commit'] as const;
const funnelWindowLabels: Record<WcleFunnelWindowHours, string> = {
  24: 'Last 24h',
  168: 'Last 7d',
  720: 'Last 30d',
};

function confidenceLabel(status: WCLERun['status'], confidence: RunScenarioMetrics['confidence']): string {
  if (status === 'COMPLETED') return 'Observed';
  if (confidence === 'indicative') return 'Indicative';
  return 'Provisional';
}

function sensitivityPlaceholder(run: WCLERun): string {
  const baseline = run.bulk_estimate_total_cents || 0;
  if (baseline <= 0) {
    return 'Sensitivity placeholder: waiting for richer cost traces.';
  }
  const swing = Math.round(baseline * 0.05);
  return `Sensitivity placeholder: if scenario cost shifts by +/-5%, expected savings move by about +/-${cents(swing)}.`;
}

function buildWhyThisOption(
  run: WCLERun,
  metrics: RunScenarioMetrics,
  objective: ScenarioInputModel['objective'],
): string[] {
  const lines: string[] = [];

  if (objective === 'max_savings') {
    lines.push('Prioritizes strongest modeled savings under current controls.');
  } else if (objective === 'max_predictability') {
    lines.push('Favours stability signals and lower execution uncertainty.');
  } else {
    lines.push('Balances savings upside with execution confidence.');
  }

  if (run.status === 'COMPLETED') {
    lines.push('Completed status exposes observed outcomes instead of pure estimates.');
  } else if (metrics.estimatedSavingsCents > 0) {
    lines.push(`Current model projects ${cents(metrics.estimatedSavingsCents)} improvement vs baseline.`);
  } else {
    lines.push('Still useful for coordination even when savings are marginal.');
  }

  return lines;
}

function buildTradeoffSummary(run: WCLERun, metrics: RunScenarioMetrics): string[] {
  const lines = [
    `Coordination fee is ${cents(run.coordination_fee_per_household_cents)} per household.`,
    `Confidence level is ${confidenceLabel(run.status, metrics.confidence).toLowerCase()} at this stage.`,
  ];

  if (run.max_households != null) {
    lines.push(`Capacity target is ${run.max_households} households, so availability may tighten.`);
  }

  return lines;
}

export default function CostLoweringPage() {
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [runs, setRuns] = useState<WCLERun[]>([]);
  const [loading, setLoading] = useState(true);
  const [postcode, setPostcode] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const scenarioQueryState = useMemo(
    () => parseScenarioInputQuery(searchParams),
    [searchParams],
  );
  const [scenarioInput, setScenarioInput] = useState<ScenarioInputModel>(
    () => createScenarioInputModel(scenarioQueryState),
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [telemetryWindowHours, setTelemetryWindowHours] = useState<WcleFunnelWindowHours>(168);
  const [funnelSummary, setFunnelSummary] = useState<WcleFunnelSummary>(() => (
    queryWcleFunnelSummary({ windowHours: 168 })
  ));

  const authHref = useMemo(() => buildAuthHref('/cost-lowering'), []);
  const refreshFunnelSummary = useCallback((windowHours: WcleFunnelWindowHours = telemetryWindowHours) => {
    setFunnelSummary(queryWcleFunnelSummary({ windowHours }));
  }, [telemetryWindowHours]);
  const captureFunnelEvent = useCallback((payload: WcleFunnelEventPayload) => {
    trackWcleFunnelEvent(payload);
    refreshFunnelSummary();
  }, [refreshFunnelSummary]);

  const loadRuns = useCallback(async (filters: { postcode?: string; supplierFilter?: string } = {}) => {
    setLoading(true);
    setNotice(null);
    try {
      const params: Record<string, string> = {};
      if (filters.postcode) params.postcode = filters.postcode;
      if (filters.supplierFilter) params.supplier_type = filters.supplierFilter;
      const res = await wcleApi.listRuns(params);
      setRuns(res.runs || []);
      captureFunnelEvent({
        eventName: 'wcle_action_result',
        status: 'success',
        toStage: 'options',
        message: 'runs_loaded',
        props: {
          result_count: (res.runs || []).length,
          has_postcode_filter: Boolean(filters.postcode),
          has_supplier_filter: Boolean(filters.supplierFilter),
        },
      });
      captureFunnelEvent({
        eventName: 'wcle_stage_transition',
        fromStage: 'discover',
        toStage: 'options',
        props: { result_count: (res.runs || []).length },
      });
    } catch (err) {
      console.error('Failed to load runs:', err);
      const actionable = toActionableSurfaceError({
        area: 'Cost optimization engine',
        rawMessage: err instanceof Error ? err.message : null,
        fallbackHref: '/docs',
        fallbackLabel: 'Open docs',
      });
      captureFunnelEvent({
        eventName: 'wcle_action_result',
        status: 'failure',
        toStage: 'options',
        reasonCode: 'runs_load_failed',
        message: err instanceof Error ? err.message : 'unknown error',
      });
      setNotice(`${actionable.headline}. ${actionable.detail}`);
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, [captureFunnelEvent]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    captureFunnelEvent({
      eventName: 'wcle_stage_transition',
      toStage: 'discover',
    });
    void loadRuns();
  }, [authLoading, captureFunnelEvent, loadRuns]);

  useEffect(() => {
    setScenarioInput(createScenarioInputModel(scenarioQueryState));
  }, [scenarioQueryState]);

  useEffect(() => {
    refreshFunnelSummary(telemetryWindowHours);
  }, [refreshFunnelSummary, telemetryWindowHours]);

  const scenarioPreferences = useMemo<ScenarioPreferences>(() => ({
    scope: scenarioInput.scope,
    objective: scenarioInput.objective,
    comparisonMode: scenarioInput.comparisonMode,
    maxCoordinationFeeCents: scenarioInput.maxCoordinationFeeCents,
    budgetCapCents: scenarioInput.budgetCapCents,
  }), [scenarioInput]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    captureFunnelEvent({
      eventName: 'wcle_stage_transition',
      fromStage: 'discover',
      toStage: 'configure',
      props: {
        scope: scenarioInput.scope,
        objective: scenarioInput.objective,
        comparison_mode: scenarioInput.comparisonMode,
        has_budget_cap: scenarioInput.budgetCapCents != null,
        has_fee_boundary: scenarioInput.maxCoordinationFeeCents != null,
      },
    });
  }, [
    authLoading,
    captureFunnelEvent,
    scenarioInput.budgetCapCents,
    scenarioInput.comparisonMode,
    scenarioInput.maxCoordinationFeeCents,
    scenarioInput.objective,
    scenarioInput.scope,
  ]);

  const scoredRuns = useMemo(() => filterAndRankRunsByScenario(runs, scenarioPreferences), [runs, scenarioPreferences]);

  useEffect(() => {
    if (loading || scoredRuns.length === 0) {
      return;
    }

    captureFunnelEvent({
      eventName: 'wcle_recommendation_rationale_view',
      toStage: 'compare',
      props: { visible_recommendations: scoredRuns.length },
    });
    captureFunnelEvent({
      eventName: 'wcle_tradeoff_summary_view',
      toStage: 'compare',
      props: { visible_recommendations: scoredRuns.length },
    });
    captureFunnelEvent({
      eventName: 'wcle_confidence_panel_view',
      toStage: 'compare',
      props: { visible_recommendations: scoredRuns.length },
    });
  }, [captureFunnelEvent, loading, scoredRuns.length]);

  function handleSearch() {
    captureFunnelEvent({
      eventName: 'wcle_stage_transition',
      fromStage: 'configure',
      toStage: 'compare',
      props: {
        has_postcode_filter: Boolean(postcode),
        supplier_filter: supplierFilter || 'all',
      },
    });
    void loadRuns({ postcode, supplierFilter });
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#665700]" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-7">
      <section className="card-civic">
        <p className="text-xs uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.65)]">Optimization Studio</p>
        <h1 className="text-3xl font-bold mt-2 mb-2 text-[var(--color-foreground)]" style={{ fontFamily: 'var(--font-serif)' }}>
          Cost-Lowering Engine
        </h1>
        <p className="text-sm text-[color:rgba(246,212,203,0.75)] max-w-3xl">
          Configure constraints, review scenario options, and commit to lower-cost outcomes. The core flow is reusable across groceries,
          household, energy, and future optimization packs.
        </p>

        <div className="mt-4 rounded-xl border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.04)] px-3 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.72)] mb-2">Journey stages</p>
          <div className="grid gap-2 sm:grid-cols-5">
            {stageRail.map((step, index) => (
              <div
                key={step}
                className={`rounded-lg border px-2 py-2 text-xs ${
                  index === 2
                    ? 'border-[#f6d4cb]/45 bg-[color:rgba(30,2,39,0.45)] text-[var(--color-foreground)]'
                    : 'border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.03)] text-[color:rgba(246,212,203,0.82)]'
                }`}
              >
                <p className="text-[10px] uppercase tracking-[0.16em] text-[color:rgba(246,212,203,0.62)]">Stage {index + 1}</p>
                <p className="mt-1 font-medium">{step}</p>
              </div>
            ))}
          </div>
        </div>

        {!isAuthenticated ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-[color:rgba(246,212,203,0.65)]">Preview mode active</span>
            <Link href={authHref} className="btn-pill btn-pill-primary text-xs">
              Sign in to commit scenarios
            </Link>
          </div>
        ) : null}
      </section>

      <section>
        <OnboardingWidget />
      </section>

      <section className="card-civic flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.65)] mb-1">Postcode</label>
          <input
            type="text"
            value={postcode}
            onChange={(event) => setPostcode(event.target.value)}
            placeholder="e.g. 2042"
            className="input-civic w-32"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.65)] mb-1">Supplier lane</label>
          <select
            value={supplierFilter}
            onChange={(event) => setSupplierFilter(event.target.value)}
            className="input-civic"
          >
            <option value="">All suppliers</option>
            <option value="FLEMINGTON">Flemington Markets</option>
            <option value="COSTCO">Costco</option>
            <option value="BUTCHER">Butcher</option>
            <option value="ALDI">Aldi</option>
            <option value="CUSTOM">Custom</option>
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.65)] mb-1">Optimization scope</label>
          <select
            value={scenarioInput.scope}
            onChange={(event) => {
              setScenarioInput((current) => createScenarioInputModel({
                ...current,
                scope: event.target.value as ScenarioInputModel['scope'],
              }));
            }}
            className="input-civic"
          >
            {scenarioScopeOptions.map((scope) => (
              <option key={scope.value} value={scope.value}>
                {scope.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.65)] mb-1">Objective</label>
          <select
            value={scenarioInput.objective}
            onChange={(event) => {
              setScenarioInput((current) => createScenarioInputModel({
                ...current,
                objective: event.target.value as ScenarioInputModel['objective'],
              }));
            }}
            className="input-civic"
          >
            {scenarioObjectiveOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.65)] mb-1">Comparison mode</label>
          <select
            value={scenarioInput.comparisonMode}
            onChange={(event) => {
              setScenarioInput((current) => createScenarioInputModel({
                ...current,
                comparisonMode: event.target.value as ScenarioInputModel['comparisonMode'],
              }));
            }}
            className="input-civic"
          >
            {scenarioComparisonModeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.65)] mb-1">Max coordination fee ($)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={formatCentsForDollarInput(scenarioInput.maxCoordinationFeeCents)}
            onChange={(event) => {
              setScenarioInput((current) => createScenarioInputModel({
                ...current,
                maxCoordinationFeeCents: parseDollarInputToCents(event.target.value),
              }));
            }}
            placeholder="Optional"
            className="input-civic w-36"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.65)] mb-1">Budget cap ($)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={formatCentsForDollarInput(scenarioInput.budgetCapCents)}
            onChange={(event) => {
              setScenarioInput((current) => createScenarioInputModel({
                ...current,
                budgetCapCents: parseDollarInputToCents(event.target.value),
              }));
            }}
            placeholder="Optional"
            className="input-civic w-36"
          />
        </div>

        <button onClick={handleSearch} className="btn-pill btn-pill-primary text-sm">
          Refresh options
        </button>
      </section>

      {notice ? <div className="card-civic text-sm text-[#e0b115]">{notice}</div> : null}

      <section className="card-civic space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.7)]">Baseline KPI dashboard</p>
            <p className="text-sm text-[color:rgba(246,212,203,0.78)]">
              Queryable trust/completion/reliability signals from local WCLE funnel telemetry.
            </p>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-xs text-[color:rgba(246,212,203,0.7)] mb-1">Window</label>
              <select
                value={telemetryWindowHours}
                onChange={(event) => {
                  setTelemetryWindowHours(Number(event.target.value) as WcleFunnelWindowHours);
                }}
                className="input-civic"
              >
                {wcleFunnelWindowHours.map((hours) => (
                  <option key={hours} value={hours}>
                    {funnelWindowLabels[hours]}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn-pill btn-pill-outline text-xs"
              onClick={() => refreshFunnelSummary(telemetryWindowHours)}
            >
              Query KPIs
            </button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-lg border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.03)] p-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.66)]">Discover views</p>
            <p className="text-lg font-semibold text-[var(--color-foreground)]">{funnelSummary.stageTransitions.discover}</p>
          </div>
          <div className="rounded-lg border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.03)] p-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.66)]">Inspect opens</p>
            <p className="text-lg font-semibold text-[var(--color-foreground)]">{funnelSummary.stageTransitions.inspect}</p>
          </div>
          <div className="rounded-lg border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.03)] p-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.66)]">Commit success</p>
            <p className="text-lg font-semibold text-[var(--color-foreground)]">{funnelSummary.commitSuccessRatePct}%</p>
          </div>
          <div className="rounded-lg border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.03)] p-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.66)]">Reliability</p>
            <p className="text-lg font-semibold text-[var(--color-foreground)]">{funnelSummary.reliabilityPct}%</p>
          </div>
          <div className="rounded-lg border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.03)] p-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.66)]">Trust signals</p>
            <p className="text-lg font-semibold text-[var(--color-foreground)]">{funnelSummary.trustInteractionCount}</p>
          </div>
          <div className="rounded-lg border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.03)] p-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.66)]">Inspect to commit</p>
            <p className="text-lg font-semibold text-[var(--color-foreground)]">{funnelSummary.inspectToCommitRatePct}%</p>
          </div>
        </div>
        <p className="text-xs text-[color:rgba(246,212,203,0.66)]">
          Window start: {new Date(funnelSummary.since).toLocaleString('en-AU')}
        </p>
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#665700]" />
        </div>
      ) : scoredRuns.length === 0 ? (
        <div className="card-civic text-center py-16 text-[color:rgba(246,212,203,0.7)]">
          <p className="text-lg mb-2">No scenarios found</p>
          <p className="text-sm">Adjust model constraints or supplier filters and try again.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {scoredRuns.map(({ run, metrics, score }, index) => {
            const savingsEst = metrics.estimatedSavingsCents;
            const scope = metrics.scope;
            const confidence = confidenceLabel(run.status, metrics.confidence);
            const whyThisOption = buildWhyThisOption(run, metrics, scenarioInput.objective);
            const tradeoffSummary = buildTradeoffSummary(run, metrics);
            const sensitivityNote = sensitivityPlaceholder(run);
            const scenarioQuery = buildScenarioInputQueryString(scenarioInput);
            const runHref = scenarioQuery ? `/runs/${run.id}?${scenarioQuery}` : `/runs/${run.id}`;

            return (
              <Link
                key={run.id}
                href={runHref}
                className="card-civic block hover:shadow-lg transition-shadow"
                onClick={() => {
                  captureFunnelEvent({
                    eventName: 'wcle_stage_transition',
                    fromStage: 'compare',
                    toStage: 'inspect',
                    runId: run.id,
                  });
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${supplierBadge(run.supplier_type)}`}>{run.supplier_type}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge(run.status)}`}>{run.status}</span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[color:rgba(246,212,203,0.11)] text-[color:rgba(246,212,203,0.9)] capitalize">
                        {scope}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-[var(--color-foreground)]">{run.title}</h3>
                    <p className="text-sm text-[color:rgba(246,212,203,0.7)] mt-1">
                      {run.location_name || run.address || 'Location TBD'} Â· {run.suburb || ''} {run.postcode || ''}
                    </p>
                    <p className="text-xs text-[color:rgba(246,212,203,0.6)] mt-1">
                      {new Date(run.run_date).toLocaleDateString('en-AU', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    {run.status === 'COMPLETED' && run.retail_equivalent_total_cents ? (
                      <>
                        <p className="text-xs text-[color:rgba(246,212,203,0.62)]">Observed savings</p>
                        <p className="text-lg font-bold text-[#665700]">
                          {scenarioInput.comparisonMode === 'absolute'
                            ? cents((run.retail_equivalent_total_cents || 0) - (run.bulk_actual_total_cents || 0))
                            : `${metrics.estimatedSavingsPct}%`}
                        </p>
                      </>
                    ) : savingsEst > 0 ? (
                      <>
                        <p className="text-xs text-[color:rgba(246,212,203,0.62)]">Estimated savings</p>
                        <p className="text-lg font-bold text-[#665700]">
                          {scenarioInput.comparisonMode === 'absolute' ? cents(savingsEst) : `${metrics.estimatedSavingsPct}%`}
                        </p>
                      </>
                    ) : null}
                    <p className="text-xs text-[color:rgba(246,212,203,0.6)] mt-1">Coordination: {cents(run.coordination_fee_per_household_cents)}/household</p>
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(30,2,39,0.26)] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[color:rgba(246,212,203,0.62)]">Trust signal</p>
                  <p className="mt-1 text-xs text-[color:rgba(246,212,203,0.86)]">
                    Rank #{index + 1} Â· Confidence: <span className="font-semibold">{confidence}</span> Â· Model score: {score.toFixed(1)} Â· Comparison mode:{' '}
                    <span className="font-semibold">{scenarioInput.comparisonMode}</span>
                  </p>
                </div>

                <div className="mt-3 grid gap-2 lg:grid-cols-3">
                  <div className="rounded-lg border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.03)] p-2.5">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.64)]">Why this option</p>
                    <ul className="mt-1 space-y-1 text-xs text-[color:rgba(246,212,203,0.86)]">
                      {whyThisOption.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.03)] p-2.5">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.64)]">Tradeoff summary</p>
                    <ul className="mt-1 space-y-1 text-xs text-[color:rgba(246,212,203,0.86)]">
                      {tradeoffSummary.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.03)] p-2.5">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.64)]">Confidence and sensitivity</p>
                    <p className="mt-1 text-xs text-[color:rgba(246,212,203,0.86)]">
                      Confidence is <span className="font-semibold">{confidence.toLowerCase()}</span> with current evidence quality.
                    </p>
                    <p className="mt-1 text-xs text-[color:rgba(246,212,203,0.78)]">{sensitivityNote}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

