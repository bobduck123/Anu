# PR Ready Summary — M0 to M5 (Shell/Lab → Trust/Observatory)

## Title
ANU Program Delivery: Runtime Contracts + UI System Rollout (M0–M5)

## Scope
This PR delivers the full M0→M5 track:

- **M0** Runtime truth and contract repair
- **M1** Shell + Lab foundation and canonical routeing
- **M2** Primitive consolidation with machine-readable adoption contracts
- **M3** Subsystem chamber rollout
- **M4** Community commons rollout
- **M5** Trust and observatory surface rollout

## What changed

### M0 — Runtime contract hardening
- Standardized health/readiness contract shape for core backend and impact service
- Added runtime contract schema + docs + verification scripts
- Added staging compose support and M0 CI gate
- Added admin diagnostics route: `/admin/runtime-health`

### M1 — Shell/lab foundation
- Introduced canonical lab route: `/lab`
- Added shell metadata API: `/api/sdk/shell-metadata`
- Published route registry for metadata consumers
- Added M1 queue/report + CI gate

### M2 — Primitive consolidation
- Added primitive manifest contract (`primitiveManifest.ts`)
- Added primitive API: `/api/sdk/shell-primitives`
- Consolidated shared hero metrics primitive (`AnuHeroMetricsRail`)
- Canonicalized `/sandbox/ui-lab` as redirect to `/lab`
- Added M2 queue/report + CI gate

### M3 — Chamber rollout
- Added chamber manifest contract (`chamberManifest.ts`)
- Added chamber API: `/api/sdk/chamber-metadata`
- Extended shell metadata with chamber block
- Added `private-chambers` realm mapping
- Consolidated chamber metric primitive (`AnuChamberMetricsRail`) on profile/team/microcosm routes
- Added M3 queue/report + CI gate

### M4 — Community commons rollout
- Added community manifest contract (`communityManifest.ts`)
- Added community API: `/api/sdk/community-commons-metadata`
- Extended shell metadata with community block
- Consolidated community status primitive (`AnuCommonsStatusRail`) in `/community`
- Preserved explicit live/cached/demo/fallback publication language
- Added M4 queue/report + CI gate

### M5 — Trust + observatory rollout
- Added observatory manifest contract (`observatoryManifest.ts`)
- Added observatory API: `/api/sdk/observatory-metadata`
- Extended shell metadata with observatory block
- Added shared observatory stats primitive (`ObservatoryStatsRail`)
- Applied observatory stat rail in `/transparency`, `/docs`, `/governance`
- Upgraded `/admin/runtime-health` to ANU observatory grammar
- Added M5 queue/report + CI gate

## New contract/metadata endpoints

- `GET /api/sdk/shell-metadata`
- `GET /api/sdk/shell-primitives`
- `GET /api/sdk/chamber-metadata`
- `GET /api/sdk/community-commons-metadata`
- `GET /api/sdk/observatory-metadata`

## Validation evidence

### Phase verification
- M1 through M5 frontend typecheck/tests/build all passing in dedicated runs.

### Aggressive repeatability pass (mock-db full flows)
- **5 consecutive full-flow runs** completed successfully.
- Coverage per run:
  1. Backend health contract tests using `sqlite:///:memory:`
  2. Impact-service Falak/Manara tests using seeded in-memory repository
  3. Frontend M1–M5 matrix + production build
- Aggregate across 5 runs:
  - Backend: **40/40** tests passed
  - Impact service: **270/270** tests passed
  - Frontend: **180/180** tests passed
  - Frontend typecheck: **5/5** passes
  - Frontend builds: **5/5** passes

## Delivery artifacts
- Phase queues/reports:
  - `docs/program/M0_QUEUE.md` … `docs/program/M5_QUEUE.md`
  - `docs/program/M0_COMPLETION_REPORT.md` … `docs/program/M5_COMPLETION_REPORT.md`
- Program-level summaries:
  - `docs/program/M0_M5_CHANGE_SUMMARY.md`
  - `docs/program/M0_M5_AGGRESSIVE_MOCKDB_TEST_REPORT.md`

## Notes
- Vite CJS warning appears during test runs; non-blocking.
- Universe track remains isolated/deferred per doctrine and was not casually restyled.
