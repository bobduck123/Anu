# Trust and Archive Spec (2026-04-07)

## Scope
This spec defines the executable M4 trust/archive substrate through:
1. archive route skeletons (`ANU-017`),
2. public trust report model/API (`ANU-018`),
3. sponsor disclosure surface with non-distortion safeguards (`ANU-019`).
4. trust center landing IA foundation (`ANU-021`),
5. archive index + canonical record summary feed (post-foundation M4 slice),
6. decision-register public summary publication path (`ANU-022`).

Out of scope:
- sponsor marketplace/billing/ads systems,
- ranking engine redesign,
- full archive ingestion/search stack,
- node rollout expansion.

## Canonical Public Routes
- `/archive`
- `/archive/[record]`
- `/transparency`
- `/trust`

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

Public decision summary payload fields:
- `decision_id`
- `title`
- `decision_statement`
- `why_it_matters`
- `owner`
- `due_date` (nullable)
- `current_status`
- `record_route`
- `archive_record_slug`
- `publication_scope`
- `source_label`
- `summary`

## Public Archive Summary Contract
`PublicArchiveRecord` remains the canonical persisted archive artifact, with a dedicated public summary projection for `/archive` index rendering.

Public archive summary payload fields:
- `record_ref` / `slug`
- `title`
- `record_type`
- `summary`
- `provenance_label` / `source_label`
- `source_route`
- `verification_status` / `status`
- `published_at` (nullable)
- `effective_at` (nullable)
- `freshness_hint` (nullable)
- `related_trust_report_slug` / `related_trust_report_route` (nullable)
- `related_decision_id` / `related_decision_route` (nullable)
- `related_route` (nullable)
- `record_route`
- `is_trust_linked`
- `is_decision_linked`

List payload fields:
- `records`
- `pagination` (`model`, `page`, `page_size`, `total_records`, `total_pages`, `has_more`, `has_previous`, `next_page`, `previous_page`, `ordering`)
- `available_record_types`
- `applied_filters`
- `applied_record_type_filter` (nullable)
- `applied_title_prefix_filter` (nullable)
- `degraded_honesty`

Archive pagination model:
- Offset pagination is canonical for this slice (`ANU-027`) because it is simple to audit, deterministic with explicit ordering, and low-risk to roll out.
- Ordering is mandatory and explicit: `updated_at desc`, tie-broken by `id desc`.

Archive query refinement model:
- `ANU-028` adds one optional public-safe refinement input: `title_prefix`.
- Matching is case-insensitive prefix-only on archive record title.
- No fuzzy matching, ranking, or multi-field search behavior is permitted in this slice.

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
- `GET /public/trust/decisions`
- `GET /public/trust/decisions/:decision_ref`

Archive handoff:
- `GET /public/archive-handoffs/:slug`

Archive index summaries:
- `GET /public/archive/records`
  - Optional query params:
    - `type`
    - `title_prefix`
    - `page`
    - `page_size`

Sponsor disclosures:
- `GET /public/transparency/sponsor-disclosures`
- `GET /public/transparency/sponsor-disclosures/:disclosure_ref`

## Non-Distortion Rules
1. Sponsor metadata is rendered as disclosure metadata only.
2. Sponsor metadata must not overwrite or alter trust-report body/sections.
3. Sponsor metadata must not mutate archive verification/provenance truth fields.
4. Disclosure state must degrade honestly when contract data is unavailable.
5. Empty disclosure feed must not imply hidden certainty; it must state no active published disclosures.
6. Archive summary feeds must not expose sponsor disclosure metadata as truth fields.
7. Decision summaries must never publish rows directly from docs unless archive-linked publication metadata exists.

## Frontend Surface Rules
- Sponsor disclosures must be visibly labeled as disclosures.
- Sponsor disclosure panels must be separated from trust/editorial body content.
- Archive and transparency surfaces must preserve trust canon while showing sponsorship context.
- Trust center must keep trust reports, sponsor disclosures, and archive memory links as distinct IA sections.

## Operational Migration Note
Sponsor disclosure DB migration for non-sqlite environments is shipped in:
- `flora-fauna/backend/migrations/versions/20260414_public_sponsor_disclosure.sql`

Operational evidence update:
- sponsor disclosure rendering proof has been captured for the milestone evidence pack.

## Implementation Reference (2026-04-14)
Backend:
- `flora-fauna/backend/app/models.py`
- `flora-fauna/backend/app/schemas.py`
- `flora-fauna/backend/app/services/archive_service.py`
- `flora-fauna/backend/app/services/trust_report_service.py`
- `flora-fauna/backend/app/services/decision_register_service.py`
- `flora-fauna/backend/app/services/sponsor_disclosure_service.py`
- `flora-fauna/backend/app/api/public_archive.py`
- `flora-fauna/backend/app/api/public_trust.py`
- `flora-fauna/backend/app/api/public_transparency.py`
- `flora-fauna/backend/tests/test_public_archive.py`
- `flora-fauna/backend/tests/test_public_trust.py`
- `flora-fauna/backend/tests/test_public_decisions.py`
- `flora-fauna/backend/tests/test_public_sponsor_disclosures.py`

Frontend:
- `frontend-next/src/lib/api/publicArchive.ts`
- `frontend-next/src/lib/api/publicTrust.ts`
- `frontend-next/src/lib/api/publicSponsorDisclosures.ts`
- `frontend-next/src/components/archive/ArchiveShell.tsx`
- `frontend-next/src/components/archive/ArchiveRecordShell.tsx`
- `frontend-next/src/components/transparency/SponsorDisclosurePanel.tsx`
- `frontend-next/src/components/trust/TrustCenterShell.tsx`
- `frontend-next/src/app/(public)/archive/page.tsx`
- `frontend-next/src/app/(public)/archive/[record]/page.tsx`
- `frontend-next/src/app/(public)/transparency/page.tsx`
- `frontend-next/src/app/(public)/trust/page.tsx`
- `frontend-next/src/test/archiveRecordPage.test.tsx`
- `frontend-next/src/test/transparencyPage.test.tsx`
- `frontend-next/src/test/sponsorDisclosurePanel.test.tsx`
- `frontend-next/src/test/trustCenterPage.test.tsx`

## Validation Commands
Backend:
- `python -m pytest -q tests/test_public_archive.py tests/test_public_trust.py tests/test_public_decisions.py tests/test_public_sponsor_disclosures.py`

Frontend:
- `npx vitest run src/test/archivePage.test.tsx src/test/archiveRecordPage.test.tsx`
- `npm run -s typecheck`
