"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Clock3,
  Eye,
  Image as ImageIcon,
  KeyRound,
  Loader2,
  Palette,
  Plus,
  Radio,
  RefreshCw,
  RotateCcw,
  Send,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react";
import { API_BASE, PresenceApiError } from "@/lib/api/client";
import {
  attachPresenceEditorAsset,
  createPresenceEditorDraft,
  getPresenceEditor,
  getPresenceEditorHistory,
  listPresenceEditorAssets,
  patchPresenceEditorDraft,
  previewPresenceEditorDraft,
  publishPresenceEditorDraft,
  rollbackPresenceEditor,
  uploadPresenceEditorAsset,
  type PresenceEditorConfigInput,
} from "@/lib/api/editor";
import type {
  PresenceEditableConfig,
  PresenceEditorAsset,
  PresenceEditorOverview,
  PresenceNode,
} from "@/lib/api/types";
import { canonicalPublicUrl } from "@/lib/presence/url";
import { assetSafetyMessage, validateAssetUrl } from "@/lib/editor/assetValidator";
import { buildReadinessReport, type ReadinessReport } from "@/lib/editor/readiness";
import { applyRoomDnaPreset, ROOM_DNA_PRESETS } from "@/lib/editor/presets";
import {
  applyCanonicalBundle,
  getCanonicalAssetBundle,
  isAssetConfigEmpty,
  type CanonicalAssetBundle,
} from "@/lib/editor/canonicalAssets";
import PublishConfirmDialog from "./PublishConfirmDialog";
import ReadinessPanel from "./ReadinessPanel";
import PresenceCanvasMode from "./PresenceCanvasMode";
import { EditorStatusStrip } from "./EditorStatusStrip";
import { EditorTopBar } from "./EditorTopBar";
import { LookPanel } from "./canvas/LookPanel";
import { MediaDrawer } from "./canvas/MediaDrawer";

type TabId =
  | "canvas"
  | "look"
  | "images"
  | "overview"
  | "scenes"
  | "work-wall"
  | "practice"
  | "calling-card"
  | "style"
  | "motion"
  | "roomkey"
  | "assets"
  | "preview"
  | "history";

interface PresenceStudioEditorAppProps {
  node: PresenceNode;
  nodeId: number;
  token: string;
  onNodeReload?: () => Promise<void> | void;
}

interface EditableWork {
  id?: number | string | null;
  slug: string;
  title: string;
  year?: string | number | null;
  medium?: string | null;
  dimensions?: string | null;
  caption?: string | null;
  description?: string | null;
  url?: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  alt_text?: string | null;
  sort_order?: number;
  is_visible?: boolean;
}

const TABS: Array<{ id: TabId; label: string; icon: typeof Sparkles }> = [
  { id: "canvas", label: "Canvas", icon: Palette },
  { id: "overview", label: "Overview", icon: Sparkles },
  { id: "scenes", label: "Scenes", icon: SlidersHorizontal },
  { id: "work-wall", label: "Work Wall", icon: ImageIcon },
  { id: "practice", label: "Practice / About", icon: Sparkles },
  { id: "calling-card", label: "Calling Card", icon: Send },
  { id: "style", label: "Style DNA", icon: Palette },
  { id: "motion", label: "Motion / Texture", icon: ArrowLeftRight },
  { id: "roomkey", label: "RoomKey", icon: KeyRound },
  { id: "assets", label: "Assets", icon: ImageIcon },
  { id: "preview", label: "Preview / Publish", icon: Eye },
  { id: "history", label: "History / Rollback", icon: Clock3 },
];

const OWNER_MODES: Array<{ id: TabId; label: string; icon: typeof Sparkles }> = [
  { id: "canvas", label: "Build", icon: Palette },
  { id: "look", label: "Look", icon: Sparkles },
  { id: "images", label: "Images", icon: ImageIcon },
  { id: "preview", label: "Preview", icon: Eye },
];

const DEFAULT_SCENES = [
  { id: "artwork_field", number: "01", label: "Artwork Field", subtitle: "liquid slideshow" },
  { id: "work_wall", number: "02", label: "Work Wall", subtitle: "selected watercolours" },
  { id: "practice_studio", number: "03", label: "Practice Studio", subtitle: "workbench, notes, references" },
  { id: "calling_card", number: "04", label: "Calling Card", subtitle: "an invitation" },
];

const SAFE_FONTS = [
  "Inter, Helvetica Neue, Arial, sans-serif",
  "Georgia, Times New Roman, serif",
  "Helvetica Neue, Arial, sans-serif",
  "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
];

const DEFAULT_LOCKED_FIELDS = {
  renderer_shell: {
    locked: true,
    reason:
      "Commissioned renderer chrome and shader contract. Owners control scenes, content, assets, style tokens, motion tokens, RoomKey, and enquiry posture through this editor.",
  },
  reduced_motion_fallback: {
    system_controlled: true,
    reason: "Accessibility fallback must remain available.",
  },
};

