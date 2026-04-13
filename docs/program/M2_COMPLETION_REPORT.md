# M2 Completion Report — Primitive Consolidation

Date: 2026-04-01
Contract version: `m2.2026-04-01`

## Completed work

1. Implemented a machine-readable primitive manifest for ANU Phase 2 classes:
   - hero frame
   - section header
   - primary/secondary CTA families
   - panel variants
   - chip variants
   - filter/control bars
   - instrumentation cards
   - chamber cards

2. Upgraded shell metadata contract to include primitive-level evidence:
   - primitive IDs
   - full primitive manifest
   - shared route adoption summary

3. Added dedicated primitives API route:
   - `GET /api/sdk/shell-primitives`

4. Consolidated hero metric grid anatomy into a shared primitive:
   - `AnuHeroMetricsRail`
   - adopted in 4 routes:
     - `/home`
     - `/auth`
     - `/sandbox`
     - `/contact`

5. Canonicalized lab route entry:
   - `/sandbox/ui-lab` now redirects to `/lab`

6. Added M2 verification tests:
   - primitive manifest coverage + adoption floor
   - shell primitives API contract
   - updated shell metadata API contract assertions

7. Added M2 CI gate workflow:
   - typecheck + targeted M1/M2 ANU test suite

## Artifacts

- `frontend-next/src/ui-system/anu/primitiveManifest.ts`
- `frontend-next/src/ui-system/anu/surfacePrimitives.tsx`
- `frontend-next/src/ui-system/shell/shellMetadata.ts`
- `frontend-next/src/app/api/sdk/shell-primitives/route.ts`
- `frontend-next/src/app/(app)/sandbox/ui-lab/page.tsx`
- `frontend-next/src/app/(app)/home/page.tsx`
- `frontend-next/src/app/auth/page.tsx`
- `frontend-next/src/app/(app)/sandbox/page.tsx`
- `frontend-next/src/app/(public)/contact/page.tsx`
- `frontend-next/src/test/primitiveManifest.test.ts`
- `frontend-next/src/test/shellPrimitivesApiRoute.test.ts`
- `frontend-next/src/test/shellMetadataApiRoute.test.ts`
- `.github/workflows/m2-primitive-consolidation-gates.yml`
- `docs/program/M2_QUEUE.md`

## Validation commands

```bash
cd frontend-next
npm run typecheck
npx vitest run src/test/anuUiLab.test.tsx src/test/realmRegistryShellMetadata.test.ts src/test/shellMetadataApiRoute.test.ts src/test/primitiveManifest.test.ts src/test/shellPrimitivesApiRoute.test.ts
npm run build
```

## Results summary

- TypeScript typecheck: PASS
- Vitest suite (M1 + M2 targeted): PASS
- Next build: PASS
- Route verification in build output:
  - `/api/sdk/shell-metadata`
  - `/api/sdk/shell-primitives`
  - `/lab`
  - `/sandbox/ui-lab` (legacy route retained as redirect page)

## Addendum — Executable Canon Rollout Closure (2026-04-13)

Additional M2 canon-hardening work completed:

1. Route canon hardened as executable source of truth:
   - `frontend-next/src/ui-system/anu/routePurposeRegistry.ts`
   - explicit flagship canon constants
   - explicit alias registry
2. Threshold canon hardened as executable source of truth:
   - `frontend-next/src/ui-system/anu/thresholdRegistry.ts`
   - route/plane/realm threshold lookup helpers
3. Guidance and shell consumers aligned to canonical route resolution:
   - `frontend-next/src/ui-system/layout/pathwayGuidance.ts`
   - `frontend-next/src/ui-system/layout/shellSignals.ts`
   - `frontend-next/src/ui-system/layout/mobileDockModel.ts`
   - `frontend-next/src/ui-system/layout/Header.tsx`
   - `frontend-next/src/ui-system/layout/Sidebar.tsx`
4. Manifest parity tightened:
   - `frontend-next/src/ui-system/anu/primitiveManifest.ts`
   - `frontend-next/src/ui-system/anu/observatoryManifest.ts`
   - `frontend-next/src/ui-system/shell/shellMetadata.ts`

### Canon decision finalized: `/lab`
- `/lab` is the canonical internal lab route.
- `/sandbox/ui-lab` is retained strictly as a legacy redirect alias.
- `/lab` is intentionally non-flagship and does not enter the flagship route-purpose table.

### Verification evidence (canon rollout)
- `src/test/routePurposeRegistry.test.ts`
- `src/test/thresholdRegistry.test.ts`
- `src/test/routeMetadataParity.test.ts`
- `src/test/pathwayGuidance.test.ts`
- `src/test/routeCanonDocsSync.test.ts`
- `src/test/shellMetadataApiRoute.test.ts`
- `src/test/shellSignals.test.ts`
- `src/test/mobileDockModel.test.ts`
- `src/test/mobileDock.test.tsx`
- `src/test/headerShell.test.tsx`
- frontend typecheck (`npm run -s typecheck`)

Documentation sync completed:
- `docs/ROUTE_PURPOSE_REGISTRY_2026-04-07.md`
- `docs/THRESHOLD_LANGUAGE_SPEC_2026-04-07.md`
- `docs/ANU_DOCTRINE_SPEC_2026-04-07.md`
- `docs/program/MILESTONE_ACCEPTANCE_PACK_2026-04-07.md`
- `docs/program/NEXT_ERA_PRODUCT_BACKLOG_2026-04-07.md`

Deferred to M3 (not in M2 scope):
- connector schema/service/API/UI implementation
- connector persistence and journey wiring
