"use client";

// useRoomNavigator — the navigator hook (Pass 4).
//
// Owns active chamber, movement history, last direction, and the
// currently-inspected object. Wires up keyboard navigation, browser
// back-button handling (via popstate), and deep linking through the URL
// hash (`#chamber-id`). All behaviour is opt-in and the hook is
// SSR-safe.
//
// Design notes:
// - Reducer-based to keep state transitions predictable.
// - Deep link reads the hash on mount only; subsequent hash updates
//   come from the reducer so we never fight ourselves.
// - History stack drives `retreat()`; when empty, retreat closes any
//   open panel; if no panel either, retreat is a no-op.
// - popstate (browser back) triggers retreat if there is a navigator
//   history entry; otherwise it lets the browser navigate away.

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import {
  findChamber,
  findExit,
  oppositeDirection,
  type RoomDirection,
  type RoomGraph,
  type RoomNavigatorActions,
  type RoomNavigatorState,
} from "./graph";

export type NavigatorAction =
  | { type: "MOVE"; direction: RoomDirection }
  | { type: "GO_TO"; chamberId: string; direction?: RoomDirection }
  | { type: "RETREAT" }
  | { type: "INSPECT"; objectId: string }
  | { type: "CLOSE_INSPECT" }
  | { type: "HASH_SYNC"; chamberId: string };

type Action = NavigatorAction;

export interface ReducerContext {
  graph: RoomGraph;
}

export function makeRoomNavigatorReducer(ctx: ReducerContext) {
  return makeReducer(ctx);
}

function makeReducer(ctx: ReducerContext) {
  const { graph } = ctx;
  return function reducer(state: RoomNavigatorState, action: Action): RoomNavigatorState {
    switch (action.type) {
      case "MOVE": {
        if (state.inspectingObjectId) {
          // While inspecting, "back" closes the panel; other directions are ignored.
          if (action.direction === "back") {
            return { ...state, inspectingObjectId: null, lastDirection: "back" };
          }
          return state;
        }
        const current = findChamber(graph, state.activeChamberId);
        if (!current) return state;
        const exit = findExit(current, action.direction);
        if (!exit) return state;
        const target = findChamber(graph, exit.targetChamberId);
        if (!target) return state;
        return {
          ...state,
          activeChamberId: target.id,
          history: [...state.history, state.activeChamberId],
          lastDirection: action.direction,
        };
      }
      case "GO_TO": {
        if (state.activeChamberId === action.chamberId) return state;
        const target = findChamber(graph, action.chamberId);
        if (!target) return state;
        return {
          ...state,
          activeChamberId: action.chamberId,
          history: [...state.history, state.activeChamberId],
          lastDirection: action.direction ?? "forward",
        };
      }
      case "RETREAT": {
        if (state.inspectingObjectId) {
          return { ...state, inspectingObjectId: null, lastDirection: "back" };
        }
        if (state.history.length === 0) return state;
        const previous = state.history[state.history.length - 1];
        return {
          ...state,
          activeChamberId: previous,
          history: state.history.slice(0, -1),
          lastDirection: "back",
        };
      }
      case "INSPECT":
        return { ...state, inspectingObjectId: action.objectId };
      case "CLOSE_INSPECT":
        return { ...state, inspectingObjectId: null, lastDirection: "back" };
      case "HASH_SYNC":
        if (state.activeChamberId === action.chamberId) return state;
        return {
          ...state,
          activeChamberId: action.chamberId,
          // Don't grow history for hash-driven navigation.
          lastDirection: state.lastDirection ?? "forward",
        };
      default:
        return state;
    }
  };
}

function readHashChamberId(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#/, "");
  return hash || null;
}

export interface UseRoomNavigatorOptions {
  /** Sync active chamber to `location.hash`. Default true. */
  syncHash?: boolean;
  /** Enable keyboard navigation. Default true. */
  enableKeyboard?: boolean;
  /** Enable popstate back-button hook. Default true. */
  enablePopState?: boolean;
}

