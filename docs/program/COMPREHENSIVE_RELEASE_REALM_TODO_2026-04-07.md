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
- `CANDIDATE_READY` Impact-service DB-backed integration suites passed via:
  - `cmd /c npm run -s falak:verify:local`
  - `cmd /c npm run -s falak:sandbox:verify`
- `VERIFY_PENDING` Default `cmd /c npm run -s test` still needs DB env normalization to include DB suites in one pass.
- `CANDIDATE_READY` `verify-env-contract.py` + `smoke-core-runtime.py` passed locally.
- `CANDIDATE_READY` `verify-runtime-contracts.py` passed on candidate with local core (`5000`) + impact (`5003`) services running.
- `DONE` Live production endpoint audit (2026-04-07): runtime-contract endpoints passed on both direct and frontend rewrite paths (`5/5` required checks).
- `CANDIDATE_READY` Earlier same-day transient `404` on impact `/v1/health` was cleared on re-check; latest verification is green.
- `DONE` Evidence bundle updated: `docs/program/PROD_GO_LIVE_EVIDENCE_2026-04-07.md`.
- `DONE` Frontend full CI matrix passed (`72` suites / `225` tests via `npm run -s test:ci`).

---

## 1) P0 Release Blockers (Must Clear Before RC Sign-Off)

- [x] `DONE` Frontend CI failures fixed and `npm run -s test:ci` restored to green.
  - Updated tests: `actionsPage`, `eventsPage`, `api`, `authPage`, `curriculumLayerView`, `earthEntry`, `impactPage`, `modelRegistryPage`, `ui-patterns`.

- [ ] `VERIFY_PENDING` Normalize impact-service test entrypoint so DB-backed suites run in the default command path.
  - Keep dedicated DB verifications green (`falak:verify:local`, `falak:sandbox:verify`).
  - Decide and implement one canonical release command:
    - either set DB env in `npm test` path, or
    - codify dedicated verify commands as release gate and document that `npm test` is non-DB by default.
  - Target: zero ambiguity on required command for release sign-off.

- [x] `DONE` Production `/v1/health` endpoint and rewrite checks verified live (`200` with contract fields) on 2026-04-07.

- [x] `CANDIDATE_READY` Bring candidate services up and rerun runtime contract verifier.
  - Required endpoints:
    - `http://127.0.0.1:5000/health`
    - `http://127.0.0.1:5000/readiness`
    - `http://127.0.0.1:5003/v1/health`
    - `http://127.0.0.1:5003/v1/falak/health`
    - `http://127.0.0.1:5003/v1/falak/readiness`
  - Verified: `python scripts/verify-runtime-contracts.py` passed on 2026-04-07.

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

- [ ] All P0 blockers clear (`frontend test:ci`, canonical impact-service release test command, runtime contract verifier, production `/v1/health` live).
- [ ] Go-live board has no unresolved `VERIFY_PENDING` items that are code-verifiable on candidate/staging.
- [ ] Remaining items are only explicit `ENV_PENDING`/`OPS_PENDING` with named owners and dates.
- [ ] Realm plan evidence gates (A/B/C) are current and linked to reproducible commands/artifacts.
