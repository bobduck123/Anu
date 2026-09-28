# PEACH Gate 14 Test Results

Date: 2026-07-31

## Backend PEACH tests

Command:

`python -m pytest tests\test_peach_gate9.py tests\test_peach_gate10.py -q`

Result:

`7 passed in 4.10s`

## Frontend typecheck

Command:

`npm run typecheck`

Result:

`tsc --noEmit` completed successfully.

Typecheck was rerun after the final copy correction.

## Control proxy tests

Command:

`npm run test -- src\test\controlProxyRoute.test.ts --run`

Result:

`1 passed`, `5 tests passed`.

## Route checks in selected mode

Hosted route checks: HELD because hosted PEACH staging URL was unavailable.

Local hosted-hold fallback target:

`http://localhost:3336`

Results:

- `/peach` -> `HTTP/1.1 200 OK`
- `/peach/fields/studying-ourselves` -> `HTTP/1.1 200 OK`
- `/peach/fields/studying-ourselves/contribute` -> `HTTP/1.1 200 OK`
- `/peach/consent/request` -> `HTTP/1.1 200 OK`
- `/peach/support` -> `HTTP/1.1 200 OK`
- `/control/peach` -> `HTTP/1.1 200 OK`
- unauthenticated `/api/control/core/api/control/peach/contributions` -> `HTTP/1.1 401 Unauthorized`, `control_session_required`

## Active Field API

`/api/peach/fields/active` returned:

- `publicIndexing: noindex`
- `noindex: true`
- `publicContributionDisplay: false`
- `sensitiveMaterialCollection: false`
- `youthMaterialCollection: false`
- support options with `paymentTaken: false`
- no participant contribution bodies
- Commons placeholder with `publicUrl: null`

## Migration smoke

Command:

`python C:\Users\emadh\OneDrive\Documents\PEACH\peach_gate14_migration_smoke.py`

Result:

Command exited with code 0 against staging-equivalent PostgreSQL.

Verified all five PEACH tables and public-display/payment constraints.

## Anti-pattern scan

PEACH-only implementation scan found only expected guardrail/test hits:

- negative test posts `reviewStatus: "published"` to prove public review status rejection;
- Field view lists real payments or checkout as held;
- Support form states no payment, checkout, cart, or product grid exists.

No PEACH implementation introduced cart, checkout, payment, product grid, public contribution feed, social feed, bookstore, storefront, public bodies, youth collection, sensitive collection, public Commons release, or public Yield release.

## Broader suite

The broader non-PEACH backend suite was not rerun in Gate 14. Prior broader non-PEACH failures remain public-release blockers.
