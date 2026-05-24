"use client";

import type { PresenceRenderModel } from "@/lib/presence/render/model";
import type { CanvasElement } from "@/lib/editor/canvasModel";
import type { PaletteToken } from "@/lib/editor/canvasMutations";
import { FontPicker } from "./FontPicker";
import { PalettePicker } from "./PalettePicker";
import { OptionPackPicker } from "./OptionPackPicker";
import { GalleryLayoutPicker } from "./GalleryLayoutPicker";

export function WidgetInspector({
  selected,
  model,
  saving,
  optionPackId,
  onFontPack,
  onFontFamily,
  onPalette,
  onOptionPack,
}: {
  selected: CanvasElement | null;
  model: PresenceRenderModel;
  saving: boolean;
  optionPackId: string | null;
  onFontPack: (id: string) => void;
  onFontFamily: (target: "heading" | "body", id: string) => void;
  onPalette: (token: PaletteToken, value: string) => void;
  onOptionPack: (id: string) => void;
}) {
  return (
    <div data-testid="widget-inspector-v2" className="grid gap-3">
      {selected?.kind === "text" && (
        <FontPicker model={model} saving={saving} onPack={onFontPack} onFamily={onFontFamily} />
      )}
      {(selected?.kind === "work-wall" || selected?.workSlug) && <GalleryLayoutPicker />}
      <PalettePicker model={model} saving={saving} onChange={onPalette} />
      <OptionPackPicker saving={saving} activeId={optionPackId} onApply={onOptionPack} />
    </div>
  );
}
