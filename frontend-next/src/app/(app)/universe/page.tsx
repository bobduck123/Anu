'use client';

import { useState, useMemo, useRef, useCallback, useDeferredValue, type RefObject } from 'react';
import { useFeatureFlag } from '@/lib/featureFlags';
import { generateMockUniverse, type Star, type StarType } from '@/data/adapters/starfieldAdapter';
import { QuantumCanvas, type QuantumCanvasHandle } from '@/ui/patterns/starfield/QuantumCanvas';
import { StarDetailDrawer } from '@/ui/patterns/starfield';
import { Sparkles } from 'lucide-react';

const TYPE_CHIPS: { type: StarType; label: string; color: string }[] = [
  { type: 'event', label: 'Events', color: '#667eea' },
  { type: 'action', label: 'Actions', color: '#48bb78' },
  { type: 'community', label: 'Community', color: '#ed8936' },
  { type: 'donor', label: 'Donors', color: '#f6e05e' },
  { type: 'relief', label: 'Relief', color: '#fc8181' },
  { type: 'education', label: 'Education', color: '#b794f4' },
  { type: 'marketplace', label: 'Marketplace', color: '#4fd1c5' },
];

const THEME_BUTTONS = [
  { index: 0, label: 'Purple Nebula', gradient: 'radial-gradient(circle at 30% 30%, #a78bfa, #4c1d95)' },
  { index: 1, label: 'Sunset Fire', gradient: 'radial-gradient(circle at 30% 30%, #fb7185, #9f1239)' },
  { index: 2, label: 'Ocean Aurora', gradient: 'radial-gradient(circle at 30% 30%, #38bdf8, #0c4a6e)' },
];

/* ------------------------------------------------------------------
   Glass panel styling (matches reference exactly)
   ------------------------------------------------------------------ */
const glassPanel: React.CSSProperties = {
  backdropFilter: 'blur(24px) saturate(120%)',
  WebkitBackdropFilter: 'blur(24px) saturate(120%)',
  background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderTop: '1px solid rgba(255,255,255,0.2)',
  borderLeft: '1px solid rgba(255,255,255,0.2)',
  boxShadow: '0 20px 40px rgba(0,0,0,0.4), inset 0 0 20px rgba(255,255,255,0.02)',
  borderRadius: 24,
  transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
  overflow: 'hidden',
};

function scatterQuantum(ref: RefObject<QuantumCanvasHandle | null>) {
  ref.current?.scatter();
}

function toggleQuantum(ref: RefObject<QuantumCanvasHandle | null>): boolean {
  return !!ref.current?.togglePause();
}

function resetQuantum(ref: RefObject<QuantumCanvasHandle | null>) {
  ref.current?.resetCamera();
}

