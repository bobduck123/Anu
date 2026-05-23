"use client";

// PresenceCanvasMode — a visual, direct-manipulation editing layer.
//
// The default editor view. Instead of asking the owner to fill forms
// in 11 tabs, the canvas mode renders their actual draft room with
// click-to-edit affordances overlaid on the things they can change:
//
//   - hero title + caption  → click to rewrite
//   - work titles           → click to rename (in-scene edit)
//   - studio statement      → click to rewrite
//   - calling-card lines    → click to edit each field
//   - mood preset           → choose visually from a swatch row
//   - liquid transition     → choose visually
//   - hero image            → "Replace image" affordance
//
// The 11-tab CRM stays available via "Open advanced controls" for
// power users. Changes flow through the same `mutate()` pipeline as
// the rest of the editor so saving / publishing / readiness still
// work without modification.

import { useMemo, useState, type ReactNode } from "react";
import { ArrowRight, Eye, Loader2, Save, Send, Sparkles, Wand2 } from "lucide-react";
import type {
  PresenceEditableConfig,
  PresenceNode,
} from "@/lib/api/types";
import PortfolioRenderer from "@/components/portfolio/PortfolioRenderer";
import { ROOM_DNA_PRESETS, applyRoomDnaPreset } from "@/lib/editor/presets";
import { type CanonicalAssetBundle } from "@/lib/editor/canonicalAssets";

interface PresenceCanvasModeProps {
  node: PresenceNode;
  config: PresenceEditableConfig;
  mutate: (next: (draft: PresenceEditableConfig) => PresenceEditableConfig) => void;
  dirty: boolean;
  saving: boolean;
  onSaveDraft: () => Promise<unknown>;
  onOpenAdvanced: (tabId: string) => void;
  onPublishRequest: () => void;
  showCanonicalSync: boolean;
  canonicalBundle: CanonicalAssetBundle | null;
  onSyncCanonical: () => void;
}

type EditingField =
  | null
  | { kind: "hero-title"; current: string }
  | { kind: "hero-caption"; current: string }
  | { kind: "scene-title"; sceneIndex: number; current: string }
  | { kind: "statement"; current: string }
  | { kind: "biography"; current: string }
  | { kind: "process-notes"; current: string }
  | { kind: "calling-card-title"; current: string }
  | { kind: "calling-card-copy"; current: string }
  | { kind: "enquiry-cta"; current: string }
  | { kind: "hero-image"; current: string };

