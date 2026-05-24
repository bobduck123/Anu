"use client";

import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  Palette,
  Pencil,
  Save,
  Send,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import type { PresenceEditableConfig, PresenceEditorAsset, PresenceNode } from "@/lib/api/types";
import type { ReadinessIssue, ReadinessReport } from "@/lib/editor/readiness";
import type { CanonicalAssetBundle } from "@/lib/editor/canonicalAssets";
import { validateAssetUrl } from "@/lib/editor/assetValidator";
import { resolveRenderModel } from "@/lib/presence/render/resolver";
import type { PresenceRenderModel } from "@/lib/presence/render/model";
import { getOptionPack } from "@/lib/presence/option-packs/registry";
import { fontLoaderHref, getFont, getFontPack } from "@/lib/presence/typography/registry";
import { applyFontFamily, applyFontPack, applyOptionPack, updatePaletteToken, type PaletteToken } from "@/lib/editor/canvasMutations";
import { WidgetLibraryDrawer } from "./canvas/WidgetLibraryDrawer";
import { WidgetInspector } from "./canvas/WidgetInspector";
import {
  activeMoodId,
  activeMotionId,
  applyCanvasMood,
  applyCanvasMotion,
  buildCanvasImageCandidates,
  buildCanvasRegistryFromRenderModel,
  CANVAS_MOOD_PRESETS,
  CANVAS_MOTION_PRESETS,
  canvasTargetForIssue,
  resolvedCanvasTextCss,
  getResolvedCanvasText,
  getCanvasTextStyle,
  getResolvedCanvasImage,
  getResolvedCanvasWorks,
  reorderCanvasWorks,
  replaceCanvasImage,
  updateCanvasAltText,
  updateCanvasText,
  updateCanvasTextStyle,
  type CanvasElement,
  type CanvasSceneId,
  type CanvasTextStyle,
} from "@/lib/editor/canvasModel";

type DraftCommit = (next: (draft: PresenceEditableConfig) => PresenceEditableConfig) => Promise<boolean>;

interface PresenceCanvasModeProps {
  node: PresenceNode;
  config: PresenceEditableConfig;
  dirty: boolean;
  saving: boolean;
  readiness: ReadinessReport | null;
  assets: PresenceEditorAsset[];
  onSaveDraft: (candidate?: PresenceEditableConfig | null) => Promise<unknown>;
  onCommit: DraftCommit;
  onPreview: () => Promise<unknown>;
  onOpenAdvanced: (tabId: string) => void;
  onPublishRequest: () => void;
  showCanonicalSync: boolean;
  canonicalBundle: CanonicalAssetBundle | null;
  onSyncCanonical: () => void;
}

interface Feedback {
  tone: "saved" | "error";
  text: string;
}

