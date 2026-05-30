"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Lightbulb,
  Loader2,
  Monitor,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wand2,
} from "lucide-react";
import { PresenceApiError } from "@/lib/api/client";
import { getPresenceEditor } from "@/lib/api/editor";
import { saveStudioRoomDraft } from "@/lib/api/studioRoomTemplates";
import type { PresenceEditorOverview, PresenceNode } from "@/lib/api/types";
import {
  duplicateObjectInChamber,
  editableContentKeysForObjectType,
  FIELD_LENGTH_LIMITS,
  fieldLengthIssue,
  humanRoleDescriptionForChamberType,
  humanRoleDescriptionForObjectType,
  humanRoleLabelForChamberType,
  humanRoleLabelForObjectType,
  isObjectActionEditable,
  isObjectDuplicatable,
  isObjectHideable,
  isObjectMobileHidden,
  isObjectMovable,
  isSafeStudioRoomEditUrl,
  moveObjectInChamber,
  setObjectMobileHidden,
} from "@/lib/presence/studio-room/editing";
import type { Chamber, Room, RoomObject, RoomObjectContent } from "@/lib/presence/studio-room/model";
import {
  extractPersistedStudioRoomDraft,
  type PersistedStudioRoomDraftPayload,
} from "@/lib/presence/studio-room/persistedDraft";
import { toPublicRoomPayload } from "@/lib/presence/studio-room/sanitize";
import { analyzeStudioGuide, type StudioGuideIssue } from "@/lib/presence/studio-room/studioGuide";
import { StudioRoomCanvas } from "./StudioRoomCanvas";

interface StudioRoomOwnerEditorShellProps {
  node: PresenceNode;
  nodeId: number;
  token: string;
}

type Viewport = "mobile" | "desktop";
type MobileTab = "preview" | "inspector";
type ChromeMode = "studio" | "daylight";
type PreviewDensity = "compact" | "cozy" | "calm";
type SelectionMode = "ring" | "spotlight";
type FieldLimitKey = keyof typeof FIELD_LENGTH_LIMITS;

