# Presence v1.1 Deployment Runbook

Scope: launch hardening and public beta proof for backend plus `presence-app`.
Do not deploy v1.2 feature work as part of this run.

## 1. Commit And Push Checklist

- Confirm working tree only contains intended Presence v1.1 files.
- Run backend tests, presence-app typecheck/build, frontend-next Presence tests/build, and smoke script compile.
- Confirm no backend secrets, Supabase service-role keys, control-plane secrets, database URLs, or smoke tokens are committed.
- Suggested commit:

```bash
git add docs/presence/PRESENCE_V1_1_DEPLOYMENT_RUNBOOK.md docs/presence/screenshots/beta-to-launch-v1-pass docs/presence/screenshots/v1-1-gallery-draft-template-pass scripts/presence_v1_1_smoke.py scripts/presence_nodes_smoke.py flora-fauna/backend/app/api/presence.py flora-fauna/backend/app/api/presence_owner.py flora-fauna/backend/app/models.py flora-fauna/backend/app/services/presence_service.py flora-fauna/backend/tests/test_presence_nodes.py flora-fauna/backend/migrations/versions/20260508_presence_beta_application.sql presence-app
git commit -m "Harden Presence v1.1 public beta launch"
git push origin feature/presence-ecosystem-alpha
```

## 2. Backend Deploy First

Deploy the Flask backend before `presence-app` so the new public list and owner
draft endpoints exist before the UI calls them.

Required endpoint availability after backend deploy:

- `GET /healthz`
- `GET /api/presence/public/nodes`
- `POST /api/presence/owner/beta/start`
- `POST /api/presence/beta/applications`

## 3. Apply Migration

Apply:

- `flora-fauna/backend/migrations/versions/20260508_presence_beta_application.sql`

No additional migration is required by this hardening pass.

Migration caution: this creates `presence_beta_application` only. It should not
modify `presence_node`, publish drafts, create owners, or expose public data.

## 4. Backend Smoke

No-token checks:

```bash
set PRESENCE_API_BASE_URL=https://<backend-host>
python scripts/presence_v1_1_smoke.py
```

Optional owner draft checks:

```bash
set PRESENCE_API_BASE_URL=https://<backend-host>
set PRESENCE_APP_BASE_URL=https://<presence-app-host>
set PRESENCE_SMOKE_AUTH_TOKEN=<supabase-user-access-token>
set PRESENCE_SMOKE_DESIRED_SLUG=presence-v11-smoke-<unique-suffix>
set PRESENCE_SMOKE_EMAIL=<operator-email>
set PRESENCE_SMOKE_CLEANUP=false
python scripts/presence_v1_1_smoke.py
```

The smoke does not log tokens and does not delete production data.

## 5. Deploy `presence-app`

Deploy after backend and migration are live.

Vercel settings:

- Root Directory: `presence-app`
- Build Command: `npm run build`
- Install Command: `npm ci`
- Output Directory: blank/default
- Production Branch: `feature/presence-ecosystem-alpha`, unless changed

Required Vercel env vars:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_PRESENCE_API_BASE_URL`
- `NEXT_PUBLIC_PRESENCE_PUBLIC_ORIGIN`
- `NEXT_PUBLIC_PRESENCE_STUDIO_ORIGIN`
- `NEXT_PUBLIC_PRESENCE_ALLOW_SIGNUPS=true`

Optional supported aliases:

- `NEXT_PUBLIC_API_BASE`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_PRESENCE_STUDIO_CONTACT`

Never set service-role keys, database URLs, backend JWT secrets, control-plane
secrets, or smoke tokens as `NEXT_PUBLIC_*` variables.

## 6. Supabase Dashboard

Authentication settings:

- Site URL: production `presence-app` origin.
- Redirect URLs:
  - `https://<presence-app-host>/auth/callback`
  - `https://<presence-app-host>/auth/reset-password`
  - `https://<presence-app-host>/auth/verify-email`
  - `https://<presence-app-host>/beta/onboarding`
- Confirm email: enabled.
- Confirm signup template:
  - include `{{ .Token }}` for `/auth/verify-email`.
  - keep `{{ .ConfirmationURL }}` as fallback for link-based confirmation.

## 7. Post-Deploy Checks

Presence app:

- `GET /healthz`
- `/`
- `/beta`
- `/plans`
- `/gallery`
- `/auth/sign-up`
- `/auth/verify-email`
- `/auth/sign-in`
- `/beta/onboarding`
- `/studio`

Backend:

- `GET /healthz`
- `GET /api/presence/public/nodes`
- `POST /api/presence/beta/applications` without token returns `401`.
- `POST /api/presence/owner/beta/start` without token returns `401`.

Authenticated beta proof:

- Sign up.
- Verify email.
- Open `/beta/onboarding`.
- Create draft via self-build mode.
- Confirm redirect to `/studio/[id]`.
- Confirm draft status is `draft`, visibility is `private`, and `published_at` is empty.
- Confirm `/api/presence/public/<draft-slug>` returns `404`.
- Confirm `/api/presence/public/nodes` does not include the draft.
- Confirm owner `/api/presence/owner/nodes` includes the draft.
- Confirm QR page says unpublished drafts are not public-ready.
- Publish only after explicit operator/user action; confirm public route becomes available.

## 8. Rollback Notes

Frontend rollback:

- Revert the Vercel deployment for `presence-app`.
- This is safe if the backend remains forward-compatible.

Backend rollback:

- Revert backend deployment if public list, beta application, or owner draft
  endpoints fail.
- Do not roll back by deleting production beta application rows.

Migration rollback caution:

- `presence_beta_application` contains user setup requests. Do not drop it in
  production unless requests have been exported and the operator explicitly
  approves data loss.

## 9. Deploy Order

1. Commit and push Presence v1.1 hardening.
2. Deploy backend.
3. Apply `20260508_presence_beta_application.sql`.
4. Run backend no-token smoke.
5. Run optional token smoke with a real verified beta user token.
6. Deploy `presence-app`.
7. Run post-deploy route checks.
8. Run end-to-end signup, verify, onboarding, draft, Studio, public-hiding proof.
9. Keep rollback handles open until smoke and manual checks pass.
