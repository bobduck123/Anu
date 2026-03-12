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

Required env:

- `CORE_API_ORIGIN=https://<core-api-project>.vercel.app`
- `IMPACT_API_ORIGIN=https://<impact-api-project>.vercel.app`
- `NEXT_PUBLIC_SITE_URL=https://<frontend-project>.vercel.app`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...`

### Core API

- Project root: `flora-fauna/backend`
- Uses [vercel.json](C:/Dev/Flora_fauna/flora-fauna/backend/vercel.json)

Required env:

- `VERCEL=1`
- `FLASK_ENV=production`
- `SECRET_KEY=...`
- `JWT_SECRET_KEY=...`
- `PUBLIC_JWT_SECRET_KEY=...`
- `CONTROL_JWT_SECRET_KEY=...`
- `DATABASE_URL=postgresql://...`
- `CORS_ORIGINS=https://<frontend-project>.vercel.app`
- `CONTROL_PLANE_HOSTS=<core-api-project>.vercel.app`
- `CONTROL_PLANE_SHARED_SECRET=...`
- `FRONTEND_BASE_URL=https://<frontend-project>.vercel.app`
- Stripe keys

### Impact API

- Project root: `services/impact-service`
- Uses [vercel.json](C:/Dev/Flora_fauna/services/impact-service/vercel.json)

Required env:

- `DATABASE_URL=postgresql://...`
- `JWT_SECRET_KEY=...`
- Stripe keys
- `CORS_ORIGINS=https://<frontend-project>.vercel.app`
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
