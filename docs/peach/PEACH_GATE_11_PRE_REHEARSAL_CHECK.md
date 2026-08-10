# PEACH Gate 11 Pre-Rehearsal Check

Date: 2026-07-31
Repo: C:\Dev\Flora_fauna

## Current branch

`feat/presence-studio-v3-m1-functional-editing`

## Dirty files

PEACH-related dirty/untracked work present before Gate 11:

- `docs/peach/`
- `flora-fauna/backend/app/api/__init__.py`
- `flora-fauna/backend/app/api/peach.py`
- `flora-fauna/backend/app/models.py`
- `flora-fauna/backend/migrations/versions/20260730_peach_gate9_contribution_consent.sql`
- `flora-fauna/backend/migrations/versions/20260731_peach_gate10_consent_ops_support_intents.sql`
- `flora-fauna/backend/tests/test_peach_gate9.py`
- `flora-fauna/backend/tests/test_peach_gate10.py`
- `frontend-next/src/app/(app)/peach/`
- `frontend-next/src/app/(control)/control/peach/`
- `frontend-next/src/app/api/peach/`
- `frontend-next/src/app/api/control/[...path]/route.ts`
- `frontend-next/src/components/peach/`
- `frontend-next/src/data/peach/`
- `frontend-next/src/lib/api/peach.ts`
- `frontend-next/src/lib/peach/`

## Unrelated dirty files

Unrelated dirty work that must not be cleaned or reverted by Gate 11:

- `presence-app/docs/program/evidence/presence-studio-v3-m1-functional-editing/screenshots/16-test-as-visitor-after-edits.png`

## PEACH-specific test status

Gate 11 reran focused PEACH backend tests:

`python -m pytest tests\test_peach_gate9.py tests\test_peach_gate10.py -q` -> `7 passed in 5.34s`.

Frontend typecheck passed:

`npm run typecheck` -> `tsc --noEmit`.

Control proxy targeted test passed:

`npm run test -- src\test\controlProxyRoute.test.ts --run` -> `5 tests passed`.

## Broader repo test status

The broader backend suite remains documented from Gate 9/10 as not green:

`3 failed, 334 passed, 953 warnings, 5 errors in 113.39s`.

Known non-PEACH failures/errors remain Presence lifecycle and temp-directory permission failures. They block public release but do not block the local PEACH internal rehearsal.

## Migration status

PEACH migration files are present:

- `20260730_peach_gate9_contribution_consent.sql`
- `20260731_peach_gate10_consent_ops_support_intents.sql`

Gate 11 verified the model/table shape through ANU backend `AUTO_CREATE_ALL` against a disposable local SQLite database at `C:\tmp\peach_gate11_rehearsal.db`.

## Local environment assumptions

- Python backend dependencies are installed.
- Frontend dependencies are installed.
- Local Next dev server can run on port 3331.
- Localhost is a configured control-host in the frontend control session defaults.
- No private staging database URL or deployed control-plane credentials were available in the task context.

## Proceed decision

Rehearsal can proceed locally. Private staging remains a Gate 12 activity unless staging database and control-plane credentials are provided.

## Must not touch

Do not revert or clean unrelated Presence screenshot changes. Do not attempt broad Presence suite repairs inside PEACH Gate 11.