export default function PresenceStudioEditorApp({
  node,
  nodeId,
  token,
  onNodeReload,
}: PresenceStudioEditorAppProps) {
  const [overview, setOverview] = useState<PresenceEditorOverview | null>(null);
  const [config, setConfig] = useState<PresenceEditableConfig | null>(null);
  const [baseSnapshot, setBaseSnapshot] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("canvas");
  const [advancedVisible, setAdvancedVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [assetLoading, setAssetLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [mobilePreviewReviewed] = useState(false);
  const [attachForm, setAttachForm] = useState({ slot: "attached_assets", url: "", alt_text: "" });
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [runtimeDebugVisible, setRuntimeDebugVisible] = useState(false);

  const loadEditor = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setActionError(null);
    try {
      const data = await getPresenceEditor(nodeId, token);
      const normal = normalizeConfig(data.draft ?? data.published ?? data.suggested_config, node);
      setOverview(data);
      setConfig(normal);
      setBaseSnapshot(snapshot(normal));
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [node, nodeId, token]);

  useEffect(() => {
    void loadEditor();
  }, [loadEditor]);

  useEffect(() => {
    setRuntimeDebugVisible(new URLSearchParams(window.location.search).get("debug") === "1");
  }, []);

  const dirty = useMemo(() => Boolean(config && snapshot(config) !== baseSnapshot), [config, baseSnapshot]);
  const readiness = useMemo(
    () => (config ? buildReadinessReport({ config, overview, node, dirty, mobilePreviewReviewed }) : null),
    [config, dirty, mobilePreviewReviewed, node, overview],
  );
  const blockingIssues = readiness?.critical ?? [];
  const publicUrl = canonicalPublicUrl(node.slug);

  function mutate(next: (draft: PresenceEditableConfig) => PresenceEditableConfig) {
    setConfig((current) => next(cloneConfig(current ?? createFallbackConfig(node))));
    setNotice(null);
    setActionError(null);
  }

  // Canonical asset sync — the live room renders artworks via renderer
  // fallbacks (e.g. GGM_WORKS for the GGM renderer) but the editable
  // config may have an empty asset_config. Offer a one-click import so
  // the editor reflects what the visitor sees.
  const canonicalBundle = useMemo<CanonicalAssetBundle | null>(
    () => getCanonicalAssetBundle(node),
    [node],
  );
  const assetConfigEmpty = useMemo(
    () => (config ? isAssetConfigEmpty(config) : false),
    [config],
  );
  const showCanonicalSync = Boolean(canonicalBundle && assetConfigEmpty);

  async function syncCanonicalAssets() {
    if (!canonicalBundle) return;
    await commitCanvasChange((draft) => applyCanonicalBundle(draft, canonicalBundle));
  }

  async function saveDraft(candidate: PresenceEditableConfig | null = config): Promise<PresenceEditableConfig | null> {
    if (!candidate) return null;
    setSaving(true);
    setActionError(null);
    try {
      const payload = toConfigInput(candidate);
      const response = overview?.draft
        ? await patchPresenceEditorDraft(nodeId, token, payload)
        : await createPresenceEditorDraft(nodeId, token, payload);
      const draft = normalizeConfig(response.draft, node);
      setConfig(draft);
      setBaseSnapshot(snapshot(draft));
      setOverview((current) =>
        current
          ? { ...current, draft, history: [draft, ...current.history.filter((item) => item.id !== draft.id)] }
          : current,
      );
      setNotice(response.created ? "Draft room created. All changes saved." : "All changes saved to your draft room.");
      return draft;
    } catch (err) {
      setActionError(errorMessage(err));
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function commitCanvasChange(next: (draft: PresenceEditableConfig) => PresenceEditableConfig): Promise<boolean> {
    if (!config || saving) return false;
    const changed = next(cloneConfig(config));
    setConfig(changed);
    setNotice(null);
    setActionError(null);
    return Boolean(await saveDraft(changed));
  }

  function openAdvanced(target: string) {
    setAdvancedVisible(true);
    setActiveTab(target as TabId);
  }

  async function runPreview() {
    setPreviewing(true);
    setActionError(null);
    try {
      if (dirty) {
        const saved = await saveDraft();
        if (!saved) return;
      }
      const payload = await previewPresenceEditorDraft(nodeId, token);
      setOverview((current) => (current && payload.draft ? { ...current, draft: payload.draft } : current));
      setActiveTab("preview");
      setNotice("Draft preview generated. This is owner-authenticated and does not publish changes.");
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setPreviewing(false);
    }
  }

  async function runPublish() {
    if (!config) return;
    setPublishing(true);
    setActionError(null);
    try {
      if (dirty || !overview?.draft) {
        const saved = await saveDraft();
        if (!saved) return;
      }
      const result = await publishPresenceEditorDraft(nodeId, token);
      const published = normalizeConfig(result.published, node);
      setPublishConfirmOpen(false);
      setOverview((current) =>
        current
          ? {
              ...current,
              draft: null,
              published,
              published_public_config: result.public_config,
              history: [published, ...current.history.filter((item) => item.id !== published.id)],
            }
          : current,
      );
      setConfig(published);
      setBaseSnapshot(snapshot(published));
      setNotice("Your live room is open to visitors. Your earlier live version remains available to restore.");
      await onNodeReload?.();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setPublishing(false);
    }
  }

  async function reloadHistory() {
    setHistoryLoading(true);
    setActionError(null);
    try {
      const history = await getPresenceEditorHistory(nodeId, token);
      setOverview((current) => (current ? { ...current, history: history.items } : current));
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setHistoryLoading(false);
    }
  }

  async function reloadAssets() {
    setAssetLoading(true);
    setActionError(null);
    try {
      const assets = await listPresenceEditorAssets(nodeId, token);
      setOverview((current) => (current ? { ...current, assets: assets.items } : current));
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setAssetLoading(false);
    }
  }

  async function uploadDraftImage(file: File, altText: string, role: string): Promise<PresenceEditorAsset | null> {
    if (dirty) {
      const saved = await saveDraft();
      if (!saved) return null;
    }
    setAssetLoading(true);
    setActionError(null);
    try {
      const response = await uploadPresenceEditorAsset(nodeId, token, { file, altText, role });
      const draft = normalizeConfig(response.draft, node);
      setConfig(draft);
      setBaseSnapshot(snapshot(draft));
      setOverview((current) =>
        current
          ? {
              ...current,
              draft,
              assets: response.assets,
              history: [draft, ...current.history.filter((item) => item.id !== draft.id)],
            }
          : current,
      );
      setNotice(
        response.uploaded_asset.visibility === "private_draft"
          ? "Image uploaded to your Draft room. Only you can see it until you open the room."
          : "Image uploaded for your Draft room. Use only public-safe images until protected uploads are enabled.",
      );
      return response.uploaded_asset;
    } catch (err) {
      setActionError(errorMessage(err));
      return null;
    } finally {
      setAssetLoading(false);
    }
  }

  async function attachAsset() {
    if (!attachForm.url.trim()) {
      setActionError("Add a public asset URL or public asset path first.");
      return;
    }
    const warning = unsafeAssetReason(attachForm.url);
    if (warning) {
      setActionError(warning);
      return;
    }
    setAssetLoading(true);
    setActionError(null);
    try {
      const response = await attachPresenceEditorAsset(nodeId, token, {
        slot: attachForm.slot,
        asset_type: attachForm.slot === "thumbnails" ? "thumbnail" : "image",
        url: attachForm.url,
        alt_text: attachForm.alt_text,
      });
      const draft = normalizeConfig(response.draft, node);
      setConfig(draft);
      setBaseSnapshot(snapshot(draft));
      setOverview((current) => (current ? { ...current, draft, assets: response.assets } : current));
      setAttachForm({ slot: "attached_assets", url: "", alt_text: "" });
      setNotice("Asset attached to draft config.");
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setAssetLoading(false);
    }
  }

  async function rollbackTo(item: PresenceEditableConfig) {
    const target = item.version ? `version ${item.version}` : `config ${item.id}`;
    const confirmed = window.confirm(`Rollback live published config to ${target}? This creates a new published version.`);
    if (!confirmed) return;
    setPublishing(true);
    setActionError(null);
    try {
      const response = await rollbackPresenceEditor(nodeId, token, {
        version: item.version,
        config_id: item.id,
      });
      const published = normalizeConfig(response.published, node);
      setOverview((current) =>
        current
          ? {
              ...current,
              published,
              published_public_config: response.public_config,
              history: [published, ...current.history],
            }
          : current,
      );
      setConfig(published);
      setBaseSnapshot(snapshot(published));
      setNotice("Rollback published as a new live version.");
      await onNodeReload?.();
      await reloadHistory();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-16 text-[var(--p-studio-muted)]">
        <Loader2 className="h-7 w-7 animate-spin" />
        <p className="text-sm">Opening your draft room...</p>
      </div>
    );
  }

  if (loadError || !config) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <StateCard
          tone="error"
          title="Studio is unavailable"
          body={loadError ?? "Your draft room could not be opened."}
          action={<button className={buttonClass("secondary")} onClick={() => void loadEditor()}>Retry</button>}
        />
      </div>
    );
  }

  return (
    <div className="px-3 py-4 sm:px-5 lg:px-7">
      <div className="mx-auto max-w-[88rem] overflow-hidden rounded-[2rem] border border-[#dfd4c5] bg-[#171614] text-stone-100 shadow-[0_30px_80px_rgba(0,0,0,0.22)]">
        <EditorTopBar
          roomName={node.display_name}
          roomId={nodeId}
          publicUrl={publicUrl}
          hasLiveRoom={Boolean(overview?.published)}
          dirty={dirty}
          saving={saving}
          publishing={publishing}
          blockedCount={blockingIssues.length}
          onSave={() => void saveDraft()}
          onOpenVisitors={() => setPublishConfirmOpen(true)}
        />
        <EditorStatusStrip
          hasLiveRoom={Boolean(overview?.published)}
          hasSavedDraft={Boolean(overview?.draft)}
          dirty={dirty}
          saving={saving}
          publishing={publishing}
        />
        <div className="bg-[#f5f0e8] px-5 pb-4 sm:px-7">
          {blockingIssues.length > 0 && (
            <p
              id="publish-blocked-reason"
              data-testid="publish-blocked-reason"
              className="rounded-2xl border border-[#d9af8d] bg-[#f8eadd] px-4 py-3 text-sm text-[#704430]"
            >
              Open room to visitors after you fix {blockingIssues.length} {blockingIssues.length === 1 ? "thing" : "things"}: {blockingIssues.map((issue) => issue.label).join(" ")}
            </p>
          )}
          {runtimeDebugVisible && (
            <HostedRuntimeDiagnostics
              editorConnected={Boolean(overview && !loadError)}
              previewPatchPresent
              sessionReady={Boolean(token)}
            />
          )}

          {(notice || actionError) && (
            <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${actionError ? "border-[#d9af8d] bg-[#f8eadd] text-[#704430]" : "border-[#b7d1bd] bg-[#e7efe7] text-[#295c43]"}`}>
              {actionError ?? notice}
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className="border-b border-[#dfd4c5] bg-[#f5f0e8] p-3 text-[#302921] lg:border-b-0 lg:border-r">
            <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
              {(advancedVisible ? TABS : OWNER_MODES).map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={`flex min-w-max items-center gap-2 rounded-2xl px-3 py-2 text-left text-xs font-semibold transition lg:min-w-0 ${
                      active
                        ? "bg-[#e7d8bd] text-[#302921]"
                        : "border border-transparent text-[#6e6256] hover:border-[#dfd4c5] hover:bg-[#ede5d7] hover:text-[#302921]"
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {tab.label}
                  </button>
                );
              })}
              {!advancedVisible && (
                <button
                  type="button"
                  className="flex min-w-max items-center gap-2 rounded-2xl border border-[#dfd4c5] px-3 py-2 text-left text-xs font-semibold text-[#6e6256] transition hover:bg-[#ede5d7] hover:text-[#302921] lg:mt-3 lg:min-w-0"
                  onClick={() => openAdvanced("overview")}
                >
                  <SlidersHorizontal className="h-4 w-4 shrink-0" />
                  Advanced controls
                </button>
              )}
              {advancedVisible && (
                <button
                  type="button"
                  className="mt-2 flex min-w-max items-center gap-2 rounded-2xl border border-[#d5bb91] px-3 py-2 text-left text-xs font-semibold text-[#6e5436] transition hover:bg-[#ede5d7] lg:min-w-0"
                  onClick={() => {
                    setAdvancedVisible(false);
                    setActiveTab("canvas");
                  }}
                >
                  <Palette className="h-4 w-4 shrink-0" />
                  Return to Canvas
                </button>
              )}
            </nav>
          </aside>

          <main className={`min-h-[45rem] p-4 sm:p-6 ${activeTab === "look" || activeTab === "images" ? "bg-[#eee7db]" : "bg-[radial-gradient(circle_at_90%_0%,rgba(255,255,255,0.06),transparent_28%)]"}`}>
            {activeTab === "canvas" && config && (
              <PresenceCanvasMode
                node={node}
                config={config}
                dirty={dirty}
                saving={saving}
                readiness={readiness}
                assets={overview?.assets ?? []}
                onSaveDraft={saveDraft}
                onCommit={commitCanvasChange}
                onPreview={runPreview}
                onOpenAdvanced={openAdvanced}
                showCanonicalSync={showCanonicalSync}
                canonicalBundle={canonicalBundle}
                onSyncCanonical={syncCanonicalAssets}
                onUploadImage={uploadDraftImage}
              />
            )}
            {activeTab === "look" && (
              <LookPanel
                node={node}
                config={config}
                saving={saving}
                onCommit={commitCanvasChange}
              />
            )}
            {activeTab === "images" && (
              <MediaDrawer
                node={node}
                config={config}
                assets={overview?.assets ?? []}
                canonicalBundle={canonicalBundle}
                saving={saving || assetLoading}
                onCommit={commitCanvasChange}
                onBringImages={() => void syncCanonicalAssets()}
                onUpload={uploadDraftImage}
              />
            )}
            {activeTab === "overview" && (
              <OverviewTab
                config={config}
                overview={overview}
                node={node}
                readiness={readiness}
                onSelectTab={setActiveTab}
              />
            )}
            {activeTab === "scenes" && <ScenesTab config={config} mutate={mutate} />}
            {activeTab === "work-wall" && (
              <WorkWallTab
                config={config}
                assets={overview?.assets ?? []}
                node={node}
                mutate={mutate}
              />
            )}
            {activeTab === "practice" && <PracticeTab config={config} mutate={mutate} />}
            {activeTab === "calling-card" && <CallingCardTab config={config} mutate={mutate} />}
            {activeTab === "style" && <StyleTab config={config} mutate={mutate} />}
            {activeTab === "motion" && <MotionTab config={config} mutate={mutate} />}
            {activeTab === "roomkey" && <RoomKeyTab config={config} mutate={mutate} />}
            {activeTab === "assets" && (
              <AssetsTab
                config={config}
                assets={overview?.assets ?? []}
                attachForm={attachForm}
                assetLoading={assetLoading}
                setAttachForm={setAttachForm}
                attachAsset={attachAsset}
                reloadAssets={reloadAssets}
                mutate={mutate}
              />
            )}
            {activeTab === "preview" && (
              <PreviewPublishTab
                config={config}
                overview={overview}
                readiness={readiness}
                onPublish={() => setPublishConfirmOpen(true)}
                publishing={publishing}
              />
            )}
            {activeTab === "history" && (
              <HistoryTab
                overview={overview}
                historyLoading={historyLoading}
                publishing={publishing}
                reloadHistory={reloadHistory}
                rollbackTo={rollbackTo}
              />
            )}
          </main>
        </div>
      </div>
      <PublishConfirmDialog
        open={publishConfirmOpen}
        publishing={publishing}
        readiness={readiness}
        draftVersion={overview?.draft?.version ?? config.version}
        publishedVersion={overview?.published?.version}
        onCancel={() => setPublishConfirmOpen(false)}
        onConfirm={() => void runPublish()}
      />
    </div>
  );
}

function OverviewTab({
  config,
  overview,
  node,
  readiness,
  onSelectTab,
}: {
  config: PresenceEditableConfig;
  overview: PresenceEditorOverview | null;
  node: PresenceNode;
  readiness: ReadinessReport | null;
  onSelectTab: (tab: TabId) => void;
}) {
  const artworkField = sceneById(config, "artwork_field");
  const workWall = sceneById(config, "work_wall");
  const practice = sceneById(config, "practice_studio");
  const calling = sceneById(config, "calling_card");
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="grid gap-4 sm:grid-cols-2">
        <CommandCard
          number="01"
          title={textValue(artworkField.title) || "Artwork Field"}
          body={textValue(artworkField.statement) || textValue(artworkField.subtitle) || node.headline || "Liquid artwork field"}
          action="Edit scene"
          onClick={() => onSelectTab("scenes")}
        />
        <CommandCard
          number="02"
          title={textValue(workWall.label) || "Work Wall"}
          body={`${getWorks(config, node).filter((work) => work.is_visible !== false).length} visible works in editable ordering.`}
          action="Edit wall"
          onClick={() => onSelectTab("work-wall")}
        />
        <CommandCard
          number="03"
          title={textValue(practice.about_title) || textValue(practice.label) || "Practice Studio"}
          body={textValue(recordAt(recordAt(config.content_config, "about"), "biography")) || "Practice, biography, process notes, and cards."}
          action="Edit practice"
          onClick={() => onSelectTab("practice")}
        />
        <CommandCard
          number="04"
          title={textValue(calling.contact_title) || "Calling Card"}
          body={textValue(recordAt(recordAt(config.content_config, "contact"), "contact_copy")) || "Enquiry posture and external links."}
          action="Edit contact"
          onClick={() => onSelectTab("calling-card")}
        />
      </section>

      <aside className="grid gap-4">
        <Panel title="Readiness">
          {readiness ? <ReadinessPanel report={readiness} onNavigate={(tabId) => onSelectTab(tabId as TabId)} /> : <p className="text-sm text-stone-400">Readiness is loading.</p>}
        </Panel>
        <Panel title="State">
          <div className="grid gap-2 text-xs text-stone-300">
            <KeyValue label="Draft" value={overview?.draft ? `v${overview.draft.version ?? "?"}` : "Missing draft"} />
            <KeyValue label="Published" value={overview?.published ? `v${overview.published.version ?? "?"}` : "Missing published config"} />
            <KeyValue label="Renderer" value={config.renderer_key || node.renderer_key || "fallback"} />
            <KeyValue label="Migration readiness" value="Local migration exists. Hosted application must apply migration before this editor can persist drafts." />
          </div>
        </Panel>
      </aside>
    </div>
  );
}