export default function PresenceCanvasMode({
  node,
  config,
  dirty,
  saving,
  readiness,
  assets,
  onSaveDraft,
  onCommit,
  onPreview,
  onOpenAdvanced,
  onPublishRequest,
  showCanonicalSync,
  canonicalBundle,
  onSyncCanonical,
}: PresenceCanvasModeProps) {
  const [scene, setScene] = useState<CanvasSceneId>("artwork");
  const [selectedId, setSelectedId] = useState<string | null>("hero-title");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [imagePickerTarget, setImagePickerTarget] = useState<string | null>(null);
  const [moveWallOpen, setMoveWallOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const renderModel = useMemo(
    () => resolveRenderModel({ ...node, editable_config: { ...config, status: "draft" } }, "draft"),
    [config, node],
  );
  const registry = useMemo(() => buildCanvasRegistryFromRenderModel(renderModel), [renderModel]);
  const selected = registry.find((element) => element.canvasId === selectedId) ?? null;
  const ggmVisible = renderModel.identity.rendererKey === "ggm-faithful-room-v1";
  const palette = canvasPalette(renderModel);
  const activeWidgetTypes = useMemo(
    () => new Set(renderModel.scenes.flatMap((item) => item.widgets.map((widget) => widget.type))),
    [renderModel],
  );
  const fontHref = fontLoaderHref(renderModel.typography.headingFontId.value, renderModel.typography.bodyFontId.value);
  const issuesByTarget = useMemo(() => {
    const mapped = new Map<string, ReadinessIssue[]>();
    for (const issue of readiness?.issues ?? []) {
      const target = canvasTargetForIssue(issue, config, node);
      if (!target) continue;
      const current = mapped.get(target) ?? [];
      current.push(issue);
      mapped.set(target, current);
    }
    return mapped;
  }, [config, node, readiness]);
  const motionIssue = issuesByTarget.get("motion")?.[0] ?? null;

  useEffect(() => {
    if (selectedId && !registry.some((element) => element.canvasId === selectedId)) {
      setSelectedId(null);
      setEditingId(null);
    }
  }, [registry, selectedId]);

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (imagePickerTarget) {
        setImagePickerTarget(null);
      } else if (moveWallOpen) {
        setMoveWallOpen(false);
      } else if (editingId) {
        setEditingId(null);
      } else {
        setSelectedId(null);
        setMobileSheetOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editingId, imagePickerTarget, moveWallOpen]);

  function selectElement(element: CanvasElement, edit = false) {
    setSelectedId(element.canvasId);
    setScene(element.scene);
    if (edit && canChangeElement(element, showCanonicalSync)) setEditingId(element.canvasId);
    if (window.matchMedia("(max-width: 1023px)").matches) setMobileSheetOpen(true);
  }

  async function commit(
    change: (draft: PresenceEditableConfig) => PresenceEditableConfig,
    savedText: string,
  ) {
    const saved = await onCommit(change);
    setFeedback(
      saved
        ? { tone: "saved", text: savedText }
        : { tone: "error", text: "This change could not be saved. Try again before opening your room." },
    );
    return saved;
  }

  async function commitText(element: CanvasElement, value: string) {
    setEditingId(null);
    await commit((draft) => updateCanvasText(draft, element.canvasId, value), "All changes saved to your draft room.");
  }

  function needsAttention(elementId: string) {
    return issuesByTarget.get(elementId)?.[0] ?? null;
  }

  const inspectorProps: InspectorProps = {
    node,
    config,
    renderModel,
    selected,
    saving,
    ggmVisible,
    showCanonicalSync,
    issue: selected ? needsAttention(selected.canvasId) : null,
    motionIssue,
    onEdit: () => selected && selectElement(selected, true),
    onChangeImage: () => selected && setImagePickerTarget(selected.canvasId),
    onAltText: (value) => selected && void commit((draft) => updateCanvasAltText(draft, selected.canvasId, value), "Alt text saved to your draft room."),
    onStyle: (style) => selected && void commit((draft) => updateCanvasTextStyle(draft, selected.canvasId, style), "Style saved to your draft room."),
    onOpenMoveWall: () => setMoveWallOpen(true),
    onMood: (presetId) => {
      const preset = CANVAS_MOOD_PRESETS.find((option) => option.id === presetId);
      if (preset) void commit((draft) => applyCanvasMood(draft, preset), "Mood saved to your draft room.");
    },
    onMotion: (presetId) => {
      const preset = CANVAS_MOTION_PRESETS.find((option) => option.id === presetId);
      if (preset) void commit((draft) => applyCanvasMotion(draft, preset), "Motion saved to your draft room.");
    },
    onFontPack: (packId) => {
      const pack = getFontPack(packId);
      if (pack) void commit((draft) => applyFontPack(draft, pack), "Font saved to your draft room.");
    },
    onFontFamily: (target, fontId) => {
      const font = getFont(fontId);
      if (font) void commit((draft) => applyFontFamily(draft, target, font), "Font saved to your draft room.");
    },
    onPalette: (token, value) => void commit((draft) => updatePaletteToken(draft, token, value), "Colours saved to your draft room."),
    onOptionPack: (packId) => {
      const pack = getOptionPack(packId);
      if (pack) void commit((draft) => applyOptionPack(draft, pack), "Mood saved to your draft room.");
    },
    onBringImages: onSyncCanonical,
  };

  return (
    <div className="grid gap-4">
      {fontHref && <link rel="stylesheet" href={fontHref} />}
      <section
        data-testid="pilot-banner"
        className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-amber-200/20 bg-amber-200/10 px-4 py-3"
      >
        <div className="flex gap-3 text-sm text-amber-50">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
          <p>
            <span className="font-semibold">Pilot mode:</span> shape your room here. Your changes save as a draft until you open
            the room to visitors.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onOpenAdvanced("overview")}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-stone-300 transition hover:bg-white/5 hover:text-white"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Advanced controls
        </button>
      </section>

      <WidgetLibraryDrawer activeWidgetTypes={activeWidgetTypes} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/30">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-200/70">Canvas</p>
              <p className="mt-1 text-xs text-stone-400">Tap a visible element to shape your draft room.</p>
            </div>
            <div className="flex flex-wrap gap-1" aria-label="Choose scene">
              {SCENES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setScene(option.id)}
                  className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                    scene === option.id ? "bg-amber-200 text-stone-950" : "bg-white/5 text-stone-300 hover:bg-white/10"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </header>

          {(feedback || saving || dirty) && (
            <div
              data-testid="draft-save-feedback"
              className={`mx-4 mt-4 flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs ${
                feedback?.tone === "error"
                  ? "border-red-300/30 bg-red-950/25 text-red-100"
                  : "border-emerald-300/20 bg-emerald-950/20 text-emerald-100"
              }`}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : feedback?.tone === "error" ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {saving ? "Saving to your draft room..." : feedback?.text ?? "Saving needed before preview."}
            </div>
          )}

          <div className="px-4 pb-4 pt-4">
          <CanvasStage
            node={node}
            config={config}
            model={renderModel}
              palette={palette}
              scene={scene}
              selectedId={selectedId}
              editingId={editingId}
              showCanonicalSync={showCanonicalSync}
              issueFor={needsAttention}
              onSelect={selectElement}
              onEdit={(element) => selectElement(element, true)}
              onCommitText={(element, value) => void commitText(element, value)}
              onCancelText={() => setEditingId(null)}
              onMoveWall={() => setMoveWallOpen(true)}
            />
          </div>

          {selected && (
            <FloatingToolbar
              selected={selected}
              saving={saving}
              editable={canChangeElement(selected, showCanonicalSync)}
              onEdit={() => selectElement(selected, true)}
              onImage={() => setImagePickerTarget(selected.canvasId)}
              onAlt={() => setMobileSheetOpen(true)}
              onMove={() => setMoveWallOpen(true)}
            />
          )}
        </section>

        <aside className="hidden lg:block">
          <CanvasInspector {...inspectorProps} />
          <CanvasActions
            dirty={dirty}
            saving={saving}
            onSave={() => void onSaveDraft()}
            onPreview={() => void onPreview()}
            onPublish={onPublishRequest}
          />
        </aside>
      </div>

      {mobileSheetOpen && selected && (
        <MobileInspectorSheet onClose={() => setMobileSheetOpen(false)}>
          <CanvasInspector {...inspectorProps} compact />
          <CanvasActions
            dirty={dirty}
            saving={saving}
            onSave={() => void onSaveDraft()}
            onPreview={() => void onPreview()}
            onPublish={onPublishRequest}
          />
        </MobileInspectorSheet>
      )}

      {imagePickerTarget && (
        <CanvasAssetPicker
          target={registry.find((element) => element.canvasId === imagePickerTarget) ?? null}
          renderModel={renderModel}
          config={config}
          node={node}
          assets={assets}
          canonicalBundle={canonicalBundle}
          saving={saving}
          onClose={() => setImagePickerTarget(null)}
          onChoose={(url, altText) => {
            void commit(
              (draft) => replaceCanvasImage(draft, imagePickerTarget, url, altText),
              "Image saved to your draft room.",
            ).then((saved) => {
              if (saved) setImagePickerTarget(null);
            });
          }}
        />
      )}

      {moveWallOpen && (
        <WorkWallReorder
          node={node}
          config={config}
          renderModel={renderModel}
          saving={saving}
          showCanonicalSync={showCanonicalSync}
          onBringImages={onSyncCanonical}
          onClose={() => setMoveWallOpen(false)}
          onSave={(order) => {
            void commit((draft) => reorderCanvasWorks(draft, node, order), "Work wall order saved to your draft room.").then(
              (saved) => {
                if (saved) setMoveWallOpen(false);
              },
            );
          }}
        />
      )}
    </div>
  );
}

