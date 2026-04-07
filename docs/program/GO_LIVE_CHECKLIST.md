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

## Ownership Model (Max 4)

- `O1` You (Release lead, approvals, secrets, launch control)
- `O2` Agent-Platform (infra/database/runtime/migrations)
- `O3` Agent-Delivery (CI/CD/deploy workflow/runbooks)
- `O4` Agent-RealmQA (realm/browser/doctrine evidence)

Ownership + target dates for every open item are tracked in:
- `docs/program/COMPREHENSIVE_RELEASE_REALM_TODO_2026-04-07.md`

## Current Candidate Context

- `CANDIDATE_READY` Local release candidate branch state: `main` is ahead of `origin/main` by 2 commits (`behind 0`).
- `CANDIDATE_READY` Phase-5 continuity commits are present locally and included in candidate scope.
- `DONE` Frontend typecheck passed on 2026-04-07 (`cmd /c npm run -s typecheck` in `frontend-next`).
- `DONE` Frontend production build passed on 2026-04-07 (`cmd /c npm run -s build` in `frontend-next`).
- `DONE` Backend health tests passed on 2026-04-07 (`python -m pytest tests/test_health.py -q` in `flora-fauna/backend`).
- `DONE` Impact-service typecheck passed on 2026-04-07 (`cmd /c npm run -s typecheck` in `services/impact-service`).
- `CANDIDATE_READY` Impact-service DB-backed integration suites passed on 2026-04-07 via:
  - `cmd /c npm run -s falak:verify:local` (`tests/falak/falakDatabase.integration.test.ts`)
  - `cmd /c npm run -s falak:sandbox:verify` (`tests/maps/falakMapSandbox.database.test.ts`)
- `DONE` Impact-service canonical release test command is now defined and verified on 2026-04-07:
  - `cmd /c npm run -s test:release` in `services/impact-service`
  - includes `test:non-db` + `falak:verify:local` + `falak:sandbox:verify`
- `CANDIDATE_READY` Env contract + core smoke scripts passed locally on 2026-04-07:
  - `python verify-env-contract.py`
  - `python smoke-core-runtime.py`
- `CANDIDATE_READY` Runtime contract verification passed on 2026-04-07 when core+impact were brought up locally:
  - `python scripts/verify-runtime-contracts.py`
- `DONE` Live production endpoint audit (2026-04-07) confirms all required runtime-contract paths are healthy (`5/5`) across direct and frontend rewrite URLs.
- `CANDIDATE_READY` Earlier same-day transient `404` on impact `/v1/health` was cleared on re-check; latest verification is green.
- `DONE` Production evidence record captured: `docs/program/PROD_GO_LIVE_EVIDENCE_2026-04-07.md`.
- `DONE` Frontend full CI test matrix passed on 2026-04-07 (`npm run -s test:ci` in `frontend-next`: `72` suites, `225` tests).
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
- `DONE` Rollback ownership assigned:
  - `frontend`: `O1` (release lead)
  - `backend`: `O1` (release lead)
  - `impact`: `O1` (release lead)
  - execution support: `O2` (Agent-Platform)
- `DONE` DB backup/restore runbook ownership + window confirmed:
  - owner: `O2` (Agent-Platform), approver: `O1`
  - window: `2026-04-08 10:00-12:00` Australia/Sydney

---

## 1) Hosting Architecture Requirements

- `DONE` 3 Vercel projects are live from the same repo branch (`main`), per owner attestation + live endpoint verification:
  - `frontend-next`
  - `flora-fauna/backend`
  - `services/impact-service`
- `CANDIDATE_READY` Shared production Postgres is active for core+impact runtime paths (live readiness checks show database `ok` on both services).
- `DONE` Required impact-side schema readiness verified live:
  - `falak` schema: `ok`
  - migrations: `ok` (`migration_failures: 0`)
  - PostGIS: `ok` (`postgis_version: 3.3.7`)
- `DONE` DNS and TLS are active for frontend domain (`https://maanara.vercel.app` serving with valid HTTPS responses).

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
- `CANDIDATE_READY` Runtime contract check passed on candidate with local core+impact startup (`python verify-runtime-contracts.py`).
- `CANDIDATE_READY` Core smoke passed on candidate host (`python smoke-core-runtime.py`).

### 2.5 Full Service Test Gates

