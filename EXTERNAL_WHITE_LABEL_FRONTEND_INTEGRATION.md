# External White-Label Frontend Integration

This contract is for partner-owned frontends that consume ANU backend services
without ANU directly hosting the public website domain.

## Backend Base URL

Production backend:

```text
https://anu-back-end.vercel.app
```

Use the deployed backend URL for all API calls unless an operator provides a
different environment-specific base URL.

## Tenant Identification

Public, non-sensitive APIs support explicit tenant hints. These hints identify a
public site configuration only; they never grant access to private, admin, or
control-plane data.

Supported public hints:

```http
GET /api/public/nodes/current/config?site=mudyin
GET /api/public/sites/resolve?site=mudyin
GET /api/public/sites/resolve?site=mudyin&host=https%3A%2F%2Fmudyin.vercel.app
```

Supported headers for browser clients:

```http
X-ANU-Site: mudyin
X-ANU-Site-Slug: mudyin
X-ANU-App-ID: mudyin
```

Supported host/domain hints:

```http
GET /api/public/sites/resolve?host=mudyin-live.vercel.app
GET /api/public/sites/resolve?host=mudyin.vercel.app
GET /api/public/sites/resolve?host=www.mudyin.com
```

Unknown tenant hints must return a structured `404` and must not fall back to
Mudyin or any other tenant.

## Public Config

Mudyin config:

```powershell
curl.exe -i "https://anu-back-end.vercel.app/api/public/nodes/current/config?site=mudyin"
```

Expected successful status:

```text
200
```

Expected fields:

```json
{
  "contract_version": "2026-04-10",
  "node_slug": "mudyin",
  "white_label": true,
  "brand": {},
  "modules": {},
  "site_manifest": {
    "site_key": "mudyin-public",
    "site_name": "Mudyin",
    "enabled_public_modules": []
  },
  "site_resolution": {
    "resolved": true,
    "resolution_status": "resolved_site_hint"
  }
}
```

If the registry entry exists but the active tenant node is not bootstrapped yet,
the endpoint may return `node_id: 0`, `status: registry_only`, and a
`fallback_note`. This is safe for rendering public shell metadata, but tenant
data APIs remain unavailable until the tenant node is bootstrapped.

## Public Content APIs

Use tenant-scoped requests for partner frontends:

```powershell
curl.exe -i "https://anu-back-end.vercel.app/public/archive/records?node=mudyin&page=1&page_size=5"
curl.exe -i "https://anu-back-end.vercel.app/public/trust/decisions?node=mudyin&limit=5"
curl.exe -i "https://anu-back-end.vercel.app/public/trust/reports?node=mudyin&limit=5"
```

Expected successful status:

```text
200
```

If a public module has no published content or storage is temporarily
unavailable, list endpoints return an empty public payload with
`degraded_honesty.is_degraded=true`. They must not return private, draft, or
cross-tenant records.

## Disabled or Unconfigured Module Response

List endpoints use a stable degraded payload:

```json
{
  "ok": true,
  "data": {
    "records": [],
    "degraded_honesty": {
      "is_degraded": true,
      "reason": "public_archive_storage_unavailable",
      "fallback": "Public archive storage is temporarily unavailable; no private or draft records are exposed."
    }
  },
  "request_id": "..."
}
```

## Error Schema

Structured errors use this shape:

```json
{
  "ok": false,
  "error": {
    "code": "not_found",
    "message": "White-label site hint is not configured",
    "details": null
  },
  "request_id": "..."
}
```

Normal public integration errors:

| Case | Expected |
|---|---:|
| Unknown site hint | 404 |
| Invalid pagination | 400 |
| Storage unavailable on public list endpoint | 200 degraded payload |
| Missing/invalid control auth | 401/422/403 |

## CORS

Production must set:

```text
CORS_ORIGINS=https://mudyin.vercel.app,https://mudyin-live.vercel.app,https://www.mudyin.com
```

Approved-origin preflight:

```powershell
curl.exe -i -X OPTIONS "https://anu-back-end.vercel.app/api/public/nodes/current/config" `
  -H "Origin: https://mudyin.vercel.app" `
  -H "Access-Control-Request-Method: GET" `
  -H "Access-Control-Request-Headers: X-ANU-Site-Slug"
```

Expected: `Access-Control-Allow-Origin: https://mudyin.vercel.app`.

Unapproved origins must not receive an `Access-Control-Allow-Origin` grant.

## Auth and Control Plane

Public tenant hints are not authorization. They are only for public site
resolution.

Privileged routes require:

```http
Authorization: Bearer <control JWT>
X-Control-Plane-Secret: <CONTROL_PLANE_SHARED_SECRET>
```

Control JWT requirements:

- `aud=control`
- `token_use=control`
- `requires_mfa=true`
- eligible role
- required `scp` scope
- active token grant when production requires grants
- request host in `CONTROL_PLANE_HOSTS`

Do not call `/api/control/*`, `/api/admin/tenants*`, or `/api/domains` mutation
routes from a public partner frontend.

## Versioning

Current contracts:

```text
Public node config: 2026-04-10
Public site manifest/resolution: 2026-04-14
Hosted smoke: anu-launch-smoke-hosted.v1
```

Backward-compatible fields may be added. Existing fields should not be removed
without a new contract version.

## Hosted Smoke

Public/external integration smoke:

```powershell
cd C:\Dev\Flora_fauna
python .\scripts\launch_rc_hosted_smoke.py `
  --public-base-url https://anu-back-end.vercel.app `
  --public-site-hint mudyin `
  --public-host-for-resolution mudyin.vercel.app `
  --skip-control-checks `
  --timeout-seconds 25
```

Full control smoke requires operator credentials:

```powershell
$env:CONTROL_SMOKE_AUTH_HEADER="Bearer <control JWT>"
$env:CONTROL_PLANE_SHARED_SECRET="<shared secret>"
python .\scripts\launch_rc_hosted_smoke.py `
  --public-base-url https://anu-back-end.vercel.app `
  --public-site-hint mudyin `
  --public-host-for-resolution mudyin.vercel.app `
  --control-base-url https://anu-back-end.vercel.app `
  --control-site-id <mudyin-node-id> `
  --control-auth-header-env CONTROL_SMOKE_AUTH_HEADER `
  --control-plane-secret-header-env CONTROL_PLANE_SHARED_SECRET
```

## Troubleshooting

- `404` for `site=mudyin`: deploy registry changes or verify the site hint.
- `node_id: 0`: bootstrap the active Mudyin tenant node before using tenant data APIs.
- Missing CORS header: update `CORS_ORIGINS` and redeploy.
- `503` on public resolution: inspect backend logs, DB URL, migrations, and runtime env.
- `403` on control/admin route: check control host, JWT audience, MFA claim, scopes, token grant, and shared secret.
