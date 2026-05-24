"use client";

import { optionPacksForPilot } from "@/lib/presence/option-packs/registry";

export function OptionPackPicker({ saving, activeId, onApply }: { saving: boolean; activeId: string | null; onApply: (id: string) => void }) {
  return (
    <section data-testid="option-pack-picker" className="grid gap-3 rounded-2xl border border-white/10 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">Pick a mood</p>
      {optionPacksForPilot().map((pack) => (
        <button
          type="button"
          key={pack.id}
          disabled={saving}
          onClick={() => onApply(pack.id)}
          className={`flex min-h-11 items-center gap-3 rounded-xl border p-2 text-left ${activeId === pack.id ? "border-amber-200 bg-amber-200/10" : "border-white/10 hover:bg-white/5"}`}
        >
          <span className="h-9 w-9 shrink-0 rounded-lg" style={{ background: pack.swatch }} aria-hidden />
          <span>
            <span className="block text-xs font-semibold text-stone-100">{pack.name}</span>
            <span className="block text-[11px] leading-4 text-stone-400">{pack.description}</span>
          </span>
        </button>
      ))}
    </section>
  );
}
