# PEACH Gate 9 Readiness

Date: 2026-07-30

## Implemented

Gate 9 implements ANU-native durable Contribution and ConsentRecord persistence for Field 001. Contributions enter as private, pending-review records. Consent is explicit, versioned, and stored separately from review status.

Gate 9 also implements protected steward-control review APIs. Control-plane users can list pending contributions, read contribution detail with consent context, and move review status to `held`, `accepted_private`, or `rejected`. Review mutation is audited through both a PEACH review-event table and the ANU `AuditLog`.

The frontend now exposes `/peach/fields/studying-ourselves/contribute` as a private pilot intake surface backed by the ANU backend API.

## ANU-native assessment

Contribution and ConsentRecord persistence are ANU-native enough for Gate 9 because they live in the core backend, use the shared SQLAlchemy/database/migration pattern, use the existing API blueprint pattern, use existing response helpers, and use the existing control-plane and audit model.

Steward review is ANU-native enough for Gate 9 because it uses the existing `control_plane_required` authorization path rather than a PEACH-specific review secret.

## Still blocked

- Public contribution display
- Public Commons/Yield release
- Public-approved review status
- Consent export/withdrawal operations
- SupportIntent persistence
- Real payments or checkout
- File uploads
- Youth/child collection
- Sensitive testimony collection
- Email automation
- Dedicated steward UI
- Presence integration

## Private internal pilot readiness

A private internal ANU pilot can begin for Field 001 after the target backend environment has the Gate 9 migration applied and control-plane configuration is present. The pilot boundary is narrow: text-only, adult-only, non-sensitive submissions, private by default, steward reviewed, no publication.

## Public deployment blockers

Public deployment remains blocked by the held consent operations, held support-intent workflow, absence of a steward UI, no public-release policy, no safeguarding workflow for sensitive/youth material, and the broader backend suite residuals outside PEACH.

## Test status

Focused PEACH backend tests pass: `4 passed`.

Frontend typecheck passes.

Public PEACH routes and read API returned 200/public-safe payloads in local route proof.

The broader backend suite is not green: `3 failed, 334 passed, 5 errors`. The failures are in Presence lifecycle tests and temp-directory setup for Presence Studio tests, not in the new PEACH Gate 9 test file.

## Recommended Gate 10 focus

Gate 10 should harden the private pilot operating layer:

- Add `PeachConsentOperationRequest` for export and withdrawal requests.
- Add minimal `PeachSupportIntent` persistence while preserving `paymentTaken: false`.
- Add a steward review UI or documented control-console workflow.
- Run the migration against a staging database and repeat the private pilot smoke test.
- Triage the broader Presence suite failures before any public release path.

## Readiness verdict

Gate 9 meets the PEACH pass conditions for Contribution + ConsentRecord persistence, protected steward review, audit, private/pending defaults, sensitive/youth rejection, non-payment support, and no public contribution display.
