"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  getStudioV2DefaultChamber,
  getStudioV2EntryChamber,
  getStudioV2PublicChambersByRole,
} from "@/lib/presence/studio-v2";
import type { StudioV2PublicChamber, StudioV2PublicObject, StudioV2PublicRoom, StudioV2Skin } from "@/lib/presence/studio-v2";
import type { PresenceStudioV2EditorBridge, PresenceStudioV2EditorActivationInput } from "@/lib/presence/studio-v3/editorBridge";
import { validateStudioV2EditorBridgeResult } from "@/lib/presence/studio-v3/editorBridge";
import { deriveStudioV2Environment } from "@/lib/presence/studio-v2/environment";
import { normalizeStudioV2Composition, studioV2Layout } from "@/lib/presence/studio-v2/layouts";
import { WORLD_KITS } from "./worlds";
import BbbVisionCanvasGallery from "./BbbVisionCanvasGallery";
import PresenceStudioV2EnvironmentLayer from "./PresenceStudioV2EnvironmentLayer";
import "./presence-studio-v2-public.css";

interface PresenceStudioV2PublicRoomProps {
  room: StudioV2PublicRoom;
  editorBridge?: PresenceStudioV2EditorBridge;
  editorActiveChamberId?: string;
  inMemoryVisualPreview?: boolean;
}

