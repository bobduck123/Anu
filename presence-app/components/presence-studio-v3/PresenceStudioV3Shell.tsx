"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PresenceStudioV2PublicRoom from "@/components/presence-studio-v2/PresenceStudioV2PublicRoom";
import { Loading } from "@/components/ui";
import { getPresenceEditor, uploadStudioV3PrivateAsset } from "@/lib/api/editor";
import { PresenceApiError } from "@/lib/api/client";
import { listCollections, listWorks } from "@/lib/api/owner";
import {
  STUDIO_V3_PRIVATE_METADATA_SCHEMA_VERSION,
  getStudioV3PrivateState,
  replaceStudioV3PrivateState,
  type StudioV3PrivateState,
} from "@/lib/api/studioV3";
import type { PresenceEditableConfig, PresenceEditorAsset, PresenceEditorOverview, PresenceNode } from "@/lib/api/types";
import {
  DEFAULT_STUDIO_V2_TRANSFORM,
  studioV2FromPresenceConfig,
  studioV2Layout,
  type StudioV2PlacementSize,
  type StudioV2PlacementTreatment,
} from "@/lib/presence/studio-v2";
import { validateMediaUploadFile } from "@/lib/editor/mediaValidation";
import { createClient } from "@/lib/supabase/client";
import {
  STUDIO_V3_BROWSER_PILOT_FLAG,
  STUDIO_V3_SOFT_EDITORIAL_LOOK,
  applyStudioV3Look,
  compileStudioV3Document,
  containsForbiddenLocalValue,
  containsForbiddenStudioV3Text,
  createStudioV3BaseSnapshot,
  deriveStudioV3OwnerPartitionKey,
  findStudioV3Piece,
  findStudioV3ObjectContext,
  hydrateStudioV3Document,
  applyStudioV3LayerOverride,
  isStudioV3RequiredCta,
  lockStudioV3Layer,
  moveStudioV3ObjectToZone,
  placeStudioV3Collection,
  placeStudioV3Piece,
  reorderStudioV3Object,
  replaceStudioV3ObjectMedia,
  setStudioV3ObjectSize,
  setStudioV3ObjectTreatment,
  setStudioV3ObjectVisibility,
  toggleStudioV3ObjectFeatured,
  unplaceStudioV3Object,
  updateStudioV3ObjectCopy,
  upsertStudioV3MediaAsset,
  clearStudioV3LocalStateForOwnerPartition,
  clearStudioV3LocalStateForPresence,
  pruneStudioV3LocalEnvelopesForOwnerSwitch,
  readStudioV3LocalSnapshot,
  saveStudioV3NamedLook,
  writeStudioV3LocalSnapshot,
  validateStudioV2EditorBridgeResult,
  type PresenceStudioV2EditorBridge,
  type PresenceStudioV2EditorIntent,
  type PresenceStudioV2EditorResult,
  type StudioV3CollectionSourceRef,
  type StudioV3Document,
  type StudioV3Layer,
  type StudioV3LayerOverrideValue,
  type StudioV3LookValues,
  type StudioV3ModePreference,
  type StudioV3SourceRef,
} from "@/lib/presence/studio-v3";
import {
  applyStudioV3StructuralStage,
  cancelStudioV3StructuralStage,
  hasStudioV3ServerRevision,
  isSafeStudioV3MetadataEnvelope,
  isStudioV3ObjectEffectivelyHidden,
  projectStudioV3Metadata,
  restoreStudioV3Metadata,
  restoreStudioV3Savepoint,
  stageStudioV3RoomStyle,
} from "@/lib/presence/studio-v3/p1State";
import StudioV3Home from "./StudioV3Home";
import StudioV3ArrangeControls from "./StudioV3ArrangeControls";
import StudioV3LookControls, {
  studioV3RoomStyleName,
  type StudioV3CompareSide,
  type StudioV3CompatibilitySummary,
  type StudioV3P1LookId,
  type StudioV3P1RoomStyleId,
} from "./StudioV3LookControls";
import StudioV3PieceControls, { type StudioV3MediaChoice } from "./StudioV3PieceControls";
import StudioV3PieceShelf from "./StudioV3PieceShelf";
import StudioV3SaveStatus, { type StudioV3SavePhase } from "./StudioV3SaveStatus";
import "./presence-studio-v3.css";

type SheetMode = "closed" | "piece" | "arrange" | "shelf" | "look" | "review";
type StudioV3ReadyStructuralStage = ReturnType<typeof stageStudioV3RoomStyle> & {
  status: "ready";
  stagedDocument: StudioV3Document;
  impact: {
    accounting: Array<Record<string, unknown>>;
    preservedByLock?: string[];
    preservedByOverride?: string[];
  };
};
interface StudioV3StructuralPreviewState {
  stage: StudioV3ReadyStructuralStage;
  targetStyleId: StudioV3P1RoomStyleId;
  targetStyleName: string;
  compareSide: StudioV3CompareSide;
  summary: StudioV3CompatibilitySummary;
}
const STUDIO_V3_MEMORY_ONLY_SESSION_KEY = "presence-studio-v3:memory-only";
const STUDIO_V3_DURABLE_BASE_MISMATCH_MESSAGE =
  "Existing durable state is preserved, but it belongs to a different Studio base. Private-state save is disabled until a reviewed rebase or clear is available.";
const STUDIO_V3_INCOMPLETE_RESTORE_MESSAGE =
  "Saved private state contains canonical references that are unavailable in this load. Durable save is locked to preserve them. Restore the missing Library item, then reload latest.";
const STUDIO_V3_UPLOAD_DISABLED_MESSAGE =
  "Private, draft-safe upload is unavailable until protected draft media is verified. Visitor site unchanged.";

interface StudioV3SaveFeedback {
  phase: StudioV3SavePhase;
  message: string;
}

