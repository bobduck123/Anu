# M2 Queue — Primitive Consolidation

Status legend:
- `DONE` completed in this implementation pass
- `DEFERRED` planned for next pass

## Queue

| ID | Task | Owner | Status | Evidence |
|---|---|---|---|---|
| A2-001 | Publish ANU primitive manifest aligned to Phase 2 classes | FE | DONE | `frontend-next/src/ui-system/anu/primitiveManifest.ts` |
| A2-002 | Extend shell metadata contract with primitive manifest and adoption summary | FE/DATA | DONE | `frontend-next/src/ui-system/shell/shellMetadata.ts`, `frontend-next/src/app/api/sdk/shell-metadata/route.ts` |
| A2-003 | Add shell primitives API endpoint for machine-readable contract access | FE/API | DONE | `frontend-next/src/app/api/sdk/shell-primitives/route.ts` |
| A2-004 | Consolidate hero metric grid into shared primitive | FE | DONE | `frontend-next/src/ui-system/anu/surfacePrimitives.tsx` (`AnuHeroMetricsRail`) |
| A2-005 | Adopt consolidated hero metric primitive across >=3 routes | FE | DONE | `frontend-next/src/app/(app)/home/page.tsx`, `frontend-next/src/app/auth/page.tsx`, `frontend-next/src/app/(app)/sandbox/page.tsx`, `frontend-next/src/app/(public)/contact/page.tsx` |
| A2-006 | Canonicalize lab entry by redirecting legacy sandbox lab route | FE | DONE | `frontend-next/src/app/(app)/sandbox/ui-lab/page.tsx` |
| A2-007 | Add M2 tests for primitive manifest and API contracts | FE/SECQA | DONE | `frontend-next/src/test/primitiveManifest.test.ts`, `frontend-next/src/test/shellPrimitivesApiRoute.test.ts`, updated `shellMetadataApiRoute.test.ts` |
| A2-008 | Add CI gate for primitive consolidation contract checks | PLAT | DONE | `.github/workflows/m2-primitive-consolidation-gates.yml` |

## Completion criteria

- primitive families are explicitly documented in code
- shell metadata includes primitive adoption evidence
- at least 3 routes consume a shared upgraded primitive from this phase
- primitive contracts are queryable through API routes
- CI includes M2 primitive-contract checks
