# M4 Queue — Community Commons Rollout

Status legend:
- `DONE` completed in this implementation pass
- `DEFERRED` planned for next pass

## Queue

| ID | Task | Owner | Status | Evidence |
|---|---|---|---|---|
| A4-001 | Define community commons protocol manifest (modules + rules) | FE/ARCH | DONE | `frontend-next/src/ui-system/anu/communityManifest.ts` |
| A4-002 | Publish community commons metadata API contract | FE/API | DONE | `frontend-next/src/app/api/sdk/community-commons-metadata/route.ts` |
| A4-003 | Extend shell metadata contract with community block | FE/DATA | DONE | `frontend-next/src/ui-system/shell/shellMetadata.ts` |
| A4-004 | Consolidate community status cards into reusable primitive | FE | DONE | `frontend-next/src/ui-system/anu/surfacePrimitives.tsx` (`AnuCommonsStatusRail`) |
| A4-005 | Adopt consolidated status rail in community browse frame | FE | DONE | `frontend-next/src/app/(app)/community/page.tsx` |
| A4-006 | Preserve explicit live/cached/fallback publication language in top route chrome | FE/SECQA | DONE | `frontend-next/src/app/(app)/community/page.tsx` (`feedStateLabel`, `publicationStateLabel`, `trustedSignalsLabel`) |
| A4-007 | Add M4 tests for community manifest + metadata route + shell metadata integration | FE/SECQA | DONE | `frontend-next/src/test/communityManifest.test.ts`, `frontend-next/src/test/communityCommonsMetadataApiRoute.test.ts`, updated `shellMetadataApiRoute.test.ts`, `anuSurfacePrimitives.test.tsx` |
| A4-008 | Add M4 community rollout CI gate workflow | PLAT | DONE | `.github/workflows/m4-community-rollout-gates.yml` |

## Completion criteria

- community commons protocol is explicit and machine-readable
- shell metadata includes community contract evidence
- community top frame uses shared status primitive rather than one-off panels
- publication and fallback truth labels remain explicit in route chrome
- CI includes M4 community rollout contract checks
