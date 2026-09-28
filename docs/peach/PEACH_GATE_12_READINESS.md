# PEACH Gate 12 Readiness

Date: 2026-07-31

## What Gate 12 proved

Gate 12 proved the PEACH Gate 9/10 operating loop against staging-equivalent PostgreSQL:

Field -> Contribution -> ConsentRecord -> Steward Review -> SupportIntent -> Consent operation request -> Steward operation update -> Audit -> private/noindex route/API checks.

The rehearsal completed:

- Gate 9 and Gate 10 SQL migrations applied to PostgreSQL;
- 3 safe test contributions persisted with ConsentRecords;
- steward review outcomes for `held`, `accepted_private`, and `rejected`;
- 3 non-payment SupportIntents;
- export and withdrawal consent operation requests;
- audit evidence for critical operations;
- database rejection of public display and payment-taken states;
- local public PEACH routes returned 200;
- local PEACH control route returned 200 only on a control-allowed host;
- unauthenticated control API access returned 401;
- active field API returned noindex/private-pilot/no public contribution display/no youth/no sensitive/no payments.

## Hosted staging status

Hosted private staging is not yet proven. No hosted PEACH staging URLs, database credentials, or hosted control-plane token values were available locally.

Gate 12 therefore used the allowed fallback: staging-equivalent PostgreSQL plus local route/API evidence, with hosted staging held for Gate 13.

## Staging issues found and fixed

Gate 12 found and fixed two PostgreSQL compatibility problems:

- PEACH model boolean check constraints now use boolean comparisons instead of SQLite-style integer comparisons.
- PEACH Gate 9/10 SQL migration files were normalized to UTF-8 without BOM.

## Internal trusted-adult pilot boundary

An internal trusted-adult pilot can proceed only under these boundaries:

- trusted adults only;
- non-sensitive text only;
- no youth/child material;
- no uploads;
- no real payments;
- no checkout, cart, product grid, fake payment, or payment provider flow;
- no public contribution display;
- no public participant bodies;
- no public Commons/Yield release;
- manual steward review;
- manual consent operation handling.

## Public deployment blockers

Public deployment remains blocked by:

- no hosted private staging proof yet;
- broader non-PEACH backend suite failures from prior gates;
- no finalized production export/withdrawal/deletion process;
- no safeguarding workflow for youth/sensitive material;
- no Commons/Yield publication workflow;
- no public-release policy;
- no finalized production steward operations console.

## Gate 13 focus

Gate 13 should move this same rehearsal onto actual hosted private staging:

- deploy backend and frontend staging targets;
- apply migrations to hosted staging PostgreSQL;
- configure hosted control-plane secrets and token flow;
- repeat contribution, consent, review, support, consent operation, audit, route/API, and screenshot checks;
- preserve the same no-public-release boundary.

## Verdict

Gate 12 meets the pass conditions for staging-equivalent PostgreSQL rehearsal, with the hosted private staging hold documented.
