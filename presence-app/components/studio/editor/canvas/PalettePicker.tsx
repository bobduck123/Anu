"use client";

import type { PresenceRenderModel } from "@/lib/presence/render/model";
import type { PaletteToken } from "@/lib/editor/canvasMutations";

const TOKENS: Array<{ key: PaletteToken; modelKey: keyof PresenceRenderModel["palette"]; label: string }> = [
  { key: "bg", modelKey: "bg", label: "Room background" },
  { key: "paper", modelKey: "paper", label: "Paper" },
  { key: "paper_warm", modelKey: "paperWarm", label: "Warm paper" },
  { key: "ink", modelKey: "ink", label: "Text" },
  { key: "muted", modelKey: "muted", label: "Quiet text" },
  { key: "line", modelKey: "line", label: "Frame line" },
  { key: "hero_stage_bg", modelKey: "stage", label: "Entrance background" },
  { key: "accent", modelKey: "accent", label: "Accent" },
];

export function PalettePicker({
  model,
  saving,
  onChange,
  tone = "dark",
}: {
  model: PresenceRenderModel;
  saving: boolean;
  onChange: (token: PaletteToken, value: string) => void;
  tone?: "dark" | "paper";
}) {
  const paper = tone === "paper";
  return (
    <section data-testid="palette-picker" className={`grid gap-3 rounded-2xl border p-3 ${paper ? "border-[#ddd3c4] bg-white/60" : "border-white/10"}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${paper ? "text-[#7f7060]" : "text-stone-500"}`}>Room colours</p>
      <div className="grid grid-cols-2 gap-2">
        {TOKENS.map((token) => (
          <label key={token.key} className={`flex min-h-11 items-center gap-2 rounded-xl border px-2 text-[11px] ${paper ? "border-[#ddd3c4] bg-white text-[#655847]" : "border-white/10 text-stone-300"}`}>
            <input
              aria-label={token.label}
              type="color"
              disabled={saving}
              value={model.palette[token.modelKey].value}
              onChange={(event) => onChange(token.key, event.target.value)}
              className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent"
            />
            {token.label}
          </label>
        ))}
      </div>
    </section>
  );
}