export function StudioRoomOwnerEditorShell({ node, nodeId, token }: StudioRoomOwnerEditorShellProps) {
  const [overview, setOverview] = useState<PresenceEditorOverview | null>(null);
  const [draftPayload, setDraftPayload] = useState<PersistedStudioRoomDraftPayload | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [selectedChamberId, setSelectedChamberId] = useState<string | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [viewport, setViewport] = useState<Viewport>("mobile");
  const [mobileTab, setMobileTab] = useState<MobileTab>("preview");
  const [chromeMode, setChromeMode] = useState<ChromeMode>("studio");
  const [previewDensity, setPreviewDensity] = useState<PreviewDensity>("cozy");
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("ring");
  const [reducedPreviewMotion, setReducedPreviewMotion] = useState(false);
  const [guideExpanded, setGuideExpanded] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setActionError(null);
    try {
      const data = await getPresenceEditor(nodeId, token);
      const persisted = extractPersistedStudioRoomDraft(data.draft);
      setOverview(data);
      setDraftPayload(persisted);
      setSavedSnapshot(persisted ? snapshot(persisted) : "");
      const firstChamber = persisted?.room.chambers[0] ?? null;
      setSelectedChamberId((current) => current ?? firstChamber?.id ?? null);
      setSelectedObjectId((current) => current ?? firstChamber?.objects[0]?.id ?? null);
    } catch {
      setError("Unable to load this Studio Room draft.");
    } finally {
      setLoading(false);
    }
  }, [nodeId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = Boolean(draftPayload && snapshot(draftPayload) !== savedSnapshot);
  const publicPreviewRoom = useMemo(
    () => (draftPayload ? toPublicRoomPayload(draftPayload.room) : null),
    [draftPayload],
  );
  const chambers = draftPayload?.room.chambers ?? [];
  const selectedChamber = chambers.find((chamber) => chamber.id === selectedChamberId) ?? chambers[0] ?? null;
  const selectedObject =
    selectedChamber?.objects.find((object) => object.id === selectedObjectId)
    ?? selectedChamber?.objects[0]
    ?? null;
  const objectCount = chambers.reduce((sum, chamber) => sum + chamber.objects.length, 0);
  const mobileVariantCount = chambers.reduce((sum, chamber) => {
    return sum + (chamber.mobile ? 1 : 0) + chamber.objects.filter((object) => object.mobile).length;
  }, 0);

  const guide = useMemo(() => {
    if (!draftPayload) return null;
    return analyzeStudioGuide(draftPayload.room, {
      requiredFields: draftPayload.requiredFields,
      optionalFields: draftPayload.optionalFields,
      copyScaffolds: draftPayload.copyScaffolds ?? [],
      ctaStrategy: draftPayload.ctaStrategy,
    });
  }, [draftPayload]);

  useEffect(() => {
    if (!guide) return;
    const totalIssues = guide.urgentCount + guide.advisoryCount + guide.polishCount;
    if (totalIssues === 0) {
      setGuideExpanded(false);
    } else if (guide.urgentCount > 0) {
      setGuideExpanded(true);
    }
  }, [guide]);

  async function saveDraft() {
    if (!draftPayload || saving || !dirty) return;
    setSaving(true);
    setActionError(null);
    setNotice(null);
    try {
      const saved = await saveStudioRoomDraft(nodeId, token, draftPayload);
      setDraftPayload(saved.studioRoomDraft);
      setSavedSnapshot(snapshot(saved.studioRoomDraft));
      setNotice("Draft saved. Public routes are unchanged.");
      setOverview((current) =>
        current
          ? {
              ...current,
              draft: current.draft
                ? {
                    ...current.draft,
                    version: saved.draft.version ?? current.draft.version,
                    status: saved.draft.status ?? current.draft.status,
                    updated_at: saved.draft.updated_at ?? current.draft.updated_at,
                    content_config: {
                      ...(current.draft.content_config ?? {}),
                      studio_room_draft: saved.studioRoomDraft,
                    },
                  }
                : current.draft,
              published: null,
            }
          : current,
      );
    } catch (err) {
      setActionError(saveErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function revertAll() {
    if (!savedSnapshot) return;
    try {
      const parsed = JSON.parse(savedSnapshot) as PersistedStudioRoomDraftPayload;
      setDraftPayload(parsed);
      setActionError(null);
      setNotice("Local changes reverted to last saved draft.");
    } catch {
      setActionError("Could not revert local changes.");
    }
  }

  function mutateRoom(mutator: (room: Room) => Room) {
    setDraftPayload((current) => (current ? { ...current, room: mutator(cloneRoom(current.room)) } : current));
    setNotice(null);
    setActionError(null);
  }

  function updateChamber(field: "title" | "summary", value: string) {
    if (!selectedChamber) return;
    mutateRoom((room) => ({
      ...room,
      chambers: room.chambers.map((chamber) =>
        chamber.id === selectedChamber.id ? { ...chamber, [field]: value } : chamber,
      ),
    }));
  }

  function updateObject(field: "label", value: string) {
    if (!selectedChamber || !selectedObject) return;
    mutateSelectedObject(selectedChamber.id, selectedObject.id, (object) => ({ ...object, [field]: value }));
  }

  function updateObjectContent(field: keyof RoomObjectContent, value: string) {
    if (!selectedChamber || !selectedObject) return;
    mutateSelectedObject(selectedChamber.id, selectedObject.id, (object) => ({
      ...object,
      content: { ...object.content, [field]: value },
    }));
  }

  function updateObjectAction(field: "label" | "href", value: string) {
    if (!selectedChamber || !selectedObject) return;
    mutateSelectedObject(selectedChamber.id, selectedObject.id, (object) => ({
      ...object,
      content: {
        ...object.content,
        action: {
          label: object.content.action?.label ?? object.content.title ?? object.label,
          href: object.content.action?.href ?? `#${selectedChamber.id}`,
          [field]: value,
        },
      },
    }));
    if (selectedObject.type === "cta" && field === "label") {
      setDraftPayload((current) =>
        current
          ? { ...current, ctaStrategy: { ...current.ctaStrategy, label: value } }
          : current,
      );
    }
  }

  function updateCtaTarget(value: string) {
    if (!draftPayload || !selectedObject || selectedObject.type !== "cta") return;
    const safeTarget = value.startsWith("#") ? value.slice(1) : value;
    const href = `#${safeTarget}`;
    updateObjectAction("href", href);
    setDraftPayload((current) =>
      current
        ? { ...current, ctaStrategy: { ...current.ctaStrategy, primaryChamberId: safeTarget } }
        : current,
    );
  }

  function duplicateSelectedObject() {
    if (!selectedChamber || !selectedObject || !isObjectDuplicatable(selectedObject.type)) return;
    mutateRoom((room) => ({
      ...room,
      chambers: room.chambers.map((chamber) =>
        chamber.id === selectedChamber.id ? duplicateObjectInChamber(chamber, selectedObject.id) : chamber,
      ),
    }));
  }

  function toggleSelectedObjectHidden() {
    if (!selectedChamber || !selectedObject || !isObjectHideable(selectedObject.type)) return;
    const nextHidden = !isObjectMobileHidden(selectedObject);
    mutateRoom((room) => ({
      ...room,
      chambers: room.chambers.map((chamber) =>
        chamber.id === selectedChamber.id
          ? setObjectMobileHidden(chamber, selectedObject.id, nextHidden)
          : chamber,
      ),
    }));
  }

  function moveSelectedObject(direction: "up" | "down") {
    if (!selectedChamber || !selectedObject || !isObjectMovable(selectedObject.type)) return;
    mutateRoom((room) => ({
      ...room,
      chambers: room.chambers.map((chamber) =>
        chamber.id === selectedChamber.id ? moveObjectInChamber(chamber, selectedObject.id, direction) : chamber,
      ),
    }));
  }

  function revertSelectedObject() {
    if (!savedSnapshot || !selectedChamber || !selectedObject) return;
    try {
      const baseline = JSON.parse(savedSnapshot) as PersistedStudioRoomDraftPayload;
      const baselineObject = baseline.room.chambers
        .find((chamber) => chamber.id === selectedChamber.id)
        ?.objects.find((object) => object.id === selectedObject.id);
      if (!baselineObject) {
        setActionError("This object has no saved baseline to revert to (it was added since the last save).");
        return;
      }
      mutateSelectedObject(selectedChamber.id, selectedObject.id, () => baselineObject);
      setNotice(`Reverted "${baselineObject.label}" to last saved values.`);
    } catch {
      setActionError("Could not revert this object.");
    }
  }

  function mutateSelectedObject(chamberId: string, objectId: string, mutator: (object: RoomObject) => RoomObject) {
    mutateRoom((room) => ({
      ...room,
      chambers: room.chambers.map((chamber) =>
        chamber.id === chamberId
          ? {
              ...chamber,
              objects: chamber.objects.map((object) => (object.id === objectId ? mutator(object) : object)),
            }
          : chamber,
      ),
    }));
  }

  function selectObjectFromPreview(objectId: string) {
    const chamber = chambers.find((candidate) =>
      candidate.objects.some((object) => object.id === objectId),
    );
    if (!chamber) return;
    setSelectedChamberId(chamber.id);
    setSelectedObjectId(objectId);
    setMobileTab("inspector");
  }

  function navigateToIssue(issue: StudioGuideIssue) {
    if (issue.chamberId) {
      const chamber = chambers.find((c) => c.id === issue.chamberId);
      if (!chamber) return;
      setSelectedChamberId(issue.chamberId);
      if (issue.objectId && chamber.objects.some((o) => o.id === issue.objectId)) {
        setSelectedObjectId(issue.objectId);
      } else {
        setSelectedObjectId(chamber.objects[0]?.id ?? null);
      }
    }
    setMobileTab("inspector");
    setGuideExpanded(true);
  }

  if (loading && !overview) {
    return (
      <section className="grid min-h-[60vh] place-items-center px-4">
        <div className="rounded-3xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-5 text-sm text-[var(--p-studio-muted)]">
          Loading Studio Room draft...
        </div>
      </section>
    );
  }

  if (error || !draftPayload || !publicPreviewRoom) {
    return (
      <section className="mx-auto grid max-w-3xl gap-4 px-4 py-8">
        <div className="rounded-3xl border border-red-900/60 bg-red-950/25 p-5">
          <AlertTriangle className="h-5 w-5 text-red-200" />
          <h1 className="mt-3 text-xl font-semibold">Studio Room draft unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-red-100/80">
            {error ?? "This Presence does not contain a TemplateKit-created Studio Room draft."}
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-red-900/60 px-4 py-2 text-sm font-semibold text-red-50"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </section>
    );
  }

  const selectedObjectIndex = selectedChamber && selectedObject
    ? selectedChamber.objects.findIndex((object) => object.id === selectedObject.id)
    : -1;
  const canMoveUp = selectedChamber && selectedObject && isObjectMovable(selectedObject.type)
    && selectedObjectIndex > 0
    && isObjectMovable(selectedChamber.objects[selectedObjectIndex - 1].type);
  const canMoveDown = selectedChamber && selectedObject && isObjectMovable(selectedObject.type)
    && selectedObjectIndex >= 0
    && selectedObjectIndex < selectedChamber.objects.length - 1
    && isObjectMovable(selectedChamber.objects[selectedObjectIndex + 1].type);
  const editorStyle = studioEditorChromeStyle(
    draftPayload.room.templateKitId,
    draftPayload.room.theme.accent,
  );

  return (
    <section
      data-testid="studio-room-owner-editor-shell"
      className="ps-cockpit"
      data-chrome={chromeMode}
      data-density={previewDensity}
      data-selection={selectionMode}
      style={editorStyle}
    >
      <style>{STUDIO_ROOM_OWNER_EDITOR_CSS}</style>
      <div className="ps-aurora" aria-hidden="true"><span /><span /><span /></div>
      <header
        data-testid="studio-room-draft-warning"
        className="ps-topbar"
      >
        <div className="ps-brand">
          <div className="ps-logo">P</div>
          <div className="min-w-0">
            <div className="ps-crumb">
              Presence Studio <span>/</span> Studio Room
            </div>
            <h1>{draftPayload.templateKitName ?? node.display_name}</h1>
          </div>
        </div>
        <span className="ps-private-pill">
          <ShieldCheck className="h-4 w-4" />
          Private rehearsal space
        </span>
        <div className="ps-top-spacer" />
        <span className="ps-save-state" data-dirty={dirty ? "true" : "false"}>
          <span className="ps-pulse" />
          {saving ? "Saving draft" : dirty ? "Unsaved changes" : "All changes saved"}
        </span>
        <div className="ps-viewport-toggle" role="group" aria-label="Preview viewport">
          <button
            type="button"
            onClick={() => setViewport("mobile")}
            aria-label="Mobile preview"
            aria-pressed={viewport === "mobile"}
            data-on={viewport === "mobile" ? "true" : "false"}
          >
            <Smartphone className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewport("desktop")}
            aria-label="Desktop preview"
            aria-pressed={viewport === "desktop"}
            data-on={viewport === "desktop" ? "true" : "false"}
          >
            <Monitor className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          className="ps-icon-button"
          onClick={() => setChromeMode((current) => (current === "studio" ? "daylight" : "studio"))}
        >
          {chromeMode === "studio" ? "Daylight" : "Studio"}
        </button>
        <details className="ps-tweaks">
          <summary>View tweaks</summary>
          <div className="ps-tweaks-menu">
            <label>
              Density
              <select value={previewDensity} onChange={(event) => setPreviewDensity(event.target.value as PreviewDensity)}>
                <option value="calm">Calm</option>
                <option value="cozy">Cozy</option>
                <option value="compact">Compact</option>
              </select>
            </label>
            <label>
              Selection
              <select value={selectionMode} onChange={(event) => setSelectionMode(event.target.value as SelectionMode)}>
                <option value="ring">Glow ring</option>
                <option value="spotlight">Spotlight</option>
              </select>
            </label>
            <label className="ps-toggle-row">
              <input
                type="checkbox"
                checked={reducedPreviewMotion}
                onChange={(event) => setReducedPreviewMotion(event.target.checked)}
              />
              Reduced preview motion
            </label>
          </div>
        </details>
        <button
          type="button"
          data-testid="studio-room-revert-all"
          onClick={revertAll}
          disabled={!dirty || saving}
          className="ps-secondary-button"
        >
          <RotateCcw className="h-4 w-4" />
          Revert all
        </button>
        <button
          type="button"
          data-testid="studio-room-save-draft"
          onClick={() => void saveDraft()}
          disabled={!dirty || saving}
          className="ps-primary-button"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : "Save draft"}
        </button>
        <div className="ps-safety-copy">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-[var(--p-studio-muted)]">
            <ShieldCheck className="h-4 w-4" />
            Studio Room private draft editor
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--p-studio-muted)]">
            Changes save to this private draft only. Public routes, publishing, public renderer behaviour, and Presence World graphs are unchanged.
          </p>
        </div>
        <div className="ps-info-grid">
          <Info label="Draft" value={overview?.draft?.status ?? "draft"} />
          <Info label="Saved" value={dirty ? "unsaved" : "current"} />
          <Info label="Published" value={overview?.published ? `v${overview.published.version ?? ""}` : "none"} />
        </div>
        <div className="ps-top-notices">
          <span className="text-xs text-[var(--p-studio-muted)]">No publish action exists in this shell.</span>
          {notice && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-200">
              <CheckCircle2 className="h-4 w-4" />
              {notice}
            </span>
          )}
          {actionError && <span className="text-xs font-semibold text-red-200">{actionError}</span>}
        </div>
      </header>

      <div
        data-testid="studio-room-editor-mobile-tabs"
        className="ps-mobile-tabs"
      >
        <button
          type="button"
          onClick={() => setMobileTab("preview")}
          data-on={mobileTab === "preview" ? "true" : "false"}
        >
          Preview
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("inspector")}
          data-on={mobileTab === "inspector" ? "true" : "false"}
        >
          Inspector
        </button>
      </div>

      <MobileChamberRail
        chambers={chambers}
        selectedChamberId={selectedChamber?.id ?? null}
        onSelectChamber={(chamber) => {
          setSelectedChamberId(chamber.id);
          setSelectedObjectId(chamber.objects[0]?.id ?? null);
          setMobileTab("preview");
        }}
      />

      <div className="ps-workbench">
        <ChamberPanel
          chambers={chambers}
          selectedChamberId={selectedChamber?.id ?? null}
          selectedObjectId={selectedObject?.id ?? null}
          onSelectChamber={(chamber) => {
            setSelectedChamberId(chamber.id);
            setSelectedObjectId(chamber.objects[0]?.id ?? null);
            setMobileTab("inspector");
          }}
          onSelectObject={(chamber, object) => {
            setSelectedChamberId(chamber.id);
            setSelectedObjectId(object.id);
            setMobileTab("inspector");
          }}
          objectCount={objectCount}
          mobileVariantCount={mobileVariantCount}
        />

        <section
          data-testid="studio-room-preview-panel"
          data-mobile-active={mobileTab === "preview" ? "true" : "false"}
          className={`ps-stage-panel ${mobileTab === "preview" ? "" : "ps-mobile-hidden"}`}
        >
          <div className="ps-panel-head">
            <div>
              <h2>Live stage</h2>
              <p>
                The canvas renders a public-style sanitized copy of the private draft.
              </p>
            </div>
            <div className="ps-viewport-toggle">
              <button
                type="button"
                onClick={() => setViewport("mobile")}
                aria-label="Mobile preview"
                aria-pressed={viewport === "mobile"}
                data-on={viewport === "mobile" ? "true" : "false"}
              >
                <Smartphone className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewport("desktop")}
                aria-label="Desktop preview"
                aria-pressed={viewport === "desktop"}
                data-on={viewport === "desktop" ? "true" : "false"}
              >
                <Monitor className="h-4 w-4" />
              </button>
            </div>
          </div>
          <StudioRoomCanvas
            room={publicPreviewRoom}
            dirty={dirty}
            viewport={viewport}
            selectedObjectId={selectedObject?.id ?? null}
            selectionMode={selectionMode}
            density={previewDensity}
            reducedMotion={reducedPreviewMotion}
            onSelectObject={selectObjectFromPreview}
          />
        </section>

        <div className={`ps-inspector-column ${mobileTab === "inspector" ? "" : "ps-mobile-hidden"}`}>
          <StudioGuidePanel
            guide={guide}
            expanded={guideExpanded}
            onToggleExpanded={() => setGuideExpanded((v) => !v)}
            onNavigate={navigateToIssue}
          />
          <InspectorPanel
            chamber={selectedChamber}
            object={selectedObject}
            chambers={chambers}
            canMoveUp={Boolean(canMoveUp)}
            canMoveDown={Boolean(canMoveDown)}
            onChamberChange={updateChamber}
            onObjectChange={updateObject}
            onContentChange={updateObjectContent}
            onActionChange={updateObjectAction}
            onCtaTargetChange={updateCtaTarget}
            onDuplicate={duplicateSelectedObject}
            onToggleHidden={toggleSelectedObjectHidden}
            onMove={moveSelectedObject}
            onRevertObject={revertSelectedObject}
          />
        </div>
      </div>
    </section>
  );
}

