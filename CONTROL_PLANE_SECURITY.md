# Control Plane Security

Last updated: 2026-04-29

## Control Boundary

Control/admin/governance APIs must not be exposed as casual public routes.

Backend control APIs live under:

```text
/api/control/*
```

Frontend proxy path:

```text
/api/control/<target>/<upstream-path>
```

Examples:

```text
/api/control/core/control/sites/1/manifest-authoring
/api/control/core/control/sites/1/publish-readiness
/api/control/core/control/sites/1/operator-assignments
/api/control/core/control/sites/1/domain-bindings
/api/control/core/control/sites/bootstrap
```

Direct backend routes:

```text
/api/control/sites/1/manifest-authoring
/api/control/sites/1/publish-readiness
/api/control/sites/1/operator-assignments
/api/control/sites/1/domain-bindings
/api/control/sites/bootstrap
```

## Required Backend Checks

The backend decorator `control_plane_required` enforces:

- Valid JWT.
- `aud=control`.
- `token_use=control`.
- MFA claim when required.
- Allowed control role.
- Active token grant when configured.
- Required scopes.
- Request host is in `CONTROL_PLANE_HOSTS`.
- Header `X-Control-Plane-Secret` matches `CONTROL_PLANE_SHARED_SECRET` outside development/testing.

## Required Frontend Proxy Checks

The frontend control proxy enforces:

- Request host is in `CONTROL_PLANE_HOSTS`.
- Supabase session exists.
- User metadata role is control-eligible.
- Upstream route is allowlisted.
- Server mints a privileged backend control JWT.
- Server forwards `X-Control-Plane-Secret` from `CONTROL_PLANE_SHARED_SECRET`.

## Environment Variables

Backend:

```text
CONTROL_PLANE_HOSTS=anu-back-end.vercel.app
CONTROL_PLANE_SHARED_SECRET=<16-plus-char-secret>
CONTROL_JWT_SECRET_KEY=<32-plus-char-secret>
CONTROL_PLANE_ALLOWED_ROLES=admin,institution,publisher,platform_admin,node_admin,board_member,treasury_guardian
CONTROL_REQUIRE_TOKEN_USE_CLAIM=true
CONTROL_REQUIRE_TOKEN_GRANT=true
```

Frontend:

```text
CONTROL_PLANE_HOSTS=control.anu.eco,localhost,127.0.0.1
CONTROL_PLANE_SHARED_SECRET=<same value as backend>
CORE_API_ORIGIN=https://anu-back-end.vercel.app
```

Legacy alias:

```text
CONTROL_PLANE_SECRET_HEADER=<same value>
```

Prefer `CONTROL_PLANE_SHARED_SECRET`. The alias exists only for older operator scripts.

Smoke-only:

```text
CONTROL_SMOKE_AUTH_HEADER=Bearer <control JWT>
```

## Expected Responses

| Case | Expected |
|---|---|
| Missing JWT | 401 or 403 |
| Wrong role | 403 |
| Missing control secret in production backend route | 403 |
| Wrong control secret | 403 |
| Wrong host | 403 |
| Valid read route with JWT and secret | 200 |
| Bootstrap validation-only probe without body | 400 or 422 |

## Manual Probes

Unauthenticated direct backend control route should reject:

```powershell
curl.exe -i "https://anu-back-end.vercel.app/api/control/sites/1/publish-readiness"
```

Authenticated direct backend read route:

```powershell
$env:CONTROL_SMOKE_AUTH_HEADER="Bearer <control JWT>"
$env:CONTROL_PLANE_SHARED_SECRET="<shared secret>"
curl.exe -i `
  -H "Authorization: $env:CONTROL_SMOKE_AUTH_HEADER" `
  -H "X-Control-Plane-Secret: $env:CONTROL_PLANE_SHARED_SECRET" `
  "https://anu-back-end.vercel.app/api/control/sites/1/publish-readiness"
```

## Review Notes

- Never place `CONTROL_PLANE_SHARED_SECRET` in `NEXT_PUBLIC_*`.
- Do not add public hosts such as `www.mudyin.com` to frontend `CONTROL_PLANE_HOSTS`.
- Keep control routes off public nav and tenant manifests.
- Rotate the shared secret after suspected disclosure.
- Keep `CONTROL_REQUIRE_TOKEN_GRANT=true` in production.