function ScenesTab({ config, mutate }: { config: PresenceEditableConfig; mutate: Mutator }) {
  const artwork = sceneById(config, "artwork_field");
  const workWall = sceneById(config, "work_wall");
  const practice = sceneById(config, "practice_studio");
  const calling = sceneById(config, "calling_card");
  return (
    <div className="grid gap-5">
      <Panel title="Scene 01 - Artwork Field" intro="First public impression: title, statement, primary artwork, and RoomKey provenance copy.">
        <div className="grid gap-4 lg:grid-cols-2">
          <TextField label="Title" value={textValue(artwork.title)} onChange={(value) => updateScene(mutate, "artwork_field", { title: value })} />
          <TextField label="Subtitle" value={textValue(artwork.subtitle)} onChange={(value) => updateScene(mutate, "artwork_field", { subtitle: value })} />
          <TextAreaField label="Statement" value={textValue(artwork.statement)} onChange={(value) => updateScene(mutate, "artwork_field", { statement: value })} />
          <TextAreaField label="Intro copy" value={textValue(artwork.intro_copy)} onChange={(value) => updateScene(mutate, "artwork_field", { intro_copy: value })} />
          <TextField label="Primary artwork slug" value={textValue(artwork.primary_artwork_slug)} onChange={(value) => updateScene(mutate, "artwork_field", { primary_artwork_slug: value })} />
          <TextField label="RoomKey provenance text" value={textValue(artwork.roomkey_provenance_text)} onChange={(value) => updateScene(mutate, "artwork_field", { roomkey_provenance_text: value })} />
          <TextField
            label="Primary action label"
            value={textValue(recordAt(artwork.action_labels, "primary"))}
            onChange={(value) => updateScene(mutate, "artwork_field", { action_labels: { ...asRecord(artwork.action_labels), primary: value } })}
          />
          <TextField
            label="Advance action label"
            value={textValue(recordAt(artwork.action_labels, "work_advance"))}
            onChange={(value) => updateScene(mutate, "artwork_field", { action_labels: { ...asRecord(artwork.action_labels), work_advance: value } })}
          />
        </div>
      </Panel>

      <Panel title="Scene 02 - Work Wall" intro="Wall metadata and behaviour. Work ordering lives in the Work Wall tab.">
        <div className="grid gap-4 lg:grid-cols-3">
          <TextField label="Scene label" value={textValue(workWall.label)} onChange={(value) => updateScene(mutate, "work_wall", { label: value })} />
          <TextField label="Scene subtitle" value={textValue(workWall.subtitle)} onChange={(value) => updateScene(mutate, "work_wall", { subtitle: value })} />
          <SelectField
            label="Work detail behaviour"
            value={textValue(workWall.work_detail_behaviour) || "route_or_inline_detail"}
            options={["route_or_inline_detail", "route", "inline_detail", "disabled"]}
            onChange={(value) => updateScene(mutate, "work_wall", { work_detail_behaviour: value })}
          />
        </div>
      </Panel>

      <Panel title="Scene 03 - Practice Studio" intro="About destination title and note card posture. Copy lives in Practice / About.">
        <div className="grid gap-4 lg:grid-cols-3">
          <TextField label="About title" value={textValue(practice.about_title)} onChange={(value) => updateScene(mutate, "practice_studio", { about_title: value })} />
          <TextField label="Scene subtitle" value={textValue(practice.subtitle)} onChange={(value) => updateScene(mutate, "practice_studio", { subtitle: value })} />
          <ToggleField label="Note cards enabled" checked={booleanValue(practice.note_cards_enabled, true)} onChange={(value) => updateScene(mutate, "practice_studio", { note_cards_enabled: value })} />
        </div>
      </Panel>

      <Panel title="Scene 04 - Calling Card" intro="Contact title, CTA, and invitation language. Full routing posture lives in Calling Card.">
        <div className="grid gap-4 lg:grid-cols-3">
          <TextField label="Contact title" value={textValue(calling.contact_title)} onChange={(value) => updateScene(mutate, "calling_card", { contact_title: value })} />
          <TextField label="Scene subtitle" value={textValue(calling.subtitle)} onChange={(value) => updateScene(mutate, "calling_card", { subtitle: value })} />
          <TextField label="Enquiry CTA" value={textValue(calling.enquiry_cta)} onChange={(value) => updateScene(mutate, "calling_card", { enquiry_cta: value })} />
        </div>
      </Panel>
    </div>
  );
}

