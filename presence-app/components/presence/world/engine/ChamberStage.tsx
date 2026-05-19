"use client";

// ChamberStage — renders the active chamber's content.
//
// The stage delegates the chamber-internal layout to a slot renderer
// supplied by the room (gallery vs sound vs studio). This keeps the
// engine generic while each world authors its own object arrangement.

import type { ChamberSlotRenderer, RoomChamberDef } from "@/lib/presence/world/graph";

interface ChamberStageProps {
  chamber: RoomChamberDef;
  renderSlot: ChamberSlotRenderer;
  inspectingObjectId: string | null;
  onInspect: (objectId: string) => void;
  isCurrent?: boolean;
}

export default function ChamberStage({
  chamber,
  renderSlot,
  inspectingObjectId,
  onInspect,
  isCurrent = true,
}: ChamberStageProps) {
  return (
    <section
      className={`presence-chamber-stage chamber-role-${chamber.role}`}
      data-chamber-id={chamber.id}
      data-chamber-atmosphere={chamber.atmosphere ?? "default"}
      data-current={isCurrent ? "true" : "false"}
      aria-label={`${chamber.role}: ${chamber.title}`}
    >
      <div className="chamber-stage-cap">
        <p className="chamber-stage-role">{chamber.role}</p>
        <h2 className="chamber-stage-title">{chamber.title}</h2>
        {chamber.caption && <p className="chamber-stage-caption">{chamber.caption}</p>}
      </div>
      <div className="chamber-stage-body">
        {renderSlot({ chamber, inspectingObjectId, onInspect, isCurrent })}
      </div>
    </section>
  );
}
