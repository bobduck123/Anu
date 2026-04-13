# M4 Completion Report - ANU-017, ANU-018, ANU-019

Date: 2026-04-14  
Scope: narrow M4 trust/archive start + sponsor disclosure safeguards

## Completed in M4 Slice
1. `ANU-017` Archive route skeleton
- Canonical routes implemented:
  - `/archive`
  - `/archive/[record]`
- Archive shells render provenance/trust/status/body/onward links and explicit degraded-honesty states.

2. `ANU-018` Public trust report model/API
- Public trust contract implemented with canonical list/detail APIs:
  - `GET /public/trust/reports`
  - `GET /public/trust/reports/:report_ref`
- Archive record UI consumes trust-report-shaped payloads with honest fallback behavior.

3. `ANU-019` Sponsor disclosure surface + non-distortion safeguards
- Public-safe sponsor disclosure contract implemented end-to-end:
  - model: `PublicSponsorDisclosure`
  - APIs:
    - `GET /public/transparency/sponsor-disclosures`
    - `GET /public/transparency/sponsor-disclosures/:disclosure_ref`
- Disclosure UI added to transparency and archive trust-facing surfaces.
- Disclosure rendering is explicitly separated from trust-report/editorial truth content.
- Non-distortion tests verify sponsor metadata does not overwrite trust-report body or archive truth fields.

## Evidence and Test Results
Backend:
- `python -m pytest -q tests/test_public_sponsor_disclosures.py tests/test_public_trust.py tests/test_public_connectors.py`
- Result: `11 passed`

- `python -m pytest -q tests/test_public_transparency.py`
- Result: `2 passed`

Frontend:
- `npx vitest run src/test/transparencyPage.test.tsx src/test/archiveRecordPage.test.tsx src/test/sponsorDisclosurePanel.test.tsx src/test/archivePage.test.tsx`
- Result: `4 files passed, 9 tests passed`

Type safety:
- `npm run -s typecheck`
- Result: pass

## Implemented Non-Distortion Guarantees
- Sponsor disclosure payloads are public-safe and explicitly labeled.
- Sponsor disclosure metadata is rendered in separate disclosure panels.
- Trust report body/sections remain canonical and unchanged by sponsor state.
- Archive verification/provenance fields remain canonical and unchanged by sponsor state.
- Disclosure feed absence/failure is surfaced with honest degraded messaging.

## Deferred (Intentionally)
- sponsor marketplace, pricing, billing, ad engine mechanics
- ranking/discovery algorithm redesign
- full trust-center expansion (`ANU-021+`)
- full archive ingestion/search pipeline

## M4 Slice Status
- `ANU-017`: complete
- `ANU-018`: complete
- `ANU-019`: complete
- M4 opening trust/archive/sponsor slice is executable and evidenced; broader M4 items remain per backlog.
