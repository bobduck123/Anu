'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { wcleApi, WCLERun } from '@/lib/api/wcleApi';
import { ApiError } from '@/lib/api/client';
import { toActionableSurfaceError } from '@/lib/ui/actionableErrors';
import { buildAuthHref } from '@/lib/auth/returnTo';
import {
  buildScenarioInputQueryString,
  createScenarioInputModel,
  createScenarioInputModelFromMeta,
  formatCentsForDollarInput,
  parseDollarInputToCents,
  parseScenarioInputQuery,
  scenarioComparisonModeOptions,
  scenarioObjectiveOptions,
  type ScenarioInputModel,
} from '@/lib/wcle/scenarioConfig';
import { rankPacksByScenario } from '@/lib/wcle/scenarioModel';
import { trackWcleFunnelEvent, type WcleFunnelEventPayload } from '@/lib/wcle/funnelTelemetry';

function cents(v: number | null | undefined): string {
  if (v == null) return '$0.00';
  return `$${(v / 100).toFixed(2)}`;
}

function timeUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return 'Passed';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

const stageRail = ['Objective', 'Constraints', 'Options', 'Compare', 'Commit'] as const;

function runConfidence(status: WCLERun['status']): 'Observed' | 'Indicative' | 'Provisional' {
  if (status === 'COMPLETED') return 'Observed';
  if (status === 'OPEN' || status === 'CLOSED') return 'Indicative';
  return 'Provisional';
}

function packSensitivityPlaceholder(bulkTotalCents: number): string {
  if (bulkTotalCents <= 0) {
    return 'Sensitivity placeholder: waiting for richer pack-level pricing traces.';
  }
  const swing = Math.round(bulkTotalCents * 0.05);
  return `Sensitivity placeholder: +/-5% cost drift changes expected delta by about +/-${cents(swing)}.`;
}

function buildPackWhyThisOption(
  objective: ScenarioInputModel['objective'],
  savingsEstCents: number,
  savingsPct: number,
): string[] {
  const lines: string[] = [];

  if (objective === 'max_savings') {
    lines.push('Ranks highly for savings potential under your current controls.');
  } else if (objective === 'max_predictability') {
    lines.push('Rises for stability-oriented objective weighting.');
  } else {
    lines.push('Balances savings with execution predictability in this lane.');
  }

  if (savingsEstCents > 0) {
    lines.push(`Model estimates ${cents(savingsEstCents)} (${savingsPct}%) better than retail baseline.`);
  } else {
    lines.push('Value is coordination-first; direct savings signal is currently modest.');
  }

  return lines;
}

function buildPackTradeoffSummary(pack: { adjustable_quantities: boolean; waste_buffer_bps: number }): string[] {
  return [
    `Waste buffer is ${(pack.waste_buffer_bps / 100).toFixed(1)}%.`,
    pack.adjustable_quantities ? 'Quantities are adjustable at execution time.' : 'Quantities are fixed once committed.',
  ];
}

