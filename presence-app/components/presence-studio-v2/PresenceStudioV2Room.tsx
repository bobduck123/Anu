"use client";

import { useRef, useState, type CSSProperties } from "react";
import type { StudioV2State, StudioV2Object } from "@/lib/presence/studio-v2";
import { deriveStudioV2Environment } from "@/lib/presence/studio-v2/environment";
import { normalizeStudioV2Composition, placementMoveError, studioV2Layout } from "@/lib/presence/studio-v2/layouts";
import PresenceStudioV2EnvironmentLayer from "./PresenceStudioV2EnvironmentLayer";

interface PresenceStudioV2RoomProps {
  state: StudioV2State;
  selectedId: string | null;
  activeChamberId?: string | null;
  mode: "guided" | "wild";
  viewport: "desktop" | "mobile";
  onSelectObject: (id: string | null) => void;
  onClearRoomFocus?: () => void;
  onBeginDrag?: (id: string, event: React.PointerEvent<HTMLElement>) => void;
  onBeginResize?: (id: string, corner: "tl" | "tr" | "bl" | "br", event: React.PointerEvent<HTMLElement>) => void;
  onBeginRotate?: (id: string, event: React.PointerEvent<HTMLElement>) => void;
  onMoveToZone?: (objectId: string, chamberId: string, zoneId: string) => string | null;
}

function roomForeground(background: string): string {
  const hex = background.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return "#17130f";
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
  return luminance < 132 ? "#f8f4ec" : "#17130f";
}

function ownerAreaPrompt(zoneId: string): string {
  if (zoneId === "opening-work" || zoneId === "threshold-image") return "Drag a piece here to make it the first thing visitors notice.";
  if (zoneId === "supporting-notes" || zoneId === "threshold-statement" || zoneId === "threshold-signal") return "Put supporting notes, proof, or context here.";
  if (zoneId === "cta-exit" || zoneId === "threshold-exit") return "Use this exit area for booking, contact, or next steps.";
  if (zoneId === "main-wall") return "Build the main part of the room here.";
  return "Drag a compatible piece into this area, or use the piece controls.";
}