const SCENES: Array<{ id: CanvasSceneId; label: string }> = [
  { id: "artwork", label: "Entrance" },
  { id: "wall", label: "Work wall" },
  { id: "practice", label: "Practice" },
  { id: "invitation", label: "Invitation" },
];

function CanvasStage({
  node,
  config,
  model,
  palette,
  scene,
  selectedId,
  editingId,
  showCanonicalSync,
  issueFor,
  onSelect,
  onEdit,
  onCommitText,
  onCancelText,
  onMoveWall,
}: {
  node: PresenceNode;
  config: PresenceEditableConfig;
  model: PresenceRenderModel;
  palette: CanvasPalette;
  scene: CanvasSceneId;
  selectedId: string | null;
  editingId: string | null;
  showCanonicalSync: boolean;
  issueFor: (canvasId: string) => ReadinessIssue | null;
  onSelect: (element: CanvasElement) => void;
  onEdit: (element: CanvasElement) => void;
  onCommitText: (element: CanvasElement, value: string) => void;
  onCancelText: () => void;
  onMoveWall: () => void;
}) {
  const registry = buildCanvasRegistryFromRenderModel(model);
  const byId = (id: string) => registry.find((element) => element.canvasId === id)!;
  const text = (id: string) => getResolvedCanvasText(model, id);
  const common = (id: string) => ({
    element: byId(id),
    selected: selectedId === id,
    issue: issueFor(id),
    onSelect,
    onEdit,
  });
  const visibleWorks = getResolvedCanvasWorks(model).filter((work) => work.isVisible);
  const stageStyle: CSSProperties = {
    background: palette.bg,
    color: palette.ink,
    borderColor: palette.line,
  };

  return (
    <div
      data-testid="presence-canvas-stage"
      data-scene={scene}
      className="relative min-h-[36rem] overflow-hidden rounded-[1.75rem] border transition-colors"
      style={stageStyle}
    >
      {scene === "artwork" && (
        <div className="grid min-h-[36rem] gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,0.72fr)] sm:p-7">
          <SelectionFrame {...common("hero-image")} className="min-h-[21rem] overflow-hidden rounded-[1.5rem]">
            <CanvasImage image={getResolvedCanvasImage(model, "hero-image")} label="Cover image" />
          </SelectionFrame>
          <div className="flex flex-col justify-center gap-4">
            <EditableCanvasText
              {...common("hero-title")}
              value={text("hero-title")}
              editing={editingId === "hero-title"}
              multiline={false}
              style={resolvedCanvasTextCss(model, "hero-title")}
              className="text-4xl font-semibold leading-tight sm:text-5xl"
              onCommit={onCommitText}
              onCancel={onCancelText}
            />
            <EditableCanvasText
              {...common("hero-caption")}
              value={text("hero-caption")}
              editing={editingId === "hero-caption"}
              multiline={false}
              style={{ color: palette.muted, ...resolvedCanvasTextCss(model, "hero-caption") }}
              className="text-base leading-7"
              onCommit={onCommitText}
              onCancel={onCancelText}
            />
            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: palette.muted }}>
              Select visible words or image to change them
            </p>
          </div>
        </div>
      )}

      {scene === "wall" && (
        <div className="p-5 sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: palette.muted }}>Work wall</p>
              <h3 className="mt-2 text-2xl font-semibold">Selected works</h3>
            </div>
            <button
              type="button"
              onClick={onMoveWall}
              className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold"
              style={{ background: palette.accent, color: palette.paper }}
            >
              <GripVertical className="h-4 w-4" />
              Move work
            </button>
          </div>
          {showCanonicalSync || visibleWorks.length === 0 ? (
            <SelectionFrame {...common("work-wall")} className="rounded-3xl border border-dashed p-7 text-center" style={{ borderColor: palette.line }}>
              <p className="font-semibold">{showCanonicalSync ? "Bring in your live images to edit this wall." : "Add a work to begin your wall."}</p>
              <p className="mt-2 text-sm" style={{ color: palette.muted }}>Your visitors still see the live room until you open this draft.</p>
            </SelectionFrame>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleWorks.map((work) => (
                <article key={work.slug} className="rounded-3xl p-3" style={{ background: palette.paper }}>
                  <SelectionFrame
                    {...common(`work-image:${work.slug}`)}
                    className="aspect-[4/5] overflow-hidden rounded-2xl"
                  >
                    <CanvasImage image={{ url: work.imageUrl, altText: work.altText }} label={`${work.title} image`} />
                  </SelectionFrame>
                  <EditableCanvasText
                    {...common(`work-title:${work.slug}`)}
                    value={work.title}
                    editing={editingId === `work-title:${work.slug}`}
                    multiline={false}
                    style={resolvedCanvasTextCss(model, `work-title:${work.slug}`)}
                    className="mt-3 text-base font-semibold"
                    onCommit={onCommitText}
                    onCancel={onCancelText}
                  />
                  <EditableCanvasText
                    {...common(`work-caption:${work.slug}`)}
                    value={work.caption || "Add a caption"}
                    editing={editingId === `work-caption:${work.slug}`}
                    multiline
                    style={{ color: palette.muted, ...resolvedCanvasTextCss(model, `work-caption:${work.slug}`) }}
                    className="mt-2 text-xs leading-5"
                    onCommit={onCommitText}
                    onCancel={onCancelText}
                  />
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {scene === "practice" && (
        <div className="grid min-h-[36rem] content-center gap-5 p-6 sm:p-10">
          <EditableCanvasText
            {...common("practice-title")}
            value={text("practice-title")}
            editing={editingId === "practice-title"}
            multiline={false}
            style={resolvedCanvasTextCss(model, "practice-title")}
            className="max-w-3xl text-4xl font-semibold"
            onCommit={onCommitText}
            onCancel={onCancelText}
          />
          <EditableCanvasText
            {...common("biography")}
            value={text("biography") || "Add your biography"}
            editing={editingId === "biography"}
            multiline
            style={resolvedCanvasTextCss(model, "biography")}
            className="max-w-3xl text-lg leading-8"
            onCommit={onCommitText}
            onCancel={onCancelText}
          />
          <EditableCanvasText
            {...common("main-statement")}
            value={text("main-statement") || "Add your statement"}
            editing={editingId === "main-statement"}
            multiline
            style={{ color: palette.accent, ...resolvedCanvasTextCss(model, "main-statement") }}
            className="max-w-2xl border-l-2 pl-5 text-xl italic leading-8"
            onCommit={onCommitText}
            onCancel={onCancelText}
          />
          <EditableCanvasText
            {...common("process-notes")}
            value={text("process-notes") || "Add process notes"}
            editing={editingId === "process-notes"}
            multiline
            style={{ color: palette.muted, ...resolvedCanvasTextCss(model, "process-notes") }}
            className="max-w-2xl text-sm leading-7"
            onCommit={onCommitText}
            onCancel={onCancelText}
          />
        </div>
      )}

      {scene === "invitation" && (
        <div className="flex min-h-[36rem] flex-col items-center justify-center gap-5 p-7 text-center">
          <EditableCanvasText
            {...common("calling-title")}
            value={text("calling-title")}
            editing={editingId === "calling-title"}
            multiline={false}
            style={resolvedCanvasTextCss(model, "calling-title")}
            className="max-w-2xl text-5xl font-semibold"
            onCommit={onCommitText}
            onCancel={onCancelText}
          />
          <EditableCanvasText
            {...common("calling-body")}
            value={text("calling-body") || "Add an invitation note"}
            editing={editingId === "calling-body"}
            multiline
            style={{ color: palette.muted, ...resolvedCanvasTextCss(model, "calling-body") }}
            className="max-w-xl text-base leading-7"
            onCommit={onCommitText}
            onCancel={onCancelText}
          />
          <EditableCanvasText
            {...common("invitation-cta")}
            value={text("invitation-cta")}
            editing={editingId === "invitation-cta"}
            multiline={false}
            style={{ background: palette.accent, color: palette.paper, ...resolvedCanvasTextCss(model, "invitation-cta") }}
            className="rounded-full px-7 py-4 text-sm font-semibold"
            onCommit={onCommitText}
            onCancel={onCancelText}
          />
        </div>
      )}
    </div>
  );
}

function SelectionFrame({
  element,
  selected,
  issue,
  onSelect,
  onEdit,
  className = "",
  style,
  children,
}: {
  element: CanvasElement;
  selected: boolean;
  issue: ReadinessIssue | null;
  onSelect: (element: CanvasElement) => void;
  onEdit: (element: CanvasElement) => void;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(element);
    }
    if (event.key === "F2" && element.kind === "text") {
      event.preventDefault();
      onEdit(element);
    }
  }
  return (
    <div
      role="button"
      tabIndex={0}
      data-canvas-id={element.canvasId}
      data-canvas-kind={element.kind}
      data-canvas-label={element.label}
      data-canvas-scene={element.scene}
      aria-label={`Select ${element.label}`}
      aria-pressed={selected}
      onClick={() => onSelect(element)}
      onDoubleClick={() => element.kind === "text" && onEdit(element)}
      onKeyDown={onKeyDown}
      style={style}
      className={`group relative transition ${
        selected ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-transparent" : "hover:ring-2 hover:ring-amber-300/50"
      } ${className}`}
    >
      {selected && (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-amber-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-950">
          {element.label}
        </span>
      )}
      {selected && element.provenance && element.provenance !== "authored" && (
        <span className="absolute left-2 top-10 z-10 rounded-full bg-stone-900/80 px-2 py-1 text-[10px] font-semibold text-stone-100">
          Using room default
        </span>
      )}
      {issue && (
        <button
          type="button"
          data-testid={`readiness-chip-${element.canvasId}`}
          title={issue.detail}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(element);
          }}
          className="absolute bottom-2 right-2 z-10 inline-flex min-h-9 items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-950 shadow"
        >
          <AlertTriangle className="h-3 w-3" />
          Needs attention
        </button>
      )}
      {children}
    </div>
  );
}

function EditableCanvasText({
  element,
  selected,
  issue,
  value,
  editing,
  multiline,
  style,
  className,
  onSelect,
  onEdit,
  onCommit,
  onCancel,
}: {
  element: CanvasElement;
  selected: boolean;
  issue: ReadinessIssue | null;
  value: string;
  editing: boolean;
  multiline: boolean;
  style: CSSProperties;
  className: string;
  onSelect: (element: CanvasElement) => void;
  onEdit: (element: CanvasElement) => void;
  onCommit: (element: CanvasElement, value: string) => void;
  onCancel: () => void;
}) {
  return (
    <SelectionFrame element={element} selected={selected} issue={issue} onSelect={onSelect} onEdit={onEdit} className="rounded-lg">
      {editing ? (
        <InlineTextEditor
          label={element.label}
          initialValue={value}
          multiline={multiline}
          className={className}
          style={style}
          onCancel={onCancel}
          onCommit={(next) => onCommit(element, next)}
        />
      ) : (
        <p className={`min-h-11 cursor-text px-2 py-2 ${className}`} style={style}>
          {value}
        </p>
      )}
    </SelectionFrame>
  );
}

function InlineTextEditor({
  label,
  initialValue,
  multiline,
  className,
  style,
  onCancel,
  onCommit,
}: {
  label: string;
  initialValue: string;
  multiline: boolean;
  className: string;
  style: CSSProperties;
  onCancel: () => void;
  onCommit: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const finished = useRef(false);

  function save() {
    if (finished.current) return;
    finished.current = true;
    onCommit(value);
  }
  function cancel() {
    if (finished.current) return;
    finished.current = true;
    onCancel();
  }
  function onKeyDown(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
      return;
    }
    if (!multiline && event.key === "Enter") {
      event.preventDefault();
      save();
    }
    if (multiline && event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      save();
    }
  }
  const props = {
    autoFocus: true,
    "aria-label": `Edit ${label}`,
    value,
    style,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValue(event.target.value),
    onClick: (event: MouseEvent) => event.stopPropagation(),
    onDoubleClick: (event: MouseEvent) => event.stopPropagation(),
    onBlur: save,
    onKeyDown,
    className: `w-full rounded-lg border border-amber-400 bg-white/85 px-2 py-2 text-inherit outline-none ring-2 ring-amber-300/50 ${className}`,
  };
  return multiline ? <textarea {...props} rows={4} /> : <input {...props} type="text" />;
}

function CanvasImage({ image, label }: { image: { url: string; altText: string }; label: string }) {
  const safe = image.url && validateAssetUrl(image.url).isValid;
  return safe ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image.url} alt={image.altText} className="h-full w-full object-cover" />
  ) : (
    <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 bg-black/10 text-sm text-stone-500">
      <ImageIcon className="h-6 w-6" />
      {image.url ? "Image needs attention" : `Add ${label.toLowerCase()}`}
    </div>
  );
}

