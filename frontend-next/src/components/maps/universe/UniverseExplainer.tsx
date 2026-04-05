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
        'overflow-hidden rounded-[1.75rem] border border-[color:rgba(246,212,203,0.12)] bg-[linear-gradient(180deg,rgba(30,2,39,0.96),rgba(30,2,39,0.98))] text-[var(--color-foreground)] shadow-[0_28px_90px_rgba(30,2,39,0.45)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-start justify-between gap-3 border-b border-[color:rgba(246,212,203,0.1)] px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: star.color }}
              aria-hidden="true"
            />
            {explainer.categoryLabel ? (
              <span className="rounded-full border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.06)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:rgba(124,65,60,0.9)]">
                {explainer.categoryLabel}
              </span>
            ) : null}
            <span className="rounded-full border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.06)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:rgba(246,212,203,0.6)]">
              {explainer.starTypeLabel}
            </span>
            <span className="rounded-full border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.06)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:rgba(246,212,203,0.45)]">
              {labelUniverseAnchorMode(placement.anchorMode)}
            </span>
          </div>
          <h3 className="mt-3 text-xl font-semibold text-[var(--color-foreground)]">{explainer.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[color:rgba(246,212,203,0.76)]">
            {explainer.longDescription || explainer.summary || 'This star does not have explainer copy yet.'}
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${universePresentationTerms.explainer.toLowerCase()}`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.05)] text-[color:rgba(246,212,203,0.7)] transition hover:bg-[color:rgba(246,212,203,0.1)] hover:text-[var(--color-foreground)]"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="space-y-4 px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.15rem] border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.05)] p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[color:rgba(246,212,203,0.45)]">{universePresentationTerms.evidence}</p>
            <p className="mt-2 text-lg font-semibold text-[var(--color-foreground)]">{formatPercent(explainer.metrics.evidence)}</p>
          </div>
          <div className="rounded-[1.15rem] border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.05)] p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[color:rgba(246,212,203,0.45)]">{universePresentationTerms.freshness}</p>
            <p className="mt-2 text-lg font-semibold text-[var(--color-foreground)]">{formatPercent(explainer.metrics.freshness)}</p>
          </div>
          <div className="rounded-[1.15rem] border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.05)] p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[color:rgba(246,212,203,0.45)]">{universePresentationTerms.sourceDensity}</p>
            <p className="mt-2 text-lg font-semibold text-[var(--color-foreground)]">{formatPercent(explainer.metrics.sourceDensity)}</p>
          </div>
        </div>

        <div className="rounded-[1.15rem] border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.05)] p-3">
          <div className="mb-3 flex items-center gap-2 text-[var(--color-foreground)]">
            <Layers3 className="h-4 w-4 text-[#7c413c]" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:rgba(246,212,203,0.5)]">{universePresentationTerms.placement}</p>
          </div>
          <p className="rounded-xl border border-[color:rgba(246,212,203,0.06)] bg-[color:rgba(30,2,39,0.1)] px-3 py-2 text-sm leading-6 text-[color:rgba(246,212,203,0.76)]">
            {explainer.placementRationale}
          </p>
          <div className="mt-3 space-y-2 text-sm text-[color:rgba(246,212,203,0.76)]">
            {explainer.axisReasoning.map((axis) => (
              <div key={axis.key} className="rounded-xl border border-[color:rgba(246,212,203,0.06)] bg-[color:rgba(30,2,39,0.1)] px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-[var(--color-foreground)]">{axis.label}</p>
                  <span className="text-xs text-[color:rgba(246,212,203,0.64)]">{formatPercent(axis.score)}</span>
                </div>
                <p className="mt-1 leading-6 text-[color:rgba(246,212,203,0.76)]">{axis.explanation}</p>
              </div>
            ))}
          </div>
        </div>

        {explainer.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {explainer.tags.slice(0, 8).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.05)] px-3 py-1 text-xs text-[color:rgba(246,212,203,0.76)]"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="rounded-[1.15rem] border border-[color:rgba(124,65,60,0.2)] bg-[color:rgba(124,65,60,0.08)] p-3 text-sm text-[#7c413c]">
          <div className="flex items-center gap-2 text-[#7c413c]">
            <Sparkles className="h-4 w-4" />
            <p className="font-medium">{universePresentationTerms.explainer}</p>
          </div>
          <p className="mt-2 leading-6 text-[color:rgba(124,65,60,0.85)]">
            Source traceability, placement logic, and domain context stay visible together so the universe can be understood as a world model rather than as a decorative starfield.
          </p>
        </div>
      </div>

      <div className="border-t border-[color:rgba(246,212,203,0.1)] px-5 py-4">
        {explainer.primarySource?.url ? (
          <Link
            href={explainer.primarySource.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.05)] px-4 py-3 text-left text-sm text-[var(--color-foreground)] transition hover:border-[color:rgba(124,65,60,0.7)] hover:bg-[color:rgba(246,212,203,0.08)]"
          >
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:rgba(246,212,203,0.45)]">Primary source</p>
              <p className="mt-1 truncate font-medium text-[var(--color-foreground)]">{primarySourceLabel}</p>
              {explainer.primarySource.snippet ? (
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[color:rgba(246,212,203,0.76)]">{explainer.primarySource.snippet}</p>
              ) : null}
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 text-[#7c413c]" />
          </Link>
        ) : (
          <div className="rounded-[1.1rem] border border-dashed border-[color:rgba(246,212,203,0.1)] px-4 py-3 text-sm text-[color:rgba(246,212,203,0.64)]">
            No primary source link is available for this star yet.
          </div>
        )}
      </div>
    </div>
  );
}