export default function PresenceStudioV2PublicRoom({
  room,
  editorBridge,
  editorActiveChamberId,
  inMemoryVisualPreview = false,
}: PresenceStudioV2PublicRoomProps) {
  const [focusedArtwork, setFocusedArtwork] = useState<StudioV2PublicObject | null>(null);
  const [activeLiquidIndex, setActiveLiquidIndex] = useState(0);
  const world = WORLD_KITS.find((kit) => kit.id === room.worldId);
  const style = {
    "--v2-public-bg": room.skin.background,
    "--v2-public-accent": room.skin.accentColor,
    "--v2-public-radius": `${room.skin.objectRadius}px`,
    "--v2-public-shadow": `${Math.max(0.05, room.skin.shadowDepth)}`,
    "--v2-public-heading-weight": room.skin.headingWeight,
  } as CSSProperties;
  const visualOverrideActive = Boolean(editorBridge || inMemoryVisualPreview);
  const visibleObjects = room.chambers.flatMap((chamber) => chamber.objects);
  const ctaObject = visibleObjects.find((object) => object.type === "cta" || object.role === "cta");
  const ctaLabel = ctaObject?.title || room.cta.label;
  const ctaHref = ctaObject?.link || room.cta.href;
  const thresholdObject = visibleObjects.find((object) => object.image?.src) ?? visibleObjects[0];
  const thresholdImage = thresholdObject?.image;
  const entryHref = ctaHref || "#v2-public-room-space";
  const entryLabel = ctaLabel || "Enter room";
  const isGallery = room.worldId === "gallery";
  const environment = deriveStudioV2Environment({
    worldId: room.worldId,
    skin: room.skin,
    chambers: room.chambers,
  });
  const publicStylePreset = room.publicStylePreset || "gallery-p2";
  const liquidWorks = room.chambers.flatMap((chamber) =>
    chamber.objects
      .filter((object) => Boolean(object.image?.src))
      .map((object) => ({
        object,
        chamberId: chamber.id,
        chamberLabel: chamber.label,
      })),
  );
  const thresholdIndex = isGallery
    ? room.chambers
        .filter((chamber) => chamber.objects.length > 0)
        .slice(0, 4)
        .map((chamber) => ({ href: `#v2-public-room-${chamber.id}`, label: chamber.label, marker: "", roomId: chamber.id }))
    : visibleObjects
        .slice(0, 4)
        .map((object, index) => ({
          href: `#v2-public-object-${object.id}`,
          label: object.title,
          marker: String(index + 1).padStart(2, "0"),
          roomId: undefined,
        }));
  const emitEditorRoomNavigation = useCallback(
    (roomId: string, source: "direct" | "arrow-previous" | "arrow-next" = "direct") => {
      if (!editorBridge) return false;
      const intent = { kind: "navigate-room" as const, roomId, source };
      const result = editorBridge.handleIntent(intent);
      if (!validateStudioV2EditorBridgeResult(intent, result)) {
        throw new Error("Studio V3 bridge rejected public room navigation result.");
      }
      return true;
    },
    [editorBridge],
  );
  const suppressEditorAction = useCallback(
    (action: "cta" | "link", input: PresenceStudioV2EditorActivationInput) => {
      if (!editorBridge) return false;
      const intent = { kind: "suppress-action-without-piece" as const, action, input };
      const result = editorBridge.handleIntent(intent);
      if (!validateStudioV2EditorBridgeResult(intent, result)) {
        throw new Error("Studio V3 bridge rejected public chrome suppression result.");
      }
      return true;
    },
    [editorBridge],
  );
  const onEditorCtaClick = (event: React.MouseEvent) => {
    if (!suppressEditorAction("cta", "pointer")) return;
    event.preventDefault();
    event.stopPropagation();
  };
  const onEditorCtaKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (!suppressEditorAction("cta", event.key === "Enter" ? "keyboard-enter" : "keyboard-space")) return;
    event.preventDefault();
    event.stopPropagation();
  };
  const onEditorLinkClick = (event: React.MouseEvent) => {
    if (!suppressEditorAction("link", "pointer")) return;
    event.preventDefault();
    event.stopPropagation();
  };
  const onEditorLinkKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (!suppressEditorAction("link", event.key === "Enter" ? "keyboard-enter" : "keyboard-space")) return;
    event.preventDefault();
    event.stopPropagation();
  };
  const onEditorRoomLinkClick = (roomId: string) => (event: React.MouseEvent) => {
    if (!emitEditorRoomNavigation(roomId)) return;
    event.preventDefault();
    event.stopPropagation();
  };
  const onEditorRoomLinkKeyDown = (roomId: string) => (event: React.KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (!emitEditorRoomNavigation(roomId)) return;
    event.preventDefault();
    event.stopPropagation();
  };

  useEffect(() => {
    if (editorBridge && isGallery && publicStylePreset === "bbbvision-threshold-gallery") return;
    if (!focusedArtwork && !editorBridge) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (editorBridge) {
        event.preventDefault();
        const intent = { kind: "clear-selection" as const, source: "escape" as const };
        const result = editorBridge.handleIntent(intent);
        if (!validateStudioV2EditorBridgeResult(intent, result)) {
          throw new Error("Studio V3 bridge rejected public Escape result.");
        }
        return;
      }
      setFocusedArtwork(null);
    };
    if (focusedArtwork) document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [editorBridge, focusedArtwork, isGallery, publicStylePreset]);

  useEffect(() => {
    if (liquidWorks.length === 0 && activeLiquidIndex !== 0) {
      setActiveLiquidIndex(0);
      return;
    }
    if (activeLiquidIndex >= liquidWorks.length) {
      setActiveLiquidIndex(Math.max(0, liquidWorks.length - 1));
    }
  }, [activeLiquidIndex, liquidWorks.length]);

  if (isGallery && publicStylePreset === "christina-liquid-gallery") {
    return (
      <ChristinaLiquidGalleryPublicRoom
        room={room}
        worldName={world?.name ?? room.worldId}
        style={style}
        works={liquidWorks}
        activeIndex={activeLiquidIndex}
        onActiveIndexChange={setActiveLiquidIndex}
        focusedArtwork={focusedArtwork}
        onFocusArtwork={setFocusedArtwork}
        ctaHref={ctaHref}
        ctaLabel={ctaLabel}
      />
    );
  }

  if (isGallery && publicStylePreset === "bbbvision-threshold-gallery") {
    return (
      <BbbVisionThresholdGalleryPublicRoom
        room={room}
        worldName={world?.name ?? room.worldId}
        style={style}
        works={liquidWorks}
        activeIndex={activeLiquidIndex}
        onActiveIndexChange={setActiveLiquidIndex}
        focusedArtwork={focusedArtwork}
        onFocusArtwork={setFocusedArtwork}
        ctaHref={ctaHref}
        ctaLabel={ctaLabel}
        editorBridge={editorBridge}
        editorActiveChamberId={editorActiveChamberId}
        inMemoryVisualPreview={inMemoryVisualPreview}
      />
    );
  }

  return (
    <main
      className={`presence-studio-v2-public world-${room.worldId} texture-${room.skin.texture} motion-${room.skin.motionIntensity} environment-focus-${environment.focus}${visualOverrideActive ? studioV2ExperienceClassName(room.skin) : ""}${thresholdImage?.src ? " has-threshold-image" : ""}`}
      style={style}
      data-environment-runtime="dom"
      data-experience-density={visualOverrideActive ? room.skin.experienceDensity : undefined}
      data-experience-atmosphere={visualOverrideActive ? room.skin.experienceAtmosphere : undefined}
      data-experience-piece-treatment={visualOverrideActive ? room.skin.experiencePieceTreatment : undefined}
      data-experience-journey={visualOverrideActive ? room.skin.experienceJourney : undefined}
    >
      <PresenceStudioV2EnvironmentLayer
        environment={environment}
        accent={room.skin.accentColor}
        background={room.skin.background}
        preview
      />
      <section className="v2-public-threshold">
        <div className="v2-public-threshold-atmosphere" aria-hidden="true" />
        {thresholdImage?.src && (
          <div className="v2-public-threshold-image-field" aria-hidden="true">
            <img src={thresholdImage.src} alt="" loading="eager" />
          </div>
        )}
        <div className="v2-public-world-mark">
          <span>{world?.name ?? room.worldId}</span>
          {world?.surface && <small>{world.surface}</small>}
        </div>
        <div className="v2-public-title-group">
          <h1>{room.title}</h1>
          {room.tagline && <p>{room.tagline}</p>}
        </div>
        <PublicLink
          href={entryHref}
          className="v2-public-primary-cta"
          onClickCapture={editorBridge ? onEditorCtaClick : undefined}
          onKeyDownCapture={editorBridge ? onEditorCtaKeyDown : undefined}
        >
          {entryLabel}
        </PublicLink>
        {thresholdObject && (
          <aside className="v2-public-threshold-artifact" aria-label="Room entry object">
            {thresholdObject.image?.src ? (
              <img
                src={thresholdObject.image.src}
                alt={thresholdObject.image.alt || thresholdObject.title}
                loading="eager"
              />
            ) : (
              <div className="v2-public-threshold-artifact-blank" aria-hidden="true" />
            )}
            <div>
              <strong>{thresholdObject.title}</strong>
              {thresholdObject.meta && <span>{thresholdObject.meta}</span>}
            </div>
          </aside>
        )}
        {thresholdObject && (
          <div className="v2-public-threshold-caption">
            <span>Opening work</span>
            <strong>{thresholdObject.title}</strong>
          </div>
        )}
        {thresholdIndex.length > 0 && (
          <nav className="v2-public-threshold-index" aria-label={isGallery ? "Threshold room wayfinding" : "Room objects"}>
            {thresholdIndex.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClickCapture={editorBridge ? item.roomId ? onEditorRoomLinkClick(item.roomId) : onEditorLinkClick : undefined}
                onKeyDownCapture={editorBridge ? item.roomId ? onEditorRoomLinkKeyDown(item.roomId) : onEditorLinkKeyDown : undefined}
              >
                <span aria-hidden={isGallery ? "true" : undefined}>{item.marker}</span>
                <strong>{item.label}</strong>
              </a>
            ))}
          </nav>
        )}
      </section>
      <div className="v2-public-threshold-transition" aria-hidden="true" />

      <section className="v2-public-room-space" id="v2-public-room-space" aria-label={`${room.title} public room`}>
        {room.chambers.map((chamber, chamberIndex) => (
          <section
            id={`v2-public-room-${chamber.id}`}
            className={`v2-public-chamber room-tone-${chamberIndex % 3}${chamberIndex === 0 ? " is-first-room" : ""}`}
            key={chamber.id}
            data-testid="presence-public-chamber-room"
            data-v2-public-chamber-id={chamber.id}
            aria-labelledby={`v2-public-chamber-${chamber.id}`}
          >
            <div className="v2-public-chamber-head">
              <span>{isGallery ? "Gallery room" : world?.verb ?? "The room opens"}</span>
              <h2 id={`v2-public-chamber-${chamber.id}`}>{chamber.label}</h2>
            </div>
            {visualOverrideActive && (chamber.composition?.layoutId as string | undefined) === "film-strip-selected-works" ? (
              <FilmStripSelectedWorksChamber
                chamber={chamber}
                radius={room.skin.objectRadius}
                isGallery={isGallery}
                onFocusArtwork={isGallery ? setFocusedArtwork : undefined}
                editorBridge={editorBridge}
              />
            ) : (
            <div className={`v2-public-layout layout-${studioV2Layout(studioV2SharedPublicComposition(chamber, visualOverrideActive)?.layoutId).id}`}>
              {studioV2Layout(studioV2SharedPublicComposition(chamber, visualOverrideActive)?.layoutId).zones.map((zone) => {
                const composition = normalizeStudioV2Composition(studioV2SharedPublicComposition(chamber, visualOverrideActive), chamber.id, chamber.objects.map((object) => ({ ...object, visibility: { public: true, mobile: object.mobileVisible }, locked: false, pinned: false })));
                const placements = composition.placements.filter((placement) => placement.zoneId === zone.id).sort((a, b) => a.order - b.order);
                return placements.length > 0 ? <section className={`v2-public-layout-zone zone-${zone.id}`} key={zone.id} data-zone-id={zone.id}>
                  {placements.map((placement, objectIndex) => {
                    const object = chamber.objects.find((item) => item.id === placement.objectId);
                    return object ? <PublicObjectCard key={object.id} object={object} radius={room.skin.objectRadius} isGallery={isGallery} isFeatured={placement.size === "feature" || (chamberIndex === 0 && objectIndex === 0 && Boolean(object.image?.src))} onFocusArtwork={isGallery ? setFocusedArtwork : undefined} editorBridge={editorBridge} /> : null;
                  })}
                </section> : null;
              })}
            </div>
            )}
          </section>
        ))}

        {room.moodboardRefs.length > 0 && (
          <section className="v2-public-influence" aria-labelledby="v2-public-influence-title">
            <div className="v2-public-section-kicker">Influence layer</div>
            <h2 id="v2-public-influence-title">References and coordinates</h2>
            <div className="v2-public-influence-grid">
              {room.moodboardRefs.map((reference) => (
                <article className="v2-public-influence-card" key={reference.id}>
                  <span
                    className="v2-public-influence-dot"
                    style={{ background: reference.dot || room.skin.accentColor }}
                    aria-hidden="true"
                  />
                  <div>
                    <div className="v2-public-influence-type">{reference.type}</div>
                    <h3>{reference.label}</h3>
                    {reference.detail && <p>{reference.detail}</p>}
                    {reference.url && (
                      <PublicLink
                        href={reference.url}
                        className="v2-public-subtle-link"
                        onClickCapture={editorBridge ? onEditorLinkClick : undefined}
                        onKeyDownCapture={editorBridge ? onEditorLinkKeyDown : undefined}
                      >
                        Open reference
                      </PublicLink>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {room.traces?.enabled && room.traces.demo && (
          <section className="v2-public-traces" aria-label="Illustrative room traces">
            <div className="v2-public-trace-disclosure">{room.traces.disclosure || "Demo traces"}</div>
            <div className="v2-public-trace-strip">
              {typeof room.traces.entries === "number" && <span>{room.traces.entries} entered</span>}
              {typeof room.traces.seeds === "number" && <span>{room.traces.seeds} seeds</span>}
              {typeof room.traces.guestbook === "number" && <span>{room.traces.guestbook} guestbook notes</span>}
            </div>
            {room.traces.guestbookEntries && room.traces.guestbookEntries.length > 0 && (
              <div className="v2-public-guestbook">
                {room.traces.guestbookEntries.slice(0, 3).map((entry) => (
                  <blockquote key={entry}>{entry}</blockquote>
                ))}
              </div>
            )}
          </section>
        )}
      </section>

      {focusedArtwork?.image?.src && (
        <div
          className="v2-public-artwork-focus"
          data-testid="presence-public-artwork-focus"
          role="dialog"
          aria-modal="true"
          aria-label={`Artwork focus: ${focusedArtwork.title}`}
        >
          <button
            className="v2-public-artwork-focus-backdrop"
            type="button"
            aria-label="Close artwork focus"
            onClick={() => setFocusedArtwork(null)}
          />
          <figure className="v2-public-artwork-focus-stage">
            <button
              className="v2-public-artwork-focus-close"
              data-testid="presence-public-artwork-focus-close"
              type="button"
              onClick={() => setFocusedArtwork(null)}
            >
              Close
            </button>
            <img
              data-testid="presence-public-artwork-focus-image"
              src={focusedArtwork.image.src}
              alt={focusedArtwork.image.alt || focusedArtwork.title}
            />
            <figcaption>
              <strong>{focusedArtwork.title}</strong>
              {focusedArtwork.meta && <span>{focusedArtwork.meta}</span>}
              {focusedArtwork.detail && <p>{focusedArtwork.detail}</p>}
            </figcaption>
          </figure>
        </div>
      )}
    </main>
  );
}

function FilmStripSelectedWorksChamber({
  chamber,
  radius,
  isGallery,
  onFocusArtwork,
  editorBridge,
}: {
  chamber: StudioV2PublicChamber;
  radius: number;
  isGallery: boolean;
  onFocusArtwork?: (object: StudioV2PublicObject) => void;
  editorBridge?: PresenceStudioV2EditorBridge;
}) {
  const orderedObjects = filmStripOrderedObjects(chamber);
  const exitObjects = orderedObjects.filter((object) => isFilmStripExitObject(object));
  const selectedWorks = orderedObjects.filter((object) => !isFilmStripExitObject(object) && (
    Boolean(object.image?.src) || object.type === "image" || object.type === "media"
  ));
  const works = selectedWorks;
  const workIds = new Set(works.map((object) => object.id));
  const contextObjects = orderedObjects.filter((object) => !isFilmStripExitObject(object) && !workIds.has(object.id));
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const total = works.length;
  const activeObject = works[activeIndex] ?? works[0] ?? null;

  useEffect(() => {
    if (total === 0 && activeIndex !== 0) {
      setActiveIndex(0);
      return;
    }
    if (activeIndex >= total) setActiveIndex(Math.max(0, total - 1));
  }, [activeIndex, total]);

  const moveTo = useCallback((nextIndex: number) => {
    if (total === 0) return;
    setActiveIndex(Math.min(total - 1, Math.max(0, nextIndex)));
  }, [total]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")
    ) {
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveTo(activeIndex - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      moveTo(activeIndex + 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      moveTo(0);
    } else if (event.key === "End") {
      event.preventDefault();
      moveTo(total - 1);
    }
  };

  return (
    <section
      className="v2-film-strip"
      data-testid="presence-public-film-strip"
      aria-label={`${chamber.label} selected works film strip`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onTouchStart={(event) => {
        const touch = event.changedTouches[0];
        if (touch) touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      }}
      onTouchEnd={(event) => {
        const start = touchStartRef.current;
        const touch = event.changedTouches[0];
        touchStartRef.current = null;
        if (!start || !touch) return;
        const deltaX = touch.clientX - start.x;
        const deltaY = touch.clientY - start.y;
        if (Math.abs(deltaX) < 44 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
        moveTo(deltaX < 0 ? activeIndex + 1 : activeIndex - 1);
      }}
    >
      <div className="v2-film-strip-toolbar">
        <p className="v2-film-strip-progress" data-testid="presence-public-film-strip-progress" aria-live="polite" aria-atomic="true">
          {total > 0 ? `Work ${activeIndex + 1} of ${total}` : "No selected works"}
        </p>
        <div className="v2-film-strip-controls" aria-label="Film strip controls">
          <button
            type="button"
            onClick={() => moveTo(activeIndex - 1)}
            disabled={activeIndex <= 0 || total === 0}
            aria-label="Previous work"
            data-testid="presence-public-film-strip-prev"
          >
            <span aria-hidden="true">&#8592;</span>
            <span>Previous</span>
          </button>
          <button
            type="button"
            onClick={() => moveTo(activeIndex + 1)}
            disabled={activeIndex >= total - 1 || total === 0}
            aria-label="Next work"
            data-testid="presence-public-film-strip-next"
          >
            <span>Next</span>
            <span aria-hidden="true">&#8594;</span>
          </button>
        </div>
      </div>

      <div className="v2-film-strip-stage-window">
        <div className="v2-film-strip-stage-track">
          {activeObject ? (
            <div className="v2-film-strip-slide" key={activeObject.id}>
              <PublicObjectCard
                object={activeObject}
                radius={radius}
                isGallery={isGallery}
                isFeatured
                onFocusArtwork={onFocusArtwork}
                editorBridge={editorBridge}
              />
            </div>
          ) : (
            <p className="v2-film-strip-empty">This Room has no selected Works yet.</p>
          )}
        </div>
      </div>

      {works.length > 0 && (
        <ol className="v2-film-strip-index" aria-label="Selected works index">
          {works.map((object, index) => (
            <li key={object.id}>
              <button
                type="button"
                onClick={() => moveTo(index)}
                aria-label={`Show work ${index + 1}: ${object.title}`}
                aria-current={index === activeIndex ? "true" : undefined}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{object.title}</strong>
              </button>
            </li>
          ))}
        </ol>
      )}

      {contextObjects.length > 0 && (
        <section className="v2-film-strip-context" aria-labelledby={`v2-film-strip-context-${chamber.id}`}>
          <div className="v2-film-strip-context-heading">
            <span>Selected work context</span>
            <h3 id={`v2-film-strip-context-${chamber.id}`}>Notes from this Room</h3>
          </div>
          <div className="v2-film-strip-context-grid">
            {contextObjects.map((object) => (
              <PublicObjectCard key={object.id} object={object} radius={radius} editorBridge={editorBridge} />
            ))}
          </div>
        </section>
      )}

      {exitObjects.length > 0 && (
        <div className="v2-film-strip-exit" aria-label="Room exit">
          {exitObjects.map((object) => (
            <PublicObjectCard key={object.id} object={object} radius={radius} editorBridge={editorBridge} />
          ))}
        </div>
      )}
    </section>
  );
}

function filmStripOrderedObjects(chamber: StudioV2PublicChamber): StudioV2PublicObject[] {
  const objectsById = new Map(chamber.objects.map((object) => [object.id, object]));
  const composition = chamber.composition as ({ placements?: Array<{ objectId: string; zoneId: string; order: number }> } | undefined);
  const zoneOrder: Record<string, number> = {
    "active-work-stage": 0,
    "sequence-index": 1,
    "selected-work-context": 2,
    "selected-works-exit": 3,
  };
  const placementOrder = [...(composition?.placements ?? [])]
    .sort((left, right) => {
      return (zoneOrder[left.zoneId] ?? 4) - (zoneOrder[right.zoneId] ?? 4) || left.order - right.order;
    });
  const ordered: StudioV2PublicObject[] = [];
  const seen = new Set<string>();
  for (const placement of placementOrder) {
    const object = objectsById.get(placement.objectId);
    if (!object || seen.has(object.id)) continue;
    seen.add(object.id);
    ordered.push(object);
  }
  return ordered;
}

function studioV2ExperienceClassName(skin: StudioV2Skin): string {
  return [
    skin.experienceDensity ? ` experience-density-${skin.experienceDensity}` : "",
    skin.experienceAtmosphere ? ` experience-atmosphere-${skin.experienceAtmosphere}` : "",
    skin.experiencePieceTreatment ? ` experience-piece-${skin.experiencePieceTreatment}` : "",
    skin.experienceJourney ? ` experience-journey-${skin.experienceJourney}` : "",
  ].join("");
}

function studioV2SharedPublicComposition(
  chamber: StudioV2PublicChamber,
  visualOverrideActive: boolean,
): StudioV2PublicChamber["composition"] {
  // Without the editor bridge, treat the P1-only token exactly as the pre-P1 renderer did: unknown => Gallery wall.
  if (visualOverrideActive || chamber.composition?.layoutId !== "film-strip-selected-works") {
    return chamber.composition;
  }
  return { ...chamber.composition, layoutId: "gallery-wall" };
}

function isFilmStripExitObject(object: StudioV2PublicObject): boolean {
  return object.type === "cta" || object.type === "link" || object.type === "portal" || object.role === "cta";
}

interface LiquidGalleryWork {
  object: StudioV2PublicObject;
  chamberId: string;
  chamberLabel: string;
}

interface BbbVisionStoryObject {
  object: StudioV2PublicObject;
  chamberLabel: string;
}

type BbbVisionPublicView = "threshold" | "gallery" | "practice";
type BbbVisionMovement = "enter" | "prev" | "next" | "index";

function bbbVisionBrandStyle(index: number): CSSProperties {
  const positions = [
    { top: "12%", left: "8%", transform: "rotate(-7deg) scale(1)" },
    { top: "9%", left: "62%", transform: "rotate(9deg) scale(1.08)" },
    { top: "56%", left: "10%", transform: "rotate(-11deg) scale(0.97)" },
    { top: "64%", left: "58%", transform: "rotate(6deg) scale(1.1)" },
    { top: "31%", left: "33%", transform: "rotate(-4deg) scale(1.2)" },
    { top: "7%", left: "37%", transform: "rotate(5deg) scale(1.04)" },
    { top: "67%", left: "23%", transform: "rotate(-8deg) scale(1.05)" },
    { top: "45%", left: "66%", transform: "rotate(12deg) scale(0.95)" },
    { top: "22%", left: "14%", transform: "rotate(-3deg) scale(1.13)" },
    { top: "61%", left: "49%", transform: "rotate(7deg) scale(1.02)" },
  ];
  return positions[index % positions.length];
}

function bbbVisionWorksFromChambers(chambers: readonly StudioV2PublicChamber[]): LiquidGalleryWork[] {
  return chambers.flatMap((chamber) =>
    chamber.objects
      .filter((object) => Boolean(object.image?.src))
      .map((object) => ({
        object,
        chamberId: chamber.id,
        chamberLabel: chamber.label,
      })),
  );
}

function bbbVisionStoriesFromChambers(chambers: readonly StudioV2PublicChamber[]): BbbVisionStoryObject[] {
  return chambers
    .flatMap((chamber) => chamber.objects.map((object) => ({ object, chamberLabel: chamber.label })))
    .filter(({ object }) => !object.image?.src || object.type === "text" || object.type === "note" || object.type === "proof");
}

function bbbVisionFirstRoleChamber(
  chambers: readonly StudioV2PublicChamber[],
  role: "threshold" | "gallery" | "practice" | "about",
): StudioV2PublicChamber | undefined {
  return getStudioV2PublicChambersByRole(chambers, role)[0];
}

function ChristinaLiquidGalleryPublicRoom({
  room,
  worldName,
  style,
  works,
  activeIndex,
  onActiveIndexChange,
  focusedArtwork,
  onFocusArtwork,
  ctaHref,
  ctaLabel,
}: {
  room: StudioV2PublicRoom;
  worldName: string;
  style: CSSProperties;
  works: LiquidGalleryWork[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  focusedArtwork: StudioV2PublicObject | null;
  onFocusArtwork: (object: StudioV2PublicObject | null) => void;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  const activeWork = works[activeIndex] ?? works[0] ?? null;
  const activeObject = activeWork?.object ?? null;
  const sequenceTotal = works.length;
  const hasSequence = sequenceTotal > 0;
  const previousIndex = sequenceTotal > 0 ? (activeIndex - 1 + sequenceTotal) % sequenceTotal : 0;
  const nextIndex = sequenceTotal > 0 ? (activeIndex + 1) % sequenceTotal : 0;
  const practiceObjects = room.chambers
    .flatMap((chamber) => chamber.objects.map((object) => ({ object, chamberLabel: chamber.label })))
    .filter(({ object }) => !object.image?.src || object.type === "text" || object.type === "note" || object.type === "proof")
    .slice(0, 4);
  const environment = deriveStudioV2Environment({
    worldId: room.worldId,
    skin: room.skin,
    chambers: room.chambers,
    focusedChamberId: activeWork?.chamberId ?? null,
    focusedObjectId: activeObject?.id ?? null,
  });

  return (
    <main
      className={`presence-studio-v2-public world-${room.worldId} style-christina-liquid-gallery texture-${room.skin.texture} motion-${room.skin.motionIntensity} environment-focus-${environment.focus}${activeObject?.image?.src ? " has-threshold-image" : ""}`}
      style={style}
      data-testid="presence-public-style-christina-liquid-gallery"
      data-environment-runtime="dom"
    >
      <PresenceStudioV2EnvironmentLayer
        environment={environment}
        accent={room.skin.accentColor}
        background={room.skin.background}
        preview
      />
      <header className="v2-liquid-nav" aria-label={`${room.title} public navigation`}>
        <a href="#v2-liquid-sequence" className="v2-liquid-brand">{room.title}</a>
        <nav aria-label="Room sections">
          <a href="#v2-liquid-works">Works</a>
          <a href="#v2-liquid-practice">Practice</a>
          {(ctaHref || ctaLabel) && <PublicLink href={ctaHref} className="v2-liquid-nav-cta">{ctaLabel || "Begin"}</PublicLink>}
        </nav>
      </header>

      <section
        className="v2-liquid-hero"
        id="v2-liquid-sequence"
        data-testid="presence-public-liquid-sequence"
        aria-label={`${room.title} selected works sequence`}
      >
        <div className="v2-liquid-field" aria-hidden="true" />
        <div className="v2-liquid-dither" aria-hidden="true" />
        <div className="v2-liquid-hero-copy">
          <div className="v2-liquid-kicker">{worldName} / selected works</div>
          <h1>{room.title}</h1>
          {room.tagline && <p>{room.tagline}</p>}
        </div>

        <div className="v2-liquid-stage">
          {activeObject?.image?.src ? (
            <button
              type="button"
              className="v2-liquid-stage-image"
              onClick={() => onFocusArtwork(activeObject)}
              aria-label={`View ${activeObject.title}`}
            >
              <img src={activeObject.image.src} alt={activeObject.image.alt || activeObject.title} loading="eager" />
            </button>
          ) : (
            <div className="v2-liquid-stage-empty">
              <span>No public work image is available yet.</span>
            </div>
          )}
        </div>

        <div className="v2-liquid-ui" aria-label="Selected works controls">
          <button
            type="button"
            data-testid="presence-public-liquid-prev"
            className="v2-liquid-arrow"
            onClick={() => onActiveIndexChange(previousIndex)}
            disabled={sequenceTotal < 2}
            aria-label="Previous work"
          >
            Prev
          </button>
          {hasSequence && (
            <div className="v2-liquid-progress" data-testid="presence-public-liquid-progress" aria-live="polite">
              {String(activeIndex + 1).padStart(2, "0")} / {String(sequenceTotal).padStart(2, "0")}
            </div>
          )}
          <div className="v2-liquid-dots" aria-label="Select work">
            {works.map((work, index) => (
              <button
                key={work.object.id}
                type="button"
                className={index === activeIndex ? "is-active" : ""}
                onClick={() => onActiveIndexChange(index)}
                aria-label={`Show ${work.object.title}`}
                aria-current={index === activeIndex ? "true" : undefined}
              />
            ))}
          </div>
          <button
            type="button"
            data-testid="presence-public-liquid-next"
            className="v2-liquid-arrow"
            onClick={() => onActiveIndexChange(nextIndex)}
            disabled={sequenceTotal < 2}
            aria-label="Next work"
          >
            Next
          </button>
        </div>

        {activeObject && (
          <aside className="v2-liquid-caption" aria-label="Selected artwork label">
            <span>{activeWork?.chamberLabel}</span>
            <strong>{activeObject.title}</strong>
            {activeObject.meta && <p>{activeObject.meta}</p>}
            {activeObject.detail && <p>{activeObject.detail}</p>}
            <button type="button" onClick={() => onFocusArtwork(activeObject)}>
              View work
            </button>
          </aside>
        )}

        {(ctaHref || ctaLabel) && (
          <PublicLink href={ctaHref || "#v2-liquid-practice"} className="v2-liquid-primary-action">
            {ctaLabel || "Begin a conversation"}
          </PublicLink>
        )}
      </section>

      <section className="v2-liquid-works" id="v2-liquid-works" aria-labelledby="v2-liquid-works-title">
        <div className="v2-liquid-section-head">
          <span>Selected works pathway</span>
          <h2 id="v2-liquid-works-title">Move through the room</h2>
        </div>
        <div className="v2-liquid-work-path">
          {works.map((work, index) => (
            <article className={index === activeIndex ? "is-active" : ""} key={work.object.id}>
              <button type="button" onClick={() => onActiveIndexChange(index)} aria-label={`Select ${work.object.title}`}>
                <img src={work.object.image?.src} alt={work.object.image?.alt || work.object.title} loading="lazy" />
              </button>
              <div className="v2-liquid-work-label">
                <span>{work.chamberLabel}</span>
                <strong>{work.object.title}</strong>
                {work.object.meta && <p>{work.object.meta}</p>}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="v2-liquid-practice" id="v2-liquid-practice" aria-labelledby="v2-liquid-practice-title">
        <div className="v2-liquid-section-head">
          <span>Practice / about</span>
          <h2 id="v2-liquid-practice-title">The room behind the works</h2>
        </div>
        <div className="v2-liquid-practice-grid">
          <div className="v2-liquid-practice-statement">
            <p>{room.tagline || "This room is still gathering its public statement."}</p>
            {(ctaHref || ctaLabel) && (
              <PublicLink href={ctaHref} className="v2-liquid-practice-action">
                {ctaLabel || "Begin a conversation"}
              </PublicLink>
            )}
          </div>
          {practiceObjects.length > 0 && (
            <div className="v2-liquid-practice-notes">
              {practiceObjects.map(({ object, chamberLabel }) => (
                <article key={object.id}>
                  <span>{chamberLabel}</span>
                  <strong>{object.title}</strong>
                  {object.detail && <p>{object.detail}</p>}
                  {object.link && (
                    <PublicLink href={object.link} className="v2-liquid-note-link">
                      Open path
                    </PublicLink>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {room.moodboardRefs.length > 0 && (
        <section className="v2-liquid-references" aria-labelledby="v2-liquid-references-title">
          <div className="v2-liquid-section-head">
            <span>Coordinates</span>
            <h2 id="v2-liquid-references-title">References in the room</h2>
          </div>
          <div className="v2-liquid-reference-strip">
            {room.moodboardRefs.map((reference) => (
              <article key={reference.id}>
                <span style={{ background: reference.dot || room.skin.accentColor }} aria-hidden="true" />
                <strong>{reference.label}</strong>
                {reference.detail && <p>{reference.detail}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      {focusedArtwork?.image?.src && (
        <div
          className="v2-public-artwork-focus v2-liquid-artwork-focus"
          data-testid="presence-public-artwork-focus"
          role="dialog"
          aria-modal="true"
          aria-label={`Artwork focus: ${focusedArtwork.title}`}
        >
          <button
            className="v2-public-artwork-focus-backdrop"
            type="button"
            aria-label="Close artwork focus"
            onClick={() => onFocusArtwork(null)}
          />
          <figure className="v2-public-artwork-focus-stage">
            <button
              className="v2-public-artwork-focus-close"
              data-testid="presence-public-artwork-focus-close"
              type="button"
              onClick={() => onFocusArtwork(null)}
            >
              Close
            </button>
            <img
              data-testid="presence-public-artwork-focus-image"
              src={focusedArtwork.image.src}
              alt={focusedArtwork.image.alt || focusedArtwork.title}
            />
            <figcaption>
              <strong>{focusedArtwork.title}</strong>
              {focusedArtwork.meta && <span>{focusedArtwork.meta}</span>}
              {focusedArtwork.detail && <p>{focusedArtwork.detail}</p>}
            </figcaption>
          </figure>
        </div>
      )}
    </main>
  );
}

function constellationStarStyle(index: number, total: number, seed = 7919): CSSProperties {
  const fract = (n: number) => n - Math.floor(n);
  const hash = (a: number, b: number) => fract(Math.sin((a + b) * 43758.5453) * 0.5 + 0.5);
  const angle = hash(seed, index * 137.5) * Math.PI * 2;
  const radius = 10 + hash(seed, index * 271.9) * 36;
  const x = 50 + Math.cos(angle) * radius;
  const y = 50 + Math.sin(angle) * radius;
  const size = 78 + hash(seed, index * 93.7) * 74;
  const rotate = (hash(seed, index * 53.3) - 0.5) * 18;
  const zIndex = Math.floor(size);
  return {
    left: `${Math.max(6, Math.min(94, x))}%`,
    top: `${Math.max(6, Math.min(94, y))}%`,
    width: `${size}px`,
    height: `${size}px`,
    transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
    zIndex,
  };
}

function BbbVisionThresholdGalleryPublicRoom({
  room,
  worldName,
  style,
  works,
  activeIndex,
  onActiveIndexChange,
  focusedArtwork,
  onFocusArtwork,
  ctaHref,
  ctaLabel,
  editorBridge,
  editorActiveChamberId,
  inMemoryVisualPreview,
}: {
  room: StudioV2PublicRoom;
  worldName: string;
  style: CSSProperties;
  works: LiquidGalleryWork[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  focusedArtwork: StudioV2PublicObject | null;
  onFocusArtwork: (object: StudioV2PublicObject | null) => void;
  ctaHref?: string;
  ctaLabel?: string;
  editorBridge?: PresenceStudioV2EditorBridge;
  editorActiveChamberId?: string;
  inMemoryVisualPreview?: boolean;
}) {
  const [view, setView] = useState<BbbVisionPublicView>("threshold");
  const [movement, setMovement] = useState<BbbVisionMovement | null>(null);
  const movementTimeoutRef = useRef<number | null>(null);
  const entryChamber = getStudioV2EntryChamber(room.chambers);
  const defaultChamber = getStudioV2DefaultChamber(room.chambers);
  const explicitEntryChamber = entryChamber?.metadata?.isEntry === true ? entryChamber : undefined;
  const thresholdRoleChamber = bbbVisionFirstRoleChamber(room.chambers, "threshold");
  const thresholdChamber = explicitEntryChamber ?? thresholdRoleChamber;
  const editorThresholdChamberId = thresholdChamber?.id ?? entryChamber?.id ?? room.chambers[0]?.id;
  const galleryRoleChambers = getStudioV2PublicChambersByRole(room.chambers, "gallery");
  const explicitDefaultChamber = defaultChamber?.metadata?.isDefault === true ? defaultChamber : undefined;
  const galleryDefaultChamber =
    explicitDefaultChamber && explicitDefaultChamber.id !== thresholdChamber?.id ? explicitDefaultChamber : undefined;
  const visualOverrideActive = Boolean(editorBridge || inMemoryVisualPreview);
  const galleryFallbackChamber = visualOverrideActive
    ? room.chambers.find((chamber) => (
      chamber.id !== thresholdChamber?.id &&
      /gallery|field|work/i.test(`${chamber.id} ${chamber.label}`)
    )) ?? room.chambers.find((chamber) => chamber.id !== thresholdChamber?.id)
    : undefined;
  const galleryChambers = galleryRoleChambers.length > 0
    ? galleryRoleChambers
    : galleryDefaultChamber
      ? [galleryDefaultChamber]
      : galleryFallbackChamber
        ? [galleryFallbackChamber]
      : [];
  const editorActiveChamber = visualOverrideActive && editorActiveChamberId
    ? room.chambers.find((chamber) => chamber.id === editorActiveChamberId)
    : undefined;
  const filmStripGalleryChamber = visualOverrideActive
    ? (editorActiveChamber?.composition?.layoutId === "film-strip-selected-works"
      ? editorActiveChamber
      : undefined) ?? galleryChambers.find(
      (chamber) => chamber.composition?.layoutId === "film-strip-selected-works",
    )
    : undefined;
  const practiceChamber =
    bbbVisionFirstRoleChamber(room.chambers, "practice") ?? bbbVisionFirstRoleChamber(room.chambers, "about");
  const metadataThresholdWorks = thresholdChamber ? bbbVisionWorksFromChambers([thresholdChamber]) : [];
  const metadataGalleryWorks = galleryChambers.length > 0 ? bbbVisionWorksFromChambers(galleryChambers) : [];
  const metadataStoryObjects = practiceChamber ? bbbVisionStoriesFromChambers([practiceChamber]) : [];
  const fallbackStoryObjects = bbbVisionStoriesFromChambers(room.chambers).slice(0, 5);
  const thresholdWorks = metadataThresholdWorks.length > 0 ? metadataThresholdWorks : works.length > 0 ? works.slice(0, 10) : [];
  const galleryWorks = metadataGalleryWorks.length > 0 ? metadataGalleryWorks : works;
  const storyObjects = practiceChamber ? metadataStoryObjects.slice(0, 5) : fallbackStoryObjects;
  const sequenceTotal = galleryWorks.length;
  const safeActiveIndex = sequenceTotal > 0 ? Math.min(activeIndex, sequenceTotal - 1) : 0;
  const activeWork = galleryWorks[safeActiveIndex] ?? galleryWorks[0] ?? null;
  const activeObject = activeWork?.object ?? null;
  const previousIndex = sequenceTotal > 0 ? (safeActiveIndex - 1 + sequenceTotal) % sequenceTotal : 0;
  const nextIndex = sequenceTotal > 0 ? (safeActiveIndex + 1) % sequenceTotal : 0;
  const thresholdActiveIndex = thresholdWorks.length > 0 ? safeActiveIndex % thresholdWorks.length : 0;
  const hasPractice = Boolean(practiceChamber || room.tagline || storyObjects.length > 0);
  const enterLabel = ctaLabel || "Enter";
  const thresholdRole = thresholdChamber?.metadata?.role || "fallback";
  const galleryRole = galleryChambers[0]?.metadata?.role || "fallback";
  const practiceRole = practiceChamber?.metadata?.role || "fallback";
  const thresholdLayout = thresholdChamber?.metadata?.layout || "focus";
  const galleryLayout = galleryChambers[0]?.metadata?.layout || "field";
  const practiceLayout = practiceChamber?.metadata?.layout || "stack";
  const thresholdTransition = thresholdChamber?.metadata?.transition || "recede";
  const galleryTransition = galleryChambers[0]?.metadata?.transition || "fade";
  const practiceTransition = practiceChamber?.metadata?.transition || "fade";
  const progressLabel =
    sequenceTotal > 0
      ? `${String(safeActiveIndex + 1).padStart(2, "0")} / ${String(sequenceTotal).padStart(2, "0")}`
      : "00 / 00";
  const focusedChamberId = view === "practice"
    ? practiceChamber?.id ?? null
    : view === "gallery"
      ? activeWork?.chamberId ?? null
      : thresholdChamber?.id ?? null;
  const environment = deriveStudioV2Environment({
    worldId: room.worldId,
    skin: room.skin,
    chambers: room.chambers,
    focusedChamberId,
    focusedObjectId: focusedArtwork?.id ?? activeObject?.id ?? null,
  });

  const syncViewFromLocation = useCallback(() => {
    if (editorBridge) return;
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "").toLowerCase();
    if (hash === "gallery" || hash === "practice") {
      setView(hash);
      return;
    }
    setView("threshold");
  }, [editorBridge]);

  const roomIdForView = useCallback(
    (nextView: BbbVisionPublicView): string | null => {
      if (nextView === "threshold") {
        return thresholdChamber?.id ?? entryChamber?.id ?? room.chambers[0]?.id ?? null;
      }
      if (nextView === "gallery") {
        return galleryChambers[0]?.id ?? activeWork?.chamberId ?? null;
      }
      return practiceChamber?.id ?? null;
    },
    [activeWork?.chamberId, entryChamber?.id, galleryChambers, practiceChamber?.id, room.chambers, thresholdChamber?.id],
  );

  const suppressUnsupportedChrome = useCallback(
    (controlId: string) => {
      if (!editorBridge) return false;
      const intent = { kind: "suppress-unsupported-chrome" as const, controlId };
      const result = editorBridge.handleIntent(intent);
      if (!validateStudioV2EditorBridgeResult(intent, result)) {
        throw new Error("Studio V3 bridge rejected BBB chrome suppression result.");
      }
      return true;
    },
    [editorBridge],
  );

  const suppressBbbAction = useCallback(
    (action: "cta" | "link", input: PresenceStudioV2EditorActivationInput) => {
      if (!editorBridge) return false;
      const intent = { kind: "suppress-action-without-piece" as const, action, input };
      const result = editorBridge.handleIntent(intent);
      if (!validateStudioV2EditorBridgeResult(intent, result)) {
        throw new Error("Studio V3 bridge rejected BBB public action suppression result.");
      }
      return true;
    },
    [editorBridge],
  );
  const onBbbCtaClick = (event: React.MouseEvent) => {
    if (!suppressBbbAction("cta", "pointer")) return;
    event.preventDefault();
    event.stopPropagation();
  };
  const onBbbCtaKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (!suppressBbbAction("cta", event.key === "Enter" ? "keyboard-enter" : "keyboard-space")) return;
    event.preventDefault();
    event.stopPropagation();
  };
  const onBbbLinkClick = (event: React.MouseEvent) => {
    if (!suppressBbbAction("link", "pointer")) return;
    event.preventDefault();
    event.stopPropagation();
  };
  const onBbbLinkKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (!suppressBbbAction("link", event.key === "Enter" ? "keyboard-enter" : "keyboard-space")) return;
    event.preventDefault();
    event.stopPropagation();
  };

  const moveToView = useCallback(
    (nextView: BbbVisionPublicView, mode: "push" | "replace" = "push") => {
      if (editorBridge) {
        const roomId = roomIdForView(nextView);
        if (!roomId) {
          suppressUnsupportedChrome(`bbb-navigate-${nextView}`);
          return;
        }
        const intent = { kind: "navigate-room" as const, roomId, source: "direct" as const };
        const result = editorBridge.handleIntent(intent);
        if (!validateStudioV2EditorBridgeResult(intent, result)) {
          throw new Error("Studio V3 bridge rejected BBB direct navigation result.");
        }
        return;
      }
      setView(nextView);
      onFocusArtwork(null);
      if (typeof window === "undefined") return;
      const baseUrl = `${window.location.pathname}${window.location.search}`;
      const targetUrl = nextView === "threshold" ? baseUrl : `${baseUrl}#${nextView}`;
      const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (currentUrl === targetUrl) return;
      window.history[mode === "replace" ? "replaceState" : "pushState"]({ bbbvisionView: nextView }, "", targetUrl);
    },
    [editorBridge, onFocusArtwork, roomIdForView, suppressUnsupportedChrome],
  );

  const markMovement = useCallback((nextMovement: BbbVisionMovement) => {
    setMovement(nextMovement);
    if (typeof window === "undefined") return;
    if (movementTimeoutRef.current !== null) {
      window.clearTimeout(movementTimeoutRef.current);
    }
    movementTimeoutRef.current = window.setTimeout(() => {
      setMovement(null);
      movementTimeoutRef.current = null;
    }, 520);
  }, []);

  const setActiveImage = useCallback(
    (nextIndex: number, nextMovement: BbbVisionMovement = "index") => {
      if (sequenceTotal < 1) return;
      const normalizedIndex = (nextIndex + sequenceTotal) % sequenceTotal;
      onActiveIndexChange(normalizedIndex);
      markMovement(nextMovement);
    },
    [markMovement, onActiveIndexChange, sequenceTotal],
  );

  useEffect(() => {
    syncViewFromLocation();
    window.addEventListener("hashchange", syncViewFromLocation);
    window.addEventListener("popstate", syncViewFromLocation);
    return () => {
      window.removeEventListener("hashchange", syncViewFromLocation);
      window.removeEventListener("popstate", syncViewFromLocation);
    };
  }, [syncViewFromLocation]);

  useEffect(() => {
    if (!visualOverrideActive || !editorActiveChamberId) return;
    if (editorActiveChamberId === editorThresholdChamberId) {
      setView("threshold");
    } else if (editorActiveChamberId === practiceChamber?.id) {
      setView("practice");
    } else {
      setView("gallery");
    }
  }, [editorActiveChamberId, editorThresholdChamberId, practiceChamber?.id, visualOverrideActive]);

  useEffect(() => {
    return () => {
      if (movementTimeoutRef.current !== null) {
        window.clearTimeout(movementTimeoutRef.current);
      }
    };
  }, []);

  // Canvas gallery handles its own mouse interaction; no global parallax needed.

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (editorBridge && event.target instanceof Element && event.target.closest('[data-testid="presence-public-film-strip"]')) return;
      if (editorBridge) {
        if (event.key === "Escape") {
          if (isEditableEventTarget(event.target)) return;
          event.preventDefault();
          const intent = { kind: "clear-selection" as const, source: "escape" as const };
          const result = editorBridge.handleIntent(intent);
          if (!validateStudioV2EditorBridgeResult(intent, result)) {
            throw new Error("Studio V3 bridge rejected BBB Escape result.");
          }
          return;
        }
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          if (isEditableEventTarget(event.target)) return;
          event.preventDefault();
          const idx = event.key === "ArrowLeft" ? previousIndex : nextIndex;
          const destinationRoomId = galleryWorks[idx]?.chamberId;
          if (!destinationRoomId) {
            suppressUnsupportedChrome(event.key === "ArrowLeft" ? "bbb-arrow-previous" : "bbb-arrow-next");
            return;
          }
          const intent = {
            kind: "navigate-room" as const,
            roomId: destinationRoomId,
            source: event.key === "ArrowLeft" ? "arrow-previous" as const : "arrow-next" as const,
          };
          const result = editorBridge.handleIntent(intent);
          if (!validateStudioV2EditorBridgeResult(intent, result)) {
            throw new Error("Studio V3 bridge rejected BBB Arrow navigation result.");
          }
          return;
        }
      }
      if (focusedArtwork && view === "gallery") {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          const idx = sequenceTotal > 0 ? (safeActiveIndex - 1 + sequenceTotal) % sequenceTotal : 0;
          setActiveImage(idx, "prev");
          const work = galleryWorks[idx];
          if (work?.object) onFocusArtwork(work.object);
          return;
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          const idx = sequenceTotal > 0 ? (safeActiveIndex + 1) % sequenceTotal : 0;
          setActiveImage(idx, "next");
          const work = galleryWorks[idx];
          if (work?.object) onFocusArtwork(work.object);
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          onFocusArtwork(null);
          return;
        }
      }
      if (!focusedArtwork && view === "gallery") {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          setActiveImage(previousIndex, "prev");
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          setActiveImage(nextIndex, "next");
        }
        if (event.key === "Escape") {
          event.preventDefault();
          moveToView("threshold");
        }
      }
      if (view === "practice" && event.key === "Escape") {
        event.preventDefault();
        moveToView("gallery");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editorBridge, focusedArtwork, galleryWorks, moveToView, nextIndex, onFocusArtwork, previousIndex, safeActiveIndex, sequenceTotal, setActiveImage, suppressUnsupportedChrome, view]);

  return (
    <main
      className={`presence-studio-v2-public world-${room.worldId} style-bbbvision-threshold-gallery v2-bbb-shell texture-${room.skin.texture} motion-${room.skin.motionIntensity} environment-focus-${environment.focus}${visualOverrideActive ? studioV2ExperienceClassName(room.skin) : ""} is-view-${view}${movement ? ` is-moving-${movement}` : ""}${activeObject?.image?.src ? " has-threshold-image" : ""}`}
      style={style}
      data-testid="presence-public-style-bbbvision-threshold-gallery"
      data-bbb-view={view}
      data-active-index={safeActiveIndex}
      data-environment-runtime="dom"
      data-experience-density={visualOverrideActive ? room.skin.experienceDensity : undefined}
      data-experience-atmosphere={visualOverrideActive ? room.skin.experienceAtmosphere : undefined}
      data-experience-piece-treatment={visualOverrideActive ? room.skin.experiencePieceTreatment : undefined}
      data-experience-journey={visualOverrideActive ? room.skin.experienceJourney : undefined}
    >
      <PresenceStudioV2EnvironmentLayer
        environment={environment}
        accent={room.skin.accentColor}
        background={room.skin.background}
        preview
      />
      {view === "threshold" && (
        <section
          className="v2-bbb-view v2-bbb-threshold"
          id="v2-bbb-threshold"
          data-testid="presence-public-bbbvision-threshold"
          data-testid-state="threshold"
          data-chamber-role={thresholdRole}
          data-chamber-layout={thresholdLayout}
          data-chamber-transition={thresholdTransition}
          aria-label={`${room.title} threshold`}
        >
          <div className="v2-bbb-slide-stack" aria-hidden="true">
            {thresholdWorks.length > 0 ? thresholdWorks.map((work, index) => (
              <img
                key={work.object.id}
                className={index === thresholdActiveIndex ? "is-active" : ""}
                src={work.object.image?.src}
                alt=""
                loading={index === 0 ? "eager" : "lazy"}
              />
            )) : <div className="v2-bbb-threshold-empty" />}
          </div>
          <div className="v2-bbb-threshold-wash" aria-hidden="true" />
          <div className="v2-bbb-brand-mark" style={bbbVisionBrandStyle(safeActiveIndex)}>{room.title}</div>
          <nav className="v2-bbb-dot-nav" aria-label="Threshold image path">
            {thresholdWorks.map((work, index) => (
              <button
                key={work.object.id}
                type="button"
                aria-label={`Set opening image to ${work.object.title}`}
                aria-current={index === thresholdActiveIndex ? "true" : undefined}
                className={index === thresholdActiveIndex ? "is-active" : ""}
                onClick={() => {
                  if (editorBridge) {
                    suppressUnsupportedChrome(`bbb-threshold-image-${index}`);
                    return;
                  }
                  setActiveImage(index, "index");
                }}
              />
            ))}
          </nav>
          <button
            className="v2-bbb-enter"
            data-testid="presence-public-bbbvision-enter"
            type="button"
            onClick={() => {
              if (!editorBridge) markMovement("enter");
              moveToView("gallery");
            }}
          >
            {enterLabel}
          </button>
        </section>
      )}

      {view === "gallery" && (
        <section
          className="v2-bbb-view v2-bbb-gallery"
          id="v2-bbb-gallery"
          data-testid="presence-public-bbbvision-gallery"
          data-chamber-role={galleryRole}
          data-chamber-layout={galleryLayout}
          data-chamber-transition={galleryTransition}
          aria-labelledby="v2-bbb-gallery-title"
        >
          <h2 className="v2-bbb-sr" id="v2-bbb-gallery-title">Gallery</h2>
          <header className="v2-bbb-gallery-head">
            <button type="button" className="v2-bbb-gallery-brand" onClick={() => moveToView("threshold")}>
              {room.title}
            </button>
            <div className="v2-bbb-progress v2-bbb-sr" data-testid="presence-public-bbbvision-progress" aria-live="polite">
              {progressLabel}
            </div>
            <nav className="v2-bbb-gallery-nav" aria-label="Gallery states">
              <button
                type="button"
                className="v2-bbb-nav-threshold"
                data-testid="presence-public-bbbvision-close"
                onClick={() => moveToView("threshold")}
                aria-label="Return to threshold"
              />
              {hasPractice && (
                <button
                  type="button"
                  className="v2-bbb-nav-practice"
                  data-testid="presence-public-bbbvision-practice-link"
                  onClick={() => moveToView("practice")}
                  aria-label="Open practice"
                />
              )}
            </nav>
          </header>

          <div className="v2-bbb-constellation">
            {filmStripGalleryChamber ? (
              <div className="v2-bbb-film-strip-room" data-v2-public-chamber-id={filmStripGalleryChamber.id}>
                <FilmStripSelectedWorksChamber
                  chamber={filmStripGalleryChamber}
                  radius={room.skin.objectRadius}
                  isGallery
                  onFocusArtwork={onFocusArtwork}
                  editorBridge={editorBridge}
                />
              </div>
            ) : galleryWorks.length > 0 ? (
              <BbbVisionCanvasGallery
                works={galleryWorks}
                activeIndex={safeActiveIndex}
                onSelectWork={(index) => setActiveImage(index, "index")}
                onFocusWork={(object) => onFocusArtwork(object)}
                focusOpen={Boolean(focusedArtwork)}
                editorBridge={editorBridge}
              />
            ) : (
              <div className="v2-bbb-empty-note">No public gallery images are available yet.</div>
            )}
          </div>

          {focusedArtwork?.image?.src && view === "gallery" && (
            <div
              className="v2-bbb-focus"
              data-testid="presence-public-bbbvision-focus"
              role="dialog"
              aria-modal="true"
              aria-label="Image focus"
              onClick={() => onFocusArtwork(null)}
            >
              <button
                type="button"
                className="v2-bbb-focus-backdrop"
                aria-label="Close image focus"
                onClick={() => onFocusArtwork(null)}
              />
              <img
                className="v2-bbb-focus-image"
                data-testid="presence-public-bbbvision-focus-image"
                src={focusedArtwork.image.src}
                alt={focusedArtwork.image.alt || focusedArtwork.title}
              />
              <span className="v2-bbb-focus-hint" aria-hidden="true">Click or press Escape to close</span>
            </div>
          )}
        </section>
      )}

      {view === "practice" && hasPractice && (
        <section
          className="v2-bbb-view v2-bbb-practice"
          id="v2-bbb-practice"
          data-testid="presence-public-bbbvision-practice"
          data-chamber-role={practiceRole}
          data-chamber-layout={practiceLayout}
          data-chamber-transition={practiceTransition}
          aria-labelledby="v2-bbb-practice-title"
        >
          <header className="v2-bbb-gallery-head">
            <button type="button" className="v2-bbb-gallery-brand" onClick={() => moveToView("threshold")}>
              {room.title}
            </button>
            <nav aria-label="Practice states">
              <button type="button" onClick={() => moveToView("gallery")}>
                Gallery
              </button>
              <button type="button" onClick={() => moveToView("threshold")}>
                Threshold
              </button>
            </nav>
          </header>
          <div className="v2-bbb-about">
            <div className="v2-bbb-about-copy">
              <span>{worldName}</span>
              <h2 id="v2-bbb-practice-title">Practice</h2>
              {room.tagline && <p>{room.tagline}</p>}
              {ctaHref && (
                <PublicLink
                  href={ctaHref}
                  className="v2-bbb-cta"
                  onClickCapture={editorBridge ? onBbbCtaClick : undefined}
                  onKeyDownCapture={editorBridge ? onBbbCtaKeyDown : undefined}
                >
                  {ctaLabel || "Begin"}
                </PublicLink>
              )}
            </div>
            {storyObjects.length > 0 && (
              <div className="v2-bbb-story-list">
                {storyObjects.map(({ object, chamberLabel }) => (
                  <article key={object.id}>
                    <span>{chamberLabel}</span>
                    <strong>{object.title}</strong>
                    {object.detail && <p>{object.detail}</p>}
                    {object.link && (
                      <PublicLink
                        href={object.link}
                        className="v2-bbb-story-link"
                        onClickCapture={editorBridge ? onBbbLinkClick : undefined}
                        onKeyDownCapture={editorBridge ? onBbbLinkKeyDown : undefined}
                      >
                        Open
                      </PublicLink>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {focusedArtwork?.image?.src && view !== "gallery" && (
        <div
          className="v2-public-artwork-focus v2-bbb-artwork-focus"
          data-testid="presence-public-artwork-focus"
          role="dialog"
          aria-modal="true"
          aria-label={`Image focus: ${focusedArtwork.title}`}
        >
          <button
            className="v2-public-artwork-focus-backdrop"
            type="button"
            aria-label="Close image focus"
            onClick={() => onFocusArtwork(null)}
          />
          <figure className="v2-public-artwork-focus-stage">
            <button
              className="v2-public-artwork-focus-close"
              data-testid="presence-public-artwork-focus-close"
              type="button"
              onClick={() => onFocusArtwork(null)}
            >
              Close
            </button>
            <img
              data-testid="presence-public-artwork-focus-image"
              src={focusedArtwork.image.src}
              alt={focusedArtwork.image.alt || focusedArtwork.title}
            />
            <figcaption>
              <strong>{focusedArtwork.title}</strong>
              {focusedArtwork.meta && <span>{focusedArtwork.meta}</span>}
              {focusedArtwork.detail && <p>{focusedArtwork.detail}</p>}
            </figcaption>
          </figure>
        </div>
      )}
    </main>
  );
}

function PublicObjectCard({
  object,
  radius,
  isGallery = false,
  isFeatured = false,
  onFocusArtwork,
  editorBridge,
}: {
  object: StudioV2PublicObject;
  radius: number;
  isGallery?: boolean;
  isFeatured?: boolean;
  onFocusArtwork?: (object: StudioV2PublicObject) => void;
  editorBridge?: PresenceStudioV2EditorBridge;
}) {
  const hasLink = Boolean(object.link);
  const roleLabel = publicObjectRoleLabel(object);
  const canFocusArtwork = isGallery && Boolean(object.image?.src) && !hasLink && Boolean(onFocusArtwork);
  function activateForEditor(input: PresenceStudioV2EditorActivationInput) {
    if (!editorBridge) return false;
    const pieceId = object.id.trim();
    const intent = pieceId
      ? { kind: "activate-piece" as const, pieceId, input }
      : { kind: "suppress-action-without-piece" as const, action: hasLink ? "link" as const : "cta" as const, input };
    const result = editorBridge.handleIntent(intent);
    if (!validateStudioV2EditorBridgeResult(intent, result)) {
      throw new Error("Studio V3 bridge rejected public object activation result.");
    }
    return true;
  }
  const onEditorClick = (event: React.MouseEvent) => {
    if (!activateForEditor("pointer")) return;
    event.preventDefault();
    event.stopPropagation();
  };
  const onEditorKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (!activateForEditor(event.key === "Enter" ? "keyboard-enter" : "keyboard-space")) return;
    event.preventDefault();
    event.stopPropagation();
  };
  const content = (
    <>
      {object.image?.src && (
        <div className="v2-public-object-media">
          <img
            className="v2-public-object-media-img"
            src={object.image.src}
            alt={object.image.alt || object.title}
            loading="lazy"
          />
          {canFocusArtwork && (
            <button
              className="v2-public-artwork-focus-trigger"
              data-testid="presence-public-artwork-focus-trigger"
              type="button"
              aria-haspopup="dialog"
              aria-label={`View ${object.title}`}
              onClickCapture={editorBridge ? onEditorClick : undefined}
              onKeyDownCapture={editorBridge ? onEditorKeyDown : undefined}
              onClick={() => onFocusArtwork?.(object)}
            >
              View work
            </button>
          )}
        </div>
      )}
      <div className="v2-public-object-copy">
        {roleLabel && <div className="v2-public-object-role">{roleLabel}</div>}
        <h3>{object.title}</h3>
        {object.meta && <p className="v2-public-object-meta">{object.meta}</p>}
        {object.detail && <p className="v2-public-object-detail">{object.detail}</p>}
        {hasLink && <span className="v2-public-object-action">Open path</span>}
      </div>
    </>
  );

  const style: CSSProperties = {
    borderRadius: radius,
    transform: objectTransform(object),
    zIndex: object.transform.zIndex,
  };

  if (hasLink) {
    return (
      <PublicLink
        href={object.link}
        id={`v2-public-object-${object.id}`}
        className={`v2-public-object v2-public-object-${object.type}${object.mobileVisible ? "" : " is-mobile-muted"}${isGallery && object.image?.src ? " is-artwork" : ""}${isFeatured ? " is-featured" : ""}`}
        style={style}
        onClickCapture={editorBridge ? onEditorClick : undefined}
        onKeyDownCapture={editorBridge ? onEditorKeyDown : undefined}
      >
        {content}
      </PublicLink>
    );
  }

  return (
    <article
      id={`v2-public-object-${object.id}`}
      className={`v2-public-object v2-public-object-${object.type}${object.mobileVisible ? "" : " is-mobile-muted"}${isGallery && object.image?.src ? " is-artwork" : ""}${isFeatured ? " is-featured" : ""}`}
      style={style}
      tabIndex={editorBridge || object.detail ? 0 : undefined}
      onClickCapture={editorBridge ? onEditorClick : undefined}
      onKeyDownCapture={editorBridge ? onEditorKeyDown : undefined}
    >
      {content}
    </article>
  );
}

function PublicLink({
  href,
  id,
  className,
  style,
  children,
  onClick,
  onKeyDown,
  onClickCapture,
  onKeyDownCapture,
}: {
  href?: string;
  id?: string;
  className: string;
  style?: CSSProperties;
  children: ReactNode;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLAnchorElement>;
  onClickCapture?: React.MouseEventHandler<HTMLAnchorElement>;
  onKeyDownCapture?: React.KeyboardEventHandler<HTMLAnchorElement>;
}) {
  if (!href) {
    return (
      <span id={id} className={`${className} is-disabled`} style={style}>
        {children}
      </span>
    );
  }
  const external = href.startsWith("http://") || href.startsWith("https://");
  return (
    <a
      id={id}
      href={href}
      className={className}
      style={style}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onClickCapture={onClickCapture}
      onKeyDownCapture={onKeyDownCapture}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

function objectTransform(object: StudioV2PublicObject): string | undefined {
  const { x, y, rotation, scale } = object.transform;
  if (x === 0 && y === 0 && rotation === 0 && scale === 1) return undefined;
  return `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${scale})`;
}

function publicObjectRoleLabel(object: StudioV2PublicObject): string | undefined {
  const label = object.role || object.type;
  if (!label) return undefined;
  const normalized = label.toLowerCase();
  if (["image", "text", "note", "link", "moodboard"].includes(normalized)) return undefined;
  if (normalized === object.type.toLowerCase()) return undefined;
  return label;
}

function isEditableEventTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}