function MobileChamberRail({
  chambers,
  selectedChamberId,
  onSelectChamber,
}: {
  chambers: Chamber[];
  selectedChamberId: string | null;
  onSelectChamber: (chamber: Chamber) => void;
}) {
  if (chambers.length === 0) return null;
  return (
    <nav className="ps-mobile-rail" aria-label="Studio Room chambers">
      {chambers.map((chamber, index) => (
        <button
          key={chamber.id}
          type="button"
          data-on={chamber.id === selectedChamberId ? "true" : "false"}
          onClick={() => onSelectChamber(chamber)}
        >
          <span>{index + 1}</span>
          {chamber.mobile?.label ?? chamber.title}
        </button>
      ))}
    </nav>
  );
}

function ChamberPanel({
  chambers,
  selectedChamberId,
  selectedObjectId,
  onSelectChamber,
  onSelectObject,
  objectCount,
  mobileVariantCount,
}: {
  chambers: Chamber[];
  selectedChamberId: string | null;
  selectedObjectId: string | null;
  onSelectChamber: (chamber: Chamber) => void;
  onSelectObject: (chamber: Chamber, object: RoomObject) => void;
  objectCount: number;
  mobileVariantCount: number;
}) {
  return (
    <aside data-testid="studio-room-chamber-panel" className="ps-chamber-column grid content-start gap-4">
      <section className="rounded-3xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-5">
        <h2 className="text-lg font-semibold">Chambers</h2>
        <p className="mt-1 text-xs text-[var(--p-studio-muted)]">
          Walk each chamber, then each object inside it.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <Info label="Rooms" value={String(chambers.length)} />
          <Info label="Objects" value={String(objectCount)} />
          <Info label="Mobile" value={String(mobileVariantCount)} />
        </div>
        {chambers.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-[var(--p-studio-border)] p-4 text-sm text-[var(--p-studio-muted)]">
            This draft has no chambers yet. Open it from a TemplateKit to seed safe chambers.
          </p>
        ) : (
          <div className="mt-4 grid gap-3">
            {chambers.map((chamber) => {
              const active = chamber.id === selectedChamberId;
              return (
                <div
                  key={chamber.id}
                  className={`rounded-2xl border p-3 ${active ? "border-[var(--p-studio-accent)] bg-[var(--p-studio-accent)]/10" : "border-[var(--p-studio-border)]"}`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectChamber(chamber)}
                    className="block w-full text-left"
                    aria-expanded={active}
                  >
                    <div className="flex items-start gap-2">
                      {active ? <ChevronDown className="mt-0.5 h-4 w-4 text-[var(--p-studio-muted)]" /> : <ChevronRight className="mt-0.5 h-4 w-4 text-[var(--p-studio-muted)]" />}
                      <div>
                        <p className="text-sm font-semibold">{chamber.title || "Untitled chamber"}</p>
                        <p className="mt-1 text-xs uppercase text-[var(--p-studio-muted)]">
                          {humanRoleLabelForChamberType(chamber.type)} / {chamber.objects.length} object{chamber.objects.length === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                  </button>
                  {active && (
                    <div className="mt-3 grid gap-2">
                      {chamber.objects.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-[var(--p-studio-border)] p-3 text-xs text-[var(--p-studio-muted)]">
                          This chamber has no objects yet.
                        </p>
                      ) : (
                        chamber.objects.map((object) => {
                          const hidden = isObjectMobileHidden(object);
                          const isSelected = object.id === selectedObjectId;
                          return (
                            <button
                              key={object.id}
                              type="button"
                              data-testid={`studio-room-object-${object.id}`}
                              onClick={() => onSelectObject(chamber, object)}
                              className={`group rounded-xl border px-3 py-2 text-left text-xs ${
                                isSelected
                                  ? "border-[var(--p-studio-accent)] text-[var(--p-studio-text)]"
                                  : "border-[var(--p-studio-border)] text-[var(--p-studio-muted)]"
                              } ${hidden ? "opacity-60" : ""}`}
                              aria-pressed={isSelected}
                            >
                              <span className="flex items-center justify-between gap-2">
                                <span className="block font-semibold">{object.label || humanRoleLabelForObjectType(object.type)}</span>
                                {hidden && (
                                  <span
                                    data-testid={`studio-room-object-${object.id}-mobile-hidden`}
                                    className="inline-flex items-center gap-1 rounded-full border border-[var(--p-studio-border)] px-2 py-0.5 text-[0.62rem] uppercase"
                                  >
                                    <EyeOff className="h-3 w-3" />
                                    Hidden on mobile
                                  </span>
                                )}
                              </span>
                              <span className="mt-0.5 block text-[0.7rem] uppercase">
                                {humanRoleLabelForObjectType(object.type)}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </aside>
  );
}

function InspectorPanel({
  chamber,
  object,
  chambers,
  canMoveUp,
  canMoveDown,
  onChamberChange,
  onObjectChange,
  onContentChange,
  onActionChange,
  onCtaTargetChange,
  onDuplicate,
  onToggleHidden,
  onMove,
  onRevertObject,
}: {
  chamber: Chamber | null;
  object: RoomObject | null;
  chambers: Chamber[];
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChamberChange: (field: "title" | "summary", value: string) => void;
  onObjectChange: (field: "label", value: string) => void;
  onContentChange: (field: keyof RoomObjectContent, value: string) => void;
  onActionChange: (field: "label" | "href", value: string) => void;
  onCtaTargetChange: (value: string) => void;
  onDuplicate: () => void;
  onToggleHidden: () => void;
  onMove: (direction: "up" | "down") => void;
  onRevertObject: () => void;
}) {
  if (!chamber) {
    return (
      <aside
        data-testid="studio-room-inspector-panel"
        className="ps-panel ps-inspector-empty"
      >
        <p className="text-sm text-[var(--p-studio-muted)]">Select a chamber to edit safe draft fields.</p>
      </aside>
    );
  }

  const keys = object ? editableContentKeysForObjectType(object.type) : [];
  const actionEditable = object ? isObjectActionEditable(object.type) : false;
  const href = object?.content.action?.href ?? "";
  const hrefWarning = href && !isSafeStudioRoomEditUrl(href) ? "This link will be rejected on save." : null;
  const breadcrumb = object
    ? `${chamber.title || "Untitled chamber"} > ${object.label || humanRoleLabelForObjectType(object.type)}`
    : chamber.title || "Untitled chamber";

  const chamberTitleIssue = fieldLengthIssue("title", chamber.title);
  const chamberSummaryIssue = fieldLengthIssue("summary", chamber.summary);

  return (
    <aside data-testid="studio-room-inspector-panel" className="ps-inspector grid content-start gap-4">
      <nav
        data-testid="studio-room-inspector-breadcrumb"
        aria-label="Inspector breadcrumb"
        className="ps-breadcrumb"
      >
        {breadcrumb}
      </nav>

      <section
        data-testid="studio-room-inspector-chamber-section"
        className="ps-panel ps-inspector-card"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Chamber</h2>
            <p className="mt-1 text-xs text-[var(--p-studio-muted)]">
              {humanRoleDescriptionForChamberType(chamber.type)}
            </p>
          </div>
          <span className="ps-role-pill">
            {humanRoleLabelForChamberType(chamber.type)}
          </span>
        </div>
        <FieldGroup label="Identity">
          <TextInput
            label="Chamber title"
            value={chamber.title}
            onChange={(value) => onChamberChange("title", value)}
            meterKey="title"
            warning={chamberTitleIssue ? `${chamberTitleIssue.length}/${chamberTitleIssue.limit} - over the recommended length.` : null}
          />
          <TextArea
            label="Chamber summary"
            value={chamber.summary ?? ""}
            onChange={(value) => onChamberChange("summary", value)}
            meterKey="summary"
            warning={chamberSummaryIssue ? `${chamberSummaryIssue.length}/${chamberSummaryIssue.limit} - over the recommended length.` : null}
          />
        </FieldGroup>
      </section>

      {object ? (
        <ObjectInspector
          chamber={chamber}
          object={object}
          chambers={chambers}
          keys={keys}
          actionEditable={actionEditable}
          href={href}
          hrefWarning={hrefWarning}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          onObjectChange={onObjectChange}
          onContentChange={onContentChange}
          onActionChange={onActionChange}
          onCtaTargetChange={onCtaTargetChange}
          onDuplicate={onDuplicate}
          onToggleHidden={onToggleHidden}
          onMove={onMove}
          onRevertObject={onRevertObject}
        />
      ) : (
        <section className="ps-panel ps-inspector-empty">
          <p className="text-sm text-[var(--p-studio-muted)]">
            This chamber has no editable objects yet. Choose an object in the chamber list to edit safe public fields.
          </p>
        </section>
      )}
    </aside>
  );
}

function ObjectInspector({
  chamber,
  object,
  chambers,
  keys,
  actionEditable,
  href,
  hrefWarning,
  canMoveUp,
  canMoveDown,
  onObjectChange,
  onContentChange,
  onActionChange,
  onCtaTargetChange,
  onDuplicate,
  onToggleHidden,
  onMove,
  onRevertObject,
}: {
  chamber: Chamber;
  object: RoomObject;
  chambers: Chamber[];
  keys: readonly string[];
  actionEditable: boolean;
  href: string;
  hrefWarning: string | null;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onObjectChange: (field: "label", value: string) => void;
  onContentChange: (field: keyof RoomObjectContent, value: string) => void;
  onActionChange: (field: "label" | "href", value: string) => void;
  onCtaTargetChange: (value: string) => void;
  onDuplicate: () => void;
  onToggleHidden: () => void;
  onMove: (direction: "up" | "down") => void;
  onRevertObject: () => void;
}) {
  const hidden = isObjectMobileHidden(object);
  const labelIssue = fieldLengthIssue("label", object.label);
  const titleIssue = fieldLengthIssue("title", object.content.title);
  const bodyIssue = fieldLengthIssue("body", object.content.body);
  const quoteIssue = fieldLengthIssue("quote", object.content.quote);
  const attributionIssue = fieldLengthIssue("attribution", object.content.attribution);
  const sourceIssue = fieldLengthIssue("source", object.content.source);
  const issuerIssue = fieldLengthIssue("issuer", object.content.issuer);
  const detailIssue = fieldLengthIssue("detail", object.content.detail);
  const priceIssue = fieldLengthIssue("priceLabel", object.content.priceLabel);
  const durationIssue = fieldLengthIssue("durationLabel", object.content.durationLabel);
  const linkTypeIssue = fieldLengthIssue("linkType", object.content.linkType);
  const urlIssue = object.content.url && !isSafeStudioRoomEditUrl(object.content.url)
    ? "This URL will be rejected on save."
    : null;
  const actionLabelIssue = fieldLengthIssue("actionLabel", object.content.action?.label);

  return (
    <section
      data-testid="studio-room-inspector-object-section"
      className="ps-panel ps-inspector-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{object.label || "Object"}</h3>
          <p className="mt-1 text-xs text-[var(--p-studio-muted)]">
            {humanRoleDescriptionForObjectType(object.type)}
          </p>
        </div>
        <span className="ps-role-pill">
          {humanRoleLabelForObjectType(object.type)}
        </span>
      </div>

      <div
        data-testid="studio-room-inspector-object-actions"
        className="ps-action-grid"
      >
        <ActionButton
          testId="studio-room-object-move-up"
          icon={<ArrowUp className="h-4 w-4" />}
          label="Move up"
          onClick={() => onMove("up")}
          disabled={!canMoveUp}
        />
        <ActionButton
          testId="studio-room-object-move-down"
          icon={<ArrowDown className="h-4 w-4" />}
          label="Move down"
          onClick={() => onMove("down")}
          disabled={!canMoveDown}
        />
        <ActionButton
          testId="studio-room-object-duplicate"
          icon={<Copy className="h-4 w-4" />}
          label="Duplicate"
          onClick={onDuplicate}
          disabled={!isObjectDuplicatable(object.type)}
        />
        <ActionButton
          testId="studio-room-object-toggle-hidden"
          icon={hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          label={hidden ? "Show on mobile" : "Hide on mobile"}
          onClick={onToggleHidden}
          disabled={!isObjectHideable(object.type)}
        />
        <ActionButton
          testId="studio-room-object-revert"
          icon={<RotateCcw className="h-4 w-4" />}
          label="Revert object"
          onClick={onRevertObject}
        />
      </div>

      {(object.type === "image" || object.type === "media") && (
        <p className="ps-locked-note">
          Media choice is locked in this inspector. Use the dedicated media flow for image replacement and alt text.
        </p>
      )}

      <FieldGroup label="Identity">
        <TextInput
          label="Display label"
          value={object.label}
          onChange={(value) => onObjectChange("label", value)}
          meterKey="label"
          warning={labelIssue ? `${labelIssue.length}/${labelIssue.limit} - over the recommended length.` : null}
        />
      </FieldGroup>

      {(keys.includes("title") || keys.includes("body")) && (
        <FieldGroup label="Content">
          {keys.includes("title") && (
            <TextInput
              label="Title"
              value={object.content.title ?? ""}
              onChange={(value) => onContentChange("title", value)}
              meterKey="title"
              warning={titleIssue ? `${titleIssue.length}/${titleIssue.limit} - over the recommended length.` : null}
            />
          )}
          {keys.includes("body") && (
            <TextArea
              label="Body"
              value={object.content.body ?? ""}
              onChange={(value) => onContentChange("body", value)}
              meterKey="body"
              warning={bodyIssue ? `${bodyIssue.length}/${bodyIssue.limit} - over the recommended length.` : null}
            />
          )}
        </FieldGroup>
      )}

      {(keys.includes("priceLabel") || keys.includes("durationLabel")) && (
        <FieldGroup label="Offer details">
          {keys.includes("priceLabel") && (
            <TextInput
              label="Price label"
              value={object.content.priceLabel ?? ""}
              onChange={(value) => onContentChange("priceLabel", value)}
              meterKey="priceLabel"
              warning={priceIssue ? `${priceIssue.length}/${priceIssue.limit} - over the recommended length.` : null}
            />
          )}
          {keys.includes("durationLabel") && (
            <TextInput
              label="Duration label"
              value={object.content.durationLabel ?? ""}
              onChange={(value) => onContentChange("durationLabel", value)}
              meterKey="durationLabel"
              warning={durationIssue ? `${durationIssue.length}/${durationIssue.limit} - over the recommended length.` : null}
            />
          )}
        </FieldGroup>
      )}

      {(keys.includes("quote") || keys.includes("attribution") || keys.includes("source")) && (
        <FieldGroup label="Trust / proof">
          {keys.includes("quote") && (
            <TextArea
              label="Quote"
              value={object.content.quote ?? ""}
              onChange={(value) => onContentChange("quote", value)}
              meterKey="quote"
              warning={quoteIssue ? `${quoteIssue.length}/${quoteIssue.limit} - over the recommended length.` : null}
            />
          )}
          {keys.includes("attribution") && (
            <TextInput
              label="Attribution"
              value={object.content.attribution ?? ""}
              onChange={(value) => onContentChange("attribution", value)}
              meterKey="attribution"
              warning={attributionIssue ? `${attributionIssue.length}/${attributionIssue.limit} - over the recommended length.` : null}
            />
          )}
          {keys.includes("source") && (
            <TextInput
              label="Source"
              value={object.content.source ?? ""}
              onChange={(value) => onContentChange("source", value)}
              meterKey="source"
              warning={sourceIssue ? `${sourceIssue.length}/${sourceIssue.limit} - over the recommended length.` : null}
            />
          )}
        </FieldGroup>
      )}

      {(keys.includes("issuer") || keys.includes("detail")) && (
        <FieldGroup label="Credential">
          {keys.includes("issuer") && (
            <TextInput
              label="Issuer"
              value={object.content.issuer ?? ""}
              onChange={(value) => onContentChange("issuer", value)}
              meterKey="issuer"
              warning={issuerIssue ? `${issuerIssue.length}/${issuerIssue.limit} - over the recommended length.` : null}
            />
          )}
          {keys.includes("detail") && (
            <TextArea
              label="Detail"
              value={object.content.detail ?? ""}
              onChange={(value) => onContentChange("detail", value)}
              meterKey="detail"
              warning={detailIssue ? `${detailIssue.length}/${detailIssue.limit} - over the recommended length.` : null}
            />
          )}
        </FieldGroup>
      )}

      {(keys.includes("url") || keys.includes("linkType")) && (
        <FieldGroup label="Public link">
          {keys.includes("url") && (
            <>
              <TextInput
                label="Public URL"
                value={object.content.url ?? ""}
                onChange={(value) => onContentChange("url", value)}
                meterKey="url"
                warning={urlIssue}
              />
            </>
          )}
          {keys.includes("linkType") && (
            <TextInput
              label="Link type"
              value={object.content.linkType ?? ""}
              onChange={(value) => onContentChange("linkType", value)}
              meterKey="linkType"
              warning={linkTypeIssue ? `${linkTypeIssue.length}/${linkTypeIssue.limit} - over the recommended length.` : null}
            />
          )}
        </FieldGroup>
      )}

      {actionEditable && (
        <FieldGroup label={object.type === "cta" ? "Primary call to action" : "Action"}>
          <TextInput
            label="Action label"
            value={object.content.action?.label ?? object.content.title ?? object.label}
            onChange={(value) => onActionChange("label", value)}
            meterKey="actionLabel"
            warning={actionLabelIssue ? `${actionLabelIssue.length}/${actionLabelIssue.limit} - over the recommended length.` : null}
          />
          {object.type === "cta" ? (
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">CTA target chamber</span>
              <select
                value={(object.content.action?.href ?? `#${chamber.id}`).replace(/^#/, "")}
                onChange={(event) => onCtaTargetChange(event.target.value)}
                className="ps-input"
              >
                {chambers.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.title}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <TextInput
              label="Public link URL"
              value={href}
              onChange={(value) => onActionChange("href", value)}
              warning={hrefWarning}
            />
          )}
          {hrefWarning && <p className="text-xs font-semibold text-red-200">{hrefWarning}</p>}
        </FieldGroup>
      )}
    </section>
  );
}

function StudioGuidePanel({
  guide,
  expanded,
  onToggleExpanded,
  onNavigate,
}: {
  guide: ReturnType<typeof analyzeStudioGuide> | null;
  expanded: boolean;
  onToggleExpanded: () => void;
  onNavigate: (issue: StudioGuideIssue) => void;
}) {
  if (!guide) return null;
  const total = guide.urgentCount + guide.advisoryCount + guide.polishCount;
  const allClear = total === 0;

  return (
    <section data-testid="studio-room-guide-panel" className="ps-panel ps-guide-panel" aria-label="Studio Guide">
      <button
        type="button"
        onClick={onToggleExpanded}
        className="ps-guide-header"
        aria-expanded={expanded}
      >
        <span className="ps-guide-title">
          <Wand2 className="h-4 w-4" />
          Studio Guide
        </span>
        {allClear ? (
          <span className="ps-guide-badge ps-guide-badge-clear">
            <CheckCircle2 className="h-3.5 w-3.5" />
            All clear
          </span>
        ) : (
          <span className="ps-guide-badges">
            {guide.urgentCount > 0 && (
              <span className="ps-guide-badge ps-guide-badge-urgent">{guide.urgentCount} urgent</span>
            )}
            {guide.advisoryCount > 0 && (
              <span className="ps-guide-badge ps-guide-badge-advisory">{guide.advisoryCount} advisory</span>
            )}
            {guide.polishCount > 0 && (
              <span className="ps-guide-badge ps-guide-badge-polish">{guide.polishCount} polish</span>
            )}
          </span>
        )}
        <ChevronDown
          className="h-4 w-4 text-[var(--p-studio-muted)] transition-transform"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {expanded && (
        <div className="ps-guide-body">
          {allClear ? (
            <div className="ps-guide-empty">
              <Sparkles className="h-5 w-5 text-emerald-300" />
              <p className="text-sm font-semibold text-emerald-200">This room looks complete.</p>
              <p className="text-xs text-[var(--p-studio-muted)]">
                No urgent or advisory issues found. You can still refine copy and visuals.
              </p>
            </div>
          ) : (
            <div className="ps-guide-list">
              {guide.issues.map((issue, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => onNavigate(issue)}
                  className={`ps-guide-item ps-guide-item-${issue.priority}`}
                >
                  <span className="ps-guide-priority">
                    {issue.priority === "urgent" && <AlertTriangle className="h-3.5 w-3.5" />}
                    {issue.priority === "advisory" && <Lightbulb className="h-3.5 w-3.5" />}
                    {issue.priority === "polish" && <Sparkles className="h-3.5 w-3.5" />}
                    <span className="ps-guide-priority-label">{issue.priority}</span>
                  </span>
                  <span className="ps-guide-category">{issue.category}</span>
                  <span className="ps-guide-issue">{issue.issue}</span>
                  <span className="ps-guide-why">{issue.why}</span>
                  <span className="ps-guide-action">
                    <span>Action:</span> {issue.action}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  testId,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      className="ps-action-button"
    >
      {icon}
      {label}
    </button>
  );
}

function FieldGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset className="ps-field-group">
      <legend>
        {label}
      </legend>
      {children}
    </fieldset>
  );
}

function TextInput({
  label,
  value,
  onChange,
  warning,
  meterKey,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  warning?: string | null;
  meterKey?: FieldLimitKey;
}) {
  const meter = meterKey ? fieldMeter(meterKey, value) : null;
  return (
    <label className="ps-field">
      <span className="font-semibold">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="ps-input"
      />
      {meter && <FieldMeter meter={meter} />}
      {warning && <span className="text-xs font-semibold text-amber-200">{warning}</span>}
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  warning,
  meterKey,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  warning?: string | null;
  meterKey?: FieldLimitKey;
}) {
  const meter = meterKey ? fieldMeter(meterKey, value) : null;
  return (
    <label className="ps-field">
      <span className="font-semibold">{label}</span>
      <textarea
        value={value}
        rows={4}
        onChange={(event) => onChange(event.target.value)}
        className="ps-input ps-textarea"
      />
      {meter && <FieldMeter meter={meter} />}
      {warning && <span className="text-xs font-semibold text-amber-200">{warning}</span>}
    </label>
  );
}

function FieldMeter({ meter }: { meter: ReturnType<typeof fieldMeter> }) {
  return (
    <span className="ps-field-meter" data-over={meter.over ? "true" : "false"}>
      <span><span style={{ width: `${meter.pct}%` }} /></span>
      <small>{meter.length}/{meter.limit}</small>
    </span>
  );
}

function fieldMeter(field: FieldLimitKey, value: string | undefined | null) {
  const limit = FIELD_LENGTH_LIMITS[field];
  const length = (value ?? "").length;
  return {
    length,
    limit,
    over: length > limit,
    pct: Math.min(100, Math.round((length / limit) * 100)),
  };
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--p-studio-border)] bg-black/5 p-3">
      <p className="text-[0.68rem] font-semibold uppercase text-[var(--p-studio-muted)]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold">{value}</p>
    </div>
  );
}

const STUDIO_ROOM_OWNER_EDITOR_CSS = `
.ps-cockpit {
  --ps-bg: #141009;
  --ps-panel: rgba(34, 28, 21, 0.74);
  --ps-panel-solid: #211b14;
  --ps-elev: rgba(48, 40, 31, 0.82);
  --ps-border: rgba(255, 244, 230, 0.11);
  --ps-border-strong: rgba(255, 244, 230, 0.2);
  --ps-text: #f5efe6;
  --ps-muted: #b3a899;
  --ps-faint: #8a8073;
  --ps-input: rgba(0,0,0,0.28);
  position: relative;
  isolation: isolate;
  min-height: 100dvh;
  overflow-x: hidden;
  padding: clamp(14px, 2vw, 26px);
  padding-bottom: calc(92px + env(safe-area-inset-bottom));
  color: var(--ps-text);
  background: var(--ps-bg);
}
.ps-cockpit[data-chrome="daylight"] {
  --ps-bg: #efe9df;
  --ps-panel: rgba(255, 253, 249, 0.8);
  --ps-panel-solid: #fffdf9;
  --ps-elev: rgba(255, 255, 255, 0.9);
  --ps-border: rgba(28, 20, 10, 0.1);
  --ps-border-strong: rgba(28, 20, 10, 0.18);
  --ps-text: #221b12;
  --ps-muted: #6c6256;
  --ps-faint: #948b7e;
  --ps-input: rgba(255,255,255,0.72);
}
.ps-aurora {
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}
.ps-aurora span {
  position: absolute;
  border-radius: 999px;
  filter: blur(72px);
  opacity: 0.42;
  animation: psDrift 26s ease-in-out infinite alternate;
}
.ps-aurora span:nth-child(1) { width: 42vw; height: 42vw; left: -10vw; top: -12vw; background: var(--ps-mesh-a); }
.ps-aurora span:nth-child(2) { width: 38vw; height: 38vw; right: -8vw; top: 10vh; background: var(--ps-mesh-b); animation-delay: -8s; }
.ps-aurora span:nth-child(3) { width: 34vw; height: 34vw; left: 30vw; bottom: -16vw; background: var(--ps-mesh-c); animation-delay: -16s; }
@keyframes psDrift {
  from { transform: translate3d(0,0,0) scale(1); }
  to { transform: translate3d(3vw,2vh,0) scale(1.08); }
}
.ps-cockpit button,
.ps-cockpit select,
.ps-cockpit input,
.ps-cockpit textarea {
  font: inherit;
}
.ps-cockpit button {
  min-height: 44px;
}
.ps-topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin: -8px -4px 16px;
  padding: 12px;
  border: 1px solid var(--ps-border);
  border-radius: 22px;
  background: color-mix(in srgb, var(--ps-bg) 78%, transparent);
  backdrop-filter: blur(18px) saturate(1.18);
  box-shadow: 0 28px 80px -54px rgba(0,0,0,0.7);
}
.ps-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: min(28rem, 100%);
}
.ps-logo {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  flex: none;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--ps-accent), color-mix(in srgb, var(--ps-glow) 62%, #000));
  color: #fff;
  font-weight: 800;
  box-shadow: 0 12px 24px -12px var(--ps-glow), inset 0 1px 0 rgba(255,255,255,0.35);
}
.ps-crumb {
  display: flex;
  gap: 6px;
  color: var(--ps-faint);
  font-size: 0.72rem;
  font-weight: 650;
}
.ps-brand h1 {
  margin: 2px 0 0;
  overflow: hidden;
  color: var(--ps-text);
  font-size: 1rem;
  font-weight: 760;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ps-private-pill,
.ps-role-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  width: fit-content;
  border: 1px solid color-mix(in srgb, var(--ps-glow) 34%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--ps-glow) 14%, transparent);
  color: var(--ps-text);
  padding: 6px 11px;
  font-size: 0.72rem;
  font-weight: 750;
}
.ps-top-spacer { flex: 1; }
.ps-save-state {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--ps-muted);
  font-size: 0.78rem;
  font-weight: 650;
}
.ps-save-state[data-dirty="true"] { color: var(--ps-glow); }
.ps-pulse {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: currentColor;
}
.ps-save-state[data-dirty="true"] .ps-pulse { animation: psPulse 1.7s ease-in-out infinite; }
@keyframes psPulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--ps-glow) 54%, transparent); }
  50% { box-shadow: 0 0 0 7px transparent; }
}
.ps-viewport-toggle {
  display: inline-flex;
  gap: 3px;
  padding: 3px;
  border: 1px solid var(--ps-border);
  border-radius: 14px;
  background: var(--ps-input);
}
.ps-viewport-toggle button,
.ps-icon-button,
.ps-secondary-button,
.ps-primary-button,
.ps-tweaks summary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid var(--ps-border-strong);
  border-radius: 13px;
  background: var(--ps-panel);
  color: var(--ps-text);
  padding: 9px 13px;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
}
.ps-viewport-toggle button {
  width: 38px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ps-muted);
}
.ps-viewport-toggle button[data-on="true"] {
  background: var(--ps-glow);
  color: #fff;
  box-shadow: 0 8px 18px -9px var(--ps-glow);
}
.ps-primary-button {
  border-color: transparent;
  background: linear-gradient(135deg, var(--ps-accent), color-mix(in srgb, var(--ps-glow) 72%, #000));
  color: #fff;
  box-shadow: 0 14px 30px -14px var(--ps-glow);
}
.ps-primary-button:disabled,
.ps-secondary-button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}
.ps-safety-copy {
  flex: 1 1 42rem;
  min-width: 18rem;
}
.ps-info-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  min-width: min(26rem, 100%);
}
.ps-top-notices {
  display: flex;
  flex: 1 1 100%;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.ps-tweaks {
  position: relative;
}
.ps-tweaks summary {
  list-style: none;
}
.ps-tweaks summary::-webkit-details-marker { display: none; }
.ps-tweaks-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  z-index: 40;
  display: grid;
  gap: 10px;
  width: 260px;
  border: 1px solid var(--ps-border-strong);
  border-radius: 16px;
  background: var(--ps-panel-solid);
  padding: 12px;
  box-shadow: 0 24px 60px -28px rgba(0,0,0,0.72);
}
.ps-tweaks-menu label,
.ps-toggle-row {
  display: grid;
  gap: 6px;
  color: var(--ps-muted);
  font-size: 0.76rem;
  font-weight: 650;
}
.ps-toggle-row {
  grid-template-columns: auto 1fr;
  align-items: center;
}
.ps-tweaks-menu select,
.ps-tweaks-menu input[type="checkbox"] {
  accent-color: var(--ps-glow);
}
.ps-tweaks-menu select {
  min-height: 38px;
  border: 1px solid var(--ps-border);
  border-radius: 10px;
  background: var(--ps-input);
  color: var(--ps-text);
  padding: 6px 10px;
}
.ps-mobile-tabs {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 10px 14px calc(10px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--ps-border);
  background: color-mix(in srgb, var(--ps-bg) 86%, transparent);
  backdrop-filter: blur(18px);
}
.ps-mobile-tabs button {
  border: 1px solid var(--ps-border-strong);
  border-radius: 15px;
  background: var(--ps-input);
  color: var(--ps-text);
  font-weight: 750;
}
.ps-mobile-tabs button[data-on="true"] {
  border-color: transparent;
  background: var(--ps-glow);
  color: #fff;
}
.ps-mobile-rail {
  position: sticky;
  top: 76px;
  z-index: 20;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  margin: 0 -14px 12px;
  padding: 10px 14px;
  border-block: 1px solid var(--ps-border);
  background: color-mix(in srgb, var(--ps-bg) 78%, transparent);
  backdrop-filter: blur(14px);
  scrollbar-width: none;
}
.ps-mobile-rail::-webkit-scrollbar { display: none; }
.ps-mobile-rail button {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 8px;
  scroll-snap-align: center;
  border: 1px solid var(--ps-border);
  border-radius: 999px;
  background: var(--ps-input);
  color: var(--ps-muted);
  padding: 8px 13px;
  font-size: 0.78rem;
  font-weight: 700;
}
.ps-mobile-rail button[data-on="true"] {
  border-color: transparent;
  background: var(--ps-glow);
  color: #fff;
}
.ps-mobile-rail span {
  display: grid;
  width: 19px;
  height: 19px;
  place-items: center;
  border-radius: 999px;
  background: rgba(0,0,0,0.18);
  font-size: 0.66rem;
}
.ps-workbench {
  display: grid;
  grid-template-columns: 286px minmax(0, 1fr) 386px;
  gap: clamp(14px, 1.6vw, 22px);
  align-items: start;
}
.ps-panel,
.ps-stage-panel {
  border: 1px solid var(--ps-border);
  border-radius: 22px;
  background: var(--ps-panel);
  box-shadow: 0 30px 70px -50px rgba(0,0,0,0.72), inset 0 1px 0 color-mix(in srgb, white 12%, transparent);
  backdrop-filter: blur(18px) saturate(1.15);
}
.ps-stage-panel {
  display: grid;
  align-content: start;
  gap: 14px;
  padding: 14px;
}
.ps-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.ps-panel-head h2 {
  margin: 0;
  color: var(--ps-text);
  font-size: 1rem;
  font-weight: 760;
}
.ps-panel-head p,
.ps-spine-sub {
  margin: 4px 0 0;
  color: var(--ps-muted);
  font-size: 0.78rem;
  line-height: 1.5;
}
.ps-chamber-column,
.ps-inspector-column {
  position: sticky;
  top: 98px;
}
.ps-inspector {
  color: var(--ps-text);
}
.ps-inspector-card,
.ps-inspector-empty {
  padding: 16px;
}
.ps-breadcrumb {
  border: 1px solid var(--ps-border);
  border-radius: 16px;
  background: var(--ps-panel);
  color: var(--ps-muted);
  padding: 10px 13px;
  font-size: 0.7rem;
  font-weight: 760;
  text-transform: uppercase;
}
.ps-action-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 14px;
}
.ps-action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid var(--ps-border);
  border-radius: 12px;
  background: var(--ps-input);
  color: var(--ps-text);
  padding: 9px;
  font-size: 0.76rem;
  font-weight: 700;
}
.ps-action-button:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}
.ps-locked-note,
.ps-empty-note {
  margin-top: 12px;
  border: 1px dashed var(--ps-border-strong);
  border-radius: 14px;
  background: var(--ps-input);
  color: var(--ps-muted);
  padding: 11px 12px;
  font-size: 0.76rem;
  line-height: 1.55;
}
.ps-field-group {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}
.ps-field-group legend {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  color: var(--ps-faint);
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
}
.ps-field-group legend::after {
  content: "";
  height: 1px;
  flex: 1;
  background: var(--ps-border);
}
.ps-field {
  display: grid;
  gap: 7px;
  color: var(--ps-text);
  font-size: 0.86rem;
}
.ps-input {
  width: 100%;
  min-height: 44px;
  border: 1px solid var(--ps-border);
  border-radius: 12px;
  background: var(--ps-input);
  color: var(--ps-text);
  padding: 10px 12px;
  outline: none;
}
.ps-textarea {
  min-height: 96px;
  resize: vertical;
  line-height: 1.55;
}
.ps-input:focus {
  border-color: var(--ps-glow);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ps-glow) 22%, transparent);
}
.ps-field-meter {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ps-faint);
  font-size: 0.68rem;
}
.ps-field-meter > span {
  height: 4px;
  flex: 1;
  overflow: hidden;
  border-radius: 999px;
  background: var(--ps-border);
}
.ps-field-meter > span > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--ps-glow);
}
.ps-field-meter[data-over="true"] > span > span {
  background: #f97316;
}
.ps-guide-panel {
  padding: 0;
  overflow: hidden;
}
.ps-guide-header {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 14px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--ps-text);
  font-size: 0.86rem;
  font-weight: 760;
  cursor: pointer;
}
.ps-guide-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.ps-guide-badges {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}
.ps-guide-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: 999px;
  padding: 3px 9px;
  font-size: 0.68rem;
  font-weight: 750;
}
.ps-guide-badge-urgent {
  background: rgba(239, 68, 68, 0.18);
  color: #fca5a5;
}
.ps-guide-badge-advisory {
  background: rgba(251, 146, 60, 0.16);
  color: #fdba74;
}
.ps-guide-badge-polish {
  background: rgba(148, 163, 184, 0.16);
  color: #cbd5e1;
}
.ps-guide-badge-clear {
  background: rgba(52, 211, 153, 0.16);
  color: #6ee7b7;
}
.ps-guide-body {
  border-top: 1px solid var(--ps-border);
  padding: 10px 12px 12px;
}
.ps-guide-empty {
  display: grid;
  place-items: center;
  gap: 6px;
  padding: 14px 8px;
  text-align: center;
}
.ps-guide-list {
  display: grid;
  gap: 8px;
  max-height: 420px;
  overflow-y: auto;
}
.ps-guide-item {
  display: grid;
  gap: 5px;
  text-align: left;
  border: 1px solid var(--ps-border);
  border-radius: 14px;
  background: var(--ps-input);
  padding: 11px 12px;
  color: var(--ps-text);
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.ps-guide-item:hover {
  border-color: var(--ps-glow);
  background: color-mix(in srgb, var(--ps-glow) 8%, var(--ps-input));
}
.ps-guide-item-urgent {
  border-left: 3px solid #ef4444;
}
.ps-guide-item-advisory {
  border-left: 3px solid #fb923c;
}
.ps-guide-item-polish {
  border-left: 3px solid #94a3b8;
}
.ps-guide-priority {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.66rem;
  font-weight: 750;
  text-transform: uppercase;
}
.ps-guide-item-urgent .ps-guide-priority { color: #fca5a5; }
.ps-guide-item-advisory .ps-guide-priority { color: #fdba74; }
.ps-guide-item-polish .ps-guide-priority { color: #cbd5e1; }
.ps-guide-category {
  font-size: 0.62rem;
  font-weight: 750;
  text-transform: uppercase;
  color: var(--ps-faint);
}
.ps-guide-issue {
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.35;
}
.ps-guide-why {
  font-size: 0.76rem;
  line-height: 1.45;
  color: var(--ps-muted);
}
.ps-guide-action {
  font-size: 0.76rem;
  line-height: 1.45;
  color: var(--ps-muted);
}
.ps-guide-action span {
  font-weight: 700;
  color: var(--ps-text);
}
@media (min-width: 1280px) {
  .ps-mobile-tabs,
  .ps-mobile-rail {
    display: none;
  }
  .ps-cockpit {
    padding-bottom: 26px;
  }
}
@media (max-width: 1279px) {
  .ps-topbar {
    position: relative;
    top: auto;
  }
  .ps-workbench {
    display: block;
  }
  .ps-chamber-column {
    display: none;
  }
  .ps-stage-panel,
  .ps-inspector-column {
    margin-top: 12px;
  }
  .ps-mobile-hidden {
    display: none !important;
  }
  .ps-info-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    width: 100%;
  }
}
@media (max-width: 760px) {
  .ps-cockpit {
    padding-inline: 14px;
  }
  .ps-brand {
    min-width: 0;
    flex: 1 1 100%;
  }
  .ps-private-pill,
  .ps-save-state,
  .ps-topbar > .ps-viewport-toggle,
  .ps-icon-button,
  .ps-tweaks {
    display: none;
  }
  .ps-info-grid {
    grid-template-columns: 1fr;
  }
  .ps-safety-copy {
    min-width: 0;
  }
  .ps-stage-panel {
    margin-inline: -6px;
    border-radius: 20px;
    padding: 10px;
  }
  .ps-panel-head {
    align-items: center;
  }
}
@media (prefers-reduced-motion: reduce) {
  .ps-aurora span,
  .ps-save-state[data-dirty="true"] .ps-pulse {
    animation: none;
  }
}
`;

function studioEditorChromeStyle(templateKitId: string | undefined, accent: string): CSSProperties {
  const token = STUDIO_EDITOR_CHROME_TOKENS[templateKitId ?? ""] ?? STUDIO_EDITOR_CHROME_TOKENS.default;
  return {
    "--ps-accent": accent,
    "--ps-glow": token.glow,
    "--ps-mesh-a": token.mesh[0],
    "--ps-mesh-b": token.mesh[1],
    "--ps-mesh-c": token.mesh[2],
  } as CSSProperties;
}

const STUDIO_EDITOR_CHROME_TOKENS: Record<string, { glow: string; mesh: [string, string, string] }> = {
  default: { glow: "#fb923c", mesh: ["#fb923c", "#7c3aed", "#0ea5e9"] },
  "gallery-artist": { glow: "#b78c4e", mesh: ["#e6d4ad", "#f3e8cf", "#d8c39a"] },
  "cultural-community-artist": { glow: "#b9542f", mesh: ["#d8b48f", "#c98a5c", "#e7d3b6"] },
  "material-tradie-proof-card": { glow: "#c4622a", mesh: ["#d99a5c", "#caa06a", "#b9794a"] },
  "healing-practitioner": { glow: "#6f9a6c", mesh: ["#bcd3ad", "#d6e3c4", "#a7c79f"] },
  "consultant-contractor": { glow: "#2f6df0", mesh: ["#c9d2e0", "#dfe3ea", "#b7c2d6"] },
};

function cloneRoom(room: Room): Room {
  return JSON.parse(JSON.stringify(room)) as Room;
}

function snapshot(draft: PersistedStudioRoomDraftPayload): string {
  return JSON.stringify(draft);
}

function saveErrorMessage(err: unknown): string {
  if (err instanceof PresenceApiError) {
    if (err.status === 401) return "Sign in again to save this draft.";
    if (err.status === 403) return "You do not have access to save this draft.";
    if (err.status === 422) return "That edit is outside the safe draft field scope.";
  }
  return "Draft save failed.";
}
