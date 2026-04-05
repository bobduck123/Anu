'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Layers, Loader2, MapPin, RefreshCw, Sparkles, Stars } from 'lucide-react';
import { constellationsApi, type ConstellationSummary } from '@/lib/api/endpoints';
import {
  AnuControlButton,
  AnuSectionHeading,
  AnuSurfacePanel,
} from '@/ui-system/anu/surfacePrimitives';
import { AnuNarrativeBriefPanel } from '@/ui-system/anu/narrativePrimitives';
import { CelestialNodeBubble } from '@/ui-system/realms/celestial/CelestialNodeBubble';
import { CelestialStarfieldShell } from '@/ui-system/realms/celestial/CelestialStarfieldShell';
import { shouldAutoFallbackToTwoDimensional } from '@/ui-system/realms/celestial/communityCelestialPresentation';
import { buildConstellationThresholdPacket } from './constellationThresholdPresentation';

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

export default function ConstellationsPage() {
  const [items, setItems] = useState<ConstellationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [surfaceMode, setSurfaceMode] = useState<'starfield' | 'list'>('starfield');
  const [autoFallbackReason, setAutoFallbackReason] = useState<string | null>(null);
  const [selectedStarId, setSelectedStarId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await constellationsApi.list();
        setItems(res.constellations || []);
      } catch (loadError: unknown) {
        setError(getErrorMessage(loadError, 'Failed to load constellations'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (shouldAutoFallbackToTwoDimensional(prefersReducedMotion)) {
      setSurfaceMode('list');
      setAutoFallbackReason('Reduced-motion preference detected. List mode is active by default, but the starfield threshold remains available.');
    }
  }, []);

  const packet = useMemo(() => buildConstellationThresholdPacket(items), [items]);
  const selectedConstellation = useMemo(() => {
    if (!selectedStarId) {
      return null;
    }
    const id = Number(selectedStarId.replace(/^constellation-/, ''));
    return items.find((item) => item.id === id) ?? null;
  }, [items, selectedStarId]);
  const activeCount = items.filter((item) => item.active).length;
  const domainCount = new Set(items.map((item) => item.domain ?? 'general')).size;

  const topChrome = (
    <AnuSurfacePanel tone="quiet" className="p-4 text-[var(--color-foreground)]">
      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="min-w-0">
          <AnuSectionHeading
            eyebrow="Constellation threshold"
            title="Enter the field of coordination patterns"
            description="Constellations now share the celestial grammar as a threshold route: browse the field first, then descend into a specific constellation when the pattern is clear."
          />

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <AnuSurfacePanel tone="soft">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[color:rgba(246,212,203,0.64)]">Field state</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.05)] px-3 py-1 text-xs text-[color:rgba(246,212,203,0.92)]">
                  {loading ? 'Loading field' : 'Constellation field ready'}
                </span>
                <span className="rounded-full border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.05)] px-3 py-1 text-xs text-[color:rgba(246,212,203,0.92)]">
                  {surfaceMode === 'starfield' ? 'Starfield threshold' : 'List backup'}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.82)]">
                Coordination clusters stay readable as celestial structures first, with a stable list backup when needed.
              </p>
            </AnuSurfacePanel>

            <AnuSurfacePanel tone="soft">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[color:rgba(246,212,203,0.64)]">Coverage</p>
              <p className="mt-3 text-lg font-semibold text-[var(--color-foreground)]">{items.length} constellations</p>
              <p className="mt-2 text-sm leading-6 text-[color:rgba(246,212,203,0.82)]">
                {activeCount} active / {Math.max(0, items.length - activeCount)} paused / {domainCount} domains
              </p>
            </AnuSurfacePanel>

            <AnuSurfacePanel tone="soft">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[color:rgba(246,212,203,0.64)]">Fallback posture</p>
              <p className="mt-3 text-lg font-semibold text-[var(--color-foreground)]">{surfaceMode === 'starfield' ? 'Celestial first' : '2D explicit'}</p>
              <p className="mt-2 text-sm leading-6 text-[color:rgba(246,212,203,0.82)]">
                The route states when it is using the list backup instead of pretending the celestial layer is always the right choice.
              </p>
            </AnuSurfacePanel>
          </div>
        </div>

        <div className="min-w-0">
          <AnuSurfacePanel tone="soft" className="h-full">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.05)] px-3 py-1 text-xs text-[color:rgba(246,212,203,0.92)]">
                {packet.packetMeta?.sourceSummary}
              </span>
              {selectedConstellation ? (
                <span className="rounded-full border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.05)] px-3 py-1 text-xs text-[color:rgba(246,212,203,0.92)]">
                  Selected: {selectedConstellation.name}
                </span>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <AnuControlButton onClick={() => setSurfaceMode('starfield')} tone={surfaceMode === 'starfield' ? 'active' : 'default'} iconLeft={Stars}>
                Starfield
              </AnuControlButton>
              <AnuControlButton onClick={() => setSurfaceMode('list')} tone={surfaceMode === 'list' ? 'active' : 'default'}>
                List view
              </AnuControlButton>
              <AnuControlButton onClick={() => window.location.reload()} iconLeft={RefreshCw}>
                Refresh
              </AnuControlButton>
            </div>

            {error || autoFallbackReason ? (
              <div className="mt-4 space-y-3">
                {error ? (
                  <div className="rounded-2xl border border-[rgba(224,177,21,0.22)] bg-[rgba(224,177,21,0.08)] px-4 py-3 text-sm text-[#f6d4cb]">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  </div>
                ) : null}
                {autoFallbackReason && surfaceMode === 'list' ? (
                  <div className="rounded-2xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.04)] px-4 py-3 text-sm text-[color:rgba(246,212,203,0.84)]">
                    {autoFallbackReason}
                  </div>
                ) : null}
              </div>
            ) : null}

            <AnuNarrativeBriefPanel
              eyebrow="Route reading"
              title="How to read the constellation threshold"
              description="Constellations should read as a celestial threshold route. The starfield gives spatial orientation; the list backup remains available for direct inspection."
              signals={[
                {
                  label: 'Output mode',
                  value: surfaceMode === 'starfield' ? 'Starfield threshold' : 'List backup active',
                  detail: surfaceMode === 'starfield'
                    ? 'Constellation summaries are being read as a spatial field before they flatten into a backup registry.'
                    : 'The list backup is active for preference or operational clarity, but it stays derived from the same threshold packet.',
                  tone: surfaceMode === 'starfield' ? 'signal' : 'muted',
                  icon: Stars,
                },
                {
                  label: 'Source state',
                  value: `${items.length} summaries / ${activeCount} active`,
                  detail: 'This route is summarizing the current constellation layer rather than replacing the deeper per-constellation routes.',
                  tone: 'muted',
                  icon: Layers,
                },
                {
                  label: 'Fallback truth',
                  value: autoFallbackReason && surfaceMode === 'list' ? 'List fallback declared' : 'Route state declared',
                  detail: 'The route says when it is using the 2D backup so celestial behavior remains trustworthy rather than performative.',
                  tone: autoFallbackReason && surfaceMode === 'list' ? 'accent' : 'signal',
                  icon: Sparkles,
                },
              ]}
              whyItMatters="Constellations should be readable as navigable coordination patterns, not just as a card registry. The backup list exists to preserve clarity, not to replace the field."
              compact
              className="mt-4"
            />
          </AnuSurfacePanel>
        </div>
      </div>
    </AnuSurfacePanel>
  );

  const bottomChrome = (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(30,2,39,0.3)] px-4 py-3 text-xs text-[color:rgba(246,212,203,0.84)] shadow-[0_20px_50px_-32px_rgba(30,2,39,0.95)] backdrop-blur-xl">
      <span>{packet.packetMeta?.sourceSummary}</span>
      <span className="rounded-full border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.04)] px-3 py-1">
        {selectedConstellation ? selectedConstellation.name : 'Select a constellation for detail'}
      </span>
    </div>
  );

  return (
    <>
      {surfaceMode === 'starfield' ? (
        <CelestialStarfieldShell
          packet={packet}
          activeStarId={selectedStarId}
          onSelectStarId={setSelectedStarId}
          topChrome={topChrome}
          bottomChrome={bottomChrome}
          bubble={
            selectedConstellation ? (
              <CelestialNodeBubble
                eyebrow={selectedConstellation.active ? 'Active constellation' : 'Paused constellation'}
                title={selectedConstellation.name}
                summary={<p>{selectedConstellation.description || 'Regional coordination constellation'}</p>}
                tags={[selectedConstellation.domain || 'general']}
                detail={
                  <div className="space-y-2">
                    <p>{selectedConstellation.geoLabel ?? 'Shared field'} / coordination pattern</p>
                    <p>This star acts as a threshold. The deeper route still lives on the dedicated constellation page.</p>
                  </div>
                }
                actions={
                  <Link
                    href={`/constellations/${selectedConstellation.id}`}
                    className="inline-flex items-center rounded-xl border border-[color:rgba(246,212,203,0.16)] bg-[color:rgba(246,212,203,0.06)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.86)] transition-colors hover:border-[color:rgba(246,212,203,0.3)] hover:bg-[color:rgba(246,212,203,0.1)] hover:text-[var(--color-foreground)]"
                  >
                    Open constellation
                  </Link>
                }
              />
            ) : null
          }
        />
      ) : (
        <div className="fixed inset-0 z-[5] overflow-y-auto bg-[#1e0227] pb-24 pt-28" style={{ isolation: 'isolate' }}>
          <div className="pointer-events-none fixed left-3 right-3 top-4 z-[12] flex justify-center md:left-[17rem] md:right-6">
            <div className="pointer-events-auto w-full max-w-6xl">{topChrome}</div>
          </div>

          <div className="mx-auto mt-[22rem] max-w-6xl px-4 md:px-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {loading ? (
                <div className="md:col-span-2 flex items-center justify-center py-24">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--color-institutional)]" />
                </div>
              ) : (
                items.map((item) => (
                  <Link
                    key={item.id}
                    href={`/constellations/${item.id}`}
                    className="block rounded-[1.6rem] border border-[color:rgba(246,212,203,0.1)] bg-[linear-gradient(180deg,rgba(30,2,39,0.86),rgba(30,2,39,0.94))] p-5 text-[var(--color-foreground)] shadow-[0_24px_80px_-38px_rgba(30,2,39,0.95)] transition-transform hover:-translate-y-1"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
                          {item.name}
                        </h3>
                        <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.82)]">
                          {item.description || 'Regional coordination constellation'}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3 text-xs text-[color:rgba(246,212,203,0.74)]">
                          <span className="inline-flex items-center gap-1">
                            <Layers className="h-3.5 w-3.5 text-[#f6d4cb]" />
                            {item.domain || 'general'}
                          </span>
                          {item.geoLabel ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-[#f6d4cb]" />
                              {item.geoLabel}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <span className="rounded-full border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.05)] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[color:rgba(246,212,203,0.92)]">
                        {item.active ? 'Active' : 'Paused'}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
