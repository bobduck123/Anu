"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import type { SpatialActionRef, SpatialRenderPlan } from "@/lib/presence/spatial/model";
import {
  collectSpatialActions,
  cycleProjectionPlacement,
  deriveSafeSpatialMediaLocators,
  resolveSpatialActionIntent,
  resolveSpatialSceneState,
  selectSpatialRendererLane,
  type SafeSpatialMediaLocatorMap,
  type SpatialRendererCapabilities,
} from "@/lib/presence/spatial/rendererAdapter";
import { SemanticSpatialFallback } from "./SemanticSpatialFallback";
import styles from "./SpatialRoomViewport.module.css";

const LazyThreeSpatialRenderer = dynamic(
  () => import("./ThreeSpatialRenderer").then((module) => module.ThreeSpatialRenderer),
  {
    ssr: false,
    loading: () => (
      <div className={styles.threeLoading} data-testid="presence-spatial-three-loading" role="status">
        Loading interactive room…
      </div>
    ),
  },
);

export interface SpatialRoomViewportProps {
  plan: SpatialRenderPlan;
  mediaLocators?: SafeSpatialMediaLocatorMap;
  initialStateId?: string;
  className?: string;
  ariaLabel?: string;
  onAction?: (action: SpatialActionRef, ownerPlacementId: string) => void;
  onSelectionChange?: (placementId: string | undefined) => void;
}

