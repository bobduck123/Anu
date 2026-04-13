'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { AlertCircle, Compass, Layers3, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { getCoreApiBase } from '@/lib/runtime';
import { getParticipantAuthHeaders } from '@/lib/api/client';
import { AnuActionLink } from '@/ui-system/anu/surfacePrimitives';
import { LabyrinthArchiveShell } from '@/ui-system/realms/labyrinth/LabyrinthArchiveShell';
import { ArchiveMarker } from '@/ui-system/realms/labyrinth/ArchiveMarker';
import { ManuscriptOverlay } from '@/ui-system/realms/labyrinth/ManuscriptOverlay';
import { StateSeal } from '@/ui-system/realms/labyrinth/StateSeal';
import { EmbeddedInstrumentPanel } from '@/ui-system/realms/labyrinth/EmbeddedInstrumentPanel';
import {
  layoutRegistryArchive,
  presentRegistryModel,
  type LabyrinthState,
  type ModelRegistryItem,
} from './modelRegistryPresentation';

const API_BASE = getCoreApiBase();

const STATE_FILTERS: Array<{ key: 'all' | LabyrinthState; label: string }> = [
  { key: 'all', label: 'All states' },
  { key: 'active', label: 'Active' },
  { key: 'contested', label: 'Contested' },
  { key: 'experimental', label: 'Experimental' },
  { key: 'dormant', label: 'Dormant' },
  { key: 'deprecated', label: 'Deprecated' },
];

const ARCHIVE_COLUMNS = 4;

const getAuthHeaders = async (): Promise<Record<string, string>> =>
  getParticipantAuthHeaders({ allowLegacyTokenFallback: false });

const FALLBACK_MODELS: ModelRegistryItem[] = [
  {
    key: 'commons_resilience_anchor',
    version: 3,
    description:
      'Fallback resilience anchor model used to keep governance reading available while live registry sync is unavailable.',
    required_inputs: ['liquidity_index', 'relief_backlog', 'network_stability'],
    output_units: 'resilience score',
    confidence_method: 'calibrated_interval',
    uncertainty_format: 'bands',
    fallback_mode: 'watch_mode',
    complexity_bound: 'bounded_non_linear',
    update_policy: 'weekly review',
    requires_backtest: true,
    requires_calibration: true,
    cooling_period_days: 7,
    param_schema: {
      sensitivity: { type: 'number', min: 0, max: 1 },
      stress_window_days: { type: 'integer', min: 1, max: 30 },
    },
  },
  {
    key: 'governance_friction_monitor',
    version: 2,
    description:
      'Tracks pressure transfer between governance nodes to keep route-level coordination legible during service degradation.',
    required_inputs: ['collision_events', 'decision_latency_hours'],
    output_units: 'friction index',
    confidence_method: 'percentile envelope',
    uncertainty_format: 'range',
    fallback_mode: 'manual_review_lane',
    complexity_bound: 'piecewise_linear',
    update_policy: 'biweekly review',
    requires_backtest: false,
    requires_calibration: true,
    cooling_period_days: 14,
    param_schema: {
      escalation_weight: { type: 'number', min: 0, max: 5 },
      civic_load_factor: { type: 'number', min: 0, max: 5 },
    },
  },
  {
    key: 'stewardship_capacity_projection',
    version: 4,
    description:
      'Projects short-term stewardship capacity and reserve pressure so fallback operations can remain transparent.',
    required_inputs: ['member_activity_rate', 'reserve_ratio', 'intake_delta'],
    output_units: 'capacity ratio',
    confidence_method: 'rolling confidence band',
    uncertainty_format: 'confidence range',
    fallback_mode: 'capacity_hold',
    complexity_bound: 'bounded_growth_curve',
    update_policy: 'daily review',
    requires_backtest: true,
    requires_calibration: false,
    cooling_period_days: 3,
    param_schema: {
      reserve_buffer_floor: { type: 'number', min: 0, max: 1 },
      relief_priority_weight: { type: 'number', min: 0, max: 10 },
    },
  },
];

function countByState(models: ReturnType<typeof presentRegistryModel>[]) {
  return models.reduce<Record<LabyrinthState, number>>(
    (counts, model) => {
      counts[model.state] += 1;
      return counts;
    },
    {
      active: 0,
      contested: 0,
      deprecated: 0,
      dormant: 0,
      experimental: 0,
    },
  );
}

