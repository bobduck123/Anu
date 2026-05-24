"use client";

export function GalleryLayoutPicker() {
  return (
    <section data-testid="gallery-layout-picker" className="grid gap-2 rounded-2xl border border-white/10 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">Choose a gallery style</p>
      <div className="rounded-xl border border-amber-200 bg-amber-200/10 px-3 py-2 text-xs font-semibold text-amber-100">
        Gallery wall - live
      </div>
      <p className="text-[11px] leading-5 text-stone-400">
        More gallery styles will appear after they are ready for visitors.
      </p>
    </section>
  );
}
