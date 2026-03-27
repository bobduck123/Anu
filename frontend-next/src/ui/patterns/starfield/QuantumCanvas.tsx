'use client';

import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import type { Star, UniverseData } from '@/data/adapters/starfieldAdapter';
import { QuantumEngine } from './QuantumEngine';

export interface QuantumCanvasHandle {
  scatter: () => void;
  togglePause: () => boolean;
  resetCamera: () => void;
}

interface QuantumCanvasProps {
  data: UniverseData;
  paletteIndex?: number;
  densityFactor?: number;
  layoutMode?: 'orbital' | 'semantic';
  flattenFactor?: number;
  showConnections?: boolean;
  focusStarId?: string | null;
  onStarClick?: (star: Star) => void;
  className?: string;
}

export const QuantumCanvas = forwardRef<QuantumCanvasHandle, QuantumCanvasProps>(
  function QuantumCanvas(
    {
      data,
      paletteIndex = 0,
      densityFactor = 1.0,
      layoutMode = 'orbital',
      flattenFactor = 0,
      showConnections = true,
      focusStarId = null,
      onStarClick,
      className,
    },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<QuantumEngine | null>(null);

    useImperativeHandle(ref, () => ({
      scatter: () => engineRef.current?.scatter(),
      togglePause: () => engineRef.current?.togglePause() ?? false,
      resetCamera: () => engineRef.current?.resetCamera(),
    }));

    // Init / cleanup
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const engine = new QuantumEngine(canvas);
      engineRef.current = engine;
      engine.start();
      const ro = new ResizeObserver(() => engine.resize());
      ro.observe(canvas);
      return () => {
        ro.disconnect();
        engine.stop();
        engineRef.current = null;
      };
    }, []);

    // Load data
    useEffect(() => {
      engineRef.current?.loadStars(data.stars, data.constellations);
    }, [data]);

    // Theme
    useEffect(() => {
      engineRef.current?.setTheme(paletteIndex);
    }, [paletteIndex]);

    // Density
    useEffect(() => {
      engineRef.current?.setDensity(densityFactor);
    }, [densityFactor]);

    useEffect(() => {
      engineRef.current?.setLayoutMode(layoutMode);
    }, [layoutMode]);

    useEffect(() => {
      engineRef.current?.setFlattenFactor(flattenFactor);
    }, [flattenFactor]);

    useEffect(() => {
      engineRef.current?.setConnectionsVisible(showConnections);
    }, [showConnections]);

    useEffect(() => {
      engineRef.current?.focusStar(focusStarId ?? null);
    }, [focusStarId]);

    // Star click callback
    useEffect(() => {
      if (engineRef.current) {
        engineRef.current.onStarClick = onStarClick ?? null;
      }
    }, [onStarClick]);

    return (
      <canvas
        ref={canvasRef}
        className={className}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: 'crosshair',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1,
        }}
      />
    );
  },
);
