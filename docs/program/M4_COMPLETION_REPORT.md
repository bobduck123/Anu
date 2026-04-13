# M4 Completion Report - ANU-017 to ANU-021 Foundation Slice

Date: 2026-04-14  
Scope: trust/archive/sponsor foundation with trust-center landing IA

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

## ANU-019 Operational Closeout
- Added non-sqlite migration script for sponsor disclosures:
  - `flora-fauna/backend/migrations/versions/20260414_public_sponsor_disclosure.sql`
- Verified DB-backed sponsor disclosure behavior through backend model/API tests.
- Screenshot artifact status:
  - one sponsor disclosure screenshot/live-capture artifact is still pending in this environment and remains an open operational evidence item.

## Test Evidence
Backend:
- `python -m pytest -q tests/test_public_sponsor_disclosures.py tests/test_public_trust.py tests/test_public_connectors.py tests/test_public_transparency.py`
- Result: `13 passed`

Frontend:
- `npx vitest run src/test/trustCenterPage.test.tsx src/test/transparencyPage.test.tsx src/test/archiveRecordPage.test.tsx src/test/sponsorDisclosurePanel.test.tsx src/test/archivePage.test.tsx`
- Result: `5 files passed, 12 tests passed`

Type safety:
- `npm run -s typecheck`
- Result: pass

## Deferred (Intentional)
- full trust-center productization beyond foundational IA
- deeper archive ingestion/search pipeline
- sponsor marketplace/billing/campaign tooling
- economy and ranking-engine expansion
- broader M5 node proof package work

## Status
- `ANU-017`: complete
- `ANU-018`: complete
- `ANU-019`: complete (implementation + migration closeout; screenshot evidence pending)
- `ANU-021`: complete
- M4 foundation slice is executable with focused tests and docs alignment.
