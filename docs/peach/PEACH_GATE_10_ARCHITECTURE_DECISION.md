# PEACH Gate 10 Architecture Decision

Date: 2026-07-31
Repo: C:\Dev\Flora_fauna
Gate: 10 - Controlled ANU internal pilot rehearsal

## Gate 9 baseline

Gate 9 established ANU-native Contribution, ConsentRecord, and ContributionReviewEvent persistence in the Flask backend. Contributions submit against Field 001, default to `pending_review`, remain `public_display = false`, and create explicit ConsentRecord rows with consent version `gate9-v1`. Protected steward APIs already exist under `/api/control/peach`, and creation/review mutation writes `AuditLog` events.

## Gate 10 surface placement

Gate 10 keeps the same architecture boundary:

- Public participant mutations live in the ANU backend under `/api/peach`.
- Privileged steward workflows live in the ANU backend under `/api/control/peach`.
- Public Next pages render participant forms and call the backend through `apiFetch`.
- Steward Next pages live under `frontend-next/src/app/(control)/control/peach` and call backend control APIs through the existing `/api/control/*` proxy.

## Backend/API approach

Gate 10 adds two durable backend models:

- `PeachConsentOperationRequest`
- `PeachSupportIntent`

Public APIs added:

- `POST /api/peach/consent/request`
- `POST /api/peach/fields/studying-ourselves/support-intents`

Protected APIs added:

- `GET /api/control/peach/consent-operations`
- `PATCH /api/control/peach/consent-operations/<id>`
- `GET /api/control/peach/support-intents`

The existing contribution review APIs remain the canonical contribution review path.

## Frontend steward UI approach

Gate 10 adds a compact control workspace at `/control/peach`. It is intentionally operational rather than public-facing. It lists contributions, consent operation requests, and support intents, and allows steward status updates for contribution review and consent operations.

Browser requests do not call backend control URLs directly. The workspace uses `controlFetchJson`, and the control proxy now allowlists `/api/control/peach/*` through a PEACH-specific route-family rule.

## Auth/control-plane approach

The backend continues to use `control_plane_required`. The frontend route is under the existing `(control)/control` group, which restricts `/control/*` to configured control hosts. The control proxy still requires a valid control session and mints privileged control tokens server-side.

## Held surfaces

Gate 10 still does not implement public contribution display, public Commons/Yield release, file uploads, youth/child collection, sensitive testimony collection, email automation, real payments, checkout, cart, ecommerce, or Presence integration.

## Public-release blockers

Public release remains blocked by the held consent/publication/safeguarding workflows and by broader ANU suite health. The known broader backend suite status from Gate 9 remains `3 failed, 334 passed, 5 errors`, with failures outside the PEACH Gate 9/10 tests.