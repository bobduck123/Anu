// RoomGraph types — Pass 4.
//
// A Presence Room is no longer a stack of chambers; it is a graph the
// user walks through. Each chamber declares its own exits (forward,
// left, right, back) and its inventory of room objects. Inspection
// happens against a single object at a time via a PortalPanel.
//
// The graph is data only — pure, serializable, and ready for a future
// `metadata.room_graph` persistence path (mirroring Pass 2's
// metadata.presence_dna). Resolution today is in-frontend from DNA +
// node content; the architecture is forward-compatible with a backend
// override.

import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Direction & exits
// ---------------------------------------------------------------------------
export type RoomDirection = "forward" | "left" | "right" | "back";

export type RoomTransition = "turn" | "push" | "retreat" | "portal" | "fade";

export interface RoomExit {
  direction: RoomDirection;
  targetChamberId: string;
  label?: string;
  transition?: RoomTransition;
}

// ---------------------------------------------------------------------------
// Room object — the interactive things inside a chamber
// ---------------------------------------------------------------------------
export type RoomObjectKind =
  | "work"
  | "service"
  | "statement"
  | "booking"
  | "audio"
  | "gallery"
  | "contact"
  | "memory"
  | "external";

export type RoomObjectPosition =
  | "left-wall"
  | "right-wall"
  | "center"
  | "foreground"
  | "ceiling"
  | "floor"
  | "portal";

export interface RoomObjectMedia {
  imageUrl?: string | null;
  audioUrl?: string | null;
  embedHtml?: string | null;
  caption?: string | null;
  meta?: string | null;
  href?: string | null;
}

export interface RoomObjectAction {
  kind: "open_url" | "open_panel" | "open_enquiry" | "play";
  href?: string | null;
  panelKey?: string;
}

export interface RoomObjectDef {
  id: string;
  kind: RoomObjectKind;
  title: string;
  summary?: string;
  media?: RoomObjectMedia;
  action?: RoomObjectAction;
  position?: RoomObjectPosition;
}

// ---------------------------------------------------------------------------
// Chamber
// ---------------------------------------------------------------------------
export type RoomChamberRole =
  | "threshold"
  | "gallery"
  | "studio"
  | "booth"
  | "archive"
  | "services"
  | "booking"
  | "contact"
  | "statement"
  | "portal";

export interface RoomChamberDef {
  id: string;
  title: string;
  role: RoomChamberRole;
  /** Short subtitle / instruction shown when entering the chamber. */
  caption?: string;
  /** Wallpaper / atmospheric variant identifier (resolved by ChamberStage). */
  atmosphere?: string;
  objects: RoomObjectDef[];
  exits: RoomExit[];
}

// ---------------------------------------------------------------------------
// Room graph
// ---------------------------------------------------------------------------
export interface RoomGraph {
  id: string;
  entryChamberId: string;
  chambers: RoomChamberDef[];
}

// ---------------------------------------------------------------------------
// Navigator state — owned by useRoomNavigator
// ---------------------------------------------------------------------------
export interface RoomNavigatorState {
  activeChamberId: string;
  /** Stack of chamber ids visited via forward/left/right (for retreat). */
  history: string[];
  /** Direction the camera should animate from. */
  lastDirection: RoomDirection | null;
  /** Currently-inspected object (null when nothing is open). */
  inspectingObjectId: string | null;
}

export interface RoomNavigatorActions {
  move: (direction: RoomDirection) => void;
  goTo: (chamberId: string, direction?: RoomDirection) => void;
  inspect: (objectId: string) => void;
  closeInspect: () => void;
  retreat: () => void;
}

// ---------------------------------------------------------------------------
// Slot adapters — the chamber stage can render its objects via a slot
// renderer supplied by the room (gallery vs sound vs studio). This keeps
// the engine generic while letting each world look like itself.
// ---------------------------------------------------------------------------
export interface ChamberSlotProps {
  chamber: RoomChamberDef;
  inspectingObjectId: string | null;
  onInspect: (objectId: string) => void;
  /** True when this chamber is the active (current) one. Pre-mounted
   * neighbours pass false so they can skip expensive content like
   * audio iframes. Pass 5. */
  isCurrent?: boolean;
}

export type ChamberSlotRenderer = (props: ChamberSlotProps) => ReactNode;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export function findChamber(graph: RoomGraph, id: string): RoomChamberDef | undefined {
  return graph.chambers.find((c) => c.id === id);
}

export function findExit(chamber: RoomChamberDef, direction: RoomDirection): RoomExit | undefined {
  return chamber.exits.find((e) => e.direction === direction);
}

export function findObject(chamber: RoomChamberDef, objectId: string): RoomObjectDef | undefined {
  return chamber.objects.find((o) => o.id === objectId);
}

/** Opposite direction — used when an exit doesn't define `back` explicitly. */
export function oppositeDirection(direction: RoomDirection): RoomDirection {
  switch (direction) {
    case "forward": return "back";
    case "back":    return "forward";
    case "left":    return "right";
    case "right":   return "left";
  }
}
