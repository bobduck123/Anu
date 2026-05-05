# ANU White-Label Readiness

Last updated: 2026-04-29

## Architecture Map

| Layer | Implementation | Launch responsibility |
|---|---|---|
| Public white-label site layer | `frontend-next/src/app/(public)`, `TenantBrandWrapper`, backend `/api/public/sites/*`, `/api/public/nodes/*` | Render tenant-safe public pages, legal routes, contact, branded not-found and error states. |
| White-label app layer | `frontend-next/src/app/(app)`, tenant cookies and headers from `frontend-next/src/proxy.ts` | Use resolved tenant context, not hard-coded brand or domain assumptions. |
| ANU shared frontend shell | `LayoutShell`, `Sidebar`, `Header`, `Footer`, public manifest rail | Shared shell must not overwrite tenant-specific manifest, branding, or nav. |
| Backend/API layer | Flask app in `flora-fauna/backend/app` | Public APIs are tenant-scoped; privileged APIs require server-side auth. |
| Falak service layer | `services/impact-service/src/falak` | Engine/protocol routes stay separated from ANU public shell and control-plane policy. |
| Control plane | Backend `/api/control/*`, frontend `/api/control/[...path]` proxy | Requires control host, Supabase control role, minted control JWT, and `X-Control-Plane-Secret`. |
| Database | SQLAlchemy models `Node`, `NodeDomain`, `NodeConfig`, public archive/trust records | Domain, config, and public content records must carry tenant/node scope. |
| Auth/session | Flask JWT audiences plus Supabase session in Next | Public routes do not require auth; admin/control routes require server-side role checks. |
| Tenant resolution | Next proxy calls `/api/domains/resolve`; backend public config calls `resolve_public_site_for_host` | Domain row wins. Registered Vercel aliases can resolve to known white-label nodes. Unknown hosts get an unassigned safe manifest. |
| Deployment path | Vercel frontend, backend, impact service | Vercel envs must match docs; hosted smoke must pass before launch approval. |

## Readiness Contract

### A. Tenant and Site Configuration

- Every white-label site has a stable `site_id`, `slug`, names, allowed domains, deployment aliases, brand tokens, public nav, footer, legal links, contact, feature flags, runtime env requirements, and tenant scope.
- Source of truth for built-in launch sites: `flora-fauna/backend/app/services/white_label_site_registry.py`.
- Runtime override source: `NodeConfig.config_json.public_site_manifest`.
- Required DB records for custom domains: active `NodeDomain` rows for each production custom domain.
- Missing or unknown host behavior: return `site_key=unassigned-public-host`, not another tenant manifest.

### B. Domain Routing

- Vercel aliases that should behave as public launch domains must be listed in frontend env `WHITE_LABEL_DEPLOYMENT_HOSTS`.
- Backend registry currently includes `mudyin-live.vercel.app` as a Mudyin deployment alias.
- Custom domains such as `www.mudyin.com` must have active backend domain bindings; static registry alone does not claim custom domains.
- Unknown domains must not render ANU or Mudyin content.
- Platform hosts are controlled by backend `PUBLIC_PLATFORM_HOSTS`.

### C. Branding Isolation

- Site manifest owns public name, tagline, colors, nav, footer, legal links, contact, preview host, and canonical domains.
- Frontend safe href filtering blocks `/api/*` and `/control/*` from tenant-provided public nav/footer/legal config.
- Root `not-found.tsx` and `error.tsx` render through tenant context instead of blank or ANU-only states.

### D. Data Isolation

- Public domain lookup is scoped by `NodeDomain.node_id`.
- Public site manifests resolve by host/domain/alias before any config is exposed.
- Public node context no longer trusts arbitrary `X-Node-Id` or `X-Node-Slug` headers on public requests.
- Control-plane site APIs validate the requested site/node and use role/scope checks.

### E. Auth and RBAC

- Public routes are unauthenticated.
- Frontend control proxy requires a control host and Supabase role.
- Backend control routes require control JWT, control audience, allowed role, scopes, and `X-Control-Plane-Secret` outside development/testing.
- Env names: `CONTROL_PLANE_HOSTS`, `CONTROL_PLANE_SHARED_SECRET`, optional legacy alias `CONTROL_PLANE_SECRET_HEADER`, smoke-only `CONTROL_SMOKE_AUTH_HEADER`.

### F. White-Label Feature Modules

Required public routes:

- `/`
- `/about`
- `/contact`
- `/privacy`
- `/terms`
- `/code-of-conduct`
- `/transparency`
- unknown route branded 404
- route error boundary

Tenant modules are declared in `enabled_public_modules` and must be treated as feature gates by new public pages.

### G. Operational Readiness

Required checks before launch:

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

### H. Hosted Verification

Hosted verification must include:

- `https://mudyin-live.vercel.app/`
- `https://www.mudyin.com/` after DNS and Vercel domain binding
- `https://anu-back-end.vercel.app/healthz`
- `https://anu-back-end.vercel.app/readiness`
- `https://anu-back-end.vercel.app/api/public/sites/resolve?host=mudyin-live.vercel.app`
- Control routes without credentials must reject.
- Control routes with `CONTROL_SMOKE_AUTH_HEADER` and `X-Control-Plane-Secret` must return 200 for read-only checks.

## Single-Tenant Assumptions Removed or Reduced

- Generic Vercel preview hosts are still skipped, but named white-label aliases now resolve through tenant lookup.
- Mudyin defaults moved from ad hoc exemplar content to a registry entry.
- Unknown host fallback no longer shows the default platform tenant manifest.
- Public request node resolution no longer accepts spoofed public `X-Node-*` headers.
- Frontend control proxy now forwards the required backend control-plane secret.

## Known External Requirements

- Create/verify Mudyin `Node` and active `NodeDomain` rows for `www.mudyin.com` and `mudyin.com`.
- Configure Vercel envs from `VERCEL_ENVIRONMENT_SETUP.md`.
- Complete DNS from `DOMAIN_AND_DNS_SETUP.md`.
- Run hosted smoke with real control credentials from `HOSTED_SMOKE_TESTS.md`.

