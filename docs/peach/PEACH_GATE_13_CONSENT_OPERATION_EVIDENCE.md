# PEACH Gate 13 Consent Operation Evidence

Date: 2026-07-31

## Pilot mode

Surrogate-only pilot against staging-equivalent PostgreSQL.

## Requests submitted

| Participant | Request ID | Type | Initial status | Understood manual review |
| --- | --- | --- | --- | --- |
| Participant A | 1 | `export` | `pending_steward_review` | Yes |
| Participant C | 2 | `withdrawal` | `pending_steward_review` | Yes |

## Steward updates

| Request ID | Type | Steward status | Reviewed by |
| --- | --- | --- | --- |
| 1 | `export` | `in_review` | 1 |
| 2 | `withdrawal` | `completed` | 1 |

## Persistence evidence

- `peach_consent_operation_request` rows: 2
- final statuses: `in_review`, `completed`

## Audit evidence

- `peach.consent_operation.request_created`: 2
- `peach.consent_operation.status_changed`: 2
- `peach.consent_operation.steward_note_changed`: 2

## Protection

Unauthenticated steward consent operation list returned 401.

## Boundary

The participant-facing request is a manual steward review request. It is not automatic export, automatic deletion, automatic withdrawal, publication, or public display.