function WorkWallTab({
  config,
  assets,
  node,
  mutate,
}: {
  config: PresenceEditableConfig;
  assets: PresenceEditorAsset[];
  node: PresenceNode;
  mutate: Mutator;
}) {
  const works = getWorks(config, node);
  const assetOptions = assets.filter((asset) => asset.url);
  function setWorks(next: EditableWork[]) {
    mutate((draft) => {
      const scene = sceneById(draft, "work_wall");
      return {
        ...draft,
        asset_config: { ...asRecord(draft.asset_config), artworks: next },
        content_config: { ...asRecord(draft.content_config), works: next },
        scene_config: setScene(draft.scene_config, "work_wall", {
          ...scene,
          artwork_order: next.map((work) => work.slug),
        }),
      };
    });
  }
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Work Wall</h2>
          <p className="mt-1 text-sm text-stone-400">Order, captions, visibility, and image bindings used by the public GGM wall.</p>
        </div>
        <button
          className={buttonClass("secondary")}
          onClick={() =>
            setWorks([
              ...works,
              {
                slug: `work-${works.length + 1}`,
                title: "Untitled work",
                medium: "Watercolour on paper",
                is_visible: true,
                sort_order: works.length + 1,
              },
            ])
          }
        >
          <Plus className="h-4 w-4" />
          Add work
        </button>
      </div>
      <div className="grid gap-4">
        {works.map((work, index) => (
          <article key={`${work.slug}-${index}`} className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <div className="grid gap-4 xl:grid-cols-[8rem_minmax(0,1fr)]">
              <div className="flex flex-col gap-3">
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                  {work.thumbnail_url || work.url || work.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={(work.thumbnail_url ?? work.url ?? work.image_url)!} alt={work.alt_text ?? work.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-stone-500">No image</div>
                  )}
                </div>
                <div className="flex gap-1">
                  <IconButton label="Move up" disabled={index === 0} onClick={() => setWorks(moveItem(works, index, index - 1))}>
                    <ArrowUp className="h-4 w-4" />
                  </IconButton>
                  <IconButton label="Move down" disabled={index === works.length - 1} onClick={() => setWorks(moveItem(works, index, index + 1))}>
                    <ArrowDown className="h-4 w-4" />
                  </IconButton>
                  <IconButton label="Delete" onClick={() => setWorks(works.filter((_, idx) => idx !== index))}>
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <TextField label="Title" value={work.title} onChange={(value) => setWorks(updateWorkAt(works, index, { title: value }))} />
                <TextField label="Slug" value={work.slug} onChange={(value) => setWorks(updateWorkAt(works, index, { slug: slugify(value) }))} />
                <TextField label="Year" value={String(work.year ?? "")} onChange={(value) => setWorks(updateWorkAt(works, index, { year: value }))} />
                <TextField label="Materials / medium" value={work.medium ?? ""} onChange={(value) => setWorks(updateWorkAt(works, index, { medium: value }))} />
                <TextField label="Dimensions" value={work.dimensions ?? ""} onChange={(value) => setWorks(updateWorkAt(works, index, { dimensions: value }))} />
                <SelectField
                  label="Image asset"
                  value={work.url ?? work.image_url ?? ""}
                  options={["", ...assetOptions.map((asset) => asset.url)]}
                  labels={{ "": "No image selected" }}
                  onChange={(value) => setWorks(updateWorkAt(works, index, { url: value, image_url: value }))}
                />
                <SelectField
                  label="Thumbnail asset"
                  value={work.thumbnail_url ?? ""}
                  options={["", ...assetOptions.map((asset) => asset.url)]}
                  labels={{ "": "Use image / none" }}
                  onChange={(value) => setWorks(updateWorkAt(works, index, { thumbnail_url: value }))}
                />
                <TextField label="Alt text" value={work.alt_text ?? ""} onChange={(value) => setWorks(updateWorkAt(works, index, { alt_text: value }))} />
                <TextAreaField label="Caption / description" value={work.caption ?? work.description ?? ""} onChange={(value) => setWorks(updateWorkAt(works, index, { caption: value, description: value }))} />
                <ToggleField label="Show work publicly" checked={work.is_visible !== false} onChange={(value) => setWorks(updateWorkAt(works, index, { is_visible: value }))} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function PracticeTab({ config, mutate }: { config: PresenceEditableConfig; mutate: Mutator }) {
  const about = asRecord(recordAt(config.content_config, "about"));
  const strands = arrayOfRecords(about.strands);
  const timeline = arrayOfRecords(about.timeline);
  return (
    <div className="grid gap-5">
      <Panel title="Practice / About Content">
        <div className="grid gap-4 lg:grid-cols-2">
          <TextField label="About title" value={textValue(sceneById(config, "practice_studio").about_title)} onChange={(value) => updateScene(mutate, "practice_studio", { about_title: value })} />
          <TextAreaField label="Biography" value={textValue(about.biography ?? about.bio)} onChange={(value) => updateAbout(mutate, { biography: value })} />
          <TextAreaField label="Artist statement" value={textValue(about.artist_statement ?? about.practice_statement)} onChange={(value) => updateAbout(mutate, { artist_statement: value })} />
          <TextAreaField label="Process notes" value={textValue(about.process_notes)} onChange={(value) => updateAbout(mutate, { process_notes: value })} />
        </div>
      </Panel>
      <EditableRecordList
        title="Studio fragments / strand cards"
        items={strands}
        emptyItem={{ title: "New fragment", body: "" }}
        fields={[
          { key: "title", label: "Title" },
          { key: "body", label: "Body", multiline: true },
        ]}
        onChange={(items) => updateAbout(mutate, { strands: items })}
      />
      <EditableRecordList
        title="Working path"
        items={timeline}
        emptyItem={{ when: "Now", what: "" }}
        fields={[
          { key: "when", label: "When" },
          { key: "what", label: "What", multiline: true },
        ]}
        onChange={(items) => updateAbout(mutate, { timeline: items })}
      />
    </div>
  );
}

function CallingCardTab({ config, mutate }: { config: PresenceEditableConfig; mutate: Mutator }) {
  const contact = asRecord(recordAt(config.content_config, "contact"));
  const enquiry = asRecord(config.enquiry_config);
  const links = arrayOfRecords(contact.external_links);
  return (
    <div className="grid gap-5">
      <Panel title="Calling Card" intro="Public contact posture without exposing private owner or operator email. Enquiries should stay routed through backend capture unless explicitly configured otherwise.">
        <div className="grid gap-4 lg:grid-cols-2">
          <TextField label="Contact title" value={textValue(contact.contact_title ?? sceneById(config, "calling_card").contact_title)} onChange={(value) => { updateContact(mutate, { contact_title: value }); updateScene(mutate, "calling_card", { contact_title: value }); }} />
          <TextField label="Enquiry CTA" value={textValue(enquiry.cta_label ?? sceneById(config, "calling_card").enquiry_cta)} onChange={(value) => { updateEnquiry(mutate, { cta_label: value }); updateScene(mutate, "calling_card", { enquiry_cta: value }); }} />
          <TextAreaField label="Contact copy" value={textValue(contact.contact_copy)} onChange={(value) => updateContact(mutate, { contact_copy: value })} />
          <TextAreaField label="Availability / status note" value={textValue(contact.availability_status ?? enquiry.availability_status)} onChange={(value) => { updateContact(mutate, { availability_status: value }); updateEnquiry(mutate, { availability_status: value }); }} />
          <SelectField label="Contact posture" value={textValue(contact.contact_posture) || "presence_enquiry_form"} options={["presence_enquiry_form", "external_link_only", "closed_for_enquiries"]} onChange={(value) => updateContact(mutate, { contact_posture: value })} />
          <SelectField label="Delivery posture" value={textValue(enquiry.delivery_posture) || "backend_enquiry_capture"} options={["backend_enquiry_capture", "external_redirect", "disabled"]} onChange={(value) => updateEnquiry(mutate, { delivery_posture: value })} />
        </div>
      </Panel>
      <EditableRecordList
        title="External links"
        items={links}
        emptyItem={{ label: "Reference", url: "https://", link_type: "website" }}
        fields={[
          { key: "label", label: "Label" },
          { key: "url", label: "URL" },
          { key: "link_type", label: "Type" },
        ]}
        onChange={(items) => updateContact(mutate, { external_links: items })}
      />
    </div>
  );
}

function StyleTab({ config, mutate }: { config: PresenceEditableConfig; mutate: Mutator }) {
  const style = asRecord(config.style_dna);
  const palette = asRecord(style.palette);
  const typography = asRecord(style.typography);
  const spacing = asRecord(style.spacing);
  const artwork = asRecord(style.artwork_treatment);
  return (
    <div className="grid gap-5">
      <Panel title="Room DNA presets" intro="Only presets that map to renderer-visible palette, typography, and liquid motion tokens are enabled. Stored-only renderer ideas remain disabled below.">
        <div className="grid gap-3 md:grid-cols-3">
          {ROOM_DNA_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-amber-200/40"
              onClick={() => mutate((draft) => applyRoomDnaPreset(draft, preset))}
            >
              <span className="block h-16 rounded-2xl border border-white/10" style={{ background: preset.swatch }} />
              <span className="mt-3 block text-sm font-semibold text-stone-50">{preset.name}</span>
              <span className="mt-1 block text-xs leading-5 text-stone-400">{preset.description}</span>
            </button>
          ))}
        </div>
      </Panel>
      <Panel title="Mood palette" intro="These colours are wired into the GGM public renderer through CSS variables.">
        <div className="grid gap-4 md:grid-cols-3">
          {["bg", "paper", "paper_warm", "ink", "muted", "line", "hero_stage_bg"].map((key) => (
            <ColorField key={key} label={key.replace(/_/g, " ")} value={textValue(palette[key])} onChange={(value) => updateStyle(mutate, { palette: { ...palette, [key]: value } })} />
          ))}
          <ColorField label="accent (coming soon)" value={textValue(palette.accent)} disabled note="Stored only. The current GGM renderer does not consume this as a distinct accent token." onChange={() => undefined} />
        </div>
      </Panel>
      <Panel title="Typography and room controls">
        <div className="grid gap-4 lg:grid-cols-2">
          <SelectField label="Heading stack" value={textValue(typography.heading_stack) || SAFE_FONTS[0]} options={SAFE_FONTS} onChange={(value) => updateStyle(mutate, { typography: { ...typography, heading_stack: value } })} />
          <SelectField label="Body stack" value={textValue(typography.body_stack) || SAFE_FONTS[0]} options={SAFE_FONTS} onChange={(value) => updateStyle(mutate, { typography: { ...typography, body_stack: value } })} />
          <TextField label="Background treatment (coming soon)" value={textValue(style.background_treatment)} disabled note="Stored token. Current public renderer does not branch background treatment yet." onChange={() => undefined} />
          <TextField label="Frame treatment (coming soon)" value={textValue(style.frame_treatment)} disabled note="Stored token. The commissioned frame remains locked for this renderer." onChange={() => undefined} />
          <TextField label="Texture treatment (coming soon)" value={textValue(recordAt(style.texture_tokens, "treatment"))} disabled note="Stored token. Film texture is controlled by wired motion controls." onChange={() => undefined} />
          <TextField label="Scene rhythm (coming soon)" value={textValue(spacing.scene_rhythm)} disabled note="Stored token. Scene rhythm is not yet a renderer branch." onChange={() => undefined} />
          <TextField label="Artwork treatment (coming soon)" value={textValue(artwork.hero_fit ?? style.artwork_treatment)} disabled note="Stored token. Artwork fit is still governed by the public renderer." onChange={() => undefined} />
        </div>
      </Panel>
    </div>
  );
}

function MotionTab({ config, mutate }: { config: PresenceEditableConfig; mutate: Mutator }) {
  const motion = asRecord(config.motion_config);
  return (
    <div className="grid gap-5">
      <Panel title="Liquid, dither, and film" intro="Enabled controls are wired into the GGM renderer. Disabled controls are stored-only tokens or future renderer work. Heavy motion is opt-in.">
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField label="Transition style" value={textValue(motion.transition_style) || "liquid_crossfade"} options={["liquid_crossfade", "ripple", "glass", "dissolve", "cut"]} onChange={(value) => updateMotion(mutate, { transition_style: value, liquid_style: value === "liquid_crossfade" ? "ripple" : value })} />
          <RangeField label="Morph speed ms" min={240} max={2400} step={20} value={numberValue(motion.morph_speed_ms ?? motion.scene_transition_duration_ms, 1100)} onChange={(value) => updateMotion(mutate, { morph_speed_ms: value, scene_transition_duration_ms: value })} />
          <RangeField label="Liquid intensity" min={0} max={1} step={0.01} value={numberValue(motion.liquid_intensity, 0.95)} onChange={(value) => updateMotion(mutate, { liquid_intensity: value })} />
          <RangeField label="Distortion scale" min={0} max={1} step={0.01} value={numberValue(motion.distortion_scale, 1)} onChange={(value) => updateMotion(mutate, { distortion_scale: value })} />
          <RangeField label="Dither strength" min={0} max={1} step={0.01} value={numberValue(motion.dither_strength, 0.62)} onChange={(value) => updateMotion(mutate, { dither_strength: value })} />
          <RangeField label="Film grain strength" min={0} max={1} step={0.01} value={numberValue(motion.film_grain_strength, 0.42)} onChange={(value) => updateMotion(mutate, { film_grain_strength: value })} />
          <RangeField label="Blur amount" min={0} max={1} step={0.01} value={numberValue(motion.blur_amount, 0.5)} onChange={(value) => updateMotion(mutate, { blur_amount: value })} />
          <RangeField label="Parallax depth (not wired)" min={0} max={1} step={0.01} value={numberValue(motion.parallax_depth, 0.5)} onChange={() => undefined} disabled note="Coming soon. The current public renderer does not apply parallax depth." />
          <ToggleField label="Heavy motion opt-in" checked={booleanValue(motion.heavy_motion_enabled, false)} onChange={(value) => updateMotion(mutate, { heavy_motion_enabled: value })} note="When off, the renderer caps liquid intensity, distortion, grain, and blur." />
          <ToggleField label="Custom cursor (coming soon)" checked={booleanValue(motion.custom_cursor_enabled, false)} onChange={() => undefined} disabled note="Stored token only. The GGM public renderer does not currently draw a custom cursor." />
          <ToggleField label="Reduced-motion fallback" checked disabled onChange={() => undefined} note="System-controlled accessibility fallback is always on and cannot be disabled by owners." />
        </div>
      </Panel>
    </div>
  );
}

function RoomKeyTab({ config, mutate }: { config: PresenceEditableConfig; mutate: Mutator }) {
  const roomkey = asRecord(config.roomkey_config);
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <Panel title="RoomKey Presentation" intro="Published RoomKey responses can use this copy. Draft preview remains owner-authenticated.">
        <div className="grid gap-4 lg:grid-cols-2">
          <TextField label="Entry label" value={textValue(roomkey.entry_label)} onChange={(value) => updateRoomKey(mutate, { entry_label: value })} />
          <TextField label="Provenance chip text" value={textValue(roomkey.provenance_chip_text)} onChange={(value) => updateRoomKey(mutate, { provenance_chip_text: value })} />
          <TextAreaField label="Guest entry copy" value={textValue(roomkey.guest_entry_copy)} onChange={(value) => updateRoomKey(mutate, { guest_entry_copy: value })} />
          <TextAreaField label="Invalid copy" value={textValue(roomkey.invalid_copy)} onChange={(value) => updateRoomKey(mutate, { invalid_copy: value })} />
          <TextAreaField label="Revoked copy" value={textValue(roomkey.revoked_copy)} onChange={(value) => updateRoomKey(mutate, { revoked_copy: value })} />
          <ToggleField label="Show save/add to Garden" checked={booleanValue(roomkey.show_save_to_garden, true)} onChange={(value) => updateRoomKey(mutate, { show_save_to_garden: value })} />
        </div>
      </Panel>
      <Panel title="Guest preview">
        <div className="rounded-3xl border border-amber-200/20 bg-amber-200/10 p-5">
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-100">
            <Radio className="h-3.5 w-3.5" />
            {textValue(roomkey.provenance_chip_text) || "Opened via NFC/QR"}
          </p>
          <h3 className="mt-5 text-2xl font-semibold">{textValue(roomkey.entry_label) || "Opened via RoomKey"}</h3>
          <p className="mt-3 text-sm leading-6 text-stone-300">{textValue(roomkey.guest_entry_copy) || "You have entered this Presence Room."}</p>
          <p className="mt-4 text-xs text-stone-500">QR/NFC token preview remains handled by the existing RoomKey tools.</p>
        </div>
      </Panel>
    </div>
  );
}

function AssetsTab({
  config,
  assets,
  attachForm,
  assetLoading,
  setAttachForm,
  attachAsset,
  reloadAssets,
  mutate,
}: {
  config: PresenceEditableConfig;
  assets: PresenceEditorAsset[];
  attachForm: { slot: string; url: string; alt_text: string };
  assetLoading: boolean;
  setAttachForm: (form: { slot: string; url: string; alt_text: string }) => void;
  attachAsset: () => Promise<void>;
  reloadAssets: () => Promise<void>;
  mutate: Mutator;
}) {
  const hero = asRecord(recordAt(config.asset_config, "hero_image"));
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Assets</h2>
            <p className="mt-1 text-sm text-stone-400">Existing public assets plus safe asset attachment into the draft config.</p>
          </div>
          <button className={buttonClass("secondary")} disabled={assetLoading} onClick={() => void reloadAssets()}>
            <RefreshCw className={`h-4 w-4 ${assetLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => (
            <article key={`${asset.url}-${asset.slot}`} className="rounded-3xl border border-white/10 bg-white/[0.04] p-3">
              <AssetPreview url={asset.url} alt={asset.alt_text ?? asset.slot ?? "Presence asset"} />
              <p className="mt-3 truncate text-sm font-semibold">{asset.alt_text || asset.slot || "Asset"}</p>
              <p className="mt-1 truncate text-xs text-stone-500">{asset.url}</p>
              {unsafeAssetReason(asset.url) && <p className="mt-2 text-xs text-red-300">{unsafeAssetReason(asset.url)}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button className={buttonClass("tiny")} onClick={() => updateAsset(mutate, { hero_image: { url: asset.url, alt_text: asset.alt_text ?? "Hero image" } })}>
                  Use hero
                </button>
                <button className={buttonClass("tiny")} onClick={() => appendWorkFromAsset(mutate, asset)}>
                  Add work
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <aside className="grid gap-4 content-start">
        <Panel title="Upload image">
          <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-4 text-sm text-stone-400">
            <p className="font-semibold text-stone-200">Available in Images</p>
            <p className="mt-2 leading-6">
              Open Images to upload a JPG, PNG, or WEBP image into your Draft room. Crop and focal point controls are not available yet.
            </p>
          </div>
        </Panel>
        <Panel title="Current hero">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <p className="truncate text-xs text-stone-400">{textValue(hero.url) || "No hero selected"}</p>
            <p className="mt-1 text-xs text-stone-500">{textValue(hero.alt_text) || "Alt text missing"}</p>
          </div>
        </Panel>
        <Panel title="Attach asset">
          <div className="grid gap-3">
            <SelectField label="Slot" value={attachForm.slot} options={["attached_assets", "hero_image", "artwork_images", "thumbnails", "texture_assets", "portrait_image", "social_preview"]} onChange={(value) => setAttachForm({ ...attachForm, slot: value })} />
            <TextField label="Public URL or asset path" value={attachForm.url} onChange={(value) => setAttachForm({ ...attachForm, url: value })} />
            <TextField label="Alt text" value={attachForm.alt_text} onChange={(value) => setAttachForm({ ...attachForm, alt_text: value })} />
            {unsafeAssetReason(attachForm.url) && <p className="text-xs text-red-300">{unsafeAssetReason(attachForm.url)}</p>}
            <button className={buttonClass("primary")} disabled={assetLoading} onClick={() => void attachAsset()}>
              {assetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Attach to draft
            </button>
          </div>
        </Panel>
      </aside>
    </div>
  );
}

function AssetPreview({ url, alt }: { url: string; alt: string }) {
  const [broken, setBroken] = useState(false);
  const safety = validateAssetUrl(url);
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-black/30">
      {url && safety.isValid ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className="h-full w-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <div className="flex h-full items-center justify-center px-3 text-center text-xs text-stone-500">Asset cannot be previewed</div>
      )}
      {(broken || !safety.isValid) && (
        <div className="absolute inset-x-2 bottom-2 rounded-xl border border-red-300/30 bg-red-950/80 px-2 py-1 text-[11px] text-red-100">
          {broken ? "Image did not load." : safety.errors[0]}
        </div>
      )}
    </div>
  );
}

function PreviewPublishTab({
  config,
  overview,
  readiness,
  onPublish,
  publishing,
}: {
  config: PresenceEditableConfig;
  overview: PresenceEditorOverview | null;
  readiness: ReadinessReport | null;
  onPublish: () => void;
  publishing: boolean;
}) {
  const artwork = sceneById(config, "artwork_field");
  return (
    <section data-testid="preview-mode" className="mx-auto grid max-w-3xl gap-6 rounded-[2rem] bg-[#f6f1e8] p-6 text-[#302921] sm:p-8">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#866845]">Preview</p>
        <h2 className="mt-2 text-2xl font-semibold">Preview your draft</h2>
        <p className="mt-2 text-sm leading-6 text-[#655847]">
          Only you can see a draft preview. Visitors continue to see the Live room until you open your saved changes.
        </p>
      </div>
      <div className="rounded-3xl border border-[#dfd4c5] bg-white p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#866845]">Draft room</p>
        <h3 className="mt-3 font-serif text-3xl">{textValue(artwork.title) || "Your entrance title"}</h3>
        <p className="mt-3 text-sm text-[#655847]">{textValue(artwork.statement) || textValue(artwork.subtitle) || "Your room introduction appears here."}</p>
      </div>
      {readiness?.critical.length ? (
        <p className="rounded-2xl bg-[#f8eadd] p-4 text-sm leading-6 text-[#704430]">
          A few things need attention before you open your room to visitors. Return to Build to find each highlighted item.
        </p>
      ) : (
        <p className="rounded-2xl bg-[#e7efe7] p-4 text-sm text-[#295c43]">Your draft is ready for a private preview.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Link
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#302921] px-4 py-2 text-sm font-semibold text-white"
          href={`/studio/${config.room_id}/editor/preview`}
        >
          <Eye className="h-4 w-4" />
          Preview your draft
        </Link>
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#317650] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          disabled={publishing || Boolean(readiness?.hasBlockingIssues)}
          onClick={onPublish}
        >
          {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Open room to visitors
        </button>
      </div>
      {!overview?.published && <p className="text-xs text-[#766a5e]">This will be the first time visitors can enter this room.</p>}
    </section>
  );
}

function HistoryTab({
  overview,
  historyLoading,
  publishing,
  reloadHistory,
  rollbackTo,
}: {
  overview: PresenceEditorOverview | null;
  historyLoading: boolean;
  publishing: boolean;
  reloadHistory: () => Promise<void>;
  rollbackTo: (item: PresenceEditableConfig) => Promise<void>;
}) {
  const history = overview?.history ?? [];
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">History / Rollback</h2>
          <p className="mt-1 text-sm text-stone-400">Rollback creates a new published version from a selected archived or published config.</p>
        </div>
        <button className={buttonClass("secondary")} disabled={historyLoading} onClick={() => void reloadHistory()}>
          <RefreshCw className={`h-4 w-4 ${historyLoading ? "animate-spin" : ""}`} />
          Refresh history
        </button>
      </div>
      {history.length === 0 ? (
        <StateCard title="No config history yet" body="Create and publish a draft to start version history." />
      ) : (
        <div className="grid gap-3">
          {history.map((item) => (
            <article key={`${item.id}-${item.version}-${item.status}`} className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={item.status === "published" ? "good" : item.status === "draft" ? "warn" : "neutral"}>{item.status ?? "unknown"}</Pill>
                    <span className="text-sm font-semibold">Version {item.version ?? "?"}</span>
                    <span className="text-xs text-stone-500">{formatDate(item.updated_at ?? item.published_at ?? item.created_at)}</span>
                  </div>
                  <p className="mt-2 text-sm text-stone-400">{item.renderer_key || "renderer fallback"}</p>
                </div>
                <button
                  className={buttonClass("secondary")}
                  disabled={publishing || item.status === "draft"}
                  onClick={() => void rollbackTo(item)}
                >
                  <RotateCcw className="h-4 w-4" />
                  Rollback
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

type Mutator = (next: (draft: PresenceEditableConfig) => PresenceEditableConfig) => void;

function Panel({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-stone-50">{title}</h2>
        {intro && <p className="mt-1 text-sm leading-6 text-stone-400">{intro}</p>}
      </div>
      {children}
    </section>
  );
}

function CommandCard({ number, title, body, action, onClick }: { number: string; title: string; body: string; action: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5 text-left transition hover:-translate-y-0.5 hover:border-amber-200/40 hover:bg-white/[0.07]"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-amber-200/70">{number}</p>
      <h3 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-stone-400">{body}</p>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">{action}</p>
    </button>
  );
}

function StateCard({ title, body, tone = "neutral", action }: { title: string; body: string; tone?: "neutral" | "error"; action?: React.ReactNode }) {
  const style = tone === "error" ? "border-red-400/40 bg-red-950/25 text-red-100" : "border-white/10 bg-white/[0.04] text-stone-100";
  return (
    <section className={`rounded-3xl border p-5 ${style}`}>
      <AlertTriangle className="mb-3 h-5 w-5" />
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 opacity-80">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </section>
  );
}

function StatusMetric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "good" | "warn" }) {
  const toneClass = tone === "good" ? "text-emerald-200" : tone === "warn" ? "text-amber-200" : "text-stone-100";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">{label}</p>
      <p className={`mt-1 truncate font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "good" | "warn" | "danger" | "neutral" }) {
  const cls =
    tone === "good"
      ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
      : tone === "warn"
        ? "border-amber-200/30 bg-amber-200/10 text-amber-100"
        : tone === "danger"
          ? "border-red-300/30 bg-red-300/10 text-red-100"
          : "border-white/10 bg-white/5 text-stone-300";
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>{children}</span>;
}

function KeyValue({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
      <span className="text-stone-500">{label}</span>
      <span className="min-w-0 break-words text-stone-200">{value || "Not set"}</span>
    </div>
  );
}

function TextField({ label, value, disabled, note, onChange }: { label: string; value: string; disabled?: boolean; note?: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">{label}</span>
      <input value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className={inputClass(disabled ? "opacity-60" : "")} />
      {note && <span className="text-xs leading-5 text-stone-500">{note}</span>}
    </label>
  );
}

function ColorField({ label, value, disabled, note, onChange }: { label: string; value: string; disabled?: boolean; note?: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">{label}</span>
      <div className="flex gap-2">
        <input type="color" disabled={disabled} value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#111111"} onChange={(event) => onChange(event.target.value)} className="h-11 w-12 rounded-xl border border-white/10 bg-white/5 p-1 disabled:opacity-50" />
        <input disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass("flex-1 disabled:opacity-50")} />
      </div>
      {note && <span className="text-xs leading-5 text-stone-500">{note}</span>}
    </label>
  );
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">{label}</span>
      <textarea value={value} rows={5} onChange={(event) => onChange(event.target.value)} className={inputClass("resize-y leading-6")} />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  labels = {},
  disabled,
  note,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  labels?: Record<string, string>;
  disabled?: boolean;
  note?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">{label}</span>
      <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className={inputClass(disabled ? "opacity-60" : "")}>
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option] ?? option}
          </option>
        ))}
      </select>
      {note && <span className="text-xs leading-5 text-stone-500">{note}</span>}
    </label>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  disabled,
  note,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  note?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
        {label}
        <span className="text-stone-300">{value}</span>
      </span>
      <input type="range" value={value} min={min} max={max} step={step} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} />
      {note && <span className="text-xs text-stone-500">{note}</span>}
    </label>
  );
}

