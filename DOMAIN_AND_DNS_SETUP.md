# Domain and DNS Setup

Last updated: 2026-04-29

## Mudyin Domains

| Host | Target | Required state |
|---|---|---|
| `mudyin-live.vercel.app` | Frontend Vercel alias | Listed in `WHITE_LABEL_DEPLOYMENT_HOSTS`; backend registry resolves it to node slug `mudyin`. |
| `www.mudyin.com` | Frontend Vercel project | Active Vercel custom domain, active backend `NodeDomain`, Cloudflare CNAME. |
| `mudyin.com` | Canonical redirect or frontend Vercel project | Document and configure apex behavior. |

## Recommended Canonical Policy

- Canonical public host: `www.mudyin.com`.
- Apex `mudyin.com`: redirect to `https://www.mudyin.com/`.
- Vercel alias `mudyin-live.vercel.app`: keep available as an operational preview/smoke target.

## Cloudflare Records

For `www.mudyin.com`:

```text
Type: CNAME
Name: www
Target: cname.vercel-dns.com
Proxy: DNS only during Vercel verification; proxied only after TLS is confirmed if required by operator policy.
```

For apex redirect:

```text
Type: A or CNAME per Vercel/Cloudflare setup
Name: @
Target: Vercel-provided apex target
```

If using Cloudflare redirect rule instead of serving apex:

```text
Source: https://mudyin.com/*
Destination: https://www.mudyin.com/$1
Status: 301
```

## Backend Domain Binding

Use control route:

```http
PUT /api/control/sites/<mudyin-node-id>/domain-bindings
```

Body:

```json
{
  "canonical_domains": [
    "www.mudyin.com",
    "mudyin.com"
  ]
}
```

Required headers:

```http
Authorization: Bearer <control JWT>
X-Control-Plane-Secret: <CONTROL_PLANE_SHARED_SECRET>
```

## Verification

```powershell
curl.exe -I https://www.mudyin.com/
curl.exe -I https://mudyin.com/
curl.exe -i "https://anu-back-end.vercel.app/api/domains/resolve?domain=www.mudyin.com"
curl.exe -i "https://anu-back-end.vercel.app/api/public/sites/resolve?host=www.mudyin.com"
curl.exe -i "https://anu-back-end.vercel.app/api/public/sites/resolve?host=unknown.mudyin.com"
```

Expected:

- `www.mudyin.com`: 200 from frontend and backend domain resolution.
- `mudyin.com`: 301 to `www.mudyin.com` or 200 if serving apex intentionally.
- unknown host: no Mudyin or ANU content; `site_key=unassigned-public-host`.

## Domain Takeover Guardrail

Code does not resolve custom domains from static registry alone. A custom domain must be present as an active `NodeDomain` row. This prevents stale registry entries from silently claiming domains after DNS ownership changes.

