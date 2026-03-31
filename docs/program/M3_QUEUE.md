# M3 Queue — Subsystem Chamber Rollout

Status legend:
- `DONE` completed in this implementation pass
- `DEFERRED` planned for next pass

## Queue

| ID | Task | Owner | Status | Evidence |
|---|---|---|---|---|
| A3-001 | Define subsystem chamber protocol manifest (modules + rules) | FE/ARCH | DONE | `frontend-next/src/ui-system/anu/chamberManifest.ts` |
| A3-002 | Publish chamber protocol API contract for SDK/runtime consumers | FE/API | DONE | `frontend-next/src/app/api/sdk/chamber-metadata/route.ts` |
| A3-003 | Extend shell metadata contract with chamber coverage and module metadata | FE/DATA | DONE | `frontend-next/src/ui-system/shell/shellMetadata.ts` |
| A3-004 | Add explicit realm registry surface for private chamber routes | FE | DONE | `frontend-next/src/ui-system/realms/realmRegistry.ts` (`private-chambers`) |
| A3-005 | Consolidate chamber metric layout primitive for profile/team/microcosm routes | FE | DONE | `frontend-next/src/ui-system/anu/surfacePrimitives.tsx` (`AnuChamberMetricsRail`) |
| A3-006 | Adopt chamber metric primitive across chamber routes | FE | DONE | `frontend-next/src/app/(app)/profile/page.tsx`, `frontend-next/src/components/teams/TeamsView.tsx`, `frontend-next/src/app/(app)/community/microcosms/[id]/page.tsx` |
| A3-007 | Add M3 contract and chamber-route tests | FE/SECQA | DONE | `frontend-next/src/test/chamberManifest.test.ts`, `frontend-next/src/test/chamberMetadataApiRoute.test.ts`, updates in `realmRegistryShellMetadata.test.ts`, `shellMetadataApiRoute.test.ts`, `anuSurfacePrimitives.test.tsx` |
| A3-008 | Add M3 chamber rollout CI gate workflow | PLAT | DONE | `.github/workflows/m3-chamber-rollout-gates.yml` |

## Completion criteria

- chamber modules and protocol rules are explicit and machine-readable
- shell metadata includes chamber coverage evidence
- private chamber routes are first-class in realm registry mapping
- at least 3 chamber routes share an upgraded chamber primitive
- M3 chamber checks are enforced in CI
