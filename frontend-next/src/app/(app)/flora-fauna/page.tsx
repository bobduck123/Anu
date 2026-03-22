'use client';

import Link from 'next/link';
import { startTransition, useEffect, useState } from 'react';
import { ArrowRight, Coins, Orbit, Share2, Sparkles } from 'lucide-react';
import EcologySummaryPanel from '@/components/impact/EcologySummaryPanel';
import { useAuth } from '@/contexts/AuthContext';
import { brand, manaraPath } from '@/lib/brand';
import { toActionableSurfaceError } from '@/lib/ui/actionableErrors';
import {
  AnuActionLink,
  AnuChip,
  AnuHeroMetric,
  AnuPageHero,
  AnuSectionHeading,
  AnuSurfacePanel,
} from '@/ui-system/anu/surfacePrimitives';
import floraFaunaApi, {
  FloraFaunaChannel,
  FloraFaunaFeedResponse,
  FloraFaunaPool,
  formatFloraFaunaApiError,
} from '@/lib/api/floraFaunaApi';

export default function FloraFaunaFeedPage() {
  const { isAuthenticated } = useAuth();
  const [feed, setFeed] = useState<FloraFaunaFeedResponse['feed']>([]);
  const [channel, setChannel] = useState<FloraFaunaChannel | null>(null);
  const [pool, setPool] = useState<FloraFaunaPool | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actionableError = error
    ? toActionableSurfaceError({
        area: 'Manara feed',
        rawMessage: error,
        fallbackHref: '/community',
        fallbackLabel: 'Open community fallback',
      })
    : null;

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
      className="manara-grid-hero min-h-screen"
      style={{
        background:
          'radial-gradient(circle at 20% 0%, rgba(242,199,134,0.14), transparent 28%), radial-gradient(circle at 86% 8%, rgba(63,110,160,0.18), transparent 34%), linear-gradient(180deg,#0a1322_0%,#08111e_60%,#08101a_100%)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-28 pb-20 space-y-8">
        {actionableError ? (
          <AnuSurfacePanel tone="quiet" className="border-amber-300/34 bg-[linear-gradient(152deg,rgba(39,29,12,0.92),rgba(24,17,8,0.92))] p-5 text-amber-100">
            <p className="text-sm font-semibold text-amber-200">{actionableError.headline}</p>
            <p className="mt-2 text-sm text-amber-100/92">{actionableError.detail}</p>
            <div className="mt-3">
              <AnuActionLink href={actionableError.fallbackHref} tone="ghost" iconRight={ArrowRight}>
                {actionableError.fallbackLabel}
              </AnuActionLink>
            </div>
          </AnuSurfacePanel>
        ) : null}

        {!isAuthenticated ? (
          <AnuSurfacePanel tone="quiet" className="p-5 text-slate-100">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Start here</p>
            <p className="mt-2 text-sm text-slate-300">
              New here? Begin with Manara Signals, then review Transparency and Docs before signing in.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <AnuActionLink href="/manara" tone="ghost" iconRight={ArrowRight}>
                Manara feed
              </AnuActionLink>
              <AnuActionLink href="/transparency" tone="ghost" iconRight={ArrowRight}>
                Transparency
              </AnuActionLink>
              <AnuActionLink href="/docs" tone="ghost" iconRight={ArrowRight}>
                Docs
              </AnuActionLink>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <AnuChip tone="accent">Public route</AnuChip>
              <AnuChip tone="muted">Read-only safe</AnuChip>
              <AnuChip tone="muted">Trust first</AnuChip>
            </div>
          </AnuSurfacePanel>
        ) : null}

        <AnuPageHero
          eyebrow={brand.memeticsTitle}
          title={
            <>
              Memes stay free.
              <br />
              Attention funds the commons.
            </>
          }
          description="This subsystem tracks creator channels, remix lineage, nutrient-driven ecology identity, and ledger-backed liquidity pools without ever turning the meme itself into merchandise."
          actions={
            <>
              <AnuActionLink href="/community" tone="secondary" iconLeft={Sparkles} iconRight={ArrowRight}>
                Open community commons
              </AnuActionLink>
              {channel ? (
                <AnuActionLink href={manaraPath(`/channels/${channel.id}`)} tone="ghost" iconRight={ArrowRight}>
                  Visit creator channel
                </AnuActionLink>
              ) : null}
            </>
          }
          aside={<EcologySummaryPanel ecology={channel?.ecology ?? null} />}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <AnuHeroMetric label="Share policy" value="Free + forkable" detail="Cultural matter remains free to circulate, remix, and propagate." />
            <AnuHeroMetric label="Revenue split" value="Creator / Platform / Pool" detail="Funding flows back into both creator sustainability and cooperative infrastructure." />
            <AnuHeroMetric label="Audit trail" value="Domain events" detail="Major memetics actions remain legible through event-backed system traces." />
          </div>
        </AnuPageHero>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="space-y-4">
            <AnuSectionHeading
              eyebrow="Meme feed"
              title="Shareable spores"
              description="Free cultural matter, ecology identity, and creator channels tracked as one signal field."
              action={
                channel ? (
                  <AnuActionLink href={manaraPath(`/channels/${channel.id}`)} tone="ghost" iconRight={ArrowRight}>
                    Visit creator channel
                  </AnuActionLink>
                ) : undefined
              }
            />

            <div className="grid gap-5">
              {feed.length === 0 ? (
                <AnuSurfacePanel tone="quiet" className="p-5 text-slate-100">
                  <p className="text-slate-300">No memes published yet, or the memetics service is unavailable.</p>
                </AnuSurfacePanel>
              ) : feed.map((meme) => (
                <Link key={meme.id} href={manaraPath(`/memes/${meme.id}`)} className="group block">
                  <AnuSurfacePanel tone="soft" className="h-full p-5 text-slate-100 transition-colors group-hover:border-white/20">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <AnuChip tone="accent" icon={Share2}>Free meme</AnuChip>
                      <AnuChip tone="muted" icon={Orbit}>
                        {meme.ecology?.ecologyIdentity || 'Awaiting ecology'}
                      </AnuChip>
                    </div>

                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="max-w-2xl">
                        <h3 className="text-2xl text-white transition-colors group-hover:text-[#f3cd92]">
                          {meme.title}
                        </h3>
                        <p className="mt-3 leading-relaxed text-slate-300">
                          {meme.summary || 'Free cultural matter for cooperative propagation.'}
                        </p>
                      </div>
                      <AnuSurfacePanel tone="quiet" className="min-w-[180px] px-4 py-4">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Attention score</p>
                        <p className="mt-2 text-3xl font-semibold font-mono-data text-white">
                          {Math.round(Number(meme.attentionScore || 0) * 100)}
                        </p>
                      </AnuSurfacePanel>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-sm">
                      <span className="text-slate-300">
                        Channel: <strong className="text-white">{meme.channel?.title}</strong>
                      </span>
                      <span className="inline-flex items-center gap-2 font-semibold text-[#f3cd92]">
                        Open meme page
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </AnuSurfacePanel>
                </Link>
              ))}
            </div>
          </div>

          <aside className="space-y-5">
            {channel && (
              <AnuSurfacePanel tone="quiet" className="p-5 text-slate-100">
                <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Creator Channel</p>
                <h3 className="text-2xl text-white" style={{ fontFamily: 'var(--font-serif)' }}>
                  {channel.title}
                </h3>
                <p className="mt-3 leading-relaxed text-slate-300">{channel.description}</p>
                <div className="mt-5 flex items-center justify-between text-sm">
                  <span className="text-slate-400">Share policy</span>
                  <strong className="text-[#d8f1e3]">{channel.sharePolicy}</strong>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-slate-400">Open moderation flags</span>
                  <strong className="font-mono-data text-white">{channel.moderation.openFlags}</strong>
                </div>
              </AnuSurfacePanel>
            )}

            {pool && (
              <Link href={manaraPath(`/pools/${pool.id}`)} className="block">
                <AnuSurfacePanel tone="quiet" className="p-5 text-slate-100 transition-colors hover:border-white/20">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Mutual-Aid Liquidity Pool</p>
                      <h3 className="text-2xl text-white" style={{ fontFamily: 'var(--font-serif)' }}>
                        {pool.name}
                      </h3>
                    </div>
                    <Coins className="h-7 w-7 text-[#f3cd92]" />
                  </div>
                  <p className="mt-3 text-slate-300">{pool.description}</p>
                  <div className="mt-6 flex items-end justify-between border-t border-white/10 pt-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Available balance</p>
                      <p className="mt-2 text-3xl font-semibold font-mono-data text-white">
                        ${(pool.availableBalanceCents / 100).toLocaleString()}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#f3cd92]">
                      Inspect ledger
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </AnuSurfacePanel>
              </Link>
            )}
          </aside>
        </section>
      </div>
    </div>
  );
}
