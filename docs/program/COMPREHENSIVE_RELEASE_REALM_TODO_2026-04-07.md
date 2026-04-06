# ANU Comprehensive TODO (Release + Realm + Doctrine)

Date: 2026-04-07  
Status model: `DONE` / `CANDIDATE_READY` / `REPO_READY` / `VERIFY_PENDING` / `ENV_PENDING` / `OPS_PENDING`  
Primary references:
- `docs/program/GO_LIVE_CHECKLIST.md`
- `docs/ANU_REALM_TO_ROUTE_IMPLEMENTATION_PLAN_2026-03-23.md`
- `docs/ANU_UI_EXECUTION_PLAN_2026-03-22.md`
- `docs/ANU_UI_DETAILED_EXECUTION_PLAYBOOK_2026-03-22.md`
- `docs/PARTIAL_CAPABILITY_UPLIFT_SPRINTS_2026-03-23.md`

## 0) Current Baseline Snapshot

- `DONE` C3 implementation path is present and wired:
  - `frontend-next/src/components/maps/celestial/celestialPacketAdapter.ts`
  - `frontend-next/src/components/maps/celestial/celestialArchetypes.ts`
  - `frontend-next/src/ui-system/realms/realmRegistry.ts` (`/flora-fauna` -> `celestial-memetics`)
  - `frontend-next/src/app/(app)/universe/page.tsx` imports impact + memetic celestial packet builders
- `DONE` Frontend typecheck/build passed on candidate.
- `DONE` Backend health tests passed on candidate.
- `DONE` Impact-service typecheck passed on candidate.
- `ENV_PENDING` Impact-service full test pass requires DB env for integration suites.
- `CANDIDATE_READY` `verify-env-contract.py` + `smoke-core-runtime.py` passed locally.
- `ENV_PENDING` `verify-runtime-contracts.py` failed because core/impact services were not running on required ports.
- `VERIFY_PENDING` Frontend full CI matrix is red (`11` failed tests across `9` files).

---

## 1) P0 Release Blockers (Must Clear Before RC Sign-Off)

- [ ] `VERIFY_PENDING` Fix frontend CI failures and restore `npm run -s test:ci` to green.
  - `frontend-next/src/test/actionsPage.test.tsx` (`useAuth` provider assumptions)
  - `frontend-next/src/test/eventsPage.test.tsx` (`useAuth` provider assumptions)
  - `frontend-next/src/test/api.test.ts` (auth header expectation mismatch)
  - `frontend-next/src/test/authPage.test.tsx` ("Login" vs current "Log in"/disabled state behavior)
  - `frontend-next/src/test/curriculumLayerView.test.tsx` (suite-level `vi.mock` hoist issue)
  - `frontend-next/src/test/earthEntry.test.tsx` (fallback copy expectation drift)
  - `frontend-next/src/test/impactPage.test.tsx` (copy expectation drift)
  - `frontend-next/src/test/modelRegistryPage.test.tsx` (error-copy expectation drift)
  - `frontend-next/src/test/ui-patterns.test.tsx` (`readableText` expected color outdated)

- [ ] `ENV_PENDING` Resolve impact-service DB-backed integration gating, then rerun full suite.
  - Configure one valid DB path (`DATABASE_URL` / `POSTGRES_PRISMA_URL` / `POSTGRES_URL` and `DIRECT_URL` where required).
  - Re-run: `cmd /c npm run -s test` in `services/impact-service`.
  - Target: `18/18` suites green.

- [ ] `ENV_PENDING` Bring candidate/staging services up and rerun runtime contract verifier.
  - Required endpoints:
    - `http://127.0.0.1:5000/health`
    - `http://127.0.0.1:5000/readiness`
    - `http://127.0.0.1:5003/v1/health`
    - `http://127.0.0.1:5003/v1/falak/health`
    - `http://127.0.0.1:5003/v1/falak/readiness`
  - Re-run: `python scripts/verify-runtime-contracts.py`.

---

## 2) P0/P1 Release Operations Closure (Go-Live Checklist Completion)

- [ ] `ENV_PENDING` Assign rollback owner(s) for frontend/backend/impact and DB backup window owner.
- [ ] `ENV_PENDING` Confirm 3 Vercel projects + shared Postgres target + schema readiness (`public`, `falak`).
- [ ] `ENV_PENDING` Set production env vars for all three projects from example templates.
- [ ] `VERIFY_PENDING` Apply backend + Prisma migrations on target DB and verify app startup with real URLs.
- [ ] `VERIFY_PENDING` Confirm all production health checks pass post-deploy (`/_core/*`, `/_impact/*`, `/admin/runtime-health`).
- [ ] `VERIFY_PENDING` Confirm all M0-M5 GitHub workflows are green on release branch head.
- [ ] `OPS_PENDING` Complete release-manager launch sequence (tag, deploy backend/impact, deploy frontend, re-check health, announce).

---

## 3) P1 Realm Track Evidence Closure (Post-C3 Hygiene)

- [ ] `VERIFY_PENDING` Gate B browser proofs captured for canonical realm routes:
  - Labyrinth: `/governance/model-registry`
  - Earth: `/actions`, `/events`, `/impact`
  - Celestial: `/community`, `/constellations`
- [ ] `VERIFY_PENDING` Gate C degradation/accessibility evidence captured:
  - Celestial auto fallback + manual 2D toggle
  - Earth utility/list task continuity
  - Labyrinth keyboard/reduced-motion legibility
- [ ] `VERIFY_PENDING` Add/refresh tests specifically asserting C3 memetic route continuity:
  - `/flora-fauna`
  - `/flora-fauna/memes/[memeId]`
  - `/flora-fauna/channels/[channelId]`
- [ ] `CANDIDATE_READY` Keep naming reconciliation current when celestial primitives evolve (plan now aligned to packet-builder reality).

---

## 4) P1/P2 Doctrine + Uplift Alignment Tasks

- [ ] `VERIFY_PENDING` Validate Workstream A outputs against execution-plan acceptance (lab route + pattern-bank manifest + source provenance completeness).
- [ ] `VERIFY_PENDING` Close remaining Workstream D/F parity checks:
  - subsystem chamber consistency (`profile`, microcosm-adjacent surfaces)
  - operational observatory readability/semantic hierarchy (`admin`, `governance`, `organizer`)
- [ ] `VERIFY_PENDING` Execute and evidence Partial Capability Uplift Sprint 2 goals (public narrative/legibility spine across at least three routes).
- [ ] `VERIFY_PENDING` Execute Sprint 3 tenant semantics/threshold clarity outcomes (manifest + entry/profile threshold language).
- [ ] `VERIFY_PENDING` Execute Sprint 4 knowledge-to-action connectors (education/map detail to action/community/governance routes).

---

## 5) Exit Criteria For Desired State

- [ ] All P0 blockers clear (`frontend test:ci`, impact full tests, runtime contract verifier).
- [ ] Go-live board has no unresolved `VERIFY_PENDING` items that are code-verifiable on candidate/staging.
- [ ] Remaining items are only explicit `ENV_PENDING`/`OPS_PENDING` with named owners and dates.
- [ ] Realm plan evidence gates (A/B/C) are current and linked to reproducible commands/artifacts.
