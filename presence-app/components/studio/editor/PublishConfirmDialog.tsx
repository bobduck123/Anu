"use client";

import { AlertTriangle, Loader2, Send, X } from "lucide-react";
import type { ReadinessReport } from "@/lib/editor/readiness";

export default function PublishConfirmDialog({
  open,
  publishing,
  readiness,
  draftVersion,
  publishedVersion,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  publishing: boolean;
  readiness: ReadinessReport | null;
  draftVersion?: number | null;
  publishedVersion?: number | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  const criticalCount = readiness?.critical.length ?? 0;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/10 bg-[#111214] text-stone-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200/70">Open room to visitors</p>
            <h2 className="mt-1 text-xl font-semibold">Publish this draft?</h2>
          </div>
          <button type="button" disabled={publishing} onClick={onCancel} className="rounded-full p-2 text-stone-400 hover:bg-white/5 hover:text-stone-100 disabled:opacity-50">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-4 px-5 py-5">
          <div className="rounded-2xl border border-amber-200/20 bg-amber-200/10 p-3 text-sm leading-6 text-amber-50">
            This will archive the current live config and publish the saved draft. Draft preview access stays owner-only.
          </div>
          <div className="grid gap-2 text-xs text-stone-300 sm:grid-cols-3">
            <Metric label="Live version" value={publishedVersion ? `v${publishedVersion}` : "None"} />
            <Metric label="Draft version" value={draftVersion ? `v${draftVersion}` : "Unsaved"} />
            <Metric label="Readiness" value={readiness ? `${readiness.percentage}%` : "Unknown"} />
          </div>
          {criticalCount > 0 && (
            <div className="flex gap-2 rounded-2xl border border-red-300/30 bg-red-950/30 p-3 text-sm text-red-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Resolve {criticalCount} critical readiness {criticalCount === 1 ? "issue" : "issues"} before publishing.
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" disabled={publishing} onClick={onCancel} className="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-stone-300 hover:bg-white/5 disabled:opacity-50">
              Cancel
            </button>
            <button type="button" disabled={publishing || criticalCount > 0} onClick={onConfirm} className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-200 disabled:pointer-events-none disabled:opacity-50">
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Open room to visitors
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.16em] text-stone-500">{label}</p>
      <p className="mt-1 font-semibold text-stone-100">{value}</p>
    </div>
  );
}