function FloatingToolbar({
  selected,
  saving,
  editable,
  onEdit,
  onImage,
  onAlt,
  onMove,
}: {
  selected: CanvasElement;
  saving: boolean;
  editable: boolean;
  onEdit: () => void;
  onImage: () => void;
  onAlt: () => void;
  onMove: () => void;
}) {
  return (
    <div data-testid="canvas-mini-toolbar" className="flex flex-wrap items-center gap-2 border-t border-white/10 bg-black/35 p-3">
      <span className="mr-1 rounded-full bg-white/5 px-3 py-2 text-xs text-stone-300">{selected.label}</span>
      {selected.kind === "text" && (
        <ToolbarButton disabled={saving || !editable} onClick={onEdit} icon={<Pencil className="h-3.5 w-3.5" />} label="Edit text" />
      )}
      {selected.kind === "image" && (
        <>
          <ToolbarButton disabled={saving || !editable} onClick={onImage} icon={<ImageIcon className="h-3.5 w-3.5" />} label="Change image" />
          <ToolbarButton disabled={saving || !editable} onClick={onAlt} icon={<Pencil className="h-3.5 w-3.5" />} label="Add alt text" />
        </>
      )}
      {(selected.kind === "work-wall" || selected.workSlug) && (
        <ToolbarButton disabled={saving || !editable} onClick={onMove} icon={<GripVertical className="h-3.5 w-3.5" />} label="Move work" />
      )}
      {!editable && <span className="text-xs text-amber-200">Bring in live images first.</span>}
    </div>
  );
}

