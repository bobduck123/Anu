# Falak Map Autopilot Verification

Date: 2026-03-15

## What was verified

- Frontend TypeScript: `frontend-next/node_modules/.bin/tsc.cmd -p tsconfig.json --noEmit`
- Service TypeScript: `services/impact-service/node_modules/.bin/tsc.cmd -p services/impact-service/tsconfig.json --noEmit`
- Frontend tests: `cmd /c npm run test -- --run` in `frontend-next`
- Service map tests: `services/impact-service/node_modules/.bin/jest.cmd services/impact-service/tests/maps --config services/impact-service/jest.config.cjs --runInBand`
- Frontend production build: `cmd /c npm run build` in `frontend-next`
- Service production build: `cmd /c npm run build` in `services/impact-service`
- Live service API on verified port `5005`
- Live frontend route serving on verified port `3001`

## Passed

- Frontend test suite: 13 files, 70 tests passed
- Service map suite: 6 files, 12 tests passed
- Production builds passed for frontend and service
- Live API checks passed:
  - `GET http://localhost:5005/v1/education/maps`
  - `POST http://localhost:5005/v1/education/maps/resolve`
  - `GET http://localhost:5005/v1/education/maps/ancient-levantine-deities`
- Live frontend checks passed:
  - `GET http://localhost:3001/education/resource-library/maps`
  - `GET http://localhost:3001/education/resource-library/maps/ancient-levantine-deities`

## Hardening completed

- Fixed dense-map renderer regressions by caching visible nodes, aligning click/focus selection with visible density-filtered nodes, and returning camera focus to overview on deselection.
- Added frontend integration coverage for existing-map open flow, missing-map generation flow, and dense-map density fallback behavior.
- Added service integration coverage for draft generation, override persistence, and pinned-node-safe layout reruns.
- Added regression coverage for canonical scoring weights and layout reproducibility.
- Fixed Prisma persistence bugs in map draft writes:
  - removed nested `sources` from `falakMapNode.createMany`
  - loaded persisted map resources from the active transaction instead of a separate uncommitted read
- Hardened admin/resource UX states with empty-state handling, persisted-change feedback, snapshot/pinned-node summaries, and safer node/edge update guards.
- Added `frontend-next/vitest.config.mts` so frontend tests run with the repo alias and `jsdom`.

## Known limitations

- The repository migration chain for the full service is blocked locally by unrelated historical infrastructure dependencies:
  - broken older migration requiring `LedgerAccountType`
  - missing `geometry`/PostGIS on the fresh verification database
- For live verification, a minimal local Falak bootstrap schema was applied with:
  - `.codex-runtime/falak-map-minimal-bootstrap.sql`
- The verified live stack is the fresh pair on:
  - frontend `http://localhost:3001`
  - service `http://localhost:5005`
- Admin mutation flows were verified through automated integration tests, not through a live authenticated browser session, because the minimal local bootstrap DB only includes tenant + map tables and does not provision Falak actors/auth data.
