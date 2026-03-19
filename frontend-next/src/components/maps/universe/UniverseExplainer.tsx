'use client';

import Link from 'next/link';
import { ExternalLink, Layers3, Sparkles, X } from 'lucide-react';
import { formatPercent } from '../presentation';
import { labelUniverseAnchorMode, universePresentationTerms } from './presentationTerms';
import type { UniverseStar } from './types';

interface UniverseExplainerProps {
  star: UniverseStar | null;
  onClose?: () => void;
  className?: string;
}

export function UniverseExplainer({ star, onClose, className }: UniverseExplainerProps) {
  if (!star) {
    return null;
  }

  const { explainer, placement } = star;
  const primarySourceLabel =
    explainer.primarySource?.title ||
    explainer.primarySource?.domain ||
    explainer.primarySource?.url ||
    'Open source';

  return (
    <div
      className={[
        'overflow-hidden rounded-[1.75rem] border border-white/12 bg-[linear-gradient(180deg,rgba(7,10,18,0.96),rgba(2,6,12,0.98))] text-white shadow-[0_28px_90px_rgba(0,0,0,0.45)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: star.color }}
              aria-hidden="true"
            />
            {explainer.categoryLabel ? (
              <span className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200/90">
                {explainer.categoryLabel}
              </span>
            ) : null}
            <span className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
              {explainer.starTypeLabel}
            </span>
            <span className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
              {labelUniverseAnchorMode(placement.anchorMode)}
            </span>
          </div>
          <h3 className="mt-3 text-xl font-semibold text-white">{explainer.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {explainer.longDescription || explainer.summary || 'This star does not have explainer copy yet.'}
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${universePresentationTerms.explainer.toLowerCase()}`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="space-y-4 px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.15rem] border border-white/10 bg-white/5 p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">{universePresentationTerms.evidence}</p>
            <p className="mt-2 text-lg font-semibold text-white">{formatPercent(explainer.metrics.evidence)}</p>
          </div>
          <div className="rounded-[1.15rem] border border-white/10 bg-white/5 p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">{universePresentationTerms.freshness}</p>
            <p className="mt-2 text-lg font-semibold text-white">{formatPercent(explainer.metrics.freshness)}</p>
          </div>
          <div className="rounded-[1.15rem] border border-white/10 bg-white/5 p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">{universePresentationTerms.sourceDensity}</p>
            <p className="mt-2 text-lg font-semibold text-white">{formatPercent(explainer.metrics.sourceDensity)}</p>
          </div>
        </div>

        <div className="rounded-[1.15rem] border border-white/10 bg-white/5 p-3">
          <div className="mb-3 flex items-center gap-2 text-white">
            <Layers3 className="h-4 w-4 text-cyan-300" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">{universePresentationTerms.placement}</p>
          </div>
          <p className="rounded-xl border border-white/6 bg-black/10 px-3 py-2 text-sm leading-6 text-slate-300">
            {explainer.placementRationale}
          </p>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            {explainer.axisReasoning.map((axis) => (
              <div key={axis.key} className="rounded-xl border border-white/6 bg-black/10 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-white">{axis.label}</p>
                  <span className="text-xs text-slate-400">{formatPercent(axis.score)}</span>
                </div>
                <p className="mt-1 leading-6 text-slate-300">{axis.explanation}</p>
              </div>
            ))}
          </div>
        </div>

        {explainer.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {explainer.tags.slice(0, 8).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="rounded-[1.15rem] border border-cyan-400/20 bg-cyan-400/8 p-3 text-sm text-cyan-50">
          <div className="flex items-center gap-2 text-cyan-100">
            <Sparkles className="h-4 w-4" />
            <p className="font-medium">{universePresentationTerms.explainer}</p>
          </div>
          <p className="mt-2 leading-6 text-cyan-50/85">
            Source traceability, placement logic, and domain context stay visible together so the universe can be understood as a world model rather than as a decorative starfield.
          </p>
        </div>
      </div>

      <div className="border-t border-white/10 px-5 py-4">
        {explainer.primarySource?.url ? (
          <Link
            href={explainer.primarySource.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white transition hover:border-cyan-300/70 hover:bg-white/8"
          >
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">Primary source</p>
              <p className="mt-1 truncate font-medium text-white">{primarySourceLabel}</p>
              {explainer.primarySource.snippet ? (
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-300">{explainer.primarySource.snippet}</p>
              ) : null}
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 text-cyan-200" />
          </Link>
        ) : (
          <div className="rounded-[1.1rem] border border-dashed border-white/10 px-4 py-3 text-sm text-slate-400">
            No primary source link is available for this star yet.
          </div>
        )}
      </div>
    </div>
  );
}
