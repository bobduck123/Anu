"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PresenceStudioV2PublicRoom from "@/components/presence-studio-v2/PresenceStudioV2PublicRoom";
import { Loading } from "@/components/ui";
import { getPresenceEditor } from "@/lib/api/editor";
import type { PresenceEditableConfig, PresenceEditorOverview, PresenceNode } from "@/lib/api/types";
import { studioV2FromPresenceConfig } from "@/lib/presence/studio-v2";
import { createClient } from "@/lib/supabase/client";
import {
  STUDIO_V3_BROWSER_PILOT_FLAG,
  STUDIO_V3_NOCTURNAL_GALLERY_LOOK,
  STUDIO_V3_SOFT_EDITORIAL_LOOK,
  applyStudioV3Look,
  compileStudioV3Document,
  containsForbiddenLocalValue,
  createStudioV3BaseSnapshot,
  deriveStudioV3OwnerPartitionKey,
  hydrateStudioV3Document,
  lockStudioV3Layer,
  makeStudioV3ObjectId,
  placeStudioV3Collection,
  placeStudioV3Piece,
  clearStudioV3LocalStateForOwnerPartition,
  pruneStudioV3LocalEnvelopesForOwnerSwitch,
  readStudioV3LocalSnapshot,
  saveStudioV3NamedLook,
  writeStudioV3LocalSnapshot,
  validateStudioV2EditorBridgeResult,
  type PresenceStudioV2EditorBridge,
  type PresenceStudioV2EditorIntent,
  type PresenceStudioV2EditorResult,
  type StudioV3Document,
  type StudioV3Placement,
  type StudioV3SourceRef,
} from "@/lib/presence/studio-v3";
import StudioV3Home from "./StudioV3Home";
import "./presence-studio-v3.css";

