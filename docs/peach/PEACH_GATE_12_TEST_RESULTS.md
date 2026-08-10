# PEACH Gate 12 Test Results

Date: 2026-07-31

## Backend PEACH tests

Command:

`python -m pytest tests\test_peach_gate9.py tests\test_peach_gate10.py -q`

Result:

`7 passed in 10.38s`

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

Local Next server on port 3333 returned `HTTP/1.1 200 OK` for:

- `/peach`
- `/peach/fields/studying-ourselves`
- `/peach/fields/studying-ourselves/contribute`
- `/peach/consent/request`
- `/peach/support`
- `/control/peach`

Unauthenticated PEACH control proxy access returned `HTTP/1.1 401 Unauthorized` with `control_session_required`.

## PostgreSQL rehearsal

The staging-equivalent PostgreSQL rehearsal completed successfully after the Gate 12 fixes. It applied the Gate 9/10 SQL migrations, exercised participant/steward/support/consent operation flows, and verified audit counts plus database constraint rejection for `payment_taken = true` and `public_display = true`.

## Broader suite

The broader backend suite was not rerun in Gate 12. The prior documented non-PEACH broader-suite failures remain public-release blockers.
