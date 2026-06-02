"use client";

import type { StudioV2State, StudioV2Object } from "@/lib/presence/studio-v2";

interface PresenceStudioV2RoomProps {
  state: StudioV2State;
  selectedId: string | null;
  mode: "guided" | "wild";
  viewport: "desktop" | "mobile";
  onSelectObject: (id: string | null) => void;
}

export default function PresenceStudioV2Room({
  state,
  selectedId,
  mode,
  viewport,
  onSelectObject,
}: PresenceStudioV2RoomProps) {
  const isWild = mode === "wild";
  const suspendTransforms = !isWild;

  return (
    <div className="v2-stage">
      <div
        className={`v2-room world-${state.worldId} ${viewport === "mobile" ? "mobile-viewport" : ""}`}
        onClick={() => onSelectObject(null)}
      >
        <div className="v2-room-header">
          <div className="v2-room-eyebrow">{state.worldId}</div>
          <div className="v2-room-name" style={{ fontWeight: state.skin.headingWeight }}>
            {state.title}
          </div>
          {state.tagline && <div className="v2-room-tagline">{state.tagline}</div>}
        </div>

        {state.chambers.map((chamber) => (
          <div className="v2-chamber" key={chamber.id}>
            <div className="v2-chamber-label">{chamber.label}</div>
            <div className="v2-objects">
              {chamber.objects.map((obj) => (
                <ObjectCard
                  key={obj.id}
                  obj={obj}
                  skin={state.skin}
                  isSelected={selectedId === obj.id}
                  suspendTransforms={suspendTransforms}
                  onSelect={(e) => {
                    e.stopPropagation();
                    onSelectObject(obj.id);
                  }}
                />
              ))}
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
  suspendTransforms,
  onSelect,
}: {
  obj: StudioV2Object;
  skin: StudioV2State["skin"];
  isSelected: boolean;
  suspendTransforms: boolean;
  onSelect: (e: React.MouseEvent) => void;
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
  ].join("");

  return (
    <div
      className={`v2-obj${isSelected ? " selected" : ""}${editorClass}`}
      data-role={obj.type}
      style={style}
      onClick={onSelect}
    >
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
