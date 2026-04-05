'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowRight, FileSearch, ReceiptText, ShieldCheck } from 'lucide-react';
import { transparencyApi, TransparencySummary } from '@/lib/api/endpoints';
import { AnuActionLink } from '@/ui-system/anu/surfacePrimitives';
import { LabyrinthArchiveShell } from '@/ui-system/realms/labyrinth/LabyrinthArchiveShell';
import { ObservatoryStatsRail } from '@/ui-system/realms/labyrinth/ObservatoryStatsRail';

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
    <div className="min-h-screen px-4 pb-20 pt-20 md:px-8">
      <div className="mx-auto max-w-[110rem]">
        <LabyrinthArchiveShell
          eyebrow="Public transparency"
          title="Read the commons without exposing the members."
          description="Transparency is now part of the Labyrinth family: a dark archive threshold leading into manuscript chambers for public totals, receipts, and relief capacity. It should feel inspectable, honest, and privacy-preserving."
          legend={
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#f6d4cb]/72">Trust doctrine</p>
              <p className="text-sm leading-6 text-[#f6d4cb]/76">
                This route explains what can be known publicly, what remains private, and whether the reporting contract is live, syncing, or degraded.
              </p>
            </div>
          }
          stats={
            <ObservatoryStatsRail
              items={[
                {
                  label: 'Contract',
                  value: contractState,
                  detail:
                    'Live means current public reporting. Degraded means the trust path is open but the reporting layer needs attention.',
                },
                {
                  label: 'Pool coverage',
                  value: data ? String(data.pools.length) : '--',
                  detail: 'Public pool balances remain inspectable without exposing contributor-level details.',
                },
                {
                  label: 'Receipt trail',
                  value: data ? String(data.receipts?.length ?? 0) : '--',
                  detail: 'Recent public receipts anchor interpretation of movement through the commons.',
                },
              ]}
            />
          }
          controls={
            <div className="anu-labyrinth-console">
              <div className="flex flex-wrap gap-2">
                <AnuActionLink href="/docs" tone="secondary" iconLeft={FileSearch} iconRight={ArrowRight}>
                  Open operations library
                </AnuActionLink>
                <AnuActionLink href="/governance" tone="ghost" iconLeft={ShieldCheck} iconRight={ArrowRight}>
                  Governance observatory
                </AnuActionLink>
              </div>
              <p className="text-xs leading-6 text-[#f6d4cb]/72">
                Public trust routes should stay readable like manuscripts: clear totals, clear privacy boundary, clear truth about degraded reporting.
              </p>
            </div>
          }
        >
          {error ? (
            <div className="anu-labyrinth-stage__message">
              <Activity className="h-5 w-5 text-[#f6d4cb]" />
              <div>
                <p className="text-sm font-semibold text-[#f6d4cb]">Public transparency is temporarily degraded</p>
                <p className="mt-1 text-sm leading-6 text-[#f6d4cb]/80">
                  {error}
                </p>
              </div>
            </div>
          ) : null}

          {!data && !error ? (
            <div className="anu-labyrinth-stage__message">
              <ReceiptText className="h-5 w-5 text-[#f6d4cb]" />
              <div>
                <p className="text-sm font-semibold text-[#f6d4cb]">Loading transparency ledger</p>
                <p className="mt-1 text-sm leading-6 text-[#f6d4cb]/80">
                  The archive is assembling public totals, receipts, and relief-capacity summaries.
                </p>
              </div>
            </div>
          ) : null}

          {data ? (
            <div className="anu-labyrinth-route-grid anu-labyrinth-route-grid-2">
              <section className="anu-labyrinth-manuscript-card">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#7c413c]">Pool balances</p>
                <h2 className="mt-3 text-3xl text-[#1e0227]" style={{ fontFamily: 'var(--anu-type-display)' }}>
                  Commons-backed liquidity
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#7c413c]">
                  Each pool remains visible as a public commons instrument rather than a private finance bucket.
                </p>

                <div className="mt-5 anu-labyrinth-ledger-list">
                  {data.pools.map((pool) => (
                    <div key={pool.slug} className="anu-labyrinth-portal-link">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#1e0227]">{pool.name || pool.slug}</p>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#7c413c]">
                            {pool.category || 'Commons pool'}
                          </p>
                        </div>
                        <span className="font-mono-data text-base text-[#1e0227]">{money(pool.balance)}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#7c413c]">
                        <span>30d outflows: {money(pool.outflows_30d)}</span>
                        {pool.target_amount_cents ? <span>Target: {money(pool.target_amount_cents)}</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="anu-labyrinth-manuscript-card">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#7c413c]">Relief capacity</p>
                <h2 className="mt-3 text-3xl text-[#1e0227]" style={{ fontFamily: 'var(--anu-type-display)' }}>
                  Current response room
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#7c413c]">
                  Relief remains publicly legible at a systems level even when case-level queues stay private.
                </p>

                <div className="mt-5 anu-labyrinth-ledger-list">
                  <div className="anu-labyrinth-portal-link">
                    <p className="text-sm font-semibold text-[#1e0227]">Monthly grants remaining</p>
                    <p className="mt-2 text-2xl text-[#1e0227]">{data.relief_capacity.monthly_grants_remaining}</p>
                  </div>
                  <div className="anu-labyrinth-portal-link">
                    <p className="text-sm font-semibold text-[#1e0227]">Average processing days</p>
                    <p className="mt-2 text-2xl text-[#1e0227]">{data.relief_capacity.avg_processing_days}</p>
                  </div>
                  {data.relief_metrics ? (
                    <>
                      <div className="anu-labyrinth-portal-link">
                        <p className="text-sm font-semibold text-[#1e0227]">Approval ratio</p>
                        <p className="mt-2 text-2xl text-[#1e0227]">
                          {(data.relief_metrics.approval_ratio * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="anu-labyrinth-portal-link">
                        <p className="text-sm font-semibold text-[#1e0227]">Median response days</p>
                        <p className="mt-2 text-2xl text-[#1e0227]">
                          {data.relief_metrics.median_response_days.toFixed(1)}
                        </p>
                      </div>
                    </>
                  ) : null}
                </div>
              </section>

              <section className="anu-labyrinth-manuscript-card">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#7c413c]">Recent receipts</p>
                <h2 className="mt-3 text-3xl text-[#1e0227]" style={{ fontFamily: 'var(--anu-type-display)' }}>
                  Visible ledger trail
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#7c413c]">
                  Recent receipt entries make public movement inspectable without turning the surface into a raw transaction explorer.
                </p>

                <div className="mt-5 anu-labyrinth-ledger-list">
                  {receipts.length ? (
                    receipts.map((receipt) => (
                      <div key={receipt.id} className="anu-labyrinth-portal-link">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[#1e0227]">
                              {receipt.description || receipt.reference_type || receipt.entry_type}
                            </p>
                            <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#7c413c]">
                              {receipt.pool_name || receipt.pool_slug || 'Commons ledger'}
                              {receipt.reference_type ? ` • ${receipt.reference_type}` : ''}
                            </p>
                          </div>
                          <span className="font-mono-data text-base text-[#1e0227]">{money(receipt.amount_cents)}</span>
                        </div>
                        {receipt.created_at ? (
                          <p className="mt-3 text-xs text-[#7c413c]">
                            {new Date(receipt.created_at).toLocaleString()}
                          </p>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="anu-labyrinth-portal-link">
                      <p className="text-sm text-[#7c413c]">
                        Receipt publication is available, but there are no recent entries to display in this window.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section className="anu-labyrinth-manuscript-card">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#7c413c]">Reading doctrine</p>
                <h2 className="mt-3 text-3xl text-[#1e0227]" style={{ fontFamily: 'var(--anu-type-display)' }}>
                  What this surface guarantees
                </h2>
                <div className="mt-5 space-y-3 text-sm text-[#7c413c]">
                  <div className="anu-labyrinth-portal-link">
                    <p className="font-semibold text-[#1e0227]">Public totals without private exposure</p>
                    <p className="mt-2 leading-6">
                      Member-level finance and relief cases remain private even while commons state remains inspectable.
                    </p>
                  </div>
                  <div className="anu-labyrinth-portal-link">
                    <p className="font-semibold text-[#1e0227]">Honest degradation</p>
                    <p className="mt-2 leading-6">
                      If the reporting contract degrades, the surface should say so clearly and point to docs and contact rather than failing opaquely.
                    </p>
                  </div>
                  <div className="anu-labyrinth-portal-link">
                    <p className="font-semibold text-[#1e0227]">Linked institutional reading</p>
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
              </section>
            </div>
          ) : null}
        </LabyrinthArchiveShell>
      </div>
    </div>
  );
}
