# Manara Vercel Launch

Deploy the app as three Vercel projects with separate root directories:

1. `frontend-next`
2. `flora-fauna/backend`
3. `services/impact-service`

Project role map:

- `frontend-next`: public site and proxy layer
- `flora-fauna/backend`: core Flask API behind `/_core/*`
- `services/impact-service`: legacy impact routes behind `/_impact/api/*` and Falak routes behind `/_impact/v1/*`

## Frontend project

Root directory:
- `frontend-next`

Copy/paste template:
- [frontend-next/vercel.env.example](C:/Dev/Flora_fauna/frontend-next/vercel.env.example)

Runtime pin:
- Node.js `24.x` via [frontend-next/package.json](C:/Dev/Flora_fauna/frontend-next/package.json)

Required env:
- `CORE_API_ORIGIN=https://anu-back-end.vercel.app`
- `IMPACT_API_ORIGIN=https://anu-impact-service.vercel.app`
- `NEXT_PUBLIC_SITE_URL=https://maanara.vercel.app`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...`

Notes:
- The frontend now proxies backend traffic through `/_core/*` and `/_impact/*`.
- Leave `NEXT_PUBLIC_API_BASE` and `NEXT_PUBLIC_IMPACT_API_BASE` unset on Vercel unless you explicitly want public absolute API URLs in the client bundle.

## Flask backend project

Root directory:
- `flora-fauna/backend`

Entrypoint:
- `vercel_app.py`
- `vercel.json` now routes all requests to that Flask entrypoint explicitly.

Copy/paste template:
- [flora-fauna/backend/vercel.env.example](C:/Dev/Flora_fauna/flora-fauna/backend/vercel.env.example)

Runtime pin:
- Python `3.12` via [flora-fauna/backend/.python-version](C:/Dev/Flora_fauna/flora-fauna/backend/.python-version)

Required env:
- `VERCEL=1`
- `FLASK_ENV=production`
- `BETA_ALLOW_PLACEHOLDER_INFRA=true` for beta boot without real DB/Stripe
- `AUTO_CREATE_ALL=true` once when attaching a fresh Postgres database, then optional `false` after schema bootstrap
- `SECRET_KEY=...`
- `JWT_SECRET_KEY=...`
- `PUBLIC_JWT_SECRET_KEY=...`
- `CONTROL_JWT_SECRET_KEY=...`
- `DATABASE_URL=TODO_REQUIRED_POSTGRES_DATABASE_URL` in beta, then replace with Postgres before launch
- `CORS_ORIGINS=https://maanara.vercel.app,https://anu-front-end.vercel.app`
- `CONTROL_PLANE_HOSTS=<your-backend-project>.vercel.app`
- `CONTROL_PLANE_SHARED_SECRET=...`
- `STRIPE_SECRET_KEY=TODO_REQUIRED_STRIPE_SECRET_KEY` in beta
- `STRIPE_WEBHOOK_SECRET=TODO_REQUIRED_STRIPE_WEBHOOK_SECRET` in beta
- `STRIPE_PUBLISHABLE_KEY=TODO_REQUIRED_STRIPE_PUBLISHABLE_KEY` in beta
- `FRONTEND_BASE_URL=https://maanara.vercel.app`

Auth contract:
- Core login is the active public token issuer.
- If public login tokens are minted with `PUBLIC_JWT_SECRET_KEY`, then the impact service `JWT_SECRET_KEY` must validate that same token family, or the impact service must be updated to support dual verification explicitly.

Runtime notes:
- Relative writable paths are automatically remapped into `/tmp/manara`.
- Uploads are served from `/media/uploads/*` and are suitable for ephemeral/serverless use.
- If you need durable media, point uploads at external object storage before launch.
- The included `vercel.json` keeps the project on a single Python serverless entrypoint, which is the least-friction path on the free tier.
- With `BETA_ALLOW_PLACEHOLDER_INFRA=true`, the service boots with placeholder DB/Stripe values and reports `degraded` health until those integrations are configured.
- `AUTO_CREATE_ALL=true` is ignored while `DATABASE_URL` is still a placeholder, so it is safe to leave in beta env blocks until the real Postgres URL is pasted.
- If you are using Supabase from Vercel, prefer the Supavisor transaction pooler connection string on port `6543`. The backend now switches to `NullPool` automatically for that connection shape.

## Impact service project

Root directory:
- `services/impact-service`

Entrypoint:
- `api/index.ts` for the legacy impact and Manara route family
- `api/falak.ts` for Falak and education maps
- [services/impact-service/vercel.json](C:/Dev/Flora_fauna/services/impact-service/vercel.json) splits those route families explicitly

Copy/paste template:
- [services/impact-service/vercel.env.example](C:/Dev/Flora_fauna/services/impact-service/vercel.env.example)

Runtime pin:
- Node.js `24.x` via [services/impact-service/package.json](C:/Dev/Flora_fauna/services/impact-service/package.json)

Required env:
- `BETA_ALLOW_PLACEHOLDER_INFRA=true` for beta boot without real DB/Stripe
- `DATABASE_URL=TODO_REQUIRED_POSTGRES_DATABASE_URL` in beta, then replace with Postgres before launch
- `JWT_SECRET_KEY=...`
- `STRIPE_SECRET_KEY=TODO_REQUIRED_STRIPE_SECRET_KEY` in beta
- `STRIPE_WEBHOOK_SECRET=TODO_REQUIRED_STRIPE_WEBHOOK_SECRET` in beta
- `STRIPE_PUBLISHABLE_KEY=TODO_REQUIRED_STRIPE_PUBLISHABLE_KEY` in beta
- `CORS_ORIGINS=https://maanara.vercel.app,https://anu-front-end.vercel.app`
- `CORS_ALLOWED_ORIGIN_SUFFIXES=.vercel.app`
- `DISABLE_SCHEDULED_JOBS=true`

Routes:
- Legacy API remains at `/api/flora-fauna/*`
- New public alias is `/api/manara/*`
- Falak health and data routes live under `/v1/falak/*`
- Education maps live under `/v1/education/maps*`
- Project root `/` now returns a small JSON status payload for direct Vercel URL checks.
- With `BETA_ALLOW_PLACEHOLDER_INFRA=true`, DB-backed and billing-backed routes return `503 BetaDependencyMissing` until real infrastructure is configured.

Auth contract:
- `JWT_SECRET_KEY` must be compatible with the core-issued frontend auth token family until auth ownership changes.

## Free tier notes

- Keep uploads and generated artifacts off local disk if they must persist between invocations; Vercel storage is ephemeral.
- Use a shared Postgres database for both APIs.
- Keep cron/background work disabled inside serverless functions; the impact service now respects `DISABLE_SCHEDULED_JOBS=true`.
- Frontend requests should go through `/_core/*` and `/_impact/*` rewrites so browser bundles do not ship private internal origins.

## Verification Env Contract

These values are for operator and CI verification, not for browser runtime:

- `STAGING_BASE_URL`: direct hosted staging impact-service URL
- `PRODUCTION_BASE_URL`: public frontend URL used for proxy checks, currently `https://maanara.vercel.app`
- `STAGING_FRONTEND_BASE_URL`: optional staging frontend URL if proxy checks should also run against a staging frontend deploy
- `STAGING_PROXY_MAP_ROUTE_MODE`: optional override for the staging frontend maps route contract, defaults to `falak`
- `STAGING_MANARA_FEED_MODE`: optional override for the staging frontend Manara feed contract
- `STAGING_FALAK_TENANT_ID`: optional tenant header used for staging frontend Falak proxy checks
- `PRODUCTION_PROXY_MAP_ROUTE_MODE=legacy` until Falak is promoted through the frontend proxy, then change to `falak`
- `PRODUCTION_MANARA_FEED_MODE=placeholder` until `/manara` is data-backed, then change to `real`
- `PRODUCTION_FALAK_TENANT_ID`: optional tenant header value used once production proxy checks need to exercise a live Falak maps route through `/_impact/v1/*`

## Verification

After deployment, verify:

1. Frontend home page loads.
2. `/manara` loads from the frontend project.
3. `/_core/health` rewrites to the Flask backend.
4. `/_impact/health` rewrites to the impact service.
5. `/_impact/api/manara/feed` returns JSON from the impact service.
6. `/_impact/v1/education/maps` matches the declared route mode for the current rollout stage.
7. Authenticated organizer flows can open `/dumb-dumb/manage`.