function ToggleField({ label, checked, disabled, note, onChange }: { label: string; checked: boolean; disabled?: boolean; note?: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="grid gap-1.5 rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
      <span className="flex items-center justify-between gap-3">
        <span className="text-sm text-stone-300">{label}</span>
        <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-amber-200 disabled:opacity-50" />
      </span>
      {note && <span className="text-xs leading-5 text-stone-500">{note}</span>}
    </label>
  );
}

function IconButton({ label, disabled, children, onClick }: { label: string; disabled?: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-stone-300 transition hover:border-amber-200/40 hover:text-amber-100 disabled:opacity-40">
      {children}
    </button>
  );
}

function EditableRecordList({
  title,
  items,
  emptyItem,
  fields,
  onChange,
}: {
  title: string;
  items: Record<string, unknown>[];
  emptyItem: Record<string, unknown>;
  fields: Array<{ key: string; label: string; multiline?: boolean }>;
  onChange: (items: Record<string, unknown>[]) => void;
}) {
  return (
    <Panel title={title}>
      <div className="grid gap-3">
        {items.map((item, index) => (
          <article key={index} className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="mb-3 flex justify-end gap-1">
              <IconButton label="Move up" disabled={index === 0} onClick={() => onChange(moveItem(items, index, index - 1))}><ArrowUp className="h-4 w-4" /></IconButton>
              <IconButton label="Move down" disabled={index === items.length - 1} onClick={() => onChange(moveItem(items, index, index + 1))}><ArrowDown className="h-4 w-4" /></IconButton>
              <IconButton label="Delete" onClick={() => onChange(items.filter((_, idx) => idx !== index))}><Trash2 className="h-4 w-4" /></IconButton>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {fields.map((field) =>
                field.multiline ? (
                  <TextAreaField key={field.key} label={field.label} value={textValue(item[field.key])} onChange={(value) => onChange(updateRecordAt(items, index, { [field.key]: value }))} />
                ) : (
                  <TextField key={field.key} label={field.label} value={textValue(item[field.key])} onChange={(value) => onChange(updateRecordAt(items, index, { [field.key]: value }))} />
                ),
              )}
            </div>
          </article>
        ))}
        <button type="button" className={buttonClass("secondary")} onClick={() => onChange([...items, emptyItem])}>
          <Plus className="h-4 w-4" />
          Add item
        </button>
      </div>
    </Panel>
  );
}

