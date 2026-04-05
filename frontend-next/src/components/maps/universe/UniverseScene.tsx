'use client';

import { useMemo, useRef, useState } from 'react';
import { Compass, Pause, Play, RefreshCcw, Sparkles } from 'lucide-react';
import type { UniverseData, Star as QuantumStar } from '@/data/adapters/starfieldAdapter';
import { QuantumCanvas, type QuantumCanvasHandle } from '@/ui/patterns/starfield';
import { countLabel, universePresentationTerms } from './presentationTerms';
import type { UniversePacket } from './types';

interface UniverseSceneProps {
  packet: UniversePacket;
  activeStarId: string | null;
  compareStarIds?: string[];
  visibleStarIds?: string[];
  immersive?: boolean;
  onSelectStarId: (starId: string) => void;
}

export function packetToQuantumData(packet: UniversePacket, visibleStarIds?: string[]): UniverseData {
  const visibleSet = visibleStarIds ? new Set(visibleStarIds) : null;

  return {
    stars: packet.stars
      .filter((star) => !visibleSet || visibleSet.has(star.id))
      .map((star) => ({
        id: star.id,
        label: star.label,
        type: star.type,
        color: star.color,
        x: star.coordinates.x,
        y: star.coordinates.y,
        z: star.coordinates.z,
        size: star.size,
        connections: star.connections.filter((targetId) => !visibleSet || visibleSet.has(targetId)),
        metadata: {
          useProvidedCoordinates: true,
          created: star.metadata.createdAt,
          participants: star.metadata.participants,
          impact: star.metadata.impact,
          placement: star.placement,
        },
      } satisfies QuantumStar)),
    constellations: packet.constellations
      .map((constellation) => ({
        ...constellation,
        starIds: constellation.starIds.filter((starId) => !visibleSet || visibleSet.has(starId)),
      }))
      .filter((constellation) => constellation.starIds.length > 0),
    filters: packet.filters,
  };
}

export function UniverseScene({
  packet,
  activeStarId,
  compareStarIds = [],
  visibleStarIds,
  immersive = false,
  onSelectStarId,
}: UniverseSceneProps) {
  const quantumRef = useRef<QuantumCanvasHandle>(null);
  const [paused, setPaused] = useState(false);
  const quantumData = useMemo(() => packetToQuantumData(packet, visibleStarIds), [packet, visibleStarIds]);

  return (
    <div
      className={`group relative w-full overflow-hidden bg-[#1e0227] ${
        immersive
          ? 'h-[calc(100dvh-4rem)] min-h-[32rem] rounded-none border-0'
          : 'h-[30rem] rounded-[1.75rem] border border-[#1e0227] md:h-[38rem]'
      }`}
    >
      <QuantumCanvas
        ref={quantumRef}
        data={quantumData}
        densityFactor={Math.max(0.58, Math.min(1, quantumData.stars.length / Math.max(packet.stars.length, 1) + 0.35))}
        onStarClick={(star) => onSelectStarId(star.id)}
      />

      {!immersive ? (
        <div className="pointer-events-none absolute inset-x-4 top-4 z-10 flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-lg rounded-[1.35rem] border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(30,2,39,0.35)] px-4 py-3 text-sm text-[var(--color-foreground)] shadow-[0_20px_60px_rgba(30,2,39,0.35)] backdrop-blur-xl">
            <div className="flex items-center gap-2 text-[#7c413c]">
              <Sparkles className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.24em]">{packet.domain.title}</p>
            </div>
            <p className="mt-2 leading-6 text-[color:rgba(246,212,203,0.84)]">
              {packet.description ||
                `${universePresentationTerms.stars} sit inside one shared ${universePresentationTerms.platformName} universe packet. Evidence, freshness, source density, and semantic axes remain inspectable rather than decorative.`}
            </p>
          </div>

          <div className="rounded-[1.35rem] border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(30,2,39,0.35)] px-4 py-3 text-xs text-[color:rgba(246,212,203,0.84)] shadow-[0_20px_60px_rgba(30,2,39,0.35)] backdrop-blur-xl">
            <p>{countLabel(quantumData.stars.length, universePresentationTerms.star, universePresentationTerms.stars)}</p>
            <p className="mt-1">{countLabel(quantumData.constellations.length, universePresentationTerms.constellation, universePresentationTerms.constellations)}</p>
            <p className="mt-1">{countLabel(compareStarIds.length, 'comparison anchor')}</p>
            {activeStarId ? <p className="mt-1">{universePresentationTerms.explainer} follows the selected {universePresentationTerms.star.toLowerCase()}</p> : null}
            {packet.fallbackState?.active ? (
              <p className="mt-2 rounded-full border border-[color:rgba(224,177,21,0.25)] bg-[color:rgba(224,177,21,0.1)] px-2 py-1 text-[11px] text-[#e0b115]">
                {packet.fallbackState.label}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-full border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(30,2,39,0.35)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:rgba(246,212,203,0.85)] shadow-[0_16px_32px_-22px_rgba(30,2,39,0.8)] backdrop-blur-xl">
          {packet.domain.title}
        </div>
      )}

      <div
        className={`pointer-events-none absolute inset-x-4 bottom-4 z-10 flex flex-wrap items-end justify-between gap-3 ${
          immersive
            ? 'opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100'
            : ''
        }`}
      >
        <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(30,2,39,0.45)] px-3 py-2 text-xs text-[var(--color-foreground)] shadow-[0_16px_40px_rgba(30,2,39,0.3)] backdrop-blur-xl">
          <button
            type="button"
            aria-label="Scatter stars"
            onClick={() => quantumRef.current?.scatter()}
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.06)] px-3 text-[var(--color-foreground)] transition hover:bg-[color:rgba(246,212,203,0.12)]"
          >
            <Compass className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={paused ? 'Resume universe motion' : 'Pause universe motion'}
            onClick={() => setPaused(quantumRef.current?.togglePause() ?? false)}
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.06)] px-3 text-[var(--color-foreground)] transition hover:bg-[color:rgba(246,212,203,0.12)]"
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
          <button
            type="button"
            aria-label="Reset universe camera"
            onClick={() => quantumRef.current?.resetCamera()}
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.06)] px-3 text-[var(--color-foreground)] transition hover:bg-[color:rgba(246,212,203,0.12)]"
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-full border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(30,2,39,0.35)] px-4 py-2 text-xs text-[color:rgba(246,212,203,0.76)] shadow-[0_16px_40px_rgba(30,2,39,0.3)] backdrop-blur-xl">
          Drag to orbit / scroll to zoom / select a star to open the explainer
        </div>
      </div>
    </div>
  );
}
