# White-Label Site Onboarding

Use this checklist for Mudyin and every future branded site/app.

## 1. Registry Entry

Add or update a `WhiteLabelSiteRegistryEntry` in:

```text
flora-fauna/backend/app/services/white_label_site_registry.py
```

Required fields:

- `site_id`
- `slug`
- `canonical_name`
- `short_name`
- `allowed_domains`
- `deployment_aliases`
- `tenant_scope`
- `manifest_defaults`
- `enabled_features`
- `required_runtime_env`

Template:

```text
docs/templates/white-label-site.template.json
```

## 2. Database Bootstrap

Create or verify:

- `Node.slug` matches the registry `slug`.
- `Node.status=active`.
- `NodeConfig.config_json.public_site_manifest` only overrides values that differ from the registry defaults.
- `NodeDomain.domain` rows exist for custom domains and have `status=active`.

Control-plane bootstrap route:

```http
POST /api/control/sites/bootstrap
```

Required headers in non-development runtimes:

```http
Authorization: Bearer <control JWT>
X-Control-Plane-Secret: <CONTROL_PLANE_SHARED_SECRET>
```

## 3. Brand and Content Checklist

- Site name and short name.
- Tagline.
- Logo URL or asset reference.
- Favicon URL or asset reference.
- Primary, secondary, and accent colors.
- Metadata title and description.
- Public nav links.
- Footer links.
- Contact email/path.
- Privacy, terms, code of conduct.
- Transparency/status route.
- Public 404 and error state.

## 4. Domain Checklist

- Add Vercel alias to frontend env `WHITE_LABEL_DEPLOYMENT_HOSTS`.
- Add custom domain rows via `/api/control/sites/<site_id>/domain-bindings`.
- Add custom domains to Vercel project.
- Configure Cloudflare DNS.
- Verify `www` and apex behavior.
- Run hosted smoke against Vercel alias and custom domain.

## 5. Tests to Add

Backend:

```powershell
cd C:\Dev\Flora_fauna\flora-fauna\backend
python -m pytest .\tests\test_public_site_manifest.py .\tests\test_domain_resolution.py -q
```

Frontend:

```powershell
cd C:\Dev\Flora_fauna\frontend-next
cmd /c npm run -s test -- run src/test/proxyTenantContract.test.ts src/test/tenantBrandContract.test.tsx
```

Hosted:

```powershell
cd C:\Dev\Flora_fauna
python .\scripts\launch_rc_hosted_smoke.py `
  --public-base-url https://anu-back-end.vercel.app `
  --public-host-for-resolution <site-domain> `
  --control-base-url https://anu-back-end.vercel.app `
  --control-site-id <node-id> `
  --control-auth-header-env CONTROL_SMOKE_AUTH_HEADER `
  --control-plane-secret-header-env CONTROL_PLANE_SHARED_SECRET
```

## 6. Approval Gates

- Local tests pass.
- Frontend typecheck passes.
- Backend smoke passes.
- Hosted public routes pass.
- Hosted control read checks pass with credentials.
- Unauthenticated control checks reject.
- DNS/TLS verified.
- Legal pages approved.
- Content owner signs off on site copy.

