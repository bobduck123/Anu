'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Layers3, Orbit, RefreshCw, ScrollText, Search, ShieldCheck, Workflow } from 'lucide-react';
import { getCoreApiBase } from '@/lib/runtime';
import {
  AnuActionLink,
  AnuChip,
  AnuControlButton,
  AnuFilterBar,
  AnuFilterGroup,
  AnuFilterInput,
  AnuSurfacePanel,
} from '@/ui-system/anu/surfacePrimitives';
import { LabyrinthArchiveShell } from '@/ui-system/realms/labyrinth/LabyrinthArchiveShell';
import { ArchiveMarker } from '@/ui-system/realms/labyrinth/ArchiveMarker';
import { ManuscriptOverlay } from '@/ui-system/realms/labyrinth/ManuscriptOverlay';
import { StateSeal } from '@/ui-system/realms/labyrinth/StateSeal';
import { EmbeddedInstrumentPanel } from '@/ui-system/realms/labyrinth/EmbeddedInstrumentPanel';
import {
  presentRegistryModel,
  type LabyrinthState,
  type ModelRegistryItem,
  type PresentedRegistryModel,
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

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') {
    return {};
  }

  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

function countByState(models: PresentedRegistryModel[]) {
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

function distinctShapeCount(models: PresentedRegistryModel[]) {
  return new Set(models.map((model) => model.shapeLabel)).size;
}

export default function ModelRegistryPage() {
  const manuscriptDialogId = 'model-registry-manuscript';
  const [models, setModels] = useState<ModelRegistryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<'all' | LabyrinthState>('all');
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  const loadModels = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/model-registry/`, {
        headers: getAuthHeaders(),
        signal,
      });

      const data = (await response.json()) as {
        data?: { models?: ModelRegistryItem[] };
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(data.error?.message ?? 'Failed to load model registry');
      }

      setModels(data.data?.models ?? []);
    } catch (loadError) {
      if (loadError instanceof Error && loadError.name === 'AbortError') {
        return;
      }

      setError(loadError instanceof Error ? loadError.message : 'Failed to load model registry');
      setModels([]);
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

  const selectedModel = useMemo(
    () => presentedModels.find((model) => model.id === selectedModelId) ?? null,
    [presentedModels, selectedModelId],
  );

  useEffect(() => {
    if (!selectedModelId) {
      return;
    }

    const stillVisible = presentedModels.some((model) => model.id === selectedModelId);
    if (!stillVisible) {
      setSelectedModelId(null);
    }
  }, [presentedModels, selectedModelId]);

  useEffect(() => {
    if (!selectedModel) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedModelId(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedModel]);

  const legend = (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[#d2bf99]/72">Archive states</p>
      <div className="flex flex-wrap gap-2">
        <StateSeal state="active" />
        <StateSeal state="contested" />
        <StateSeal state="experimental" />
        <StateSeal state="dormant" />
        <StateSeal state="deprecated" />
      </div>
      <p className="text-sm leading-6 text-[#d8ccb6]/76">
        Registry items signal state before entry so operators can distinguish stable instruments from contested or early-stage models before opening a manuscript chamber.
      </p>
    </div>
  );

  const stats = (
    <>
      <EmbeddedInstrumentPanel
        label="Archive count"
        value={`${presentedModels.length} models`}
        detail="All versioned institutional models currently returned by the live registry endpoint."
      />
      <EmbeddedInstrumentPanel
        label="Live states"
        value={`${archiveCounts.active} active`}
        detail={`${archiveCounts.experimental} experimental / ${archiveCounts.contested} contested`}
      />
      <EmbeddedInstrumentPanel
        label="Shape families"
        value={`${distinctShapeCount(presentedModels)} forms`}
        detail="Distinct simulation shapes derived from the published registry metadata."
      />
    </>
  );

  return (
    <div className="min-h-screen px-4 pb-20 pt-24 md:px-8">
      <div className="mx-auto max-w-7xl">
        <LabyrinthArchiveShell
          eyebrow="Labyrinth proof / model registry"
          title="Descend into the model archive."
          description="Governance models should not read like a flat list. This route enters through the archive first, lets state surface before selection, and then opens manuscript chambers for deeper inspection of purpose, version, and simulation form."
          legend={legend}
          stats={stats}
          controls={
            <div className="space-y-4">
              <AnuFilterBar>
                <AnuFilterGroup>
                  <AnuFilterInput
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search model key, purpose, shape, or release discipline"
                    aria-label="Search model registry"
                  />
                  <AnuControlButton
                    tone="default"
                    iconLeft={RefreshCw}
                    onClick={() => void loadModels()}
                    disabled={loading}
                    className={loading ? 'opacity-80' : ''}
                  >
                    {loading ? 'Refreshing' : 'Refresh archive'}
                  </AnuControlButton>
                </AnuFilterGroup>
                <AnuFilterGroup className="justify-end">
                  {STATE_FILTERS.map((option) => (
                    <AnuControlButton
                      key={option.key}
                      tone={stateFilter === option.key ? 'active' : 'default'}
                      onClick={() => setStateFilter(option.key)}
                    >
                      {option.label}
                    </AnuControlButton>
                  ))}
                </AnuFilterGroup>
              </AnuFilterBar>

              <div className="flex flex-wrap gap-2">
                <AnuChip tone="muted" icon={ScrollText}>
                  Manuscript overlays stay in the archive
                </AnuChip>
                <AnuChip tone="muted" icon={Layers3}>
                  Shape and simulation form appear at first glance
                </AnuChip>
                <AnuChip tone="muted" icon={Workflow}>
                  Dependencies and release discipline sit on the second layer
                </AnuChip>
              </div>
            </div>
          }
        >
          <div className="space-y-6">
            {error ? (
              <AnuSurfacePanel tone="soft" className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-[#f3c489]" />
                  <div>
                    <p className="text-sm font-semibold text-[#f7e0b1]">Archive sync failed</p>
                    <p className="mt-1 text-sm leading-6 text-[#ddd0ba]/80">{error}</p>
                  </div>
                </div>
              </AnuSurfacePanel>
            ) : null}

            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`loading-${index}`}
                    className="anu-labyrinth-marker animate-pulse"
                    aria-hidden="true"
                  >
                    <div className="h-3 w-28 rounded-full bg-white/10" />
                    <div className="mt-4 h-8 w-3/4 rounded-full bg-white/10" />
                    <div className="mt-4 h-4 w-full rounded-full bg-white/10" />
                    <div className="mt-2 h-4 w-5/6 rounded-full bg-white/10" />
                    <div className="mt-6 flex gap-2">
                      <div className="h-7 w-16 rounded-full bg-white/10" />
                      <div className="h-7 w-20 rounded-full bg-white/10" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredModels.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredModels.map((model) => (
                  <ArchiveMarker
                    key={model.id}
                    title={model.title}
                    eyebrow={model.source.key}
                    summary={model.purpose}
                    shapeLabel={model.shapeLabel}
                    versionLabel={model.versionLabel}
                    state={model.state}
                    stateReason={model.stateReason}
                    active={selectedModelId === model.id}
                    dialogId={manuscriptDialogId}
                    onClick={() => setSelectedModelId(model.id)}
                  />
                ))}
              </div>
            ) : (
              <AnuSurfacePanel tone="quiet" className="px-5 py-6">
                <div className="flex items-start gap-3">
                  <Search className="mt-0.5 h-5 w-5 text-slate-300/78" />
                  <div>
                    <p className="text-sm font-semibold text-white">No archive entries match this pass</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300/78">
                      Adjust the search or state filter to reopen the archive markers.
                    </p>
                  </div>
                </div>
              </AnuSurfacePanel>
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
                  <AnuChip tone="muted" icon={Orbit}>
                    {selectedModel.shapeLabel}
                  </AnuChip>
                  <AnuChip tone="muted" icon={ShieldCheck}>
                    {selectedModel.source.key}
                  </AnuChip>
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
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#d4c199]/74">Shape reading</p>
                  <p className="mt-3 text-sm leading-7 text-[#ddd0ba]/82">
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
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#d4c199]/74">Steward lane</p>
                  <p className="mt-3 text-sm leading-7 text-[#ddd0ba]/82">{selectedModel.stewardSummary}</p>
                </div>

                <div className="anu-labyrinth-sidecar">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#d4c199]/74">Dependencies</p>
                  <p className="mt-3 text-sm leading-7 text-[#ddd0ba]/82">{selectedModel.dependencySummary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedModel.dependencyInputs.map((input) => (
                      <AnuChip key={input} tone="muted">
                        {input}
                      </AnuChip>
                    ))}
                    {selectedModel.parameterKeys.map((key) => (
                      <AnuChip key={key} tone="accent">
                        param: {key}
                      </AnuChip>
                    ))}
                    {selectedModel.dependencyInputs.length < 1 && selectedModel.parameterKeys.length < 1 ? (
                      <AnuChip tone="muted">No published dependency fields</AnuChip>
                    ) : null}
                  </div>
                </div>

                <div className="anu-labyrinth-sidecar">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#d4c199]/74">History and release discipline</p>
                  <p className="mt-3 text-sm leading-7 text-[#ddd0ba]/82">{selectedModel.historySummary}</p>
                  {selectedModel.releaseNotes.length > 0 ? (
                    <ul className="mt-4 space-y-2 text-sm text-[#5a4630]">
                      {selectedModel.releaseNotes.map((note) => (
                        <li key={note} className="rounded-2xl border border-[#4d3a23]/14 bg-white/38 px-3 py-2">
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
