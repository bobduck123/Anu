"use client";

import { useEffect, useMemo, useState } from "react";
import { Image as ImageIcon, Loader2, Upload, X } from "lucide-react";
import type { PresenceEditableConfig, PresenceEditorAsset, PresenceNode } from "@/lib/api/types";
import type { CanonicalAssetBundle } from "@/lib/editor/canonicalAssets";
import {
  buildCanvasImageCandidates,
  buildCanvasRegistryFromRenderModel,
  getResolvedCanvasImage,
  replaceCanvasImage,
  updateCanvasAltText,
} from "@/lib/editor/canvasModel";
import { resolveRenderModel } from "@/lib/presence/render/resolver";

type CommitDraft = (next: (draft: PresenceEditableConfig) => PresenceEditableConfig) => Promise<boolean>;
type SourceTab = "room" | "live" | "upload";

export function MediaDrawer({
  node,
  config,
  assets,
  canonicalBundle,
  targetCanvasId = "hero-image",
  saving,
  mode = "panel",
  onClose,
  onCommit,
  onBringImages,
}: {
  node: PresenceNode;
  config: PresenceEditableConfig;
  assets: PresenceEditorAsset[];
  canonicalBundle: CanonicalAssetBundle | null;
  targetCanvasId?: string;
  saving: boolean;
  mode?: "panel" | "drawer";
  onClose?: () => void;
  onCommit: CommitDraft;
  onBringImages: () => void;
}) {
  const model = useMemo(
    () => resolveRenderModel({ ...node, editable_config: { ...config, status: "draft" } }, "draft"),
    [config, node],
  );
  const targets = useMemo(
    () => buildCanvasRegistryFromRenderModel(model).filter((element) => element.kind === "image"),
    [model],
  );
  const [targetId, setTargetId] = useState(targetCanvasId);
  const [tab, setTab] = useState<SourceTab>("room");
  const [selectedUrl, setSelectedUrl] = useState("");
  const [selectedAlt, setSelectedAlt] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const current = getResolvedCanvasImage(model, targetId);
  const candidates = buildCanvasImageCandidates(config, node, assets, canonicalBundle);
  const visibleCandidates = candidates.filter((candidate) =>
    tab === "room"
      ? candidate.sourceLabel !== "Live room images"
      : tab === "live"
        ? candidate.sourceLabel === "Live room images"
        : false,
  );

  useEffect(() => {
    setTargetId(targetCanvasId);
  }, [targetCanvasId]);

  useEffect(() => {
    setSelectedUrl("");
    setSelectedAlt(current.altText);
    setFeedback(null);
  }, [current.altText, current.url, targetId]);

  async function useSelectedImage() {
    if (!selectedUrl) return;
    const saved = await onCommit((draft) => replaceCanvasImage(draft, targetId, selectedUrl, selectedAlt));
    if (saved) {
      setFeedback("Image updated - saved to draft.");
      if (mode === "drawer") onClose?.();
    } else {
      setFeedback("Couldn't save that image. Try again.");
    }
  }

  async function saveAltText() {
    const saved = await onCommit((draft) => updateCanvasAltText(draft, targetId, selectedAlt));
    setFeedback(saved ? "Alt text saved to draft." : "Couldn't save alt text. Try again.");
  }

  const contents = (
    <section
      data-testid="media-drawer"
      className={`flex flex-col overflow-hidden bg-[#f7f2e9] text-[#2d271f] ${
        mode === "drawer"
          ? "h-[min(86vh,52rem)] w-full rounded-t-[2rem] shadow-2xl sm:h-full sm:max-w-[32rem] sm:rounded-none"
          : "mx-auto min-h-[42rem] max-w-4xl rounded-[2rem] border border-[#dfd4c5]"
      }`}
    >
      <header className="flex items-center justify-between border-b border-[#dfd4c5] px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#866845]">Images</p>
          <h2 className="mt-1 text-xl font-semibold">Choose an image for your room</h2>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close Images" className="rounded-full p-3 text-[#655847] hover:bg-[#eee5d8]">
            <X className="h-5 w-5" />
          </button>
        )}
      </header>

      <div className="grid gap-4 overflow-y-auto p-5">
        <label className="grid gap-2 text-xs font-semibold text-[#655847]">
          Image role
          <select
            aria-label="Image role"
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
            className="min-h-11 rounded-xl border border-[#d7cbbb] bg-white px-3 text-sm text-[#2d271f]"
          >
            {targets.map((target) => (
              <option key={target.canvasId} value={target.canvasId}>{roleLabel(target.canvasId, target.label)}</option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-3 gap-2 rounded-full border border-[#dfd4c5] bg-[#efe7da] p-1" role="tablist" aria-label="Image sources">
          {([
            ["room", "Your room"],
            ["live", "Live room"],
            ["upload", "+ Upload"],
          ] as Array<[SourceTab, string]>).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`min-h-11 rounded-full px-2 text-xs font-semibold ${tab === id ? "bg-white text-[#2d271f] shadow-sm" : "text-[#655847]"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "upload" ? (
          <div data-testid="media-upload-deferred" className="rounded-2xl border border-dashed border-[#ceb994] bg-[#f0e6d5] p-6 text-center">
            <Upload className="mx-auto h-6 w-6 text-[#866845]" />
            <h3 className="mt-3 text-base font-semibold">Upload coming soon</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#655847]">
              Ask your Presence operator to add new images for this pilot. You can choose and describe images already in your room now.
            </p>
            <p className="mt-3 text-xs text-[#766a5e]">Crop and focal point controls will arrive with secure draft image uploads.</p>
          </div>
        ) : visibleCandidates.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {visibleCandidates.map((candidate) => (
              <button
                key={`${tab}-${candidate.id}`}
                type="button"
                disabled={saving}
                onClick={() => {
                  setSelectedUrl(candidate.url);
                  setSelectedAlt(candidate.altText);
                  setFeedback(null);
                }}
                className={`overflow-hidden rounded-2xl border bg-white text-left ${
                  selectedUrl === candidate.url ? "border-[#b58c56] ring-2 ring-[#d9b67d]" : "border-[#dfd4c5]"
                } disabled:opacity-50`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={candidate.url} alt="" className="h-28 w-full object-cover" />
                <span className="block px-2 pt-2 text-[10px] uppercase tracking-[0.14em] text-[#8a7762]">
                  {candidate.sourceLabel === "Attached images" ? "Unused image" : candidate.sourceLabel}
                </span>
                <span className="block truncate px-2 pb-3 pt-1 text-xs font-semibold">{candidate.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-[#dfd4c5] bg-white/70 p-4 text-sm leading-6 text-[#655847]">
            {tab === "live"
              ? "Your Live room is not offering any additional images."
              : "No images attached yet. Bring in the images already visible in your Live room."}
            {tab === "room" && canonicalBundle && (
              <button type="button" onClick={onBringImages} className="mt-3 block rounded-full bg-[#2d271f] px-4 py-2 text-xs font-semibold text-white">
                Bring in live room images
              </button>
            )}
          </div>
        )}

        {tab !== "upload" && (
          <div className="grid gap-3 rounded-2xl border border-[#dfd4c5] bg-white/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#866845]">{roleLabel(targetId, "Image")}</p>
            {(selectedUrl || current.url) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedUrl || current.url} alt="" className="h-32 w-full rounded-xl object-cover" />
            ) : (
              <div className="flex h-28 items-center justify-center rounded-xl bg-[#eee6d9] text-[#786a58]">
                <ImageIcon className="h-5 w-5" />
              </div>
            )}
            <label className="grid gap-2 text-xs font-semibold text-[#655847]">
              Alt text
              <textarea
                aria-label="Media alt text"
                value={selectedAlt}
                onChange={(event) => setSelectedAlt(event.target.value)}
                rows={3}
                className="rounded-xl border border-[#d7cbbb] bg-white px-3 py-2 text-sm font-normal text-[#2d271f]"
              />
            </label>
            <p className="text-xs leading-5 text-[#766a5e]">
              Describe the image in one sentence - for visitors using screen readers, and for search engines.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving || !selectedUrl}
                onClick={() => void useSelectedImage()}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#317650] px-4 text-sm font-semibold text-white disabled:opacity-45"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Use this image
              </button>
              <button
                type="button"
                disabled={saving || selectedAlt.trim() === current.altText.trim()}
                onClick={() => void saveAltText()}
                className="min-h-11 rounded-full border border-[#cabda9] px-4 text-sm font-semibold disabled:opacity-45"
              >
                Save alt text
              </button>
            </div>
            {feedback && <p className="rounded-xl bg-[#e7efe7] p-2 text-xs font-semibold text-[#295c43]">{feedback}</p>}
          </div>
        )}
      </div>
    </section>
  );

  if (mode === "panel") return contents;
  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-end bg-black/40 sm:items-stretch" role="presentation">
      {contents}
    </div>
  );
}

function roleLabel(canvasId: string, defaultLabel: string) {
  if (canvasId === "hero-image") return "Cover image";
  if (canvasId.startsWith("work-image:")) return "Work in the wall";
  return defaultLabel;
}
