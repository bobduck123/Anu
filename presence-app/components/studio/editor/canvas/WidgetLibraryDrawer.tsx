"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, Type, Image as ImageIcon, Send } from "lucide-react";
import type { WidgetType } from "@/lib/presence/render/model";
import { listWidgetsForPilot, type WidgetCategory } from "@/lib/presence/widgets/registry";

const CATEGORY_LABEL: Partial<Record<WidgetCategory, string>> = {
  identity: "Entrance",
  story: "Story",
  gallery: "Gallery",
  action: "Invitation",
};

export function WidgetLibraryDrawer({ activeWidgetTypes }: { activeWidgetTypes: Set<WidgetType> }) {
  const [open, setOpen] = useState(false);
  const grouped = useMemo(() => {
    const groups = new Map<WidgetCategory, ReturnType<typeof listWidgetsForPilot>>();
    for (const widget of listWidgetsForPilot().filter((item) => activeWidgetTypes.has(item.type))) {
      const items = groups.get(widget.category) ?? [];
      items.push(widget);
      groups.set(widget.category, items);
    }
    return groups;
  }, [activeWidgetTypes]);
  return (
    <section data-testid="widget-library-drawer" className="rounded-3xl border border-white/10 bg-white/[0.035]">
      <button type="button" className="flex min-h-11 w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-stone-100" onClick={() => setOpen((value) => !value)}>
        Blocks in your room
        <span className="text-xs text-stone-400">{open ? "Close" : "Browse"}</span>
      </button>
      {open && (
        <div className="grid gap-4 border-t border-white/10 p-3">
          {Array.from(grouped.entries()).map(([category, widgets]) => (
            <section key={category} className="grid gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">{CATEGORY_LABEL[category] ?? "Room"}</p>
              {widgets.map((widget) => (
                <div key={widget.type} className="flex items-center gap-2 rounded-xl border border-white/10 p-2 text-xs">
                  {iconFor(widget.type)}
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-stone-100">{widget.label}</span>
                    <span className="block truncate text-stone-400">{widget.hint}</span>
                  </span>
                  <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-stone-300">In room</span>
                </div>
              ))}
            </section>
          ))}
          <p className="text-[11px] leading-5 text-stone-400">Adding new blocks is coming after their visitor layout is fully wired.</p>
        </div>
      )}
    </section>
  );
}

function iconFor(type: WidgetType) {
  if (type.includes("image")) return <ImageIcon className="h-4 w-4 text-amber-200" />;
  if (type.includes("work")) return <LayoutGrid className="h-4 w-4 text-amber-200" />;
  if (type === "invitation" || type === "calling-card") return <Send className="h-4 w-4 text-amber-200" />;
  return <Type className="h-4 w-4 text-amber-200" />;
}
