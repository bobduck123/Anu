# M1 Completion Report — Shell + Lab Foundation

Date: 2026-04-01
Contract version: `m1.2026-04-01`

## Completed work

1. Promoted canonical internal lab route:
   - `/lab`
   - same sandbox steward gating as `/sandbox/ui-lab`

2. Published shell metadata contract endpoint:
   - `GET /api/sdk/shell-metadata`
   - includes:
     - shell token groups
     - primitive manifest and counts
     - pattern experiment count
     - realm route registry and surface definitions

3. Refactored realm registry to expose a serializable route catalog:
   - `REALM_ROUTE_REGISTRY`
   - now includes `/lab` under internal lab realm surface

4. Added targeted M1 tests:
   - realm registry shell mapping validation
   - API route payload shape validation

5. Added CI workflow gate for shell/lab phase checks:
   - typecheck + targeted vitest suite

## Artifacts

- `frontend-next/src/app/(app)/lab/page.tsx`
- `frontend-next/src/app/api/sdk/shell-metadata/route.ts`
- `frontend-next/src/ui-system/shell/shellMetadata.ts`
- `frontend-next/src/ui-system/realms/realmRegistry.ts`
- `frontend-next/src/test/realmRegistryShellMetadata.test.ts`
- `frontend-next/src/test/shellMetadataApiRoute.test.ts`
- `.github/workflows/m1-shell-lab-gates.yml`
- `docs/program/M1_QUEUE.md`

## Validation commands

```bash
cd frontend-next
npm run typecheck
npx vitest run src/test/anuUiLab.test.tsx src/test/realmRegistryShellMetadata.test.ts src/test/shellMetadataApiRoute.test.ts
npm run build
```

## Notes

- Existing ANU token staging in `globals.css` was preserved and promoted as the M1 baseline.
- Visual regression automation is staged for Phase 2 once e2e matrix stabilizes around the new canonical lab route.
