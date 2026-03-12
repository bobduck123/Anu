'use client';

import Link from 'next/link';
import { startTransition, useEffect, useState } from 'react';
import { ArrowRight, Coins, Orbit, Share2, Sparkles } from 'lucide-react';
import EcologySummaryPanel from '@/components/impact/EcologySummaryPanel';
import { brand, manaraPath } from '@/lib/brand';
import floraFaunaApi, {
  FloraFaunaChannel,
  FloraFaunaFeedResponse,
  FloraFaunaPool,
  formatFloraFaunaApiError,
} from '@/lib/api/floraFaunaApi';

export default function FloraFaunaFeedPage() {
  const [feed, setFeed] = useState<FloraFaunaFeedResponse['feed']>([]);
  const [channel, setChannel] = useState<FloraFaunaChannel | null>(null);
  const [pool, setPool] = useState<FloraFaunaPool | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    startTransition(() => {
      setError(null);
    });

    void Promise.allSettled([
      floraFaunaApi.getFeed({ signal: controller.signal }),
      floraFaunaApi.listChannels(1, { signal: controller.signal }),
      floraFaunaApi.listPools(1, { signal: controller.signal }),
    ]).then(([feedResult, channelsResult, poolsResult]) => {
      if (controller.signal.aborted) {
        return;
      }

      startTransition(() => {
        if (feedResult.status === 'fulfilled') {
          setFeed(feedResult.value.feed);
        } else {
          setFeed([]);
        }

        if (channelsResult.status === 'fulfilled') {
          setChannel(channelsResult.value.channels[0] || null);
        } else {
          setChannel(null);
        }

        if (poolsResult.status === 'fulfilled') {
          setPool(poolsResult.value.pools[0] || null);
        } else {
          setPool(null);
        }

        const firstError = [feedResult, channelsResult, poolsResult].find(
          (result): result is PromiseRejectedResult => result.status === 'rejected',
        );
        setError(firstError ? formatFloraFaunaApiError(firstError.reason, `Unable to load ${brand.name} feed`) : null);
      });
    });

    return () => controller.abort();
  }, []);

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'radial-gradient(circle at top left, rgba(79,124,95,0.18), transparent 24%), radial-gradient(circle at top right, rgba(30,58,95,0.14), transparent 28%), var(--color-background)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-28 pb-20 space-y-8">
        {error && (
          <div className="card-civic">
            <p className="text-sm text-[var(--color-danger)]">{error}</p>
          </div>
        )}

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] items-start">
          <div className="card-civic overflow-hidden relative">
            <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#2d5a3d_0%,#1e3a5f_45%,#d97706_100%)]" />
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-forest)] bg-[var(--color-forest-light)] mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              {brand.memeticsTitle}
            </div>
            <h1
              className="text-4xl md:text-6xl text-[var(--color-earth-dark)] max-w-4xl"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Memes stay free.
              <br />
              Attention funds the commons.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-[var(--color-earth-medium)] leading-relaxed">
              This subsystem tracks creator channels, remix lineage, nutrient-driven ecology identity,
              and ledger-backed liquidity pools without ever turning the meme itself into merchandise.
            </p>

            <div className="grid sm:grid-cols-3 gap-4 mt-8">
              {[
                ['Share Policy', 'Free + forkable'],
                ['Revenue Split', 'Creator / Platform / Pool'],
                ['Audit Trail', 'Domain events on every major action'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[1.25rem] border border-[var(--color-border)] bg-white/70 px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-earth-medium)]">{label}</p>
                  <p className="text-lg font-semibold text-[var(--color-earth-dark)] mt-2">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <EcologySummaryPanel ecology={channel?.ecology ?? null} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-earth-medium)] mb-2">
                  Meme Feed
                </p>
                <h2 className="text-3xl text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
                  Shareable spores
                </h2>
              </div>
              {channel && (
                <Link
                  href={manaraPath(`/channels/${channel.id}`)}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-institutional)]"
                >
                  Visit creator channel
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>

            <div className="grid gap-5">
              {feed.length === 0 ? (
                <div className="card-civic">
                  <p className="text-[var(--color-earth-medium)]">
                    No memes published yet, or the memetics service is unavailable.
                  </p>
                </div>
              ) : feed.map((meme) => (
                <Link
                  key={meme.id}
                  href={manaraPath(`/memes/${meme.id}`)}
                  className="card-civic group"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(240,244,239,0.92))',
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-[var(--color-sage-light)] text-[var(--color-forest)]">
                      <Share2 className="w-3 h-3" />
                      Free meme
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-[var(--color-institutional-light)] text-[var(--color-institutional)]">
                      <Orbit className="w-3 h-3" />
                      {meme.ecology?.ecologyIdentity || 'Awaiting ecology'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-2xl">
                      <h3 className="text-2xl text-[var(--color-earth-dark)] group-hover:text-[var(--color-institutional)] transition-colors">
                        {meme.title}
                      </h3>
                      <p className="mt-3 text-[var(--color-earth-medium)] leading-relaxed">
                        {meme.summary || 'Free cultural matter for cooperative propagation.'}
                      </p>
                    </div>
                    <div className="rounded-[1.25rem] border border-[var(--color-border)] bg-white/80 px-4 py-4 min-w-[180px]">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-earth-medium)]">
                        Attention score
                      </p>
                      <p className="text-3xl font-semibold font-mono-data text-[var(--color-earth-dark)] mt-2">
                        {Math.round(Number(meme.attentionScore || 0) * 100)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-3 text-sm">
                    <span className="text-[var(--color-earth-medium)]">
                      Channel: <strong className="text-[var(--color-earth-dark)]">{meme.channel?.title}</strong>
                    </span>
                    <span className="inline-flex items-center gap-2 text-[var(--color-institutional)] font-semibold">
                      Open meme page
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <aside className="space-y-5">
            {channel && (
              <div className="card-civic">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-earth-medium)] mb-2">
                  Creator Channel
                </p>
                <h3 className="text-2xl text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
                  {channel.title}
                </h3>
                <p className="text-[var(--color-earth-medium)] mt-3 leading-relaxed">
                  {channel.description}
                </p>
                <div className="mt-5 flex items-center justify-between text-sm">
                  <span className="text-[var(--color-earth-medium)]">Share policy</span>
                  <strong className="text-[var(--color-forest)]">{channel.sharePolicy}</strong>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-[var(--color-earth-medium)]">Open moderation flags</span>
                  <strong className="text-[var(--color-earth-dark)] font-mono-data">
                    {channel.moderation.openFlags}
                  </strong>
                </div>
              </div>
            )}

            {pool && (
              <Link href={manaraPath(`/pools/${pool.id}`)} className="card-civic block">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-earth-medium)] mb-2">
                      Mutual-Aid Liquidity Pool
                    </p>
                    <h3 className="text-2xl text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
                      {pool.name}
                    </h3>
                  </div>
                  <Coins className="w-7 h-7 text-[var(--color-accent)]" />
                </div>
                <p className="text-[var(--color-earth-medium)] mt-3">{pool.description}</p>
                <div className="mt-6 pt-4 border-t border-[var(--color-border)] flex items-end justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-earth-medium)]">
                      Available balance
                    </p>
                    <p className="text-3xl font-semibold font-mono-data text-[var(--color-earth-dark)] mt-2">
                      ${(pool.availableBalanceCents / 100).toLocaleString()}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-institutional)]">
                    Inspect ledger
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            )}
          </aside>
        </section>
      </div>
    </div>
  );
}