function ToolbarButton({ icon, label, disabled, onClick }: { icon: ReactNode; label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-stone-100 hover:bg-white/10 disabled:opacity-40"
    >
      {icon}
      {label}
    </button>
  );
}

interface InspectorProps {
  node: PresenceNode;
  config: PresenceEditableConfig;
  renderModel: PresenceRenderModel;
  selected: CanvasElement | null;
  saving: boolean;
  ggmVisible: boolean;
  showCanonicalSync: boolean;
  issue: ReadinessIssue | null;
  motionIssue: ReadinessIssue | null;
  compact?: boolean;
  onEdit: () => void;
  onChangeImage: () => void;
  onAltText: (value: string) => void;
  onStyle: (style: Partial<CanvasTextStyle>) => void;
  onOpenMoveWall: () => void;
  onMood: (presetId: string) => void;
  onMotion: (presetId: string) => void;
  onFontPack: (packId: string) => void;
  onFontFamily: (target: "heading" | "body", fontId: string) => void;
  onPalette: (token: PaletteToken, value: string) => void;
  onOptionPack: (packId: string) => void;
  onBringImages: () => void;
}

function CanvasInspector(props: InspectorProps) {
  const {
    node,
    config,
    renderModel,
    selected,
    saving,
    ggmVisible,
    showCanonicalSync,
    issue,
    motionIssue,
    compact = false,
    onEdit,
    onChangeImage,
    onAltText,
    onStyle,
    onOpenMoveWall,
    onMood,
    onMotion,
    onFontPack,
    onFontFamily,
    onPalette,
    onOptionPack,
    onBringImages,
  } = props;
  const blockedWork = Boolean(selected?.workSlug && showCanonicalSync);
  return (
    <section
      data-testid={compact ? "mobile-bottom-sheet-inspector" : "desktop-canvas-inspector"}
      className="grid gap-3 rounded-[2rem] border border-white/10 bg-white/[0.035] p-3"
    >
      <header className="px-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">Inspector</p>
        <h3 className="mt-1 text-base font-semibold text-stone-100">{selected?.label ?? "Select something in your room"}</h3>
        {issue && <p className="mt-2 rounded-xl bg-amber-200/10 p-2 text-xs leading-5 text-amber-100">{issue.detail}</p>}
      </header>

      {selected?.kind === "text" && (
        <>
          <InspectorGroup title="Content">
            <button type="button" disabled={saving || blockedWork} onClick={onEdit} className={wideButtonClass()}>
              <Pencil className="h-4 w-4" />
              Edit words in Canvas
            </button>
          </InspectorGroup>
          <InspectorGroup title="Style">
            {ggmVisible ? (
              <TextStyleControls
                style={getCanvasTextStyle(config, selected.canvasId)}
                saving={saving || blockedWork}
                allowColor={selected.canvasId !== "hero-title" && selected.canvasId !== "hero-caption"}
                onChange={onStyle}
              />
            ) : (
              <ComingSoon text="Style presets are coming next for this room type." />
            )}
          </InspectorGroup>
        </>
      )}

      {selected?.kind === "image" && (
        <InspectorGroup title="Image">
          {blockedWork ? (
            <>
              <p className="text-xs leading-5 text-stone-300">Bring your live images into this draft room before changing this work.</p>
              <button type="button" className={wideButtonClass()} onClick={onBringImages}>Bring in live images</button>
            </>
          ) : (
            <>
              <button type="button" disabled={saving} onClick={onChangeImage} className={wideButtonClass()}>
                <ImageIcon className="h-4 w-4" />
                Change image
              </button>
              <AltTextEditor
                key={selected.canvasId}
                initialValue={getResolvedCanvasImage(renderModel, selected.canvasId).altText}
                saving={saving}
                onSave={onAltText}
              />
            </>
          )}
        </InspectorGroup>
      )}

      {(selected?.kind === "work-wall" || selected?.workSlug) && (
        <InspectorGroup title="Layout">
          {showCanonicalSync ? (
            <button type="button" onClick={onBringImages} className={wideButtonClass()}>Bring in live images</button>
          ) : (
            <button type="button" disabled={saving} onClick={onOpenMoveWall} className={wideButtonClass()}>
              <GripVertical className="h-4 w-4" />
              Move work
            </button>
          )}
        </InspectorGroup>
      )}

      <WidgetInspector
        selected={selected}
        model={renderModel}
        saving={saving}
        optionPackId={typeof config.style_dna?.option_pack_id === "string" ? config.style_dna.option_pack_id : null}
        onFontPack={onFontPack}
        onFontFamily={onFontFamily}
        onPalette={onPalette}
        onOptionPack={onOptionPack}
      />

      <InspectorGroup title="Mood">
        {ggmVisible ? (
          <MoodControls config={config} saving={saving} onMood={onMood} />
        ) : (
          <ComingSoon text="Mood presets are coming next for this room type." />
        )}
      </InspectorGroup>
      <InspectorGroup title="Motion">
        {motionIssue && (
          <p className="rounded-xl bg-amber-200/10 p-2 text-xs leading-5 text-amber-100">
            Needs attention: {motionIssue.detail}
          </p>
        )}
        {ggmVisible ? (
          <>
            {renderModel.motion.safetyCapApplied && (
              <p className="rounded-xl bg-amber-200/10 p-2 text-xs leading-5 text-amber-100">
                Heavy motion is off. Your room shows the comfortable motion ceiling.
              </p>
            )}
            <MotionControls config={config} saving={saving} onMotion={onMotion} />
          </>
        ) : (
          <ComingSoon text="Motion presets are coming next for this room type." />
        )}
      </InspectorGroup>
    </section>
  );
}