export default function UniversePage() {
  const enabled = useFeatureFlag('starfield');
  const quantumRef = useRef<QuantumCanvasHandle>(null);

  const [selectedStar, setSelectedStar] = useState<Star | null>(null);
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [density, setDensity] = useState(100);
  const [activeTypes, setActiveTypes] = useState<Set<StarType>>(new Set());
  const [paused, setPaused] = useState(false);
  const deferredDensity = useDeferredValue(density);

  const fullData = useMemo(() => generateMockUniverse(500, 7), []);

  // Filter data by active types (empty = show all)
  const filteredData = useMemo(() => {
    if (activeTypes.size === 0) return fullData;
    return {
      ...fullData,
      stars: fullData.stars.filter(s => activeTypes.has(s.type)),
    };
  }, [fullData, activeTypes]);

  const handleToggleType = useCallback((type: StarType) => {
    setActiveTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const handleScatter = useCallback(() => {
    scatterQuantum(quantumRef);
  }, []);

  const handleFreeze = useCallback(() => {
    setPaused(toggleQuantum(quantumRef));
  }, []);
  const handleReset = useCallback(() => resetQuantum(quantumRef), []);
  const handleStarClick = useCallback((star: Star) => setSelectedStar(star), []);

  if (!enabled) {
    return (
      <div className="p-8 text-center text-[var(--color-muted-foreground)]">
        <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-40" />
        <p className="text-lg font-medium">The Universe is disabled</p>
        <p className="text-sm mt-1">Enable the starfield feature flag to explore.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 top-14" style={{ background: '#050508', fontFamily: "'Outfit', sans-serif" }}>

      {/* === 3D Canvas === */}
      <QuantumCanvas
        ref={quantumRef}
        data={filteredData}
        paletteIndex={paletteIndex}
        densityFactor={deferredDensity / 100}
        onStarClick={handleStarClick}
      />

      {/* === Top-left: Title panel === */}
      <div
        className="absolute z-10"
        style={{ ...glassPanel, top: 32, left: 32, width: 260, padding: 24 }}
      >
        <div
          style={{
            fontWeight: 500,
            fontSize: 18,
            marginBottom: 4,
            letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #fff 30%, #a5b4fc 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Quantum Neural Network
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,0.5)', fontWeight: 300 }}>
          Drag to explore. Click a node to inspect.
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 10 }}>
          {filteredData.constellations.length} constellations &middot; {filteredData.stars.length} entities
        </div>
      </div>

      {/* === Top-right: Controls panel === */}
      <div
        className="absolute z-10"
        style={{ ...glassPanel, top: 32, right: 32, width: 240, padding: 24 }}
      >
        {/* Theme selector */}
        <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginBottom: 12 }}>
          Crystal Theme
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, justifyItems: 'center' }}>
          {THEME_BUTTONS.map(t => (
            <button
              key={t.index}
              aria-label={t.label}
              onClick={() => setPaletteIndex(t.index)}
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                background: t.gradient,
                boxShadow: paletteIndex === t.index
                  ? '0 0 0 3px rgba(255,255,255,0.9), 0 0 15px rgba(255,255,255,0.3), 0 4px 10px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.4)'
                  : '0 4px 10px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.2)',
                transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transform: paletteIndex === t.index ? 'scale(1.1)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        {/* Density slider */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 300 }}>
            <span>Density</span>
            <span style={{ color: 'white', fontWeight: 500, textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>{density}%</span>
          </div>
          <input
            type="range"
            min={30}
            max={100}
            value={density}
            onChange={e => setDensity(Number(e.target.value))}
            aria-label="Network Density"
            style={{
              WebkitAppearance: 'none',
              width: '100%',
              height: 6,
              background: `linear-gradient(90deg, rgba(255,255,255,0.3) ${density}%, rgba(255,255,255,0.05) ${density}%)`,
              borderRadius: 10,
              outline: 'none',
              marginTop: 10,
              cursor: 'pointer',
            }}
          />
        </div>

        {/* Type filter chips */}
        <div style={{ marginTop: 20, fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginBottom: 10 }}>
          Filter Types
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {TYPE_CHIPS.map(chip => {
            const active = activeTypes.size === 0 || activeTypes.has(chip.type);
            return (
              <button
                key={chip.type}
                onClick={() => handleToggleType(chip.type)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  borderRadius: 50,
                  border: `1px solid ${active ? chip.color + '80' : 'rgba(255,255,255,0.08)'}`,
                  background: active ? chip.color + '18' : 'rgba(255,255,255,0.02)',
                  color: active ? chip.color : 'rgba(255,255,255,0.35)',
                  fontSize: 11,
                  fontWeight: 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? chip.color : 'rgba(255,255,255,0.2)' }} />
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* === Bottom center: Control buttons === */}
      <div
        className="absolute z-20"
        style={{
          bottom: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 16,
          padding: 8,
          alignItems: 'center',
        }}
      >
        <button
          onClick={handleScatter}
          style={{
            backdropFilter: 'blur(20px) saturate(140%)',
            WebkitBackdropFilter: 'blur(20px) saturate(140%)',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderTop: '1px solid rgba(255,255,255,0.25)',
            color: 'rgba(255,255,255,0.9)',
            padding: '12px 24px',
            borderRadius: 50,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            fontFamily: 'inherit',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            transition: 'all 0.3s ease',
            boxShadow: '0 8px 20px rgba(0,0,0,0.3), inset 0 0 10px rgba(255,255,255,0.02)',
            minWidth: 100,
            textAlign: 'center',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget;
            el.style.background = 'rgba(255,255,255,0.1)';
            el.style.borderColor = 'rgba(255,255,255,0.4)';
            el.style.transform = 'translateY(-4px)';
            el.style.boxShadow = '0 15px 30px rgba(0,0,0,0.4), 0 0 20px rgba(255,255,255,0.1)';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget;
            el.style.background = 'rgba(255,255,255,0.04)';
            el.style.borderColor = 'rgba(255,255,255,0.1)';
            el.style.transform = 'none';
            el.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3), inset 0 0 10px rgba(255,255,255,0.02)';
          }}
        >
          <span style={{ position: 'relative', zIndex: 2 }}>Scatter</span>
        </button>
        <button
          onClick={handleFreeze}
          style={{
            backdropFilter: 'blur(20px) saturate(140%)',
            WebkitBackdropFilter: 'blur(20px) saturate(140%)',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderTop: '1px solid rgba(255,255,255,0.25)',
            color: 'rgba(255,255,255,0.9)',
            padding: '12px 24px',
            borderRadius: 50,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            fontFamily: 'inherit',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            transition: 'all 0.3s ease',
            boxShadow: '0 8px 20px rgba(0,0,0,0.3), inset 0 0 10px rgba(255,255,255,0.02)',
            minWidth: 100,
            textAlign: 'center',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget;
            el.style.background = 'rgba(255,255,255,0.1)';
            el.style.borderColor = 'rgba(255,255,255,0.4)';
            el.style.transform = 'translateY(-4px)';
            el.style.boxShadow = '0 15px 30px rgba(0,0,0,0.4), 0 0 20px rgba(255,255,255,0.1)';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget;
            el.style.background = 'rgba(255,255,255,0.04)';
            el.style.borderColor = 'rgba(255,255,255,0.1)';
            el.style.transform = 'none';
            el.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3), inset 0 0 10px rgba(255,255,255,0.02)';
          }}
        >
          <span style={{ position: 'relative', zIndex: 2 }}>{paused ? 'Play' : 'Freeze'}</span>
        </button>
        <button
          onClick={handleReset}
          style={{
            backdropFilter: 'blur(20px) saturate(140%)',
            WebkitBackdropFilter: 'blur(20px) saturate(140%)',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderTop: '1px solid rgba(255,255,255,0.25)',
            color: 'rgba(255,255,255,0.9)',
            padding: '12px 24px',
            borderRadius: 50,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            fontFamily: 'inherit',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            transition: 'all 0.3s ease',
            boxShadow: '0 8px 20px rgba(0,0,0,0.3), inset 0 0 10px rgba(255,255,255,0.02)',
            minWidth: 100,
            textAlign: 'center',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget;
            el.style.background = 'rgba(255,255,255,0.1)';
            el.style.borderColor = 'rgba(255,255,255,0.4)';
            el.style.transform = 'translateY(-4px)';
            el.style.boxShadow = '0 15px 30px rgba(0,0,0,0.4), 0 0 20px rgba(255,255,255,0.1)';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget;
            el.style.background = 'rgba(255,255,255,0.04)';
            el.style.borderColor = 'rgba(255,255,255,0.1)';
            el.style.transform = 'none';
            el.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3), inset 0 0 10px rgba(255,255,255,0.02)';
          }}
        >
          <span style={{ position: 'relative', zIndex: 2 }}>Reset</span>
        </button>
      </div>

      {/* === Star detail drawer === */}
      <StarDetailDrawer star={selectedStar} onClose={() => setSelectedStar(null)} />

      {/* Slider thumb styling */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          box-shadow: 0 0 15px rgba(255,255,255,0.8), 0 2px 5px rgba(0,0,0,0.3);
          transition: all 0.2s ease;
          margin-top: -6px;
          position: relative;
          z-index: 2;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 20px rgba(255,255,255,1);
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 15px rgba(255,255,255,0.8), 0 2px 5px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
}
