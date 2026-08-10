# PEACH Gate 14 Pre-Staging Check

Date: 2026-07-31

## Current branch

`feat/presence-studio-v3-m1-functional-editing`

## Dirty files

PEACH and PEACH-adjacent dirty files:

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

Gate 14 edited:

- `frontend-next/src/lib/peach/catalog.ts`
- `frontend-next/src/components/peach/PeachFieldView.tsx`
- `frontend-next/src/components/peach/PeachContributionForm.tsx`
- `docs/peach/PEACH_GATE_14_*.md`

## Unrelated dirty files

Unrelated Presence files were dirty before Gate 14 and were not touched:

- `presence-app/.agent/PRESENCE_GATE_4_EXECPLAN.md`
- `presence-app/.agent/PRESENCE_GATE_4_M3B_ATELIER_PRIVATE_NO_SAVE_PREVIEW_WORK_ORDER.md`
- `presence-app/.agent/PRESENCE_GATE_TRACKER.md`
- `presence-app/docs/program/evidence/presence-gate4-m3b-private-no-save-preview-plan-20260731/README.md`
- `presence-app/docs/program/evidence/presence-studio-v3-m1-functional-editing/screenshots/16-test-as-visitor-after-edits.png`

## Current PEACH files since Gate 13

Gate 13 created the surrogate pilot docs and confirmed the ANU-native PEACH loop locally/staging-equivalent. Gate 14 adds hosted-staging hold evidence, staging environment requirements, real-pilot pack, and a small Field 001 copy clarity pass.

## Available hosted staging URLs

No PEACH-specific hosted private staging URL was available.

Local files include general Presence hosted/prod variables and generic Vercel env examples, but no confirmed PEACH staging frontend URL, backend URL, database URL, or control token set.

## Available backend URL

No PEACH hosted staging backend URL was available.

Presence production/controlled-launch backend variables exist in local env files, but they are not a PEACH private staging target and were not used.

## Available frontend URL

No PEACH hosted staging frontend URL was available.

Presence production/controlled-launch frontend variables exist in local env files, but they are not a PEACH private staging target and were not used.

## Available database URL

No hosted PEACH staging database URL was available.

Staging-equivalent database used for Gate 14 smoke:

`postgresql://postgres:***@127.0.0.1:55432/peach_gate14_stage_hold`

## Available control-plane token/header configuration

Generic control-plane variable names exist:

- `CONTROL_PLANE_HOSTS`
- `CONTROL_PLANE_SHARED_SECRET`
- `CONTROL_PLANE_SECRET_HEADER`
- `CONTROL_PLANE_ALLOWED_ROLES`
- `CONTROL_PLANE_JWT_AUDIENCE`
- `CONTROL_REQUIRE_TOKEN_GRANT`
- `CONTROL_SMOKE_AUTH_HEADER`

No PEACH hosted staging control token/header value was available. No secret value is printed here.

## Missing credentials/envs

Missing for PEACH hosted private staging:

- `PEACH_STAGING_FRONTEND_URL` or equivalent;
- `PEACH_STAGING_BACKEND_URL` or equivalent;
- hosted staging `DATABASE_URL`;
- hosted control-plane auth token;
- hosted `CONTROL_PLANE_SHARED_SECRET` confirmation;
- hosted frontend `CORE_API_ORIGIN`;
- hosted frontend `CONTROL_PLANE_HOSTS`;
- hosted noindex/private staging flag or deployment protection setting;
- deployment project/environment target.

## Migration readiness

Gate 9 and Gate 10 PEACH SQL migrations remain PostgreSQL-compatible. Gate 14 staging-equivalent smoke applied both migration files and verified all five PEACH tables plus the `public_display` and `payment_taken` constraints.

## Deployment readiness

Code and docs are ready for a hosted private staging attempt once hosted URLs, database credentials, and control-plane configuration are supplied.

## No-public-launch boundary

Gate 14 does not launch PEACH publicly. It does not introduce public contribution display, real payments, checkout, cart, uploads, youth collection, sensitive testimony, social feed, or public Commons/Yield release.
