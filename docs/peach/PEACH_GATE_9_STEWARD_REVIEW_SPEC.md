# PEACH Gate 9 Steward Review Spec

Date: 2026-07-30

## Routes

Protected control-plane routes:

- `GET /api/control/peach/contributions`
- `GET /api/control/peach/contributions/<id>`
- `PATCH /api/control/peach/contributions/<id>/review`

The list route supports status filtering, defaulting to pending review. The list response omits contribution bodies. The detail response includes body text and consent details for authorized control-plane users.

## Auth method

Routes use ANU's existing `control_plane_required` protection. The test fixture proves unauthenticated access is rejected and authenticated control access works with the control host, shared secret, control audience, MFA claim, and admin role conventions.

## Permissions

Gate 9 accepts steward review from the existing control-plane role path. It does not add a PEACH-only authorization system.

## Review actions

Allowed status transitions through the API:

- `held`
- `accepted_private`
- `rejected`

Optional steward notes can be stored with the review. `accepted_private` means steward-accepted for private/internal handling only. It is not public publication.

## Blocks

The API blocks:

- Unauthenticated steward access
- Public access to contribution bodies
- Review mutation without control-plane auth
- Unknown review statuses
- Public-approved status
- `publicDisplay: true`

## Audit events

Each review mutation creates:

- `PeachContributionReviewEvent`
- `AuditLog` event `peach.contribution.review_status_changed`

The audit metadata records previous status, new status, contribution id, field slug, and `public_display: false`.

## Limitations

Gate 9 does not include a visual steward console, export workflow, withdrawal workflow, email notifications, or public release workflow. Those remain Gate 10+ work.
