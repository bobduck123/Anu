# Standard and Debug Route Parity

## Source Finding

`/studio/[id]/editor` and `/studio/[id]/editor?debug=1` share:

- the same Next route module;
- the same `useOwnerNode()` session and owner-room guard;
- the same Canvas editor component;
- the same protected API calls.

The query flag is read only after the editor has rendered. It conditionally adds an owner-visible diagnostics section; it does not skip or weaken the gate.

## Implemented Diagnostic Clarification

The diagnostics section now explicitly states:

- frontend host;
- backend host;
- bearer owner-session transport;
- auth provider session readiness;
- safe read recovery state;
- preview repair state;
- `Debug mode: display-only`.

## Automated Proof

The Playwright auth-gate spec proves:

- one sign-in opens the standard editor;
- standard editor survives hard refresh;
- the debug route renders the same Canvas plus diagnostics;
- anonymous `/editor?debug=1` receives the sign-in gate and never sees diagnostics;
- non-owner `/editor?debug=1` receives room denial and never sees diagnostics.

## Hosted Interpretation

Because there is no code-level debug bypass, the prior hosted difference should be treated as session/read timing until the patched deployment is re-smoked from fresh incognito state.
