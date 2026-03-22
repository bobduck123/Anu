"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowRight, ShieldCheck } from "lucide-react";
import { transparencyApi, TransparencySummary } from "@/lib/api/endpoints";
import {
  AnuActionLink,
  AnuHeroMetric,
  AnuInstrumentationCard,
  AnuPageHero,
  AnuSectionHeading,
  AnuSurfacePanel,
} from "@/ui-system/anu/surfacePrimitives";

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
      .catch((err) => setError(err.message || "Failed to load transparency data"));
  }, []);

  return (
    <div className="manara-grid-hero min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgba(242,199,134,0.14),transparent_28%),radial-gradient(circle_at_86%_8%,rgba(63,110,160,0.18),transparent_34%),linear-gradient(180deg,#0a1322_0%,#08111e_60%,#08101a_100%)]">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-24 md:px-8">
        <AnuPageHero
          eyebrow="Public transparency"
          title="Node Summary Ledger"
          description="Cultural operations remain inspectable through privacy-preserving totals. Review inflows, outflows, relief capacity, and pool balance without exposing member-level financial traces."
        >
          <div className="grid gap-3 md:grid-cols-3">
            <AnuHeroMetric
              label="Visibility"
              value="Privacy-preserving"
              detail="Public totals stay inspectable without exposing member-level financial traces."
            />
            <AnuHeroMetric
              label="Route"
              value="Trust surface"
              detail="Transparency remains close to governance, docs, and wider institutional legitimacy."
            />
            <AnuHeroMetric
              label="Contract"
              value={error ? "Degraded" : data ? "Live" : "Syncing"}
              detail="Reporting infrastructure may degrade honestly, but the public trust path remains explicit."
            />
          </div>
        </AnuPageHero>

        {error ? (
          <AnuSurfacePanel tone="quiet" className="mt-5 border-amber-300/28 p-5 text-amber-100">
            <p className="text-sm font-semibold">Public transparency is temporarily unavailable.</p>
            <p className="mt-1 text-sm text-amber-100/92">
              Reporting infrastructure is being stabilised for hosted deployment. Cultural routes remain available.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <AnuActionLink href="/docs" tone="ghost" iconRight={ArrowRight}>
                Open docs
              </AnuActionLink>
              <AnuActionLink href="/governance" tone="ghost">
                Governance center
              </AnuActionLink>
            </div>
          </AnuSurfacePanel>
        ) : null}

        {!data && !error ? (
          <AnuSurfacePanel tone="quiet" className="mt-5 p-5 text-sm text-slate-300">
            Loading transparency ledger…
          </AnuSurfacePanel>
        ) : null}

        {data ? (
          <div className="mt-5 space-y-5">
            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <AnuInstrumentationCard label="Inflows (30d)" value={money(data.totals.inflows_30d)} tone="signal" />
              <AnuInstrumentationCard label="Outflows (30d)" value={money(data.totals.outflows_30d)} />
              <AnuInstrumentationCard
                label="Admin ratio"
                value={`${(data.totals.admin_ratio_30d * 100).toFixed(1)}%`}
                detail="Share of 30-day throughput allocated to administrative load."
              />
            </section>

            <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <AnuSurfacePanel tone="soft" className="p-5 text-slate-100">
                <AnuSectionHeading
                  eyebrow="Pool balances"
                  title="Commons-backed liquidity"
                  description="Inspect public pool totals without exposing member-level transactions."
                  action={<ShieldCheck className="h-4 w-4 text-[#f3cd92]" />}
                />
                <div className="mt-4 space-y-2">
                  {data.pools.map((pool) => (
                    <div key={pool.slug} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
                      <span className="capitalize text-slate-200">{pool.slug}</span>
                      <span className="font-mono-data text-white">{money(pool.balance)}</span>
                    </div>
                  ))}
                </div>
              </AnuSurfacePanel>

              <AnuSurfacePanel tone="quiet" className="p-5 text-slate-100">
                <AnuSectionHeading
                  eyebrow="Relief capacity"
                  title="Current response room"
                  description="Public relief capacity remains legible even when internal member-level queues are private."
                  action={<Activity className="h-4 w-4 text-[#8dd9b2]" />}
                />
                <div className="mt-4 space-y-3 text-sm text-slate-300">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    Monthly grants remaining: <strong className="text-white">{data.relief_capacity.monthly_grants_remaining}</strong>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    Avg processing days: <strong className="text-white">{data.relief_capacity.avg_processing_days}</strong>
                  </div>
                  {data.relief_metrics ? (
                    <>
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        Approval ratio: <strong className="text-white">{(data.relief_metrics.approval_ratio * 100).toFixed(1)}%</strong>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        Median response days: <strong className="text-white">{data.relief_metrics.median_response_days.toFixed(1)}</strong>
                      </div>
                    </>
                  ) : null}
                </div>
              </AnuSurfacePanel>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
