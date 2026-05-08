# Presence v1.1 Deployment Runbook

Scope: launch hardening and public beta proof for backend plus `presence-app`.
Do not deploy v1.2 feature work as part of this run.

Media upload setup is detailed in
`docs/presence/PRESENCE_MEDIA_UPLOAD_RUNBOOK.md`.

## 1. Commit And Push Checklist

- Confirm working tree only contains intended Presence v1.1 files.
- Run backend tests, presence-app typecheck/build, frontend-next Presence tests/build, and smoke script compile.
- Confirm no backend secrets, Supabase service-role keys, control-plane secrets, database URLs, or smoke tokens are committed.
- Suggested commit:

```bash
git add docs/presence scripts flora-fauna/backend/app flora-fauna/backend/tests/test_presence_nodes.py presence-app
git commit -m "Modernize Presence launch media and public routing"
git push origin feature/presence-ecosystem-alpha
```

## 2. Backend Deploy First

Deploy the Flask backend before `presence-app` so the new public list and owner
draft endpoints exist before the UI calls them.

Required endpoint availability after backend deploy:

- `GET /healthz`
- `GET /p/<slug>` redirects to the Presence frontend origin
- `GET /api/presence/public/nodes`
- `POST /api/presence/owner/beta/start`
- `POST /api/presence/beta/applications`
- `POST /api/presence/owner/nodes/<node_id>/media`

### 2a. Presence as ANU-native module

Presence remains a standalone product frontend, but the backend module is ANU-native:

- `presence-app` uses the ANU backend API at `https://anu-back-end.vercel.app`.
- `presence-app` uses the same ANU Supabase project as the backend validates.
- ANU backend owns `/api/presence/*` routes, Presence tables, and owner security.
- ANU backend must allow `https://presence-gilt.vercel.app` in `CORS_ORIGINS`.
- ANU backend resolves or provisions a local least-privilege `User` from a valid ANU Supabase JWT.
- A first-time Supabase user with no Presence rows must receive `200` with an empty owner list, not `500`.
- `/api/presence/owner/beta/start` must create `draft`, `private`, unpublished nodes only.
- Wrong-host public page requests such as `https://anu-back-end.vercel.app/p/jafar` redirect to `https://presence-gilt.vercel.app/p/jafar`.
- Direct media uploads are authenticated owner routes and never publish drafts.

The owner identity bridge uses the JWT `sub` as the stable key via `User.global_subject_id`.
If no matching local user exists, it provisions a `participant` user with no tenant,
admin, control-plane, treasury, governance, or organiser privileges.

### 2b. CORS allowlist (REQUIRED in production)

The Flask backend uses `CORS_ORIGINS` (comma-separated) for the `/api/*` and
`/auth/*` resources. **In production this env var must be set explicitly** —
the app will refuse to start if it is missing. Local/staging boots fall back
to a curated default that already includes `https://presence-gilt.vercel.app`,
but production must be explicit so misconfigurations are loud.

#### Backend Vercel project — required env var

Project: `anu-back-end`

Set `CORS_ORIGINS` to a comma-separated list. Suggested production value:

```
CORS_ORIGINS=https://presence-gilt.vercel.app,https://mudyin.com,https://www.mudyin.com,https://mudyin-live.vercel.app,https://mudyin.vercel.app,https://maanara.vercel.app,http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001
```

Adjust the list to match the frontends actually deployed against this backend.
Do not add `*` — `supports_credentials` is on, so wildcard is rejected.

After changing the value, **redeploy** the backend on Vercel (env var changes
do not affect a running deployment).

#### Backend auth/JWT env alignment

Presence frontend Supabase settings and backend JWT validation must refer to
the same ANU Supabase project.

Required backend env:

- `CORS_ORIGINS=https://presence-gilt.vercel.app,<existing origins...>`
- `PRESENCE_PUBLIC_ORIGIN=https://presence-gilt.vercel.app`
- `PUBLIC_JWT_SECRET_KEY` and `CONTROL_JWT_SECRET_KEY` remain configured for ANU public/control tokens.
- If the ANU Supabase project signs public JWTs with the legacy HS secret, set `SUPABASE_JWT_SECRET` to that ANU Supabase JWT secret.
- If ANU Supabase tokens are ES256/RS256 with JWKS, no service-role key is needed; backend validates against the token issuer JWKS.
- For production media upload, set `PRESENCE_MEDIA_STORAGE_BACKEND=supabase`, `PRESENCE_MEDIA_BUCKET=presence-media`, `SUPABASE_URL=<ANU Supabase URL>`, and backend-only `SUPABASE_SERVICE_ROLE_KEY`.

