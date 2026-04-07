# Production Go-Live Evidence (2026-04-07)

Date: 2026-04-07  
Operator context: local verification from `C:\Dev\Flora_fauna` against live Vercel URLs provided by release owner.

Targets:
- Frontend: `https://maanara.vercel.app/`
- Core API: `https://anu-back-end.vercel.app/`
- Impact API: `https://anu-impact-service.vercel.app/`

## 1) Runtime Contract Endpoint Audit

Command family used (PowerShell `Invoke-WebRequest`):
- frontend rewrite checks:
  - `/_core/healthz`
  - `/_core/readiness`
  - `/_impact/v1/health`
  - `/_impact/v1/falak/health`
  - `/_impact/v1/falak/readiness`
- direct service checks:
  - `anu-back-end.vercel.app/health`
  - `anu-back-end.vercel.app/readiness`
  - `anu-impact-service.vercel.app/v1/health`
  - `anu-impact-service.vercel.app/v1/falak/health`
  - `anu-impact-service.vercel.app/v1/falak/readiness`

Results:

| Endpoint | Status | Contract fields |
|---|---:|---|
| `https://maanara.vercel.app/_core/healthz` | `200` | `status=ok` |
| `https://maanara.vercel.app/_core/readiness` | `200` | `service=core-api`, `component=core`, `contract_version=m0.2026-04-01`, deps present |
| `https://maanara.vercel.app/_impact/v1/health` | `200` | `service=impact-service`, `component=impact`, `contract_version=m0.2026-04-01`, deps present |
| `https://maanara.vercel.app/_impact/v1/falak/health` | `200` | `service=impact-service`, `component=impact`, `contract_version=m0.2026-04-01`, deps present |
| `https://maanara.vercel.app/_impact/v1/falak/readiness` | `200` | `service=impact-service`, `component=impact`, `contract_version=m0.2026-04-01`, deps present |
| `https://anu-back-end.vercel.app/health` | `200` | `service=core-api`, `component=core`, `contract_version=m0.2026-04-01`, deps present |
| `https://anu-back-end.vercel.app/readiness` | `200` | `service=core-api`, `component=core`, `contract_version=m0.2026-04-01`, deps present |
| `https://anu-impact-service.vercel.app/v1/health` | `200` | `service=impact-service`, `component=impact`, `contract_version=m0.2026-04-01`, deps present |
| `https://anu-impact-service.vercel.app/v1/falak/health` | `200` | `service=impact-service`, `component=impact`, `contract_version=m0.2026-04-01`, deps present |
| `https://anu-impact-service.vercel.app/v1/falak/readiness` | `200` | `service=impact-service`, `component=impact`, `contract_version=m0.2026-04-01`, deps present |

Summary:
- `5/5` required production contract paths are healthy.
- Runtime contract endpoints are green across direct service domains and frontend rewrite paths.

## 2) Deployment Header Snapshot

Captured headers:
- Frontend root (`https://maanara.vercel.app/`):
  - `status=200`
  - `x-vercel-id=syd1::h7k7f-1775519068131-aa372bcb56ae`
  - `x-vercel-cache=PRERENDER`
  - `date=Mon, 06 Apr 2026 23:44:28 GMT`
- Core health (`https://anu-back-end.vercel.app/health`):
  - `status=200`
  - `x-vercel-id=syd1::iad1::kb7cz-1775519068861-2beb2a923e66`
  - `x-vercel-cache=MISS`
  - `date=Mon, 06 Apr 2026 23:44:29 GMT`
- Impact Falak health (`https://anu-impact-service.vercel.app/v1/falak/health`):
  - `status=200`
  - `x-vercel-id=syd1::iad1::zj5hg-1775519069224-8313aa83c6d5`
  - `x-vercel-cache=MISS`
  - `date=Mon, 06 Apr 2026 23:44:29 GMT`
- Impact `/v1/health` failure (`https://anu-impact-service.vercel.app/v1/health`):
  - `status=404`
  - `x-vercel-id=syd1::iad1::dm7f5-1775519096512-c43cda6eaa9c`
  - `x-vercel-cache=MISS`
  - `date=Mon, 06 Apr 2026 23:44:56 GMT`
- Impact `/v1/health` success re-check (`https://anu-impact-service.vercel.app/v1/health`):
  - `status=200`
  - `x-vercel-id=syd1::iad1::6z29l-1775520745335-de8f15e44dbd`
  - `x-vercel-cache=MISS`
  - `date=Tue, 07 Apr 2026 00:12:25 GMT`
- Frontend rewrite `/v1/health` success re-check (`https://maanara.vercel.app/_impact/v1/health`):
  - `status=200`
  - `x-vercel-id=syd1:syd1:syd1::iad1::v9cwt-1775520745625-2d0768ec2051`
  - `x-vercel-cache=MISS`
  - `date=Tue, 07 Apr 2026 00:12:25 GMT`

## 3) Endpoint Stability Note

Observed behavior:
- An initial same-day check captured transient `404` responses on impact `/v1/health`.
- Subsequent checks (including direct and rewrite paths) returned stable `200` contract payloads.

Repository alignment:
- `services/impact-service/vercel.json` on `main` already includes route mapping:
  - `{"src": "/v1/health", "dest": "api/falak.ts"}`
- `services/impact-service/src/falak/routes/registerFalakRoutes.ts` includes `GET /v1/health`.

## 4) Remaining Release Action

1. Keep runtime endpoint checks in first-hour launch watch (already defined in go-live checklist).
2. Maintain this evidence file as the canonical production verification artifact for the release window.

## 5) Non-Secret Production Env Verification

Method:
- Live contract/readiness payload inspection only (no secret values retrieved).

Verified live on 2026-04-07:
- Core readiness (`https://maanara.vercel.app/_core/readiness`)
  - `status=ok`
  - `dependencies.database=ok`
- Impact health (`https://maanara.vercel.app/_impact/v1/health`)
  - `status=ok`
  - `dependencies.database=ok`
- Impact Falak readiness (`https://maanara.vercel.app/_impact/v1/falak/readiness`)
  - `checks.database=ok`
  - `checks.postgis=ok`
  - `checks.prisma=ok`
  - `checks.falak_schema=ok`
  - `checks.migrations=ok`
  - `details.migration_failures=0`
  - `details.postgis_version=3.3.7`
- Runtime guard posture (`/v1/falak/health` and `/v1/falak/readiness`)
  - `route_guard_mode=enabled`
  - `dark_launch=false`
  - `map_route_guard_mode=enabled`
  - `map_dark_launch=false`
  - `require_verified_actor=true`

Interpretation:
- Runtime environment is correctly wired for database-backed operation and Falak guard enforcement.
- This is a non-secret operational verification; direct secret inventory remains control-plane ownership.

## 6) Release Sequence Evidence Snapshot

Completed and evidenced:
- Backend and impact endpoints live and healthy.
- Frontend live and rewriting correctly to both core and impact routes.
- Production runtime-contract checks re-run successfully (`5/5` required paths).
- Canonical impact release test gate executed locally on candidate host:
  - `cmd /c npm run -s test:release`

Remaining release-manager actions:
- Tag release commit.
- Publish final go-live announcement.
