"use client";

import { AlertTriangle, Loader2, Send, X } from "lucide-react";
import type { ReadinessReport } from "@/lib/editor/readiness";

export default function PublishConfirmDialog({
  open,
  publishing,
  readiness,
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
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-confirm-title"
        className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/10 bg-[#111214] text-stone-100 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200/70">Open room to visitors</p>
            <h2 id="publish-confirm-title" className="mt-1 text-xl font-semibold">
              {criticalCount > 0 ? "A few things need attention" : "Open your room to visitors?"}
            </h2>
          </div>
          <button type="button" disabled={publishing} onClick={onCancel} className="rounded-full p-2 text-stone-400 hover:bg-white/5 hover:text-stone-100 disabled:opacity-50">
            <X className="h-4 w-4" />
          </button>
          </div>
          <div className="grid gap-4 px-5 py-5">
          {criticalCount === 0 ? (
            <div className="rounded-2xl border border-amber-200/20 bg-amber-200/10 p-3 text-sm leading-6 text-amber-50">
              {publishedVersion
                ? "Visitors will see your saved draft. You can always edit and open again later. The current Live room will be kept as an earlier version."
                : "Visitors will see your saved draft from this moment on. You can always edit and open again later."}
            </div>
          ) : (
            <div className="flex gap-2 rounded-2xl border border-red-300/30 bg-red-950/30 p-3 text-sm text-red-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Before you open your room to visitors:
                <span className="mt-2 block">{readiness?.critical.map((issue) => issue.label).join(" ")}</span>
              </span>
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" disabled={publishing} onClick={onCancel} className="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-stone-300 hover:bg-white/5 disabled:opacity-50">
              {criticalCount > 0 ? "Show me where" : "Not yet"}
            </button>
            {criticalCount === 0 && (
              <button type="button" disabled={publishing} onClick={onConfirm} className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-200 disabled:pointer-events-none disabled:opacity-50">
                {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Open room to visitors
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
