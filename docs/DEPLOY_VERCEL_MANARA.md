# Manara Vercel Launch

Deploy the app as three Vercel projects with separate root directories:

1. `frontend-next`
2. `flora-fauna/backend`
3. `services/impact-service`

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
- `NEXT_PUBLIC_FALAK_TENANT_ID=<Falak tenant UUID>` when hosted education maps should talk to the live Falak backend

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

Runtime notes:
- Relative writable paths are automatically remapped into `/tmp/manara`.
- Uploads are served from `/media/uploads/*` and are suitable for ephemeral/serverless use.
- If you need durable media, point uploads at external object storage before launch.
- The included `vercel.json` keeps the project on a single Python serverless entrypoint, which is the least-friction path on the free tier.
- With `BETA_ALLOW_PLACEHOLDER_INFRA=true`, the service boots with placeholder DB/Stripe values and reports `degraded` health until those integrations are configured.
- `AUTO_CREATE_ALL=true` is ignored while `DATABASE_URL` is still a placeholder, so it is safe to leave in beta env blocks until the real Postgres URL is pasted.
- If you are using Supabase from Vercel, prefer the Supavisor transaction pooler connection string on port `6543`. The backend now switches to `NullPool` automatically for that connection shape.
- Use `/_core/healthz` for lightweight liveness probes and `/_core/readiness` when you intentionally want a DB-backed readiness check.

## Impact service project

Root directory:
- `services/impact-service`

Entrypoint:
- `api/index.ts`
- `vercel.json` now routes all requests through that Express entrypoint explicitly.

Copy/paste template:
- [services/impact-service/vercel.env.example](C:/Dev/Flora_fauna/services/impact-service/vercel.env.example)

Runtime pin:
- Node.js `24.x` via [services/impact-service/package.json](C:/Dev/Flora_fauna/services/impact-service/package.json)

Required env:
- `BETA_ALLOW_PLACEHOLDER_INFRA=false` once the production Postgres target is attached
- `DATABASE_URL=TODO_REQUIRED_POSTGRES_DATABASE_URL` for the runtime pooler string
- `DIRECT_URL=TODO_REQUIRED_POSTGRES_DIRECT_URL` for Prisma/manual DB operations
- `MANARA_FEED_MODE=placeholder` until the production impact-service DB and feed rollout are explicitly approved
- `JWT_SECRET_KEY=...`
- `STRIPE_SECRET_KEY=TODO_REQUIRED_STRIPE_SECRET_KEY` in beta
- `STRIPE_WEBHOOK_SECRET=TODO_REQUIRED_STRIPE_WEBHOOK_SECRET` in beta
- `STRIPE_PUBLISHABLE_KEY=TODO_REQUIRED_STRIPE_PUBLISHABLE_KEY` in beta
- `REQUIRE_STRIPE_INFRA=false` unless Stripe-backed impact flows are being launched
- `CORS_ORIGINS=https://maanara.vercel.app,https://anu-front-end.vercel.app`
- `CORS_ALLOWED_ORIGIN_SUFFIXES=.vercel.app`
- `DISABLE_SCHEDULED_JOBS=true`
- `FALAK_ROUTE_GUARD_MODE=disabled` during dark launch
- `FALAK_MAP_ROUTE_GUARD_MODE=disabled` during dark launch

Routes:
- Legacy API remains at `/api/flora-fauna/*`
- New public alias is `/api/manara/*`
- `MANARA_FEED_MODE=placeholder` keeps `/api/manara/feed` on the placeholder preview path without relying on the production impact-service database
- `MANARA_FEED_MODE=live` re-enables the Prisma-backed `/api/manara/feed` path and should only be used after explicit production DB readiness review
- Project root `/` now returns a small JSON status payload for direct Vercel URL checks.
- With `BETA_ALLOW_PLACEHOLDER_INFRA=true`, DB-backed and billing-backed routes return `503 BetaDependencyMissing` until real infrastructure is configured.
- For Falak production dark launch, point `DATABASE_URL` and `DIRECT_URL` at the same Postgres target as the core API only after confirming PostGIS can be enabled and Prisma migration history is understood for that database.

## Free tier notes

- Keep uploads and generated artifacts off local disk if they must persist between invocations; Vercel storage is ephemeral.
- Use a shared Postgres database for both APIs.
- Keep cron/background work disabled inside serverless functions; the impact service now respects `DISABLE_SCHEDULED_JOBS=true`.
- Frontend requests should go through `/_core/*` and `/_impact/*` rewrites so browser bundles do not ship private internal origins.

## Verification

After deployment, verify:

1. Frontend home page loads.
2. `/manara` loads from the frontend project.
3. `/_core/healthz` rewrites to the Flask backend for liveness.
4. `/_core/readiness` reflects DB-backed readiness.
5. `/_impact/v1/falak/readiness` reflects Falak DB readiness before any guard changes.
6. Authenticated organizer flows can open `/dumb-dumb/manage`.
