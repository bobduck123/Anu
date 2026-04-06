# ANU Go-Live Status Board (Staging -> Production)

Last updated: 2026-04-07  
Scope: M0-M5 runtime contracts + ANU UI rollout

## Status Model

- `DONE`: verified complete in the current audit cycle
- `CANDIDATE_READY`: complete on current local release candidate, pending shared branch/release action
- `REPO_READY`: implemented in-repo (scripts/workflows/contracts/routes present)
- `VERIFY_PENDING`: runnable but not yet executed end-to-end for this release cycle
- `ENV_PENDING`: depends on hosted infra, secrets, DNS, or ownership assignment
- `OPS_PENDING`: post-deploy or operational duty, not a pure code/repo task

## Current Candidate Context

- `CANDIDATE_READY` Local release candidate branch state: `main` is ahead of `origin/main` by 1 commit (`behind 0`).
- `CANDIDATE_READY` Phase-5 continuity commits are present locally and included in candidate scope.
- `DONE` Frontend typecheck passed on 2026-04-07 (`cmd /c npm run -s typecheck` in `frontend-next`).
- `DONE` Frontend production build passed on 2026-04-07 (`cmd /c npm run -s build` in `frontend-next`).
- `DONE` Backend health tests passed on 2026-04-07 (`python -m pytest tests/test_health.py -q` in `flora-fauna/backend`).
- `DONE` Impact-service typecheck passed on 2026-04-07 (`cmd /c npm run -s typecheck` in `services/impact-service`).
- `ENV_PENDING` Impact-service full test pass depends on DB env (`DATABASE_URL` family) for integration suites.
- `CANDIDATE_READY` Env contract + core smoke scripts passed locally on 2026-04-07:
  - `python verify-env-contract.py`
  - `python smoke-core-runtime.py`
- `ENV_PENDING` Runtime contract script requires running core+impact services (`127.0.0.1:5000`, `127.0.0.1:5003`) and currently fails as unreachable.
- `VERIFY_PENDING` Frontend full CI test matrix is not green (`11` failing tests across `9` files in `npm run -s test:ci`).
- `DONE` Focused frontend verification passed on 2026-04-07:
  - `src/test/celestialPacketAdapter.test.ts`
  - `src/test/realmRegistry.test.ts`
  - `src/test/constellationsPage.test.tsx`
  - `src/test/communityPage.test.tsx`

---

## 0) Release Decision Gate

- `CANDIDATE_READY` M0-M5 implementation is present on the local release candidate.
- `DONE` `docs/program/M0_M5_CHANGE_SUMMARY.md` reviewed in current audit.
- `DONE` `docs/program/M0_M5_AGGRESSIVE_MOCKDB_TEST_REPORT.md` reviewed in current audit.
- `ENV_PENDING` Rollback owner assigned (backend + impact + frontend).
- `ENV_PENDING` DB backup/restore runbook owner and invocation window confirmed.

---

## 1) Hosting Architecture Requirements

- `ENV_PENDING` 3 Vercel projects created from same repo:
  - `frontend-next`
  - `flora-fauna/backend`
  - `services/impact-service`
- `ENV_PENDING` 1 shared Postgres target (Supabase recommended) provisioned.
- `ENV_PENDING` Required schemas confirmed on target (`public`, `falak`).
- `ENV_PENDING` DNS and TLS active for frontend domain.

---

## 2) Staging Environment Requirements (Hybrid OSS Track)

### 2.1 Staging Infra Bring-Up

- `REPO_READY` Staging compose baseline present (`infra/staging/docker-compose.yml`, `infra/staging/README.md`).
- `VERIFY_PENDING` Postgres healthy on `localhost:5432`.
- `VERIFY_PENDING` Redis healthy on `localhost:6379`.
- `VERIFY_PENDING` MinIO healthy on `http://localhost:9000`.
- `VERIFY_PENDING` LGTM/Grafana healthy on `http://localhost:3001`.

### 2.2 Service Env Configuration (Staging Values)

- `ENV_PENDING` Frontend env set (Supabase URL/key + API origins).
- `ENV_PENDING` Core backend env set (secrets + DB + CORS).
- `ENV_PENDING` Impact-service env set (`DATABASE_URL`, `DIRECT_URL`, JWT/CORS/FALAK).

### 2.3 Deploy/Boot Staging Apps

- `REPO_READY` Frontend deploy root defined (`frontend-next`).
- `REPO_READY` Backend deploy root defined (`flora-fauna/backend`).
- `REPO_READY` Impact deploy root defined (`services/impact-service`).
- `VERIFY_PENDING` All three services boot and serve in staging with staging env.

### 2.4 Contract Verification Gates

- `REPO_READY` Contract scripts present:
  - `scripts/verify-env-contract.py`
  - `scripts/verify-runtime-contracts.py`
  - `scripts/smoke-core-runtime.py`
