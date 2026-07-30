# Work Order: Gate 3 M2 - Typed Shared Style Catalog

Date: 2026-07-28
Gate: Gate 3 - V3.2 design-system architecture
Target app: `C:\Dev\Flora_fauna\presence-app`
Backend boundary: `C:\Dev\Flora_fauna\flora-fauna\backend`
Status: Complete - evidence recorded in `docs/program/evidence/presence-gate3-m2-shared-style-catalog-20260727/`

## Task

Implement the smallest safe typed shared frontend style catalog for existing Presence style IDs only.

## Confirmed Human Decision

Proceed with Gate 3 M2:

- implement a typed shared frontend style catalog for existing style IDs only;
- do not invent new Looks or Room Styles;
- do not build the full 10 Looks / 10 Room Styles library;
- do not change public renderer behaviour;
- do not make the public renderer depend on the new registry in M2;
- keep style selection in private V3 metadata only;
- keep public routes unchanged.

## Scope Completed

- Added `lib/presence/studio-v3/styleCatalog.ts`.
- Preserved legacy `p1Catalog.ts` exports as a wrapper over the shared catalog.
- Wired V3 Studio option labels/facets to the catalog where safe.
- Wired V3 compiler bridge decisions to catalog helpers where safe.
- Wired frontend private metadata token parsing to catalog validators where safe.
- Added focused catalog/compatibility/parity tests.
- Updated evidence, tracker, and ExecPlan.

## Out Of Scope Preserved

- No public renderer dependency.
- No public route changes.
- No publish/public sync.
- No backend schema or validator change.
- No new style IDs.
- No Christina visual migration.
- No hosted/prod data.
- No auth, tenant, payment, donor/member, or deployment config change.

## Evidence

`docs/program/evidence/presence-gate3-m2-shared-style-catalog-20260727/README.md`

## Commands

```text
cmd /c npm run typecheck
node --test lib\presence\studio-v3\compiler.test.ts lib\api\studioV3.test.ts
node --test lib\presence\render\publicPayload.test.ts lib\presence\studio-v2\studioV2Adapters.test.ts
npx playwright test tests/e2e/presence-studio-v3-public-invariance.spec.ts --project=chromium
cmd /c npm run build
git diff --check -- <M2 scoped files>
```

## Review Verdict

ACCEPT M2.

Non-blocking note: the focused Playwright public-invariance proof passed on retry after one transient V3-shell visibility/manifest failure.

## Recommended Next Task

Gate 3 M3 - Owner Controls From Registry.