export function SpatialRoomViewport({
  plan,
  mediaLocators,
  initialStateId,
  className,
  ariaLabel = "Internal spatial room preview",
  onAction,
  onSelectionChange,
}: SpatialRoomViewportProps) {
  const derivedMediaLocators = useMemo(
    () => deriveSafeSpatialMediaLocators(plan.assets),
    // Assets participate in the complete plan fingerprint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan.fingerprint],
  );
  const resolvedMediaLocators = mediaLocators ?? derivedMediaLocators;
  const [capabilities, setCapabilities] = useState<SpatialRendererCapabilities>();
  const [runtimeFailed, setRuntimeFailed] = useState(false);
  const [activeStateId, setActiveStateId] = useState(
    () => resolveSpatialSceneState(plan, initialStateId).id,
  );
  const [selectedPlacementId, setSelectedPlacementId] = useState<string>();
  const [actionStatus, setActionStatus] = useState("");
  const resetKey = `${plan.fingerprint}\u0000${initialStateId ?? ""}`;
  const previousResetKeyRef = useRef(resetKey);
  const actionEntries = useMemo(() => collectSpatialActions(plan), [plan]);
  const reducedStateIds = useMemo(
    () => new Set(plan.states.flatMap((state) => (state.reducedMotionStateId ? [state.reducedMotionStateId] : []))),
    [plan],
  );
  const navigableStates = useMemo(
    () => plan.states.filter((state) => !reducedStateIds.has(state.id)),
    [plan.states, reducedStateIds],
  );

  useEffect(() => {
    setActiveStateId(resolveSpatialSceneState(plan, initialStateId).id);
    setSelectedPlacementId(undefined);
    setRuntimeFailed(false);
    setActionStatus("");
    if (previousResetKeyRef.current !== resetKey) {
      previousResetKeyRef.current = resetKey;
      onSelectionChange?.(undefined);
    }
    // The complete plan fingerprint plus requested initial state define a reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setCapabilities({
        mobile: mobileQuery.matches,
        reducedMotion: reducedMotionQuery.matches,
        webglAvailable: detectWebGlAvailable(),
      });
    };
    update();
    mobileQuery.addEventListener("change", update);
    reducedMotionQuery.addEventListener("change", update);
    return () => {
      mobileQuery.removeEventListener("change", update);
      reducedMotionQuery.removeEventListener("change", update);
    };
  }, []);

  const selectPlacement = useCallback(
    (placementId: string | undefined) => {
      setSelectedPlacementId(placementId);
      onSelectionChange?.(placementId);
    },
    [onSelectionChange],
  );

  const handleAction = useCallback(
    (action: SpatialActionRef, ownerPlacementId: string) => {
      onAction?.(action, ownerPlacementId);
      const intent = resolveSpatialActionIntent(action, ownerPlacementId);
      switch (intent.kind) {
        case "inspect": {
          selectPlacement(intent.placementId);
          const item = plan.items.find((candidate) => candidate.placementId === intent.placementId);
          setActionStatus(item ? `Inspecting ${item.semanticLabel}.` : "Inspecting selected Piece.");
          break;
        }
        case "navigate-state": {
          const state = plan.states.find((candidate) => candidate.id === intent.stateId);
          if (state) {
            setActiveStateId(state.id);
            selectPlacement(state.focusPlacementId ?? ownerPlacementId);
            const focus = state.focusPlacementId
              ? plan.items.find((item) => item.placementId === state.focusPlacementId)?.semanticLabel
              : undefined;
            setActionStatus(
              focus ? `View changed to ${state.label}. Focused ${focus}.` : `View changed to ${state.label}.`,
            );
          }
          break;
        }
        case "sequence":
          setSelectedPlacementId((current) => {
            const next = cycleProjectionPlacement(plan, current, intent.direction, activeStateId);
            onSelectionChange?.(next);
            return next;
          });
          setActionStatus(intent.direction === 1 ? "Showing the next projection." : "Showing the previous projection.");
          break;
        case "disabled":
          setActionStatus(intent.reason);
          break;
      }
    },
    [activeStateId, onAction, onSelectionChange, plan, selectPlacement],
  );

  const handleItemActivate = useCallback(
    (placementId: string) => {
      const item = plan.items.find((candidate) => candidate.placementId === placementId);
      const action = item?.actions.find((candidate) => candidate.kind === "inspect") ?? item?.actions[0];
      if (action) handleAction(action, placementId);
      else if (item?.category === "piece") selectPlacement(placementId);
    },
    [handleAction, plan.items, selectPlacement],
  );

  const selection = selectedPlacementId
    ? plan.items.find((item) => item.placementId === selectedPlacementId)
    : undefined;
  const lane = capabilities
    ? selectSpatialRendererLane({ ...capabilities, runtimeFailed })
    : undefined;

  return (
    <section
      aria-label={ariaLabel}
      className={[styles.viewport, className].filter(Boolean).join(" ")}
      data-renderer-lane={lane?.lane ?? "checking"}
      data-testid="presence-spatial-room-viewport"
    >
      {lane?.lane === "three" ? (
        <div className={styles.canvasStage}>
          <SpatialRendererErrorBoundary
            onError={() => setRuntimeFailed(true)}
            resetKey={plan.fingerprint}
          >
            <LazyThreeSpatialRenderer
              activeStateId={activeStateId}
              mediaLocators={resolvedMediaLocators}
              onItemActivate={handleItemActivate}
              onRuntimeFailure={() => setRuntimeFailed(true)}
              plan={plan}
              selectedPlacementId={selectedPlacementId}
            />
          </SpatialRendererErrorBoundary>

          <nav aria-label="Room viewpoints" className={styles.stateControls}>
            {navigableStates.map((state) => (
              <button
                aria-pressed={activeStateId === state.id}
                data-testid={`presence-spatial-state-${state.id}`}
                key={state.id}
                onClick={() => {
                  setActiveStateId(state.id);
                  selectPlacement(state.focusPlacementId);
                  const focus = state.focusPlacementId
                    ? plan.items.find((item) => item.placementId === state.focusPlacementId)?.semanticLabel
                    : undefined;
                  setActionStatus(
                    focus ? `View changed to ${state.label}. Focused ${focus}.` : `View changed to ${state.label}.`,
                  );
                }}
                type="button"
              >
                {state.label}
              </button>
            ))}
          </nav>

          {selection ? (
            <aside className={styles.inspectionCard} data-testid="presence-spatial-inspection-card">
              <p className={styles.eyebrow}>Inspecting Piece</p>
              <h3>{selection.semanticLabel}</h3>
              {selection.media?.alt ? <p>{selection.media.alt}</p> : null}
              <button onClick={() => selectPlacement(undefined)} type="button">Close inspection</button>
            </aside>
          ) : null}
        </div>
      ) : (
        <SemanticSpatialFallback
          activeStateId={activeStateId}
          onAction={handleAction}
          plan={plan}
          reason={lane?.reason ?? "capability-check"}
          selectedPlacementId={selectedPlacementId}
          status={actionStatus}
        />
      )}

      {lane?.lane === "three" ? (
        <>
          <div className={styles.actionTray} aria-label="Room actions">
            {actionEntries.map(({ action, ownerPlacementId }) => (
              <button
                data-testid={`presence-spatial-action-${action.id}`}
                disabled={action.kind === "disabled-placeholder"}
                key={action.id}
                onClick={() => handleAction(action, ownerPlacementId)}
                type="button"
              >
                {action.label}
              </button>
            ))}
          </div>
          <div className={styles.semanticCompanion}>
            <SemanticSpatialFallback
              activeStateId={activeStateId}
              onAction={handleAction}
              plan={plan}
              reason="capability-check"
              selectedPlacementId={selectedPlacementId}
              status={actionStatus}
              variant="details"
            />
          </div>
        </>
      ) : null}
      {lane?.lane !== "three" ? (
        <p aria-live="polite" className={styles.actionStatus}>{actionStatus}</p>
      ) : null}
    </section>
  );
}

interface SpatialRendererErrorBoundaryProps {
  children: ReactNode;
  onError: () => void;
  resetKey: string;
}

class SpatialRendererErrorBoundary extends Component<
  SpatialRendererErrorBoundaryProps,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    this.props.onError();
  }

  componentDidUpdate(previousProps: SpatialRendererErrorBoundaryProps) {
    if (this.state.failed && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ failed: false });
    }
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function detectWebGlAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const context =
      canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true }) ??
      canvas.getContext("webgl", { failIfMajorPerformanceCaveat: true });
    if (!context) return false;
    context.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}
