# PEACH Gate 9 Evidence

Date: 2026-07-30

## Files created or edited

Backend:

- `flora-fauna/backend/app/api/peach.py`
- `flora-fauna/backend/app/api/__init__.py`
- `flora-fauna/backend/app/models.py`
- `flora-fauna/backend/migrations/versions/20260730_peach_gate9_contribution_consent.sql`
- `flora-fauna/backend/tests/test_peach_gate9.py`

Frontend:

- `frontend-next/src/lib/api/peach.ts`
- `frontend-next/src/components/peach/PeachContributionForm.tsx`
- `frontend-next/src/app/(app)/peach/fields/[slug]/contribute/page.tsx`
- `frontend-next/src/lib/peach/catalog.ts`
- `frontend-next/src/components/peach/PeachFieldView.tsx`

Docs:

- `docs/peach/PEACH_GATE_9_ANU_MUTATION_ARCHITECTURE_DECISION.md`
- `docs/peach/PEACH_GATE_9_DATA_MODEL_EVIDENCE.md`
- `docs/peach/PEACH_GATE_9_CONTRIBUTION_INTAKE_SPEC.md`
- `docs/peach/PEACH_GATE_9_STEWARD_REVIEW_SPEC.md`
- `docs/peach/PEACH_GATE_9_CONSENT_OPERATIONS_STATUS.md`
- `docs/peach/PEACH_GATE_9_SUPPORT_INTENT_STATUS.md`
- `docs/peach/PEACH_GATE_9_EVIDENCE.md`
- `docs/peach/PEACH_GATE_9_READINESS.md`

## Commands and results

Backend focused PEACH tests:

```powershell
cd C:\Dev\Flora_fauna\flora-fauna\backend
python -m pytest tests\test_peach_gate9.py -q
```

Result: `4 passed in 2.68s` after final source normalization.

Frontend typecheck:

```powershell
cd C:\Dev\Flora_fauna\frontend-next
npm run typecheck
```

Result: passed with `tsc --noEmit`.

Frontend route proof with Next dev server on port 3329:

```powershell
curl.exe -I http://localhost:3329/peach
curl.exe -I http://localhost:3329/peach/fields/studying-ourselves
curl.exe -I http://localhost:3329/peach/fields/studying-ourselves/contribute
curl.exe -s http://localhost:3329/api/peach/fields/active
```

Results:

- `/peach` returned `HTTP/1.1 200 OK`
- `/peach/fields/studying-ourselves` returned `HTTP/1.1 200 OK`
- `/peach/fields/studying-ourselves/contribute` returned `HTTP/1.1 200 OK`
- `/api/peach/fields/active` returned public catalog data with `contributionIntakeStatus: "pilot_private"`, `publicContributionDisplay: false`, sensitive/youth collection false, and support options with `paymentTaken: false`.

Broader backend suite:

```powershell
cd C:\Dev\Flora_fauna\flora-fauna\backend
python -m pytest tests -q --tb=short --disable-warnings
```

Result: `3 failed, 334 passed, 953 warnings, 5 errors in 113.39s`.

The failures/errors are outside the new PEACH Gate 9 test file:

- `tests/test_presence_setup_request_lifecycle.py::test_create_preview_uses_customisation_snapshot_and_does_not_publish`
- `tests/test_presence_setup_request_lifecycle.py::test_publish_requires_preview_then_makes_public_presence_qr_and_vcard_work`
- `tests/test_presence_setup_request_lifecycle.py::test_archive_preserves_setup_request_and_unpublishes_associated_presence`
- `tests/test_presence_studio_editor_foundation.py` setup errors from `PermissionError: [WinError 5] Access is denied: C:\Users\emadh\AppData\Local\Temp\pytest-of-emadh`
- `tests/test_presence_studio_v3_backend_foundation.py` setup errors from the same temp-directory permission issue

## Contribution and consent proof

`tests/test_peach_gate9.py` proves a valid Field 001 submission through `POST /api/peach/fields/studying-ourselves/contributions` creates:

- `PeachContribution.field_slug = studying-ourselves`
- `PeachContribution.review_status = pending_review`
- `PeachContribution.public_display = false`
- `PeachConsentRecord.consent_version = gate9-v1`
- `PeachConsentRecord.accepted_terms = true`
- `AuditLog.event = peach.contribution.created`

The public response omits the contribution body.

## Steward review proof

`tests/test_peach_gate9.py` proves:

- Unauthenticated `GET /api/control/peach/contributions` is blocked.
- Authenticated control-plane access lists pending contributions without body text.
- Authenticated detail access can read body text and ConsentRecord data.
- Authenticated review can set status to `held`.
- Review updates ConsentRecord steward metadata.
- Review creates a `PeachContributionReviewEvent`.
- Review creates `AuditLog.event = peach.contribution.review_status_changed`.
- Review rejects public status and `publicDisplay: true`.

## Public non-display proof

Public PEACH read APIs remain catalog projections. The active-field API returns `publicContributionDisplay: false` and no submitted body fields. The frontend public Field page renders Field 001 and links to private pilot intake, but it does not list submitted contributions.

## Rejection proof

`tests/test_peach_gate9.py` proves:

- Invalid enum submissions are rejected.
- Sensitive-material submissions are rejected.
- Youth-material submissions are rejected.

## Support non-payment proof

The public active-field API still returns support options with `paymentTaken: false`. Gate 9 adds no checkout, cart, payment capture, or product grid.

## Anti-pattern scan

The final code-only scan checked for cart/storefront/bookstore/product-grid/payment/public-display drift across touched PEACH frontend and backend implementation paths. The only hit was `reviewStatus: "published"` inside `tests/test_peach_gate9.py`, where the test proves that public-approved review status is rejected. No PEACH implementation introduced cart, storefront, bookstore-first behavior, social feed, real payment, or public contribution display.

