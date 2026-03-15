# Next Pass Task Board

Prepared on March 16, 2026.

References:

- `docs/LIVE_DEPENDENCY_MAP.md`
- `docs/NEXT_PASS_EXECUTION_PLAN.md`

## Usage

- `Priority`: execution order within the pass
- `Owner`: delivery surface, not a named person
- `Depends on`: gating dependency that must be true before starting or shipping
- `Verify`: the minimum check required before closing the ticket

## Phase 0: Deployment Controls

### P0-1: Add route smoke checks for current production drift points

- Priority: P0
- Owner: Ops/Vercel + Impact service
- Outcome: CI fails when route ownership or placeholder regressions reappear
- Touch:
  - `.github/workflows/anu-falak-staging-verify.yml`
  - `services/impact-service/package.json`
  - `services/impact-service/scripts/*` if new smoke scripts are needed
- Depends on: none
- Verify:
  - `/manara` returns 200
  - `/_impact/health` returns JSON
  - `/_impact/api/manara/feed` returns JSON
  - `/_impact/v1/education/maps` is checked explicitly
  - `/_core/health` is checked explicitly
  - `/_core/api/public/worlds/sydney-alpha/snapshot` is checked explicitly
  - `/_core/api/memberships/plans` is checked explicitly

### P0-2: Write the Vercel project-root and env contract

- Priority: P0
- Owner: Ops/Vercel
- Outcome: deployment assumptions stop living only in tribal knowledge
- Touch:
  - `docs/DEPLOY_VERCEL_MANARA.md`
  - `docs/GITHUB_DESKTOP_VERCEL_HANDOFF.md`
  - optional new runbook under `docs/`
- Depends on: none
- Verify:
  - each Vercel project root is documented
  - env keys are grouped by frontend, core, and impact
  - auth secret relationships are explicit

## Phase 1: Auth Contract

### P1-1: Define the single token contract for this pass

- Priority: P1
- Owner: Core backend + Impact service
- Outcome: one documented rule for who issues user-facing tokens and who validates them
- Touch:
  - `flora-fauna/backend/app/auth.py`
  - `flora-fauna/backend/app/config.py`
  - `services/impact-service/src/middleware/auth.ts`
  - `services/impact-service/src/falak/auth/actorIdentity.ts`
  - `docs/NEXT_PASS_EXECUTION_PLAN.md` if the decision changes
- Depends on: P0-2
- Verify:
  - token issuer, claims, audience, and secret expectations are written down
  - impact legacy auth and Falak auth implement that same rule

### P1-2: Add cross-service auth integration coverage

- Priority: P1
- Owner: Core backend + Impact service
- Outcome: auth alignment is enforced by tests rather than by luck
- Touch:
  - `services/impact-service/tests/*`
  - `flora-fauna/backend/tests/*`
  - optional shared test helper under `services/impact-service/scripts/` or `tests/`
- Depends on: P1-1
- Verify:
  - a token obtained from core login is accepted on one protected impact route
  - the same token is accepted on one protected Falak route

## Phase 2: Falak Route Activation

### P2-1: Verify Vercel is deploying the intended impact route split

- Priority: P2
- Owner: Impact service + Ops/Vercel
- Outcome: `services/impact-service/vercel.json` is the real production routing source
- Touch:
  - `services/impact-service/vercel.json`
  - `services/impact-service/api/index.ts`
  - `services/impact-service/api/falak.ts`
  - deployment docs if mismatched
- Depends on: P0-2
- Verify:
  - staging serves `/v1/falak/health` and `/v1/education/maps` from Falak
  - response headers and body shape confirm Fastify ownership rather than Express

### P2-2: Promote Falak `/v1/*` routing to production

- Priority: P2
- Owner: Impact service + Ops/Vercel
- Outcome: production no longer returns Express 404 for `/_impact/v1/*`
- Touch:
  - no code if config-only
  - otherwise same files as P2-1
- Depends on: P1-2, P2-1
- Verify:
  - `https://maanara.vercel.app/_impact/v1/education/maps` no longer returns Express 404
  - `https://maanara.vercel.app/_impact/v1/falak/health` returns Falak health JSON

## Phase 3: Education Maps Frontend Release

### P3-1: Make the frontend maps route deployable and visible

- Priority: P3
- Owner: Frontend
- Outcome: `/education/resource-library/maps` is part of the live app
- Touch:
  - `frontend-next/src/app/(app)/education/resource-library/maps/page.tsx`
  - `frontend-next/src/components/education/maps/MapLibraryIndex.tsx`
  - navigation or linking surfaces if needed
- Depends on: P2-2
- Verify:
  - live route returns 200 instead of Next 404
  - route renders a usable empty or populated state

### P3-2: Harden frontend Falak error handling

- Priority: P3
- Owner: Frontend
- Outcome: tenant, route, and API failures degrade cleanly
- Touch:
  - `frontend-next/src/lib/api/educationMaps.ts`
  - `frontend-next/src/components/education/maps/MapLibraryIndex.tsx`
  - map detail pages if present
