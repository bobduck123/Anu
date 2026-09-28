# PEACH Gate 12 Staging Consent Operation Evidence

Date: 2026-07-31

## Target

Staging-equivalent PostgreSQL database:

`postgresql://postgres:***@127.0.0.1:55432/peach_gate12_stage`

## Consent operation requests

| Request | Type | Contribution | Initial status | Reviewed status | Reviewed by |
| --- | --- | --- | --- | --- | --- |
| 1 | `export` | 1 | `pending_steward_review` | `in_review` | 1 |
| 2 | `withdrawal` | 2 | `pending_steward_review` | `completed` | 1 |

## Audit evidence

- `peach.consent_operation.request_created`: 2
- `peach.consent_operation.status_changed`: 2
- `peach.consent_operation.steward_note_changed`: 2

## Route proof

Consent request page:

`http://localhost:3333/peach/consent/request`

Result:

`HTTP/1.1 200 OK`

## Boundary

Gate 12 verifies manual consent operation persistence and steward update behavior. It does not implement automatic export bundles, automatic deletion, or automatic public state changes.