- `REPO_READY` Backend health tests exist (`flora-fauna/backend/tests/test_health.py`).
- `REPO_READY` Impact test suite exists (Falak/manara mode tests).
- `DONE` Frontend typecheck passed on candidate (`frontend-next`).
- `DONE` Backend tests passed for release cycle (`python -m pytest tests/test_health.py -q`).
- `CANDIDATE_READY` Impact-service DB-backed integration suites passed through dedicated local/sandbox verify scripts.
- `DONE` Impact-service release test gate is unified through `cmd /c npm run -s test:release` (verified 2026-04-07).
- `DONE` Frontend full CI test matrix passed for release cycle (`npm run -s test:ci`).
- `DONE` Frontend production build passed for release cycle (`cmd /c npm run -s build`).

---

## 3) Production Environment Requirements

### 3.1 Vercel Project Setup

- `DONE` Project A live: `frontend-next` (`https://maanara.vercel.app`).
- `DONE` Project B live: `flora-fauna/backend` (`https://anu-back-end.vercel.app`).
- `DONE` Project C live: `services/impact-service` (`https://anu-impact-service.vercel.app`).

### 3.2 Required Environment Variables

- `REPO_READY` Env templates present:
  - `frontend-next/vercel.env.example`
  - `flora-fauna/backend/vercel.env.example`
  - `services/impact-service/vercel.env.example`
- `CANDIDATE_READY` Frontend critical runtime keys are operational (live `/_core/*` and `/_impact/*` rewrites resolve correctly).
- `CANDIDATE_READY` Backend critical runtime keys are operational (live `/health` + `/readiness` contract payloads healthy).
- `CANDIDATE_READY` Impact critical runtime keys are operational (live `/v1/health`, `/v1/falak/health`, `/v1/falak/readiness` healthy).
- `ENV_PENDING` Stripe launch decision and key policy finalized.
- `DONE` Falak dark-launch guard posture explicitly verified live:
  - `route_guard_mode=enabled`
  - `dark_launch=false`
  - `map_route_guard_mode=enabled`
  - `map_dark_launch=false`

### 3.3 Database and Migration Readiness

- `DONE` Impact Postgres extension/migration compatibility confirmed by live Falak readiness:
  - `checks.postgis=ok`
  - `checks.prisma=ok`
  - `checks.migrations=ok`
- `VERIFY_PENDING` Backend migration inventory and latest revision confirmation captured from deployment control plane.
- `DONE` Impact migration/readiness checks confirmed live (`migrations=ok`, `falak_schema=ok`).
- `CANDIDATE_READY` App startup with real database URLs is confirmed by live health/readiness success on core and impact production endpoints.

### 3.4 Production Health Checks

- `REPO_READY` Health/readiness routes are implemented:
  - `/_core/healthz`
  - `/_core/readiness`
  - `/_impact/v1/health`
  - `/_impact/v1/falak/health`
  - `/_impact/v1/falak/readiness`
  - `/admin/runtime-health`
- `DONE` Live production checks on 2026-04-07 passed for:
  - `/_core/healthz`
  - `/_core/readiness`
  - `/_impact/v1/health`
  - `/_impact/v1/falak/health`
  - `/_impact/v1/falak/readiness`

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
- `CANDIDATE_READY` Public unauthenticated GitHub Actions API check could not enumerate workflows for `bobduck123/Anu` (HTTP `404`), so green status must be confirmed from authenticated repo controls (owner/agent with access).

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
- `DONE` Impact typecheck + canonical release test gate completed on candidate:
  - `cmd /c npm run -s typecheck`
  - `cmd /c npm run -s test:release`
- `DONE` Backend health tests completed on candidate.
- `CANDIDATE_READY` Runtime contract verifier completed on candidate (core+impact running locally on required ports).
- `OPS_PENDING` Tag release commit.
- `CANDIDATE_READY` Backend + impact are deployed and serving live traffic (owner attestation + endpoint verification).
- `CANDIDATE_READY` Frontend is deployed with API origins functioning via rewrites (`/_core/*`, `/_impact/*`).
- `DONE` Production health checks re-run and recorded in `docs/program/PROD_GO_LIVE_EVIDENCE_2026-04-07.md`.
- `OPS_PENDING` Announce go-live window complete.

---

## 7) Post-Launch (First 24 Hours)

- `OPS_PENDING` Watch health/readiness every 15 minutes for first 2 hours.
- `OPS_PENDING` Confirm no 5xx spikes on core or impact APIs.
- `OPS_PENDING` Validate critical journeys (auth, community, governance, observatory pages).
- `OPS_PENDING` Capture launch evidence bundle and attach to completion notes.
