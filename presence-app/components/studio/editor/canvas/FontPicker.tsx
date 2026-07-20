"use client";

import type { PresenceRenderModel } from "@/lib/presence/render/model";
import { fontPacksForPilot, fontsForPilot } from "@/lib/presence/typography/registry";

export function FontPicker({
  model,
  saving,
  onPack,
  onFamily,
  tone = "dark",
}: {
  model: PresenceRenderModel;
  saving: boolean;
  onPack: (id: string) => void;
  onFamily: (target: "heading" | "body", id: string) => void;
  tone?: "dark" | "paper";
}) {
  const paper = tone === "paper";
  return (
    <section data-testid="font-picker" className={`grid gap-3 rounded-2xl border p-3 ${paper ? "border-[#ddd3c4] bg-white/60" : "border-white/10"}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${paper ? "text-[#7f7060]" : "text-stone-500"}`}>Pick a font</p>
      <p className={`text-xs leading-5 ${paper ? "text-[#6e6256]" : "text-stone-400"}`}>Pick a font that matches your room's voice.</p>
      <div className="grid gap-2">
        {fontPacksForPilot().map((pack) => (
          <button
            key={pack.id}
            type="button"
            disabled={saving}
            onClick={() => onPack(pack.id)}
            className={`rounded-xl border p-2 text-left text-xs ${model.typography.fontPackId.value === pack.id ? paper ? "border-[#b58c56] bg-[#eee1c9]" : "border-amber-200 bg-amber-200/10" : paper ? "border-[#ddd3c4] bg-white hover:bg-[#f4ede1]" : "border-white/10 hover:bg-white/5"}`}
          >
            <span className={`block font-semibold ${paper ? "text-[#302921]" : "text-stone-100"}`}>{pack.label}</span>
            <span className={`mt-1 block ${paper ? "text-[#6e6256]" : "text-stone-400"}`}>{pack.description}</span>
          </button>
        ))}
      </div>
      <label className={`grid gap-1 text-xs ${paper ? "text-[#655847]" : "text-stone-400"}`}>
        Heading
        <select
          aria-label="Heading font"
          value={model.typography.headingFontId.value ?? ""}
          disabled={saving}
          onChange={(event) => onFamily("heading", event.target.value)}
          className={`min-h-11 rounded-xl border px-2 ${paper ? "border-[#d7cbbb] bg-white text-[#302921]" : "border-white/10 bg-black/30 text-stone-100"}`}
        >
          <option value="">Room default</option>
          {fontsForPilot().map((font) => <option key={font.id} value={font.id}>{font.label}</option>)}
        </select>
      </label>
      <label className={`grid gap-1 text-xs ${paper ? "text-[#655847]" : "text-stone-400"}`}>
        Body
        <select
          aria-label="Body font"
          value={model.typography.bodyFontId.value ?? ""}
          disabled={saving}
          onChange={(event) => onFamily("body", event.target.value)}
          className={`min-h-11 rounded-xl border px-2 ${paper ? "border-[#d7cbbb] bg-white text-[#302921]" : "border-white/10 bg-black/30 text-stone-100"}`}
        >
          <option value="">Room default</option>
          {fontsForPilot().map((font) => <option key={font.id} value={font.id}>{font.label}</option>)}
        </select>
      </label>
      <p className={`text-xs leading-5 ${paper ? "text-[#655847]" : "text-stone-400"}`} style={{ fontFamily: model.typography.headingFamily.value }}>
        Your room title in the chosen voice
      </p>
    </section>
  );
}
