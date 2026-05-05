# Hosted Smoke Tests

Last updated: 2026-04-29

## Script

```text
scripts/launch_rc_hosted_smoke.py
```

The output includes `PASS`, `FAIL`, or `WARN`, the tested URL, HTTP status, message, and remediation hint.

## Public-Only Smoke

```powershell
cd C:\Dev\Flora_fauna
python .\scripts\launch_rc_hosted_smoke.py `
  --public-base-url https://anu-back-end.vercel.app `
  --public-site-hint mudyin `
  --public-host-for-resolution mudyin.vercel.app `
  --skip-control-checks
```

Expected:

- Public archive list: `PASS` if backend public archive route is healthy.
- Public trust decisions: `PASS` if trust route is healthy.
- White-label current public config: `PASS`, HTTP 200.
- White-label host/site resolution: `PASS`, HTTP 200, `resolved=true`, `node_slug=mudyin`.

## Full Control Smoke

```powershell
cd C:\Dev\Flora_fauna
$env:CONTROL_SMOKE_AUTH_HEADER="Bearer <control JWT>"
$env:CONTROL_PLANE_SHARED_SECRET="<backend shared secret>"
python .\scripts\launch_rc_hosted_smoke.py `
  --public-base-url https://anu-back-end.vercel.app `
  --public-site-hint mudyin `
  --public-host-for-resolution mudyin.vercel.app `
  --control-base-url https://anu-back-end.vercel.app `
  --control-site-id <mudyin-node-id> `
  --control-auth-header-env CONTROL_SMOKE_AUTH_HEADER `
  --control-plane-secret-header-env CONTROL_PLANE_SHARED_SECRET `
  --output-json docs/program/evidence/mudyin-hosted-smoke.json `
  --output-md docs/program/evidence/mudyin-hosted-smoke.md
```

Expected read checks:

- `/api/control/sites/<id>/manifest-authoring`: HTTP 200.
- `/api/control/sites/<id>/publish-readiness`: HTTP 200.
- `/api/control/sites/<id>/operator-assignments`: HTTP 200.
- `/api/control/sites/<id>/domain-bindings`: HTTP 200.

Bootstrap availability:

- Default validation-only probe expects HTTP 400 or 422.
- Use `--enable-bootstrap-mutation` only when an operator deliberately wants a real bootstrap mutation.

## Browser Smoke

Use Playwright or the browser devtools console for:

- `https://mudyin-live.vercel.app/`
- `https://mudyin-live.vercel.app/about`
- `https://mudyin-live.vercel.app/contact`
- `https://mudyin-live.vercel.app/privacy`
- `https://mudyin-live.vercel.app/terms`
- `https://mudyin-live.vercel.app/code-of-conduct`
- `https://mudyin-live.vercel.app/transparency`
- `https://mudyin-live.vercel.app/not-a-real-route`

Acceptance:

- No visible 404 on expected routes.
- Unknown route shows branded 404.
- No red browser console errors.
- No failed critical network requests.
- Mobile nav is usable.
- Title, description, favicon, and Open Graph basics are present.

## Remediation Hints

- `WARN`: a smoke input is missing. Set the listed env/argument and rerun.
- `FAIL` with 401/403 on control route: check `CONTROL_SMOKE_AUTH_HEADER`, `CONTROL_PLANE_SHARED_SECRET`, JWT audience, role, MFA, token grant, and `CONTROL_PLANE_HOSTS`.
- `FAIL` with 404: check route path, Vercel rewrites, active `NodeDomain`, and deployment alias env.
- `FAIL` with 5xx: inspect Vercel logs, database connectivity, migrations, and required env vars.
