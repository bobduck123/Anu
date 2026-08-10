# PEACH Gate 8 ANU Architecture Findings

Status: inspected
Date: 2026-07-30
Repo: C:\Dev\Flora_fauna

## Frontend Architecture Findings

ANU's primary web app is `frontend-next`, a Next.js app under `frontend-next/src`. Public app routes live under `src/app/(app)`, public/control/API route handlers live under `src/app/api`, and shared frontend API clients live under `src/lib/api`.

The app root uses `AuthProvider`, `QueryProvider`, `TenantBrandWrapper`, `LayoutShell`, and runtime Supabase environment injection. Public routes therefore inherit tenant branding and auth context but should not assume an authenticated user.

Existing API clients use `apiFetch` from `src/lib/api/client.ts`, which attaches Supabase JWT auth headers when available. Owner-specific Presence clients use `src/lib/api/ownerClient.ts` and `src/lib/api/presenceOwner.ts` for authenticated owner workflows.

Gate 8 PEACH should use a shared read model under `src/lib/peach` rather than isolated page-local fixture data. Public pages may import that read model server-side, while read-only route handlers expose the same shape for future API consumers.

## Backend/API Architecture Findings

The core backend is Flask/SQLAlchemy under `flora-fauna/backend/app`. API modules are registered through `app/api/__init__.py` under `/api/*`. Presence has both public routes (`/api/presence/public/*`) and owner/control routes (`/api/presence/owner/*`, `/api/control/presence/*`).

The backend has existing response helpers returning `{ ok, data }` or structured `{ error }` payloads. Public Presence routes apply rate limits and serialize public-safe projections. Owner routes require Supabase JWT via the alpha auth pattern and resolve or provision a least-privilege local ANU user.

PEACH backend implementation should become a Flask API module only after tables, authorization, audit events, and route registration are designed together. A standalone Next route should not become the production persistence boundary for contributions or steward review.

## Database/Migration Findings

ANU uses a single Supabase PostgreSQL database with core public schema, impact tables, and Falak schema. Root SQL schema files include `scripts/001_core_schema.sql`, `scripts/002_impact_schema.sql`, and `scripts/003_falak_schema.sql`.

The Flask backend also carries Alembic-style SQL migrations under `flora-fauna/backend/migrations/versions`, including Presence migrations such as `20260505_presence_nodes_alpha.sql`, `20260523_presence_editable_config.sql`, `20260526_presence_media_flow_v1c_private_draft.sql`, and `20260721_presence_studio_v3_p1_foundation.sql`.

PEACH Phase 1 should use new PEACH-specific public-schema tables in the Flask/core backend when mutating persistence begins. It should not copy standalone SQLite migrations or local file persistence.

## Tenant/Site/Node Findings

ANU's canonical tenancy primitives include `Node`, `NodeDomain`, `NodeConfig`, and `NodeServiceBinding`. Public site and node contracts resolve node identity and published public manifests. Node-scoped data usually carries `node_id` or `tenant_id` and is filtered by scope.

PEACH should be node-scoped from the start. The initial Orchard can be ANU-scoped (`node_slug: anu`) and should defer multi-Orchard support until there is an actual tenant need.

## Auth And Control-Plane Findings

The frontend control proxy at `frontend-next/src/app/api/control/[...path]/route.ts` is host-gated and allowlist-gated. It evaluates control-plane host access, Supabase session, privileged role, route family, upstream origin, and emits control plane logs. It forwards only allowlisted core/impact control paths.

Presence owner routes are not host-gated control routes. They are authenticated owner workflows scoped to `PresenceNode.owner_user_id == user.id` or `platform_admin`. Presence control routes are separate and enforce tenant scope.

PEACH steward review should not be added as an unprotected frontend page. It needs either:

- a core backend owner/steward API following the Presence owner pattern; or
- a host-gated control API added to the core backend plus an allowlisted frontend control proxy route.

## Presence Public/Private Projection Findings

Presence models separate draft/private owner state from public projection. `PresenceNode` carries status, visibility, public_status, published_at, and owner_user_id. Public queries filter out draft/private/unlisted/suspended/archived rows and public serializers intentionally omit owner_user_id, tenant_id, organisation_id, private contact fields, and admin metadata.

Presence Studio V3 keeps owner-private editor metadata in `PresenceStudioV3State`, described in the model as deliberately outside public config. Published media has a separate promotion path from draft media.

PEACH should follow the same principle: Contributions, ConsentRecords, SupportIntents, and steward review metadata are private/control data. Public Field projection may show only Field metadata, Vessels, Gatherings, prompts, Yield plan, Commons placeholders/returned entries, and support copy that contains no private participant material.

## Where PEACH Should Integrate

Gate 8 implemented PEACH read shape in `frontend-next/src/lib/peach` and public read routes under `frontend-next/src/app/api/peach`. Gate 9 should add core backend tables and Flask API routes if contribution/consent or steward review becomes in scope.

Recommended future backend placement:

- `flora-fauna/backend/app/models.py` for `PeachField`, `PeachVessel`, `PeachGathering`, `PeachPrompt`, `PeachContribution`, `PeachConsentRecord`, `PeachSupportIntent`, `PeachCommonsEntry` if following current monolithic model convention;
- `flora-fauna/backend/app/api/peach.py` for public/steward routes;
- `flora-fauna/backend/migrations/versions/YYYYMMDD_peach_phase1_foundation.sql` for database changes;
- frontend clients under `frontend-next/src/lib/api/peach.ts` only after backend routes exist;
- control proxy allowlist only after steward/control routes exist and are host-gated or owner-scoped.

## What Should Not Be Copied From Standalone PEACH

- SQLite local persistence.
- Private-staging cookie auth.
- In-memory rate limits as production protection.
- Standalone CSRF/session architecture.
- Local-only steward token flow.
- Standalone route hierarchy as production API shape.
- Any bookstore/cart/store/feed framing.
- Any public contribution display before ANU review projection exists.

## Risks

- Adding PEACH mutating APIs before core backend tables and auth would create a parallel architecture.
- Reusing generic Article/Comment tables for Contributions would blur public/private boundaries.
- Reusing payment/membership routes for support too early would turn SupportIntent into checkout.
- Control-plane route work requires host gating, role checks, route allowlists, and audit logging; skipping any of those would make steward review unsafe.
- Public route copy must keep noindex/private-staging posture until launch approval.
