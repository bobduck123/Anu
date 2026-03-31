# ANU Go-Live Checklist (Staging → Production)

Last updated: 2026-04-01
Scope: M0–M5 runtime contracts + ANU UI rollout

---

## 0) Release decision gate (must be true first)

- [ ] M0–M5 implementation merged to release branch
- [ ] `docs/program/M0_M5_CHANGE_SUMMARY.md` reviewed
- [ ] `docs/program/M0_M5_AGGRESSIVE_MOCKDB_TEST_REPORT.md` reviewed
- [ ] Rollback owner assigned (backend + impact + frontend)
- [ ] DB backup/restore runbook prepared

---

## 1) Hosting architecture requirements

- [ ] **3 Vercel projects** created from same repo:
  - [ ] `frontend-next`
  - [ ] `flora-fauna/backend`
  - [ ] `services/impact-service`
- [ ] **1 shared Postgres target** (Supabase recommended) available
- [ ] Required schemas exist: `public`, `falak`
- [ ] DNS and TLS active for frontend domain

---

## 2) Staging environment requirements (hybrid OSS track)

Use local/container staging for adversarial + integration checks.

### 2.1 Bring up staging infra

```bash
cd infra/staging
docker compose up -d
```

- [ ] Postgres healthy on `localhost:5432`
- [ ] Redis healthy on `localhost:6379`
- [ ] MinIO healthy on `http://localhost:9000`
- [ ] LGTM/Grafana healthy on `http://localhost:3001`

### 2.2 Configure service envs (staging values)

- [ ] Frontend env set (Supabase URL/key + API origins)
- [ ] Core backend env set (secrets + DB + CORS)
- [ ] Impact-service env set (`DATABASE_URL`, `DIRECT_URL`, JWT/CORS/FALAK)

### 2.3 Deploy/boot staging apps

- [ ] Frontend deployable from `frontend-next`
- [ ] Backend deployable from `flora-fauna/backend`
- [ ] Impact deployable from `services/impact-service`

### 2.4 Contract verification gates (no skips)

```bash
cd scripts
python verify-env-contract.py
python verify-runtime-contracts.py
python smoke-core-runtime.py
```

- [ ] Env contract check passed
- [ ] Runtime contract check passed
- [ ] Core smoke passed

### 2.5 Full service test gates

```bash
# backend
cd flora-fauna/backend
python -m pytest tests/test_health.py -q

# impact-service
cd ../../services/impact-service
npm test -- --runInBand tests/falak/falakService.test.ts tests/falak/falakSessionRoute.test.ts tests/manaraFeedModeRoutes.test.ts

# frontend
cd ../../frontend-next
npm run typecheck
npx vitest run src/test/shellMetadataApiRoute.test.ts src/test/chamberMetadataApiRoute.test.ts src/test/communityCommonsMetadataApiRoute.test.ts src/test/observatoryMetadataApiRoute.test.ts
npm run build
```

- [ ] Backend tests passed
- [ ] Impact-service tests passed
- [ ] Frontend typecheck/tests/build passed

---

## 3) Production environment requirements

## 3.1 Vercel project setup

- [ ] Project A: `frontend-next` (Node `24.x`)
- [ ] Project B: `flora-fauna/backend` (Python `3.12`, `vercel_app.py` entry)
- [ ] Project C: `services/impact-service` (Node `24.x`, API entrypoints)

## 3.2 Required environment variables

Set from these templates:
- `frontend-next/vercel.env.example`
- `flora-fauna/backend/vercel.env.example`
- `services/impact-service/vercel.env.example`

Critical required keys:
- [ ] Frontend: `CORE_API_ORIGIN`, `IMPACT_API_ORIGIN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Backend: `DATABASE_URL`, `SECRET_KEY`, `JWT_SECRET_KEY`, `PUBLIC_JWT_SECRET_KEY`, `CONTROL_JWT_SECRET_KEY`, `CONTROL_PLANE_SHARED_SECRET`
- [ ] Impact: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET_KEY`, `CORS_ORIGINS`

Stripe launch gating:
- [ ] If Stripe not launching yet, keep infra flags in safe mode as documented
- [ ] If Stripe launching, all Stripe env vars must be real (no TODO placeholders)

Falak dark launch gating:
- [ ] Keep Falak guards in conservative mode until explicit rollout decision

## 3.3 Database and migration readiness

- [ ] Confirm Postgres target supports required extensions/migration path
- [ ] Apply backend migrations successfully
- [ ] Apply Prisma migrations successfully
- [ ] Confirm app startup with real `DATABASE_URL` / `DIRECT_URL`

## 3.4 Production health checks

After deployment, all must pass:

- [ ] `/_core/healthz`
- [ ] `/_core/readiness`
- [ ] `/_impact/v1/health`
- [ ] `/_impact/v1/falak/health`
- [ ] `/_impact/v1/falak/readiness`
- [ ] `/admin/runtime-health` loads and reports expected statuses

---

## 4) CI/CD and quality gates

All workflows green on release branch:

- [ ] `.github/workflows/m0-runtime-contracts.yml`
- [ ] `.github/workflows/m1-shell-lab-gates.yml`
- [ ] `.github/workflows/m2-primitive-consolidation-gates.yml`
- [ ] `.github/workflows/m3-chamber-rollout-gates.yml`
- [ ] `.github/workflows/m4-community-rollout-gates.yml`
- [ ] `.github/workflows/m5-trust-observatory-gates.yml`

---

## 5) Operational hardening requirements

- [ ] Durable object storage selected for media (avoid relying on ephemeral `/tmp`)
- [ ] Error monitoring enabled (Sentry or equivalent)
- [ ] API and function logs observable
- [ ] On-call alert routing configured for core health/readiness failures
- [ ] Runbook for DB rollback + config rollback linked in release notes

---

## 6) Final launch command checklist (release manager)

```bash
# sanity checks pre-tag
cd frontend-next && npm run typecheck && npm run build
cd ../services/impact-service && npm run typecheck && npm run test
cd ../flora-fauna/backend && python -m pytest tests/test_health.py -q
cd ../../scripts && python verify-runtime-contracts.py
```

- [ ] Tag release commit
- [ ] Deploy backend + impact first
- [ ] Deploy frontend after API origins are confirmed
- [ ] Re-run production health checks
- [ ] Announce go-live window complete

---

## 7) Post-launch (first 24 hours)

- [ ] Watch health/readiness every 15 minutes for first 2 hours
- [ ] Confirm no 5xx spikes on core or impact APIs
- [ ] Validate critical journeys: auth, community, governance, observatory pages
- [ ] Capture launch evidence bundle and attach to completion notes
