'use client';

import { X, Calendar, Users, TrendingUp } from 'lucide-react';
import type { Star } from '@/data/adapters/starfieldAdapter';

interface StarDetailDrawerProps {
  star: Star | null;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  event: { label: 'Event', color: '#667eea' },
  action: { label: 'Action', color: '#48bb78' },
  community: { label: 'Community', color: '#ed8936' },
  donor: { label: 'Donor', color: '#f6e05e' },
  relief: { label: 'Relief', color: '#fc8181' },
  education: { label: 'Education', color: '#b794f4' },
  marketplace: { label: 'Marketplace', color: '#4fd1c5' },
};

export function StarDetailDrawer({ star, onClose }: StarDetailDrawerProps) {
  if (!star) return null;

  const typeInfo = TYPE_LABELS[star.type] ?? { label: star.type, color: '#888' };
  const meta = star.metadata as { created?: string; participants?: number; impact?: number };

  return (
    <div
      className="absolute top-0 right-0 bottom-0 w-80 z-30 flex flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(10,10,30,0.95) 0%, rgba(5,5,16,0.98) 100%)',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        animation: 'slideInRight 0.3s ease-out',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-white/10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: typeInfo.color }}
            />
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: typeInfo.color + '20', color: typeInfo.color }}
            >
              {typeInfo.label}
            </span>
          </div>
          <h3 className="text-white font-semibold text-sm leading-snug truncate">
            {star.label}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          aria-label="Close drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {meta.participants !== undefined && (
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-1.5 mb-1">
                <Users className="w-3.5 h-3.5 text-white/40" />
                <span className="text-[10px] uppercase tracking-wider text-white/40">Participants</span>
              </div>
              <span className="text-lg font-semibold text-white">{meta.participants}</span>
            </div>
          )}
          {meta.impact !== undefined && (
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-white/40" />
                <span className="text-[10px] uppercase tracking-wider text-white/40">Impact</span>
              </div>
              <span className="text-lg font-semibold text-white">{meta.impact}</span>
            </div>
          )}
        </div>

        {/* Created date */}
        {meta.created && (
          <div className="flex items-center gap-2 text-xs text-white/50">
            <Calendar className="w-3.5 h-3.5" />
            <span>{new Date(meta.created).toLocaleDateString()}</span>
          </div>
        )}

        {/* Coordinates */}
        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Position</div>
          <div className="grid grid-cols-3 gap-2 text-xs font-mono text-white/70">
            <div>
              <span className="text-white/30">X</span> {star.x.toFixed(1)}
            </div>
            <div>
              <span className="text-white/30">Y</span> {star.y.toFixed(1)}
            </div>
            <div>
              <span className="text-white/30">Z</span> {star.z.toFixed(1)}
            </div>
          </div>
        </div>

        {/* Connections */}
        {star.connections.length > 0 && (
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">
              Connected to {star.connections.length} entities
            </div>
            <div className="space-y-1">
              {star.connections.slice(0, 5).map((id) => (
                <div key={id} className="text-xs text-white/50">{id}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
