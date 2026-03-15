# Next Pass Execution Plan

Prepared on March 16, 2026, using the live production baseline from `https://maanara.vercel.app/`.

Reference: `docs/LIVE_DEPENDENCY_MAP.md`

## Current baseline

- Live impact service is still degraded and running placeholder infrastructure.
- Live Manara feed is still backed by placeholder data.
- Live `/_impact/v1/education/maps` is still returning an Express 404, so the Falak route split is not active in production.
- Live frontend does not expose `/education/resource-library/maps`.
- Core cultural-intelligence pages are wired, but the public datasets behind them are mostly empty and the world snapshot path is unresolved.
- Memberships currently have split ownership in code, but the visible frontend page is still calling the Flask core API.

## Execution goals

1. Restore the intended production topology: Next -> `/_core` Flask and Next -> `/_impact` with both legacy Express `/api/*` and Falak `/v1/*`.
2. Remove placeholder dependencies from the public Manara feed.
3. Make the cultural-intelligence surfaces either real or explicitly withheld.
4. Collapse duplicated ownership where frontend, core, and impact currently overlap.
5. Add enough deployment verification that the same drift does not recur silently.

## Sequence

### Phase 0: Deployment Controls

Goal: stop shipping blind.

Tasks:

- Add production and staging smoke checks for:
  - `/manara`
  - `/_impact/health`
  - `/_impact/api/manara/feed`
  - `/_impact/v1/education/maps`
  - `/_core/health`
  - `/_core/api/public/worlds/sydney-alpha/snapshot`
  - `/_core/api/memberships/plans`
- Record the current Vercel project mapping and root directories for:
  - `frontend-next`
  - `flora-fauna/backend`
  - `services/impact-service`
- Record the minimum env contract for each project, especially:
  - core auth secrets
  - impact auth secrets
  - Falak tenant/runtime config
  - Prisma/database config
  - Stripe config
- Reuse the existing GitHub verification pattern in `.github/workflows/anu-falak-staging-verify.yml`.

Exit criteria:

- A failed route split or placeholder regression is visible in CI before manual QA.
- Vercel project root and env assumptions are written down and reviewable.

### Phase 1: Auth Contract

Goal: make core-issued tokens valid across impact and Falak before expanding traffic there.

Tasks:

- Decide the token contract:
  - Recommended: keep Flask core as the issuer for user-facing login tokens in this pass.
  - Make impact legacy middleware and Falak verification accept the same claims and secret strategy.
- Align `PUBLIC_JWT_SECRET_KEY` vs `JWT_SECRET_KEY`, or explicitly add dual-verification support if separate issuers are required.
- Add an integration test that:
  - logs in through core auth
  - uses that token against one protected impact route
  - uses that token against one protected Falak route

Exit criteria:

- A token minted by core login is accepted by both impact middleware and Falak auth.
- No frontend route depends on secret-value coincidence alone.

### Phase 2: Falak Route Activation

Goal: get the intended `/_impact/v1/*` production surface online.

Tasks:

- Verify the impact Vercel project is deploying `services/impact-service/vercel.json` as intended.
- Confirm `api/falak.ts` is included in the deployed build output.
- Verify route ownership for:
  - `/v1/falak/health`
  - `/v1/falak/readiness`
  - `/v1/education/maps`
  - `/v1/education/maps/resolve`
- Deploy to staging first and confirm responses come from Fastify, not Express.
- Once staging is clean, promote the same routing contract to production.

Exit criteria:

- `/_impact/v1/education/maps` returns a Falak response in staging and production.
- The live host no longer returns Express 404 for the Falak path.

### Phase 3: Education Maps Frontend Release

Goal: expose the Falak maps surface only after the backend route exists.

Tasks:

- Ensure the frontend route at `/education/resource-library/maps` is part of the deployed build.
- Verify `educationMapsApi` resolves against the live `/_impact/v1/*` route.
- Confirm tenant resolution is valid in production:
  - `NEXT_PUBLIC_FALAK_TENANT_ID`
  - `X-Tenant-Id`
