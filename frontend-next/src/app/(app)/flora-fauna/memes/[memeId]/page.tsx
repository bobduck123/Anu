'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { startTransition, useEffect, useState } from 'react';
import { ArrowRight, BadgeDollarSign, GitBranchPlus, Share2 } from 'lucide-react';
import EcologySummaryPanel from '@/components/impact/EcologySummaryPanel';
import { manaraPath } from '@/lib/brand';
import floraFaunaApi, { FloraFaunaMemePage, formatFloraFaunaApiError } from '@/lib/api/floraFaunaApi';
import { toActionableSurfaceError } from '@/lib/ui/actionableErrors';

export default function FloraFaunaMemePageRoute() {
  const params = useParams<{ memeId: string }>();
  const memeId = params?.memeId || '';
  const [meme, setMeme] = useState<FloraFaunaMemePage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!memeId) {
      return;
    }
    const controller = new AbortController();

    startTransition(() => {
      setMeme(null);
      setError(null);
    });

    void floraFaunaApi.getMeme(memeId, { signal: controller.signal }).then((data) => {
      if (controller.signal.aborted) return;
      startTransition(() => setMeme(data));
    }).catch((err: unknown) => {
      if (controller.signal.aborted) return;
      setError(formatFloraFaunaApiError(err, 'Unable to load meme'));
    });

    return () => controller.abort();
  }, [memeId]);

  if (!memeId) {
    return <div className="min-h-screen pt-28 px-4 md:px-8">Missing meme identifier.</div>;
  }

  if (!meme && !error) {
    return <div className="min-h-screen pt-28 px-4 md:px-8">Loading meme...</div>;
  }

  if (!meme) {
    const actionableError = toActionableSurfaceError({
      area: 'Meme detail',
      rawMessage: error,
      fallbackHref: manaraPath(),
      fallbackLabel: 'Back to Manara feed',
    });

    return (
      <div className="min-h-screen pt-28 px-4 md:px-8">
        <div className="card-civic max-w-2xl mx-auto">
          <h1 className="text-2xl text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
            {actionableError.headline}
          </h1>
          <p className="mt-3 text-sm text-[var(--color-earth-medium)]">{actionableError.detail}</p>
          <Link href={actionableError.fallbackHref} className="mt-4 inline-flex btn-pill btn-pill-outline text-sm">
            {actionableError.fallbackLabel}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'radial-gradient(circle at top center, rgba(224,177,21,0.12), transparent 22%), linear-gradient(180deg, rgba(246,212,203,1) 0%, rgba(246,212,203,1) 100%)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-28 pb-20 space-y-8">
        <section className="card-civic">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-[var(--color-sage-light)] text-[var(--color-forest)]">
                  <Share2 className="w-3 h-3" />
                  Free + shareable
                </span>
                <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-[var(--color-accent-light)] text-[var(--color-accent)]">
                  <BadgeDollarSign className="w-3 h-3" />
                  Revenue is downstream only
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
                {meme.title}
              </h1>
              <p className="mt-4 text-lg text-[var(--color-earth-medium)]">{meme.summary}</p>
              <div className="mt-6 rounded-[1.75rem] border border-[var(--color-border)] bg-[color:rgba(246,212,203,0.8)] px-6 py-6">
                <p className="text-[var(--color-earth-dark)] leading-relaxed whitespace-pre-line">
                  {meme.body}
                </p>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[color:rgba(246,212,203,0.75)] px-5 py-5 min-w-[260px]">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-earth-medium)]">
                Channel
              </p>
              <h2 className="text-2xl text-[var(--color-earth-dark)] mt-2">{meme.channel?.title}</h2>
              <p className="text-sm text-[var(--color-earth-medium)] mt-4">
                Attention score
              </p>
              <p className="text-3xl font-semibold font-mono-data text-[var(--color-earth-dark)] mt-1">
                {Math.round(Number(meme.attentionScore || 0) * 100)}
              </p>
              <Link
                href={manaraPath(`/channels/${meme.channel?.id || meme.channelId}`)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-institutional)] mt-5"
              >
                Visit channel
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        <EcologySummaryPanel ecology={meme.ecology ?? null} compact />

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="card-civic">
            <div className="flex items-center gap-2 mb-4">
              <GitBranchPlus className="w-4 h-4 text-[var(--color-institutional)]" />
              <h3 className="text-2xl text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
                Lineage
              </h3>
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-earth-medium)] mb-3">
                  Parents
                </p>
                <div className="space-y-3">
                  {meme.lineage.parents.length === 0 ? (
                    <p className="text-sm text-[var(--color-earth-medium)]">This is a seed meme.</p>
                  ) : (
                    meme.lineage.parents.map((edge) => (
                      <Link
                        key={edge.parentMeme.id}
                        href={manaraPath(`/memes/${edge.parentMeme.id}`)}
                        className="block rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-4"
                      >
                        <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-earth-medium)]">
                          {edge.relationType}
                        </p>
                        <p className="text-lg font-semibold text-[var(--color-earth-dark)] mt-1">
                          {edge.parentMeme.title}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-earth-medium)] mb-3">
                  Children
                </p>
                <div className="space-y-3">
                  {meme.lineage.children.length === 0 ? (
                    <p className="text-sm text-[var(--color-earth-medium)]">No descendant remixes recorded yet.</p>
                  ) : (
                    meme.lineage.children.map((edge) => (
                      <Link
                        key={edge.childMeme.id}
                        href={manaraPath(`/memes/${edge.childMeme.id}`)}
                        className="block rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-4"
                      >
                        <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-earth-medium)]">
                          {edge.relationType}
                        </p>
                        <p className="text-lg font-semibold text-[var(--color-earth-dark)] mt-1">
                          {edge.childMeme.title}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card-civic">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-earth-medium)] mb-2">
                Revenue Ethic
              </p>
              <h3 className="text-2xl text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
                Nothing here is for sale
              </h3>
              <p className="mt-4 text-[var(--color-earth-medium)] leading-relaxed">
                The artifact is free to copy. Revenue is recognized only when subscriptions or downstream attention turn into attributable value, then split across creator, platform upkeep, and mutual-aid liquidity.
              </p>
            </div>

            <div className="card-civic">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-earth-medium)] mb-3">
                Risk Flags
              </p>
              <div className="space-y-3">
                {(meme.riskFlags || []).length === 0 ? (
                  <p className="text-sm text-[var(--color-earth-medium)]">No open moderation flags.</p>
                ) : (
                  meme.riskFlags?.map((flag) => (
                    <div key={flag.id} className="rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-[var(--color-earth-dark)]">{flag.flagType}</p>
                        <span className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent)]">{flag.severity}</span>
                      </div>
                      <p className="text-sm text-[var(--color-earth-medium)] mt-2">{flag.reason}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
