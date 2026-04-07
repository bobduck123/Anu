# ANU Comprehensive TODO (Release + Realm + Doctrine)

Date: 2026-04-07  
Status model: `DONE` / `CANDIDATE_READY` / `REPO_READY` / `VERIFY_PENDING` / `ENV_PENDING` / `OPS_PENDING`  
Primary references:
- `docs/program/GO_LIVE_CHECKLIST.md`
- `docs/ANU_REALM_TO_ROUTE_IMPLEMENTATION_PLAN_2026-03-23.md`
- `docs/ANU_UI_EXECUTION_PLAN_2026-03-22.md`
- `docs/ANU_UI_DETAILED_EXECUTION_PLAYBOOK_2026-03-22.md`
- `docs/PARTIAL_CAPABILITY_UPLIFT_SPRINTS_2026-03-23.md`

## Owner Model (Max 4)

- `O1` You (Release lead, final approvals, secrets, production launch control)
- `O2` Agent-Platform (infra/database/runtime contracts/migrations)
- `O3` Agent-Delivery (CI/CD/workflows/deploy sequencing/runbooks)
- `O4` Agent-RealmQA (realm/browser proofs, doctrine/uplift evidence)

Open-item format:
- append `[owner: Ox] [target: YYYY-MM-DD]`

## 0) Current Baseline Snapshot

- `DONE` C3 implementation path is present and wired:
  - `frontend-next/src/components/maps/celestial/celestialPacketAdapter.ts`
  - `frontend-next/src/components/maps/celestial/celestialArchetypes.ts`
  - `frontend-next/src/ui-system/realms/realmRegistry.ts` (`/anu` primary, with `/manara` + `/flora-fauna` aliases -> `celestial-memetics`)
  - `frontend-next/src/app/(app)/universe/page.tsx` imports impact + memetic celestial packet builders
- `DONE` Release branch sync verified on 2026-04-07: `main` is aligned with `origin/main` (`ahead 0`, `behind 0`).
- `DONE` Frontend typecheck/build passed on candidate.
- `DONE` Backend health tests passed on candidate.
- `DONE` Impact-service typecheck passed on candidate.
- `CANDIDATE_READY` Impact-service DB-backed integration suites passed via:
  - `cmd /c npm run -s falak:verify:local`
  - `cmd /c npm run -s falak:sandbox:verify`
- `DONE` Canonical impact-service release test gate is implemented and verified:
  - `cmd /c npm run -s test:release`
  - includes `test:non-db` + `falak:verify:local` + `falak:sandbox:verify`
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

- [x] `DONE` Canonical impact-service release test entrypoint is normalized and verified. `[owner: O2] [target: 2026-04-08]`
  - Implemented scripts in `services/impact-service/package.json`:
    - `test:non-db`
    - `test:release`
  - Verified by running: `cmd /c npm run -s test:release`.

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

- [x] `DONE` Assign rollback owner(s) for frontend/backend/impact and DB backup window owner. `[owner: O1] [target: 2026-04-08]`
  - rollback owners: `O1` (release lead), execution support `O2`
  - DB backup window: `2026-04-08 10:00-12:00` Australia/Sydney
- [x] `DONE` Confirm 3 Vercel projects are live from `main`. `[owner: O2] [target: 2026-04-08]`
  - frontend: `https://maanara.vercel.app`
  - core: `https://anu-back-end.vercel.app`
  - impact: `https://anu-impact-service.vercel.app`
- [x] `DONE` Confirm impact schema/readiness (`falak`, migrations, PostGIS) from live readiness checks. `[owner: O2] [target: 2026-04-08]`
  - `checks.falak_schema=ok`, `checks.migrations=ok`, `checks.postgis=ok`, `migration_failures=0`
- [x] `DONE` Set production env vars for all three projects from example templates (control-plane attestation provided via masked Vercel screenshots on 2026-04-07). `[owner: O1] [target: 2026-04-08]`
- [x] `DONE` Capture backend migration inventory/revision evidence from deployment control plane and verify startup with real URLs. `[owner: O2] [target: 2026-04-08]`
  - 2026-04-07 control-plane SQL probe captured (`db=postgres`, `schema=public`, role `postgres`) plus table inventory.
  - Post-remediation verification confirmed required backend migration objects are now present:
    - `control_token_grant`: `PRESENT`
    - `dumb_dumb_list`: `PRESENT`
    - `dumb_dumb_item`: `PRESENT`
    - `dumb_dumb_purchase`: `PRESENT`
