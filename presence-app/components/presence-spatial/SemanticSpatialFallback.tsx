"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import type { SpatialActionRef, SpatialRenderPlan } from "@/lib/presence/spatial/model";
import {
  buildSemanticSpatialRows,
  resolveSpatialMediaSource,
  type SafeSpatialMediaLocatorMap,
  type SpatialRendererFallbackReason,
} from "@/lib/presence/spatial/rendererAdapter";
import styles from "./SpatialRoomViewport.module.css";

export interface SemanticSpatialFallbackProps {
  plan: SpatialRenderPlan;
  reason: SpatialRendererFallbackReason | "capability-check";
  selectedPlacementId?: string;
  activeStateId?: string;
  status?: string;
  variant?: "fallback" | "details";
  onAction: (action: SpatialActionRef, ownerPlacementId: string) => void;
  mediaLocators?: SafeSpatialMediaLocatorMap;
}

const reasonCopy: Record<SemanticSpatialFallbackProps["reason"], string> = {
  "capability-check": "The spatial room is preparing. Every Piece and Action remains available below.",
  mobile: "This compact view keeps every Piece and Action available without loading the 3D room.",
  "reduced-motion": "Reduced-motion is enabled, so the room is presented as a static semantic collection.",
  "webgl-unavailable": "3D graphics are unavailable in this browser, so the complete semantic room is shown.",
  "runtime-failure": "The 3D context stopped responding. The complete semantic room remains available.",
};

export function SemanticSpatialFallback({
  plan,
  reason,
  selectedPlacementId,
  activeStateId,
  status,
  variant = "fallback",
  onAction,
  mediaLocators = {},
}: SemanticSpatialFallbackProps) {
  const rows = buildSemanticSpatialRows(plan);
  const focusedRowRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (selectedPlacementId) focusedRowRef.current?.focus({ preventScroll: true });
  }, [selectedPlacementId]);

  return (
    <section
      className={styles.semanticFallback}
      data-fallback-reason={reason}
      data-active-state={activeStateId}
      data-semantic-variant={variant}
      data-testid="presence-spatial-semantic-fallback"
      aria-label="Spatial room accessible view"
    >
      {variant === "fallback" && plan.fallbackPresentation ? (
        <BrandedStaticFallback
          mediaLocators={mediaLocators}
          plan={plan}
        />
      ) : null}
      <div className={styles.semanticIntro}>
        <p className={styles.eyebrow}>Accessible room view</p>
        <p>{variant === "details" ? "Keyboard-accessible details remain available alongside the interactive room." : reasonCopy[reason]}</p>
        {status ? <p className={styles.semanticStatus} role="status">{status}</p> : null}
      </div>

      <ol className={styles.semanticList}>
        {rows.map((row) => (
          <li
            className={styles.semanticItem}
            data-selected={row.placementId === selectedPlacementId || undefined}
            data-testid={`presence-spatial-semantic-item-${row.placementId}`}
            key={row.placementId}
            ref={row.placementId === selectedPlacementId ? focusedRowRef : undefined}
            tabIndex={row.placementId === selectedPlacementId ? -1 : undefined}
          >
            <div>
              <h3>{row.label}</h3>
              {row.description ? <p>{row.description}</p> : null}
              {row.mediaAlt ? <p className={styles.mediaAlt}>Media: {row.mediaAlt}</p> : null}
            </div>
            {row.actions.length > 0 ? (
              <div className={styles.semanticActions} aria-label={`Actions for ${row.label}`}>
                {row.actions.map((action) => isLinkLikeAction(action) ? (
                  <a
                    data-testid={`presence-spatial-semantic-action-${row.placementId}-${action.id}`}
                    href={action.href}
                    key={action.id}
                    onClick={(event) => {
                      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                      event.preventDefault();
                      onAction(action, row.placementId);
                    }}
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    {action.label}
                  </a>
                ) : (
                  <button
                    data-testid={`presence-spatial-semantic-action-${row.placementId}-${action.id}`}
                    disabled={action.kind === "disabled-placeholder"}
                    key={action.id}
                    onClick={() => onAction(action, row.placementId)}
                    type="button"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

function isLinkLikeAction(action: SpatialActionRef): action is Extract<SpatialActionRef, { href: string }> {
  return action.kind === "open-link" || action.kind === "listen" || action.kind === "watch" || action.kind === "enquire";
}

function BrandedStaticFallback({
  plan,
  mediaLocators,
}: {
  plan: SpatialRenderPlan;
  mediaLocators: SafeSpatialMediaLocatorMap;
}) {
  const presentation = plan.fallbackPresentation;
  const [failedMedia, setFailedMedia] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    setFailedMedia(new Set());
  }, [plan.fingerprint, mediaLocators]);
  if (!presentation) return null;
  const brandSource = resolveSpatialMediaSource(presentation.brandMedia, mediaLocators);
  const heroSource = resolveSpatialMediaSource(presentation.heroMedia, mediaLocators);
  const canShowBrand = Boolean(brandSource && presentation.brandMedia && !failedMedia.has(presentation.brandMedia.id));
  const canShowHero = Boolean(heroSource && presentation.heroMedia && !failedMedia.has(presentation.heroMedia.id));
  const markFailed = (mediaId: string) => setFailedMedia((current) => new Set([...current, mediaId]));

  return (
    <header
      className={styles.staticFallback}
      data-testid="presence-spatial-branded-fallback"
      style={{
        "--spatial-fallback-accent": presentation.accentColor,
        "--spatial-fallback-background": presentation.backgroundColor,
      } as CSSProperties}
    >
      <div className={styles.staticFallbackCopy}>
        <p>{presentation.eyebrow}</p>
        {canShowBrand ? (
          <img
            alt={presentation.brandMedia!.alt}
            className={styles.staticFallbackBrand}
            onError={() => markFailed(presentation.brandMedia!.id)}
            src={brandSource!}
          />
        ) : null}
        <h2>{presentation.title}</h2>
        <p>{presentation.summary}</p>
      </div>
      {canShowHero ? (
        <img
          alt={presentation.heroMedia!.alt}
          className={styles.staticFallbackHero}
          onError={() => markFailed(presentation.heroMedia!.id)}
          src={heroSource!}
        />
      ) : (
        <div aria-label="Room media unavailable; semantic room remains complete." className={styles.staticFallbackHonest} role="img" />
      )}
    </header>
  );
}