Never put Supabase service-role keys in `presence-app` or any `NEXT_PUBLIC_*`
environment variable.

#### Verification commands

After redeploy, from a local terminal (not the browser — preflights bypass cookies):

```
# 1) Preflight from the Presence frontend
curl -i -X OPTIONS \
  -H "Origin: https://presence-gilt.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization,content-type" \
  https://anu-back-end.vercel.app/api/presence/owner/nodes
```

Expected: `HTTP/2 204` (or `200`) and these headers present:

```
access-control-allow-origin: https://presence-gilt.vercel.app
access-control-allow-headers: ...,Authorization,...
access-control-allow-methods: ...,GET,...
```

```
# 2) Actual GET without auth
curl -i \
  -H "Origin: https://presence-gilt.vercel.app" \
  https://anu-back-end.vercel.app/api/presence/owner/nodes
```

Expected: `HTTP/2 401` AND `access-control-allow-origin: https://presence-gilt.vercel.app` is still present. (If ACAO is missing here, the browser will report the 401 as a CORS error instead of an auth error.)

```
# 3) Public list
curl -i \
  -H "Origin: https://presence-gilt.vercel.app" \
  https://anu-back-end.vercel.app/api/presence/public/nodes
```

Expected: `HTTP/2 200`, `access-control-allow-origin: https://presence-gilt.vercel.app`, JSON body with `data.items`.

#### Browser DevTools Network-tab diagnosis cheatsheet

When something fails on `https://presence-gilt.vercel.app`:

| Symptom | Cause | Fix |
|---|---|---|
| CORS error | Backend `CORS_ORIGINS` does not include `https://presence-gilt.vercel.app` | Add the origin to `CORS_ORIGINS`, redeploy backend |
| `401` without token | Normal protected owner route behavior | Sign in and confirm the bearer token is attached |
| `401` with token | Supabase project mismatch, JWT audience/issuer mismatch, or token validation mismatch | Confirm Presence uses the ANU Supabase URL/anon key and backend JWT envs validate the same project |
| `500` with token | Local `User` mapping/provisioning/schema issue | Check Vercel logs and confirm `User.global_subject_id` migration is applied |
| `404` route | Backend branch not deployed or Presence blueprint missing | Redeploy backend branch and check route registration |
| `200` empty list | Correct first-time owner state | Continue to onboarding |
| `201` draft on `beta/start` | Correct onboarding handoff | Open `/studio/[id]`; draft remains private/unpublished |
| `302` from `/p/<slug>` on backend | Correct wrong-host redirect | Browser should land on `https://presence-gilt.vercel.app/p/<slug>` |
| `422` upload validation | Unsupported type or image over 8 MB | Upload JPG, PNG, or WEBP under 8 MB |
| `403` upload | User does not own the Presence node/work/collection | Confirm signed-in account owns that draft |

Note: setting `CORS_ORIGINS` in Vercel is a build-time config — you must
redeploy the backend before changes take effect.

## 3. Apply Migration

Apply:

- `flora-fauna/backend/migrations/versions/20260508_presence_beta_application.sql`
- `flora-fauna/backend/migrations/versions/20260508_presence_owner_identity_user_subject.sql`

Migration caution: these migrations create `presence_beta_application` and
ensure `user.global_subject_id` exists for ANU Supabase subject mapping. They
must not publish drafts, create Presence nodes, create admin owners, or expose
public data.

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

- `NEXT_PUBLIC_SUPABASE_URL=<ANU Supabase URL>`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANU Supabase anon key>`
- `NEXT_PUBLIC_PRESENCE_API_BASE_URL=https://anu-back-end.vercel.app`
- `NEXT_PUBLIC_API_BASE=https://anu-back-end.vercel.app`
- `NEXT_PUBLIC_PRESENCE_PUBLIC_ORIGIN=https://presence-gilt.vercel.app`
- `NEXT_PUBLIC_PRESENCE_STUDIO_ORIGIN=https://presence-gilt.vercel.app`
- `NEXT_PUBLIC_PRESENCE_ALLOW_SIGNUPS=true`
- `NEXT_PUBLIC_PRESENCE_REQUIRE_EMAIL_VERIFICATION=false` for testing, or
  `true` when production email confirmation is configured