- [x] `DONE` Confirm production health checks pass post-deploy (`/_core/*`, `/_impact/*`, `/admin/runtime-health` contract paths). `[owner: O3] [target: 2026-04-08]`
- [x] `DONE` Confirm all M0-M5 GitHub workflows are green on release branch head. `[owner: O3] [target: 2026-04-08]`
  - owner attestation captured on 2026-04-07 from authenticated GitHub checks UI.
- [ ] `OPS_PENDING` Complete release-manager launch sequence (tag, announce, and capture final release notice). `[owner: O1] [target: 2026-04-08]`
  - deploy + health re-check steps are already evidenced as complete.

---

## 3) P1 Realm Track Evidence Closure (Post-C3 Hygiene)

- [x] `DONE` Gate B browser proofs captured for canonical realm routes: `[owner: O4] [target: 2026-04-09]`
  - evidence: `docs/program/REALM_GATE_B_C_BROWSER_EVIDENCE_2026-04-07.md`
  - Labyrinth: `/governance/model-registry`
  - Earth: `/actions`, `/events`, `/impact`
  - Celestial: `/community`, `/constellations`
- [x] `DONE` Gate C degradation/accessibility evidence captured across browser proof + automated reduced-motion emulation checks: `[owner: O4] [target: 2026-04-09]`
  - evidence: `docs/program/REALM_GATE_B_C_BROWSER_EVIDENCE_2026-04-07.md`
  - Celestial manual 2D toggle + non-starfield inspectability verified
  - Celestial reduced-motion auto-fallback emulation verified in tests:
    - `src/test/communityPage.test.tsx`
    - `src/test/constellationsPage.test.tsx`
  - Earth utility/list continuity verified
  - Labyrinth keyboard legibility verified
- [x] `DONE` Add/refresh tests specifically asserting C3 memetic route continuity: `[owner: O4] [target: 2026-04-09]`
  - `src/test/memeticRouteContinuity.test.ts`
  - `/anu`
  - `/anu/pools/[poolId]`
  - `/anu/channels/[channelId]`
- [ ] `CANDIDATE_READY` Keep naming reconciliation current when celestial primitives evolve (plan now aligned to packet-builder reality). `[owner: O4] [target: 2026-04-09]`

---

## 4) P1/P2 Doctrine + Uplift Alignment Tasks

- [ ] `VERIFY_PENDING` Validate Workstream A outputs against execution-plan acceptance (lab route + pattern-bank manifest + source provenance completeness). `[owner: O4] [target: 2026-04-10]`
- [ ] `VERIFY_PENDING` Close remaining Workstream D/F parity checks: `[owner: O4] [target: 2026-04-10]`
  - subsystem chamber consistency (`profile`, microcosm-adjacent surfaces)
  - operational observatory readability/semantic hierarchy (`admin`, `governance`, `organizer`)
- [ ] `VERIFY_PENDING` Execute and evidence Partial Capability Uplift Sprint 2 goals (public narrative/legibility spine across at least three routes). `[owner: O4] [target: 2026-04-10]`
- [ ] `VERIFY_PENDING` Execute Sprint 3 tenant semantics/threshold clarity outcomes (manifest + entry/profile threshold language). `[owner: O4] [target: 2026-04-10]`
- [ ] `VERIFY_PENDING` Execute Sprint 4 knowledge-to-action connectors (education/map detail to action/community/governance routes). `[owner: O4] [target: 2026-04-10]`

---

## 5) Exit Criteria For Desired State

- [x] All P0 blockers clear (`frontend test:ci`, canonical impact-service release test command, runtime contract verifier, production `/v1/health` live). `[owner: O1] [target: 2026-04-08]`
- [ ] Go-live board has no unresolved `VERIFY_PENDING` items that are code-verifiable on candidate/staging. `[owner: O1] [target: 2026-04-10]`
- [ ] Remaining items are only explicit `ENV_PENDING`/`OPS_PENDING` with named owners and dates. `[owner: O1] [target: 2026-04-10]`
- [ ] Realm plan evidence gates (A/B/C) are current and linked to reproducible commands/artifacts. `[owner: O4] [target: 2026-04-10]`
