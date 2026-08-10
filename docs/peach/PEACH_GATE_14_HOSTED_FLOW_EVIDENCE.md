# PEACH Gate 14 Hosted Flow Evidence

Date: 2026-07-31

## Hosted private flow result

HELD.

No hosted PEACH staging environment was available, so no hosted test records were submitted and no hosted persistence/audit proof is claimed.

## Missing hosted requirements

- hosted frontend URL;
- hosted backend URL;
- hosted database URL;
- hosted control-plane token/header configuration;
- private staging access protection;
- operator approval to create test-only staging records.

## Required hosted flow once unblocked

Submit test-only hosted staging records:

- 3 safe adult/non-sensitive Contributions;
- 3 ConsentRecords;
- 2 SupportIntents;
- 2 ConsentOperationRequests;
- steward review changes for `held`, `accepted_private`, and `rejected`.

Verify:

- records persist in hosted staging database;
- audit events persist;
- public APIs do not expose contribution bodies;
- `payment_taken` remains false;
- `public_display` remains false.

## Preserved local/staging-equivalent proof

Gate 13 already proved the private flow against staging-equivalent PostgreSQL:

- 3 Contributions;
- 3 ConsentRecords;
- steward review for `held`, `accepted_private`, and `rejected`;
- 2 SupportIntents with `payment_taken = false`;
- export and withdrawal ConsentOperationRequests;
- audit events;
- no public display.

Gate 14 did not repeat the full private flow because the objective was hosted proof or an honest hosted hold. The migration path and route/API surface were rechecked locally/staging-equivalent.