- Depends on: P2-2
- Verify:
  - no raw backend 404 or parser failure leaks into the UI
  - tenant missing and route unavailable states show controlled messaging

## Phase 4: Replace Placeholder Manara Feed

### P4-1: Bring the impact service out of placeholder mode for feed data

- Priority: P4
- Owner: Impact service + Ops/Vercel
- Outcome: production mounts real Manara routes instead of placeholder routes
- Touch:
  - `services/impact-service/src/bootstrapApp.ts`
  - `services/impact-service/src/routes/floraFauna.ts`
  - Prisma config and migration files
  - deployment env config
- Depends on: P0-2
- Verify:
  - `/_impact/health` reports database configured
  - `/_impact/api/manara/feed` no longer returns `placeholder: true`

### P4-2: Seed minimum viable Manara data

- Priority: P4
- Owner: Impact service
- Outcome: `/manara` has real channels, pools, and feed items
- Touch:
  - Prisma seed files
  - `services/impact-service/src/controllers/floraFauna.controller.ts`
  - seed docs if needed
- Depends on: P4-1
- Verify:
  - `/manara` renders non-placeholder content
  - `/api/manara/channels` and `/api/manara/pools` both return real records

## Phase 5: Cultural-Intelligence Decision Pass

### P5-1: Decide which public CI surfaces remain live this pass

- Priority: P5
- Owner: Frontend + Core backend
- Outcome: no ambiguous half-live pages
- Touch:
  - `frontend-next/src/app/(app)/explore/page.tsx`
  - `frontend-next/src/app/(app)/intel-feed/page.tsx`
  - `frontend-next/src/app/(app)/learn/page.tsx`
  - `frontend-next/src/app/(app)/quests/page.tsx`
- Depends on: none
- Verify:
  - each route is marked as either seed-now or hide-now

### P5-2: Seed minimum viable world and learning data

- Priority: P5
- Owner: Core backend
- Outcome: the kept CI routes have enough data to justify being public
- Touch:
  - `flora-fauna/backend/app/api/cultural_public.py`
  - core seed/migration files
  - related service modules under `flora-fauna/backend/app/services/`
- Depends on: P5-1
- Verify:
  - `/_core/api/public/worlds/sydney-alpha/snapshot` resolves
  - `/_core/api/public/intel/events` returns data
  - `/_core/api/public/intel/clusters` returns data
  - `/_core/api/public/learn/modules` returns data
  - `/_core/api/public/learn/journeys` returns data
  - `/_core/api/public/quests/templates` returns data

### P5-3: Add explicit empty-state or feature-flag behavior where data is deferred

- Priority: P5
- Owner: Frontend
- Outcome: missing data reads as intentional, not broken
- Touch:
  - same frontend CI page files as P5-1
  - related UI state components
- Depends on: P5-1
- Verify:
  - deferred routes show a designed empty state or are removed from navigation

## Phase 6: Memberships Consolidation

### P6-1: Choose the authoritative memberships owner

- Priority: P6
- Owner: Core backend + Impact service + Frontend
- Outcome: one backend contract for plans, checkout, and status
- Touch:
  - `frontend-next/src/lib/api/endpoints.ts`
  - `frontend-next/src/lib/api/impactApi.ts`
  - `frontend-next/src/app/(app)/memberships/page.tsx`
  - `flora-fauna/backend/app/api/memberships.py`
  - `services/impact-service/src/routes/memberships.ts`
- Depends on: P4-1 if impact is the target owner
- Verify:
  - owner decision is written down
  - duplicate public path is retired or clearly internal-only

### P6-2: Remove duplicate frontend assumptions

- Priority: P6
- Owner: Frontend
- Outcome: the frontend imports one memberships client only
- Touch:
  - `frontend-next/src/app/(app)/memberships/page.tsx`
  - `frontend-next/src/app/(app)/impact/page.tsx`
  - `frontend-next/src/lib/api/endpoints.ts`
  - `frontend-next/src/lib/api/impactApi.ts`
- Depends on: P6-1
- Verify:
  - one plans path
  - one checkout path
  - one status path
  - one response shape across consuming pages

## Critical Path

1. P0-1
2. P0-2
3. P1-1
4. P1-2
5. P2-1
6. P2-2
7. P3-1
8. P3-2
9. P4-1
10. P4-2

The CI pages and memberships cleanup can run after the critical path unless product decides they block release.

## Release Gates

### Gate A: Falak backend ready

- P1-2 complete
- P2-2 complete

### Gate B: Maps frontend release ready

- Gate A complete
- P3-1 complete
- P3-2 complete

### Gate C: Manara public data ready

- P4-1 complete
- P4-2 complete

### Gate D: Pass complete

- Gate B complete
- Gate C complete
- P5 decisions complete
- P6 owner decision complete
