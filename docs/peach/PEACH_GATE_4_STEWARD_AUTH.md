# PEACH Gate 4 Steward Auth

Status: local internal scaffold only

## Implemented

Gate 4 adds a minimal steward authentication boundary for development and internal pilot rehearsal.

- Steward pages require a `peach_steward` cookie matching `PEACH_STEWARD_PASSWORD`.
- `/steward/login` creates the cookie through a server action.
- `/steward/contributions` redirects unauthenticated visitors to `/steward/login`.
- Steward API routes require the `x-peach-steward-password` header.
- If `PEACH_STEWARD_PASSWORD` is not set, local development falls back to `peach-local-steward`.

## Protected Surfaces

- `GET /api/steward/contributions`
- `PATCH /api/steward/contributions/:id/review`
- `/steward/contributions`
- `/steward/fields/studying-ourselves`

## Review States

The steward review scaffold supports:

- `pending_review`
- `held`
- `accepted_private`
- `rejected`

Public contributions default to `pending_review`. Public Field pages do not render submitted contribution records.

## Consent Coupling

When a steward changes review status, the linked consent record receives:

- `stewardReviewedAt`
- `stewardReviewedBy`

This gives Gate 5 a minimal audit hook without pretending the current local store is a final compliance system.

## Live Safety Boundary

This auth layer is not live-safe for public collection. Before production or a wider pilot, PEACH needs:

- Real identity provider or passwordless steward login.
- Expiring sessions.
- CSRF protection for cookie-backed mutations.
- Request rate limiting.
- Persistent audit trail.
- Encrypted production storage.
- Role separation if more than one steward participates.
- Secret management outside local environment variables.

Gate 4 is acceptable for controlled local/internal tests with non-sensitive data only.
