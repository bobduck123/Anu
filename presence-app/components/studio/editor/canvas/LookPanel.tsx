"use client";

import { CheckCircle2 } from "lucide-react";
import type { PresenceEditableConfig, PresenceNode } from "@/lib/api/types";
import { applyFontFamily, applyFontPack, applyOptionPack, updatePaletteToken, type PaletteToken } from "@/lib/editor/canvasMutations";
import { applyCanvasMotion, activeMotionId, CANVAS_MOTION_PRESETS } from "@/lib/editor/canvasModel";
import { getOptionPack } from "@/lib/presence/option-packs/registry";
import { resolveRenderModel } from "@/lib/presence/render/resolver";
import { getFont, getFontPack } from "@/lib/presence/typography/registry";
import { FontPicker } from "./FontPicker";
import { OptionPackPicker } from "./OptionPackPicker";
import { PalettePicker } from "./PalettePicker";

type CommitDraft = (next: (draft: PresenceEditableConfig) => PresenceEditableConfig) => Promise<boolean>;

export function LookPanel({
  node,
  config,
  saving,
  onCommit,
}: {
  node: PresenceNode;
  config: PresenceEditableConfig;
  saving: boolean;
  onCommit: CommitDraft;
}) {
  const model = resolveRenderModel({ ...node, editable_config: { ...config, status: "draft" } }, "draft");
  const selectedMotion = activeMotionId(config);
  const activePack = typeof config.style_dna?.option_pack_id === "string" ? config.style_dna.option_pack_id : null;

  return (
    <section data-testid="look-panel" className="mx-auto grid max-w-3xl gap-5 rounded-[2rem] bg-[#f6f1e8] p-5 text-[#302921] shadow-sm sm:p-7">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a6e4d]">Look</p>
        <h2 className="mt-2 text-2xl font-semibold">Shape how your room feels.</h2>
        <p className="mt-2 text-sm leading-6 text-[#6e6256]">Pick a mood to start, then tune anything you want. Every live control is reflected in your Draft room.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <OptionPackPicker
          tone="paper"
          saving={saving}
          activeId={activePack}
          onApply={(id) => {
            const pack = getOptionPack(id);
            if (pack) void onCommit((draft) => applyOptionPack(draft, pack));
          }}
        />
        <section className="grid gap-3 rounded-2xl border border-[#ddd3c4] bg-white/60 p-3" data-testid="motion-presets">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7f7060]">Movement</p>
          <p className="text-xs leading-5 text-[#6e6256]">Comfort-first movement only. Reduced-motion support remains on.</p>
          <div className="grid gap-2">
            {CANVAS_MOTION_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                disabled={saving}
                onClick={() => void onCommit((draft) => applyCanvasMotion(draft, preset))}
                className={`flex min-h-11 items-center justify-between rounded-xl border px-3 text-left text-sm font-semibold ${
                  selectedMotion === preset.id
                    ? "border-[#b58c56] bg-[#eee1c9]"
                    : "border-[#ddd3c4] bg-white hover:bg-[#f4ede1]"
                } disabled:opacity-50`}
              >
                {preset.label}
                {selectedMotion === preset.id && <CheckCircle2 className="h-4 w-4 text-[#876439]" />}
              </button>
            ))}
          </div>
        </section>
      </div>

      <FontPicker
        tone="paper"
        model={model}
        saving={saving}
        onPack={(id) => {
          const pack = getFontPack(id);
          if (pack) void onCommit((draft) => applyFontPack(draft, pack));
        }}
        onFamily={(target, id) => {
          const font = getFont(id);
          if (font) void onCommit((draft) => applyFontFamily(draft, target, font));
        }}
      />

      <details className="rounded-2xl border border-[#ddd3c4] bg-white/60 p-3">
        <summary className="cursor-pointer text-sm font-semibold">Make your own mood</summary>
        <p className="mt-3 text-xs leading-5 text-[#6e6256]">These colours come from your mood. Change a swatch to tune your room.</p>
        <div className="mt-3">
          <PalettePicker
            tone="paper"
            model={model}
            saving={saving}
            onChange={(token: PaletteToken, value: string) => void onCommit((draft) => updatePaletteToken(draft, token, value))}
          />
        </div>
      </details>

      <details className="rounded-2xl border border-[#ddd3c4] bg-white/45 p-3 text-sm text-[#6e6256]">
        <summary className="cursor-pointer font-semibold text-[#302921]">Coming next</summary>
        <p className="mt-3 leading-6">Custom uploaded fonts and advanced movement controls stay unavailable in this pilot until they can be made dependable for every visitor.</p>
      </details>
    </section>
  );
}
