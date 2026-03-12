# Manara Backend (Alpha Launch)

This backend keeps all legacy routes/auth/data behavior intact and adds the Cultural Intelligence Architecture additively.

## What was added

- Public plane API namespace: `/api/public/*`
- Control plane API namespace: `/api/control/*`
- Control plane guard:
  - role must be in control-plane role set
  - JWT `aud` must equal `CONTROL_PLANE_JWT_AUDIENCE` (default `control`)
  - JWT `requires_mfa=true`
  - request host must match `CONTROL_PLANE_HOSTS`
- New subsystems:
  - Connector Network (raw signals + UEO normalization)
  - Data Fusion Engine (dedupe, corroboration, clusters, scoring)
  - Knowledge Graph (entities/edges/claims/evidence/event links)
  - Narrative & Education (learning modules, guided journeys, quests)
  - Worlds (signed snapshots + patch stream)
  - Coordination integration (commitment lifecycle + evidence hooks)
- Performance/safety hardening:
  - anonymous `/api/public/*` GET responses now use short-lived cache headers
  - authenticated and control endpoints remain non-cacheable
  - ETag/`If-None-Match` support added on high-volume public intel/world reads
  - optional `X-Idempotency-Key` support on control write endpoints
- Append-only sensitive audit:
  - `audit_log` update/delete blocked
  - `control_audit_event` append-only audit trail
- World-class resilience/security hardening:
  - control-token `jti` grant registry with revoke support (`/auth/control-token/revoke`)
  - control-plane scope enforcement (`scp` claim) on sensitive endpoints
  - world snapshot `manifest_hash` + artifact consistency verification
  - connector queue leases, request-key dedupe, and stale-job recovery

## New files

- Migration SQL: `migrations/versions/20260306_cultural_intelligence_architecture.sql`
- Migration SQL: `migrations/versions/20260306_operational_resilience_stage4.sql`
- OpenAPI: `docs/cultural_intelligence_openapi.yaml`
- Seed script: `scripts/seed_cultural_intel.py`
- Smoke script: `scripts/smoke_cultural_intel.py`
- Migration safety gate: `scripts/check_migration_safety.py`
- Alpha preflight gate: `scripts/preflight_alpha_launch.py`
- Canary checker: `scripts/canary_check_cultural_intel.py`
- Fault injection probe: `scripts/fault_injection_cultural_intel.py`
- Load probe: `scripts/load_probe_cultural_intel.py`
- Rollback helper: `scripts/rollback_world_snapshot.py`
- Release runbook: `docs/alpha_release_canary_rollback.md`

## Run locally

```powershell
cd backend
python -m pip install -r requirements.txt
python main.py
```

## Deployment secret safety

- `SECRET_KEY` and `JWT_SECRET_KEY` must always be set in production.
- Split JWT signing keys are supported and enforced in production:
  - `PUBLIC_JWT_SECRET_KEY` (public tokens)
  - `CONTROL_JWT_SECRET_KEY` (control tokens)
- Runtime env detection now considers `FLASK_ENV`, `APP_ENV`, `ENVIRONMENT`, and `VERCEL_ENV`.
- To force non-fallback secret behavior in staging/preview, set:
  - `REQUIRE_STRICT_SECRETS=true`
- In Vercel:
  - `VERCEL_ENV=production` uses production config validation.
  - `VERCEL_ENV=preview` keeps dev config behavior but still forbids fallback secrets.
- Control-plane host restrictions:
  - Outside local `development/testing`, `CONTROL_PLANE_HOSTS` must be explicitly configured.
  - Requests to `/api/control/*` are denied if request host is not in that allowlist.
- Control-plane shared secret:
  - Outside local `development/testing`, `CONTROL_PLANE_SHARED_SECRET` must be explicitly configured.
  - Requests to `/api/control/*` must include `X-Control-Plane-Secret` matching that configured secret.
- Control token lifetime:
  - `CONTROL_ACCESS_TOKEN_EXPIRES_MINUTES` defaults to `15` for short-lived privileged access tokens.
- Control connector pull mode:
  - `CONTROL_CONNECTOR_PULL_ASYNC_DEFAULT=true` enables queue-first pulls by default.
- Control token hardening:
  - `CONTROL_REQUIRE_TOKEN_USE_CLAIM=true`
  - `CONTROL_REQUIRE_TOKEN_GRANT=true`
  - optional `CONTROL_ROLE_SCOPES_JSON` for role-to-scope policy overrides.
- Connector queue resilience:
  - `CONNECTOR_PULL_JOB_LEASE_SECONDS` and `CONNECTOR_PULL_JOB_STALE_SECONDS` tune worker lease/recovery behavior.
- Audit checkpoint export storage:
  - `AUDIT_CHECKPOINT_STORAGE_ROOT` controls where checkpoint JSON artifacts are written.

## Seed sample architecture data

```powershell
cd backend
python scripts/seed_cultural_intel.py
```

## Control-plane token flow (dev)

1. Login with an allowed control role user:
   - `POST /auth/login`
2. Exchange for control token:
   - `POST /auth/control-token` with `{"requires_mfa": true}`
3. Optional: revoke active control token:
   - `POST /auth/control-token/revoke`
4. Call control endpoints with returned token:
   - `POST /api/control/connectors/register`
   - `POST /api/control/worlds/{world_id}/publish`

Optional for safe retries:
- Include `X-Idempotency-Key: <stable-client-key>` on control write requests.

## Smoke test checklist

```powershell
cd backend
python scripts/smoke_cultural_intel.py
```

Checks covered:
- existing endpoint responds (`/api/members`)
- auth still works (`/auth/login`, `/api/users/me`)
- control plane access works only with control token
- new connector/fusion endpoints work
- world publish + signature verification works

## Alpha preflight gate

```powershell
cd backend
python scripts/preflight_alpha_launch.py --json-report reports/preflight_report.json --fail-fast
```

Checks covered by preflight:
- migration safety policy validation
- control plane/security config regression tests
- cultural intelligence architecture test suite
- smoke flow for legacy + new endpoints

## Canary, load, and rollback operations

```powershell
cd backend
python scripts/canary_check_cultural_intel.py --base-url http://127.0.0.1:5000 --iterations 3
python scripts/fault_injection_cultural_intel.py
python scripts/load_probe_cultural_intel.py --enforce-thresholds --max-p95-ms 250
python scripts/rollback_world_snapshot.py --world-id sydney-alpha --target-version 1 --actor-username alpha_publisher
```

See `docs/alpha_release_canary_rollback.md` for the full operational sequence.

## Regression tests

```powershell
cd backend
python -m pytest tests/test_cultural_intelligence_architecture.py -q
```
