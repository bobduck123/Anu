import { createElement, type ReactElement, type ReactNode } from "react";
import type { StudioRoomTemplateKit } from "@/lib/presence/studio-room/model";
import {
  instantiateRoomFromTemplateKit,
  listTemplateKits,
  templateKitPreviewMetadata,
  validateTemplateKit,
} from "@/lib/presence/studio-room/templateKits";
import { toPublicRoomPayload } from "@/lib/presence/studio-room/sanitize";
import { StudioRoomCanvas } from "./StudioRoomCanvas";

export function StudioRoomTemplateKitIndex(): ReactElement {
  const kits = listTemplateKits();
  return createElement(
    "main",
    { className: "min-h-dvh bg-[#11100d] px-5 py-8 text-stone-100" },
    createElement(
      "section",
      { className: "mx-auto grid max-w-5xl gap-5" },
      createElement(WarningBanner, { title: "Internal TemplateKit preview only - not public route output." }),
      createElement(
        "div",
        { className: "grid gap-4 sm:grid-cols-2" },
        kits.map((kit) =>
          createElement(
            "a",
            {
              key: kit.id,
              href: `/internal/studio-room-template-kits/${kit.id}`,
              className: "rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 text-stone-100 no-underline transition hover:border-amber-200/40",
            },
            createElement("p", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-amber-100" }, kit.supportState),
            createElement("h2", { className: "mt-2 text-2xl font-semibold" }, kit.name),
            createElement("p", { className: "mt-2 text-sm leading-6 text-stone-300" }, kit.description),
            createElement("p", { className: "mt-4 text-xs text-stone-400" }, `Source: ${kit.sourceCandidate.label}`),
          ),
        ),
      ),
    ),
  );
}

export function StudioRoomTemplateKitPreview({ kit }: { kit: StudioRoomTemplateKit }): ReactElement {
  const room = instantiateRoomFromTemplateKit(kit.id);
  const payload = toPublicRoomPayload(room);
  const metadata = templateKitPreviewMetadata(kit);
  const validation = validateTemplateKit(kit);
  return createElement(
    "main",
    { className: "min-h-dvh bg-[#11100d] px-4 py-6 text-stone-100 sm:px-6 lg:px-8" },
    createElement(
      "section",
      { className: "mx-auto grid max-w-7xl gap-5" },
      createElement(WarningBanner, { title: "Internal TemplateKit preview only - not public route output." }),
      createElement(
        "div",
        { className: "grid gap-5 lg:grid-cols-[0.9fr_1.1fr]" },
        createElement(
          "section",
          { className: "grid gap-5" },
          createElement(
            Panel,
            { title: "TemplateKit" },
            createElement(MetadataBlock, { label: "Kit", value: kit.name }),
            createElement(MetadataBlock, { label: "Source", value: kit.sourceCandidate.label }),
            createElement(MetadataBlock, { label: "State", value: kit.supportState }),
            createElement(MetadataBlock, { label: "CTA", value: kit.ctaStrategy.label }),
            createElement("p", { className: "mt-4 text-sm leading-6 text-stone-300" }, kit.description),
          ),
          createElement(
            Panel,
            { title: "Structure" },
            createElement(MetadataBlock, { label: "Chambers", value: String(metadata.chamberCount) }),
            createElement(MetadataBlock, { label: "Objects", value: String(metadata.objectCount) }),
            createElement(MetadataBlock, { label: "Mobile variants", value: String(metadata.mobileVariantCount) }),
            createElement(MetadataBlock, { label: "Payload restricted keys", value: metadata.restrictedPublicPayloadKeys.join(", ") || "none" }),
            createElement(MetadataBlock, { label: "Validation", value: validation.valid ? "valid" : "needs attention" }),
          ),
          createElement(
            Panel,
            { title: "Semantic coverage" },
            Object.entries(metadata.semanticCoverage).map(([label, count]) =>
              createElement(MetadataBlock, { key: label, label, value: String(count) }),
            ),
            createElement(MetadataBlock, { label: "Deferred", value: metadata.deferredFields.join(", ") || "none" }),
          ),
        ),
        createElement(
          "section",
          { className: "rounded-[2rem] border border-white/10 bg-white/[0.04] p-4" },
          createElement("p", { className: "text-xs font-semibold uppercase tracking-[0.2em] text-stone-400" }, "Studio Room TemplateKit preview"),
          createElement("h1", { className: "mt-1 text-3xl font-semibold" }, kit.name),
          createElement("div", { className: "mt-4" }, createElement(StudioRoomCanvas, { room: payload, dirty: false, viewport: "mobile" })),
        ),
      ),
    ),
  );
}

function WarningBanner({ title }: { title: string }) {
  return createElement(
    "div",
    { className: "rounded-[2rem] border border-amber-200/30 bg-amber-200/10 p-5" },
    createElement("p", { className: "text-xs font-semibold uppercase tracking-[0.22em] text-amber-100" }, title),
    createElement(
      "p",
      { className: "mt-2 max-w-3xl text-sm leading-6 text-stone-300" },
      "These deterministic TemplateKits are preview-only. They are not linked from visitor routes and do not change public Presence output.",
    ),
  );
}

function Panel({ title, children }: { title: string; children?: ReactNode }) {
  return createElement(
    "section",
    { className: "rounded-[2rem] border border-white/10 bg-white/[0.04] p-5" },
    createElement("h2", { className: "text-sm font-semibold uppercase tracking-[0.18em] text-stone-300" }, title),
    createElement("div", { className: "mt-4 grid gap-2" }, children),
  );
}

function MetadataBlock({ label, value }: { label: string; value: string }) {
  return createElement(
    "p",
    { className: "rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-stone-200" },
    createElement("span", { className: "mr-3 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500" }, label),
    value,
  );
}
