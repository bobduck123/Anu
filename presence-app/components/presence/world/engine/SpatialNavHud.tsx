"use client";

// SpatialNavHud — desktop navigation HUD.
//
// Four arrows (left / forward / right / back) plus a contextual label
// for the active chamber. Each arrow is disabled when no exit is
// available in that direction. Keyboard hint surfaces are also shown.

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, X } from "lucide-react";
import type { RoomChamberDef, RoomDirection, RoomNavigatorActions, RoomNavigatorState } from "@/lib/presence/world/graph";
import { findExit } from "@/lib/presence/world/graph";

interface SpatialNavHudProps {
  chamber: RoomChamberDef;
  state: RoomNavigatorState;
  actions: RoomNavigatorActions;
  /** Label rendered at the top — usually the entity's display name. */
  worldLabel: string;
  /** Eyebrow rendered above the label — world type. */
  worldEyebrow: string;
}

const DIRECTION_GLYPH: Record<RoomDirection, { Icon: typeof ArrowUp; key: string; label: string }> = {
  forward: { Icon: ArrowUp,    key: "↑",  label: "Forward" },
  left:    { Icon: ArrowLeft,  key: "←",  label: "Left" },
  right:   { Icon: ArrowRight, key: "→",  label: "Right" },
  back:    { Icon: ArrowDown,  key: "↓",  label: "Back" },
};

function DirectionButton({
  direction,
  chamber,
  state,
  actions,
}: {
  direction: RoomDirection;
  chamber: RoomChamberDef;
  state: RoomNavigatorState;
  actions: RoomNavigatorActions;
}) {
  const exit = findExit(chamber, direction);
  const enabled = direction === "back"
    ? state.history.length > 0 || Boolean(state.inspectingObjectId)
    : Boolean(exit);
  const { Icon, key, label } = DIRECTION_GLYPH[direction];
  const exitLabel = exit?.label ?? label;
  return (
    <button
      type="button"
      className="hud-dir"
      data-direction={direction}
      data-enabled={enabled}
      disabled={!enabled}
      onClick={() => actions.move(direction)}
      aria-label={`${label}${exit?.label ? ` — ${exit.label}` : ""}`}
      aria-keyshortcuts={key}
    >
      <Icon className="h-4 w-4" aria-hidden />
      <span className="hud-dir-label">{exitLabel}</span>
      <span className="hud-dir-key" aria-hidden>{key}</span>
    </button>
  );
}

export default function SpatialNavHud({
  chamber,
  state,
  actions,
  worldLabel,
  worldEyebrow,
}: SpatialNavHudProps) {
  const inspecting = Boolean(state.inspectingObjectId);
  return (
    <>
      <header className="presence-engine-threshold">
        <p className="threshold-eyebrow">{worldEyebrow}</p>
        <p className="threshold-name">{worldLabel}</p>
        <p className="threshold-chamber" aria-live="polite">
          <span className="chamber-dot" aria-hidden />
          {chamber.title}
        </p>
      </header>

      <nav className="presence-engine-hud" aria-label="Spatial navigation">
        <div className="hud-grid">
          <div className="hud-cell hud-cell-empty" aria-hidden />
          <DirectionButton direction="forward" chamber={chamber} state={state} actions={actions} />
          <div className="hud-cell hud-cell-empty" aria-hidden />
          <DirectionButton direction="left" chamber={chamber} state={state} actions={actions} />
          <button
            type="button"
            className="hud-center"
            onClick={() => (inspecting ? actions.closeInspect() : null)}
            aria-label={inspecting ? "Close panel" : "You are here"}
            aria-keyshortcuts={inspecting ? "Escape" : undefined}
            disabled={!inspecting}
          >
            {inspecting ? <X className="h-4 w-4" aria-hidden /> : <span className="hud-here-dot" aria-hidden />}
          </button>
          <DirectionButton direction="right" chamber={chamber} state={state} actions={actions} />
          <div className="hud-cell hud-cell-empty" aria-hidden />
          <DirectionButton direction="back" chamber={chamber} state={state} actions={actions} />
          <div className="hud-cell hud-cell-empty" aria-hidden />
        </div>
        <p className="hud-hint">
          Use the arrow keys, click the HUD, or tap an object to inspect.
        </p>
      </nav>
    </>
  );
}
