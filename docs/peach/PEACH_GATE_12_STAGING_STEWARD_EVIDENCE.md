# PEACH Gate 12 Staging Steward Evidence

Date: 2026-07-31

## Steward protection

Unauthenticated control access was rejected.

- Direct backend rehearsal: unauthenticated `GET /api/control/peach/contributions` returned 401.
- Frontend control proxy: unauthenticated `GET /api/control/core/api/control/peach/contributions` returned 401 with `control_session_required`.

## Steward actions verified

The PostgreSQL rehearsal created a steward user and exercised steward-protected review paths.

Review outcomes:

| Contribution | Starting status | Steward status |
| --- | --- | --- |
| Gate12 Witness A | `pending_review` | `held` |
| Gate12 Contributor B | `pending_review` | `accepted_private` |
| Gate12 Contributor C | `pending_review` | `rejected` |

## Review audit evidence

Audit count:

`peach.contribution.review_status_changed`: 3

## Public-display protection

All reviewed contributions retained `public_display = false`.

The database rejected a direct attempt to set `public_display = true`.

## Boundary

`accepted_private` is not a public approval state. No steward action in Gate 12 published a participant body or released a Commons/Yield artifact.
