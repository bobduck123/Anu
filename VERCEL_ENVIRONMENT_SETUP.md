# Vercel Environment Setup

Last updated: 2026-04-29

## Backend Project: `flora-fauna/backend`

Use `flora-fauna/backend/vercel.env.example` as the source list.

Required production values:

```text
VERCEL=1
FLASK_ENV=production
DEBUG=false
FORCE_HTTPS=true
AUTO_CREATE_ALL=false
SECRET_KEY=<32-plus-char-secret>
JWT_SECRET_KEY=<32-plus-char-secret>
PUBLIC_JWT_SECRET_KEY=<32-plus-char-secret>
CONTROL_JWT_SECRET_KEY=<32-plus-char-secret>
CONTROL_PLANE_SHARED_SECRET=<16-plus-char-secret>
DATABASE_URL=<postgres-url>
CORS_ORIGINS=https://maanara.vercel.app,https://mudyin.vercel.app,https://mudyin-live.vercel.app,https://www.mudyin.com
FRONTEND_BASE_URL=https://maanara.vercel.app
CONTROL_PLANE_HOSTS=anu-back-end.vercel.app
PUBLIC_PLATFORM_HOSTS=maanara.vercel.app,anu-back-end.vercel.app
CONTROL_REQUIRE_TOKEN_USE_CLAIM=true
CONTROL_REQUIRE_TOKEN_GRANT=true
```

Beta placeholder mode:

```text
BETA_ALLOW_PLACEHOLDER_INFRA=true
```

Use only for non-launch limited mode. Production launch should use real `DATABASE_URL` and Stripe secrets.

## Frontend Project: `frontend-next`

Use `frontend-next/vercel.env.example` as the source list.

Required values:

```text
CORE_API_ORIGIN=https://anu-back-end.vercel.app
IMPACT_API_ORIGIN=https://anu-impact-service.vercel.app
MEMETICS_API_ORIGIN=https://anu-impact-service.vercel.app
WHITE_LABEL_DEPLOYMENT_HOSTS=mudyin-live.vercel.app
NEXT_PUBLIC_WHITE_LABEL_DEPLOYMENT_HOSTS=mudyin-live.vercel.app
CONTROL_PLANE_HOSTS=control.anu.eco,localhost,127.0.0.1
CONTROL_PLANE_SHARED_SECRET=<same value as backend>
NEXT_PUBLIC_SITE_URL=https://maanara.vercel.app
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<public-anon-key>
NEXT_PUBLIC_DEFAULT_NODE=au-nsw-sydney
NEXT_PUBLIC_FALAK_TENANT_ID=<falak-tenant-id>
```

Do not set `CONTROL_PLANE_SHARED_SECRET` as `NEXT_PUBLIC_*`.

## Impact/Falak Project

Minimum expected hosted routes:

```text
/v1/health
/v1/falak/health
/v1/falak/readiness
```

Expected frontend env:

```text
IMPACT_API_ORIGIN=https://anu-impact-service.vercel.app
```

## Validation Commands

Backend:

```powershell
curl.exe -i https://anu-back-end.vercel.app/healthz
curl.exe -i https://anu-back-end.vercel.app/readiness
```

Frontend:

```powershell
curl.exe -i https://mudyin-live.vercel.app/
curl.exe -i https://maanara.vercel.app/
```

Impact:

```powershell
curl.exe -i https://anu-impact-service.vercel.app/v1/health
curl.exe -i https://anu-impact-service.vercel.app/v1/falak/readiness
```

## Failure Hints

- 500 on backend startup: check strict env validation, `DATABASE_URL`, `CONTROL_PLANE_HOSTS`, `CONTROL_PLANE_SHARED_SECRET`, `CORS_ORIGINS`.
- 404 on custom domain resolution: create active `NodeDomain` binding.
- Frontend shows default platform shell on `mudyin-live.vercel.app`: set `WHITE_LABEL_DEPLOYMENT_HOSTS` and redeploy frontend.
- Control proxy returns `control_shared_secret_missing`: set frontend `CONTROL_PLANE_SHARED_SECRET`.
