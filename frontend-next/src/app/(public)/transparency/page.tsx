"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, ArrowRight, ShieldCheck } from "lucide-react";
import { transparencyApi, TransparencySummary } from "@/lib/api/endpoints";

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
        <header className="manara-glass-panel rounded-[1.6rem] border border-white/14 p-6 text-slate-100 md:p-8">
          <p className="text-xs uppercase tracking-[0.24em] text-[#f3cd92]/88">Public Transparency</p>
          <h1 className="mt-2 text-3xl font-semibold text-white md:text-4xl">Node Summary Ledger</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            Cultural operations remain inspectable through privacy-preserving totals. Review inflows,
            outflows, relief capacity, and pool balance without exposing member-level financial traces.
          </p>
        </header>

        {error ? (
          <div className="manara-glass-panel-muted mt-5 rounded-2xl border border-amber-300/28 p-5 text-amber-100">
            <p className="text-sm font-semibold">Public transparency is temporarily unavailable.</p>
            <p className="mt-1 text-sm text-amber-100/92">
              Reporting infrastructure is being stabilised for hosted deployment. Cultural routes remain available.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Link href="/docs" className="manara-glass-chip inline-flex items-center gap-1 border border-amber-100/30 px-3 py-1.5 hover:bg-amber-200/20">
                Open docs
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link href="/governance" className="manara-glass-chip inline-flex items-center gap-1 border border-amber-100/30 px-3 py-1.5 hover:bg-amber-200/20">
                Governance center
              </Link>
            </div>
          </div>
        ) : null}

        {!data && !error ? (
          <div className="mt-5 rounded-2xl border border-white/12 bg-black/26 p-5 text-sm text-slate-300">Loading transparency ledger…</div>
        ) : null}

        {data ? (
          <div className="mt-5 space-y-5">
            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <article className="rounded-2xl border border-white/12 bg-[linear-gradient(150deg,rgba(8,16,29,0.9),rgba(7,13,24,0.92))] p-5 text-slate-100">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Inflows (30d)</p>
                <p className="mt-3 text-3xl font-semibold text-white">{money(data.totals.inflows_30d)}</p>
              </article>
              <article className="rounded-2xl border border-white/12 bg-[linear-gradient(150deg,rgba(8,16,29,0.9),rgba(7,13,24,0.92))] p-5 text-slate-100">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Outflows (30d)</p>
                <p className="mt-3 text-3xl font-semibold text-white">{money(data.totals.outflows_30d)}</p>
              </article>
              <article className="rounded-2xl border border-white/12 bg-[linear-gradient(150deg,rgba(8,16,29,0.9),rgba(7,13,24,0.92))] p-5 text-slate-100">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Admin Ratio</p>
                <p className="mt-3 text-3xl font-semibold text-white">{(data.totals.admin_ratio_30d * 100).toFixed(1)}%</p>
              </article>
            </section>

            <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <article className="rounded-2xl border border-white/12 bg-[linear-gradient(152deg,rgba(8,16,29,0.9),rgba(7,13,24,0.92))] p-5 text-slate-100">
                <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                  <ShieldCheck className="h-4 w-4 text-[#f3cd92]" />
                  Pool balances
                </h2>
                <div className="mt-4 space-y-2">
                  {data.pools.map((pool) => (
                    <div key={pool.slug} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
                      <span className="capitalize text-slate-200">{pool.slug}</span>
                      <span className="font-mono-data text-white">{money(pool.balance)}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-white/12 bg-[linear-gradient(152deg,rgba(8,16,29,0.9),rgba(7,13,24,0.92))] p-5 text-slate-100">
                <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                  <Activity className="h-4 w-4 text-[#8dd9b2]" />
                  Relief capacity
                </h2>
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
              </article>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