export default function PresenceCanvasMode({
  node,
  config,
  mutate,
  dirty,
  saving,
  onSaveDraft,
  onOpenAdvanced,
  onPublishRequest,
  showCanonicalSync,
  canonicalBundle,
  onSyncCanonical,
}: PresenceCanvasModeProps) {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [editing, setEditing] = useState<EditingField>(null);

  // The renderer expects status: "published" to draw the room as the
  // public surface would. We mirror that for the canvas preview so
  // the owner sees what their visitors will see.
  const draftNode = useMemo(() => draftNodeForRenderer(node, config), [node, config]);

  const heroTitle = readSceneField(config, "artwork_field", "title") || node.display_name;
  const heroCaption = readSceneField(config, "artwork_field", "statement") || node.headline || "";
  const callingTitle = readContentPath(config, ["contact", "contact_title"]) || "Calling Card";
  const callingCopy = readContentPath(config, ["contact", "contact_copy"]) || "";
  const enquiryCta = String((asRecord(config.enquiry_config).cta_label ?? "Begin a conversation"));
  const biography = readContentPath(config, ["about", "biography"]) || node.bio || "";
  const statement = readContentPath(config, ["about", "artist_statement"]) || node.practice_statement || "";
  const processNotes = readContentPath(config, ["about", "process_notes"]) || node.long_story || "";
  const heroImage = String(asRecord(asRecord(config.asset_config).hero_image).url ?? "");

  const activePreset = (asRecord(config.style_dna).palette as Record<string, unknown> | undefined)?.bg;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      {/* ─── Left: live canvas preview with edit affordances ─── */}
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-[0_30px_60px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between border-b border-white/10 bg-black/30 px-4 py-2.5 text-xs text-stone-300">
          <span className="inline-flex items-center gap-2 font-semibold uppercase tracking-[0.2em]">
            <Sparkles className="h-3.5 w-3.5 text-amber-200" />
            Canvas
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
            What visitors will see · click any element to edit
          </span>
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-0.5">
            {(["desktop", "mobile"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize transition ${
                  viewMode === mode ? "bg-amber-200 text-stone-950" : "text-stone-300 hover:text-stone-50"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
        <div
          className={
            viewMode === "mobile"
              ? "relative mx-auto h-[640px] max-w-[420px] overflow-hidden border-x border-white/10 bg-black"
              : "relative h-[640px] overflow-hidden bg-black"
          }
        >
          <div className="absolute inset-0 overflow-hidden">
            <PortfolioRenderer node={draftNode} />
          </div>

          {/* Click-to-edit affordances overlay. Pointer-events:none on
              the wrapper so the underlying canvas remains usable; each
              child <button> re-enables clicks. */}
          <div className="pointer-events-none absolute inset-0">
            {/* Hero title affordance — bottom-center of the artwork. */}
            <CanvasAffordance
              kind="hero-title"
              tooltip="Edit room title"
              style={{ left: "50%", top: "62%", transform: "translate(-50%, -50%)", minWidth: 260 }}
              onClick={() => setEditing({ kind: "hero-title", current: heroTitle })}
            >
              {heroTitle}
            </CanvasAffordance>

            {/* Hero caption affordance — below the title. */}
            <CanvasAffordance
              kind="hero-caption"
              tooltip="Edit caption"
              style={{ left: "50%", top: "70%", transform: "translate(-50%, -50%)", minWidth: 220 }}
              onClick={() => setEditing({ kind: "hero-caption", current: heroCaption })}
            >
              {heroCaption || "Add a short caption"}
            </CanvasAffordance>

            {/* Hero image replace — top-right corner. */}
            <CanvasAffordance
              kind="hero-image"
              tooltip="Replace cover image"
              style={{ right: 16, top: 16 }}
              onClick={() => setEditing({ kind: "hero-image", current: heroImage })}
            >
              <span className="inline-flex items-center gap-1.5">
                <Wand2 className="h-3 w-3" />
                Replace cover
              </span>
            </CanvasAffordance>

            {/* Right rail — opens the deeper editor for any scene. */}
            <div className="pointer-events-auto absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
              {[
                { tabId: "work-wall", label: "Edit work wall" },
                { tabId: "practice", label: "Edit studio" },
                { tabId: "calling-card", label: "Edit calling card" },
              ].map((entry) => (
                <button
                  key={entry.tabId}
                  type="button"
                  onClick={() => onOpenAdvanced(entry.tabId)}
                  className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur transition hover:bg-white/25"
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Right rail: visual mood swatches + quick text edits + actions ─── */}
      <div className="grid content-start gap-3">
        {showCanonicalSync && canonicalBundle && (
          <Card tone="amber" title="Live room has art you can't edit yet">
            <p className="text-xs leading-5 text-amber-100">
              {canonicalBundle.count} canonical artworks are live but not in your editable config. Sync
              them now to paint over them.
            </p>
            <button
              type="button"
              onClick={onSyncCanonical}
              className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-200 px-3 py-1.5 text-xs font-semibold text-stone-950 hover:bg-amber-100"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Sync from live room
            </button>
          </Card>
        )}

        <Card title="Pick a mood">
          <p className="mb-2 text-[11px] leading-4 text-stone-400">
            Choose a starting feel. You can fine-tune everything later in <button type="button" className="underline" onClick={() => onOpenAdvanced("style")}>Style DNA</button>.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {ROOM_DNA_PRESETS.map((preset) => {
              const active = activePreset === ((preset.style_dna as Record<string, unknown>).palette as Record<string, unknown> | undefined)?.bg;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => mutate((draft) => applyRoomDnaPreset(draft, preset))}
                  className={`group flex flex-col gap-1.5 rounded-2xl border p-1.5 text-left transition ${
                    active ? "border-amber-200/80 bg-amber-200/10" : "border-white/10 hover:border-white/30"
                  }`}
                >
                  <span
                    className="block h-12 w-full rounded-xl"
                    style={{ background: preset.swatch }}
                    aria-hidden
                  />
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-200">
                    {preset.name}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card title="Words on the canvas">
          <CanvasInlineRow
            label="About title"
            value={callingTitle}
            placeholder="e.g. Calling Card"
            onClick={() => setEditing({ kind: "calling-card-title", current: callingTitle })}
          />
          <CanvasInlineRow
            label="Statement"
            value={statement}
            placeholder="Add your artist statement"
            onClick={() => setEditing({ kind: "statement", current: statement })}
          />
          <CanvasInlineRow
            label="Biography"
            value={biography}
            placeholder="A few sentences about your practice"
            onClick={() => setEditing({ kind: "biography", current: biography })}
          />
          <CanvasInlineRow
            label="Process notes"
            value={processNotes}
            placeholder="Optional — how the work is made"
            onClick={() => setEditing({ kind: "process-notes", current: processNotes })}
          />
          <CanvasInlineRow
            label="Calling card copy"
            value={callingCopy}
            placeholder="The line under your name on the calling card"
            onClick={() => setEditing({ kind: "calling-card-copy", current: callingCopy })}
          />
          <CanvasInlineRow
            label="Invitation"
            value={enquiryCta}
            placeholder="Begin a conversation"
            onClick={() => setEditing({ kind: "enquiry-cta", current: enquiryCta })}
          />
        </Card>

        <Card title="Save & open">
          <div className="grid gap-2">
            <button
              type="button"
              disabled={saving || !dirty}
              onClick={() => void onSaveDraft()}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-stone-100 hover:bg-white/10 disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {dirty ? "Save draft" : "All changes saved"}
            </button>
            <button
              type="button"
              onClick={onPublishRequest}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-950 hover:bg-emerald-200"
            >
              <Send className="h-3.5 w-3.5" />
              Open room to visitors
            </button>
            <button
              type="button"
              onClick={() => onOpenAdvanced("overview")}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400 hover:bg-white/5 hover:text-stone-100"
            >
              <Eye className="h-3.5 w-3.5" />
              Open advanced controls
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </Card>
      </div>

      {editing && (
        <EditDrawer
          editing={editing}
          onCancel={() => setEditing(null)}
          onSave={(value) => {
            applyEdit(mutate, editing, value);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

// ── Canvas affordance — invisible at rest, glows on hover ─────────────────

interface CanvasAffordanceProps {
  kind: string;
  tooltip: string;
  style?: React.CSSProperties;
  onClick: () => void;
  children: ReactNode;
}

function CanvasAffordance({ kind, tooltip, style, onClick, children }: CanvasAffordanceProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pointer-events-auto absolute inline-flex items-center gap-1 rounded-md border border-dashed border-amber-200/0 bg-amber-200/0 px-2 py-1 text-xs text-white opacity-0 transition hover:border-amber-200/80 hover:bg-amber-200/15 hover:opacity-100 focus-visible:border-amber-200/80 focus-visible:bg-amber-200/15 focus-visible:opacity-100"
      style={style}
      data-canvas-kind={kind}
      title={tooltip}
      aria-label={tooltip}
    >
      <span className="block max-w-[18rem] truncate text-left">{children}</span>
    </button>
  );
}

// ── Card shell used in the right rail ──────────────────────────────────────

function Card({
  title,
  tone = "default",
  children,
}: {
  title: string;
  tone?: "default" | "amber";
  children: ReactNode;
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200/30 bg-amber-200/10"
      : "border-white/10 bg-white/[0.04]";
  return (
    <section className={`rounded-3xl border ${toneClass} p-3`}>
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
        {title}
      </h3>
      {children}
    </section>
  );
}

// ── Inline editable row — shows current value, click to edit ──────────────

function CanvasInlineRow({
  label,
  value,
  placeholder,
  onClick,
}: {
  label: string;
  value: string;
  placeholder: string;
  onClick: () => void;
}) {
  const display = value.trim();
  return (
    <button
      type="button"
      onClick={onClick}
      className="group mt-1 flex w-full flex-col gap-0.5 rounded-2xl border border-white/5 bg-black/20 px-3 py-2 text-left transition hover:border-amber-200/40"
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500 group-hover:text-amber-200/80">
        {label}
      </span>
      <span className={`block truncate text-[12px] leading-5 ${display ? "text-stone-100" : "text-stone-500"}`}>
        {display || placeholder}
      </span>
    </button>
  );
}

// ── Edit drawer — modal for typing the new value ──────────────────────────

function EditDrawer({
  editing,
  onCancel,
  onSave,
}: {
  editing: NonNullable<EditingField>;
  onCancel: () => void;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(editing.current);
  const isMulti =
    editing.kind === "statement" ||
    editing.kind === "biography" ||
    editing.kind === "process-notes" ||
    editing.kind === "calling-card-copy";
  const label = labelForEdit(editing);
  const placeholder = placeholderForEdit(editing);
  const isUrl = editing.kind === "hero-image";

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#111214] text-stone-100 shadow-2xl">
        <header className="border-b border-white/10 px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-200/70">Canvas edit</p>
          <h2 className="mt-1 text-lg font-semibold">{label}</h2>
        </header>
        <div className="px-5 py-5">
          {isMulti ? (
            <textarea
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              rows={6}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm leading-6 text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-200/50"
            />
          ) : (
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-200/50"
            />
          )}
          {isUrl && (
            <p className="mt-2 text-[11px] leading-5 text-stone-400">
              Paste a public https image URL. Upload from disk is coming next pass — for now, host your image on a public URL (Cloudinary, Supabase storage, your own website) and paste it here.
            </p>
          )}
        </div>
        <footer className="flex justify-end gap-2 border-t border-white/10 bg-black/30 px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-stone-300 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(value)}
            className="rounded-full bg-amber-200 px-4 py-2 text-xs font-semibold text-stone-950 hover:bg-amber-100"
          >
            Save to draft
          </button>
        </footer>
      </div>
    </div>
  );
}

function labelForEdit(editing: NonNullable<EditingField>): string {
  switch (editing.kind) {
    case "hero-title": return "Room title";
    case "hero-caption": return "Room caption";
    case "scene-title": return "Scene title";
    case "statement": return "Artist statement";
    case "biography": return "Biography";
    case "process-notes": return "Process notes";
    case "calling-card-title": return "Calling card title";
    case "calling-card-copy": return "Calling card copy";
    case "enquiry-cta": return "Invitation language";
    case "hero-image": return "Cover image URL";
  }
}

function placeholderForEdit(editing: NonNullable<EditingField>): string {
  switch (editing.kind) {
    case "hero-title": return "Christina Kerkvliet Goddard";
    case "hero-caption": return "selected watercolour works";
    case "statement": return "Memory Colours revisits and haunts its sites of episode...";
    case "biography": return "A few sentences about your practice";
    case "process-notes": return "How the work is made — optional";
    case "calling-card-title": return "Calling Card";
    case "calling-card-copy": return "Use the Presence enquiry form to begin a conversation.";
    case "enquiry-cta": return "Begin a conversation";
    case "hero-image": return "https://...";
    default: return "";
  }
}

// ── Apply edit through the editor's mutate pipeline ───────────────────────

function applyEdit(
  mutate: (next: (draft: PresenceEditableConfig) => PresenceEditableConfig) => void,
  editing: NonNullable<EditingField>,
  value: string,
) {
  switch (editing.kind) {
    case "hero-title":
      mutate((draft) => setSceneField(draft, "artwork_field", "title", value));
      break;
    case "hero-caption":
      mutate((draft) => setSceneField(draft, "artwork_field", "statement", value));
      break;
    case "statement":
      mutate((draft) => setContentPath(draft, ["about", "artist_statement"], value));
      break;
    case "biography":
      mutate((draft) => setContentPath(draft, ["about", "biography"], value));
      break;
    case "process-notes":
      mutate((draft) => setContentPath(draft, ["about", "process_notes"], value));
      break;
    case "calling-card-title":
      mutate((draft) => setContentPath(draft, ["contact", "contact_title"], value));
      break;
    case "calling-card-copy":
      mutate((draft) => setContentPath(draft, ["contact", "contact_copy"], value));
      break;
    case "enquiry-cta":
      mutate((draft) => ({
        ...draft,
        enquiry_config: { ...asRecord(draft.enquiry_config), cta_label: value },
      }));
      break;
    case "hero-image":
      mutate((draft) => ({
        ...draft,
        asset_config: {
          ...asRecord(draft.asset_config),
          hero_image: {
            ...asRecord(asRecord(draft.asset_config).hero_image),
            url: value,
            alt_text: String(asRecord(asRecord(draft.asset_config).hero_image).alt_text ?? "Cover image"),
          },
        },
      }));
      break;
    case "scene-title":
      mutate((draft) => setSceneAtIndex(draft, editing.sceneIndex, "title", value));
      break;
  }
}

// ── Renderer adapter ──────────────────────────────────────────────────────

function draftNodeForRenderer(node: PresenceNode, config: PresenceEditableConfig): PresenceNode {
  return {
    ...node,
    renderer_key: config.renderer_key ?? node.renderer_key,
    editable_config: { ...config, status: "published" },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readSceneField(config: PresenceEditableConfig, sceneId: string, field: string): string {
  const sceneCfg = asRecord(config.scene_config);
  const scenes = Array.isArray(sceneCfg.scenes) ? sceneCfg.scenes : [];
  for (const scene of scenes) {
    const s = asRecord(scene);
    if (String(s.id ?? "") === sceneId) {
      return String(s[field] ?? "");
    }
  }
  return "";
}

function setSceneField(
  config: PresenceEditableConfig,
  sceneId: string,
  field: string,
  value: string,
): PresenceEditableConfig {
  const sceneCfg = asRecord(config.scene_config);
  const scenes = Array.isArray(sceneCfg.scenes) ? sceneCfg.scenes.slice() : [];
  let found = false;
  for (let i = 0; i < scenes.length; i++) {
    const s = asRecord(scenes[i]);
    if (String(s.id ?? "") === sceneId) {
      scenes[i] = { ...s, [field]: value };
      found = true;
      break;
    }
  }
  if (!found) {
    scenes.push({ id: sceneId, [field]: value });
  }
  return {
    ...config,
    scene_config: { ...sceneCfg, scenes },
  };
}

function setSceneAtIndex(
  config: PresenceEditableConfig,
  index: number,
  field: string,
  value: string,
): PresenceEditableConfig {
  const sceneCfg = asRecord(config.scene_config);
  const scenes = Array.isArray(sceneCfg.scenes) ? sceneCfg.scenes.slice() : [];
  if (index >= scenes.length) return config;
  const s = asRecord(scenes[index]);
  scenes[index] = { ...s, [field]: value };
  return {
    ...config,
    scene_config: { ...sceneCfg, scenes },
  };
}

function readContentPath(config: PresenceEditableConfig, path: string[]): string {
  let cursor: unknown = config.content_config;
  for (const key of path) {
    cursor = asRecord(cursor)[key];
  }
  return typeof cursor === "string" ? cursor : cursor == null ? "" : String(cursor);
}

function setContentPath(
  config: PresenceEditableConfig,
  path: string[],
  value: string,
): PresenceEditableConfig {
  if (path.length === 0) return config;
  const next = { ...asRecord(config.content_config) };
  let cursor: Record<string, unknown> = next;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    const existing = asRecord(cursor[key]);
    const clone = { ...existing };
    cursor[key] = clone;
    cursor = clone;
  }
  cursor[path[path.length - 1]] = value;
  return {
    ...config,
    content_config: next,
  };
}
