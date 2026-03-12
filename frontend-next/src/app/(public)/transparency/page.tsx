"use client";

import { useEffect, useState } from "react";
import { transparencyApi, TransparencySummary } from "@/lib/api/endpoints";

export default function TransparencyPage() {
  const [data, setData] = useState<TransparencySummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    transparencyApi.nodeSummary()
      .then(setData)
      .catch((err) => setError(err.message || "Failed to load transparency data"));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Public Transparency</p>
          <h1 className="text-3xl font-serif font-semibold">Node Summary</h1>
          <p className="text-sm text-muted-foreground">Aggregate, privacy-preserving totals only.</p>
        </header>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!data && !error && <p className="text-sm text-muted-foreground">Loading...</p>}
        {data && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-border rounded-xl p-4 bg-card">
                <p className="text-xs text-muted-foreground">Inflows (30d)</p>
                <p className="text-lg font-semibold">${(data.totals.inflows_30d / 100).toFixed(2)}</p>
              </div>
              <div className="border border-border rounded-xl p-4 bg-card">
                <p className="text-xs text-muted-foreground">Outflows (30d)</p>
                <p className="text-lg font-semibold">${(data.totals.outflows_30d / 100).toFixed(2)}</p>
              </div>
              <div className="border border-border rounded-xl p-4 bg-card">
                <p className="text-xs text-muted-foreground">Admin Ratio</p>
                <p className="text-lg font-semibold">{(data.totals.admin_ratio_30d * 100).toFixed(1)}%</p>
              </div>
            </div>
            <div className="border border-border rounded-xl p-4 bg-card">
              <h2 className="font-semibold mb-3">Pools</h2>
              <div className="space-y-2">
                {data.pools.map((pool) => (
                  <div key={pool.slug} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{pool.slug}</span>
                    <span>${(pool.balance / 100).toFixed(2)} balance</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border border-border rounded-xl p-4 bg-card">
              <h2 className="font-semibold mb-2">Relief Capacity</h2>
              <p className="text-sm text-muted-foreground">Monthly grants remaining: {data.relief_capacity.monthly_grants_remaining}</p>
              <p className="text-sm text-muted-foreground">Avg processing days: {data.relief_capacity.avg_processing_days}</p>
            </div>
            {data.relief_metrics && (
              <div className="border border-border rounded-xl p-4 bg-card">
                <h2 className="font-semibold mb-2">Relief Metrics</h2>
                <p className="text-sm text-muted-foreground">Approval ratio: {(data.relief_metrics.approval_ratio * 100).toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Median response days: {data.relief_metrics.median_response_days.toFixed(1)}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
