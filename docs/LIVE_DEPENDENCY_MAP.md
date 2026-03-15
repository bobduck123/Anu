# Live Dependency Map

Verified against `https://maanara.vercel.app/` on March 15, 2026.

## Deployment topology

Browser
-> Next.js frontend (`frontend-next`)
-> `/_core/*` proxy -> Flask core API (`flora-fauna/backend`)
-> `/_impact/*` proxy -> impact service (`services/impact-service`)

The frontend proxy wiring is defined in `frontend-next/next.config.ts`, and the runtime defaults to `/_core` and `/_impact` in `frontend-next/src/lib/runtime.ts`.

The repo intends the impact service to expose both legacy Express `/api/*` routes and newer Falak `/v1/*` routes. That intended split is declared in `services/impact-service/vercel.json`, but production is still serving the Express branch for the live `/_impact` host.

## Route map

| Live route | Frontend entry | Frontend client -> proxied endpoint | Owning service | Production state on 2026-03-15 |
| --- | --- | --- | --- | --- |
| `/` | `frontend-next/src/app/page.tsx` | No core dependency confirmed from this pass | Frontend only | Live and static/prerendered |
| `/manara` | `frontend-next/src/app/(app)/manara/page.tsx` -> re-export of `frontend-next/src/app/(app)/flora-fauna/page.tsx` | `floraFaunaApi.getFeed()` -> `/_impact/api/manara/feed`; `listChannels()` -> `/_impact/api/manara/channels`; `listPools()` -> `/_impact/api/manara/pools` | Impact service, legacy Express/placeholder branch | Live. `/_impact/api/manara/feed` returns `placeholder: true`, which matches `services/impact-service/src/routes/floraFaunaPlaceholder.ts` |
| `/flora-fauna` | `frontend-next/src/app/(app)/flora-fauna/page.tsx` | Same dependency chain as `/manara` | Impact service, legacy Express/placeholder branch | Live alias of `/manara` |
| `/explore` | `frontend-next/src/app/(app)/explore/page.tsx` | `fetchWorldSnapshot()` -> `/_core/api/public/worlds/sydney-alpha/snapshot`; `fetchFusedEvents()` -> `/_core/api/public/intel/events`; `fetchLearningModules()` -> `/_core/api/public/learn/modules` | Flask core API | Live page exists. World snapshot currently returns `not_found`; events and modules currently return empty arrays |
| `/intel-feed` | `frontend-next/src/app/(app)/intel-feed/page.tsx` | `fetchFusedEvents()` -> `/_core/api/public/intel/events`; `fetchStoryClusters()` -> `/_core/api/public/intel/clusters` | Flask core API | Live page exists. Both endpoints currently return empty arrays |
| `/learn` | `frontend-next/src/app/(app)/learn/page.tsx` | `fetchLearningModules()` -> `/_core/api/public/learn/modules`; `fetchGuidedJourneys()` -> `/_core/api/public/learn/journeys` | Flask core API | Live page exists. Both endpoints currently return empty arrays |
| `/quests` | `frontend-next/src/app/(app)/quests/page.tsx` | Public load: `fetchQuestTemplates()` -> `/_core/api/public/quests/templates`; authenticated actions: `startQuest()` -> `/_core/api/public/quests/start`; `listMyQuests()` -> `/_core/api/public/quests`; `updateQuestProgress()` -> `/_core/api/public/quests/:id/progress` | Flask core API | Live page exists. Templates endpoint currently returns an empty array; authenticated mutations depend on core auth |
| `/auth` | `frontend-next/src/app/auth/page.tsx` plus `frontend-next/src/contexts/AuthContext.tsx` | `/auth/login`, `/auth/register`, `/auth/check-login`, `/api/users/me` under `/_core` | Flask core API | Live page exists. This is the active auth authority for the visible public routes |
| `/memberships` | `frontend-next/src/app/(app)/memberships/page.tsx` | `membershipsApi.listPlans()` -> `/_core/api/memberships/plans`; `createCheckout()` -> `/_core/api/memberships/checkout-session`; `status()` -> `/_core/api/memberships/status` | Flask core API for current frontend page; separate impact memberships API also exists but is not what this page imports | Live page exists. `/_core/api/memberships/plans` responds with empty data, so the page likely falls back to hardcoded plan cards. `/_impact/api/memberships/plans` currently returns `BetaDependencyMissing` |
| `/education/resource-library/maps` | `frontend-next/src/app/(app)/education/resource-library/maps/page.tsx` | `educationMapsApi.listMaps()` -> `/_impact/v1/education/maps`; `resolveMap()` -> `/_impact/v1/education/maps/resolve`, with `X-Tenant-Id` header | Intended owner is Falak Fastify app inside impact service | Not live. Frontend route returns 404 on the production site, and `/_impact/v1/education/maps` returns Express 404 `Cannot GET /v1/education/maps` |