function buttonClass(kind: "primary" | "secondary" | "publish" | "ghost" | "tiny") {
  const base = "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition disabled:pointer-events-none disabled:opacity-50";
  if (kind === "primary") return `${base} bg-amber-200 px-4 py-2 text-sm text-stone-950 hover:bg-amber-100`;
  if (kind === "publish") return `${base} bg-emerald-300 px-4 py-2 text-sm text-emerald-950 hover:bg-emerald-200`;
  if (kind === "ghost") return `${base} border border-transparent px-4 py-2 text-sm text-stone-300 hover:bg-white/5 hover:text-stone-50`;
  if (kind === "tiny") return `${base} border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-stone-200 hover:border-amber-200/40`;
  return `${base} border border-white/10 bg-white/5 px-4 py-2 text-sm text-stone-100 hover:border-amber-200/40 hover:bg-white/10`;
}

function inputClass(extra = "") {
  return `w-full rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-stone-100 outline-none transition placeholder:text-stone-600 focus:border-amber-200/50 focus:ring-2 focus:ring-amber-200/10 ${extra}`;
}

function HostedRuntimeDiagnostics({
  editorConnected,
  previewPatchPresent,
  sessionReady,
}: {
  editorConnected: boolean;
  previewPatchPresent: boolean;
  sessionReady: boolean;
}) {
  return (
    <section
      data-testid="hosted-runtime-diagnostics"
      className="mt-3 grid gap-2 rounded-2xl border border-sky-300/20 bg-sky-950/20 px-4 py-3 text-xs text-sky-100 sm:grid-cols-2"
    >
      <p><span className="font-semibold">Build:</span> Canvas Builder V2 / hosted-auth-readiness-stabilization</p>
      <p><span className="font-semibold">Frontend host:</span> {safeFrontendHost()}</p>
      <p><span className="font-semibold">Backend host:</span> {safeServiceHost()}</p>
      <p><span className="font-semibold">Owner access:</span> {editorConnected ? "connected" : "loading or unavailable"}</p>
      <p><span className="font-semibold">Session transport:</span> bearer owner session</p>
      <p><span className="font-semibold">Auth provider:</span> {sessionReady ? "session ready" : "checking session"}</p>
      <p><span className="font-semibold">Read recovery:</span> safe owner reads only</p>
      <p><span className="font-semibold">Preview repair:</span> {previewPatchPresent ? "present" : "unknown"}</p>
      <p><span className="font-semibold">Debug mode:</span> display-only</p>
    </section>
  );
}