function TextStyleControls({
  style,
  saving,
  allowColor,
  onChange,
}: {
  style: CanvasTextStyle;
  saving: boolean;
  allowColor: boolean;
  onChange: (style: Partial<CanvasTextStyle>) => void;
}) {
  return (
    <div className="grid gap-3">
      <ChoiceRow
        label="Size"
        value={style.size ?? "medium"}
        options={[["small", "Small"], ["medium", "Medium"], ["large", "Large"], ["feature", "Feature"]]}
        disabled={saving}
        onChange={(value) => onChange({ size: value as CanvasTextStyle["size"] })}
      />
      <ChoiceRow
        label="Font mood"
        value={style.fontMood ?? "display"}
        options={[["editorial", "Editorial"], ["display", "Display"], ["soft", "Soft"], ["mono", "Mono"]]}
        disabled={saving}
        onChange={(value) => onChange({ fontMood: value as CanvasTextStyle["fontMood"] })}
      />
      {allowColor ? (
        <ChoiceRow
          label="Colour"
          value={style.color ?? "ink"}
          options={[["ink", "Ink"], ["muted", "Muted"], ["paper", "Paper"], ["accent", "Accent"]]}
          disabled={saving}
          onChange={(value) => onChange({ color: value as CanvasTextStyle["color"] })}
        />
      ) : (
        <p className="rounded-xl border border-white/10 px-3 py-2 text-[11px] leading-5 text-stone-400">
          Entrance text colour stays readable over artwork.
        </p>
      )}
      <ChoiceRow
        label="Alignment"
        value={style.align ?? "left"}
        options={[["left", "Left"], ["center", "Centre"], ["right", "Right"]]}
        disabled={saving}
        onChange={(value) => onChange({ align: value as CanvasTextStyle["align"] })}
      />
      <div className="flex gap-2">
        <ToggleToken active={style.weight === "bold"} disabled={saving} label="Bold" onClick={() => onChange({ weight: style.weight === "bold" ? "regular" : "bold" })} />
        <ToggleToken active={style.italic === true} disabled={saving} label="Italic" onClick={() => onChange({ italic: !style.italic })} />
        <ToggleToken active={style.underline === true} disabled={saving} label="Underline" onClick={() => onChange({ underline: !style.underline })} />
      </div>
    </div>
  );
}

