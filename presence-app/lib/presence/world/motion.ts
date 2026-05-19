// Shared motion tokens — Pass 6.
//
// One source of truth for easing, duration, and inertia values used
// across the Presence engine. Replaces ad-hoc cubic-bezier calls
// scattered through CSS so motion feels coherent across the room
// engine, the new dynamics, and the customisation chooser.
//
// Philosophy: calm > kinetic. Curves are biased toward soft entries
// and decisive exits (the user should feel they made a decision, not
// that the UI bounced).

export const PRESENCE_EASE = {
  /** soft, calm entry — for chamber settle, portal open */
  calm: "cubic-bezier(0.22, 0.88, 0.24, 1)",
  /** decisive exit — for retreat, panel close */
  exit: "cubic-bezier(0.32, 0, 0.72, 0)",
  /** human nudge — for hover/tap response */
  nudge: "cubic-bezier(0.34, 1.3, 0.64, 1)",
  /** breathing — for slow continuous loops (gallery breath, LED) */
  breath: "cubic-bezier(0.45, 0.05, 0.55, 0.95)",
  /** snappy — for HUD button feedback */
  snap: "cubic-bezier(0.4, 0.0, 0.2, 1)",
} as const;

export const PRESENCE_DURATION_MS = {
  /** smallest perceptible — pure feedback (focus rings, button press) */
  flicker: 120,
  /** quick — hover, tap, small UI feedback */
  quick: 200,
  /** standard — most transitions */
  base: 320,
  /** chamber move — directional camera shift */
  chamber: 540,
  /** portal — inspect open/close */
  portal: 460,
  /** epic — entrance, reveal */
  epic: 760,
} as const;

/** When two consecutive movements are queued, this debounce prevents jitter. */
export const PRESENCE_INPUT_DEBOUNCE_MS = 80;

/** Multiplier applied to all durations when the user has enabled
 * reduced motion. Use with `Math.round(base * PRESENCE_REDUCED_FACTOR)`. */
export const PRESENCE_REDUCED_FACTOR = 0.2;

/** Inject the tokens as CSS custom properties on :root so any CSS can
 * use var(--presence-ease-calm) etc. Called once per app. */
export function presenceMotionCssVars(): string {
  return `
:root {
  --presence-ease-calm: ${PRESENCE_EASE.calm};
  --presence-ease-exit: ${PRESENCE_EASE.exit};
  --presence-ease-nudge: ${PRESENCE_EASE.nudge};
  --presence-ease-breath: ${PRESENCE_EASE.breath};
  --presence-ease-snap: ${PRESENCE_EASE.snap};
  --presence-duration-flicker: ${PRESENCE_DURATION_MS.flicker}ms;
  --presence-duration-quick: ${PRESENCE_DURATION_MS.quick}ms;
  --presence-duration-base: ${PRESENCE_DURATION_MS.base}ms;
  --presence-duration-chamber: ${PRESENCE_DURATION_MS.chamber}ms;
  --presence-duration-portal: ${PRESENCE_DURATION_MS.portal}ms;
  --presence-duration-epic: ${PRESENCE_DURATION_MS.epic}ms;
}
@media (prefers-reduced-motion: reduce) {
  :root {
    --presence-duration-flicker: 0ms;
    --presence-duration-quick: 0ms;
    --presence-duration-base: 60ms;
    --presence-duration-chamber: 80ms;
    --presence-duration-portal: 60ms;
    --presence-duration-epic: 100ms;
  }
}
`.trim();
}
