# M5 Queue — Trust and Observatory Surfaces

Status legend:
- `DONE` completed in this implementation pass
- `DEFERRED` planned for next pass

## Queue

| ID | Task | Owner | Status | Evidence |
|---|---|---|---|---|
| A5-001 | Define trust + observatory protocol manifest (modules + rules) | FE/ARCH | DONE | `frontend-next/src/ui-system/anu/observatoryManifest.ts` |
| A5-002 | Publish observatory metadata API contract | FE/API | DONE | `frontend-next/src/app/api/sdk/observatory-metadata/route.ts` |
| A5-003 | Extend shell metadata contract with observatory block | FE/DATA | DONE | `frontend-next/src/ui-system/shell/shellMetadata.ts` |
| A5-004 | Consolidate labyrinth observatory stat primitive for trust/admin/governance surfaces | FE | DONE | `frontend-next/src/ui-system/realms/labyrinth/ObservatoryStatsRail.tsx` |
| A5-005 | Adopt observatory stat primitive across trust + governance routes | FE | DONE | `frontend-next/src/app/(public)/transparency/page.tsx`, `frontend-next/src/app/(public)/docs/page.tsx`, `frontend-next/src/app/(app)/governance/page.tsx` |
| A5-006 | Upgrade admin runtime health into ANU observatory grammar | FE/OPS | DONE | `frontend-next/src/app/(app)/admin/runtime-health/page.tsx` |
| A5-007 | Add M5 tests for manifest/API/metadata integration + observatory route coverage | FE/SECQA | DONE | `frontend-next/src/test/observatoryManifest.test.ts`, `frontend-next/src/test/observatoryMetadataApiRoute.test.ts`, `frontend-next/src/test/observatoryStatsRail.test.tsx`, updated `shellMetadataApiRoute.test.ts`, `runtimeHealthPage.test.tsx` |
| A5-008 | Add M5 trust-observatory CI gate workflow | PLAT | DONE | `.github/workflows/m5-trust-observatory-gates.yml` |

## Completion criteria

- trust + observatory protocol is explicit and machine-readable
- shell metadata includes observatory contract evidence
- trust/governance routes share observatory stats primitive
- admin runtime diagnostics follows ANU observatory scan grammar
- M5 contract + route tests run in CI
