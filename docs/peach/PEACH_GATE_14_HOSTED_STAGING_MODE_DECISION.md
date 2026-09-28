# PEACH Gate 14 Hosted Staging Mode Decision

Date: 2026-07-31

## Chosen mode

PASS B: honest hosted hold, with staging-equivalent PostgreSQL readiness preserved.

## Why

Actual PEACH hosted private staging could not be proven because the required hosted URLs, database credentials, and control-plane token/header configuration were unavailable locally.

No fake hosted deployment or hosted smoke result is claimed.

## Database target

Hosted target: held, missing hosted PEACH staging `DATABASE_URL`.

Fallback verification target:

`postgresql://postgres:***@127.0.0.1:55432/peach_gate14_stage_hold`

## Backend target

Hosted target: held, missing PEACH hosted backend URL and hosted control-plane config.

Fallback local target: ANU Flask backend app against staging-equivalent PostgreSQL for migration smoke; prior Gate 13 surrogate flow remains the current private-flow proof.

## Frontend target

Hosted target: held, missing PEACH hosted frontend URL.

Fallback local target:

`http://localhost:3336`

## Control-plane target

Hosted target: held, missing PEACH hosted control token/header setup.

Fallback local route/API evidence:

- `/control/peach` returned 200 on local control-allowed host.
- unauthenticated `/api/control/core/api/control/peach/contributions` returned 401.

## Noindex/private access strategy

Hosted strategy required before real staging:

- deployment protection or private preview access;
- `noindex` metadata/header strategy;
- control host allowlist scoped to private control host only;
- backend control-plane shared secret configured server-side only;
- no public launch copy.

Fallback evidence:

- PEACH active-field API returned `publicIndexing: noindex` and `noindex: true`.
- Routes returned `Cache-Control: no-store, must-revalidate`.
- Public contribution display remained false.

## Limitations

Gate 14 does not prove actual hosted private staging. It prepares the real pilot pack and proves local/staging-equivalent readiness remains intact.