## Service ownership details

### Frontend proxy layer

- `frontend-next/next.config.ts` rewrites `/_core/:path*` and `/_impact/:path*`.
- `frontend-next/src/lib/runtime.ts` resolves those prefixes at runtime through `getCoreApiBase()`, `getImpactApiBase()`, and `getMemeticsApiBase()`.

### Flask core API

- Health: `flora-fauna/backend/app/health.py`
- Auth: `flora-fauna/backend/app/auth.py`
- Current profile: `flora-fauna/backend/app/routes.py`
- Cultural intelligence public routes: `flora-fauna/backend/app/api/cultural_public.py`
- Community news: `flora-fauna/backend/app/api/public.py`
- Memberships used by the current frontend memberships page: `flora-fauna/backend/app/api/memberships.py`

Live checks:

- `/_core/health` returned `{"database_mode":"configured","db":true,"status":"degraded","stripe_mode":"placeholder",...}`
- `/_core/public/community-news?limit=1` returned populated BBC/Guardian-backed news data
- `/_core/api/public/intel/events?limit=1`, `/_core/api/public/intel/clusters?limit=1`, `/_core/api/public/learn/modules`, `/_core/api/public/learn/journeys`, and `/_core/api/public/quests/templates` all returned empty arrays

### Impact service

- Legacy Express entry: `services/impact-service/src/bootstrapApp.ts`
- Live Manara placeholder routes: `services/impact-service/src/routes/floraFaunaPlaceholder.ts`
- Data-backed legacy Manara routes: `services/impact-service/src/routes/floraFauna.ts`
- Legacy memberships routes: `services/impact-service/src/routes/memberships.ts`
- Intended Falak app: `services/impact-service/src/falak/app.ts`
- Intended Falak education maps routes: `services/impact-service/src/maps/routes/registerMapRoutes.ts`

Live checks:

- `/_impact/health` returned `{"status":"degraded","service":"impact-service","betaPlaceholderInfra":true,"dependencies":{"database":"todo","stripe":"todo"}}`
- `/_impact/api/manara/feed` returned placeholder feed data and `placeholder: true`
- `/_impact/api/memberships/plans` returned `BetaDependencyMissing`
- `/_impact/v1/education/maps` returned Express 404, which means the Falak `/v1/*` surface is not currently active on the live production host

## Cross-service dependencies that matter

1. Frontend auth and the public quest mutations depend on Flask-issued JWTs from the core API.
2. The impact service still verifies bearer tokens with `JWT_SECRET_KEY` in `services/impact-service/src/middleware/auth.ts` and `services/impact-service/src/falak/auth/actorIdentity.ts`, while the Flask core can mint public tokens with `PUBLIC_JWT_SECRET_KEY` in `flora-fauna/backend/app/auth.py`. These values must remain aligned if impact/Falak routes are expected to trust frontend login tokens.
3. The local repo already contains a Falak-based education maps stack, but the live production site on March 15, 2026 is still routing `/_impact` to the legacy Express app only.

## Bottom line

- The live public stack is currently: Next.js frontend + Flask core API + placeholder-mode Express impact service.
- The cultural intelligence routes are deployed, but most of the public data domains they support are still empty in production.
- The Manara feed is live, but it is still running from placeholder impact data rather than the newer Falak or fully configured Prisma-backed path.
- The education maps / Falak surface exists in local code, not in live production.