- Add a strict frontend fallback for:
  - no maps found
  - tenant missing
  - Falak route unavailable

Exit criteria:

- `/education/resource-library/maps` resolves on the live frontend.
- List and resolve flows work without raw 404s leaking to the UI.

### Phase 4: Replace Placeholder Manara Feed

Goal: move `/manara` off placeholder data.

Tasks:

- Provision the impact service runtime dependencies required to leave placeholder mode:
  - Prisma/database
  - any feed seed data or migrations
- Confirm `buildServerApp()` is mounting `createFloraFaunaRoutes()` in production, not `createFloraFaunaPlaceholderRoutes()`.
- Seed the minimum viable live dataset:
  - one or more channels
  - one or more pools
  - a non-placeholder feed payload
- Add a smoke check assertion that `/_impact/api/manara/feed` is not returning `placeholder: true`.

Exit criteria:

- `/manara` loads real data from the data-backed impact route.
- `/_impact/health` reflects database readiness, even if Stripe remains incomplete.

### Phase 5: Cultural-Intelligence Decision Pass

Goal: stop exposing hollow pages.

Tasks:

- Decide per surface whether to seed now or hide now:
  - `/explore`
  - `/intel-feed`
  - `/learn`
  - `/quests`
- Recommended rule:
  - if a page needs a world snapshot or curated seed content to make sense, hide it until seeded
  - if a page can support a valid empty state, keep it live but make the empty state explicit
- Seed the minimum viable core content set if keeping these routes public:
  - one world snapshot for `sydney-alpha`
  - fused events
  - story clusters
  - learning modules
  - guided journeys
  - quest templates
- Add frontend guards so missing datasets do not read as broken infrastructure.

Exit criteria:

- `/explore` either loads a valid world snapshot or is intentionally withheld.
- `/intel-feed`, `/learn`, and `/quests` are either populated or explicitly positioned as empty-state previews.

### Phase 6: Memberships Consolidation

Goal: remove split ownership between core and impact.

Tasks:

- Choose the single owner for memberships.
- Recommended near-term path:
  - keep Flask core as the live owner until impact billing and database are fully configured
  - retire or hide impact memberships routes from the public dependency graph until then
- After the owner is chosen:
  - migrate frontend clients to one API surface
  - remove duplicate route assumptions
  - align checkout, status, and plan shapes

Exit criteria:

- The frontend imports one memberships client only.
- There is one authoritative plans endpoint, one checkout flow, and one status contract.

## Recommended rollout order

1. Phase 0 in the current branch.
2. Phase 1 in staging.
3. Phase 2 in staging, then production.
4. Phase 3 immediately after Phase 2 reaches production.
5. Phase 4 once impact data dependencies are ready.
6. Phase 5 as either seed work or feature-flag cleanup.
7. Phase 6 after the live owner decision is made.

## Suggested owners

- Frontend: route exposure, empty states, client alignment
- Core backend: auth issuer, cultural-intelligence seed data, memberships if retained
- Impact service: route split, Falak deployment, Manara feed, memberships if migrated
- Ops/Vercel: project roots, env parity, secret alignment, staging-to-production promotion

## Risks to watch

- Turning on Falak routes before auth alignment will create a partial rollout that works only for public paths.
- Keeping both core and impact memberships alive will preserve frontend drift.
- Seeding data without smoke checks will not prevent the same production mismatch from returning later.
- Shipping `/education/resource-library/maps` before the backend route is live will recreate the current 404 state.

## Definition of done for the pass

- Live production serves the intended route topology.
- `/manara` is not placeholder-backed.
- `/education/resource-library/maps` is live and wired to Falak.
- Cultural-intelligence pages are either populated or intentionally hidden.
- Memberships have one owner.
- CI catches route drift before deployment.
