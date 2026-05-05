# ANU White-Label Release Checklist

Last updated: 2026-04-29

## Code Gates

Run from `C:\Dev\Flora_fauna`:

```powershell
cd C:\Dev\Flora_fauna\flora-fauna\backend
python -m pytest .\tests\test_public_site_manifest.py .\tests\test_domain_resolution.py .\tests\test_node_config_contract.py -q

cd C:\Dev\Flora_fauna\frontend-next
cmd /c npm run -s typecheck
cmd /c npm run -s test -- run src/test/proxyTenantContract.test.ts src/test/controlProxyRoute.test.ts src/test/tenantBrandContract.test.tsx

cd C:\Dev\Flora_fauna
python .\scripts\launch_rc_smoke.py
python -m unittest scripts.tests.test_launch_rc_hosted_smoke -v
```

Optional full gates:

```powershell
cd C:\Dev\Flora_fauna\frontend-next
cmd /c npm run -s lint
cmd /c npm run -s build
cmd /c npm run -s test:e2e
```

## Pre-Launch Operator Gates

- Backend Vercel envs set from `VERCEL_ENVIRONMENT_SETUP.md`.
- Frontend Vercel envs set from `VERCEL_ENVIRONMENT_SETUP.md`.
- Mudyin `Node` exists and is active.
- Mudyin `NodeDomain` rows exist and are active for custom domains.
- `WHITE_LABEL_DEPLOYMENT_HOSTS` includes `mudyin-live.vercel.app`.
- `CONTROL_PLANE_SHARED_SECRET` matches backend and frontend.
- `CONTROL_PLANE_HOSTS` does not include public white-label domains.
- DNS and TLS verified.
- Legal and contact pages reviewed.
- Hosted smoke full run saved to evidence.

## Launch Steps

1. Deploy backend.
2. Verify backend:
   ```powershell
   curl.exe -i https://anu-back-end.vercel.app/healthz
   curl.exe -i https://anu-back-end.vercel.app/readiness
   ```
3. Deploy frontend.
4. Verify frontend:
   ```powershell
   curl.exe -i https://mudyin-live.vercel.app/
   curl.exe -i https://maanara.vercel.app/
   ```
5. Verify Mudyin domain resolution:
   ```powershell
   curl.exe -i "https://anu-back-end.vercel.app/api/public/sites/resolve?host=mudyin-live.vercel.app"
   curl.exe -i "https://anu-back-end.vercel.app/api/domains/resolve?domain=mudyin-live.vercel.app"
   ```
6. Verify unauthenticated control rejection:
   ```powershell
   curl.exe -i "https://anu-back-end.vercel.app/api/control/sites/1/publish-readiness"
   ```
7. Run full hosted smoke:
   ```powershell
   python .\scripts\launch_rc_hosted_smoke.py `
     --public-base-url https://anu-back-end.vercel.app `
     --public-host-for-resolution mudyin-live.vercel.app `
     --control-base-url https://anu-back-end.vercel.app `
     --control-site-id <mudyin-node-id> `
     --control-auth-header-env CONTROL_SMOKE_AUTH_HEADER `
     --control-plane-secret-header-env CONTROL_PLANE_SHARED_SECRET
   ```
8. Verify browser routes on desktop and mobile.
9. Switch or confirm DNS for `www.mudyin.com`.
10. Verify custom domain smoke.
11. Record launch evidence.

## Post-Launch Monitoring

- Watch Vercel function logs for 4xx/5xx spikes.
- Check backend `/readiness` after deploy and after DNS switch.
- Check control route rejection logs for unexpected public access attempts.
- Re-run hosted smoke after DNS, after env changes, and after any migration.

