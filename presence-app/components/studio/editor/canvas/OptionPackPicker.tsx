"use client";

import { optionPacksForPilot } from "@/lib/presence/option-packs/registry";

export function OptionPackPicker({ saving, activeId, onApply, tone = "dark" }: { saving: boolean; activeId: string | null; onApply: (id: string) => void; tone?: "dark" | "paper" }) {
  const paper = tone === "paper";
  return (
    <section data-testid="option-pack-picker" className={`grid gap-3 rounded-2xl border p-3 ${paper ? "border-[#ddd3c4] bg-white/60" : "border-white/10"}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${paper ? "text-[#7f7060]" : "text-stone-500"}`}>Pick a mood</p>
      {optionPacksForPilot().map((pack) => (
        <button
          type="button"
          key={pack.id}
          disabled={saving}
          onClick={() => onApply(pack.id)}
          className={`flex min-h-11 items-center gap-3 rounded-xl border p-2 text-left ${activeId === pack.id ? paper ? "border-[#b58c56] bg-[#eee1c9]" : "border-amber-200 bg-amber-200/10" : paper ? "border-[#ddd3c4] bg-white hover:bg-[#f4ede1]" : "border-white/10 hover:bg-white/5"}`}
        >
          <span className="h-9 w-9 shrink-0 rounded-lg" style={{ background: pack.swatch }} aria-hidden />
          <span>
            <span className={`block text-xs font-semibold ${paper ? "text-[#302921]" : "text-stone-100"}`}>{pack.name}</span>
            <span className={`block text-[11px] leading-4 ${paper ? "text-[#6e6256]" : "text-stone-400"}`}>{pack.description}</span>
          </span>
        </button>
      ))}
    </section>
  );
}