export default function PresenceStudioV2Room({
  state,
  selectedId,
  activeChamberId,
  mode,
  viewport,
  onSelectObject,
  onClearRoomFocus,
  onBeginDrag,
  onBeginResize,
  onBeginRotate,
  onMoveToZone,
}: PresenceStudioV2RoomProps) {
  const isWild = mode === "wild";
  const suspendTransforms = !isWild;
  const suppressRoomDeselectRef = useRef(false);
  const [draggingObjectId, setDraggingObjectId] = useState<string | null>(null);
  const [draggingChamberId, setDraggingChamberId] = useState<string | null>(null);
  const [layoutNotice, setLayoutNotice] = useState<string | null>(null);
  function finishLayoutDrag(zoneId?: string, sourceObjectId = draggingObjectId, sourceChamberId = draggingChamberId) {
    const objectId = sourceObjectId;
    const chamberId = sourceChamberId;
    setDraggingObjectId(null); setDraggingChamberId(null);
    if (!objectId || !chamberId || !zoneId || !onMoveToZone) return;
    setLayoutNotice(onMoveToZone(objectId, chamberId, zoneId) ?? "Placed in the selected part of the room.");
  }
  function beginLayoutDrag(objectId: string, chamberId: string, event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault(); event.stopPropagation(); setDraggingObjectId(objectId); setDraggingChamberId(chamberId); setLayoutNotice(null);
    const complete = (upEvent: PointerEvent) => {
      const target = document.elementFromPoint(upEvent.clientX, upEvent.clientY) as HTMLElement | null;
      const zoneId = target?.closest<HTMLElement>("[data-layout-drop-zone]")?.dataset.layoutDropZone;
      finishLayoutDrag(zoneId, objectId, chamberId);
    };
    window.addEventListener("pointerup", complete, { once: true });
  }
  const environment = deriveStudioV2Environment({
    worldId: state.worldId,
    skin: state.skin,
    chambers: state.chambers,
    focusedChamberId: activeChamberId,
    focusedObjectId: selectedId,
  });
  const skinStyle = {
    "--v2-room-background": state.skin.background,
    "--v2-room-accent": state.skin.accentColor,
    "--v2-room-radius": `${state.skin.objectRadius}px`,
    "--v2-room-shadow": state.skin.shadowDepth,
    "--v2-room-ink": roomForeground(state.skin.background),
  } as CSSProperties;

  return (
    <div className="v2-stage">
      <div
        className={`v2-room world-${state.worldId} texture-${state.skin.texture} motion-${state.skin.motionIntensity} environment-focus-${environment.focus} ${viewport === "mobile" ? "mobile-viewport" : ""}`}
        style={skinStyle}
        data-environment-focus={environment.focus}
        onClick={() => {
          if (suppressRoomDeselectRef.current) {
            suppressRoomDeselectRef.current = false;
            return;
          }
          onSelectObject(null);
          onClearRoomFocus?.();
        }}
      >
        <PresenceStudioV2EnvironmentLayer
          environment={environment}
          accent={state.skin.accentColor}
          background={state.skin.background}
        />
        {layoutNotice && <div className="v2-layout-notice" role="status" data-testid="presence-studio-v2-layout-notice">{layoutNotice}</div>}
        <div className="v2-room-header">
          <div className="v2-room-eyebrow">{state.worldId}</div>
          <div className="v2-room-name" style={{ fontWeight: state.skin.headingWeight }}>
            {state.title}
          </div>
          {state.tagline && <div className="v2-room-tagline">{state.tagline}</div>}
        </div>

        {state.chambers.map((chamber) => (
          <div
            className={`v2-chamber${environment.focusedChamberId === chamber.id ? " is-environment-active" : ""}`}
            key={chamber.id}
            id={`presence-v2-chamber-${chamber.id}`}
            data-v2-chamber-id={chamber.id}
            data-environment-chamber={environment.focusedChamberId === chamber.id ? "active" : "rest"}
          >
            <div className="v2-chamber-label">{chamber.label}</div>
            <div className="v2-layout-label" data-testid="presence-studio-v2-layout-label">{studioV2Layout(chamber.composition?.layoutId).label}</div>
            <div className={`v2-layout-zones layout-${studioV2Layout(chamber.composition?.layoutId).id}`}>
              {studioV2Layout(chamber.composition?.layoutId).zones.map((zone) => {
                const composition = normalizeStudioV2Composition(chamber.composition, chamber.id, chamber.objects);
                const placements = composition.placements.filter((placement) => placement.zoneId === zone.id).sort((a, b) => a.order - b.order);
                const draggedObject = draggingChamberId === chamber.id ? chamber.objects.find((item) => item.id === draggingObjectId) : null;
                const canDropDraggedObject = Boolean(draggedObject && !placementMoveError(composition, draggedObject, zone.id));
                return (
                <section key={zone.id} className={`v2-layout-zone zone-${zone.id}${canDropDraggedObject ? " is-layout-drop-active" : ""}`} data-testid="presence-studio-v2-layout-zone" data-zone-id={zone.id} data-layout-drop-zone={zone.id} onPointerUp={() => finishLayoutDrag(zone.id)}>
                  <div className="v2-layout-zone-head"><strong>{zone.label}</strong><span>{zone.description}</span></div>
                  {placements.length === 0 && <p className="v2-layout-zone-empty">{ownerAreaPrompt(zone.id)}</p>}
                  <div className="v2-objects">
              {placements.map((placement) => {
                const obj = chamber.objects.find((item) => item.id === placement.objectId);
                return obj ? (
                <ObjectCard
                  key={obj.id}
                  obj={obj}
                  skin={state.skin}
                  isSelected={selectedId === obj.id}
                  canManipulate={isWild && selectedId === obj.id && !obj.locked}
                  mode={mode}
                  suspendTransforms={suspendTransforms}
                  onSuppressRoomDeselect={() => {
                    suppressRoomDeselectRef.current = true;
                  }}
                  onSelect={(e) => {
                    e.stopPropagation();
                    onSelectObject(obj.id);
                  }}
                  onBeginDrag={onBeginDrag}
                  onBeginResize={onBeginResize}
                  onBeginRotate={onBeginRotate}
                  onBeginLayoutDrag={(event) => beginLayoutDrag(obj.id, chamber.id, event)}
                />
                ) : null;
              })}
                  </div>
                </section>
                );
              })}
            </div>
          </div>
        ))}

        {/* Moodboard influence layer */}
        {state.moodboardRefs.length > 0 && (
          <div className="v2-influence-layer">
            <div className="v2-influence-title">Influence layer</div>
            <div className="v2-influence-list">
              {state.moodboardRefs.slice(0, 6).map((ref) => (
                <div className="v2-influence-chip" key={ref.id}>
                  <span style={{ background: ref.dot || state.skin.accentColor }} />
                  <strong>{ref.label}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Traces */}
        {state.traces.enabled && (
          <div className="v2-traces">
            <div className="v2-trace-strip">
              <span>{state.traces.entries ?? 0} entered</span>
              <span>{state.traces.seeds ?? 0} seeds</span>
              <span>{state.traces.guestbook ?? 0} guestbook</span>
              {state.traces.demo && (
                <span className="v2-trace-disclosure">{state.traces.disclosure || "Demo traces"}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ObjectCard({
  obj,
  skin,
  isSelected,
  canManipulate,
  mode,
  suspendTransforms,
  onSuppressRoomDeselect,
  onSelect,
  onBeginDrag,
  onBeginResize,
  onBeginRotate,
  onBeginLayoutDrag,
}: {
  obj: StudioV2Object;
  skin: StudioV2State["skin"];
  isSelected: boolean;
  canManipulate: boolean;
  mode: "guided" | "wild";
  suspendTransforms: boolean;
  onSuppressRoomDeselect: () => void;
  onSelect: (e: React.MouseEvent) => void;
  onBeginDrag?: (id: string, event: React.PointerEvent<HTMLElement>) => void;
  onBeginResize?: (id: string, corner: "tl" | "tr" | "bl" | "br", event: React.PointerEvent<HTMLElement>) => void;
  onBeginRotate?: (id: string, event: React.PointerEvent<HTMLElement>) => void;
  onBeginLayoutDrag?: (event: React.PointerEvent<HTMLButtonElement>) => void;
}) {
  const tf = obj.transform;
  const hasTransform = tf.x !== 0 || tf.y !== 0 || tf.rotation !== 0 || tf.scale !== 1;

  const style: React.CSSProperties = {
    borderRadius: skin.objectRadius,
  };

  if (!suspendTransforms && hasTransform) {
    style.transform = `translate(${tf.x}px, ${tf.y}px) rotate(${tf.rotation}deg) scale(${tf.scale})`;
    style.zIndex = tf.zIndex;
  }

  const badges: string[] = [];
  if (obj.locked) badges.push("Locked");
  if (obj.pinned) badges.push("Pinned");
  if (!obj.visibility.public) badges.push("Hidden public");
  if (!obj.visibility.mobile) badges.push("Hidden mobile");
  if (suspendTransforms && hasTransform) badges.push("Wild transform suspended");

  const editorClass = [
    obj.locked ? " is-locked" : "",
    obj.pinned ? " is-pinned" : "",
    !obj.visibility.public || !obj.visibility.mobile ? " is-hidden-state" : "",
    canManipulate ? " can-manipulate" : " cannot-manipulate",
  ].join("");

  return (
    <div
      id={`presence-v2-object-${obj.id}`}
      className={`v2-obj${isSelected ? " selected" : ""}${editorClass}`}
      data-role={obj.type}
      data-v2-object-id={obj.id}
      data-testid="presence-studio-v2-draggable-object"
      style={style}
      tabIndex={0}
      onClick={onSelect}
      onPointerDown={(event) => {
        if (!isSelected) return;
        event.stopPropagation();
        onSuppressRoomDeselect();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        if (!canManipulate) {
          event.preventDefault();
          return;
        }
        onBeginDrag?.(obj.id, event);
      }}
      onPointerUp={(event) => {
        if (isSelected) event.stopPropagation();
      }}
    >
      {isSelected && (
        <div
          data-testid="presence-studio-v2-selection-frame"
          className={`v2-selection-frame${canManipulate ? " active" : " disabled"}`}
          aria-label={`Selected ${obj.type}: ${obj.title}`}
        >
          <div data-testid="presence-studio-v2-selection-label" className="v2-selection-label">
            <span>{obj.type}</span>
            <strong>{obj.title || "Untitled"}</strong>
            {obj.locked && <em>Locked</em>}
            {obj.pinned && <em>Pinned</em>}
            {mode === "guided" && !obj.locked && <em>Guided</em>}
          </div>
          {onBeginLayoutDrag && <button type="button" className="v2-layout-drag-handle" data-testid="presence-studio-v2-layout-drag-handle" aria-label={`Arrange ${obj.title}`} onPointerDown={onBeginLayoutDrag}>Arrange</button>}
          {(["tl", "tr", "bl", "br"] as const).map((corner) => (
            <span
              key={corner}
              data-testid="presence-studio-v2-resize-handle"
              className={`v2-resize-handle ${corner}`}
              role="button"
              aria-label={`Resize selected object from ${corner} corner`}
              aria-disabled={!canManipulate}
              onPointerDown={(event) => {
                event.stopPropagation();
                if (canManipulate) onBeginResize?.(obj.id, corner, event);
              }}
            />
          ))}
          <button
            type="button"
            data-testid="presence-studio-v2-rotate-handle"
            className="v2-rotate-handle"
            aria-label="Rotate selected object"
            aria-disabled={!canManipulate}
            onPointerDown={(event) => {
              event.stopPropagation();
              if (canManipulate) onBeginRotate?.(obj.id, event);
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 2v6h-6" />
              <path d="M21 13a9 9 0 1 1-3-6.7L21 8" />
            </svg>
          </button>
        </div>
      )}
      {/* Editor badges */}
      {badges.length > 0 && (
        <div className="v2-obj-badges">
          {badges.map((b) => (
            <span className="v2-obj-badge" key={b}>{b}</span>
          ))}
        </div>
      )}
      {(obj.locked || obj.pinned) && (
        <div className="v2-obj-corner">
          {obj.locked && <span title="Locked">🔒</span>}
          {obj.pinned && <span title="Pinned">📌</span>}
        </div>
      )}

      {/* Object content */}
      {obj.image?.src && (
        <img className="v2-obj-image" src={obj.image.src} alt={obj.image.alt || obj.title} />
      )}
      <div className="v2-obj-title">{obj.title}</div>
      {obj.meta && <div className="v2-obj-meta">{obj.meta}</div>}
      {obj.detail && <div className="v2-obj-detail">{obj.detail}</div>}
      {obj.link && (
        <div className="v2-obj-link">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.71"/></svg>
          {obj.link}
        </div>
      )}
    </div>
  );
}
