# M0 → M5 Change Summary

Date: 2026-04-01
Scope: Shell/Lab-first ANU execution track with runtime contract hardening and phased UI system rollout.

## Program outcome snapshot

- Runtime contract layer established and verified (M0)
- Shell/lab foundation made canonical and machine-readable (M1)
- Primitive consolidation codified with adoption evidence (M2)
- Subsystem chamber doctrine and route wiring implemented (M3)
- Community commons doctrine and status-language systemized (M4)
- Trust and observatory surfaces normalized with shared instrumentation grammar (M5)

## Phase-by-phase summary

| Phase | Contract version | Core outcome | Key artifacts |
|---|---|---|---|
| M0 | `m0.2026-04-01` | Core + impact health/readiness contract standardized and documented | `contracts/health-readiness.contract.schema.json`, `docs/M0_RUNTIME_CONTRACT.md`, `scripts/verify-runtime-contracts.py`, `/admin/runtime-health` route |
| M1 | `m1.2026-04-01` | Canonical lab route + shell metadata API + route registry publication | `frontend-next/src/app/(app)/lab/page.tsx`, `/api/sdk/shell-metadata`, `REALM_ROUTE_REGISTRY`, M1 gate workflow |
| M2 | `m2.2026-04-01` | Primitive consolidation manifest and API + shared route adoption proof | `primitiveManifest.ts`, `/api/sdk/shell-primitives`, `AnuHeroMetricsRail`, `/sandbox/ui-lab -> /lab` redirect |
| M3 | `m3.2026-04-01` | Chamber module doctrine and chamber-route realm integration | `chamberManifest.ts`, `/api/sdk/chamber-metadata`, `private-chambers` realm entry, `AnuChamberMetricsRail` |
| M4 | `m4.2026-04-01` | Community commons doctrine and reusable status rail | `communityManifest.ts`, `/api/sdk/community-commons-metadata`, `AnuCommonsStatusRail`, shell metadata community block |
| M5 | `m5.2026-04-01` | Trust + observatory doctrine with shared observatory instrumentation and admin runtime observability grammar | `observatoryManifest.ts`, `/api/sdk/observatory-metadata`, `ObservatoryStatsRail`, trust/governance stat rail adoption |

## New/expanded metadata endpoints

- `GET /api/sdk/shell-metadata` (M1→M5 expanded)
- `GET /api/sdk/shell-primitives` (M2)
- `GET /api/sdk/chamber-metadata` (M3)
- `GET /api/sdk/community-commons-metadata` (M4)
- `GET /api/sdk/observatory-metadata` (M5)

## Shared primitive consolidation progression

- M2: `AnuHeroMetricsRail`
- M3: `AnuChamberMetricsRail`
- M4: `AnuCommonsStatusRail`
- M5: `ObservatoryStatsRail`

## Realm and route system progression

- `REALM_ROUTE_REGISTRY` externalized for metadata consumers
- Canonical internal lab surface includes `/lab`
- Chamber-surface mapping introduced via `private-chambers` for:
  - `/profile`
  - `/teams`
  - `/community/microcosms/*`

## CI gate progression

- `.github/workflows/m0-runtime-contracts.yml`
- `.github/workflows/m1-shell-lab-gates.yml`
- `.github/workflows/m2-primitive-consolidation-gates.yml`
- `.github/workflows/m3-chamber-rollout-gates.yml`
- `.github/workflows/m4-community-rollout-gates.yml`
- `.github/workflows/m5-trust-observatory-gates.yml`

## Verification status at handoff

- Frontend M1→M5 matrix: passing
- Runtime endpoint and contract checks: implemented and passing with active verification commands
- Route build output includes all M5 metadata endpoints and canonical ANU phase routes

## Related completion docs

- `docs/program/M0_COMPLETION_REPORT.md`
- `docs/program/M1_COMPLETION_REPORT.md`
- `docs/program/M2_COMPLETION_REPORT.md`
- `docs/program/M3_COMPLETION_REPORT.md`
- `docs/program/M4_COMPLETION_REPORT.md`
- `docs/program/M5_COMPLETION_REPORT.md`
