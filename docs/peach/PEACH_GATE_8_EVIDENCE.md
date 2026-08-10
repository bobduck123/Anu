# PEACH Gate 8 Evidence

Status: completed
Date: 2026-07-30
Repo: C:\Dev\Flora_fauna

## Files Created Or Edited

Documentation:

- docs/peach/PEACH_GATE_8_ANU_ARCHITECTURE_FINDINGS.md
- docs/peach/PEACH_GATE_8_ANU_DATA_MODEL_DECISION.md
- docs/peach/PEACH_GATE_8_ANU_API_CONTROL_PLANE_SPEC.md
- docs/peach/PEACH_GATE_8_EVIDENCE.md
- docs/peach/PEACH_GATE_8_READINESS.md

Frontend/read foundation:

- frontend-next/src/lib/peach/types.ts
- frontend-next/src/lib/peach/catalog.ts
- frontend-next/src/lib/peach/readModel.ts
- frontend-next/src/components/peach/PeachFieldView.tsx
- frontend-next/src/app/(app)/peach/page.tsx
- frontend-next/src/app/(app)/peach/fields/[slug]/page.tsx
- frontend-next/src/app/api/peach/fields/route.ts
- frontend-next/src/app/api/peach/fields/active/route.ts
- frontend-next/src/app/api/peach/fields/[slug]/route.ts
- frontend-next/src/data/peach/field001.ts

## ANU Architecture Findings

- `frontend-next` is the primary ANU web app and supports public app routes, route handlers, Supabase auth context, tenant branding, and shared API clients.
- Core backend APIs live in Flask under `flora-fauna/backend/app/api` and are registered through `app/api/__init__.py`.
- Database changes use public-schema SQL files and backend migration files under `flora-fauna/backend/migrations/versions`.
- Node tenancy is based on `Node`, `NodeDomain`, `NodeConfig`, and `NodeServiceBinding`.
- Control-plane access is host-gated and allowlist/proxy based in `frontend-next/src/app/api/control/[...path]/route.ts`.
- Presence owner APIs use Supabase JWT, local ANU user resolution, owner scoping, and explicit public/private projection.
- Presence public routes filter unpublished/private state and public serializers omit owner/admin/private fields.

Full findings are in PEACH_GATE_8_ANU_ARCHITECTURE_FINDINGS.md.

## Data/API Decisions

- Field remains the central PEACH primitive.
- Books remain Vessels only, not products.
- Orchard stays static for Phase 1.
- Field, Vessel, Gathering, TendingPrompt, Contribution, ConsentRecord, SupportIntent, CommonsEntry, Steward assignment, and AuditLog integration should become ANU core backend persistence in Gate 9.
- Contribution and ConsentRecord persistence was deferred because safe implementation requires backend models, migrations, auth, rate limits, and audit logging together.
- Support is represented as manual intent metadata only; every option has `paymentTaken: false`.
- Commons is represented only as a placeholder Return path, not a feed.

## Implementation Completed

Gate 8 moved Field 001 from page-local static data into an ANU PEACH read foundation:

- typed PEACH primitives under `frontend-next/src/lib/peach/types.ts`;
- shared PEACH catalog under `frontend-next/src/lib/peach/catalog.ts`;
- public read functions under `frontend-next/src/lib/peach/readModel.ts`;
- `/peach` consumes `getActivePeachFieldResponse()`;
- `/peach/fields/studying-ourselves` consumes `getPeachFieldBySlug()`;
- `/api/peach/fields`, `/api/peach/fields/active`, and `/api/peach/fields/[slug]` expose the same public-safe shape;
- pages carry noindex metadata;
- contribution intake remains disabled;
- no forms, uploads, checkout, cart, or public contribution rendering were added.

## Implementation Held

- Flask backend PEACH models and migrations.
- Durable Contribution persistence.
- Durable ConsentRecord persistence.
- Consent withdrawal/export workflow.
- Steward review route/API.
- Control-plane allowlist entries.
- SupportIntent persistence.
- Real payments or checkout.
- Public contribution display.
- Public Yield/Commons release.
- Youth/sensitive-material collection.

## Commands Run

Inspection:

```bash
rg --files C:\Dev\Flora_fauna
rg -n "export async function GET|NextResponse|apiFetch|control|Authorization|Bearer|audit|operator|owner" C:\Dev\Flora_fauna\frontend-next\src\app\api C:\Dev\Flora_fauna\frontend-next\src\lib -g "*.ts" -g "*.tsx"
rg -n "presence/public|presence/owner|published_at|public_status|private-state|PresenceStudioV3State" C:\Dev\Flora_fauna\flora-fauna\backend\app -g "*.py"
```

Verification:

```bash
npm run typecheck
npm run dev -- -p 3328
curl.exe -I http://localhost:3328/peach
curl.exe -I http://localhost:3328/peach/fields/studying-ourselves
curl.exe -s http://localhost:3328/api/peach/fields/active
rg -n "checkout|cart|storefront|bookstore|publicContributionDisplay:\s*true|paymentTaken:\s*true|<form|<textarea|<input" frontend-next/src/app/(app)/peach frontend-next/src/components/peach frontend-next/src/lib/peach frontend-next/src/app/api/peach
```

## Test Results

- `npm run typecheck` passed in `C:\Dev\Flora_fauna\frontend-next`.
- `HEAD /peach` returned `200 OK` from local dev server on port 3328.
- `HEAD /peach/fields/studying-ourselves` returned `200 OK` from local dev server on port 3328.
- `GET /api/peach/fields/active` returned `{ ok: true, data: { orchard, field } }`.
- Dev server logs showed the PEACH API and routes compiling and returning 200.

## Public Route Proof

The public route proof is read-only. `/peach` and `/peach/fields/studying-ourselves` render from the same read model. The API response includes:

- `contributionIntakeStatus: "disabled"`
- `publicContributionDisplay: false`
- `sensitiveMaterialCollection: false`
- `youthMaterialCollection: false`
- support options with `paymentTaken: false`
- Commons placeholder with `publicUrl: null`

## Backend/API Proof

No Flask backend was touched. Frontend read-only API route handlers were implemented as a safe interim read path. Core backend proof is deferred to Gate 9.

## Contribution/Consent Proof

Contribution intake was not implemented. No public form, textarea, input, or mutating contribution endpoint exists in the PEACH frontend/API slice. ConsentRecord persistence is deferred.

## Steward/Control-Plane Proof

Steward review was not implemented. The architecture findings document the required ANU control-plane/owner-scoped integration before enabling steward review.

## Support Intent Proof

Support is metadata-only. The read model exposes the five support purposes and all have `paymentTaken: false`. No cart, checkout, product grid, Stripe call, or payment route was added.

## Anti-Pattern Checks

The anti-pattern scan found no cart, storefront, bookstore, public contribution display true, paymentTaken true, form, textarea, or input in the PEACH implementation. The only hit was the word `checkout` in the held-surfaces warning: `Real payments or checkout`.

## Risks And Blockers

- PEACH is still partially static because durable backend tables are not implemented.
- Mutating routes are blocked on backend schema, authorization, rate limits, audit, and control/owner route decisions.
- Public deployment is blocked by noindex/private-staging posture and lack of production consent/steward workflows.
- Support remains copy and metadata, not persisted intent.

## Verdict

VERDICT: ACCEPT GATE 8 / BEGIN GATE 9
