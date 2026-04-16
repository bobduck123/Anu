# M4 Completion Report - ANU-017 to ANU-022 + Archive Index + ANU-027/028/029 Refinement

Date: 2026-04-14  
Scope: trust/archive/sponsor foundation with trust-center landing IA, canonical archive index summary feed, deterministic archive pagination, minimal query refinement, and query-normalization guardrail hardening

## Completed Tickets
1. `ANU-017` Archive route skeleton
- `/archive` and `/archive/[record]` implemented as intentional public memory shells.

2. `ANU-018` Public trust report model/API
- Canonical public trust report list/detail APIs implemented.

3. `ANU-019` Sponsor disclosure surface + non-distortion safeguards
- Public-safe sponsor disclosure model/API/UI implemented.
- Non-distortion safeguards implemented and tested (sponsor metadata cannot override trust/archive truth content).

4. `ANU-021` Trust center route foundation
- New public trust landing route implemented at `/trust`.
- IA sections are explicitly separated:
  - latest trust reports,
  - sponsor disclosures,
  - archive/public memory links.
- Degraded-honesty behavior implemented per data source.

5. Post-foundation M4 slice: archive index + canonical record summary feed
- Added backend public archive summary projection and endpoint:
  - `GET /public/archive/records`
- Added canonical archive summary contract fields for title/type/summary/provenance/trust/freshness/detail links.
- Upgraded `/archive` from shell-only trust list to real archive index with minimal IA filter by record type.
- Added non-distortion behavior so archive summary rendering remains separate from sponsor disclosure semantics.

6. `ANU-027` Deterministic archive pagination
- Chosen model: offset pagination with explicit stable ordering (`updated_at desc`, `id desc`).
- Added pagination contract metadata to `/public/archive/records`.
- Preserved type filters and degraded-honesty behavior under pagination.
- Added minimal `/archive` previous/next controls preserving active type filter.

7. `ANU-028` Minimal archive query refinement
- Added optional `title_prefix` filter to `/public/archive/records`.
- Matching is case-insensitive prefix-only against archive record titles.
- Existing deterministic ordering, pagination, type filters, and degraded-honesty behavior remain intact.
- `/archive` now includes one minimal title-prefix input that coexists with pagination and type filter controls.

8. `ANU-029` Archive query-normalization and guardrail hardening
- Hardened `title_prefix` guardrails without widening query scope:
  - trim outer whitespace,
  - collapse internal whitespace runs to one space,
  - cap normalized prefix length to 80 characters.
- Added explicit normalization telemetry fields in public archive list plane-log context.
- Preserved deterministic ordering, pagination model, and type-filter behavior unchanged.

9. `ANU-022` Decision register publication path
- Added public-safe decision summary API under `/public/trust/decisions` and `/public/trust/decisions/:decision_ref`.
- Decision summaries are exposed only when archive-linked publication metadata exists (`governance-decision-summary` + `metadata_json.decision_id`), keeping restricted decisions docs-only.
- Added stable archive linkage from decision summaries (`record_route`) and archive summaries (`related_decision_route`).
- Updated archive detail rendering to show decision summaries as a separate trust/record context panel.

10. `ANU-023` Plane-aware logging contract rollout (M4/M5 cross-slice)
- Public trust/archive APIs and frontend archive surfaces now emit canonical plane-aware log envelopes (`plane`, `service_name/serviceName`, `event_name/eventName`, `level`, `timestamp`, request/correlation id when available).
- Control proxy and control audit paths now emit `plane=control` events with audit-safe context only.
- Impact Falak telemetry now emits `plane=impact` with explicit `falak_execution_plane` context and sensitive-field redaction.

## ANU-019 Operational Closeout
- Added non-sqlite migration script for sponsor disclosures:
  - `flora-fauna/backend/migrations/versions/20260414_public_sponsor_disclosure.sql`
- Verified DB-backed sponsor disclosure behavior through backend model/API tests.
- Screenshot artifact status:
  - sponsor disclosure rendering proof has been captured for the milestone evidence pack.

## Test Evidence
Backend:
- `python -m pytest -q tests/test_public_archive.py tests/test_public_trust.py tests/test_public_decisions.py tests/test_public_sponsor_disclosures.py`
- Result: `14 passed`
- `python -m pytest -q tests/test_public_archive.py`
- Result: `8 passed` (includes ANU-029 title-prefix guardrail cases)
- `python -m pytest -q -p no:cacheprovider -p no:tmpdir tests/test_public_decisions.py tests/test_public_archive.py tests/test_public_trust.py`
- Result: `12 passed` (sandbox run for ANU-022 evidence)

Frontend:
- `npx vitest run src/test/archivePage.test.tsx src/test/archiveRecordPage.test.tsx`
- Result: `2 files passed, 7 tests passed`
- `npx vitest run src/test/controlProxyRoute.test.ts src/test/publicArchiveLogging.test.ts src/test/planeLog.test.ts src/test/archivePage.test.tsx src/test/archiveRecordPage.test.tsx`
- Result: `5 files passed, 16 tests passed` (includes ANU-023 frontend plane-log coverage)

Type safety:
- `npm run -s typecheck`
- Result: pass

## Deferred (Intentional)
- full trust-center productization beyond foundational IA
- deeper archive ingestion/search pipeline beyond minimal type IA
- richer archive discovery/query refinement beyond pagination and type filters
- sponsor marketplace/billing/campaign tooling
- economy and ranking-engine expansion
- broader M5 node proof package work

## Status
- `ANU-017`: complete
- `ANU-018`: complete
- `ANU-019`: complete (implementation + migration closeout + rendering proof captured)
- `ANU-021`: complete
- `ANU-022`: complete
- `ANU-023`: complete (plane-aware log contract rollout across backend/frontend/impact touched paths)
- Archive index summary feed slice: complete
- `ANU-027`: complete (deterministic pagination contract + minimal `/archive` controls)
- `ANU-028`: complete (title-prefix refinement on backend + minimal frontend input passthrough)
- `ANU-029`: complete (title-prefix normalization guardrails + focused tests + docs/evidence updates)
- M4 trust/archive foundation + index slice is executable with focused tests and docs alignment.