export default function RunDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const runId = Number(params.id);
  const scenarioQueryState = useMemo(() => parseScenarioInputQuery(searchParams), [searchParams]);

  const [run, setRun] = useState<WCLERun | null>(null);
  const [loading, setLoading] = useState(true);
  const [pledging, setPledging] = useState(false);
  const [selectedPackId, setSelectedPackId] = useState<number | null>(null);
  const [scenarioInput, setScenarioInput] = useState<ScenarioInputModel>(() => createScenarioInputModel(scenarioQueryState));
  const [error, setError] = useState('');

  const authHref = useMemo(() => buildAuthHref(`/runs/${runId}`), [runId]);
  const captureFunnelEvent = useMemo(
    () => (payload: WcleFunnelEventPayload) => {
      trackWcleFunnelEvent(payload);
    },
    [],
  );

  useEffect(() => {
    if (!runId || authLoading) {
      return;
    }

    setLoading(true);
    setError('');

    wcleApi
      .getRun(runId)
      .then((loadedRun) => {
        setRun(loadedRun);
        captureFunnelEvent({
          eventName: 'wcle_action_result',
          status: 'success',
          toStage: 'inspect',
          runId: loadedRun.id,
          message: 'run_loaded',
        });
        captureFunnelEvent({
          eventName: 'wcle_stage_transition',
          toStage: 'inspect',
          runId: loadedRun.id,
        });
      })
      .catch((e) => {
        const apiError = e instanceof ApiError ? e : null;
        captureFunnelEvent({
          eventName: 'wcle_action_result',
          status: 'failure',
          toStage: 'inspect',
          runId,
          reasonCode: apiError?.code ?? 'run_load_failed',
          message: e instanceof Error ? e.message : 'unknown error',
        });
        const actionable = toActionableSurfaceError({
          area: 'Cost optimization scenario detail',
          rawCode: apiError?.code ?? null,
          rawDetails: apiError?.details ?? null,
          rawMessage: e instanceof Error ? e.message : null,
          fallbackHref: '/cost-lowering',
          fallbackLabel: 'Back to scenario list',
        });
        setError(`${actionable.headline}. ${actionable.detail}`);
      })
      .finally(() => setLoading(false));
  }, [authLoading, captureFunnelEvent, runId]);

  useEffect(() => {
    setScenarioInput(createScenarioInputModel(scenarioQueryState));
  }, [scenarioQueryState, runId]);

  useEffect(() => {
    if (!run) {
      return;
    }

    setScenarioInput(
      createScenarioInputModelFromMeta(run.scenario_meta, scenarioQueryState),
    );
  }, [run?.id, run?.scenario_meta, scenarioQueryState]);

  useEffect(() => {
    if (!run) {
      return;
    }

    captureFunnelEvent({
      eventName: 'wcle_stage_transition',
      fromStage: 'inspect',
      toStage: 'configure',
      runId: run.id,
      props: {
        objective: scenarioInput.objective,
        comparison_mode: scenarioInput.comparisonMode,
        has_budget_cap: scenarioInput.budgetCapCents != null,
        has_fee_boundary: scenarioInput.maxCoordinationFeeCents != null,
      },
    });
  }, [
    captureFunnelEvent,
    run?.id,
    scenarioInput.budgetCapCents,
    scenarioInput.comparisonMode,
    scenarioInput.maxCoordinationFeeCents,
    scenarioInput.objective,
  ]);

  useEffect(() => {
    if (!run) {
      return;
    }

    const visibleCount = rankPacksByScenario(run.packs || [], {
      objective: scenarioInput.objective,
      comparisonMode: scenarioInput.comparisonMode,
      budgetCapCents: scenarioInput.budgetCapCents,
    }).length;
    if (visibleCount < 1) {
      return;
    }

    captureFunnelEvent({
      eventName: 'wcle_recommendation_rationale_view',
      toStage: 'compare',
      runId: run.id,
      props: { visible_options: visibleCount },
    });
    captureFunnelEvent({
      eventName: 'wcle_tradeoff_summary_view',
      toStage: 'compare',
      runId: run.id,
      props: { visible_options: visibleCount },
    });
    captureFunnelEvent({
      eventName: 'wcle_confidence_panel_view',
      toStage: 'compare',
      runId: run.id,
      props: { visible_options: visibleCount },
    });
  }, [
    captureFunnelEvent,
    run?.id,
    run?.packs,
    scenarioInput.budgetCapCents,
    scenarioInput.comparisonMode,
    scenarioInput.objective,
  ]);

  async function handlePledge() {
    if (!isAuthenticated) {
      captureFunnelEvent({
        eventName: 'wcle_action_result',
        status: 'failure',
        toStage: 'commit',
        runId: runId || null,
        reasonCode: 'auth_required',
        message: 'authentication required before commit',
      });
      router.push(authHref);
      return;
    }

    if (!run) {
      captureFunnelEvent({
        eventName: 'wcle_action_result',
        status: 'failure',
        toStage: 'commit',
        runId: runId || null,
        reasonCode: 'run_unavailable',
      });
      setError('Scenario is unavailable. Reload and try again.');
      return;
    }

    if (
      scenarioInput.maxCoordinationFeeCents != null
      && run.coordination_fee_per_household_cents > scenarioInput.maxCoordinationFeeCents
    ) {
      captureFunnelEvent({
        eventName: 'wcle_action_result',
        status: 'failure',
        toStage: 'commit',
        runId: run.id,
        reasonCode: 'coordination_fee_boundary_violation',
      });
      setError('Current run coordination fee is above your configured boundary.');
      return;
    }

    const currentVisiblePackIds = new Set(rankPacksByScenario(run.packs || [], {
      objective: scenarioInput.objective,
      comparisonMode: scenarioInput.comparisonMode,
      budgetCapCents: scenarioInput.budgetCapCents,
    }).map(({ pack }) => pack.id));

    if (!selectedPackId) {
      captureFunnelEvent({
        eventName: 'wcle_action_result',
        status: 'failure',
        toStage: 'commit',
        runId: run.id,
        reasonCode: 'pack_not_selected',
      });
      setError('Select an option before committing.');
      return;
    }

    if (!currentVisiblePackIds.has(selectedPackId)) {
      captureFunnelEvent({
        eventName: 'wcle_action_result',
        status: 'failure',
        toStage: 'commit',
        runId: run.id,
        reasonCode: 'selected_pack_not_visible',
      });
      setError('Selected option no longer satisfies your current controls.');
      return;
    }

    setPledging(true);
    setError('');
    captureFunnelEvent({
      eventName: 'wcle_stage_transition',
      fromStage: 'compare',
      toStage: 'commit',
      runId: run.id,
      props: { selected_pack_id: selectedPackId },
    });
    captureFunnelEvent({
      eventName: 'wcle_commit_attempt',
      toStage: 'commit',
      runId: run.id,
      props: { selected_pack_id: selectedPackId },
    });
    try {
      const pledge = await wcleApi.createPledge(runId, { pack_id: selectedPackId });
      await wcleApi.confirmPledge(pledge.id);
      captureFunnelEvent({
        eventName: 'wcle_commit_result',
        status: 'success',
        toStage: 'post_commit',
        runId: run.id,
        props: { pledge_id: pledge.id },
      });
      captureFunnelEvent({
        eventName: 'wcle_stage_transition',
        fromStage: 'commit',
        toStage: 'post_commit',
        runId: run.id,
      });
      router.push('/pledges');
    } catch (e: unknown) {
      const apiError = e instanceof ApiError ? e : null;
      captureFunnelEvent({
        eventName: 'wcle_commit_result',
        status: 'failure',
        toStage: 'commit',
        runId: run.id,
        reasonCode: apiError?.code ?? 'commit_failed',
        message: e instanceof Error ? e.message : 'unknown error',
      });
      captureFunnelEvent({
        eventName: 'wcle_action_result',
        status: 'failure',
        toStage: 'commit',
        runId: run.id,
        reasonCode: apiError?.code ?? 'commit_failed',
        message: e instanceof Error ? e.message : 'unknown error',
      });
      const actionable = toActionableSurfaceError({
        area: 'Scenario commitment',
        rawCode: apiError?.code ?? null,
        rawDetails: apiError?.details ?? null,
        rawMessage: e instanceof Error ? e.message : null,
        fallbackHref: '/cost-lowering',
        fallbackLabel: 'Return to scenarios',
      });
      setError(`${actionable.headline}. ${actionable.detail}`);
    } finally {
      setPledging(false);
    }
  }

  const scenarioQuery = buildScenarioInputQueryString(scenarioInput);
  const backHref = scenarioQuery ? `/cost-lowering?${scenarioQuery}` : '/cost-lowering';

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#665700]" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <div className="card-civic text-sm text-[#7c413c]">{error || 'Scenario not found'}</div>
        <Link href={backHref} className="text-sm text-[color:rgba(246,212,203,0.8)] underline mt-4 inline-block">
          Back to scenarios
        </Link>
      </div>
    );
  }

  const packs = run.packs || [];
  const isOpen = run.status === 'OPEN';
  const withinCoordinationFeeConstraint = (
    scenarioInput.maxCoordinationFeeCents == null
    || run.coordination_fee_per_household_cents <= scenarioInput.maxCoordinationFeeCents
  );
  const visiblePacks = withinCoordinationFeeConstraint
    ? rankPacksByScenario(packs, {
      objective: scenarioInput.objective,
      comparisonMode: scenarioInput.comparisonMode,
      budgetCapCents: scenarioInput.budgetCapCents,
    })
    : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">
      <Link href={backHref} className="text-sm text-[color:rgba(246,212,203,0.8)] hover:text-[var(--color-foreground)] inline-block">
        &larr; Back to scenarios
      </Link>

      {!isAuthenticated ? (
        <div className="card-civic flex flex-wrap items-center justify-between gap-2 text-sm text-[color:rgba(246,212,203,0.75)]">
          <span>Preview mode active. Sign in to commit and track scenario outcomes.</span>
          <Link href={authHref} className="btn-pill btn-pill-primary text-xs">
            Sign in to commit
          </Link>
        </div>
      ) : null}

      <div className="card-civic">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[color:rgba(102,87,0,0.2)] text-[#f6d4cb]">{run.supplier_type}</span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              run.status === 'OPEN'
                ? 'bg-[color:rgba(102,87,0,0.2)] text-[#f6d4cb]'
                : run.status === 'COMPLETED'
                  ? 'bg-[color:rgba(102,87,0,0.2)] text-[#665700]'
                  : 'bg-[color:rgba(246,212,203,0.15)] text-[color:rgba(246,212,203,0.8)]'
            }`}
          >
            {run.status}
          </span>
        </div>

        <h1 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">{run.title}</h1>
        <p className="text-[color:rgba(246,212,203,0.7)]">{run.location_name || run.address || 'Location TBD'}</p>
        <p className="text-sm text-[color:rgba(246,212,203,0.6)] mt-1">
          {run.suburb} {run.postcode}
          {run.organizer_username && ` — Coordinated by ${run.organizer_username}`}
        </p>

        <div className="mt-4 rounded-xl border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.03)] p-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.7)] mb-2">Decision progression</p>
          <div className="grid gap-2 sm:grid-cols-5">
            {stageRail.map((stage, index) => {
              const active = index === 3;
              return (
                <div
                  key={stage}
                  className={`rounded-lg border px-2 py-2 text-xs ${
                    active
                      ? 'border-[#f6d4cb]/45 bg-[color:rgba(30,2,39,0.45)] text-[var(--color-foreground)]'
                      : 'border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.03)] text-[color:rgba(246,212,203,0.82)]'
                  }`}
                >
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.62)]">{index + 1}</p>
                  <p className="mt-1 font-medium">{stage}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div>
            <p className="text-xs text-[color:rgba(246,212,203,0.55)] uppercase tracking-wide">Run date</p>
            <p className="font-semibold text-[var(--color-foreground)]">
              {new Date(run.run_date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
            </p>
          </div>
          <div>
            <p className="text-xs text-[color:rgba(246,212,203,0.55)] uppercase tracking-wide">Commit window</p>
            <p className="font-semibold text-[var(--color-foreground)]">{timeUntil(run.pledge_deadline)}</p>
          </div>
          <div>
            <p className="text-xs text-[color:rgba(246,212,203,0.55)] uppercase tracking-wide">Pickup</p>
            <p className="font-semibold text-[var(--color-foreground)]">
              {run.pickup_window_start
                ? new Date(run.pickup_window_start).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
                : 'TBD'}
              {run.pickup_window_end && <>&ndash; {new Date(run.pickup_window_end).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</>}
            </p>
          </div>
          <div>
            <p className="text-xs text-[color:rgba(246,212,203,0.55)] uppercase tracking-wide">Active households</p>
            <p className="font-semibold text-[var(--color-foreground)]">
              {run.pledge_count ?? 0}
              {run.max_households ? ` / ${run.max_households}` : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.04)] p-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.7)]">Trust signal</p>
        <p className="mt-1 text-sm text-[color:rgba(246,212,203,0.84)]">
          Option values are shown as <span className="font-semibold">retail baseline vs. bulk estimate</span>. Final savings are confirmed only after completion.
        </p>
      </div>

      <div className="rounded-xl border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.04)] p-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.7)]">Model controls</p>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-[color:rgba(246,212,203,0.7)] mb-1">Objective</label>
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
            <label className="block text-xs text-[color:rgba(246,212,203,0.7)] mb-1">Comparison mode</label>
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
            <label className="block text-xs text-[color:rgba(246,212,203,0.7)] mb-1">Max coordination fee ($)</label>
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
              className="input-civic w-36"
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="block text-xs text-[color:rgba(246,212,203,0.7)] mb-1">Budget cap ($)</label>
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
              className="input-civic w-36"
              placeholder="Optional"
            />
          </div>
        </div>
        {!withinCoordinationFeeConstraint ? (
          <p className="mt-2 text-xs text-[#e0b115]">
            Current run coordination fee ({cents(run.coordination_fee_per_household_cents)}) is above your configured boundary.
          </p>
        ) : null}
      </div>

      <h2 className="text-xl font-bold text-[var(--color-foreground)]">Scenario options</h2>
      {visiblePacks.length === 0 ? (
        <p className="text-[color:rgba(246,212,203,0.7)]">No options available under current constraints. Relax budget or fee boundaries to continue.</p>
      ) : (
        <div className="grid gap-4">
          {visiblePacks.map(({ pack, comparison }, rank) => {
            const retailTotal = pack.retail_estimate_cents || 0;
            const bulkTotal = pack.bulk_estimate_cents || 0;
            const savingsEst = comparison.absoluteSavingsCents;
            const savingsPct = comparison.savingsPct;
            const isSelected = selectedPackId === pack.id;
            const whyThisOption = buildPackWhyThisOption(scenarioInput.objective, savingsEst, savingsPct);
            const tradeoffSummary = buildPackTradeoffSummary(pack);
            const confidence = runConfidence(run.status);
            const sensitivityNote = packSensitivityPlaceholder(bulkTotal);

            return (
              <div
                key={pack.id}
                onClick={() => {
                  if (!isOpen) {
                    return;
                  }

                  setSelectedPackId(pack.id);
                  captureFunnelEvent({
                    eventName: 'wcle_stage_transition',
                    fromStage: 'options',
                    toStage: 'compare',
                    runId: run.id,
                    props: { selected_pack_id: pack.id },
                  });
                }}
                className={`card-civic transition-all ${isOpen ? 'cursor-pointer hover:shadow-md' : ''} ${
                  isSelected ? 'ring-2 ring-emerald-200/70' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[color:rgba(246,212,203,0.6)]">Rank #{rank + 1}</p>
                    <h3 className="text-lg font-semibold text-[var(--color-foreground)]">{pack.name}</h3>
                    {pack.description && <p className="text-sm text-[color:rgba(246,212,203,0.7)] mt-1">{pack.description}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-[color:rgba(246,212,203,0.55)] line-through">{cents(retailTotal)} retail</p>
                    <p className="text-lg font-bold text-[#665700]">{cents(bulkTotal)}</p>
                    {scenarioInput.comparisonMode === 'absolute' ? (
                      <p className="text-xs text-[#665700] font-medium">Save {cents(savingsEst)}</p>
                    ) : (
                      <p className="text-xs text-[#665700] font-medium">Save {savingsPct}%</p>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-lg border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.02)] px-2.5 py-2">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.62)]">Retail baseline</p>
                    <p className="text-sm font-semibold text-[var(--color-foreground)]">{cents(retailTotal)}</p>
                  </div>
                  <div className="rounded-lg border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.02)] px-2.5 py-2">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.62)]">Scenario cost</p>
                    <p className="text-sm font-semibold text-[var(--color-foreground)]">{cents(bulkTotal)}</p>
                  </div>
                  <div className="rounded-lg border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.02)] px-2.5 py-2">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.62)]">
                      {scenarioInput.comparisonMode === 'absolute' ? 'Estimated delta' : 'Estimated delta %'}
                    </p>
                    <p className="text-sm font-semibold text-[#665700]">
                      {scenarioInput.comparisonMode === 'absolute' ? cents(savingsEst) : `${savingsPct}%`}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 lg:grid-cols-3">
                  <div className="rounded-lg border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.02)] px-2.5 py-2">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.62)]">Why this option</p>
                    <ul className="mt-1 space-y-1 text-xs text-[color:rgba(246,212,203,0.86)]">
                      {whyThisOption.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.02)] px-2.5 py-2">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.62)]">Tradeoff summary</p>
                    <ul className="mt-1 space-y-1 text-xs text-[color:rgba(246,212,203,0.86)]">
                      {tradeoffSummary.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.02)] px-2.5 py-2">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.62)]">Confidence and sensitivity</p>
                    <p className="mt-1 text-xs text-[color:rgba(246,212,203,0.86)]">
                      Confidence is <span className="font-semibold">{confidence.toLowerCase()}</span> for the current run status.
                    </p>
                    <p className="mt-1 text-xs text-[color:rgba(246,212,203,0.78)]">{sensitivityNote}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {(pack.items || []).slice(0, 8).map((item, index) => (
                    <span key={`${item.name}-${index}`} className="text-xs bg-[color:rgba(246,212,203,0.1)] text-[color:rgba(246,212,203,0.75)] px-2 py-0.5 rounded-full">
                      {item.name} ({item.qty} {item.unit})
                    </span>
                  ))}
                  {(pack.items || []).length > 8 && <span className="text-xs text-[color:rgba(246,212,203,0.6)]">+{(pack.items || []).length - 8} more</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isOpen ? (
        <div className="card-civic">
          {error && <div className="bg-[color:rgba(124,65,60,0.15)] text-[#7c413c] text-sm rounded-lg px-4 py-2 mb-4">{error}</div>}
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-[var(--color-foreground)]">Commit selected option</p>
              <p className="text-sm text-[color:rgba(246,212,203,0.7)]">
                Choose an option above, then commit. Coordination fee: {cents(run.coordination_fee_per_household_cents)} per household.
              </p>
            </div>
            <button
              onClick={handlePledge}
              disabled={pledging || !selectedPackId || !withinCoordinationFeeConstraint}
              className="btn-pill btn-pill-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAuthenticated ? (pledging ? 'Committing...' : 'Commit option') : 'Sign in to commit'}
            </button>
          </div>
        </div>
      ) : null}

      {run.status === 'COMPLETED' ? (
        <div className="card-civic">
          <h3 className="font-semibold text-[#f6d4cb] mb-3">Completed outcome</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-[color:rgba(246,212,203,0.6)] uppercase tracking-wide">Retail value</p>
              <p className="text-lg font-bold text-[var(--color-foreground)]">{cents(run.retail_equivalent_total_cents)}</p>
            </div>
            <div>
              <p className="text-xs text-[color:rgba(246,212,203,0.6)] uppercase tracking-wide">Scenario cost</p>
              <p className="text-lg font-bold text-[var(--color-foreground)]">{cents(run.bulk_actual_total_cents)}</p>
            </div>
            <div>
              <p className="text-xs text-[color:rgba(246,212,203,0.6)] uppercase tracking-wide">Observed savings</p>
              <p className="text-lg font-bold text-[#665700]">
                {cents((run.retail_equivalent_total_cents || 0) - (run.bulk_actual_total_cents || 0))}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
