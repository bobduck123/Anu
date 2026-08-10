# PEACH Gate 14 Hosted Migration Evidence

Date: 2026-07-31

## Hosted migration result

HELD.

No hosted PEACH staging database credentials were available, so no hosted migration was run and no hosted database proof is claimed.

## Missing hosted requirement

Missing:

- hosted staging `DATABASE_URL`;
- hosted database name/provider confirmation;
- migration execution environment;
- rollback/reset permission;
- operator confirmation that the database is staging, not production.

## Staging-equivalent preservation smoke

Command:

`python C:\Users\emadh\OneDrive\Documents\PEACH\peach_gate14_migration_smoke.py`

Database target:

`postgresql://postgres:***@127.0.0.1:55432/peach_gate14_stage_hold`

Result:

Command exited with code 0.

Migration files applied:

- `20260730_peach_gate9_contribution_consent.sql`
- `20260731_peach_gate10_consent_ops_support_intents.sql`

## Table existence proof

Verified tables:

- `peach_consent_operation_request`
- `peach_consent_record`
- `peach_contribution`
- `peach_contribution_review_event`
- `peach_support_intent`

## Constraint proof

Verified constraints:

- `ck_peach_contribution_public_display_false`
- `ck_peach_support_intent_payment_not_taken`
- `ck_peach_contribution_review_status`
- `ck_peach_consent_operation_status`
- `ck_peach_consent_operation_type`
- `ck_peach_support_intent_status`
- `ck_peach_support_intent_type`

## Rollback/reset plan

For hosted staging:

1. Confirm the target is staging.
2. Snapshot/backup the staging database.
3. Apply migrations.
4. If rollback is needed before real participant data, drop PEACH tables in dependency order:
   - `peach_contribution_review_event`
   - `peach_consent_record`
   - `peach_consent_operation_request`
   - `peach_support_intent`
   - `peach_contribution`
5. If real participant data exists, do not drop without an approved data-retention and consent-operation decision.

## Blockers

Hosted migration proof remains blocked by missing hosted staging database credentials.