function distinctShapeCount(models: ReturnType<typeof presentRegistryModel>[]) {
  return new Set(models.map((model) => model.shapeLabel)).size;
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable;
}

function archiveColumnsForCount(count: number) {
  return Math.max(1, Math.min(ARCHIVE_COLUMNS, count >= ARCHIVE_COLUMNS ? ARCHIVE_COLUMNS : count));
}

export default function ModelRegistryPage() {
  const manuscriptDialogId = 'model-registry-manuscript';
  const [models, setModels] = useState<ModelRegistryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [degradedMode, setDegradedMode] = useState(false);
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<'all' | LabyrinthState>('all');
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);

  const loadModels = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    setNotice(null);
    setDegradedMode(false);

    try {
      const response = await fetch(`${API_BASE}/api/model-registry/`, {
        headers: await getAuthHeaders(),
        signal,
      });

      let data: { data?: { models?: ModelRegistryItem[] }; error?: { message?: string } } | null = null;
      try {
        data = (await response.json()) as { data?: { models?: ModelRegistryItem[] }; error?: { message?: string } };
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(data?.error?.message ?? 'Failed to load model registry');
      }

      const liveModels = data?.data?.models ?? [];
      if (liveModels.length < 1) {
        setModels(FALLBACK_MODELS);
        setDegradedMode(true);
        setNotice('No live registry entries are published yet. Running fallback archive models for continuity.');
        return;
      }

      setModels(liveModels);
    } catch (loadError) {
      if (loadError instanceof Error && loadError.name === 'AbortError') {
        return;
      }

      setError('Live model registry sync is unavailable in this environment.');
      setNotice(
        'Working now: archive walkthrough and manuscript previews remain available with fallback models while registry sync recovers.',
      );
      setDegradedMode(true);
      setModels(FALLBACK_MODELS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadModels(controller.signal);
    return () => controller.abort();
  }, [loadModels]);

  const presentedModels = useMemo(() => models.map((model) => presentRegistryModel(model)), [models]);
  const archiveCounts = useMemo(() => countByState(presentedModels), [presentedModels]);

  const filteredModels = useMemo(() => {
    const search = query.trim().toLowerCase();

    return presentedModels.filter((model) => {
      if (stateFilter !== 'all' && model.state !== stateFilter) {
        return false;
      }

      if (!search) {
        return true;
      }

      const haystack = [
        model.title,
        model.purpose,
        model.shapeLabel,
        model.shapeDetail,
        model.state,
        model.outputUnitsLabel,
        model.dependencySummary,
        model.historySummary,
        model.source.key,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [presentedModels, query, stateFilter]);

  const archiveMarkers = useMemo(() => layoutRegistryArchive(filteredModels), [filteredModels]);
  const archiveColumns = useMemo(() => archiveColumnsForCount(archiveMarkers.length), [archiveMarkers.length]);

  const selectedModel = useMemo(
    () => presentedModels.find((model) => model.id === selectedModelId) ?? null,
    [presentedModels, selectedModelId],
  );

  const activeMarker = useMemo(
    () => archiveMarkers.find((model) => model.id === activeMarkerId) ?? archiveMarkers[0] ?? null,
    [activeMarkerId, archiveMarkers],
  );

  useEffect(() => {
    if (archiveMarkers.length < 1) {
      setActiveMarkerId(null);
      setSelectedModelId(null);
      return;
    }

    const activeStillVisible = archiveMarkers.some((model) => model.id === activeMarkerId);
    if (!activeStillVisible) {
      setActiveMarkerId(archiveMarkers[0].id);
    }

    if (selectedModelId && !archiveMarkers.some((model) => model.id === selectedModelId)) {
      setSelectedModelId(null);
    }
  }, [archiveMarkers, activeMarkerId, selectedModelId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (selectedModelId) {
        if (event.key === 'Escape') {
          setSelectedModelId(null);
        }
        return;
      }

      if (!entered) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setEntered(true);
        }
        return;
      }

      if (isTypingTarget(event.target)) {
        return;
      }

      const currentIndex = archiveMarkers.findIndex((model) => model.id === activeMarker?.id);
      if (currentIndex < 0 && archiveMarkers.length > 0) {
        setActiveMarkerId(archiveMarkers[0].id);
        return;
      }

      const setIndex = (nextIndex: number) => {
        const bounded = Math.max(0, Math.min(archiveMarkers.length - 1, nextIndex));
        setActiveMarkerId(archiveMarkers[bounded]?.id ?? null);
      };

      switch (event.key) {
        case 'ArrowRight':
        case 'd':
        case 'D':
          event.preventDefault();
          setIndex(currentIndex + 1);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          event.preventDefault();
          setIndex(currentIndex - 1);
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          event.preventDefault();
          setIndex(currentIndex - archiveColumns);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          event.preventDefault();
          setIndex(currentIndex + archiveColumns);
          break;
        case 'Enter':
        case ' ':
          if (activeMarker?.id) {
            event.preventDefault();
            setSelectedModelId(activeMarker.id);
          }
          break;
        case 'Escape':
          event.preventDefault();
          setEntered(false);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeMarker, archiveColumns, archiveMarkers, entered, selectedModelId]);

  const legend = (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[#f6d4cb]/72">Archive states</p>
      <div className="flex flex-wrap gap-2">
        <StateSeal state="active" />
        <StateSeal state="contested" />
        <StateSeal state="experimental" />
        <StateSeal state="dormant" />
        <StateSeal state="deprecated" />
      </div>
      <p className="text-sm leading-6 text-[#f6d4cb]/76">
        Markers surface institutional state before entry so the archive behaves like terrain, not a flat list.
      </p>
    </div>
  );

  const stats = (
    <>
      <EmbeddedInstrumentPanel
        label="Archive count"
        value={`${presentedModels.length} models`}
        detail={
          degradedMode
            ? 'Fallback archive set loaded while live registry sync is unavailable.'
            : 'All versioned institutional models returned by the live registry endpoint.'
        }
      />
      <EmbeddedInstrumentPanel
        label="Live states"
        value={`${archiveCounts.active} active`}
        detail={`${archiveCounts.experimental} experimental / ${archiveCounts.contested} contested`}
      />
      <EmbeddedInstrumentPanel
        label="Shape families"
        value={`${distinctShapeCount(presentedModels)} forms`}
        detail="Distinct simulation shapes derived from the registry payload."
      />
    </>
  );

  const movementHint = (
    <div className="anu-labyrinth-controls-strip">
      <span>W A S D / Arrows</span>
      <span>Traverse archive</span>
      <span>Enter</span>
      <span>Open chamber</span>
      <span>Esc</span>
      <span>Pause archive</span>
    </div>
  );

  return (
    <div className="min-h-screen px-4 pb-20 pt-20 md:px-8">
      <div className="mx-auto max-w-[110rem]">
        <LabyrinthArchiveShell
          eyebrow="Labyrinth proof / model registry"
          title="Arrive in the archive before you read the manuscript."
          description="The model registry should feel like entering a dark institutional vault. Traverse the archive first, let state and form surface in space, then open a manuscript chamber without leaving the archive."
          legend={legend}
          stats={stats}
          entered={entered}
          onEnter={() => setEntered(true)}
          movementHint={movementHint}
          controls={
            <div className="anu-labyrinth-console">
              <label className="anu-labyrinth-console__search">
                <Search className="h-4 w-4 text-[#f6d4cb]/72" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search model key, purpose, shape, or discipline"
                  aria-label="Search model registry"
                  className="anu-labyrinth-console__input"
                />
              </label>

              <button
                type="button"
                onClick={() => void loadModels()}
                disabled={loading}
                className="anu-labyrinth-console__refresh"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Syncing archive' : 'Refresh archive'}</span>
              </button>

              <div className="anu-labyrinth-console__filters">
                {STATE_FILTERS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={`anu-labyrinth-console__filter ${stateFilter === option.key ? 'anu-labyrinth-console__filter-active' : ''}`}
                    onClick={() => setStateFilter(option.key)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <p className="text-xs leading-6 text-[#f6d4cb]/72">
                Search and filters belong to the archive console, not the main scene. Movement and state reading stay spatial first.
              </p>
            </div>
          }
        >
          {error || notice ? (
            <div className="mb-4 rounded-2xl border border-[color:rgba(224,177,21,0.28)] bg-[color:rgba(224,177,21,0.1)] p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 text-[var(--color-foreground)]" />
                <div className="min-w-0">
                  {error ? <p className="text-sm text-[var(--color-foreground)]">{error}</p> : null}
                  {notice ? <p className="text-sm leading-6 text-[color:rgba(246,212,203,0.86)]">{notice}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <AnuActionLink href="/governance" tone="secondary" iconLeft={Layers3}>
                      Return to governance index
                    </AnuActionLink>
                    <AnuActionLink href="/transparency" tone="ghost" iconLeft={ShieldCheck}>
                      Cross-check public truth
                    </AnuActionLink>
                    <AnuActionLink href="/docs" tone="ghost" iconLeft={Compass}>
                      Open doctrine
                    </AnuActionLink>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="anu-labyrinth-stage" aria-live="polite">
            <div className="anu-labyrinth-stage__floor" aria-hidden="true" />
            <div className="anu-labyrinth-stage__haze" aria-hidden="true" />

            {loading ? (
              Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={`archive-skeleton-${index}`}
                  className="anu-labyrinth-skeleton"
                  style={
                    {
                      '--anu-archive-lane': (index % 4) * 1.35 - 2,
                      '--anu-archive-depth': Math.floor(index / 4),
                      '--anu-archive-height': `${8.6 + (index % 3) * 1.2}rem`,
                    } as CSSProperties
                  }
                />
              ))
            ) : archiveMarkers.length > 0 ? (
              <>
                {archiveMarkers.map((model) => (
                  <ArchiveMarker
                    key={model.id}
                    title={model.title}
                    eyebrow={model.source.key}
                    summary={model.purpose}
                    shapeLabel={model.shapeLabel}
                    versionLabel={model.versionLabel}
                    state={model.state}
                    stateReason={model.stateReason}
                    lane={model.lane}
                    depth={model.depth}
                    towerHeight={model.towerHeight}
                    active={activeMarker?.id === model.id || selectedModelId === model.id}
                    dialogId={manuscriptDialogId}
                    onHover={() => setActiveMarkerId(model.id)}
                    onClick={() => {
                      setActiveMarkerId(model.id);
                      setSelectedModelId(model.id);
                    }}
                  />
                ))}

                {activeMarker ? (
                  <aside className="anu-labyrinth-stage__plaque">
                    <div className="flex items-center gap-2">
                      <StateSeal state={activeMarker.state} />
                      <span className="text-[10px] uppercase tracking-[0.18em] text-[#f6d4cb]/72">
                        {activeMarker.source.key}
                      </span>
                    </div>
                    <h3
                      className="mt-4 text-2xl text-[#f6d4cb]"
                      style={{ fontFamily: 'var(--anu-type-display)' }}
                    >
                      {activeMarker.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[#f6d4cb]/78">{activeMarker.purpose}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.03)] px-3 py-1 text-xs text-[#f6d4cb]/82">
                        {activeMarker.versionLabel}
                      </span>
                      <span className="rounded-full border border-[#f6d4cb]/18 bg-[#f6d4cb]/8 px-3 py-1 text-xs text-[#f6d4cb]">
                        {activeMarker.shapeLabel}
                      </span>
                    </div>
                  </aside>
                ) : null}
              </>
            ) : (
              <div className="anu-labyrinth-stage__message">
                <Search className="h-5 w-5 text-[color:rgba(246,212,203,0.78)]" />
                <div>
                  <p className="text-sm font-semibold text-[var(--color-foreground)]">No archive entries match this pass</p>
                  <p className="mt-1 text-sm leading-6 text-[color:rgba(246,212,203,0.78)]">
                    Adjust the archive console to reopen a visible lane of markers.
                  </p>
                </div>
              </div>
            )}
          </div>
        </LabyrinthArchiveShell>

        <ManuscriptOverlay
          dialogId={manuscriptDialogId}
          open={Boolean(selectedModel)}
          onClose={() => setSelectedModelId(null)}
          eyebrow="Manuscript chamber"
          title={selectedModel?.title ?? 'Model manuscript'}
          subtitle={
            selectedModel
              ? `${selectedModel.versionLabel} / ${selectedModel.outputUnitsLabel}`
              : undefined
          }
          description={
            selectedModel ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StateSeal state={selectedModel.state} />
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#f6d4cb]/18 bg-[#f6d4cb]/8 px-3 py-1 text-xs text-[#7c413c]">
                    <Compass className="h-3.5 w-3.5" />
                    {selectedModel.shapeLabel}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#e0b115]/18 bg-[color:rgba(246,212,203,0.35)] px-3 py-1 text-xs text-[#7c413c]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {selectedModel.source.key}
                  </span>
                </div>
                <p>{selectedModel.purpose}</p>
              </div>
            ) : undefined
          }
          primary={
            selectedModel ? (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <EmbeddedInstrumentPanel
                    label="Purpose"
                    value={selectedModel.title}
                    detail={selectedModel.purpose}
                  />
                  <EmbeddedInstrumentPanel
                    label="Status"
                    value={<StateSeal state={selectedModel.state} />}
                    detail={selectedModel.stateReason}
                  />
                  <EmbeddedInstrumentPanel
                    label="Version"
                    value={selectedModel.versionLabel}
                    detail={selectedModel.outputUnitsLabel}
                  />
                  <EmbeddedInstrumentPanel
                    label="Shape / simulation"
                    value={selectedModel.shapeLabel}
                    detail={selectedModel.shapeDetail}
                  />
                </div>

                <div className="anu-labyrinth-sidecar">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#f6d4cb]/74">Shape reading</p>
                  <p className="mt-3 text-sm leading-7 text-[#f6d4cb]/82">
                    {selectedModel.shapeDetail}
                  </p>
                </div>
              </div>
            ) : null
          }
          secondary={
            selectedModel ? (
              <div className="space-y-4">
                <div className="anu-labyrinth-sidecar">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#f6d4cb]/74">Steward lane</p>
                  <p className="mt-3 text-sm leading-7 text-[#f6d4cb]/82">{selectedModel.stewardSummary}</p>
                </div>

                <div className="anu-labyrinth-sidecar">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#f6d4cb]/74">Dependencies</p>
                  <p className="mt-3 text-sm leading-7 text-[#f6d4cb]/82">{selectedModel.dependencySummary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedModel.dependencyInputs.map((input) => (
                      <span
                        key={input}
                        className="rounded-full border border-[#e0b115]/22 bg-[#f6d4cb]/24 px-3 py-1 text-xs text-[#7c413c]"
                      >
                        {input}
                      </span>
                    ))}
                    {selectedModel.parameterKeys.map((key) => (
                      <span
                        key={key}
                        className="rounded-full border border-[#7c413c]/22 bg-[color:rgba(246,212,203,0.28)] px-3 py-1 text-xs text-[#7c413c]"
                      >
                        param: {key}
                      </span>
                    ))}
                    {selectedModel.dependencyInputs.length < 1 && selectedModel.parameterKeys.length < 1 ? (
                      <span className="rounded-full border border-[#7c413c]/16 bg-[color:rgba(246,212,203,0.24)] px-3 py-1 text-xs text-[#7c413c]">
                        No published dependency fields
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="anu-labyrinth-sidecar">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#f6d4cb]/74">History and release discipline</p>
                  <p className="mt-3 text-sm leading-7 text-[#f6d4cb]/82">{selectedModel.historySummary}</p>
                  {selectedModel.releaseNotes.length > 0 ? (
                    <ul className="mt-4 space-y-2 text-sm text-[#7c413c]">
                      {selectedModel.releaseNotes.map((note) => (
                        <li key={note} className="rounded-2xl border border-[#665700]/14 bg-[color:rgba(246,212,203,0.38)] px-3 py-2">
                          {note}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            ) : null
          }
          footer={
            selectedModel ? (
              <div className="flex flex-wrap gap-3">
                <AnuActionLink href="/governance" tone="secondary" iconLeft={Layers3}>
                  Return to governance index
                </AnuActionLink>
                <AnuActionLink href="/transparency" tone="ghost" iconLeft={ShieldCheck}>
                  Cross-check public truth
                </AnuActionLink>
              </div>
            ) : null
          }
        />
      </div>
    </div>
  );
}