function ChoiceRow({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(([option, text]) => (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option)}
            className={`min-h-10 rounded-full px-3 py-2 text-[11px] font-semibold transition ${
              value === option ? "bg-amber-200 text-stone-950" : "border border-white/10 text-stone-300 hover:bg-white/5"
            } disabled:opacity-40`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToggleToken({ active, disabled, label, onClick }: { active: boolean; disabled: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`min-h-10 rounded-full px-3 py-2 text-[11px] font-semibold ${active ? "bg-amber-200 text-stone-950" : "border border-white/10 text-stone-300"} disabled:opacity-40`}
    >
      {label}
    </button>
  );
}

function AltTextEditor({
  initialValue,
  saving,
  onSave,
}: {
  initialValue: string;
  saving: boolean;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const inputId = useId();
  return (
    <div className="grid gap-2">
      <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500" htmlFor={inputId}>
        Alt text
      </label>
      <textarea
        id={inputId}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={3}
        placeholder="Describe this image for visitors using assistive technology"
        className="min-h-11 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs leading-5 text-stone-100 outline-none focus:border-amber-200/60"
      />
      <button type="button" disabled={saving || value.trim() === initialValue.trim()} onClick={() => onSave(value)} className={wideButtonClass()}>
        Add alt text
      </button>
    </div>
  );
}

function MoodControls({ config, saving, onMood }: { config: PresenceEditableConfig; saving: boolean; onMood: (id: string) => void }) {
  const selected = activeMoodId(config);
  return (
    <div data-testid="canvas-mood-controls" className="grid grid-cols-2 gap-2">
      {CANVAS_MOOD_PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          disabled={saving}
          onClick={() => onMood(preset.id)}
          className={`min-h-16 rounded-2xl border p-1.5 text-left text-[11px] font-semibold ${
            selected === preset.id ? "border-amber-200 bg-amber-200/10" : "border-white/10"
          } disabled:opacity-40`}
          title={preset.description}
        >
          <span className="block h-7 rounded-xl" style={{ background: preset.swatch }} />
          <span className="mt-1 block text-stone-200">{preset.label}</span>
        </button>
      ))}
    </div>
  );
}

function MotionControls({ config, saving, onMotion }: { config: PresenceEditableConfig; saving: boolean; onMotion: (id: string) => void }) {
  const selected = activeMotionId(config);
  return (
    <div className="grid gap-2">
      <div className="flex gap-1.5">
        {CANVAS_MOTION_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            disabled={saving}
            title={preset.description}
            onClick={() => onMotion(preset.id)}
            className={`min-h-11 flex-1 rounded-full px-2 py-2 text-[11px] font-semibold ${
              selected === preset.id ? "bg-amber-200 text-stone-950" : "border border-white/10 text-stone-300"
            } disabled:opacity-40`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] leading-5 text-stone-400">Comfort-first presets only. Reduced-motion support remains on.</p>
    </div>
  );
}

function CanvasActions({
  dirty,
  saving,
  onSave,
  onPreview,
  onPublish,
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onPreview: () => void;
  onPublish: () => void;
}) {
  return (
    <section className="mt-3 grid gap-2 rounded-3xl border border-white/10 bg-white/[0.035] p-3">
      <button type="button" disabled={saving || !dirty} onClick={onSave} className={wideButtonClass()}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {dirty ? "Save draft" : "All changes saved"}
      </button>
      <button type="button" onClick={onPreview} className={wideButtonClass()}>
        <Eye className="h-4 w-4" />
        Preview draft room
      </button>
      <button
        type="button"
        onClick={onPublish}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-300 px-4 py-2 text-xs font-semibold text-emerald-950 hover:bg-emerald-200"
      >
        <Send className="h-4 w-4" />
        Open to visitors
      </button>
    </section>
  );
}

function CanvasAssetPicker({
  target,
  renderModel,
  config,
  node,
  assets,
  canonicalBundle,
  saving,
  onClose,
  onChoose,
}: {
  target: CanvasElement | null;
  renderModel: PresenceRenderModel;
  config: PresenceEditableConfig;
  node: PresenceNode;
  assets: PresenceEditorAsset[];
  canonicalBundle: CanonicalAssetBundle | null;
  saving: boolean;
  onClose: () => void;
  onChoose: (url: string, altText: string) => void;
}) {
  const candidates = buildCanvasImageCandidates(config, node, assets, canonicalBundle);
  const current = target ? getResolvedCanvasImage(renderModel, target.canvasId) : { url: "", altText: "" };
  const [url, setUrl] = useState("");
  const [altText, setAltText] = useState(current.altText);
  const [warning, setWarning] = useState<string | null>(null);
  const [pending, setPending] = useState<{ url: string; altText: string } | null>(null);

  function choose(urlToUse: string, alt: string) {
    const check = validateAssetUrl(urlToUse);
    if (!check.isValid) {
      setWarning(check.errors[0] ?? "That image cannot be used safely.");
      setPending(null);
      return;
    }
    if (check.warnings.length > 0 && pending?.url !== urlToUse) {
      setWarning(check.warnings[0]);
      setPending({ url: urlToUse, altText: alt });
      return;
    }
    setWarning(check.warnings[0] ?? null);
    setPending(null);
    onChoose(urlToUse, alt);
  }

  return (
    <Modal title={`Change image${target ? ` - ${target.label}` : ""}`} onClose={onClose}>
      <div data-testid="canvas-asset-picker" className="grid gap-5">
        <p className="text-sm leading-6 text-stone-300">Choose from images already connected to this room.</p>
        {candidates.length > 0 ? (
          <div className="grid max-h-72 grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
            {candidates.map((candidate) => (
              <button
                type="button"
                key={candidate.id}
                disabled={saving}
                onClick={() => choose(candidate.url, candidate.altText)}
                className="min-h-36 overflow-hidden rounded-2xl border border-white/10 bg-black/20 text-left hover:border-amber-200/60 disabled:opacity-40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={candidate.url} alt="" className="h-24 w-full object-cover" />
                <span className="block px-2 pt-2 text-[10px] uppercase tracking-[0.14em] text-stone-500">{candidate.sourceLabel}</span>
                <span className="block truncate px-2 pb-2 text-xs text-stone-100">{candidate.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl bg-white/5 p-3 text-xs text-stone-300">No room images are attached yet.</p>
        )}
        <div className="rounded-2xl border border-amber-200/15 bg-amber-200/5 p-3 text-xs leading-5 text-amber-50">
          Upload from your device is coming next. For this pilot, choose an existing room image or ask the studio to add new images.
        </div>
        <details className="rounded-2xl border border-white/10 p-3">
          <summary className="cursor-pointer text-xs font-semibold text-stone-300">Advanced image link</summary>
          <div className="mt-3 grid gap-2">
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://images.example.com/your-image.jpg"
              className="min-h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-xs text-white outline-none focus:border-amber-200/50"
            />
            <input
              type="text"
              value={altText}
              onChange={(event) => setAltText(event.target.value)}
              placeholder="Alt text for this image"
              className="min-h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-xs text-white outline-none focus:border-amber-200/50"
            />
            <button type="button" disabled={saving || !url.trim()} onClick={() => choose(url, altText)} className={wideButtonClass()}>
              Use image link
            </button>
          </div>
        </details>
        {warning && (
          <div className="grid gap-2 rounded-xl border border-amber-200/20 bg-amber-200/10 p-3 text-xs text-amber-50">
            <p>{warning}</p>
            {pending && (
              <button type="button" disabled={saving} onClick={() => choose(pending.url, pending.altText)} className={wideButtonClass()}>
                Use this signed image link
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function WorkWallReorder({
  node,
  config,
  renderModel,
  saving,
  showCanonicalSync,
  onBringImages,
  onClose,
  onSave,
}: {
  node: PresenceNode;
  config: PresenceEditableConfig;
  renderModel: PresenceRenderModel;
  saving: boolean;
  showCanonicalSync: boolean;
  onBringImages: () => void;
  onClose: () => void;
  onSave: (order: string[]) => void;
}) {
  const works = getResolvedCanvasWorks(renderModel).filter((work) => work.isVisible);
  const [order, setOrder] = useState(() => works.map((work) => work.slug));
  const [dragging, setDragging] = useState<string | null>(null);
  const bySlug = new Map(works.map((work) => [work.slug, work]));

  function move(slug: string, shift: -1 | 1) {
    setOrder((current) => {
      const index = current.indexOf(slug);
      const destination = index + shift;
      if (index < 0 || destination < 0 || destination >= current.length) return current;
      const next = current.slice();
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  }
  function drop(over: string) {
    if (!dragging || dragging === over) return;
    setOrder((current) => {
      const next = current.filter((slug) => slug !== dragging);
      next.splice(next.indexOf(over), 0, dragging);
      return next;
    });
    setDragging(null);
  }

  return (
    <Modal title="Move work" onClose={onClose}>
      <div data-testid="work-wall-reorder" className="grid gap-4">
        {showCanonicalSync ? (
          <>
            <p className="text-sm leading-6 text-stone-300">Bring the live images into your draft room before changing their order.</p>
            <button type="button" onClick={onBringImages} className={wideButtonClass()}>Bring in live images</button>
          </>
        ) : (
          <>
            <p className="text-xs leading-5 text-stone-400">Drag on desktop, or use the arrow buttons on touch devices and keyboards.</p>
            <ol className="grid gap-2">
              {order.map((slug, index) => {
                const work = bySlug.get(slug);
                if (!work) return null;
                return (
                  <li
                    key={slug}
                    draggable
                    onDragStart={() => setDragging(slug)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => drop(slug)}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-2"
                  >
                    <GripVertical className="h-4 w-4 text-stone-500" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={work.imageUrl} alt="" className="h-12 w-10 rounded-lg object-cover" />
                    <span className="min-w-0 flex-1 truncate text-sm text-stone-100">{work.title}</span>
                    <button type="button" aria-label={`Move ${work.title} up`} disabled={saving || index === 0} onClick={() => move(slug, -1)} className="min-h-11 min-w-11 rounded-full border border-white/10 p-3 disabled:opacity-30">
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label={`Move ${work.title} down`} disabled={saving || index === order.length - 1} onClick={() => move(slug, 1)} className="min-h-11 min-w-11 rounded-full border border-white/10 p-3 disabled:opacity-30">
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ol>
            <button type="button" disabled={saving || order.length === 0} onClick={() => onSave(order)} className={wideButtonClass()}>
              <Save className="h-4 w-4" />
              Save work order
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-white/10 bg-[#121316] text-stone-100 shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#121316] px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-200/70">Canvas</p>
            <h2 className="mt-1 text-lg font-semibold">{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="min-h-11 min-w-11 rounded-full p-3 text-stone-300 hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="p-5">{children}</div>
      </section>
    </div>
  );
}

function MobileInspectorSheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[9000] flex items-end bg-black/45 lg:hidden">
      <section className="max-h-[82vh] w-full overflow-y-auto rounded-t-[2rem] border border-white/10 bg-[#101114] p-4 text-stone-100">
        <header className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-200/70">Canvas controls</p>
          <button type="button" aria-label="Close controls" onClick={onClose} className="min-h-11 min-w-11 rounded-full p-3">
            <X className="h-4 w-4" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function InspectorGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-3">
      <h4 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">{title}</h4>
      {children}
    </section>
  );
}

function ComingSoon({ text }: { text: string }) {
  return <p className="rounded-xl border border-white/10 px-3 py-2 text-xs leading-5 text-stone-400">{text}</p>;
}

function canChangeElement(element: CanvasElement, showCanonicalSync: boolean) {
  return !(element.workSlug && showCanonicalSync) && !(element.kind === "work-wall" && showCanonicalSync);
}

function wideButtonClass() {
  return "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-stone-100 transition hover:bg-white/10 disabled:opacity-40";
}

interface CanvasPalette {
  bg: string;
  paper: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
}

function canvasPalette(model: PresenceRenderModel): CanvasPalette {
  return {
    bg: model.palette.bg.value,
    paper: model.palette.paper.value,
    ink: model.palette.ink.value,
    muted: model.palette.muted.value,
    line: model.palette.line.value,
    accent: model.palette.accent.value,
  };
}