function safeFrontendHost() {
  return typeof window !== "undefined" ? window.location.host : "hosted frontend";
}

function safeServiceHost() {
  try {
    return new URL(API_BASE).host;
  } catch {
    return "same hosted service";
  }
}

function normalizeConfig(raw: PresenceEditableConfig | Record<string, unknown> | null | undefined, node: PresenceNode): PresenceEditableConfig {
  const source = asRecord(raw);
  const fallback = createFallbackConfig(node);
  return {
    id: numberOrUndefined(source.id),
    room_id: numberOrUndefined(source.room_id) ?? node.id,
    schema_version: textValue(source.schema_version) || "presence-editable-config-v1",
    version: numberOrUndefined(source.version),
    status: textValue(source.status) || "draft",
    renderer_key: textValue(source.renderer_key) || node.renderer_key || "ggm-faithful-room-v1",
    scene_config: nonEmptyRecord(source.scene_config) ?? nonEmptyRecord(source.scene_config_json) ?? fallback.scene_config,
    style_dna: nonEmptyRecord(source.style_dna) ?? nonEmptyRecord(source.style_dna_json) ?? fallback.style_dna,
    motion_config: nonEmptyRecord(source.motion_config) ?? nonEmptyRecord(source.motion_config_json) ?? fallback.motion_config,
    asset_config: nonEmptyRecord(source.asset_config) ?? nonEmptyRecord(source.asset_config_json) ?? fallback.asset_config,
    content_config: nonEmptyRecord(source.content_config) ?? nonEmptyRecord(source.content_config_json) ?? fallback.content_config,
    roomkey_config: nonEmptyRecord(source.roomkey_config) ?? nonEmptyRecord(source.roomkey_config_json) ?? fallback.roomkey_config,
    enquiry_config: nonEmptyRecord(source.enquiry_config) ?? nonEmptyRecord(source.enquiry_config_json) ?? fallback.enquiry_config,
    locked_fields: nonEmptyRecord(source.locked_fields) ?? nonEmptyRecord(source.locked_fields_json) ?? DEFAULT_LOCKED_FIELDS,
    created_at: textOrNull(source.created_at),
    updated_at: textOrNull(source.updated_at),
    published_at: textOrNull(source.published_at),
    archived_at: textOrNull(source.archived_at),
  };
}

