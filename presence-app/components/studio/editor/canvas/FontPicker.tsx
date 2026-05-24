"use client";

import type { PresenceRenderModel } from "@/lib/presence/render/model";
import { fontPacksForPilot, fontsForPilot } from "@/lib/presence/typography/registry";

export function FontPicker({
  model,
  saving,
  onPack,
  onFamily,
}: {
  model: PresenceRenderModel;
  saving: boolean;
  onPack: (id: string) => void;
  onFamily: (target: "heading" | "body", id: string) => void;
}) {
  return (
    <section data-testid="font-picker" className="grid gap-3 rounded-2xl border border-white/10 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">Pick a font</p>
      <div className="grid gap-2">
        {fontPacksForPilot().map((pack) => (
          <button
            key={pack.id}
            type="button"
            disabled={saving}
            onClick={() => onPack(pack.id)}
            className={`rounded-xl border p-2 text-left text-xs ${model.typography.fontPackId.value === pack.id ? "border-amber-200 bg-amber-200/10" : "border-white/10 hover:bg-white/5"}`}
          >
            <span className="block font-semibold text-stone-100">{pack.label}</span>
            <span className="mt-1 block text-stone-400">{pack.description}</span>
          </button>
        ))}
      </div>
      <label className="grid gap-1 text-xs text-stone-400">
        Heading
        <select
          aria-label="Heading font"
          value={model.typography.headingFontId.value ?? ""}
          disabled={saving}
          onChange={(event) => onFamily("heading", event.target.value)}
          className="min-h-11 rounded-xl border border-white/10 bg-black/30 px-2 text-stone-100"
        >
          <option value="">Room default</option>
          {fontsForPilot().map((font) => <option key={font.id} value={font.id}>{font.label}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-xs text-stone-400">
        Body
        <select
          aria-label="Body font"
          value={model.typography.bodyFontId.value ?? ""}
          disabled={saving}
          onChange={(event) => onFamily("body", event.target.value)}
          className="min-h-11 rounded-xl border border-white/10 bg-black/30 px-2 text-stone-100"
        >
          <option value="">Room default</option>
          {fontsForPilot().map((font) => <option key={font.id} value={font.id}>{font.label}</option>)}
        </select>
      </label>
      <p className="text-xs leading-5 text-stone-400" style={{ fontFamily: model.typography.headingFamily.value }}>
        Your room title in the chosen voice
      </p>
    </section>
  );
}
