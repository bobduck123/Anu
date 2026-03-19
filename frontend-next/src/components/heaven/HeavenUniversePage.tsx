'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { getEarthSummary, getUniversePacket, type TimeWindow, type UniverseMode, type UniversePacket } from '@/lib/api/earthHeavenApi';
import { toActionableSurfaceError } from '@/lib/ui/actionableErrors';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

const UNIVERSE_MODES: UniverseMode[] = ['mutual_aid', 'events', 'community', 'coverage'];
const TIME_WINDOWS: TimeWindow[] = ['7d', '30d', '90d'];

function hashBucket(id: string, modulo: number): number {
  if (modulo <= 0) return 0;
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % modulo;
}

function parseGalaxy(galaxy: Record<string, unknown>, index: number) {
  const id = String(galaxy.id ?? `galaxy-${index}`);
  const label = String(galaxy.name ?? galaxy.label ?? id);
  return { id, label };
}

export function HeavenUniversePage() {
  const router = useRouter();
  const [nodeId, setNodeId] = useState(1);
  const [mode, setMode] = useState<UniverseMode>('mutual_aid');
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('30d');
  const [zoomLevel, setZoomLevel] = useState(8);
  const [selectedGalaxy, setSelectedGalaxy] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [reloadToken, setReloadToken] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [featureEnabled, setFeatureEnabled] = useState(true);
  const [packet, setPacket] = useState<UniversePacket | null>(null);
  const [hoveredStar, setHoveredStar] = useState<UniversePacket['objects']['stars'][number] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const summary = await getEarthSummary(nodeId);
        if (cancelled) return;
        if (!summary.featureFlags.heavenUniverseEnabled) {
          setFeatureEnabled(false);
          setPacket(null);
          setLoadState('ready');
          return;
        }
        setFeatureEnabled(true);
        const nextPacket = await getUniversePacket({
          node: nodeId,
          universeMode: mode,
          zoomLevel,
          redactionLevel: 'public',
          timeWindow,
        });
        if (cancelled) return;
        setPacket(nextPacket);
        setLoadState('ready');
      } catch (error) {
        if (cancelled) return;
        setPacket(null);
        setLoadState('error');
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load universe packet');
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [nodeId, mode, timeWindow, zoomLevel, reloadToken]);

  const galaxies = useMemo(() => {
    if (!packet) return [];
    return packet.objects.galaxies.map((g, idx) => parseGalaxy(g, idx));
  }, [packet]);

  const visibleStars = useMemo(() => {
    if (!packet) return [];
    if (!selectedGalaxy || galaxies.length === 0) return packet.objects.stars;
    const galaxyIndex = galaxies.findIndex((g) => g.id === selectedGalaxy);
    if (galaxyIndex < 0) return packet.objects.stars;
    return packet.objects.stars.filter((star) => hashBucket(star.id, galaxies.length) === galaxyIndex);
  }, [packet, selectedGalaxy, galaxies]);

  if (loadState === 'loading' || loadState === 'idle') {
    return <div className="min-h-screen bg-slate-950 px-6 py-24 text-slate-100">Loading Universe...</div>;
  }

  if (!featureEnabled) {
    return (
      <div className="min-h-screen bg-slate-950 px-6 py-24 text-slate-100">
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/70 p-8">
          <h1 className="text-2xl font-semibold">Heaven is disabled for this node.</h1>
          <p className="mt-2 text-sm text-slate-300">Earth remains fully operational while universe projection is turned off.</p>
          <Link href="/earth" className="mt-5 inline-block rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500">
            Return to Earth
          </Link>
        </div>
      </div>
    );
  }

  if (loadState === 'error' || !packet) {
    const actionableError = toActionableSurfaceError({
      area: 'Universe projection',
      rawMessage: errorMessage,
      fallbackHref: '/earth',
      fallbackLabel: 'Open Earth fallback',
    });

    return (
      <div className="min-h-screen bg-slate-950 px-6 py-24 text-slate-100">
        <div className="mx-auto max-w-2xl rounded-2xl border border-rose-800/70 bg-slate-900/70 p-8">
          <h1 className="text-2xl font-semibold">{actionableError.headline}</h1>
          <p className="mt-2 text-sm text-slate-300">{actionableError.detail}</p>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => {
                setLoadState('loading');
                setErrorMessage(null);
                setReloadToken((value) => value + 1);
              }}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              Retry
            </button>
            <Link href={actionableError.fallbackHref} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800">
              {actionableError.fallbackLabel}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const constellations = packet.objects.constellations;
  const nebulas = packet.objects.nebulas;
  const flares = packet.objects.flares;

  return (
    <div className="min-h-screen bg-slate-950 px-4 pb-16 pt-24 text-slate-100 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Heaven Projection</p>
              <h1 className="mt-1 text-2xl font-semibold">Universe projection is render-only, derived from Hell.</h1>
              <p className="mt-1 text-xs text-slate-400">
                {packet.generatedAt} • redaction {packet.privacy.redactionLevel} • kMin {packet.privacy.kMin}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={nodeId}
                onChange={(e) => {
                  setLoadState('loading');
                  setErrorMessage(null);
                  setNodeId(Number(e.target.value));
                }}
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
              >
                <option value={1}>Node 1</option>
                <option value={2}>Node 2</option>
                <option value={3}>Node 3</option>
              </select>
              <select
                value={mode}
                onChange={(e) => {
                  setLoadState('loading');
                  setErrorMessage(null);
                  setMode(e.target.value as UniverseMode);
                }}
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
              >
                {UNIVERSE_MODES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select
                value={timeWindow}
                onChange={(e) => {
                  setLoadState('loading');
                  setErrorMessage(null);
                  setTimeWindow(e.target.value as TimeWindow);
                }}
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
              >
                {TIME_WINDOWS.map((window) => (
                  <option key={window} value={window}>{window}</option>
                ))}
              </select>
              <input
                type="range"
                min={3}
                max={14}
                step={1}
                value={zoomLevel}
                onChange={(e) => {
                  setLoadState('loading');
                  setErrorMessage(null);
                  setZoomLevel(Number(e.target.value));
                }}
              />
              <button
                onClick={() => {
                  setLoadState('loading');
                  setErrorMessage(null);
                  setReloadToken((value) => value + 1);
                }}
                className="rounded-md bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-500"
              >
                Refresh
              </button>
              <Link href="/earth" className="rounded-md border border-slate-700 px-3 py-1 text-sm text-slate-100 hover:bg-slate-800">Earth</Link>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Galaxy Filter</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedGalaxy(null)}
              className={`rounded-full px-3 py-1 text-xs ${selectedGalaxy === null ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
            >
              All
            </button>
            {galaxies.map((galaxy) => (
              <button
                key={galaxy.id}
                onClick={() => setSelectedGalaxy(galaxy.id)}
                className={`rounded-full px-3 py-1 text-xs ${selectedGalaxy === galaxy.id ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
              >
                {galaxy.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-3">
            <div className="relative h-[540px] rounded-xl border border-slate-800 bg-slate-950/80">
              {nebulas.map((nebula, idx) => {
                const x = (hashBucket(String(nebula.id ?? idx), 100) / 100) * 100;
                const y = (hashBucket(`${String(nebula.id ?? idx)}-y`, 100) / 100) * 100;
                const size = 60 + (Number(nebula.density || 1) % 10) * 14;
                return (
                  <span
                    key={String(nebula.id ?? idx)}
                    className="pointer-events-none absolute rounded-full blur-xl"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      width: `${size}px`,
                      height: `${size}px`,
                      transform: 'translate(-50%, -50%)',
                      background: 'rgba(125, 211, 252, 0.14)',
                    }}
                  />
                );
              })}

              {visibleStars.map((star) => {
                const x = ((star.x + 100) / 200) * 100;
                const y = ((star.y + 100) / 200) * 100;
                const size = Math.max(2, Math.min(8, star.mass * 3));
                const allowHover = !!star.link?.allowed;
                return (
                  <button
                    key={star.id}
                    type="button"
                    onMouseEnter={() => setHoveredStar(allowHover ? star : null)}
                    onMouseLeave={() => setHoveredStar(null)}
                    className="absolute rounded-full"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      width: `${size}px`,
                      height: `${size}px`,
                      transform: 'translate(-50%, -50%)',
                      opacity: Math.max(0.2, Math.min(1, star.brightness)),
                      backgroundColor: allowHover ? '#7dd3fc' : '#64748b',
                      boxShadow: allowHover ? '0 0 14px rgba(125, 211, 252, 0.65)' : 'none',
                    }}
                  />
                );
              })}

              {flares.map((flare, idx) => {
                const x = (hashBucket(String(flare.id ?? idx), 100) / 100) * 100;
                const y = (hashBucket(`${String(flare.id ?? idx)}-fy`, 100) / 100) * 100;
                return (
                  <span
                    key={String(flare.id ?? idx)}
                    className="pointer-events-none absolute rounded-full border border-rose-400/70"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      width: '24px',
                      height: '24px',
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                );
              })}

              {hoveredStar ? (
                <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs text-slate-100">
                  <p className="font-semibold">{hoveredStar.kind}</p>
                  <p>id: {hoveredStar.id}</p>
                  <p>mass: {hoveredStar.mass.toFixed(2)} • brightness: {hoveredStar.brightness.toFixed(2)}</p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Constellations</p>
              <div className="mt-2 space-y-2">
                {constellations.length === 0 ? (
                  <p className="text-sm text-slate-400">No constellations in this packet.</p>
                ) : (
                  constellations.map((constellation, idx) => {
                    const id = String(constellation.id ?? `constellation-${idx}`);
                    const label = String(constellation.label ?? constellation.name ?? id);
                    const drilldown = packet.drilldown.constellationToQuery[id];
                    return (
                      <button
                        key={id}
                        type="button"
                        disabled={!drilldown?.allowed}
                        onClick={() => {
                          if (!drilldown?.allowed || !drilldown.query) return;
                          router.push(drilldown.query);
                        }}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-left text-sm text-slate-200 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {label}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-300">
              <p className="uppercase tracking-wide text-slate-400">Packet Audit</p>
              <p className="mt-2 break-all">configVersion: {packet.configVersion}</p>
              <p className="mt-1 break-all">evidenceHash: {packet.evidenceHash}</p>
              <p className="mt-1">resolution floor: {packet.privacy.resolutionMetersMin}m</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
