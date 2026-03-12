# Manara Vercel Launch

Deploy the app as three Vercel projects with separate root directories:

1. `frontend-next`
2. `flora-fauna/backend`
3. `services/impact-service`

## Frontend project

Root directory:
- `frontend-next`

Required env:
- `CORE_API_ORIGIN=https://<your-backend-project>.vercel.app`
- `IMPACT_API_ORIGIN=https://<your-impact-project>.vercel.app`
- `NEXT_PUBLIC_SITE_URL=https://<your-frontend-project>.vercel.app`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...`

Notes:
- The frontend now proxies backend traffic through `/_core/*` and `/_impact/*`.
- Leave `NEXT_PUBLIC_API_BASE` and `NEXT_PUBLIC_IMPACT_API_BASE` unset on Vercel unless you explicitly want public absolute API URLs in the client bundle.

## Flask backend project

Root directory:
- `flora-fauna/backend`

Entrypoint:
- `app.py`
- `vercel.json` now routes all requests to that Flask entrypoint explicitly.

Required env:
- `VERCEL=1`
- `FLASK_ENV=production`
- `SECRET_KEY=...`
- `JWT_SECRET_KEY=...`
- `PUBLIC_JWT_SECRET_KEY=...`
- `CONTROL_JWT_SECRET_KEY=...`
- `DATABASE_URL=postgresql://...`
- `CORS_ORIGINS=https://<your-frontend-project>.vercel.app`
- `CONTROL_PLANE_HOSTS=<your-backend-project>.vercel.app`
- `CONTROL_PLANE_SHARED_SECRET=...`
- `STRIPE_SECRET_KEY=...`
- `STRIPE_WEBHOOK_SECRET=...`
- `STRIPE_PUBLISHABLE_KEY=...`
- `FRONTEND_BASE_URL=https://<your-frontend-project>.vercel.app`

Runtime notes:
- Relative writable paths are automatically remapped into `/tmp/manara`.
- Uploads are served from `/media/uploads/*` and are suitable for ephemeral/serverless use.
- If you need durable media, point uploads at external object storage before launch.
- The included `vercel.json` keeps the project on a single Python serverless entrypoint, which is the least-friction path on the free tier.

## Impact service project

Root directory:
- `services/impact-service`

Entrypoint:
- `app.ts`
- `vercel.json` now routes all requests through that Express entrypoint explicitly.

Required env:
- `DATABASE_URL=postgresql://...`
- `JWT_SECRET_KEY=...`
- `STRIPE_SECRET_KEY=...`
- `STRIPE_WEBHOOK_SECRET=...`
- `STRIPE_PUBLISHABLE_KEY=...`
- `CORS_ORIGINS=https://<your-frontend-project>.vercel.app`
- `CORS_ALLOWED_ORIGIN_SUFFIXES=.vercel.app`
- `DISABLE_SCHEDULED_JOBS=true`

Routes:
- Legacy API remains at `/api/flora-fauna/*`
- New public alias is `/api/manara/*`

## Free tier notes

- Keep uploads and generated artifacts off local disk if they must persist between invocations; Vercel storage is ephemeral.
- Use a shared Postgres database for both APIs.
- Keep cron/background work disabled inside serverless functions; the impact service now respects `DISABLE_SCHEDULED_JOBS=true`.
- Frontend requests should go through `/_core/*` and `/_impact/*` rewrites so browser bundles do not ship private internal origins.

## Verification

After deployment, verify:

1. Frontend home page loads.
2. `/manara` loads from the frontend project.
3. `/_core/health` rewrites to the Flask backend.
4. `/_impact/health` rewrites to the impact service.
5. Authenticated organizer flows can open `/dumb-dumb/manage`.
