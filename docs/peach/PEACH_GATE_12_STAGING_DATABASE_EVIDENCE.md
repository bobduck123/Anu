# PEACH Gate 12 Staging Database Evidence

Date: 2026-07-31

## Target

Mode:

`staging_equivalent_postgresql`

Database:

`postgresql://postgres:***@127.0.0.1:55432/peach_gate12_stage`

PostgreSQL host:

`presence-contract-postgres`

## Migration files applied

- `flora-fauna/backend/migrations/versions/20260730_peach_gate9_contribution_consent.sql`
- `flora-fauna/backend/migrations/versions/20260731_peach_gate10_consent_ops_support_intents.sql`

## Migration result

The Gate 9 and Gate 10 PEACH SQL migrations applied successfully to PostgreSQL after the compatibility fixes.

## Tables verified

- `peach_contribution`
- `peach_consent_record`
- `peach_contribution_review_event`
- `peach_support_intent`
- `peach_consent_operation_request`

## Indexes verified

- `ix_peach_contribution_created_at`
- `ix_peach_contribution_field_slug`
- `ix_peach_contribution_review_status`
- `ix_peach_consent_record_contribution`
- `ix_peach_consent_record_created_at`
- `ix_peach_review_event_contribution`
- `ix_peach_review_event_created_at`
- `ix_peach_support_intent_created_at`
- `ix_peach_support_intent_field_slug`
- `ix_peach_support_intent_status`
- `ix_peach_consent_operation_contribution`
- `ix_peach_consent_operation_created_at`
- `ix_peach_consent_operation_status`

## Constraints verified

- `ck_peach_contribution_public_display_false`
- `ck_peach_contribution_review_status`
- `ck_peach_support_intent_payment_not_taken`
- `ck_peach_support_intent_status`
- `ck_peach_support_intent_type`
- `ck_peach_consent_operation_status`
- `ck_peach_consent_operation_type`
- PEACH primary keys and foreign keys

## Constraint rejection checks

- Attempting `payment_taken = true` on `peach_support_intent` was rejected.
- Attempting `public_display = true` on `peach_contribution` was rejected.

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

## Staging fixes made

The PostgreSQL rehearsal exposed and fixed:

- boolean check constraints in `flora-fauna/backend/app/models.py`, changed from integer comparisons to PostgreSQL-compatible boolean comparisons;
- UTF-8 BOM in the Gate 9 and Gate 10 PEACH SQL migration files, normalized to UTF-8 without BOM.

## Reset note

The target database was disposable. The rehearsal reset and recreated `peach_gate12_stage` before applying the migration files.