type SheetMode = "closed" | "piece" | "shelf" | "look";
const STUDIO_V3_MEMORY_ONLY_SESSION_KEY = "presence-studio-v3:memory-only";

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
  const sheetRef = useRef<HTMLElement | null>(null);
  const sheetCloseRef = useRef<HTMLButtonElement | null>(null);
  const authenticatedSubjectRef = useRef<string | null>(authenticatedSubject);
  const pendingOwnerSubjectRef = useRef<string | null>(authenticatedSubject);
  const ownerPartitionKeyRef = useRef<string | null>(null);
  const lastKnownOwnerPartitionRef = useRef<string | null>(null);
  const loadEpochRef = useRef(0);
  const localPersistenceDisabledRef = useRef(false);

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
      if (opener && domDocument.contains(opener)) opener.focus();
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
    const loadEpoch = loadEpochRef.current;
    const isCurrentLoad = () => alive && loadEpochRef.current === loadEpoch;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const nextOverview = await getPresenceEditor(nodeId, token);
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
          works: node.works ?? node.gallery_items ?? [],
          collections: node.collections ?? [],
        });
        const partition = await deriveStudioV3OwnerPartitionKey({
          deploymentScope: window.location.host || "local",
          validatedOwnerSubject: authenticatedSubject,
        });
        if (!isCurrentLoad()) return;
        lastKnownOwnerPartitionRef.current = partition?.key ?? null;
        const persistenceKey = base.localPersistence === "available" && !localPersistenceDisabledRef.current ? partition?.key ?? null : null;
        let safePersistenceKey = persistenceKey;
        let restored: { document: StudioV3Document; message: string; persistenceAvailable?: boolean } = {
          document: hydrated,
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
                  roomIds: hydrated.rooms.map((room) => room.id),
                },
              });
              return restoreStudioV3LocalDocument(hydrated, safePersistenceKey!, nodeId);
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
        if (!isCurrentLoad()) return;
        setOverview(nextOverview);
        setBaseConfig(selectedConfig);
        setDocument(restored.document);
        setOwnerPartitionKey(safePersistenceKey);
        ownerPartitionKeyRef.current = safePersistenceKey;
        setLastAction(safePersistenceKey ? restored.message : "Memory-only local state");
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
  }, [node, nodeId, token]);

  useEffect(() => {
    if (!document || !ownerPartitionKey) return;
    if (document.base.localPersistence !== "available") {
      setLastAction("Memory-only local state");
      return;
    }
    let cancelled = false;
    const writeEpoch = loadEpochRef.current;
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
      if (cancelled || loadEpochRef.current !== writeEpoch) return;
      const now = new Date().toISOString();
      const presencePayload = {
        schemaVersion: document.schemaVersion,
        ownerPartitionKey,
        scope: "presence" as const,
        presenceId: nodeId,
        baseIdentity: document.base.identity,
        baseFingerprint: document.base.fingerprint,
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
  }, [document, nodeId, ownerPartitionKey]);

  const compiled = useMemo(() => {
    if (!document || !baseConfig) return null;
    const baseState = studioV2FromPresenceConfig(baseConfig, node);
    return compileStudioV3Document(document, baseState);
  }, [baseConfig, document, node]);

  const selectedPiece = useMemo(() => {
    if (!compiled || !selectedPieceId) return null;
    return compiled.publicRoom.chambers.flatMap((room) => room.objects).find((object) => object.id === selectedPieceId) ?? null;
  }, [compiled, selectedPieceId]);

  const bridge = useMemo<PresenceStudioV2EditorBridge>(() => ({
    handleIntent(intent: PresenceStudioV2EditorIntent): PresenceStudioV2EditorResult {
      let result: PresenceStudioV2EditorResult;
      if (intent.kind === "activate-piece") {
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
  }), []);

  const placeFirstPiece = useCallback(() => {
    setDocument((current) => {
      if (!current) return current;
      const activeRoom = current.rooms.find((room) => room.id === current.activeRoomId);
      const workRef = Object.entries(current.pieces).find(([key, piece]) => (
        key.startsWith("work:") &&
        piece.sourceStatus === "current" &&
        (!activeRoom || piece.compatibleRoomStyles.includes(activeRoom.styleId))
      ))?.[0] as StudioV3SourceRef | undefined;
      if (!workRef) return current;
      setLastAction("Piece placed locally");
      return placeStudioV3Piece(current, current.activeRoomId, workRef);
    });
  }, []);

  const placeFirstCollection = useCallback(() => {
    setDocument((current) => {
      if (!current) return current;
      const collectionRef = Object.keys(current.collections)[0];
      if (!collectionRef) return current;
      setLastAction("Collection placed locally");
      return placeStudioV3Collection(current, current.activeRoomId, collectionRef as `collection:${number}`);
    });
  }, []);

  const applyLook = useCallback((lookId: "soft-editorial" | "nocturnal-gallery") => {
    setDocument((current) => current ? applyStudioV3Look(current, lookId) : current);
    setLastAction(lookId === "soft-editorial" ? "Soft Editorial applied locally" : "Nocturnal Gallery applied locally");
  }, []);

  const lockMotion = useCallback(() => {
    setDocument((current) => {
      if (!current) return current;
      const activeLook = current.looks[current.activeLookId] ?? current.namedLooks.find((look) => look.id === current.activeLookId);
      const values = activeLook?.values ?? STUDIO_V3_SOFT_EDITORIAL_LOOK.values;
      return lockStudioV3Layer(current, {
      scopeKind: "presence",
      scopeId: String(nodeId),
      layer: "motion-atmosphere",
      value: { motionIntensity: values.motionIntensity, background: values.background },
      reason: "P0 lock preserving a visible motion/atmosphere choice.",
    });
    });
    setLastAction("Motion / Atmosphere locked locally");
  }, [nodeId]);

  const saveNamedLook = useCallback(() => {
    if (containsForbiddenLocalValue(namedLookName)) {
      setLastAction("Named Look name rejected");
      return;
    }
    setDocument((current) => current ? saveStudioV3NamedLook(current, namedLookName) : current);
    setLastAction("Named Look saved locally");
  }, [namedLookName]);

  const restoreNamedLook = useCallback(() => {
    setDocument((current) => {
      if (!current || current.namedLooks.length === 0) return current;
      const named = current.namedLooks[current.namedLooks.length - 1];
      setLastAction("Named Look restored locally");
      return applyStudioV3Look(current, named.id);
    });
  }, []);

  if (loading) return <Loading label="Opening Studio V3 local pilot..." />;
  if (error || !compiled || !document || !overview) {
    return (
      <main className="studio-v3-shell studio-v3-error">
        <p>{error || "Studio V3 is unavailable."}</p>
      </main>
    );
  }

  const workSourceRefs = Object.keys(document.pieces).filter((key) => key.startsWith("work:"));
  const collectionRefs = Object.keys(document.collections);
  const activeCollection = collectionRefs[0] ? document.collections[collectionRefs[0]] : null;
  const activeRoom = document.rooms.find((room) => room.id === document.activeRoomId) ?? document.rooms[0];
  const placedCount = activeRoom?.placements.filter((placement) => placement.status === "placed").length ?? 0;
  const duplicateCount = activeRoom?.placements.filter((placement) => placement.status === "duplicate").length ?? 0;
  const incompatibleCount = activeRoom?.placements.filter((placement) => placement.status === "incompatible").length ?? 0;
  const shelvedCount = activeRoom?.placements.filter((placement) => placement.status === "shelved").length ?? 0;

  return (
    <main
      className={`studio-v3-shell${testAsVisitor ? " is-testing-visitor" : ""}`}
      data-testid="presence-studio-v3-shell"
      onKeyDownCapture={(event) => {
        if (testAsVisitor || sheetMode !== "closed" || event.key !== "Escape" || !selectedPieceId) return;
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
      {!testAsVisitor && <header className="studio-v3-topbar">
        <button type="button" onClick={() => setHomeOpen((open) => !open)} aria-label="Studio Home">
          Home
        </button>
        <div>
          <strong>{node.display_name}</strong>
          <span>{lastAction}</span>
        </div>
        <nav aria-label="Studio V3 top actions">
          <button type="button" onClick={() => setSheetMode("shelf")} data-testid="presence-studio-v3-shelf-trigger">
            Pieces
          </button>
          <button type="button" onClick={() => setSheetMode("look")} data-testid="presence-studio-v3-look-trigger">
            Look
          </button>
          <button
            type="button"
            onClick={() => {
              setHomeOpen(false);
              setSheetMode("closed");
              setSelectedPieceId(null);
              setTestAsVisitor(true);
            }}
            data-testid="presence-studio-v3-test-visitor"
          >
            Test as visitor
          </button>
          <button type="button" disabled title="Server Visitor Preview requires a separately approved atomic draft save.">
            Visitor Preview
          </button>
        </nav>
      </header>}

      {!testAsVisitor && homeOpen && (
        <StudioV3Home
          node={node}
          status={overview.draft ? "Draft base loaded; prototype changes are browser-local." : "Published base loaded; prototype changes are browser-local."}
          onEdit={() => setHomeOpen(false)}
          onTestVisitor={() => {
            setHomeOpen(false);
            setTestAsVisitor(true);
          }}
        />
      )}

      <section className="studio-v3-canvas" data-testid="presence-studio-v3-public-room-canvas">
        <PresenceStudioV2PublicRoom room={compiled.publicRoom} editorBridge={testAsVisitor ? undefined : bridge} />
      </section>

      {testAsVisitor && (
        <button
          type="button"
          className="studio-v3-visitor-exit"
          data-testid="presence-studio-v3-back-to-editor"
          onClick={() => setTestAsVisitor(false)}
        >
          Back to editor
        </button>
      )}

      {!testAsVisitor && selectedPiece && (
        <div className="studio-v3-action-bar" data-testid="presence-studio-v3-action-bar">
          <span>{selectedPiece.title}</span>
          <button type="button" onClick={() => setSheetMode("piece")}>Edit</button>
          <button type="button" onClick={() => setSheetMode("shelf")}>Pieces</button>
          <button type="button" onClick={() => setSheetMode("look")}>Look</button>
          <button type="button" onClick={() => setSheetMode("piece")} data-testid="presence-studio-v3-more-action">More</button>
          <button type="button" onClick={() => window.open(selectedPiece.link || "#", "_blank", "noopener,noreferrer")} disabled={!selectedPiece.link}>
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
          <button ref={sheetCloseRef} type="button" className="studio-v3-sheet-close" onClick={() => setSheetMode("closed")} aria-label="Close sheet">
            Close
          </button>
          {sheetMode === "piece" && (
            <div>
              <p className="studio-v3-kicker">Piece</p>
              <h2>{selectedPiece?.title ?? "Selected Piece"}</h2>
              <p>{selectedPiece?.detail || "Local P0 editing keeps renderer-visible content in memory."}</p>
            </div>
          )}
          {sheetMode === "shelf" && (
            <div data-testid="presence-studio-v3-piece-shelf">
              <p className="studio-v3-kicker">Piece Shelf</p>
              <h2>Library</h2>
              <div className="studio-v3-shelf-grid">
                <article>
                  <span>Pieces</span>
                  <strong>{workSourceRefs.length}</strong>
                  <button type="button" onClick={placeFirstPiece} disabled={workSourceRefs.length === 0} data-testid="presence-studio-v3-place-piece">
                    Add to this Room
                  </button>
                </article>
                <article>
                  <span>Collections</span>
                  <strong>{activeCollection?.title ?? "None"}</strong>
                  <button type="button" onClick={placeFirstCollection} disabled={!activeCollection} data-testid="presence-studio-v3-place-collection">
                    Place Collection
                  </button>
                </article>
                <article data-testid="presence-studio-v3-placement-summary">
                  <span>Placement summary</span>
                  <strong>{placedCount} placed</strong>
                  <small>{duplicateCount} duplicate, {incompatibleCount + shelvedCount} shelved</small>
                </article>
                <article data-testid="presence-studio-v3-retained-placements">
                  <span>Retained Pieces</span>
                  <strong>{activeRoom.placements.length}</strong>
                  <ul>
                    {activeRoom.placements.map((placement) => (
                      <li key={`${placement.id}:${placement.status}:${placement.order}`}>
                        <span>{document.pieces[placement.sourceRef]?.title ?? placement.sourceRef}</span>
                        <small>{placement.status}{placement.reason ? ` - ${placement.reason}` : ""}</small>
                      </li>
                    ))}
                  </ul>
                </article>
              </div>
            </div>
          )}
          {sheetMode === "look" && (
            <div data-testid="presence-studio-v3-look-controls">
              <p className="studio-v3-kicker">Look</p>
              <h2>{document.looks[document.activeLookId]?.name ?? "Current Look"}</h2>
              <div className="studio-v3-look-grid">
                <label className="studio-v3-look-name">
                  <span>Look name</span>
                  <input
                    value={namedLookName}
                    onChange={(event) => setNamedLookName(event.target.value)}
                    data-testid="presence-studio-v3-named-look-name"
                  />
                </label>
                <button type="button" onClick={() => applyLook("soft-editorial")} data-testid="presence-studio-v3-apply-soft-editorial">
                  {STUDIO_V3_SOFT_EDITORIAL_LOOK.name}
                </button>
                <button type="button" onClick={() => applyLook("nocturnal-gallery")} data-testid="presence-studio-v3-apply-nocturnal-gallery">
                  {STUDIO_V3_NOCTURNAL_GALLERY_LOOK.name}
                </button>
                <button type="button" onClick={lockMotion} data-testid="presence-studio-v3-lock-layer">
                  Lock motion
                </button>
                <button type="button" onClick={saveNamedLook} data-testid="presence-studio-v3-save-named-look">
                  Save as Look
                </button>
                <button type="button" onClick={() => applyLook("nocturnal-gallery")}>
                  Alter
                </button>
                <button type="button" onClick={restoreNamedLook} disabled={document.namedLooks.length === 0} data-testid="presence-studio-v3-restore-named-look">
                  Restore
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {!testAsVisitor && <button
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

function restoreStudioV3LocalDocument(
  baseDocument: StudioV3Document,
  ownerPartitionKey: string,
  presenceId: number,
): { document: StudioV3Document; message: string; persistenceAvailable?: boolean } {
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
    const restoredActiveRoomId = presenceEnvelope.activeRoomId && baseDocument.rooms.some((room) => room.id === presenceEnvelope.activeRoomId)
      ? presenceEnvelope.activeRoomId
      : baseDocument.activeRoomId;
    let next = baseDocument;
    const namedLooks = presenceEnvelope.namedLooks;
    const namedLookMap = Object.fromEntries(namedLooks.map((look) => [look.id, look]));
    const restoredLookId = presenceEnvelope.activeLookId;
    const activeLookId: StudioV3Document["activeLookId"] = restoredLookId && (next.looks[restoredLookId] || namedLookMap[restoredLookId])
      ? restoredLookId as StudioV3Document["activeLookId"]
      : next.activeLookId;
    next = {
      ...next,
      mode: presenceEnvelope.mode,
      activeRoomId: restoredActiveRoomId,
      activeLookId: activeLookId ?? next.activeLookId,
      namedLooks,
      looks: { ...next.looks, ...namedLookMap },
      locks: [
        ...next.locks.filter((lock) => lock.scopeKind !== "presence"),
        ...presenceEnvelope.locks,
      ],
    };
    next = applyStudioV3Look(next, activeLookId ?? next.activeLookId);

    for (const roomEnvelope of recovered.snapshot.rooms) {
      const room = next.rooms.find((candidate) => candidate.id === roomEnvelope.roomId);
      if (!room || !roomEnvelope.placements) return { document: baseDocument, message: "Memory-only local state" };
      const safePlacements = roomEnvelope.placements
        .map((placement) => normalizeRestoredPlacement(next, room.id, placement))
        .filter((placement): placement is StudioV3Placement => Boolean(placement))
        .sort((a, b) => a.order - b.order);
      next = {
        ...next,
        rooms: next.rooms.map((candidate) => (
          candidate.id === room.id
            ? { ...candidate, placements: safePlacements }
            : candidate
        )),
        locks: [
          ...next.locks.filter((lock) => !(lock.scopeKind === "room" && lock.scopeId === room.id)),
          ...roomEnvelope.locks,
        ],
      };
    }

    return {
      document: next,
      message: recovered.source === "previous"
        ? "Recovered previous complete browser-local snapshot"
        : "Restored browser-local changes",
    };
  } catch {
    return { document: baseDocument, message: "Memory-only local state" };
  }
}

function studioV3OwnerLockName(ownerPartitionKey: string): string {
  return `presence-studio-v3:${ownerPartitionKey}:owner`;
}

function normalizeRestoredPlacement(
  document: StudioV3Document,
  roomId: string,
  placement: StudioV3Placement,
): StudioV3Placement | null {
  if (placement.roomId !== roomId) return null;
  const room = document.rooms.find((item) => item.id === roomId);
  const piece = document.pieces[placement.sourceRef];
  if (!room || !piece) return null;
  const id = makeStudioV3ObjectId(roomId, placement.sourceRef);
  const basePlacement = { ...placement, id, roomId };
  if (piece.sourceStatus !== "current") {
    return {
      ...basePlacement,
      status: "shelved",
      reason: "This Piece is hidden or unavailable in the owner Library.",
    };
  }
  if (!piece.compatibleRoomStyles.includes(room.styleId)) {
    return {
      ...basePlacement,
      status: "incompatible",
      reason: "This room style cannot place this media yet.",
    };
  }
  if (placement.status !== "placed") return basePlacement;
  return { ...basePlacement, status: "placed", reason: undefined };
}
