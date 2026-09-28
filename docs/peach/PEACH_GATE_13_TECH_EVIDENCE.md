# PEACH Gate 13 Tech Evidence

Date: 2026-07-31

## Backend PEACH tests

Command:

`python -m pytest tests\test_peach_gate9.py tests\test_peach_gate10.py -q`

Result:

`7 passed in 4.79s`

## Frontend typecheck

Command:

`npm run typecheck`

Result:

`tsc --noEmit` completed successfully.

## Control proxy tests

Command:

`npm run test -- src\test\controlProxyRoute.test.ts --run`

Result:

`1 passed`, `5 tests passed`.

## Route checks

Local Next server:

`http://localhost:3334`

- `/peach` -> `HTTP/1.1 200 OK`
- `/peach/fields/studying-ourselves` -> `HTTP/1.1 200 OK`
- `/peach/fields/studying-ourselves/contribute` -> `HTTP/1.1 200 OK`
- `/peach/consent/request` -> `HTTP/1.1 200 OK`
- `/peach/support` -> `HTTP/1.1 200 OK`
- `/control/peach` -> `HTTP/1.1 200 OK`

Protected control proxy:

- `/api/control/core/api/control/peach/contributions` -> `HTTP/1.1 401 Unauthorized`, `control_session_required`

## PostgreSQL surrogate pilot

Database:

`postgresql://postgres:***@127.0.0.1:55432/peach_gate13_pilot`

Applied migration count: 2

Persisted:

- Contributions: 3
- ConsentRecords: 3
- SupportIntents: 2
- ConsentOperationRequests: 2
- ContributionReviewEvents: 3

Final contribution review statuses:

- `held`
- `accepted_private`
- `rejected`

Final support payment values:

- `[false, false]`

Final public display values:

- `[false, false, false]`

Final consent operation statuses:

- `in_review`
- `completed`

## Audit evidence

- `peach.contribution.created`: 3
- `peach.contribution.review_status_changed`: 3
- `peach.support_intent.created`: 2
- `peach.consent_operation.request_created`: 2
- `peach.consent_operation.status_changed`: 2
- `peach.consent_operation.steward_note_changed`: 2

## Public API safety

`/api/peach/fields/active` returned:

- `publicContributionDisplay: false`
- `sensitiveMaterialCollection: false`
- `youthMaterialCollection: false`
- `noindex: true`
- support options with `paymentTaken: false`
- placeholder Commons entry with `publicUrl: null`

No participant contribution bodies were exposed by the public active-field API or by participant contribution responses.

## Anti-pattern scan

PEACH implementation scan found only expected guardrail/test hits:

- negative test posts `reviewStatus: "published"` to prove public status rejection;
- PEACH field guardrail says real payments or checkout are held;
- PEACH support form says no payment, checkout, cart, or product grid exists.

No PEACH implementation introduced cart, checkout, payment, product grid, public contribution feed, social feed, bookstore, storefront, public bodies, youth collection, sensitive collection, public Commons release, or public Yield release.
