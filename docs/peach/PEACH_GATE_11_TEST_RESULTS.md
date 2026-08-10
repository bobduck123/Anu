# PEACH Gate 11 Test Results

Date: 2026-07-31

## Backend PEACH tests

Command:

`python -m pytest tests\test_peach_gate9.py tests\test_peach_gate10.py -q`

Result:

`7 passed in 5.34s`

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

Local Next server on port 3331 returned 200 for all public PEACH participant routes and the local control route shell. The PEACH control proxy rejected unauthenticated access with 401.

## Broader backend suite

The broader backend suite was not rerun in Gate 11. The documented Gate 9/10 status remains:

`3 failed, 334 passed, 953 warnings, 5 errors in 113.39s`.

Known failures/errors are outside PEACH focused tests and remain public-release blockers.