# PEACH Gate 9 ANU Mutation Architecture Decision

Date: 2026-07-30
Repo: C:\Dev\Flora_fauna
Gate: 9 - Contribution + ConsentRecord persistence and steward review foundation

## Backend and control-plane findings

ANU already has a Flask backend under `flora-fauna/backend/app` with SQLAlchemy models in `models.py`, API blueprints registered from `app/api/__init__.py`, and response helpers in `app/api/utils.py`. Existing tests use `backend_factory.load_create_app`, in-memory SQLite, and `AUTO_CREATE_ALL` for schema creation.

The control plane already has a hardened path in `app/security/control_plane.py`. `control_plane_required` validates control-host requests, JWT identity, shared secret, MFA claims, roles, and optional grants/scopes. `AuditLog` is the existing durable audit mechanism in `models.py`.

Frontend Next routes already provide PEACH public read surfaces and read-only API projection under `frontend-next/src/app/api/peach`. Those routes are appropriate for public catalog reads, but not for durable mutations.

## Decision

Gate 9 mutations live in the ANU backend, not in frontend route handlers. The backend now owns Contribution intake, ConsentRecord creation, protected steward listing/detail/review, and review audit events.

Frontend responsibility is limited to the public/private pilot contribution page and a small API client that posts to the backend. This keeps durable mutation semantics, validation, audit, and control-plane authorization in one ANU-native layer.

## Implementation locations

- Backend API: `flora-fauna/backend/app/api/peach.py`
- Backend blueprint registration: `flora-fauna/backend/app/api/__init__.py`
- Models: `flora-fauna/backend/app/models.py`
- SQL migration: `flora-fauna/backend/migrations/versions/20260730_peach_gate9_contribution_consent.sql`
- Backend tests: `flora-fauna/backend/tests/test_peach_gate9.py`
- Frontend API client: `frontend-next/src/lib/api/peach.ts`
- Frontend form: `frontend-next/src/components/peach/PeachContributionForm.tsx`
- Frontend route: `frontend-next/src/app/(app)/peach/fields/[slug]/contribute/page.tsx`

## Database and migration approach

Gate 9 adds additive ANU-native tables for `peach_contribution`, `peach_consent_record`, and `peach_contribution_review_event`. The migration is PostgreSQL-oriented and additive. It does not mutate existing Presence, Orchard, public PEACH read, or support-option tables.

The focused tests prove the same schema shape through SQLAlchemy `create_all` in SQLite test mode.

## Auth and control protection

Public intake is unauthenticated but rate-limited and constrained to Field 001. It rejects sensitive material, youth material, missing consent, invalid enum values, and excessive body length.

Steward review routes are protected with the existing ANU control-plane decorator. Review access requires control-plane headers/token behavior rather than a PEACH-specific parallel secret.

## Audit approach

Contribution creation writes an `AuditLog` event named `peach.contribution.created`. Review mutation writes both a `PeachContributionReviewEvent` and an `AuditLog` event named `peach.contribution.review_status_changed` with sensitive-read context and status transition metadata.

## Intentionally not implemented

- Public contribution display
- Public-approved review status
- Commons/Yield publication from submissions
- File upload
- Youth or child contribution collection
- Sensitive testimony collection
- Email automation
- Real payments, checkout, cart, product grid, or ecommerce support
- Consent export/withdrawal operations
- SupportIntent persistence
- Presence integration beyond PEACH documentation/read surfaces

## Risks

The focused PEACH backend tests pass. The broader backend suite currently reports three Presence lifecycle failures and five temp-directory setup errors outside PEACH. Those failures are not in the new Gate 9 test file, but they remain broader repository risk before a full release train.