export default function PresenceStudioV3Shell({
  node,
  nodeId,
  token,
  authenticatedSubject,
}: {
  node: PresenceNode;
  nodeId: number;
  token: string;
  authenticatedSubject: string;
}) {
  const [overview, setOverview] = useState<PresenceEditorOverview | null>(null);
  const [document, setDocument] = useState<StudioV3Document | null>(null);
  const [baseConfig, setBaseConfig] = useState<PresenceEditableConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [homeOpen, setHomeOpen] = useState(true);
  const [sheetMode, setSheetMode] = useState<SheetMode>("closed");
  const [testAsVisitor, setTestAsVisitor] = useState(false);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState("Saved locally");
  const [ownerPartitionKey, setOwnerPartitionKey] = useState<string | null>(null);
  const [namedLookName, setNamedLookName] = useState("P0 Soft Editorial");
  const [structuralPreview, setStructuralPreview] = useState<StudioV3StructuralPreviewState | null>(null);
  const [privateStateRevision, setPrivateStateRevision] = useState(0);
  const [privateStateAvailable, setPrivateStateAvailable] = useState(false);
  const [privateStateSaving, setPrivateStateSaving] = useState(false);
  const [privateStateBaseMismatch, setPrivateStateBaseMismatch] = useState(false);
  const [savedMetadataSignature, setSavedMetadataSignature] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<StudioV3SaveFeedback>({
    phase: "disabled",
    message: "Checking durable private-state support.",
  });
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [discardingLocal, setDiscardingLocal] = useState(false);
  const [arrangeError, setArrangeError] = useState<string | null>(null);
  const sheetRef = useRef<HTMLElement | null>(null);
  const sheetCloseRef = useRef<HTMLButtonElement | null>(null);
  const shelfTriggerRef = useRef<HTMLButtonElement | null>(null);
  const visitorTriggerRef = useRef<HTMLButtonElement | null>(null);
  const visitorExitRef = useRef<HTMLButtonElement | null>(null);
  const visitorReturnFocusRef = useRef<HTMLElement | null>(null);
  const visitorWasActiveRef = useRef(false);
  const authenticatedSubjectRef = useRef<string | null>(authenticatedSubject);
  const pendingOwnerSubjectRef = useRef<string | null>(authenticatedSubject);
  const ownerPartitionKeyRef = useRef<string | null>(null);
  const lastKnownOwnerPartitionRef = useRef<string | null>(null);
  const loadEpochRef = useRef(0);
  const uploadRequestRef = useRef(0);
  const uploadInFlightRef = useRef(false);
  const privateStateSaveInFlightRef = useRef(false);
  const discardInFlightRef = useRef(false);
  const localWriteFenceRef = useRef(0);
  const localPersistenceDisabledRef = useRef(false);
  const sheetBaselineRef = useRef<StudioV3Document | null>(null);
  const sheetSessionRef = useRef(0);
  const structuralPreviewRef = useRef<StudioV3StructuralPreviewState | null>(null);

  useEffect(() => {
    structuralPreviewRef.current = structuralPreview;
  }, [structuralPreview]);

  useEffect(() => {
    if (testAsVisitor) {
      visitorWasActiveRef.current = true;
      visitorExitRef.current?.focus();
      return;
    }
    if (!visitorWasActiveRef.current) return;
    visitorWasActiveRef.current = false;
    const returnTarget = visitorReturnFocusRef.current;
    if (returnTarget?.isConnected) returnTarget.focus();
    else visitorTriggerRef.current?.focus();
    visitorReturnFocusRef.current = null;
  }, [testAsVisitor]);

  useEffect(() => {
    if (sheetMode === "closed") return;
    const domDocument = globalThis.document;
    const opener = domDocument.activeElement instanceof HTMLElement ? domDocument.activeElement : null;
    const sheet = sheetRef.current;
    sheetCloseRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        sheetSessionRef.current += 1;
        if ((sheetMode === "piece" || sheetMode === "arrange") && sheetBaselineRef.current) {
          const baseline = structuredClone(sheetBaselineRef.current);
          setDocument((current) => ({
            ...baseline,
            mediaAssets: { ...baseline.mediaAssets, ...(current?.mediaAssets ?? {}) },
          }));
          setLastAction(sheetMode === "arrange"
            ? "Arrange cancelled · exact prior state restored"
            : "Piece changes cancelled");
          sheetBaselineRef.current = null;
          setArrangeError(null);
        } else if (sheetMode === "look" && structuralPreviewRef.current) {
          const cancelled = cancelStudioV3StructuralStage(structuralPreviewRef.current.stage);
          setDocument((current) => ({
            ...cancelled.document,
            mediaAssets: { ...cancelled.document.mediaAssets, ...(current?.mediaAssets ?? {}) },
          }));
          setStructuralPreview(null);
          setLastAction(cancelled.report.status === "exact"
            ? "Preview cancelled · exact prior structure restored"
            : "Preview cancelled · prior structure restored with warnings");
        }
        setSheetMode("closed");
        return;
      }
      if (event.key !== "Tab" || !sheet) return;
      const focusable = Array.from(sheet.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((item) => item.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && domDocument.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && domDocument.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    sheet?.addEventListener("keydown", onKeyDown);
    return () => {
      sheet?.removeEventListener("keydown", onKeyDown);
      if (opener && domDocument.contains(opener)) {
        opener.focus();
      } else {
        shelfTriggerRef.current?.focus();
      }
    };
  }, [sheetMode]);

  useEffect(() => {
    let alive = true;
    const supabase = createClient();
    try {
      localPersistenceDisabledRef.current = window.sessionStorage.getItem(STUDIO_V3_MEMORY_ONLY_SESSION_KEY) === "1";
    } catch {
      localPersistenceDisabledRef.current = true;
    }
    const disableLocalPersistence = () => {
      localPersistenceDisabledRef.current = true;
      try {
        window.sessionStorage.setItem(STUDIO_V3_MEMORY_ONLY_SESSION_KEY, "1");
      } catch {
        // The in-memory flag still prevents an unsafe local restore in this shell.
      }
      ownerPartitionKeyRef.current = null;
      setOwnerPartitionKey(null);
      setLastAction("Memory-only local state");
    };
    const clearPreviousPartition = async () => {
      let previousPartition = lastKnownOwnerPartitionRef.current;
      if (!previousPartition && pendingOwnerSubjectRef.current) {
        const partition = await deriveStudioV3OwnerPartitionKey({
          deploymentScope: window.location.host || "local",
          validatedOwnerSubject: pendingOwnerSubjectRef.current,
        });
        previousPartition = partition.key;
      }
      if (!previousPartition || !navigator.locks?.request) return false;
      try {
        await navigator.locks.request(studioV3OwnerLockName(previousPartition), { mode: "exclusive" }, () => {
          clearStudioV3LocalStateForOwnerPartition({ storage: window.localStorage, ownerPartitionKey: previousPartition });
        });
        lastKnownOwnerPartitionRef.current = null;
        pendingOwnerSubjectRef.current = null;
        return true;
      } catch {
        disableLocalPersistence();
        return false;
      }
    };
    const handleAuthState = (event: string, session: { user?: { id?: string } } | null) => {
      void handleAuthStateChange(event, session);
    };
    const handleAuthStateChange = async (event: string, session: { user?: { id?: string } } | null) => {
      const nextSubject = typeof session?.user?.id === "string" && session.user.id.trim() ? session.user.id.trim() : null;
      const previousSubject = authenticatedSubjectRef.current;
      const sessionChanged = event === "INITIAL_SESSION"
        ? previousSubject !== nextSubject
        : event === "SIGNED_OUT" || previousSubject !== nextSubject;
      if (!sessionChanged) {
        authenticatedSubjectRef.current = nextSubject;
        pendingOwnerSubjectRef.current = nextSubject;
        return;
      }
      loadEpochRef.current += 1;
      ownerPartitionKeyRef.current = null;
      setOwnerPartitionKey(null);
      authenticatedSubjectRef.current = nextSubject;
      setDocument(null);
      setBaseConfig(null);
      setOverview(null);
      setSelectedPieceId(null);
      setTestAsVisitor(false);
      setStructuralPreview(null);
      setPrivateStateRevision(0);
      setPrivateStateAvailable(false);
      setPrivateStateBaseMismatch(false);
      const cleanupConfirmed = await clearPreviousPartition();
      if (!nextSubject) {
        if (!cleanupConfirmed) disableLocalPersistence();
        setError("Sign in required.");
        setLoading(false);
        return;
      }
      if (!cleanupConfirmed) disableLocalPersistence();
      window.location.reload();
    };
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (alive) handleAuthState("INITIAL_SESSION", session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthState);
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const loadEpoch = ++loadEpochRef.current;
    const isCurrentLoad = () => alive && loadEpochRef.current === loadEpoch;
    async function load() {
      uploadRequestRef.current += 1;
      uploadInFlightRef.current = false;
      discardInFlightRef.current = false;
      setLoading(true);
      setError(null);
      setUploadBusy(false);
      setDiscardingLocal(false);
      privateStateSaveInFlightRef.current = false;
      setPrivateStateSaving(false);
      setPrivateStateBaseMismatch(false);
      try {
        const [nextOverview, privateStateRead, libraryRead] = await Promise.all([
          getPresenceEditor(nodeId, token),
          getStudioV3PrivateState(nodeId, token)
            .then((response) => ({ available: true, state: response.state, error: null as string | null }))
            .catch((readError: unknown) => ({
              available: false,
              state: null as StudioV3PrivateState | null,
              error: readError instanceof Error ? readError.message : "Durable private state is unavailable.",
            })),
          Promise.allSettled([listWorks(nodeId, token), listCollections(nodeId, token)])
            .then(([worksRead, collectionsRead]) => {
              const errors = [worksRead, collectionsRead]
                .filter((result) => result.status === "rejected")
                .map((result) => result.status === "rejected" && result.reason instanceof Error
                  ? result.reason.message
                  : "A canonical Library source could not be loaded.");
              return {
                works: worksRead.status === "fulfilled" ? worksRead.value : node.works ?? node.gallery_items ?? [],
                collections: collectionsRead.status === "fulfilled" ? collectionsRead.value : node.collections ?? [],
                complete: worksRead.status === "fulfilled" && collectionsRead.status === "fulfilled",
                error: errors.length
                  ? `The complete owner Library could not be loaded. ${errors.join(" ")} Durable private save is disabled to preserve canonical references.`
                  : null,
              };
            }),
        ]);
        if (!isCurrentLoad()) return;
        const selectedConfig = nextOverview.draft ?? nextOverview.published;
        if (!selectedConfig) throw new Error("No draft or published config is available for the V3 local canvas.");
        const sourceKind = nextOverview.draft ? "draft" : "published";
        const base = await createStudioV3BaseSnapshot(selectedConfig, sourceKind);
        if (!isCurrentLoad()) return;
        const studioV2State = studioV2FromPresenceConfig(selectedConfig, node);
        const hydrated = hydrateStudioV3Document({
          nodeId,
          slug: node.slug,
          title: node.display_name,
          baseConfig: selectedConfig,
          base,
          studioV2State,
          works: libraryRead.works,
          collections: libraryRead.collections,
          assets: nextOverview.assets,
        });
        let durableDocument = hydrated;
        let durableMessage: string | null = null;
        let durableRestoreRejected = false;
        let durableRestoreIncomplete = false;
        const durableStateMatchesBase = privateStateRead.state
          ? studioV3PrivateStateMatchesBase(privateStateRead.state, hydrated)
          : false;
        const durableBaseMismatch = Boolean(privateStateRead.state && !durableStateMatchesBase);
        if (privateStateRead.state && durableStateMatchesBase && libraryRead.complete) {
          const durableRestore = restoreStudioV3Metadata(hydrated, privateStateRead.state.metadata);
          if (durableRestore.report.status !== "rejected") {
            durableDocument = durableRestore.document;
            durableRestoreIncomplete = durableRestore.report.status === "partial";
            durableMessage = durableRestoreIncomplete
              ? STUDIO_V3_INCOMPLETE_RESTORE_MESSAGE
              : "Restored durable private V3 state";
          } else {
            durableRestoreRejected = true;
            durableMessage = "Saved private state was rejected as invalid. Durable save is disabled until reload or repair.";
          }
        }
        const partition = await deriveStudioV3OwnerPartitionKey({
          deploymentScope: window.location.host || "local",
          validatedOwnerSubject: authenticatedSubject,
        });
        if (!isCurrentLoad()) return;
        lastKnownOwnerPartitionRef.current = partition?.key ?? null;
        const persistenceKey = base.localPersistence === "available" &&
          libraryRead.complete &&
          !durableRestoreIncomplete &&
          !localPersistenceDisabledRef.current
          ? partition?.key ?? null
          : null;
        let safePersistenceKey = persistenceKey;
        let restored: {
          document: StudioV3Document;
          message: string;
          persistenceAvailable?: boolean;
          durableSaveBlocked?: boolean;
        } = {
          document: durableDocument,
          message: "Memory-only local state",
          persistenceAvailable: false,
        };
        if (safePersistenceKey && navigator.locks?.request) {
          try {
            restored = await navigator.locks.request(studioV3OwnerLockName(safePersistenceKey), { mode: "exclusive" }, () => {
              pruneStudioV3LocalEnvelopesForOwnerSwitch({
                storage: window.localStorage,
                ownerPartitionKey: safePersistenceKey!,
                currentPresence: {
                  presenceId: nodeId,
                  baseKind: base.identity.sourceKind,
                  configId: base.identity.configId,
                  baseFingerprint: base.fingerprint,
                  roomIds: durableDocument.rooms.map((room) => room.id),
                },
              });
              return restoreStudioV3LocalDocument(
                durableDocument,
                safePersistenceKey!,
                nodeId,
                privateStateRead.available && !durableBaseMismatch
                  ? privateStateRead.state?.metadata_revision ?? 0
                  : null,
              );
            });
          } catch {
            safePersistenceKey = null;
            localPersistenceDisabledRef.current = true;
            try {
              window.sessionStorage.setItem(STUDIO_V3_MEMORY_ONLY_SESSION_KEY, "1");
            } catch {
              // Keep the in-memory failure mode if session storage is unavailable too.
            }
          }
        }
        if (safePersistenceKey && !navigator.locks?.request) {
          safePersistenceKey = null;
          localPersistenceDisabledRef.current = true;
          try {
            window.sessionStorage.setItem(STUDIO_V3_MEMORY_ONLY_SESSION_KEY, "1");
          } catch {
            // Keep the in-memory failure mode if session storage is unavailable too.
          }
        }
        if (restored.persistenceAvailable === false) safePersistenceKey = null;
        const incompleteRestore = durableRestoreIncomplete || restored.durableSaveBlocked === true;
        if (incompleteRestore) safePersistenceKey = null;
        if (!isCurrentLoad()) return;
        const durableMetadataSignature = JSON.stringify(projectStudioV3Metadata(durableDocument));
        const restoredMetadataSignature = JSON.stringify(projectStudioV3Metadata(restored.document));
        const durableSaveAvailable = privateStateRead.available &&
          libraryRead.complete &&
          !durableBaseMismatch &&
          !durableRestoreRejected &&
          !incompleteRestore &&
          hydrated.base.localPersistence === "available" &&
          hasStudioV3ServerRevision(hydrated.base.identity);
        setOverview(nextOverview);
        setLibraryError(libraryRead.error);
        setBaseConfig(selectedConfig);
        setDocument(restored.document);
        setSavedMetadataSignature(durableMetadataSignature);
        setStructuralPreview(null);
        setPrivateStateRevision(durableStateMatchesBase ? privateStateRead.state?.metadata_revision ?? 0 : 0);
        setPrivateStateBaseMismatch(durableBaseMismatch);
        setPrivateStateAvailable(durableSaveAvailable);
        setOwnerPartitionKey(safePersistenceKey);
        ownerPartitionKeyRef.current = safePersistenceKey;
        setLastAction(!libraryRead.complete
          ? libraryRead.error!
          : durableBaseMismatch
          ? STUDIO_V3_DURABLE_BASE_MISMATCH_MESSAGE
          : durableRestoreRejected
            ? durableMessage!
          : incompleteRestore
            ? STUDIO_V3_INCOMPLETE_RESTORE_MESSAGE
          : durableMessage && restored.message === "No complete local snapshot"
            ? durableMessage
            : safePersistenceKey
              ? restored.message
              : durableMessage ?? "Memory-only local state");
        setSaveFeedback(!libraryRead.complete
          ? { phase: "disabled", message: libraryRead.error! }
          : durableBaseMismatch
          ? { phase: "conflict", message: "The saved private state belongs to a stale Studio base. Reload before editing further." }
          : durableRestoreRejected
            ? { phase: "disabled", message: durableMessage! }
          : incompleteRestore
            ? { phase: "conflict", message: STUDIO_V3_INCOMPLETE_RESTORE_MESSAGE }
          : !durableSaveAvailable
            ? {
                phase: safePersistenceKey ? "disabled" : "memory-only",
                message: privateStateRead.error ?? hydrated.base.reason ?? "Durable private save is unavailable on this environment.",
              }
            : restoredMetadataSignature !== durableMetadataSignature
              ? { phase: "dirty", message: "Recovered browser-local changes are not yet saved privately." }
              : { phase: privateStateRead.state ? "saved" : "clean", message: privateStateRead.state ? "Saved private state restored." : "Ready for private edits." });
      } catch (loadError) {
        if (!isCurrentLoad()) return;
        setError(loadError instanceof Error ? loadError.message : "Studio V3 failed to load.");
      } finally {
        if (isCurrentLoad()) setLoading(false);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, [authenticatedSubject, node, nodeId, token]);

  useEffect(() => {
    if (!document || !ownerPartitionKey) return;
    if (document.base.localPersistence !== "available") {
      setLastAction("Memory-only local state");
      return;
    }
    let cancelled = false;
    const writeEpoch = loadEpochRef.current;
    const writeFence = localWriteFenceRef.current;
    const disableLocalPersistence = () => {
      localPersistenceDisabledRef.current = true;
      try {
        window.sessionStorage.setItem(STUDIO_V3_MEMORY_ONLY_SESSION_KEY, "1");
      } catch {
        // Keep the in-memory failure mode if session storage is unavailable too.
      }
      setOwnerPartitionKey(null);
      setLastAction("Memory-only local state");
    };
    if (!navigator.locks?.request) {
      disableLocalPersistence();
      return;
    }
    const lockName = studioV3OwnerLockName(ownerPartitionKey);
    void navigator.locks.request(lockName, { mode: "exclusive" }, () => {
      if (cancelled || loadEpochRef.current !== writeEpoch || localWriteFenceRef.current !== writeFence) return;
      const now = new Date().toISOString();
      const presencePayload = {
        schemaVersion: document.schemaVersion,
        ownerPartitionKey,
        scope: "presence" as const,
        presenceId: nodeId,
        baseIdentity: document.base.identity,
        baseFingerprint: document.base.fingerprint,
        metadataRevision: privateStateRevision,
        metadata: projectStudioV3Metadata(document),
        mode: document.mode,
        activeRoomId: document.activeRoomId,
        activeLookId: document.activeLookId,
        namedLooks: document.namedLooks,
        locks: document.locks.filter((lock) => lock.scopeKind === "presence"),
        updatedAt: now,
      };
      const roomPayloads = document.rooms.map((room) => ({
            schemaVersion: document.schemaVersion,
            ownerPartitionKey,
            scope: "room" as const,
            presenceId: nodeId,
            roomId: room.id,
            baseIdentity: document.base.identity,
            baseFingerprint: document.base.fingerprint,
            placementSourceRefs: Object.fromEntries(room.placements.map((placement) => [placement.id, placement.sourceRef])),
            placements: room.placements.map((placement) => ({
              id: placement.id,
              roomId: placement.roomId,
              sourceRef: placement.sourceRef,
              collectionSourceRef: placement.collectionSourceRef,
              order: placement.order,
              status: placement.status,
              reason: placement.reason,
            })),
            locks: document.locks.filter((lock) => lock.scopeKind === "room" && lock.scopeId === room.id),
            updatedAt: now,
          }));
      writeStudioV3LocalSnapshot({
        storage: window.localStorage,
        expected: {
          ownerPartitionKey,
          presenceId: nodeId,
          baseIdentity: document.base.identity,
          baseFingerprint: document.base.fingerprint,
          roomIds: document.rooms.map((room) => room.id),
        },
        presence: presencePayload,
        rooms: roomPayloads,
      });
    }).catch(disableLocalPersistence);
    return () => {
      cancelled = true;
    };
  }, [document, nodeId, ownerPartitionKey, privateStateRevision]);

  const currentMetadataSignature = useMemo(
    () => document ? JSON.stringify(projectStudioV3Metadata(document)) : null,
    [document],
  );

  useEffect(() => {
    if (!currentMetadataSignature || savedMetadataSignature === null || privateStateSaving) return;
    setSaveFeedback((current) => {
      if (current.phase === "conflict" || current.phase === "disabled" || current.phase === "memory-only" || current.phase === "failed") {
        return current;
      }
      if (currentMetadataSignature !== savedMetadataSignature) {
        return current.phase === "dirty"
          ? current
          : { phase: "dirty", message: "Private changes are ready to save." };
      }
      return current.phase === "saved" || current.phase === "clean"
        ? current
        : { phase: "clean", message: "Private state is current." };
    });
  }, [currentMetadataSignature, privateStateSaving, savedMetadataSignature]);

  const canvasDocument = useMemo(() => {
    if (!document || !structuralPreview) return document;
    return structuralPreview.compareSide === "before"
      ? cancelStudioV3StructuralStage(structuralPreview.stage).document
      : structuralPreview.stage.stagedDocument;
  }, [document, structuralPreview]);

  const compiled = useMemo(() => {
    if (!canvasDocument || !baseConfig) return null;
    const baseState = studioV2FromPresenceConfig(baseConfig, node);
    return compileStudioV3Document(canvasDocument, baseState);
  }, [baseConfig, canvasDocument, node]);

  const selectedPiece = useMemo(() => {
    if (!compiled || !selectedPieceId || !document || !baseConfig) return null;
    const compiledObject = compiled.studioV2State.chambers
      .find((room) => room.id === document.activeRoomId)?.objects
      .find((object) => object.id === selectedPieceId);
    if (compiledObject) return compiledObject;
    const baseObject = studioV2FromPresenceConfig(baseConfig, node).chambers
      .find((room) => room.id === document.activeRoomId)?.objects
      .find((object) => object.id === selectedPieceId);
    if (baseObject) return baseObject;
    const placement = document.rooms.find((room) => room.id === document.activeRoomId)
      ?.placements.find((item) => item.id === selectedPieceId);
    const piece = placement
      ? findStudioV3Piece(document.pieces, placement.sourceRef, document.activeRoomId)
      : null;
    return piece ? {
      id: selectedPieceId,
      type: piece.snapshotType,
      title: piece.title,
      meta: piece.date,
      detail: piece.description,
      image: piece.media,
      visibility: { public: true, mobile: true },
      transform: { ...DEFAULT_STUDIO_V2_TRANSFORM },
      locked: false,
      pinned: false,
    } : null;
  }, [baseConfig, compiled, document, node, selectedPieceId]);

  const selectedContext = useMemo(() => {
    if (!document || !selectedPieceId) return null;
    return findStudioV3ObjectContext(document, document.activeRoomId, selectedPieceId);
  }, [document, selectedPieceId]);

  const selectedEditablePiece = useMemo(() => {
    if (!selectedPiece) return null;
    const edit = selectedContext?.edit;
    return edit ? {
      ...selectedPiece,
      ...(edit.title !== undefined ? { title: edit.title } : {}),
      ...(edit.body !== undefined ? { detail: edit.body } : {}),
      ...(edit.caption !== undefined ? { meta: edit.caption } : {}),
    } : selectedPiece;
  }, [selectedContext?.edit, selectedPiece]);

  const selectedCompositionPlacement = useMemo(() => {
    if (!compiled || !selectedPieceId || !document) return null;
    return compiled.studioV2State.chambers
      .find((chamber) => chamber.id === document.activeRoomId)
      ?.composition?.placements.find((item) => item.objectId === selectedPieceId) ?? null;
  }, [compiled, document, selectedPieceId]);

  const mediaChoices = useMemo<StudioV3MediaChoice[]>(() => {
    if (!document) return [];
    const piecesBySourceRef = new Map<StudioV3SourceRef, (typeof document.pieces)[string]>();
    for (const piece of Object.values(document.pieces)) {
      if (!piece.media?.src || piece.sourceStatus !== "current") continue;
      // Legacy source refs identify Room-native objects. A same-named object in
      // another Room is not a portable media source for the active Room.
      if (piece.sourceRef.startsWith("legacy-object:") && piece.roomId && piece.roomId !== document.activeRoomId) continue;
      const existing = piecesBySourceRef.get(piece.sourceRef);
      if (!existing || (piece.roomId === document.activeRoomId && existing.roomId !== document.activeRoomId)) {
        piecesBySourceRef.set(piece.sourceRef, piece);
      }
    }
    const pieceChoices: StudioV3MediaChoice[] = Array.from(piecesBySourceRef.values()).map((piece) => ({
      id: `piece-${piece.sourceRef}`,
      label: piece.title,
      src: piece.media!.src,
      alt: piece.media!.alt,
      kind: "piece" as const,
      sourceRef: piece.sourceRef,
      available: true,
    }));
    const seen = new Set(pieceChoices.map((choice) => choice.src));
    const assetChoices: StudioV3MediaChoice[] = (overview?.assets ?? []).flatMap((asset, index) => {
      const stable = typeof asset.media_id === "string" && Boolean(asset.media_id.trim());
      const isSelectedAsset = stable && asset.media_id === selectedContext?.edit?.mediaId;
      if (!asset.url || (seen.has(asset.url) && !isSelectedAsset)) return [];
      const runtimeAsset = stable ? document.mediaAssets[asset.media_id as string] : undefined;
      const available = runtimeAsset?.mediaType === "image" && runtimeAsset.sourceStatus === "current";
      return [{
        id: stable ? `asset-${asset.media_id}` : `asset-unavailable-${index}`,
        label: asset.alt_text || asset.role || `Media ${index + 1}`,
        src: asset.url,
        alt: asset.alt_text || "",
        kind: "asset" as const,
        ...(stable ? { mediaId: asset.media_id as string } : {}),
        available,
        ...(available ? {} : {
          unavailableReason: stable
            ? "This asset is not an available image in the owner media inventory."
            : "This legacy asset has no stable private media ID. Choose its Piece card instead.",
        }),
      }];
    });
    return [...pieceChoices, ...assetChoices];
  }, [document, overview?.assets, selectedContext?.edit?.mediaId]);

  const bridge = useMemo<PresenceStudioV2EditorBridge>(() => ({
    handleIntent(intent: PresenceStudioV2EditorIntent): PresenceStudioV2EditorResult {
      let result: PresenceStudioV2EditorResult;
      if (structuralPreview) {
        setLastAction("Apply or cancel the structural preview first");
        if (intent.kind === "activate-piece") {
          result = { kind: "piece-selected", pieceId: intent.pieceId, suppressVisitor: true };
        } else if (intent.kind === "navigate-room") {
          result = { kind: "room-selected", roomId: intent.roomId, suppressVisitor: true };
        } else if (intent.kind === "clear-selection") {
          result = { kind: "selection-cleared", suppressVisitor: true };
        } else if (intent.kind === "suppress-unsupported-chrome") {
          result = { kind: "chrome-suppressed", controlId: intent.controlId, suppressVisitor: true };
        } else {
          result = { kind: "action-suppressed", reason: "missing-piece-id", suppressVisitor: true };
        }
      } else if (intent.kind === "activate-piece") {
        const pieceId = intent.pieceId.trim();
        setSelectedPieceId(pieceId);
        setSheetMode("closed");
        setHomeOpen(false);
        setLastAction(`Selected ${pieceId}`);
        result = { kind: "piece-selected", pieceId, suppressVisitor: true };
      } else if (intent.kind === "navigate-room") {
        setDocument((current) => current ? { ...current, activeRoomId: intent.roomId, selection: { kind: "room", roomId: intent.roomId } } : current);
        setSelectedPieceId(null);
        setSheetMode("closed");
        setHomeOpen(false);
        setLastAction(`Selected Room ${intent.roomId}`);
        result = { kind: "room-selected", roomId: intent.roomId, suppressVisitor: true };
      } else if (intent.kind === "clear-selection") {
        setSheetMode((mode) => mode === "closed" ? "closed" : "closed");
        setSelectedPieceId(null);
        setLastAction("Selection cleared");
        result = { kind: "selection-cleared", suppressVisitor: true };
      } else if (intent.kind === "suppress-unsupported-chrome") {
        setLastAction("Visitor chrome suppressed in editor");
        result = { kind: "chrome-suppressed", controlId: intent.controlId, suppressVisitor: true };
      } else {
        setLastAction("Visitor action suppressed");
        result = { kind: "action-suppressed", reason: "missing-piece-id", suppressVisitor: true };
      }
      if (!validateStudioV2EditorBridgeResult(intent, result)) {
        throw new Error("Studio V3 bridge result mismatch.");
      }
      return result;
    },
  }), [structuralPreview]);

  const openSheet = useCallback((mode: SheetMode) => {
    if (structuralPreview || mode === "closed") return;
    if ((mode === "piece" || mode === "arrange") && document) {
      sheetBaselineRef.current = structuredClone(document);
    } else {
      sheetBaselineRef.current = null;
    }
    setArrangeError(null);
    sheetSessionRef.current += 1;
    setSheetMode(mode);
  }, [document, structuralPreview]);

  const finishSheet = useCallback(() => {
    sheetSessionRef.current += 1;
    sheetBaselineRef.current = null;
    setArrangeError(null);
    setSheetMode("closed");
  }, []);

  const cancelSheet = useCallback((label: string) => {
    sheetSessionRef.current += 1;
    if (sheetBaselineRef.current) {
      const baseline = structuredClone(sheetBaselineRef.current);
      setDocument((current) => ({
        ...baseline,
        mediaAssets: { ...baseline.mediaAssets, ...(current?.mediaAssets ?? {}) },
      }));
    }
    sheetBaselineRef.current = null;
    setArrangeError(null);
    setSheetMode("closed");
    setLastAction(label);
  }, []);

  const placePiece = useCallback((sourceRef: StudioV3SourceRef) => {
    if (structuralPreview) {
      setLastAction("Apply or cancel the structural preview first");
      return;
    }
    setDocument((current) => {
      if (!current) return current;
      const next = placeStudioV3Piece(current, current.activeRoomId, sourceRef);
      setLastAction(next === current ? "Piece could not be placed" : "Piece placed privately in this Room");
      return next;
    });
  }, [structuralPreview]);

  const placeCollection = useCallback((collectionRef: StudioV3CollectionSourceRef) => {
    if (structuralPreview) {
      setLastAction("Apply or cancel the structural preview first");
      return;
    }
    setDocument((current) => {
      if (!current) return current;
      const beforeCount = current.rooms.find((room) => room.id === current.activeRoomId)?.placements
        .filter((placement) => placement.collectionSourceRef === collectionRef).length ?? 0;
      const next = placeStudioV3Collection(
        current,
        current.activeRoomId,
        collectionRef,
      );
      const afterCount = next.rooms.find((room) => room.id === current.activeRoomId)?.placements
        .filter((placement) => placement.collectionSourceRef === collectionRef).length ?? 0;
      setLastAction(afterCount > beforeCount
        ? "Collection placed privately in this Room"
        : next === current
          ? "Collection is already accounted for in this Room"
          : "Collection could not be placed in this Room");
      return next;
    });
  }, [structuralPreview]);

  const unplaceObject = useCallback((objectId: string) => {
    setDocument((current) => {
      if (!current) return current;
      const context = findStudioV3ObjectContext(current, current.activeRoomId, objectId);
      if (isStudioV3RequiredCta(current, context)) {
        setLastAction("Required navigation CTA must remain placed");
        return current;
      }
      const next = unplaceStudioV3Object(current, { roomId: current.activeRoomId, objectId });
      if (next === current) {
        setLastAction("Piece placement is unchanged");
        return current;
      }
      if (selectedPieceId === objectId) setSelectedPieceId(null);
      setLastAction("Piece returned to the private Library");
      return next;
    });
  }, [selectedPieceId]);

  const unplaceCollection = useCallback((collectionRef: StudioV3CollectionSourceRef) => {
    setDocument((current) => {
      if (!current) return current;
      const room = current.rooms.find((candidate) => candidate.id === current.activeRoomId);
      const placements = (room?.placements ?? []).filter((placement) => placement.collectionSourceRef === collectionRef);
      if (placements.some((placement) => isStudioV3RequiredCta(
        current,
        findStudioV3ObjectContext(current, room!.id, placement.id),
      ))) {
        setLastAction("Collection contains the required navigation CTA and must remain placed");
        return current;
      }
      const next = placements.reduce(
        (result, placement) => unplaceStudioV3Object(result, { roomId: room!.id, objectId: placement.id }),
        current,
      );
      setLastAction(next === current ? "Collection placement is unchanged" : "Collection Pieces returned to the private Library");
      return next;
    });
  }, []);

  const inspectObject = useCallback((objectId: string, preferredRoomId?: string) => {
    setDocument((current) => {
      if (!current) return current;
      const containingRoom = current.rooms.find((room) => room.id === preferredRoomId && (
        room.baseObjectIds.includes(objectId) || room.placements.some((placement) => placement.id === objectId)
      )) ?? current.rooms.find((room) => (
        room.baseObjectIds.includes(objectId) ||
        room.placements.some((placement) => placement.id === objectId)
      ));
      return containingRoom && containingRoom.id !== current.activeRoomId
        ? { ...current, activeRoomId: containingRoom.id }
        : current;
    });
    setSelectedPieceId(objectId);
    setSheetMode("closed");
    setHomeOpen(false);
    setLastAction("Piece selected from the Library");
  }, []);

  const enterTestAsVisitor = useCallback(() => {
    visitorReturnFocusRef.current = globalThis.document.activeElement instanceof HTMLElement
      ? globalThis.document.activeElement
      : visitorTriggerRef.current;
    setHomeOpen(false);
    setSheetMode("closed");
    setTestAsVisitor(true);
  }, []);

  const updateSelectedCopy = useCallback((values: { title?: string; body?: string; caption?: string }) => {
    if (!selectedPieceId) return;
    if (isStudioV3RequiredCta(document!, selectedContext) && values.title !== undefined && !values.title.trim()) {
      setLastAction("Required CTA label cannot be empty");
      return;
    }
    if (Object.values(values).some((value) => value !== undefined && containsForbiddenStudioV3Text(value))) {
      setLastAction("Copy rejected · URLs, code, credentials, and private material cannot enter V3 metadata");
      return;
    }
    setDocument((current) => {
      if (!current) return current;
      const next = updateStudioV3ObjectCopy(current, {
        roomId: selectedContext?.roomId ?? current.activeRoomId,
        objectId: selectedPieceId,
        ...values,
      });
      setLastAction(next === current
        ? "Copy was not changed. Private edit capacity may be full or the value is unsupported."
        : "Copy changed on the private canvas");
      return next;
    });
  }, [document, selectedContext, selectedPieceId]);

  const chooseSelectedMedia = useCallback((choice: StudioV3MediaChoice) => {
    if (!selectedPieceId || !choice.available) return;
    const mediaAlt = choice.alt || choice.label;
    if (containsForbiddenStudioV3Text(mediaAlt)) {
      setLastAction("Media reference rejected · its label is unsafe for private metadata");
      return;
    }
    setDocument((current) => {
      if (!current) return current;
      const next = replaceStudioV3ObjectMedia(current, {
        roomId: selectedContext?.roomId ?? current.activeRoomId,
        objectId: selectedPieceId,
        ...(choice.kind === "piece" && choice.sourceRef ? { mediaSourceRef: choice.sourceRef as StudioV3SourceRef } : {}),
        ...(choice.kind === "asset" && choice.mediaId ? { mediaId: choice.mediaId } : {}),
        mediaAlt,
      });
      setLastAction(next === current
        ? "Media was not changed. Private edit capacity may be full or the reference is unavailable."
        : "Media changed on the private canvas");
      return next;
    });
  }, [selectedContext?.roomId, selectedPieceId]);

  const runArrangement = useCallback((operation: "earlier" | "later" | "feature" | { zoneId: string }) => {
    if (!selectedPieceId || !baseConfig) return;
    setDocument((current) => {
      if (!current) return current;
      const roomId = selectedContext?.roomId ?? current.activeRoomId;
      const baseState = studioV2FromPresenceConfig(baseConfig, node);
      const result = typeof operation === "object"
        ? moveStudioV3ObjectToZone(current, baseState, { roomId, objectId: selectedPieceId, zoneId: operation.zoneId })
        : operation === "feature"
          ? toggleStudioV3ObjectFeatured(current, baseState, { roomId, objectId: selectedPieceId })
          : reorderStudioV3Object(current, baseState, { roomId, objectId: selectedPieceId, direction: operation });
      setArrangeError(result.error ?? null);
      if (result.error) {
        setLastAction(result.error);
      } else if (result.document === current) {
        const message = typeof operation === "object"
          ? "This Piece is already in that registered zone"
          : operation === "feature"
            ? "Feature state is unchanged"
            : `No ${operation} position is available in this zone`;
        setArrangeError(message);
        setLastAction(message);
      } else if (!result.error) {
        setLastAction(typeof operation === "object" ? `Moved to ${operation.zoneId}` : operation === "feature" ? "Feature state changed" : `Moved ${operation}`);
      }
      return result.document;
    });
  }, [baseConfig, node, selectedContext?.roomId, selectedPieceId]);

  const setSelectedSize = useCallback((size: StudioV2PlacementSize) => {
    if (!selectedPieceId || !baseConfig) return;
    setDocument((current) => {
      if (!current) return current;
      const result = setStudioV3ObjectSize(current, studioV2FromPresenceConfig(baseConfig, node), {
        roomId: selectedContext?.roomId ?? current.activeRoomId,
        objectId: selectedPieceId,
        size,
      });
      setArrangeError(result.error ?? null);
      setLastAction(result.error ?? (result.document === current ? "Piece size is unchanged" : `Piece size changed to ${size}`));
      return result.document;
    });
  }, [baseConfig, node, selectedContext?.roomId, selectedPieceId]);

  const setSelectedTreatment = useCallback((treatment: StudioV2PlacementTreatment) => {
    if (!selectedPieceId || !baseConfig) return;
    setDocument((current) => {
      if (!current) return current;
      const result = setStudioV3ObjectTreatment(current, studioV2FromPresenceConfig(baseConfig, node), {
        roomId: selectedContext?.roomId ?? current.activeRoomId,
        objectId: selectedPieceId,
        treatment,
      });
      setArrangeError(result.error ?? null);
      setLastAction(result.error ?? (result.document === current ? "Piece treatment is unchanged" : `Piece treatment changed to ${treatment}`));
      return result.document;
    });
  }, [baseConfig, node, selectedContext?.roomId, selectedPieceId]);

  const setEditorMode = useCallback((mode: StudioV3ModePreference) => {
    setDocument((current) => {
      if (!current || current.mode === mode) return current;
      setLastAction(mode === "simple" ? "Simple editing mode selected" : "Advanced Creative mode selected");
      return { ...current, mode };
    });
  }, []);

  const toggleSelectedVisibility = useCallback(() => {
    if (!selectedPieceId) return;
    setDocument((current) => {
      if (!current) return current;
      const roomId = selectedContext?.roomId ?? current.activeRoomId;
      const context = findStudioV3ObjectContext(current, roomId, selectedPieceId);
      const visibility = context?.edit?.visibility === "hidden" || context?.placement?.visibility === "hidden"
        ? "visible"
        : "hidden";
      if (visibility === "hidden" && isStudioV3RequiredCta(current, context)) {
        setLastAction("Required navigation CTA must remain visible");
        return current;
      }
      const next = setStudioV3ObjectVisibility(current, { roomId, objectId: selectedPieceId, visibility });
      setLastAction(next === current
        ? "Visibility is unchanged"
        : visibility === "hidden"
          ? "Piece hidden on the private canvas"
          : "Piece visible on the private canvas");
      return next;
    });
  }, [selectedContext?.roomId, selectedPieceId]);

  const uploadPrivateMedia = useCallback(async (file: File) => {
    const capability = overview?.media_capability;
    if (discardInFlightRef.current) {
      setLastAction("Local discard is in progress. Wait for the durable/base reload before uploading.");
      return;
    }
    if (uploadInFlightRef.current) {
      setLastAction("An image upload is already in progress");
      return;
    }
    if (!capability?.private_draft_media_active || !privateStateAvailable) {
      setLastAction(capability?.owner_message || STUDIO_V3_UPLOAD_DISABLED_MESSAGE);
      return;
    }
    uploadInFlightRef.current = true;
    const uploadRequest = ++uploadRequestRef.current;
    setUploadBusy(true);
    setLastAction("Checking image before private upload");
    const requestEpoch = loadEpochRef.current;
    const requestOwnerSubject = authenticatedSubjectRef.current;
    const requestOwnerPartitionKey = ownerPartitionKeyRef.current;
    const isCurrentRequest = () => (
      uploadRequestRef.current === uploadRequest &&
      loadEpochRef.current === requestEpoch &&
      authenticatedSubjectRef.current === requestOwnerSubject &&
      ownerPartitionKeyRef.current === requestOwnerPartitionKey
    );
    const attachmentSession = sheetMode === "piece" && selectedPieceId ? sheetSessionRef.current : null;
    const attachmentObjectId = attachmentSession === null ? null : selectedPieceId;
    const attachmentRoomId = attachmentSession === null ? null : selectedContext?.roomId;
    try {
      const validationError = await validateMediaUploadFile(file);
      if (!isCurrentRequest()) return;
      if (validationError) {
        setLastAction(validationError);
        return;
      }
      setLastAction("Uploading to owner-private media inventory");
      const response = await uploadStudioV3PrivateAsset(nodeId, token, { file, role: "work" });
      if (!isCurrentRequest()) return;
      const asset = response.uploaded_asset;
      if (
        response.storage_policy !== "private_draft_inventory_only" ||
        asset.visibility !== "private_draft" ||
        typeof asset.media_id !== "string" ||
        !asset.media_id.trim()
      ) {
        throw new Error("The upload did not return a stable owner-private media reference.");
      }
      const attachToPiece = attachmentSession !== null
        && attachmentSession === sheetSessionRef.current
        && attachmentObjectId !== null;
      setOverview((current) => current ? { ...current, assets: response.assets } : current);
      setDocument((current) => {
        if (!current) return current;
        let next = upsertStudioV3MediaAsset(current, asset);
        if (attachToPiece) {
          const requestedMediaAlt = asset.alt_text || file.name;
          const mediaAlt = requestedMediaAlt && requestedMediaAlt.length <= 240 && !containsForbiddenStudioV3Text(requestedMediaAlt)
            ? requestedMediaAlt
            : "Uploaded image";
          const withAsset = next;
          next = replaceStudioV3ObjectMedia(withAsset, {
            roomId: attachmentRoomId ?? next.activeRoomId,
            objectId: attachmentObjectId,
            mediaId: asset.media_id!,
            mediaAlt,
          });
          setLastAction(next === withAsset
            ? "Image uploaded to the owner-private media Library, but it could not be selected. Private edit capacity may be full or the target is unavailable."
            : "Image uploaded privately and selected on the canvas");
        } else {
          setLastAction("Image uploaded to the owner-private media Library");
        }
        return next;
      });
    } catch (uploadError) {
      if (!isCurrentRequest()) return;
      setLastAction(uploadError instanceof Error ? uploadError.message : "Private media upload failed safely");
    } finally {
      if (isCurrentRequest()) {
        uploadInFlightRef.current = false;
        setUploadBusy(false);
      }
    }
  }, [nodeId, overview?.media_capability, privateStateAvailable, selectedContext?.roomId, selectedPieceId, sheetMode, token]);

  const applyVisualFacet = useCallback((input: { layer: StudioV3Layer; value: StudioV3LayerOverrideValue; label: string }) => {
    if (structuralPreview) return;
    setDocument((current) => {
      if (!current) return current;
      const next = applyStudioV3LayerOverride(current, {
        scopeKind: "presence",
        scopeId: String(nodeId),
        layer: input.layer,
        value: input.value,
        provenance: "m1-visual-choice",
      });
      setLastAction(next === current
        ? `${input.label} was not applied because the layer is locked, full, or unsupported`
        : `${input.label} applied privately`);
      return next;
    });
  }, [nodeId, structuralPreview]);

  const applyLook = useCallback((lookId: StudioV3P1LookId) => {
    if (structuralPreview) {
      setLastAction("Apply or cancel the structural preview first");
      return;
    }
    setDocument((current) => current ? applyStudioV3Look(current, lookId) : current);
    const label = lookId === "soft-editorial"
      ? "Soft Editorial"
      : lookId === "nocturnal-gallery"
        ? "Nocturnal Gallery"
        : "Zine Archive";
    setLastAction(`${label} applied on the private canvas`);
  }, [structuralPreview]);

  const stageRoomStyle = useCallback((roomStyleId: StudioV3P1RoomStyleId) => {
    if (!document) return;
    const staged = stageStudioV3RoomStyle(document, {
      roomId: document.activeRoomId,
      roomStyleId,
      now: new Date().toISOString(),
    });
    if (staged.status !== "ready") {
      setLastAction(staged.reason === "savepoint-capacity"
        ? "Room Style preview is unavailable until an older structural savepoint is explicitly removed"
        : "This Room Style cannot be previewed for the current Room");
      return;
    }
    const readyStage = staged as StudioV3ReadyStructuralStage;
    const targetStyleName = studioV3RoomStyleName(roomStyleId);
    setStructuralPreview({
      stage: readyStage,
      targetStyleId: roomStyleId,
      targetStyleName,
      compareSide: "after",
      summary: compatibilitySummaryFromStage(readyStage),
    });
    setLastAction(`Previewing ${targetStyleName}`);
  }, [document]);

  const compareStructuralSide = useCallback((compareSide: StudioV3CompareSide) => {
    setStructuralPreview((current) => current ? { ...current, compareSide } : current);
  }, []);

  const applyStructuralPreview = useCallback(() => {
    if (!structuralPreview) return;
    const applied = applyStudioV3StructuralStage(structuralPreview.stage);
    if (applied.report.status === "rejected") {
      setLastAction("Room Style could not be applied because structural savepoint capacity is full. Remove an older savepoint first.");
      return;
    }
    setDocument((current) => ({
      ...applied.document,
      mediaAssets: { ...applied.document.mediaAssets, ...(current?.mediaAssets ?? {}) },
    }));
    setLastAction(`${structuralPreview.targetStyleName} applied on the private canvas`);
    setStructuralPreview(null);
  }, [structuralPreview]);

  const cancelStructuralPreview = useCallback(() => {
    if (!structuralPreview) return;
    const cancelled = cancelStudioV3StructuralStage(structuralPreview.stage);
    setDocument((current) => ({
      ...cancelled.document,
      mediaAssets: { ...cancelled.document.mediaAssets, ...(current?.mediaAssets ?? {}) },
    }));
    setStructuralPreview(null);
    setLastAction(cancelled.report.status === "exact"
      ? "Preview cancelled - exact prior structure restored"
      : "Preview cancelled - prior structure restored with warnings");
  }, [structuralPreview]);

  const savePrivateState = useCallback(async () => {
    if (
      !document ||
      !privateStateAvailable ||
      privateStateBaseMismatch ||
      !hasStudioV3ServerRevision(document.base.identity) ||
      privateStateSaving ||
      privateStateSaveInFlightRef.current ||
      discardInFlightRef.current
    ) return;
    if (structuralPreview) {
      setLastAction("Apply or cancel the structural preview before saving private state");
      return;
    }
    const identity = document.base.identity;
    if ((identity.sourceKind !== "draft" && identity.sourceKind !== "published") || identity.status !== identity.sourceKind) {
      setLastAction("Reload the Studio base before saving private state");
      return;
    }
    const submittedMetadata = projectStudioV3Metadata(document);
    if (!isSafeStudioV3MetadataEnvelope(submittedMetadata)) {
      setSaveFeedback({
        phase: "failed",
        message: "Could not save private editor state. The local metadata exceeds a registered bound or contains an unsupported value.",
      });
      setLastAction("Could not save private editor state · local validation failed safely");
      return;
    }
    privateStateSaveInFlightRef.current = true;
    setPrivateStateSaving(true);
    setLastAction("Saving private V3 state");
    setSaveFeedback({ phase: "saving", message: "Saving owner-private editor state." });
    const requestEpoch = loadEpochRef.current;
    const requestOwnerSubject = authenticatedSubjectRef.current;
    const requestOwnerPartitionKey = ownerPartitionKeyRef.current;
    const isCurrentRequest = () => (
      loadEpochRef.current === requestEpoch &&
      authenticatedSubjectRef.current === requestOwnerSubject &&
      ownerPartitionKeyRef.current === requestOwnerPartitionKey
    );
    const submittedDocument = document;
    const submittedSignature = JSON.stringify(submittedMetadata);
    try {
      const response = await replaceStudioV3PrivateState(nodeId, token, {
        expected: {
          room_id: identity.roomId,
          config_id: identity.configId,
          source_kind: identity.sourceKind,
          status: identity.sourceKind,
          version: identity.version,
          revision: identity.revision,
          schema_version: identity.schemaVersion,
          fingerprint: document.base.fingerprint,
          metadata_revision: privateStateRevision,
        },
        metadata_schema_version: STUDIO_V3_PRIVATE_METADATA_SCHEMA_VERSION,
        metadata: submittedMetadata,
      });
      if (!isCurrentRequest()) return;
      if (!response.state) throw new Error("Private state response was empty.");
      const normalized = restoreStudioV3Metadata(submittedDocument, response.state.metadata);
      if (normalized.report.status === "rejected") throw new Error("The server returned an invalid private-state envelope.");
      if (normalized.report.status === "partial") {
        setPrivateStateAvailable(false);
        setSaveFeedback({ phase: "conflict", message: STUDIO_V3_INCOMPLETE_RESTORE_MESSAGE });
        setLastAction(STUDIO_V3_INCOMPLETE_RESTORE_MESSAGE);
        return;
      }
      const normalizedSignature = JSON.stringify(projectStudioV3Metadata(normalized.document));
      setDocument((current) => {
        if (!current) return normalized.document;
        const normalizedWithCurrentInventory = {
          ...normalized.document,
          mediaAssets: { ...normalized.document.mediaAssets, ...current.mediaAssets },
        };
        return JSON.stringify(projectStudioV3Metadata(current)) === submittedSignature
          ? normalizedWithCurrentInventory
          : current;
      });
      setPrivateStateRevision(response.state.metadata_revision);
      setSavedMetadataSignature(normalizedSignature);
      setSaveFeedback({
        phase: "saved",
        message: "Saved privately. Still unpublished. Visitor site unchanged.",
      });
      setLastAction("Saved privately · Still unpublished · Visitor site unchanged");
    } catch (saveError) {
      if (!isCurrentRequest()) return;
      const conflict = saveError instanceof PresenceApiError && saveError.status === 409;
      const message = saveError instanceof Error ? saveError.message : "Private V3 state save failed safely";
      if (conflict) setPrivateStateAvailable(false);
      setSaveFeedback({
        phase: conflict ? "conflict" : "failed",
        message: conflict
          ? "The Studio base or private metadata revision changed. Reload latest before saving again."
          : `Could not save private editor state. ${message}`,
      });
      setLastAction(conflict ? "Conflict · reload latest private state" : "Could not save private editor state");
    } finally {
      if (isCurrentRequest()) {
        privateStateSaveInFlightRef.current = false;
        setPrivateStateSaving(false);
      }
    }
  }, [document, nodeId, privateStateAvailable, privateStateBaseMismatch, privateStateRevision, privateStateSaving, structuralPreview, token]);

  const reloadLatestPrivateState = useCallback(() => {
    const hasUnsavedPrivateChanges = Boolean(
      currentMetadataSignature &&
      savedMetadataSignature !== null &&
      currentMetadataSignature !== savedMetadataSignature,
    );
    if (
      hasUnsavedPrivateChanges &&
      !window.confirm("Reloading latest private state will discard your current unsaved changes. Continue?")
    ) return;
    window.location.reload();
  }, [currentMetadataSignature, savedMetadataSignature]);

  const discardLocalChanges = useCallback(async () => {
    if (!document) return;
    if (privateStateSaveInFlightRef.current || uploadInFlightRef.current) {
      setLastAction("Wait for the current private save or upload to finish before discarding local changes.");
      return;
    }
    const confirmed = window.confirm(
      "Discard local changes for this Presence and reload the last durable private or base state? This does not publish or change the visitor site.",
    );
    if (!confirmed) return;
    discardInFlightRef.current = true;
    setDiscardingLocal(true);
    localWriteFenceRef.current += 1;
    const discardPartitionKey = ownerPartitionKey ?? lastKnownOwnerPartitionRef.current;
    setOwnerPartitionKey(null);
    ownerPartitionKeyRef.current = null;
    setLastAction("Discarding browser-local changes safely before reload");
    try {
      if (discardPartitionKey) {
        if (!navigator.locks?.request) throw new Error("Browser lock unavailable");
        await navigator.locks.request(studioV3OwnerLockName(discardPartitionKey), { mode: "exclusive" }, () => {
          clearStudioV3LocalStateForPresence({
            storage: window.localStorage,
            expected: {
              ownerPartitionKey: discardPartitionKey,
              presenceId: nodeId,
              baseIdentity: document.base.identity,
              baseFingerprint: document.base.fingerprint,
              roomIds: document.rooms.map((room) => room.id),
            },
          });
        });
      }
      setLastAction("Browser-local changes discarded. Reloading durable private state.");
      window.location.reload();
    } catch {
      discardInFlightRef.current = false;
      setDiscardingLocal(false);
      setOwnerPartitionKey(ownerPartitionKey);
      ownerPartitionKeyRef.current = ownerPartitionKey;
      setLastAction("Could not discard browser-local changes. Existing state was preserved.");
    }
  }, [document, nodeId, ownerPartitionKey]);

  const lockMotion = useCallback(() => {
    if (structuralPreview) {
      setLastAction("Apply or cancel the structural preview first");
      return;
    }
    setDocument((current) => {
      if (!current) return current;
      const values = effectiveStudioV3LookValues(current);
      const next = lockStudioV3Layer(current, {
        scopeKind: "presence",
        scopeId: String(nodeId),
        layer: "motion-atmosphere",
        value: { motionIntensity: values.motionIntensity },
        reason: "P0 lock preserving a visible motion/atmosphere choice.",
      });
      setLastAction(next === current
        ? "Motion / Atmosphere lock was not changed because lock capacity is full"
        : "Motion / Atmosphere locked on the private canvas");
      return next;
    });
  }, [nodeId, structuralPreview]);

  const saveNamedLook = useCallback(() => {
    if (structuralPreview) {
      setLastAction("Apply or cancel the structural preview first");
      return;
    }
    if (containsForbiddenLocalValue(namedLookName)) {
      setLastAction("Named Look name rejected");
      return;
    }
    setDocument((current) => {
      if (!current) return current;
      const next = saveStudioV3NamedLook(current, namedLookName);
      setLastAction(next === current
        ? "Named Look limit reached · remove an older Look before saving another"
        : "Named Look prepared privately · save private state to persist");
      return next;
    });
  }, [namedLookName, structuralPreview]);

  const restoreNamedLook = useCallback(() => {
    if (structuralPreview) {
      setLastAction("Apply or cancel the structural preview first");
      return;
    }
    setDocument((current) => {
      if (!current || current.namedLooks.length === 0) return current;
      const named = current.namedLooks[current.namedLooks.length - 1];
      setLastAction("Named Look restored on the private canvas");
      const restored = applyStudioV3Look(current, named.id);
      return {
        ...restored,
        layerOverrides: restored.layerOverrides.filter((override) => (
          override.scopeKind !== "presence" || override.scopeId !== String(current.nodeId)
        )),
      };
    });
  }, [structuralPreview]);

  const restoreStructuralSavepoint = useCallback(() => {
    if (structuralPreview) {
      setLastAction("Apply or cancel the structural preview first");
      return;
    }
    setDocument((current) => {
      const savepoint = current?.savepoints[current.savepoints.length - 1];
      if (!current || !savepoint) return current;
      const restored = restoreStudioV3Savepoint(current, savepoint);
      setLastAction(restored.report.status === "exact"
        ? "Last structural savepoint restored"
        : "Structural savepoint restored with missing references");
      return restored.document;
    });
  }, [structuralPreview]);

  if (loading) return <Loading label="Opening Studio V3 local pilot..." />;
  if (error || !compiled || !document || !overview) {
    return (
      <main className="studio-v3-shell studio-v3-error">
        <p>{error || "Studio V3 is unavailable."}</p>
      </main>
    );
  }

  const activeRoom = document.rooms.find((room) => room.id === document.activeRoomId) ?? document.rooms[0];
  const compatibility = compatibilitySummaryFromDocument(document, activeRoom?.id ?? document.activeRoomId);
  const activeLook = document.looks[document.activeLookId]
    ?? document.namedLooks.find((look) => look.id === document.activeLookId);
  const activeLookValues = effectiveStudioV3LookValues(document);
  const motionLocked = document.locks.some((lock) => lock.layer === "motion-atmosphere");
  const privateUploadEnabled = Boolean(
    !discardingLocal &&
    privateStateAvailable &&
    overview.media_capability?.private_draft_media_active &&
    overview.media_capability.migration_ready &&
    overview.media_capability.protected_storage_verified,
  );
  const uploadReason = discardingLocal
    ? "Local discard is in progress. Upload resumes after the durable/base reload."
    : overview.media_capability?.owner_message || STUDIO_V3_UPLOAD_DISABLED_MESSAGE;
  const selectedHidden = selectedContext?.edit?.visibility === "hidden"
    || selectedContext?.placement?.visibility === "hidden";
  const selectedRequiredCta = isStudioV3RequiredCta(document, selectedContext);
  const canToggleSelectedVisibility = !selectedRequiredCta || selectedHidden;
  const selectedFeatured = selectedContext?.edit?.featured === true || selectedCompositionPlacement?.size === "feature";
  const selectedOpenLink = safeStudioV3OpenLink(selectedEditablePiece?.link);
  const selectedLayout = selectedCompositionPlacement?.layoutId
    ?? activeRoom?.composition?.layoutId
    ?? "gallery-wall";
  const arrangeZones = studioV2Layout(selectedLayout).zones;
  const canvasRoomStyle = canvasDocument?.rooms.find((room) => room.id === canvasDocument.activeRoomId)?.styleId
    ?? activeRoom?.styleId
    ?? "gallery-wall";

  return (
    <main
      className={`studio-v3-shell${testAsVisitor ? " is-testing-visitor" : ""}${sheetMode !== "closed" ? " is-sheet-open" : ""}`}
      data-testid="presence-studio-v3-shell"
      onKeyDownCapture={(event) => {
        if (testAsVisitor || structuralPreview || sheetMode !== "closed" || event.key !== "Escape" || !selectedPieceId) return;
        const target = event.target;
        if (
          target instanceof HTMLElement &&
          (target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")
        ) {
          return;
        }
        event.preventDefault();
        setSelectedPieceId(null);
        setLastAction("Selection cleared");
      }}
    >
      {!testAsVisitor && <header className="studio-v3-topbar" inert={sheetMode !== "closed" ? true : undefined} aria-hidden={sheetMode !== "closed" ? true : undefined}>
        <button type="button" onClick={() => setHomeOpen((open) => !open)} disabled={Boolean(structuralPreview)} aria-label="Studio Home">
          Home
        </button>
        <div>
          <strong>{node.display_name}</strong>
          <small
            data-testid="presence-studio-v3-status"
            data-durable-base-state={privateStateBaseMismatch ? "mismatch" : "current"}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {privateStateBaseMismatch ? STUDIO_V3_DURABLE_BASE_MISMATCH_MESSAGE : lastAction}
          </small>
        </div>
        <StudioV3SaveStatus
          phase={saveFeedback.phase}
          message={saveFeedback.message}
          browserPersistence={ownerPartitionKey ? "available" : "memory-only"}
          onRetry={() => void savePrivateState()}
          onReload={reloadLatestPrivateState}
        />
        <nav aria-label="Studio V3 top actions">
          <button ref={shelfTriggerRef} type="button" onClick={() => openSheet("shelf")} disabled={Boolean(structuralPreview)} data-testid="presence-studio-v3-shelf-trigger">
            Pieces
          </button>
          <button type="button" onClick={() => openSheet("look")} data-testid="presence-studio-v3-look-trigger">
            Look
          </button>
          <button
            type="button"
            onClick={() => void savePrivateState()}
            disabled={!privateStateAvailable || privateStateBaseMismatch || privateStateSaving || discardingLocal || Boolean(structuralPreview)}
            data-testid="presence-studio-v3-save-private-state"
            title={privateStateBaseMismatch
              ? "Existing durable state is preserved. Saving requires a future reviewed rebase or clear."
              : saveFeedback.phase === "conflict"
                ? saveFeedback.message
              : discardingLocal
                ? "Local discard is in progress. Save resumes after the durable/base reload."
              : privateStateAvailable
                ? "Save owner-private copy, media references, placement, Looks, locks, and savepoints."
                : "Durable private state requires the reviewed V3 backend contract and a revisioned base."}
          >
            {privateStateSaving ? "Saving private state..." : "Save private state"}
          </button>
          <button
            ref={visitorTriggerRef}
            type="button"
            onClick={enterTestAsVisitor}
            disabled={Boolean(structuralPreview)}
            data-testid="presence-studio-v3-test-visitor"
          >
            Test as visitor
          </button>
          <button
            type="button"
            onClick={() => openSheet("review")}
            disabled={Boolean(structuralPreview)}
            data-testid="presence-studio-v3-review-trigger"
          >
            Review &amp; publish
          </button>
          <button type="button" disabled title="Server Visitor Preview requires a separately approved atomic draft save.">
            Visitor Preview
          </button>
        </nav>
      </header>}

      {!testAsVisitor && homeOpen && (
        <div inert={sheetMode !== "closed" ? true : undefined} aria-hidden={sheetMode !== "closed" ? true : undefined}>
          <StudioV3Home
          node={node}
          mode={document.mode}
          status={overview.draft
            ? "Draft base loaded; V3 metadata remains owner-private and saves separately."
            : "Published base loaded; V3 metadata remains owner-private and saves separately."}
          onEdit={() => setHomeOpen(false)}
          onTestVisitor={enterTestAsVisitor}
          onModeChange={setEditorMode}
          />
        </div>
      )}

      <section
        className={`studio-v3-canvas is-room-style-${canvasRoomStyle}${structuralPreview ? " is-structural-preview" : ""}`}
        data-testid="presence-studio-v3-public-room-canvas"
        data-room-style={canvasRoomStyle}
        data-preview-room-style={structuralPreview?.targetStyleId}
        inert={sheetMode !== "closed" ? true : undefined}
        aria-hidden={sheetMode !== "closed" ? true : undefined}
      >
        <PresenceStudioV2PublicRoom
          room={compiled.publicRoom}
          editorBridge={testAsVisitor ? undefined : bridge}
          editorActiveChamberId={canvasDocument?.activeRoomId}
          inMemoryVisualPreview={testAsVisitor}
        />
      </section>

      {testAsVisitor && (
        <button
          ref={visitorExitRef}
          type="button"
          className="studio-v3-visitor-exit"
          data-testid="presence-studio-v3-back-to-editor"
          onClick={() => setTestAsVisitor(false)}
        >
          Back to editor
        </button>
      )}

      {!testAsVisitor && selectedEditablePiece && (
        <div className="studio-v3-action-bar" data-testid="presence-studio-v3-action-bar" inert={sheetMode !== "closed" ? true : undefined} aria-hidden={sheetMode !== "closed" ? true : undefined}>
          <span>{selectedEditablePiece.title}</span>
          <button type="button" onClick={() => openSheet("piece")} disabled={Boolean(structuralPreview)} data-testid="presence-studio-v3-edit-action">Edit</button>
          <button type="button" onClick={() => openSheet("arrange")} disabled={Boolean(structuralPreview)} data-testid="presence-studio-v3-arrange-action">Arrange</button>
          <button type="button" aria-pressed={selectedFeatured} onClick={() => runArrangement("feature")} disabled={Boolean(structuralPreview)}>
            {selectedFeatured ? "Unfeature" : "Feature"}
          </button>
          <button
            type="button"
            aria-pressed={selectedHidden}
            onClick={toggleSelectedVisibility}
            disabled={Boolean(structuralPreview)}
            aria-disabled={!canToggleSelectedVisibility}
            aria-describedby={!canToggleSelectedVisibility ? "studio-v3-action-required-cta-help" : undefined}
            title={!canToggleSelectedVisibility ? "The required navigation CTA must remain visible." : undefined}
          >
            {selectedHidden ? "Show" : "Hide"}
          </button>
          {!canToggleSelectedVisibility && (
            <span id="studio-v3-action-required-cta-help" className="sr-only">The required navigation CTA must remain visible.</span>
          )}
          <button type="button" onClick={() => openSheet("shelf")} disabled={Boolean(structuralPreview)}>Pieces</button>
          <button type="button" onClick={() => openSheet("look")}>Look</button>
          <button
            type="button"
            onClick={() => {
              if (selectedOpenLink) window.open(selectedOpenLink, "_blank", "noopener,noreferrer");
            }}
            disabled={!selectedOpenLink || Boolean(structuralPreview)}
            title={selectedEditablePiece.link && !selectedOpenLink ? "This destination is not an approved public link." : undefined}
          >
            Open link
          </button>
        </div>
      )}

      {!testAsVisitor && sheetMode !== "closed" && (
        <section
          ref={sheetRef}
          className="studio-v3-sheet"
          data-testid="presence-studio-v3-bottom-sheet"
          aria-label="Studio V3 bottom sheet"
          role="dialog"
          aria-modal="true"
        >
          <button
            ref={sheetCloseRef}
            type="button"
            className="studio-v3-sheet-close"
            onClick={() => {
              if (sheetMode === "piece") {
                cancelSheet("Piece changes cancelled · prior private state restored");
              } else if (sheetMode === "arrange") {
                cancelSheet("Arrange cancelled · exact prior state restored");
              } else if (sheetMode === "look" && structuralPreview) {
                cancelStructuralPreview();
                finishSheet();
              } else {
                finishSheet();
              }
            }}
            aria-label="Close sheet"
          >
            Close
          </button>
          {sheetMode === "piece" && selectedEditablePiece && (
            <StudioV3PieceControls
              object={selectedEditablePiece}
              mediaChoices={mediaChoices}
              selectedMediaChoiceId={selectedContext?.edit?.mediaSourceRef
                ? `piece-${selectedContext.edit.mediaSourceRef}`
                : selectedContext?.edit?.mediaId
                  ? `asset-${selectedContext.edit.mediaId}`
                  : selectedContext?.sourceRef
                    ? `piece-${selectedContext.sourceRef}`
                    : undefined}
              requiredTitle={selectedRequiredCta}
              uploadEnabled={privateUploadEnabled}
              uploadReason={uploadReason}
              uploadBusy={uploadBusy}
              onCopyChange={updateSelectedCopy}
              onMediaChoice={chooseSelectedMedia}
              onUpload={(file) => void uploadPrivateMedia(file)}
              onDone={finishSheet}
              onCancel={() => cancelSheet("Piece changes cancelled · prior private state restored")}
            />
          )}
          {sheetMode === "arrange" && selectedEditablePiece && (
            <StudioV3ArrangeControls
              object={selectedEditablePiece}
              placement={selectedCompositionPlacement}
              zones={arrangeZones}
              featured={selectedFeatured}
              hidden={selectedHidden}
              canUnplace={Boolean(selectedContext?.placement) && !selectedRequiredCta}
              unplaceReason={selectedRequiredCta
                ? "The required navigation CTA must remain placed."
                : "Room-native Pieces can be hidden, not removed from their canonical Room."}
              canToggleVisibility={canToggleSelectedVisibility}
              visibilityReason={selectedRequiredCta ? "The required navigation CTA must remain visible." : undefined}
              error={arrangeError}
              onMoveZone={(zoneId) => runArrangement({ zoneId })}
              onMoveEarlier={() => runArrangement("earlier")}
              onMoveLater={() => runArrangement("later")}
              onToggleFeatured={() => runArrangement("feature")}
              onToggleVisibility={toggleSelectedVisibility}
              onSize={setSelectedSize}
              onTreatment={setSelectedTreatment}
              onUnplace={() => {
                if (!selectedPieceId) return;
                unplaceObject(selectedPieceId);
                finishSheet();
              }}
              onDone={finishSheet}
              onCancel={() => cancelSheet("Arrange cancelled · exact prior state restored")}
            />
          )}
          {sheetMode === "shelf" && (
            <StudioV3PieceShelf
              pieces={Object.values(document.pieces)}
              collections={Object.values(document.collections)}
              placements={activeRoom.placements}
              activeRoomId={activeRoom.id}
              roomNativeObjectIds={Array.from(new Set(document.rooms.flatMap((room) => room.baseObjectIds)))}
              activeRoomObjectIds={activeRoom.baseObjectIds}
              requiredCtaSourceRef={document.navigation.requiredCta.visible ? document.navigation.requiredCta.sourceRef : undefined}
              uploadEnabled={privateUploadEnabled}
              uploadReason={uploadReason}
              uploadBusy={uploadBusy}
              libraryError={libraryError}
              onInspect={inspectObject}
              onPlace={placePiece}
              onUnplace={unplaceObject}
              onPlaceCollection={(collection) => placeCollection(collection.sourceRef)}
              onUnplaceCollection={(collection) => unplaceCollection(collection.sourceRef)}
              onUpload={(file) => void uploadPrivateMedia(file)}
            />
          )}
          {sheetMode === "look" && (
            <StudioV3LookControls
              activeLookId={document.activeLookId}
              activeLookName={activeLook?.name ?? "Current Look"}
              activeRoomStyleId={activeRoom?.styleId ?? "gallery-wall"}
              compatibility={compatibility}
              lockedLayerCount={document.locks.length}
              structuralPreview={structuralPreview ? {
                targetStyleId: structuralPreview.targetStyleId,
                targetStyleName: structuralPreview.targetStyleName,
                compareSide: structuralPreview.compareSide,
                summary: structuralPreview.summary,
              } : null}
              namedLookName={namedLookName}
              hasNamedLooks={document.namedLooks.length > 0}
              latestNamedLookName={document.namedLooks[document.namedLooks.length - 1]?.name}
              hasStructuralSavepoint={document.savepoints.length > 0}
              activeLookValues={activeLookValues}
              motionLocked={motionLocked}
              onNamedLookNameChange={setNamedLookName}
              onApplyLook={applyLook}
              onStageRoomStyle={stageRoomStyle}
              onCompareSide={compareStructuralSide}
              onApplyStructural={applyStructuralPreview}
              onCancelStructural={cancelStructuralPreview}
              onLockMotion={lockMotion}
              onSaveNamedLook={saveNamedLook}
              onApplyFacet={applyVisualFacet}
              onRestoreNamedLook={restoreNamedLook}
              onRestoreStructural={restoreStructuralSavepoint}
            />
          )}
          {sheetMode === "review" && (
            <div className="studio-v3-review" data-testid="presence-studio-v3-review-readiness">
              <header>
                <p className="studio-v3-kicker">Review readiness · owner-private only</p>
                <h2>Review the private editor state</h2>
                <p>This M1 surface never sends a publish request. Publishing remains unavailable until a separate reviewed gate.</p>
              </header>
              <ul className="studio-v3-review-list">
                <li>{currentMetadataSignature === savedMetadataSignature ? "Private state matches the last durable save." : "Unsaved private changes remain."}</li>
                <li>{privateStateAvailable ? "Durable private save is available." : "Durable private save is currently disabled; use the status action above."}</li>
                <li>Visitor routes and public BBB payload remain unchanged by this review.</li>
                <li>Test as visitor uses the in-memory canvas only.</li>
              </ul>
              <div className="studio-v3-review-grid">
                <div>
                  <strong>Discard Local Changes</strong>
                  <small>Clears only this Presence/base browser snapshot, then reloads durable private state.</small>
                </div>
                <button
                  type="button"
                  onClick={() => void discardLocalChanges()}
                  disabled={privateStateSaving || uploadBusy || discardingLocal}
                  title={discardingLocal
                    ? "Discard is already waiting for the browser-local state lock."
                    : privateStateSaving || uploadBusy
                    ? "Wait for the current private save or upload to finish before discarding."
                    : ownerPartitionKey
                      ? "Discard this browser-local snapshot after confirmation."
                      : "Discard in-memory changes and reload durable/base state."}
                  data-testid="presence-studio-v3-discard-local"
                >
                  {discardingLocal ? "Discarding Local Changes..." : "Discard Local Changes"}
                </button>
              </div>
              <footer className="studio-v3-sheet-actions">
                <button type="button" className="studio-v3-primary" onClick={finishSheet}>Done reviewing</button>
                <button type="button" disabled title="Publish is outside the M1 private-state boundary.">Publish unavailable in M1</button>
              </footer>
            </div>
          )}
        </section>
      )}

      {!testAsVisitor && sheetMode === "closed" && !selectedPieceId && <button
        type="button"
        className="studio-v3-local-flag"
        onClick={() => {
          window.localStorage.removeItem(STUDIO_V3_BROWSER_PILOT_FLAG);
          window.location.reload();
        }}
      >
        Disable local pilot
      </button>}
    </main>
  );
}

function compatibilitySummaryFromDocument(document: StudioV3Document, roomId: string): StudioV3CompatibilitySummary {
  const room = document.rooms.find((candidate) => candidate.id === roomId);
  if (!room) return emptyCompatibilitySummary();
  const hiddenByEdit = (objectId: string) => {
    const context = findStudioV3ObjectContext(document, room.id, objectId);
    return Boolean(context && isStudioV3ObjectEffectivelyHidden(document, {
      roomId: room.id,
      objectId,
      sourceRef: context.sourceRef,
    }));
  };
  const hiddenBaseCount = room.baseObjectIds.filter(hiddenByEdit).length;
  const retainedPlacements = room.placements.filter((placement) => (
    placement.status === "shelved"
    || placement.status === "incompatible"
    || placement.visibility === "hidden"
    || hiddenByEdit(placement.id)
  ));
  const duplicate = room.placements.filter((placement) => placement.status === "duplicate").length;
  const incompatible = room.placements.filter((placement) => placement.status === "incompatible").length;
  const retained = hiddenBaseCount + retainedPlacements.length;
  const placed = room.baseObjectIds.length - hiddenBaseCount + room.placements.filter((placement) => (
    placement.status === "placed"
    && placement.visibility !== "hidden"
    && !hiddenByEdit(placement.id)
  )).length;
  const reasons = Array.from(new Set(room.placements
    .map((placement) => placement.reason?.trim())
    .filter((reason): reason is string => Boolean(reason))));
  if (hiddenBaseCount > 0 || retainedPlacements.some((placement) => (
    placement.visibility === "hidden" || hiddenByEdit(placement.id)
  ))) reasons.push("Hidden Pieces remain retained outside visitor-shaped output.");
  return {
    changed: 0,
    locksPreserved: 0,
    overridesPreserved: 0,
    moved: 0,
    placed,
    unplaced: retained,
    incompatible,
    overflow: reasons.filter((reason) => /overflow|capacity|bounded|limit/i.test(reason)).length,
    duplicate,
    retained,
    total: room.baseObjectIds.length + room.placements.length,
    reasons,
  };
}

function compatibilitySummaryFromStage(stage: StudioV3ReadyStructuralStage): StudioV3CompatibilitySummary {
  const accounting: Array<Record<string, unknown>> = stage.impact.accounting ?? [];
  const outcome = (item: Record<string, unknown>) => typeof item.outcome === "string" ? item.outcome : "";
  const reasons = Array.from(new Set(accounting
    .map((item): string => typeof item.reason === "string" ? item.reason.trim() : "")
    .filter((reason): reason is string => Boolean(reason))));
  const moved = accounting.filter((item) => {
    if (item.moved === true) return true;
    const before = firstString(item, ["beforeZoneId", "fromZoneId", "previousZoneId", "sourceZoneId"]);
    const after = firstString(item, ["afterZoneId", "toZoneId", "nextZoneId", "targetZoneId"]);
    return Boolean(before && after && before !== after);
  }).length;
  const placed = accounting.filter((item) => outcome(item) === "placed").length;
  const duplicate = accounting.filter((item) => outcome(item) === "duplicate").length;
  const explicitlyUnplaced = accounting.filter((item) => outcome(item) === "unplaced").length;
  const retained = accounting.filter((item) => outcome(item) === "shelved" || outcome(item) === "unplaced").length;
  const incompatible = accounting.filter((item) => {
    const reason = typeof item.reason === "string" ? item.reason : "";
    return item.compatible === false || /incompatible|cannot place|unsupported/i.test(reason);
  }).length;
  const overflow = accounting.filter((item) => {
    const reason = typeof item.reason === "string" ? item.reason : "";
    return item.overflow === true || /overflow|capacity|bounded|limit/i.test(reason);
  }).length;
  const changed = accounting.filter((item) => {
    if (item.changed === true || item.moved === true) return true;
    const beforeStatus = firstString(item, ["beforeStatus", "fromStatus", "previousStatus"]);
    const afterStatus = firstString(item, ["afterStatus", "toStatus", "nextStatus", "outcome"]);
    const beforeZone = firstString(item, ["beforeZoneId", "fromZoneId", "previousZoneId", "sourceZoneId"]);
    const afterZone = firstString(item, ["afterZoneId", "toZoneId", "nextZoneId", "targetZoneId"]);
    return Boolean((beforeStatus && afterStatus && beforeStatus !== afterStatus) || (beforeZone && afterZone && beforeZone !== afterZone));
  }).length;
  return {
    changed,
    locksPreserved: stage.impact.preservedByLock?.length ?? 0,
    overridesPreserved: stage.impact.preservedByOverride?.length ?? 0,
    moved,
    placed,
    unplaced: explicitlyUnplaced,
    incompatible,
    overflow,
    duplicate,
    retained,
    total: accounting.length,
    reasons,
  };
}

function firstString(item: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value) return value;
  }
  return undefined;
}

function emptyCompatibilitySummary(): StudioV3CompatibilitySummary {
  return {
    changed: 0,
    locksPreserved: 0,
    overridesPreserved: 0,
    moved: 0,
    placed: 0,
    unplaced: 0,
    incompatible: 0,
    overflow: 0,
    duplicate: 0,
    retained: 0,
    total: 0,
    reasons: [],
  };
}

function studioV3PrivateStateMatchesBase(state: StudioV3PrivateState, document: StudioV3Document): boolean {
  const identity = document.base.identity;
  return state.room_id === identity.roomId
    && state.metadata_schema_version === STUDIO_V3_PRIVATE_METADATA_SCHEMA_VERSION
    && state.base.config_id === identity.configId
    && state.base.source_kind === identity.sourceKind
    && state.base.status === identity.status
    && state.base.version === identity.version
    && state.base.revision === identity.revision
    && state.base.schema_version === identity.schemaVersion
    && state.base.fingerprint === document.base.fingerprint;
}

function restoreStudioV3LocalDocument(
  baseDocument: StudioV3Document,
  ownerPartitionKey: string,
  presenceId: number,
  serverMetadataRevision: number | null,
): {
  document: StudioV3Document;
  message: string;
  persistenceAvailable?: boolean;
  durableSaveBlocked?: boolean;
} {
  if (typeof window === "undefined") return { document: baseDocument, message: "Saved locally" };
  try {
    const expectedBase = {
      ownerPartitionKey,
      presenceId,
      baseIdentity: baseDocument.base.identity,
      baseFingerprint: baseDocument.base.fingerprint,
      roomIds: baseDocument.rooms.map((room) => room.id),
    };
    const recovered = readStudioV3LocalSnapshot({ storage: window.localStorage, expected: expectedBase });
    if (recovered.source === "unavailable") {
      return { document: baseDocument, message: "Memory-only local state", persistenceAvailable: false };
    }
    if (!recovered.snapshot) {
      return { document: baseDocument, message: "No complete local snapshot" };
    }
    const presenceEnvelope = recovered.snapshot.presence;
    if (serverMetadataRevision !== null && presenceEnvelope.metadataRevision !== serverMetadataRevision) {
      return { document: baseDocument, message: "Ignored stale browser-local snapshot" };
    }
    const restored = restoreStudioV3Metadata(baseDocument, presenceEnvelope.metadata);
    if (restored.report.status === "rejected") {
      return { document: baseDocument, message: "Rejected invalid browser-local snapshot" };
    }

    return {
      document: restored.document,
      durableSaveBlocked: restored.report.status === "partial",
      message: recovered.source === "previous"
        ? "Recovered previous complete browser-local snapshot"
        : restored.report.status === "exact"
          ? "Restored browser-local changes"
          : "Restored browser-local changes with missing references",
    };
  } catch {
    return { document: baseDocument, message: "Memory-only local state" };
  }
}

function studioV3OwnerLockName(ownerPartitionKey: string): string {
  return `presence-studio-v3:${ownerPartitionKey}:owner`;
}

function safeStudioV3OpenLink(value: string | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate || candidate.length > 2048 || /[\u0000-\u001f\u007f]/.test(candidate)) return null;
  if (candidate.startsWith("/")) {
    if (candidate.startsWith("//") || /^\/(?:api|studio)(?:\/|$)/i.test(candidate) || /(?:token|secret|preview)=/i.test(candidate)) return null;
    return candidate;
  }
  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol) || parsed.username || parsed.password) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function effectiveStudioV3LookValues(document: StudioV3Document): StudioV3LookValues {
  const active = document.looks[document.activeLookId]
    ?? document.namedLooks.find((look) => look.id === document.activeLookId)
    ?? STUDIO_V3_SOFT_EDITORIAL_LOOK;
  let values: StudioV3LookValues = { ...active.values };
  for (const override of document.layerOverrides) {
    if (override.scopeKind === "presence" && override.scopeId === String(document.nodeId)) {
      values = { ...values, ...override.value };
    }
  }
  for (const lock of document.locks) {
    if (
      lock.layer !== "motion-atmosphere" ||
      lock.scopeKind !== "presence" ||
      lock.scopeId !== String(document.nodeId) ||
      !lock.value ||
      typeof lock.value !== "object"
    ) continue;
    const locked = lock.value as Partial<StudioV3LookValues>;
    values = {
      ...values,
      ...(typeof locked.motionIntensity === "string" ? { motionIntensity: locked.motionIntensity } : {}),
      ...(typeof locked.background === "string" ? { background: locked.background } : {}),
    };
  }
  return values;
}
