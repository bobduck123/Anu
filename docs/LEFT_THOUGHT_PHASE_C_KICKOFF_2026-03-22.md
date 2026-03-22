# Left Thought Graph — Phase C Kickoff

Date: 2026-03-22
Status: Final slice implemented (Phase C complete for backend + admin workflow)

## Objective

Generalize map ingestion with privileged import paths so curators can validate and persist caller-supplied seed corpora safely.

## Implemented in Phase C so far

### 1) Compiler seed override support

- `services/impact-service/src/maps/compiler/autopilot.ts`
  - `compileMapDraft(request, { seedOverride })` supports caller-provided `SeedCorpus`.
  - Added `compileMapDraftFromSeed(seed, mode)` helper.

### 2) Service-level import preview + persist

- `services/impact-service/src/maps/services/falakMapService.ts`
  - `previewSeedImport(seed, mode)` returns compile preview metrics.
  - `importSeedAndPersist(tenantId, seed, options)` now supports:
    - privileged compile+persist from supplied seed corpus,
    - optional status promotion (`draft` / `reviewed` / `published`),
    - force re-import,
    - checksum generation,
    - idempotent reuse when checksum matches,
    - import metadata recording to map overrides,
    - governance fields (`importNote`, `importedByActorId`, `importedByExternalAuthId`).

### 3) Privileged API routes

- `services/impact-service/src/maps/routes/registerMapRoutes.ts`
  - `POST /v1/education/maps/import/preview`
  - `POST /v1/education/maps/import/persist`
  - `GET /v1/education/maps/:topicKey/import-activity`

All import routes are on privileged guard and require verified actor context.

### 4) Repository support for Phase C persistence semantics

- `services/impact-service/src/maps/repositories/prismaFalakMapRepository.ts`
  - Added `compileAndPersistFromSeed(...)`.
  - Added `latestImportChecksum(...)`.
  - Added `recordImportMetadata(...)`.
  - Added `listImportActivity(...)` for map-scoped import history retrieval.
  - Persisted imports now also emit `DomainEvent` entries (`falak.map.seed_imported`) for cross-surface observability.

### 5) Schema + type expansions

- `services/impact-service/src/maps/domain/schemas.ts`
  - Added persist request/response schemas for import endpoint.
- `services/impact-service/src/maps/domain/types.ts`
  - Added `MapSeedImportPersistResult` contract.

### 6) Safety and parity guardrails

- `services/impact-service/src/maps/services/falakMapService.ts`
  - Import limits added (docs/nodes/edges).
  - Structured import error taxonomy now enforced via `AppError` codes:
    - `MAP_IMPORT_INVALID_PAYLOAD`
    - `MAP_IMPORT_LIMIT_EXCEEDED`
    - `MAP_IMPORT_COMPILE_FAILED`
  - Structured error details now included for import-limit failures (`resource`, `actual`, `limit`).
- `services/impact-service/tests/maps/falakMapService.integration.test.ts`
  - Added tests for:
    - preview without persistence,
    - persist with checksum metadata,
    - idempotent reuse,
    - forced re-import,
    - typed limit rejection path (including details payload).

### 7) Governance metadata mirrored into job logs

- `services/impact-service/src/maps/services/falakMapService.ts`
  - Seed persist now appends an explicit `seed_import_metadata` job log with checksum, importer identity, import note, and parity counts.

### 8) Route-level contract coverage for persist path

- `services/impact-service/tests/falak/falakMapRouteGuard.test.ts`
  - Added authenticated success-path assertion for `POST /v1/education/maps/import/persist`.
  - Added privileged rejection assertion (verified actor required).
  - Added typed limit-error contract assertion for persist responses (`MAP_IMPORT_LIMIT_EXCEEDED` + details).

### 9) Admin UI workflow (preview + persist + activity) added

- `frontend-next/src/components/maps/FalakMapAdminPage.tsx`
  - New Phase C seed import panel for JSON seed draft, preview, and persist actions.
  - Exposes mode/status/force/importNote controls and displays preview counts/checksum.
  - Includes a "Recent import activity" surface backed by the new import-activity API route.
- `frontend-next/src/lib/api/educationMaps.ts`
  - Added typed client helpers:
    - `previewEducationMapSeedImport(...)`
    - `persistEducationMapSeedImport(...)`
    - `listEducationMapImportActivity(...)`

### 10) Staging smoke verification expanded

- `services/impact-service/scripts/falak-staging/smoke.mjs`
  - Phase C smoke now performs repeat `/import/persist` on the same payload and asserts:
    - `idempotentReuse === true`
    - `jobCreated === false`
    - checksum parity across calls.

## Remaining post-Phase-C polish (optional)

1. Add prebuilt import presets (e.g., left-thought corpus autofill) and stronger client-side schema linting in admin UI.
2. Add UI affordances for filtering import activity by source/mode and linking entries to map job logs.
3. Consider surfacing import domain events in shared observability dashboards outside map-admin workflows.
