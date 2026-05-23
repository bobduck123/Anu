"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, GitCompareArrows } from "lucide-react";
import type { PresenceEditableConfig } from "@/lib/api/types";
import { diffEditableConfigs, formatConfigFieldName, summarizeEditableChanges } from "@/lib/editor/diffEngine";
import type { ConfigDiff } from "@/lib/editor/diffEngine";

export default function BeforeAfterComparison({
  publishedConfig,
  draftConfig,
}: {
  publishedConfig: PresenceEditableConfig | null | undefined;
  draftConfig: PresenceEditableConfig;
}) {
  const [expanded, setExpanded] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["Scenes", "Works and assets"]));
  const diffs = useMemo(() => diffEditableConfigs(publishedConfig, draftConfig), [publishedConfig, draftConfig]);
  const summary = useMemo(() => summarizeEditableChanges(diffs), [diffs]);
  const byCategory = useMemo(() => groupByCategory(diffs), [diffs]);

  if (diffs.length === 0) {
    return (
      <section className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-4">
        <div className="flex items-center gap-3">
          <GitCompareArrows className="h-5 w-5 text-emerald-200" />
          <div>
          <h3 className="text-sm font-semibold text-emerald-100">Draft vs published comparison</h3>
          <p className="mt-1 text-xs text-emerald-100/70">Draft matches the live room. There are no editable-config changes to publish.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
      <button type="button" onClick={() => setExpanded((value) => !value)} className="flex w-full items-center gap-3 text-left">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-200/10 text-amber-100">
          <GitCompareArrows className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-stone-50">Draft vs published comparison</span>
          <span className="mt-1 block truncate text-xs text-stone-400">
            {summary.total} changes. {summary.headline.slice(0, 2).join(" ")}
          </span>
        </span>
        {expanded ? <ChevronDown className="h-4 w-4 text-stone-500" /> : <ChevronRight className="h-4 w-4 text-stone-500" />}
      </button>

      {expanded && (
        <div className="mt-4 grid gap-3">
          {Object.entries(byCategory).map(([category, items]) => {
            const open = expandedCategories.has(category);
            return (
              <div key={category} className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedCategories((current) => {
                      const next = new Set(current);
                      if (next.has(category)) next.delete(category);
                      else next.add(category);
                      return next;
                    })
                  }
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-stone-200"
                >
                  {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="flex-1">{category}</span>
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-stone-400">{items.length}</span>
                </button>
                {open && (
                  <div className="divide-y divide-white/10 border-t border-white/10">
                    {items.slice(0, 12).map((diff, index) => (
                      <DiffRow key={`${diff.field}-${index}`} diff={diff} />
                    ))}
                    {items.length > 12 && <p className="px-3 py-2 text-xs text-stone-500">{items.length - 12} more changes in this group.</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function DiffRow({ diff }: { diff: ConfigDiff }) {
  return (
    <div className="grid gap-2 px-3 py-3 text-xs lg:grid-cols-[12rem_minmax(0,1fr)_minmax(0,1fr)]">
      <div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-amber-100">
          {diff.changeType}
        </span>
        <p className="mt-2 text-stone-400">{formatConfigFieldName(diff.field)}</p>
      </div>
      <ValueBox label="Live" value={diff.before} tone="before" />
      <ValueBox label="Draft" value={diff.after} tone="after" />
    </div>
  );
}

function ValueBox({ label, value, tone }: { label: string; value: unknown; tone: "before" | "after" }) {
  return (
    <div className={`min-w-0 rounded-2xl border p-2 ${tone === "before" ? "border-red-300/15 bg-red-300/5" : "border-emerald-300/15 bg-emerald-300/5"}`}>
      <p className="text-[10px] uppercase tracking-[0.14em] text-stone-500">{label}</p>
      <p className="mt-1 break-words font-mono text-[11px] leading-5 text-stone-300">{formatValue(value)}</p>
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === undefined) return "(not set)";
  if (value === null) return "null";
  if (typeof value === "string") return value || "(empty)";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value).slice(0, 180);
  } catch {
    return String(value);
  }
}

function groupByCategory(diffs: ConfigDiff[]) {
  return diffs.reduce<Record<string, ConfigDiff[]>>((groups, diff) => {
    groups[diff.category] = groups[diff.category] ?? [];
    groups[diff.category].push(diff);
    return groups;
  }, {});
}
