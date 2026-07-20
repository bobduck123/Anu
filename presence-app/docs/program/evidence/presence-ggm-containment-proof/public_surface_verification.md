# GGM Public Surface Verification

## Backend baseline

The controlled backend candidate is draft/private/private, and the anonymous backend gallery no longer returns it. The public-detail backend endpoint was not used because it can write analytics.

## Local browser verification

The targeted Playwright suite ran against the repository mock backend and a local webpack development server. It performed no hosted request, control-plane access, or data mutation.

| Surface | Result |
|---|---|
| Canonical public room | 404 when the backend omits the contained record; no GGM fallback content |
| Legacy public alias | Same 404 result; no fallback content |
| Direct GGM work-detail URL | 404; fixture metadata fallback is suppressed |
| Default gallery | No synthetic GGM card, link, or external mock-up reference |
| Search and filtered gallery | No GGM reintroduction |
| Unrelated demo route | Still resolves through its documented fallback |
| Backend-published room | Still renders normally |
| Authenticated Studio editor | Still reads the mock owner room normally |

## External public-demo reference

The GGM faithful renderer now suppresses the external public-demo reference for the contained slug. The separate external mock-up deployment is not modified or verified by this task.

## Static assets

The local test does not make direct asset URLs private. Existing bundled artistic assets remain directly served from the static directory, documented as a separate media-hardening risk.

## Hosted production verification - 2026-07-20

Deployment `presence-92qntt36q-emadhatu-2110s-projects` reached Ready production state and the active Presence alias was checked with `Cache-Control: no-cache, no-store, max-age=0` and `Pragma: no-cache`. Each route was requested twice; results were consistent, so no deployment or CDN delay was evident.

| Surface | Result |
|---|---|
| Gallery | `200` twice; no GGM card or canonical GGM link |
| Canonical GGM route | `404` twice; no fallback content |
| Legacy GGM route | `404` twice; no fallback content |
| Presence chooser | `200` twice; no GGM exposure |
| Unrelated demo profile | `200` twice |
| Gallery-derived backend-published Presence | `200` twice |
| Checked anonymous rendered HTML | No external GGM mock-up URL |
| Backend public gallery | `200`; all available gallery items returned in one page and the contained candidate was absent |
| Existing bundled GGM static artwork | `200`; direct static-media access remains the separately documented hardening risk |

No backend mutation, control-plane authentication, Studio write surface, or intentional direct call to the analytics-writing public-detail endpoint was used.

## Interpretation

Hosted frontend containment is complete. GGM remains private working proof, not a system-native migration or launch claim. Owner-bound Studio proof remains a separate blocker.
