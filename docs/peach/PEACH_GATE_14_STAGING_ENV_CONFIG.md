# PEACH Gate 14 Staging Environment Config

Date: 2026-07-31

## Required hosted staging variables

| Variable | Purpose | Available | Where set | Verification |
| --- | --- | --- | --- | --- |
| `PEACH_STAGING_FRONTEND_URL` or `NEXT_PUBLIC_SITE_URL` | Hosted private frontend URL | Missing for PEACH staging | Frontend hosting env | `curl -I <url>/peach` |
| `PEACH_STAGING_BACKEND_URL` or `CORE_API_ORIGIN` | Hosted backend origin for frontend proxy | Missing for PEACH staging | Frontend server env | control proxy reaches backend |
| `DATABASE_URL` | Hosted PostgreSQL connection for backend migrations/runtime | Missing for PEACH staging | Backend hosting env and migration runner | migration/table check |
| `CONTROL_PLANE_HOSTS` | Allowed control hosts | Generic examples present, PEACH staging missing | Backend and frontend server env | `/control/peach` and backend control host checks |
| `CONTROL_PLANE_SHARED_SECRET` | Server-side shared secret for control proxy/backend | Generic examples present, PEACH staging missing | Backend and frontend server env only | unauth 401, auth smoke 200 |
| `CONTROL_PLANE_ALLOWED_ROLES` | Steward/admin role allowlist | Generic examples present | Backend env | steward token accepted |
| `CONTROL_PLANE_JWT_AUDIENCE` | Control-token audience | Generic examples present | Backend env | token audience validation |
| `CONTROL_SMOKE_AUTH_HEADER` | Operator smoke token/header | Missing for PEACH staging | Operator environment, not public frontend | hosted control smoke |
| `CORS_ORIGINS` | Frontend origins allowed by backend | Generic examples present, PEACH staging missing | Backend env | frontend mutation smoke |
| `FRONTEND_BASE_URL` | Backend canonical frontend origin | Generic examples present, PEACH staging missing | Backend env | response/origin checks |
| `PEACH_STAGING_NOINDEX` or platform equivalent | Private/noindex staging posture | Missing as PEACH-specific flag | Frontend/backend/platform | robots/meta/header proof |

## Deployment platform variables

Generic Vercel files exist:

- `frontend-next/vercel.env.production.local`
- `frontend-next/vercel.env.example`
- `flora-fauna/backend/vercel.env.production.local`
- `flora-fauna/backend/vercel.env.example`

These are not a confirmed PEACH staging environment.

## Database provider settings

The repo contains generic Supabase/Postgres examples and production-like env files. No confirmed PEACH staging Supabase/Neon/Vercel Postgres database target was available.

Required provider detail for Gate 15:

- database host;
- database name;
- pooler/non-pooler URL choice;
- migration execution path;
- reset/rollback policy;
- secret storage location.

## Migration command

Hosted command to run once credentials are available:

`python <operator-script> --database-url <redacted-hosted-staging-url> --apply flora-fauna/backend/migrations/versions/20260730_peach_gate9_contribution_consent.sql flora-fauna/backend/migrations/versions/20260731_peach_gate10_consent_ops_support_intents.sql`

The actual command should use an operator-approved migration script, not paste secrets into shell history.

## Verification steps

1. Confirm hosted frontend URL.
2. Confirm hosted backend URL.
3. Confirm hosted database URL with secrets redacted in evidence.
4. Apply migrations.
5. Query table and constraint existence.
6. Smoke public routes.
7. Smoke protected control route unauthenticated and authenticated.
8. Submit test-only staging records.
9. Confirm no public bodies, payments, youth/sensitive collection, uploads, or public release.
