# PEACH Gate 13 Pre-Pilot Check

Date: 2026-07-31

## Current branch

`feat/presence-studio-v3-m1-functional-editing`

## Dirty files

PEACH and PEACH-adjacent files in the working tree:

- `flora-fauna/backend/app/api/__init__.py`
- `flora-fauna/backend/app/models.py`
- `flora-fauna/backend/app/api/peach.py`
- `flora-fauna/backend/migrations/versions/20260730_peach_gate9_contribution_consent.sql`
- `flora-fauna/backend/migrations/versions/20260731_peach_gate10_consent_ops_support_intents.sql`
- `flora-fauna/backend/tests/test_peach_gate9.py`
- `flora-fauna/backend/tests/test_peach_gate10.py`
- `frontend-next/src/app/(app)/peach/`
- `frontend-next/src/app/(control)/control/peach/`
- `frontend-next/src/app/api/peach/`
- `frontend-next/src/components/peach/`
- `frontend-next/src/data/peach/`
- `frontend-next/src/lib/api/peach.ts`
- `frontend-next/src/lib/peach/`
- `frontend-next/src/app/(control)/control/layout.tsx`
- `frontend-next/src/app/api/control/[...path]/route.ts`
- `docs/peach/`

## Unrelated dirty files

Unrelated Presence files were already dirty and were not touched for Gate 13:

- `presence-app/.agent/PRESENCE_GATE_4_EXECPLAN.md`
- `presence-app/.agent/PRESENCE_GATE_4_M3B_ATELIER_PRIVATE_NO_SAVE_PREVIEW_WORK_ORDER.md`
- `presence-app/.agent/PRESENCE_GATE_TRACKER.md`
- `presence-app/docs/program/evidence/presence-gate4-m3b-private-no-save-preview-plan-20260731/README.md`
- `presence-app/docs/program/evidence/presence-studio-v3-m1-functional-editing/screenshots/16-test-as-visitor-after-edits.png`

## Database mode

Gate 13 used staging-equivalent PostgreSQL because hosted PEACH staging credentials remain unavailable.

Database:

`postgresql://postgres:***@127.0.0.1:55432/peach_gate13_pilot`

PostgreSQL host:

`presence-contract-postgres`

Applied migration files:

- `20260730_peach_gate9_contribution_consent.sql`
- `20260731_peach_gate10_consent_ops_support_intents.sql`

## Route status

Local Next server:

`http://localhost:3334`

Routes verified:

- `/peach` -> `HTTP/1.1 200 OK`
- `/peach/fields/studying-ourselves` -> `HTTP/1.1 200 OK`
- `/peach/fields/studying-ourselves/contribute` -> `HTTP/1.1 200 OK`
- `/peach/consent/request` -> `HTTP/1.1 200 OK`
- `/peach/support` -> `HTTP/1.1 200 OK`
- `/control/peach` -> `HTTP/1.1 200 OK`

Protected control proxy:

- `/api/control/core/api/control/peach/contributions` -> `HTTP/1.1 401 Unauthorized`, `control_session_required`

## Test status

- Backend PEACH tests: `7 passed in 4.79s`
- Frontend typecheck: `tsc --noEmit` completed successfully
- Control proxy tests: `1 passed`, `5 tests passed`

## Hosted staging caveat

Hosted private staging is still not proven. No hosted PEACH staging URLs, PostgreSQL credentials, or hosted control-plane token values were available locally.

## Participant availability

No real trusted adult participants were available inside this Codex pass.

Gate 13 therefore used a facilitated surrogate pilot with named test participant labels only:

- Participant A
- Participant B
- Participant C

No real human feedback was faked.

## Steward availability

A surrogate steward account was seeded in the disposable PostgreSQL database:

`PEACH Gate 13 Steward`

The steward review flow was exercised through control-protected backend routes.

## Risks

- Surrogate feedback cannot prove real human comprehension.
- Hosted staging remains unproven.
- Consent copy may still be too dense for real participants.
- The terms `Field`, `Yield`, and `Commons Return` may need real-world copy testing.
- Public deployment remains blocked.

## Go/no-go

Go for surrogate-only Gate 13 evidence.

No-go for claiming a completed real trusted-adult pilot.

No-go for public launch, public contribution display, real payments, uploads, youth material, sensitive testimony, or public Commons/Yield release.
