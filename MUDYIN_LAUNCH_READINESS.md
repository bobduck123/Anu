# Mudyin Launch Readiness

Last updated: 2026-04-29

## Current Configuration

| Item | Value |
|---|---|
| Site ID | `mudyin` |
| Node slug | `mudyin` |
| Public name | `Mudyin` |
| Vercel alias | `mudyin-live.vercel.app` |
| Custom domains | `www.mudyin.com`, `mudyin.com` |
| Contact | `hello@mudyin.com` |
| Enabled modules | `community`, `education`, `trust`, `archive`, `transparency` |
| Registry file | `flora-fauna/backend/app/services/white_label_site_registry.py` |

## Routes Expected to Load

- `/`
- `/about`
- `/contact`
- `/privacy`
- `/terms`
- `/code-of-conduct`
- `/transparency`
- `/trust`
- `/community`
- `/education`
- `/archive`
- unknown route should show branded 404

## Required Operator Actions

1. Verify a backend `Node` exists with `slug=mudyin` and `status=active`.
2. Add active domain bindings for `www.mudyin.com` and `mudyin.com`.
3. Add `mudyin-live.vercel.app` to frontend Vercel env `WHITE_LABEL_DEPLOYMENT_HOSTS`.
4. Set backend `CORS_ORIGINS` to include:
   - `https://mudyin-live.vercel.app`
   - `https://www.mudyin.com`
   - `https://mudyin.com` if apex is served
5. Configure Cloudflare DNS and Vercel domains.
6. Run hosted smoke with a real control token and shared secret.
7. Approve final legal/privacy/terms/code-of-conduct copy.

## Verification Commands

Public backend/domain resolution:

```powershell
curl.exe -i "https://anu-back-end.vercel.app/api/public/sites/resolve?host=mudyin-live.vercel.app"
curl.exe -i "https://anu-back-end.vercel.app/api/domains/resolve?domain=mudyin-live.vercel.app"
curl.exe -i "https://anu-back-end.vercel.app/api/public/sites/resolve?host=www.mudyin.com"
```

Expected:

- `mudyin-live.vercel.app`: HTTP 200, `resolved=true`, `node_slug=mudyin`, `resolution_status=resolved_deployment_alias`.
- `www.mudyin.com`: HTTP 200 and `resolution_status=resolved` after active `NodeDomain` binding exists.
- unknown host: HTTP 200 for public site resolve, `resolved=false`, `site_manifest.site_key=unassigned-public-host`.

Hosted smoke:

```powershell
cd C:\Dev\Flora_fauna
$env:CONTROL_SMOKE_AUTH_HEADER="Bearer <control JWT>"
$env:CONTROL_PLANE_SHARED_SECRET="<backend shared secret>"
python .\scripts\launch_rc_hosted_smoke.py `
  --public-base-url https://anu-back-end.vercel.app `
  --public-host-for-resolution mudyin-live.vercel.app `
  --control-base-url https://anu-back-end.vercel.app `
  --control-site-id <mudyin-node-id> `
  --control-auth-header-env CONTROL_SMOKE_AUTH_HEADER `
  --control-plane-secret-header-env CONTROL_PLANE_SHARED_SECRET `
  --output-md docs/program/evidence/mudyin-hosted-smoke.md
```

## Known Remaining External Checks

- Custom domain DNS/TLS cannot be proven from code alone.
- Hosted control read checks need `CONTROL_SMOKE_AUTH_HEADER` and `CONTROL_PLANE_SHARED_SECRET`.
- Public legal copy should be reviewed by the operator/content owner before production announcement.

