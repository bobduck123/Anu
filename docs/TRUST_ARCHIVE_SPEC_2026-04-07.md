# Trust and Archive Spec (2026-04-07)

## Purpose
Define the first canonical trust and archive surfaces for ANU so that public legitimacy rests on product surfaces and record models rather than internal documents alone.

## Trust Center Information Architecture
The first trust center should provide entry points for:
1. platform trust overview,
2. governance and model legibility,
3. sponsor disclosures,
4. public trust reports,
5. archive records,
6. redaction / sensitivity notes,
7. operational status pointers where appropriate.

## Archive Record Types
The following record classes are in scope for the next phase:
- public trust report,
- governance decision summary,
- model registry record snapshot,
- milestone acceptance record,
- sponsor disclosure record,
- connector transition proof summary,
- archive record generated from flagship journey consequence.

## Required Record Fields
Every public archive record must include:
- `id`
- `slug`
- `record_type`
- `title`
- `summary`
- `node_slug`
- `visibility_class`
- `verification_status`
- `last_verified_at`
- `source_route`
- `provenance_summary`
- `sponsor_context` (nullable)
- `redaction_note` (nullable)

## Public Trust Report
A `PublicTrustReport` should be the first canonical trust model.

Minimum fields:
- `id`
- `slug`
- `title`
- `summary`
- `report_kind`
- `node_slug`
- `published_at`
- `verification_status`
- `provenance_summary`
- `archive_record_id` (nullable)
- `sponsor_disclosure_ref` (nullable)

## Deep-Link Rules
1. Archive index and archive detail routes must be deep-linkable.
2. Trust reports must link to archive records where applicable.
3. Governance/model surfaces should be able to reference archive records directly.
4. Deep links must remain stable even if presentation changes.

## Provenance Rules
Public trust and archive surfaces must expose:
- source posture,
- verification posture,
- freshness or review posture,
- degraded honesty statement if needed.

No consequential claim should appear without at least one of those.

## Sensitivity / Redaction Rules
### Public
- explicitly public records and summaries,
- safe sponsor disclosures,
- public governance and trust summaries.

### Restricted
- tenant-only or node-scoped records,
- operational details inappropriate for public display,
- culturally sensitive material under custodian review.

### Redaction doctrine
If a record cannot be public in full, the trust surface should still say:
- that a restricted record exists where appropriate,
- why it is not fully public,
- what public summary can be shown safely.

## Initial Route Surfaces
Minimum route surfaces in this phase:
- `/transparency`
- `/archive`
- `/archive/[id]`
- public governance/model routes with archive backlinks

## Tests Required
- archive route deep-link tests,
- provenance rendering tests,
- visibility class tests,
- sponsor disclosure linkage tests where applicable.

## Invalid States
The following fail the trust/archive posture:
- trust pages with no canonical record model,
- archive records with no provenance posture,
- hidden sponsor context,
- public exposure of restricted artifacts,
- deep links that depend on temporary UI state.
