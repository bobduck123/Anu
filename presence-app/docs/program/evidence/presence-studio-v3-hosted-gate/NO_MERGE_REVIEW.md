VERDICT: MERGE

## Summary

Hosted Studio V3 gate candidate is safe to merge. The staged diff keeps V3 default-off, limits hosted frontend activation to explicit human-test env plus BBB ID+slug allowlist, preserves owner auth boundaries, keeps public routes inert, and does not add `/editor-v3`.

## Blocking issues

None.

## Non-blocking issues

None after this file was updated from the pending placeholder to preserve the final review verdict.

## Evidence reviewed

- Staged diff only: `git diff --cached HEAD`
- Frontend gate: `presence-app/lib/presence/studio-v3/feature.ts`
- Frontend gate tests: `presence-app/lib/presence/studio-v3/feature.test.ts`
- Owner editor route: `presence-app/app/(studio)/studio/[id]/editor/page.tsx`
- Backend gate/routes: `flora-fauna/backend/app/api/presence_graph.py`
- Backend tests: `flora-fauna/backend/tests/test_presence_studio_v3_backend_foundation.py`
- Evidence pack under `presence-app/docs/program/evidence/presence-studio-v3-hosted-gate/`

## Tests/build/typecheck

Reviewer did not rerun long tests. Builder validation reviewed:

- `node --test lib\presence\studio-v3\feature.test.ts` — PASS, 8/8.
- `python -m pytest tests/test_presence_studio_v3_backend_foundation.py -q` — PASS, 20/20.
- `npm.cmd run typecheck` — PASS.
- `npm.cmd run build` — PASS, 29/29 pages.
- `git diff --check HEAD` / `git diff --cached --check` — PASS.
- Earlier full validation: V3 compiler 28/28, public payload/V2 adapters 27/27, V3 Playwright with clean public-invariance rerun 2/2, V2 BBB regression 14/14, and backend `py_compile` PASS.

## Files changed

- `flora-fauna/backend/app/api/presence_graph.py`
- `flora-fauna/backend/tests/test_presence_studio_v3_backend_foundation.py`
- `presence-app/app/(studio)/studio/[id]/editor/page.tsx`
- `presence-app/components/presence-studio-v3/StudioV3Home.tsx`
- `presence-app/lib/presence/studio-v3/feature.ts`
- `presence-app/lib/presence/studio-v3/feature.test.ts`
- `presence-app/docs/program/evidence/presence-studio-v3-hosted-gate/*`

## Unexpected changes

None found.

## Security/privacy risks

No staged secrets, `.env`, GGM/private material, production deploy, hosted test, migration, publish, or hosted data mutation found.

## Auth/tenant/routing risks

Owner boundary is preserved. V3 backend routes remain behind `@alpha_jwt_required()` and `_load_owned_room()`. Frontend only renders `PresenceStudioV3Shell` after `useOwnerNode()` has produced `node`, `token`, and `subject`.

## Data persistence risks

Backend V3 durable endpoints remain default-off in hosted envs unless all explicit backend flags and BBB ID/slug allowlists are present. Missing migration is documented as safe/unavailable.

## UX/mobile/accessibility

No new visual/editor surface beyond selecting the existing V3 shell for the gated BBB owner editor. Builder evidence includes V3 Playwright and mobile/accessibility runs.

## Launch/revenue impact

Positive: allows controlled hosted BBB human testing without public route exposure or non-approved-room activation.

## Rollback notes

Clear. Unset hosted V3 frontend/backend flags, redeploy/reload as appropriate, and BBB owner editor falls back to V2. No DB rollback required for this gate-only change.

## Required fixes

None.

## Recommended follow-up

Deploy only after human approval. Configure the exact hosted frontend/backend env vars from `ENVIRONMENT_VARIABLES.md`; run the Supabase migration separately only when durable private-state save is intended.
