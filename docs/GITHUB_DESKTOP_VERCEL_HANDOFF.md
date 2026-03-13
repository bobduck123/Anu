# GitHub Desktop + Vercel Handoff

This workspace is set up to publish as one Git repository and deploy as three Vercel projects.

## 1. Open in GitHub Desktop

Use `File -> Add local repository...` and choose:

- `C:\Dev\Flora_fauna`

If GitHub Desktop asks to create a repository, that means Git was not initialized yet. This handoff assumes the repo has already been initialized locally.

## 2. Publish to GitHub

Publish the repository from GitHub Desktop with:

- Default branch: `main`
- Private repo: recommended until production secrets are configured

Do not publish local runtime artifacts:

- `node_modules`
- `.next`
- `dist`
- local databases
- `flora-fauna/venv`
- `.env*`

The root `.gitignore` already covers those.

## 3. Create Vercel projects

Create three Vercel projects from the same GitHub repository.

### Frontend

- Project root: `frontend-next`
- Framework preset: `Next.js`
- Copy vars from [frontend-next/vercel.env.example](C:/Dev/Flora_fauna/frontend-next/vercel.env.example)

Required env:

- `CORE_API_ORIGIN=https://anu-back-end.vercel.app`
- `IMPACT_API_ORIGIN=https://anu-impact-service.vercel.app`
- `NEXT_PUBLIC_SITE_URL=https://maanara.vercel.app`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=TODO_SET_WHEN_STRIPE_EXISTS`
- `NEXT_PUBLIC_ENABLE_MOCK_FALLBACK=true`

### Core API

- Project root: `flora-fauna/backend`
- Uses [vercel.json](C:/Dev/Flora_fauna/flora-fauna/backend/vercel.json)
- Copy vars from [flora-fauna/backend/vercel.env.example](C:/Dev/Flora_fauna/flora-fauna/backend/vercel.env.example)

Required env:

- `VERCEL=1`
- `FLASK_ENV=production`
- `BETA_ALLOW_PLACEHOLDER_INFRA=true` while DB/Stripe are still TODOs
- `SECRET_KEY=...`
- `JWT_SECRET_KEY=...`
- `PUBLIC_JWT_SECRET_KEY=...`
- `CONTROL_JWT_SECRET_KEY=...`
- `DATABASE_URL=TODO_REQUIRED_POSTGRES_DATABASE_URL`
- `CORS_ORIGINS=https://maanara.vercel.app,https://anu-front-end.vercel.app`
- `CONTROL_PLANE_HOSTS=<core-api-project>.vercel.app`
- `CONTROL_PLANE_SHARED_SECRET=...`
- `FRONTEND_BASE_URL=https://maanara.vercel.app`
- Stripe TODO placeholders

### Impact API

- Project root: `services/impact-service`
- Uses [vercel.json](C:/Dev/Flora_fauna/services/impact-service/vercel.json)
- Copy vars from [services/impact-service/vercel.env.example](C:/Dev/Flora_fauna/services/impact-service/vercel.env.example)

Required env:

- `BETA_ALLOW_PLACEHOLDER_INFRA=true` while DB/Stripe are still TODOs
- `DATABASE_URL=TODO_REQUIRED_POSTGRES_DATABASE_URL`
- `JWT_SECRET_KEY=...`
- Stripe TODO placeholders
- `CORS_ORIGINS=https://maanara.vercel.app,https://anu-front-end.vercel.app`
- `CORS_ALLOWED_ORIGIN_SUFFIXES=.vercel.app`
- `DISABLE_SCHEDULED_JOBS=true`

## 4. Production checks

After the first deploy, verify:

1. Frontend home page loads.
2. `https://<frontend-project>.vercel.app/manara` loads.
3. `https://<frontend-project>.vercel.app/_core/health` works.
4. `https://<frontend-project>.vercel.app/_impact/health` works.
5. Dumb Dumb and organizer flows work with production auth/secrets.

## 5. Known launch constraint

Uploads and generated files are serverless-temp safe, but not durable. If you need persistent media or exports, add object storage before public launch.
