# PEACH Gate 11 Consent Operation Evidence

Date: 2026-07-31

## Route opened

Local route check:

- `/peach/consent/request` -> `HTTP/1.1 200 OK`

## Consent operation requests submitted

| id | Operation | Contribution id | Initial status | Reviewed status | Reviewed by |
| --- | --- | --- | --- | --- | --- |
| 1 | `export` | 1 | `pending_steward_review` | `in_review` | 1 |
| 2 | `withdrawal` | 2 | `pending_steward_review` | `completed` | 1 |

## Persistence proof

`PeachConsentOperationRequest` count: 2.

Public submission response did not expose `requestDetail`.

## Steward proof

The rehearsal used authenticated control headers to update both consent operation requests through `PATCH /api/control/peach/consent-operations/<id>`.

## Audit proof

- `peach.consent_operation.request_created`: 2
- `peach.consent_operation.status_changed`: 2
- `peach.consent_operation.steward_note_changed`: 2

## Deletion/public-display proof

Withdrawal did not automatically delete the associated contribution. Public display remained disabled and no public contribution release occurred.