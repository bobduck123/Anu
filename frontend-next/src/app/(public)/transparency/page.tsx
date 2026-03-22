'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowRight, FileSearch, ReceiptText, ShieldCheck } from 'lucide-react';
import { transparencyApi, TransparencySummary } from '@/lib/api/endpoints';
import {
  AnuActionLink,
  AnuChamberCard,
  AnuChip,
  AnuHeroMetric,
  AnuInstrumentationCard,
  AnuPageHero,
  AnuSectionHeading,
  AnuSurfacePanel,
} from '@/ui-system/anu/surfacePrimitives';

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TransparencyPage() {
  const [data, setData] = useState<TransparencySummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    transparencyApi
      .nodeSummary()
      .then(setData)
      .catch((err) => setError(err.message || 'Failed to load transparency data'));
  }, []);

  const receipts = useMemo(() => data?.receipts?.slice(0, 5) ?? [], [data]);
  const contractState = error ? 'Degraded' : data ? 'Live' : 'Syncing';

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 md:px-8">
        <AnuPageHero
          eyebrow="Public transparency"
          title="Read the commons without exposing the members."
          description="This surface is the public truth layer for institutional finance and relief capacity. It should make the state of the commons legible without leaking member-level financial traces or private support cases."
          actions={
            <>
              <AnuActionLink href="/docs" tone="secondary" iconLeft={FileSearch} iconRight={ArrowRight}>
                Open operations library
              </AnuActionLink>
              <AnuActionLink href="/governance" tone="ghost" iconLeft={ShieldCheck} iconRight={ArrowRight}>
                Governance observatory
              </AnuActionLink>
            </>
          }
          aside={
            <AnuSurfacePanel tone="quiet" className="h-full p-5">
              <div className="flex flex-wrap gap-2">
                <AnuChip tone="signal" icon={ShieldCheck}>
                  Privacy-preserving
                </AnuChip>
                <AnuChip tone="muted" icon={ReceiptText}>
                  Public receipts
                </AnuChip>
                <AnuChip tone="accent" icon={Activity}>
                  Relief legibility
                </AnuChip>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-300/84">
                Transparency exists to sustain institutional trust. If the reporting contract degrades,
                the surface should degrade honestly and keep pointing people toward the right explanatory routes.
              </p>
            </AnuSurfacePanel>
          }
        >
          <div className="grid gap-4 md:grid-cols-3">
            <AnuHeroMetric
              label="Contract"
              value={contractState}
              detail="Live means current public reporting. Syncing means data is being loaded. Degraded means the trust path is up but the reporting layer needs attention."
            />
            <AnuHeroMetric
              label="Pool coverage"
              value={data ? String(data.pools.length) : '--'}
              detail="Pool balances remain inspectable without exposing contributor-level transaction detail."
            />
            <AnuHeroMetric
              label="Receipt trail"
              value={data ? String(data.receipts?.length ?? 0) : '--'}
              detail="Recent public receipts and reference types help explain where changes in the commons ledger came from."
            />
          </div>
        </AnuPageHero>

        {error ? (
          <AnuSurfacePanel tone="quiet" className="mt-5 border-amber-300/28 p-5 text-amber-100">
            <p className="text-sm font-semibold">Public transparency is temporarily degraded.</p>
            <p className="mt-1 text-sm text-amber-100/92">
              The reporting layer is stabilising. Public trust routes remain available and the degradation is being stated openly.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <AnuActionLink href="/docs" tone="ghost" iconRight={ArrowRight}>
                Open docs
              </AnuActionLink>
              <AnuActionLink href="/contact" tone="ghost" iconRight={ArrowRight}>
                Route a report
              </AnuActionLink>
            </div>
          </AnuSurfacePanel>
        ) : null}

        {!data && !error ? (
          <AnuSurfacePanel tone="quiet" className="mt-5 p-5 text-sm text-slate-300">
            Loading transparency ledger...
          </AnuSurfacePanel>
        ) : null}

        {data ? (
          <div className="mt-5 space-y-5">
            <section className="grid gap-4 md:grid-cols-4">
              <AnuInstrumentationCard
                label="Inflows (30d)"
                value={money(data.totals.inflows_30d)}
                detail="Publicly visible throughput entering the commons in the last 30 days."
                tone="signal"
              />
              <AnuInstrumentationCard
                label="Outflows (30d)"
                value={money(data.totals.outflows_30d)}
                detail="Publicly visible support, operating, and flow-out movement in the same window."
              />
              <AnuInstrumentationCard
                label="Admin ratio"
                value={`${(data.totals.admin_ratio_30d * 100).toFixed(1)}%`}
                detail="Share of 30-day throughput allocated to administrative load."
              />
              <AnuInstrumentationCard
                label="Receipts visible"
                value={String(data.receipts?.length ?? 0)}
                detail="Recent receipts anchor interpretation of movement through the commons ledger."
                icon={ReceiptText}
              />
            </section>

            <section className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
              <AnuSurfacePanel tone="soft" className="p-5 text-slate-100">
                <AnuSectionHeading
                  eyebrow="Pool balances"
                  title="Commons-backed liquidity"
                  description="Each pool remains visible as a public commons instrument rather than a private finance bucket."
                  action={<ShieldCheck className="h-4 w-4 text-[#f3cd92]" />}
                />
                <div className="mt-4 space-y-3">
                  {data.pools.map((pool) => (
                    <div
                      key={pool.slug}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{pool.name || pool.slug}</p>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                            {pool.category || 'Commons pool'}
                          </p>
                        </div>
                        <span className="font-mono-data text-base text-white">{money(pool.balance)}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-300/82">
                        <span>30d outflows: {money(pool.outflows_30d)}</span>
                        {pool.target_amount_cents ? <span>Target: {money(pool.target_amount_cents)}</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </AnuSurfacePanel>

              <AnuSurfacePanel tone="quiet" className="p-5 text-slate-100">
                <AnuSectionHeading
                  eyebrow="Relief capacity"
                  title="Current response room"
                  description="Relief remains publicly legible at a systems level even when case-level queues stay private."
                  action={<Activity className="h-4 w-4 text-[#8dd9b2]" />}
                />
                <div className="mt-4 space-y-3 text-sm text-slate-300">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                    Monthly grants remaining:{' '}
                    <strong className="font-mono-data text-white">{data.relief_capacity.monthly_grants_remaining}</strong>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                    Avg processing days:{' '}
                    <strong className="font-mono-data text-white">{data.relief_capacity.avg_processing_days}</strong>
                  </div>
                  {data.relief_metrics ? (
                    <>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                        Approval ratio:{' '}
                        <strong className="font-mono-data text-white">
                          {(data.relief_metrics.approval_ratio * 100).toFixed(1)}%
                        </strong>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                        Median response days:{' '}
                        <strong className="font-mono-data text-white">
                          {data.relief_metrics.median_response_days.toFixed(1)}
                        </strong>
                      </div>
                    </>
                  ) : null}
                </div>
              </AnuSurfacePanel>
            </section>

            <section className="grid gap-5 lg:grid-cols-[1fr_0.95fr]">
              <AnuSurfacePanel tone="soft" className="p-5 text-slate-100">
                <AnuSectionHeading
                  eyebrow="Recent receipts"
                  title="Visible ledger trail"
                  description="Recent receipt entries make public movement inspectable without turning the surface into a raw transaction explorer."
                  action={<ReceiptText className="h-4 w-4 text-[#f3cd92]" />}
                />
                <div className="mt-4 space-y-3">
                  {receipts.length ? (
                    receipts.map((receipt) => (
                      <div
                        key={receipt.id}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {receipt.description || receipt.reference_type || receipt.entry_type}
                            </p>
                            <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                              {receipt.pool_name || receipt.pool_slug || 'Commons ledger'}
                              {receipt.reference_type ? ` • ${receipt.reference_type}` : ''}
                            </p>
                          </div>
                          <span className="font-mono-data text-base text-white">{money(receipt.amount_cents)}</span>
                        </div>
                        {receipt.created_at ? (
                          <p className="mt-3 text-xs text-slate-400">
                            {new Date(receipt.created_at).toLocaleString()}
                          </p>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-slate-300/82">
                      Receipt publication is available, but there are no recent entries to display in this window.
                    </div>
                  )}
                </div>
              </AnuSurfacePanel>

              <AnuChamberCard
                eyebrow="Reading doctrine"
                title="What this surface guarantees"
                description="Transparency is a truth surface, not a dashboard toy. It should tell people what can be known publicly, what remains private, and where to go next."
                tone="affirmed"
              >
                <div className="space-y-3 text-sm text-slate-200/84">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                    <p className="font-semibold text-white">Public totals without private exposure</p>
                    <p className="mt-2 leading-6">
                      Member-level finance and relief cases remain private even while commons state remains inspectable.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                    <p className="font-semibold text-white">Honest degradation</p>
                    <p className="mt-2 leading-6">
                      If the reporting contract degrades, the surface should say so clearly and point to docs and contact rather than failing opaquely.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                    <p className="font-semibold text-white">Linked institutional reading</p>
                    <p className="mt-2 leading-6">
                      Use docs for route relationships and governance for deeper institutional reasoning behind the visible state.
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <AnuActionLink href="/docs" tone="ghost" iconRight={ArrowRight}>
                    Open docs
                  </AnuActionLink>
                  <AnuActionLink href="/contact" tone="ghost" iconRight={ArrowRight}>
                    Route a report
                  </AnuActionLink>
                </div>
              </AnuChamberCard>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