export function useRoomNavigator(
  graph: RoomGraph,
  options: UseRoomNavigatorOptions = {},
): [RoomNavigatorState, RoomNavigatorActions] {
  const { syncHash = true, enableKeyboard = true, enablePopState = true } = options;
  const reducer = useMemo(() => makeReducer({ graph }), [graph]);

  // Initialise from hash if valid; otherwise the entry chamber.
  const initial = useMemo<RoomNavigatorState>(() => {
    const hashId = syncHash ? readHashChamberId() : null;
    const validHash = hashId && findChamber(graph, hashId) ? hashId : null;
    return {
      activeChamberId: validHash ?? graph.entryChamberId,
      history: [],
      lastDirection: null,
      inspectingObjectId: null,
    };
  }, [graph, syncHash]);

  const [state, dispatch] = useReducer(reducer, initial);
  const stateRef = useRef(state);
  stateRef.current = state;

  const actions = useMemo<RoomNavigatorActions>(() => ({
    move(direction) {
      dispatch({ type: "MOVE", direction });
    },
    goTo(chamberId, direction) {
      dispatch({ type: "GO_TO", chamberId, direction });
    },
    inspect(objectId) {
      dispatch({ type: "INSPECT", objectId });
    },
    closeInspect() {
      dispatch({ type: "CLOSE_INSPECT" });
    },
    retreat() {
      dispatch({ type: "RETREAT" });
    },
  }), []);

  // Hash sync — write
  useEffect(() => {
    if (!syncHash) return;
    if (typeof window === "undefined") return;
    const currentHash = window.location.hash.replace(/^#/, "");
    if (currentHash === state.activeChamberId) return;
    // Use replaceState to avoid bloating the browser history every move.
    window.history.replaceState(null, "", `#${state.activeChamberId}`);
  }, [state.activeChamberId, syncHash]);

  // Hash sync — read (back/forward / external hash changes)
  useEffect(() => {
    if (!syncHash) return;
    if (typeof window === "undefined") return;
    function onHashChange() {
      const id = readHashChamberId();
      if (!id) return;
      if (!findChamber(graph, id)) return;
      dispatch({ type: "HASH_SYNC", chamberId: id });
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [graph, syncHash]);

  // popstate — browser back closes panel or retreats
  useEffect(() => {
    if (!enablePopState) return;
    if (typeof window === "undefined") return;
    function onPopState(e: PopStateEvent) {
      const current = stateRef.current;
      if (current.inspectingObjectId) {
        e.preventDefault?.();
        dispatch({ type: "CLOSE_INSPECT" });
        return;
      }
      if (current.history.length > 0) {
        // Browser navigated; treat as retreat.
        dispatch({ type: "RETREAT" });
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [enablePopState]);

  // Keyboard navigation
  useEffect(() => {
    if (!enableKeyboard) return;
    if (typeof window === "undefined") return;
    function onKey(e: KeyboardEvent) {
      // Don't steal keyboard from inputs or editable surfaces.
      const target = e.target;
      if (target instanceof HTMLElement) {
        if (target.closest("input, textarea, select, [contenteditable]") || target.isContentEditable) {
          return;
        }
      }
      switch (e.key) {
        case "ArrowUp":
        case "Enter":
          e.preventDefault();
          dispatch({ type: "MOVE", direction: "forward" });
          break;
        case "ArrowLeft":
          e.preventDefault();
          dispatch({ type: "MOVE", direction: "left" });
          break;
        case "ArrowRight":
          e.preventDefault();
          dispatch({ type: "MOVE", direction: "right" });
          break;
        case "ArrowDown":
          e.preventDefault();
          dispatch({ type: "MOVE", direction: "back" });
          break;
        case "Escape":
          if (stateRef.current.inspectingObjectId) {
            e.preventDefault();
            dispatch({ type: "CLOSE_INSPECT" });
          }
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enableKeyboard]);

  return [state, actions];
}