Optional supported aliases:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_PRESENCE_STUDIO_CONTACT`

Never set service-role keys, database URLs, backend JWT secrets, control-plane
secrets, or smoke tokens as `NEXT_PUBLIC_*` variables.

## 6. Supabase Dashboard

Testing without email verification:

- Authentication -> Providers -> Email.
- Disable Confirm email.
- Save.
- Redeploy `presence-app` with
  `NEXT_PUBLIC_PRESENCE_REQUIRE_EMAIL_VERIFICATION=false`.
- A successful signup should return a Supabase session and route directly to
  `/onboarding`.

Production email confirmation settings:

- Site URL: production `presence-app` origin, for example
  `https://presence-gilt.vercel.app`.
- Redirect URLs:
  - `https://<presence-app-host>/auth/callback`
  - `https://<presence-app-host>/auth/reset-password`
  - `https://<presence-app-host>/auth/verify-email`
  - `https://<presence-app-host>/onboarding`
  - For the current Presence Vercel host:
    - `https://presence-gilt.vercel.app/auth/callback`
    - `https://presence-gilt.vercel.app/auth/reset-password`
    - `https://presence-gilt.vercel.app/auth/verify-email`
    - `https://presence-gilt.vercel.app/onboarding`
- Confirm email: enabled.
- Presence app env:
  - `NEXT_PUBLIC_PRESENCE_REQUIRE_EMAIL_VERIFICATION=true`
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
- `/onboarding`
- `/beta/onboarding` redirects to `/onboarding`
- `/studio`

Backend:

- `GET /healthz`
- `GET /p/jafar` on the backend host redirects to `https://presence-gilt.vercel.app/p/jafar`.
- `GET /api/presence/public/jafar` remains an API JSON route and is not redirected to the frontend.
- `GET /api/presence/public/nodes`
- `OPTIONS /api/presence/owner/nodes` from `https://presence-gilt.vercel.app` returns `200` or `204`.
- `GET /api/presence/owner/nodes` without token returns `401` or `403`, not `500`.
- `GET /api/presence/owner/nodes` with a valid ANU Supabase user token returns `200` with an empty list or owner nodes.
- `POST /api/presence/beta/applications` without token returns `401`.
- `POST /api/presence/owner/beta/start` without token returns `401`.
- `POST /api/presence/owner/nodes/<node_id>/media` without token returns `401` or `403`, not `500`.

Authenticated beta proof:

- Sign up.
- Confirm the Presence frontend is using the ANU Supabase URL and anon key.
- In test mode, confirm signup opens `/onboarding` without email verification.
- If production verification is enabled, verify email first.
- Open `/onboarding`.
- Create draft via self-build mode.
- Confirm redirect to `/studio/[id]`.
- Confirm draft status is `draft`, visibility is `private`, and `published_at` is empty.
- Confirm `/api/presence/public/<draft-slug>` returns `404`.
- Confirm `/api/presence/public/nodes` does not include the draft.
- Confirm owner `/api/presence/owner/nodes` includes the draft.
- Confirm QR page says unpublished drafts are not public-ready.
- Upload profile, cover, work, and collection images through Studio media slots.
- Confirm uploaded-image draft remains hidden at `/api/presence/public/<draft-slug>`.
- Confirm QR, copy, share, and public preview links use `https://presence-gilt.vercel.app/p/<slug>`, not the backend host.
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
4. Apply `20260508_presence_owner_identity_user_subject.sql`.
5. Run backend no-token smoke.
6. Run optional token smoke with a real ANU Supabase user token.
7. Point `presence-app` Supabase env vars to the ANU Supabase project.
8. Deploy `presence-app`.
9. Run post-deploy route checks.
10. Run end-to-end signup, onboarding, draft, Studio, public-hiding proof.
   Add email verification to this proof only when
   `NEXT_PUBLIC_PRESENCE_REQUIRE_EMAIL_VERIFICATION=true`.
11. Keep rollback handles open until smoke and manual checks pass.