- `CANDIDATE_READY` Env contract check passed on candidate host (`python verify-env-contract.py`).
- `ENV_PENDING` Runtime contract check requires core+impact services to be running in target env (`python verify-runtime-contracts.py` currently unreachable).
- `CANDIDATE_READY` Core smoke passed on candidate host (`python smoke-core-runtime.py`).

### 2.5 Full Service Test Gates

- `REPO_READY` Backend health tests exist (`flora-fauna/backend/tests/test_health.py`).
- `REPO_READY` Impact test suite exists (Falak/manara mode tests).
- `DONE` Frontend typecheck passed on candidate (`frontend-next`).
- `DONE` Backend tests passed for release cycle (`python -m pytest tests/test_health.py -q`).
- `ENV_PENDING` Impact-service tests are partially blocked by missing DB env vars for integration suites (`16/18` suites pass without DB).
- `VERIFY_PENDING` Frontend full CI test matrix pending green (`npm run -s test:ci` currently failing).
- `DONE` Frontend production build passed for release cycle (`cmd /c npm run -s build`).

---

## 3) Production Environment Requirements

### 3.1 Vercel Project Setup

- `ENV_PENDING` Project A: `frontend-next` (Node `24.x`).
- `ENV_PENDING` Project B: `flora-fauna/backend` (Python `3.12`, `vercel_app.py` entry).
- `ENV_PENDING` Project C: `services/impact-service` (Node `24.x`, API entrypoints).

### 3.2 Required Environment Variables

- `REPO_READY` Env templates present:
  - `frontend-next/vercel.env.example`
  - `flora-fauna/backend/vercel.env.example`
  - `services/impact-service/vercel.env.example`
- `ENV_PENDING` Frontend critical keys set.
- `ENV_PENDING` Backend critical keys set.
- `ENV_PENDING` Impact critical keys set.
- `ENV_PENDING` Stripe launch decision and key policy finalized.
- `ENV_PENDING` Falak dark-launch guard posture explicitly set for production.

### 3.3 Database and Migration Readiness

- `ENV_PENDING` Postgres target extension/migration compatibility confirmed.
- `VERIFY_PENDING` Backend migrations applied successfully on target.
- `VERIFY_PENDING` Prisma migrations applied successfully on target.
- `VERIFY_PENDING` App startup confirmed with real `DATABASE_URL` / `DIRECT_URL`.

### 3.4 Production Health Checks

- `REPO_READY` Health/readiness routes are implemented:
  - `/_core/healthz`
  - `/_core/readiness`
  - `/_impact/v1/health`
  - `/_impact/v1/falak/health`
  - `/_impact/v1/falak/readiness`
  - `/admin/runtime-health`
- `VERIFY_PENDING` All production health checks pass after deploy.

---

## 4) CI/CD and Quality Gates

- `REPO_READY` Workflow files present:
  - `.github/workflows/m0-runtime-contracts.yml`
  - `.github/workflows/m1-shell-lab-gates.yml`
  - `.github/workflows/m2-primitive-consolidation-gates.yml`
  - `.github/workflows/m3-chamber-rollout-gates.yml`
  - `.github/workflows/m4-community-rollout-gates.yml`
  - `.github/workflows/m5-trust-observatory-gates.yml`
- `VERIFY_PENDING` All workflows green on the actual release branch head.

---

## 5) Operational Hardening Requirements

- `OPS_PENDING` Durable object storage selected for media.
- `OPS_PENDING` Error monitoring enabled (Sentry or equivalent).
- `OPS_PENDING` API and function logs observable with retention policy.
- `OPS_PENDING` On-call alert routing configured for health/readiness failures.
- `OPS_PENDING` Runbook links for DB rollback + config rollback attached to release notes.

---

## 6) Final Launch Command Checklist (Release Manager)

- `DONE` Frontend typecheck completed on candidate.
- `DONE` Frontend production build completed on candidate.
- `ENV_PENDING` Impact typecheck + tests completed on candidate (typecheck done; DB-backed integration suites blocked by env).
- `DONE` Backend health tests completed on candidate.
- `ENV_PENDING` Runtime contract verifier completed on candidate env (requires running services on target ports).
- `OPS_PENDING` Tag release commit.
- `OPS_PENDING` Deploy backend + impact first.
- `OPS_PENDING` Deploy frontend after API origins are confirmed.
- `OPS_PENDING` Re-run production health checks.
- `OPS_PENDING` Announce go-live window complete.

---

## 7) Post-Launch (First 24 Hours)

- `OPS_PENDING` Watch health/readiness every 15 minutes for first 2 hours.
- `OPS_PENDING` Confirm no 5xx spikes on core or impact APIs.
- `OPS_PENDING` Validate critical journeys (auth, community, governance, observatory pages).
- `OPS_PENDING` Capture launch evidence bundle and attach to completion notes.