function createFallbackConfig(node: PresenceNode): PresenceEditableConfig {
  const works = (node.works ?? []).map((work, index) => ({
    id: work.id,
    slug: work.slug ?? String(work.id ?? index + 1),
    title: work.title,
    year: work.year,
    medium: work.medium,
    dimensions: work.dimensions,
    caption: work.description,
    description: work.description,
    url: work.image_url,
    image_url: work.image_url,
    thumbnail_url: work.thumbnail_url,
    alt_text: work.title,
    sort_order: work.sort_order ?? index + 1,
    is_visible: work.is_visible !== false,
  }));
  const primary = works.find((work) => work.url || work.image_url) ?? works[0];
  return {
    room_id: node.id,
    schema_version: "presence-editable-config-v1",
    status: "draft",
    renderer_key: node.renderer_key || "ggm-faithful-room-v1",
    scene_config: {
      scenes: [
        {
          ...DEFAULT_SCENES[0],
          title: node.hero_title || node.display_name,
          statement: node.headline,
          primary_artwork_slug: primary?.slug,
          intro_copy: node.short_bio || node.bio,
          action_labels: { primary: node.primary_cta_label || "Begin a conversation", work_advance: "Show next artwork" },
          roomkey_provenance_text: "Opened via RoomKey",
        },
        { ...DEFAULT_SCENES[1], artwork_order: works.map((work) => work.slug), selected_work_slug: primary?.slug, work_detail_behaviour: "route_or_inline_detail" },
        { ...DEFAULT_SCENES[2], about_title: "Practice Studio", note_cards_enabled: true },
        { ...DEFAULT_SCENES[3], contact_title: "Calling Card", enquiry_cta: node.primary_cta_label || "Begin a conversation" },
      ],
    },
    style_dna: {
      palette: { bg: "#f4f4f4", paper: "#eceae7", paper_warm: "#e7e1d7", ink: "#111111", muted: "#6a6a6a", line: "#d7d2c8", hero_stage_bg: "#eaeaea", accent: node.accent_color || "#ffffff" },
      background_treatment: "paper_field_with_atmospheric_liquid_bloom",
      frame_treatment: "hairline_no_rounded_gallery_cards",
      typography: { heading_stack: SAFE_FONTS[0], body_stack: SAFE_FONTS[0] },
      spacing: { scene_rhythm: "full_viewport_stage_then_scrollable_scenes" },
      artwork_treatment: { hero_fit: "cover", detail_fit: "contain" },
    },
    motion_config: {
      liquid_style: "ripple",
      liquid_intensity: 0.95,
      morph_speed_ms: 1100,
      distortion_scale: 1,
      dither_strength: 0.62,
      film_grain_strength: 0.42,
      blur_amount: 0.5,
      transition_style: "liquid_crossfade",
      scene_transition_duration_ms: 900,
      parallax_depth: 0.5,
      custom_cursor_enabled: false,
      heavy_motion_enabled: false,
      reduced_motion_fallback: true,
    },
    asset_config: {
      hero_image: { url: node.hero_image_url || node.cover_image_url || node.profile_image_url || primary?.url, alt_text: node.hero_title || node.display_name },
      artworks: works,
      public_assets_only: true,
    },
    content_config: {
      display_name: node.display_name,
      headline: node.headline,
      about: {
        biography: node.bio || node.short_bio,
        artist_statement: node.practice_statement || node.curatorial_statement,
        process_notes: node.long_story,
      },
      contact: {
        contact_title: "Calling Card",
        contact_copy: "Use the Presence enquiry form to begin a conversation.",
        contact_posture: "presence_enquiry_form",
        availability_status: node.availability_status,
        external_links: node.links ?? [],
      },
      works,
    },
    roomkey_config: {
      entry_label: "Opened via RoomKey",
      provenance_chip_text: "Opened via NFC/QR",
      guest_entry_copy: "You have entered this Presence Room.",
      invalid_copy: "This Room Key is not available.",
      revoked_copy: "This Room Key has been revoked.",
      show_save_to_garden: true,
    },
    enquiry_config: {
      cta_label: node.primary_cta_label || "Begin a conversation",
      copy: "Use the Presence enquiry form to contact the Room owner.",
      delivery_posture: "backend_enquiry_capture",
      availability_status: node.availability_status,
    },
    locked_fields: DEFAULT_LOCKED_FIELDS,
  };
}

function toConfigInput(config: PresenceEditableConfig): PresenceEditorConfigInput {
  return {
    renderer_key: config.renderer_key,
    scene_config: asRecord(config.scene_config),
    style_dna: asRecord(config.style_dna),
    motion_config: asRecord(config.motion_config),
    asset_config: asRecord(config.asset_config),
    content_config: asRecord(config.content_config),
    roomkey_config: asRecord(config.roomkey_config),
    enquiry_config: asRecord(config.enquiry_config),
    locked_fields: asRecord(config.locked_fields),
  };
}

function sceneById(config: PresenceEditableConfig, id: string): Record<string, unknown> {
  const scenes = arrayOfRecords(recordAt(config.scene_config, "scenes"));
  const found = scenes.find((scene) => textValue(scene.id) === id);
  if (found) return found;
  return DEFAULT_SCENES.find((scene) => scene.id === id) ?? { id };
}

function setScene(sceneConfig: unknown, id: string, patch: Record<string, unknown>) {
  const current = asRecord(sceneConfig);
  const scenes = arrayOfRecords(current.scenes);
  const index = scenes.findIndex((scene) => textValue(scene.id) === id);
  const fallback = DEFAULT_SCENES.find((scene) => scene.id === id) ?? { id };
  const nextScene = { ...fallback, ...(index >= 0 ? scenes[index] : {}), ...patch, id };
  const nextScenes = index >= 0 ? updateRecordAt(scenes, index, nextScene) : [...scenes, nextScene];
  return { ...current, scenes: nextScenes };
}

function updateScene(mutate: Mutator, id: string, patch: Record<string, unknown>) {
  mutate((draft) => ({ ...draft, scene_config: setScene(draft.scene_config, id, patch) }));
}

function updateAbout(mutate: Mutator, patch: Record<string, unknown>) {
  mutate((draft) => {
    const content = asRecord(draft.content_config);
    return { ...draft, content_config: { ...content, about: { ...asRecord(content.about), ...patch } } };
  });
}

function updateContact(mutate: Mutator, patch: Record<string, unknown>) {
  mutate((draft) => {
    const content = asRecord(draft.content_config);
    return { ...draft, content_config: { ...content, contact: { ...asRecord(content.contact), ...patch } } };
  });
}

function updateEnquiry(mutate: Mutator, patch: Record<string, unknown>) {
  mutate((draft) => ({ ...draft, enquiry_config: { ...asRecord(draft.enquiry_config), ...patch } }));
}

function updateStyle(mutate: Mutator, patch: Record<string, unknown>) {
  mutate((draft) => ({ ...draft, style_dna: { ...asRecord(draft.style_dna), ...patch } }));
}

function updateMotion(mutate: Mutator, patch: Record<string, unknown>) {
  mutate((draft) => ({ ...draft, motion_config: { ...asRecord(draft.motion_config), ...patch } }));
}

function updateRoomKey(mutate: Mutator, patch: Record<string, unknown>) {
  mutate((draft) => ({ ...draft, roomkey_config: { ...asRecord(draft.roomkey_config), ...patch } }));
}

function updateAsset(mutate: Mutator, patch: Record<string, unknown>) {
  mutate((draft) => ({ ...draft, asset_config: { ...asRecord(draft.asset_config), ...patch } }));
}

function appendWorkFromAsset(mutate: Mutator, asset: PresenceEditorAsset) {
  mutate((draft) => {
    const works = arrayOfRecords(recordAt(draft.asset_config, "artworks"));
    const title = asset.alt_text || asset.slot || "Attached work";
    const next = [
      ...works,
      {
        slug: slugify(title),
        title,
        url: asset.url,
        image_url: asset.url,
        thumbnail_url: asset.url,
        alt_text: asset.alt_text || title,
        is_visible: true,
        sort_order: works.length + 1,
      },
    ];
    return {
      ...draft,
      asset_config: { ...asRecord(draft.asset_config), artworks: next },
      content_config: { ...asRecord(draft.content_config), works: next },
    };
  });
}

function getWorks(config: PresenceEditableConfig, node: PresenceNode): EditableWork[] {
  const fromAssets = arrayOfRecords(recordAt(config.asset_config, "artworks"));
  const fromContent = arrayOfRecords(recordAt(config.content_config, "works"));
  const source = fromAssets.length > 0 ? fromAssets : fromContent.length > 0 ? fromContent : node.works ?? [];
  return source.map((item, index) => {
    const row = asRecord(item);
    const slug = textValue(row.slug) || slugify(textValue(row.title) || `work-${index + 1}`);
    return {
      id: textValue(row.id) || numberOrUndefined(row.id),
      slug,
      title: textValue(row.title) || "Untitled work",
      year: textValue(row.year),
      medium: textValue(row.medium),
      dimensions: textValue(row.dimensions),
      caption: textValue(row.caption),
      description: textValue(row.description),
      url: textValue(row.url),
      image_url: textValue(row.image_url),
      thumbnail_url: textValue(row.thumbnail_url),
      alt_text: textValue(row.alt_text ?? row.alt),
      sort_order: numberOrUndefined(row.sort_order) ?? index + 1,
      is_visible: row.is_visible !== false,
    };
  });
}

function unsafeAssetReason(value: string | null | undefined): string | null {
  if (!String(value ?? "").trim()) return null;
  return assetSafetyMessage(value);
}

function cloneConfig<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function snapshot(value: unknown) {
  return JSON.stringify(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function nonEmptyRecord(value: unknown) {
  const record = asRecord(value);
  return Object.keys(record).length > 0 ? record : undefined;
}

function recordAt(value: unknown, key: string) {
  return asRecord(value)[key];
}

function arrayOfRecords(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item)));
}

function textValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function textOrNull(value: unknown): string | null {
  const text = textValue(value);
  return text || null;
}

function numberValue(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function numberOrUndefined(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function moveItem<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item === undefined) return items;
  next.splice(to, 0, item);
  return next;
}

function updateRecordAt(items: Record<string, unknown>[], index: number, patch: Record<string, unknown>) {
  return items.map((item, idx) => (idx === index ? { ...item, ...patch } : item));
}

function updateWorkAt(items: EditableWork[], index: number, patch: Partial<EditableWork>) {
  return items.map((item, idx) => (idx === index ? { ...item, ...patch } : item));
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "untitled";
}

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function errorMessage(err: unknown) {
  if (err instanceof PresenceApiError) {
    if (err.status === 401) return "Sign in required to use the owner-only editor.";
    if (err.status === 403) return "This account does not own this Presence Room.";
    if (err.status === 404) return "The editor endpoint or Room was not found. Confirm the hosted migration and API deployment.";
    return err.message;
  }
  return err instanceof Error ? err.message : "The Presence editor request failed.";
}
