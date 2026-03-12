'use client';

import { useRef, useEffect, useCallback } from 'react';
import { StarfieldEngine } from './StarfieldEngine';
import type { UniverseData, Star, UniverseFilters } from '@/data/adapters/starfieldAdapter';
import { filterUniverse } from '@/data/adapters/starfieldAdapter';

interface StarfieldCanvasProps {
  data: UniverseData;
  onStarClick?: (star: Star) => void;
  onStarHover?: (star: Star | null) => void;
  filters?: UniverseFilters;
  className?: string;
}

export function StarfieldCanvas({
  data,
  onStarClick,
  onStarHover,
  filters,
  className = '',
}: StarfieldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<StarfieldEngine | null>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      switch (e.key) {
        case '+':
        case '=':
          engine.zoomTo((engine as unknown as { camera: { targetZoom: number } }).camera?.targetZoom * 1.2 || 1.2);
          break;
        case '-':
          engine.zoomTo((engine as unknown as { camera: { targetZoom: number } }).camera?.targetZoom * 0.8 || 0.8);
          break;
      }
    },
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new StarfieldEngine(canvas);
    engineRef.current = engine;

    // Apply filtered data
    const filtered = filters ? filterUniverse(data, filters) : data;
    engine.loadData(filtered);

    engine.onStarClick = onStarClick ?? null;
    engine.onStarHover = onStarHover ?? null;

    engine.resize();
    engine.start();

    const ro = new ResizeObserver(() => engine.resize());
    ro.observe(canvas);

    return () => {
      engine.stop();
      ro.disconnect();
      engineRef.current = null;
    };
  }, [data, filters, onStarClick, onStarHover]);

  return (
    <canvas
      ref={canvasRef}
      className={`block w-full h-full ${className}`}
      style={{ cursor: 'grab', touchAction: 'none' }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="img"
      aria-label={`Starfield visualization with ${data.stars.length} entities`}
    />
  );
}
