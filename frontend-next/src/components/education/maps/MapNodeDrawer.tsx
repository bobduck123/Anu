'use client';

import Link from 'next/link';
import { X, Orbit, Scale, Sigma, Sparkles } from 'lucide-react';
import type { MapNode } from '@/lib/api/educationMaps';

interface RelatedNode {
  relation: string;
  label: string;
  confidence: number;
}

interface MapNodeDrawerProps {
  node: MapNode | null;
  related: RelatedNode[];
  onClose: () => void;
  onCompareToggle: (nodeId: string) => void;
  compared: boolean;
}

export function MapNodeDrawer({ node, related, onClose, onCompareToggle, compared }: MapNodeDrawerProps) {
  if (!node) {
    return null;
  }

  return (
    <aside className="absolute right-0 top-0 z-30 flex h-full w-full max-w-[24rem] flex-col overflow-hidden border-l border-white/10 bg-[linear-gradient(180deg,rgba(4,6,15,0.98),rgba(8,12,24,0.98))] text-white shadow-2xl shadow-black/50 backdrop-blur-xl">
      <div className="flex items-start justify-between border-b border-white/10 px-5 py-4">
        <div className="min-w-0">
          <p className="text-[0.7rem] uppercase tracking-[0.3em] text-cyan-300/70">
            {node.categoryKey ?? node.entityType}
          </p>
          <h3 className="mt-1 truncate text-lg font-semibold">{node.label}</h3>
          {node.summary && <p className="mt-2 text-sm text-slate-300">{node.summary}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/10 p-2 text-slate-300 transition hover:border-white/20 hover:text-white"
          aria-label="Close selected node panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400">Importance</p>
            <p className="mt-2 text-xl font-semibold">{Math.round(node.metrics.importance * 100)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400">Evidence</p>
            <p className="mt-2 text-xl font-semibold">{Math.round(node.metrics.evidence * 100)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400">Positioning</p>
            <p className="mt-2 text-xl font-semibold">{Math.round(node.confidence.positioning * 100)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400">Radius</p>
            <p className="mt-2 text-xl font-semibold">{node.metrics.renderRadius.toFixed(1)}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-cyan-200">
            <Orbit className="h-4 w-4" />
            Axis placement
          </div>
          <div className="mt-3 space-y-3">
            {node.axisMeta.map((axis) => (
              <div key={axis.key} className="rounded-xl border border-white/8 bg-black/20 p-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
                  <span>{axis.key}</span>
                  <span>{Math.round(axis.confidence * 100)}%</span>
                </div>
                <p className="mt-2 text-sm text-slate-200">{axis.explanation}</p>
              </div>
            ))}
          </div>
        </div>

        {node.longDescription && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-violet-200">
              <Scale className="h-4 w-4" />
              Long description
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">{node.longDescription}</p>
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
            <Sigma className="h-4 w-4" />
            Related nodes
          </div>
          <div className="mt-3 space-y-2">
            {related.length === 0 && (
              <p className="text-sm text-slate-400">No typed relations are visible in the current filtered view.</p>
            )}
            {related.map((entry) => (
              <div key={`${entry.relation}-${entry.label}`} className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
                <p className="text-sm font-medium text-white">{entry.label}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                  {entry.relation.replaceAll('_', ' ')} · {Math.round(entry.confidence * 100)}%
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
            <Sparkles className="h-4 w-4" />
            Sources & provenance
          </div>
          <div className="mt-3 space-y-3">
            {node.sources.map((source) => (
              <div key={source.id} className="rounded-xl border border-white/8 bg-black/20 p-3 text-sm">
                <p className="font-medium text-white">{source.title ?? source.domain ?? source.url}</p>
                {source.snippet && <p className="mt-2 text-slate-300">{source.snippet}</p>}
                <Link href={source.url} target="_blank" className="mt-2 inline-flex text-cyan-300 hover:text-cyan-200">
                  {source.domain ?? source.url}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 px-5 py-4">
        <button
          type="button"
          onClick={() => onCompareToggle(node.id)}
          className="w-full rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/50 hover:bg-cyan-400/15"
        >
          {compared ? 'Remove From Compare' : 'Add To Compare'}
        </button>
      </div>
    </aside>
  );
}
