'use client';

import type { MapNode } from '@/lib/api/educationMaps';

interface MapCompareTrayProps {
  nodes: MapNode[];
  onRemove: (nodeId: string) => void;
}

export function MapCompareTray({ nodes, onRemove }: MapCompareTrayProps) {
  if (nodes.length === 0) {
    return null;
  }

  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-[rgba(6,10,18,0.88)] p-4 text-white shadow-[0_24px_80px_-36px_rgba(0,0,0,0.85)] backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[0.7rem] uppercase tracking-[0.3em] text-cyan-300/70">Compare queue</p>
          <h3 className="mt-1 text-lg font-semibold">Focused differences across selected nodes</h3>
        </div>
        <p className="text-sm text-slate-400">{nodes.length}/4 selected</p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {nodes.map((node) => (
          <article key={node.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{node.label}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{node.categoryKey ?? node.entityType}</p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(node.id)}
                className="rounded-full border border-white/10 px-2 py-1 text-xs text-slate-300 transition hover:border-white/20 hover:text-white"
              >
                Remove
              </button>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-400">Importance</dt>
                <dd className="mt-1 font-medium">{Math.round(node.metrics.importance * 100)}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Evidence</dt>
                <dd className="mt-1 font-medium">{Math.round(node.metrics.evidence * 100)}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Centrality</dt>
                <dd className="mt-1 font-medium">{Math.round(node.metrics.centrality * 100)}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Confidence</dt>
                <dd className="mt-1 font-medium">{Math.round(node.confidence.positioning * 100)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}
