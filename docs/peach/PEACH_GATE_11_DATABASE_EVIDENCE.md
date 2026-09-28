# PEACH Gate 11 Database Evidence

Date: 2026-07-31

## Setup mode

Local SQLite rehearsal database created through ANU backend `AUTO_CREATE_ALL`.

Database path:

`C:\tmp\peach_gate11_rehearsal.db`

## Setup command

`python C:\Users\emadh\OneDrive\Documents\PEACH\peach_gate11_rehearsal.py`

Result: command exited with code 0. Backend logged `AUTO_CREATE_ALL is enabled; ensuring database schema, default node, and optional alpha data exist.`

## Tables verified present

- `peach_contribution`
- `peach_consent_record`
- `peach_contribution_review_event`
- `peach_consent_operation_request`
- `peach_support_intent`

## Rehearsal row counts

- Contributions: 3
- ConsentRecords: 3
- ContributionReviewEvents: 3
- SupportIntents: 3
- ConsentOperationRequests: 2

## Audit counts

- `peach.contribution.created`: 3
- `peach.contribution.review_status_changed`: 3
- `peach.support_intent.created`: 3
- `peach.consent_operation.request_created`: 2
- `peach.consent_operation.status_changed`: 2
- `peach.consent_operation.steward_note_changed`: 2

## Migration files

- `flora-fauna/backend/migrations/versions/20260730_peach_gate9_contribution_consent.sql`
- `flora-fauna/backend/migrations/versions/20260731_peach_gate10_consent_ops_support_intents.sql`

## Warnings

The local rehearsal verifies SQLAlchemy model schema and persistence behavior, not hosted PostgreSQL migration execution. PostgreSQL migration execution remains a Gate 12 private staging task.

## Reset notes

Delete `C:\tmp\peach_gate11_rehearsal.db` to reset the local rehearsal database. For SQL row cleanup in a disposable DB, delete review events and dependent consent rows before deleting contributions.