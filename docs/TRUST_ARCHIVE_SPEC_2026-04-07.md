# Trust and Archive Spec (2026-04-07)

## Scope
This spec defines the executable M4 trust/archive substrate through:
1. archive route skeletons (`ANU-017`),
2. public trust report model/API (`ANU-018`),
3. sponsor disclosure surface with non-distortion safeguards (`ANU-019`).

Out of scope:
- sponsor marketplace/billing/ads systems,
- ranking engine redesign,
- full archive ingestion/search stack,
- node rollout expansion.

## Canonical Public Routes
- `/archive`
- `/archive/[record]`
- `/transparency`

## Public Trust Contract
`PublicTrustReport` remains the canonical trust artifact.

Public trust payload fields:
- `id`, `slug`, `title`, `summary`
- `report_type`, `status`
- `node_slug`
- `published_at`, `effective_at`
- `source_notes`, `provenance_summary`
- `freshness_hint`
- `public_visibility`
- `jurisdiction` (nullable)
- `body`, `sections`
- `archive_record_id` (nullable), `record_route` (nullable)
- `sponsor_disclosure_ref` (nullable link only; no sponsor truth overwrite)

## Sponsor Disclosure Contract
`PublicSponsorDisclosure` is the canonical public-safe disclosure artifact.

Public disclosure payload fields:
- `sponsor_name`
- `sponsor_type` (nullable)
- `sponsored_surface`
- `placement_type`
- `disclosure_label`
- `public_note`
- `disclosure_text`
- `active_from`, `active_until` (nullable)
- `is_active`
- `is_currently_active`
- `trust_report_slug` / `archive_record_slug` (nullable link fields)
- `related_routes`

Private/commercial/billing fields must not be exposed by public disclosure APIs.

## Public API Surfaces
Trust:
- `GET /public/trust/reports`
- `GET /public/trust/reports/:report_ref`

Archive handoff:
- `GET /public/archive-handoffs/:slug`

Sponsor disclosures:
- `GET /public/transparency/sponsor-disclosures`
- `GET /public/transparency/sponsor-disclosures/:disclosure_ref`

## Non-Distortion Rules
1. Sponsor metadata is rendered as disclosure metadata only.
2. Sponsor metadata must not overwrite or alter trust-report body/sections.
3. Sponsor metadata must not mutate archive verification/provenance truth fields.
4. Disclosure state must degrade honestly when contract data is unavailable.
5. Empty disclosure feed must not imply hidden certainty; it must state no active published disclosures.

## Frontend Surface Rules
- Sponsor disclosures must be visibly labeled as disclosures.
- Sponsor disclosure panels must be separated from trust/editorial body content.
- Archive and transparency surfaces must preserve trust canon while showing sponsorship context.

## Implementation Reference (2026-04-14)
Backend:
- `flora-fauna/backend/app/models.py`
- `flora-fauna/backend/app/schemas.py`
- `flora-fauna/backend/app/services/trust_report_service.py`
- `flora-fauna/backend/app/services/sponsor_disclosure_service.py`
- `flora-fauna/backend/app/api/public_trust.py`
- `flora-fauna/backend/app/api/public_transparency.py`
- `flora-fauna/backend/tests/test_public_trust.py`
- `flora-fauna/backend/tests/test_public_sponsor_disclosures.py`

Frontend:
- `frontend-next/src/lib/api/publicTrust.ts`
- `frontend-next/src/lib/api/publicSponsorDisclosures.ts`
- `frontend-next/src/components/archive/ArchiveRecordShell.tsx`
- `frontend-next/src/components/transparency/SponsorDisclosurePanel.tsx`
- `frontend-next/src/app/(public)/archive/page.tsx`
- `frontend-next/src/app/(public)/archive/[record]/page.tsx`
- `frontend-next/src/app/(public)/transparency/page.tsx`
- `frontend-next/src/test/archiveRecordPage.test.tsx`
- `frontend-next/src/test/transparencyPage.test.tsx`
- `frontend-next/src/test/sponsorDisclosurePanel.test.tsx`

## Validation Commands
Backend:
- `python -m pytest -q tests/test_public_sponsor_disclosures.py tests/test_public_trust.py tests/test_public_connectors.py tests/test_public_transparency.py`

Frontend:
- `npx vitest run src/test/transparencyPage.test.tsx src/test/archiveRecordPage.test.tsx src/test/sponsorDisclosurePanel.test.tsx src/test/archivePage.test.tsx`
- `npm run -s typecheck`
