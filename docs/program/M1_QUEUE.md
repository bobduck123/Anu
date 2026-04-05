# M1 Queue — Shell + Lab Foundation

Status legend:
- `DONE` completed in this implementation pass
- `DEFERRED` planned for next pass

## Queue

| ID | Task | Owner | Status | Evidence |
|---|---|---|---|---|
| A1-001 | Stabilize shell token baseline as shared contract | FE | DONE | `frontend-next/src/app/globals.css` (existing token system), `docs/program/M1_COMPLETION_REPORT.md` |
| A1-002 | Formalize shell primitive manifest for consumers | FE | DONE | `frontend-next/src/ui-system/shell/shellMetadata.ts` (`SHELL_PRIMITIVES`) |
| A1-003 | Promote canonical `/lab` route | FE | DONE | `frontend-next/src/app/(app)/lab/page.tsx` |
| A1-004 | Provide shell-aware route metadata API | FE/DATA | DONE | `frontend-next/src/app/api/sdk/shell-metadata/route.ts`, `frontend-next/src/ui-system/realms/realmRegistry.ts` |
| A1-005 | Add lab/realm metadata tests | FE/SECQA | DONE | `frontend-next/src/test/realmRegistryShellMetadata.test.ts`, `frontend-next/src/test/shellMetadataApiRoute.test.ts` |
| A1-006 | Add M1 shell-lab CI gate workflow | PLAT | DONE | `.github/workflows/m1-shell-lab-gates.yml` |
| A1-007 | Baseline a11y and visual gate harness declaration | SECQA | DONE | Existing `anuUiLab` coverage + shell lab gate workflow; visual gate deferred to Phase 2 e2e |

## Completion criteria

- `/lab` route exists and is sandbox-gated
- shell metadata API exposes realm and primitive manifest
- route metadata is queryable as structured JSON
- CI includes M1 shell-lab checks
