# M4 Completion Report — Community Commons Rollout

Date: 2026-04-01
Contract version: `m4.2026-04-01`

## Completed work

1. Implemented community commons protocol manifest (`ANU_COMMUNITY_MODULES` + rules):
   - commons browse frame
   - status language
   - filter/control bar
   - gallery backup path
   - composer chamber

2. Added community commons metadata API:
   - `GET /api/sdk/community-commons-metadata`
   - returns modules, protocol rules, and route coverage summary

3. Upgraded shell metadata contract from M3 to M4:
   - shell metadata now includes a `community` block with module/rule/coverage evidence

4. Added reusable community status primitive:
   - `AnuCommonsStatusRail`

5. Applied status primitive in community top browse frame:
   - consolidated one-off status cards into shared primitive usage
   - preserved explicit publication truth labels (live/cached/demo/fallback)

6. Added M4 tests:
   - community manifest validation
   - community metadata API validation
   - shell metadata M4 integration validation
   - primitive rendering validation for commons status rail
   - community route and composer behavior smoke coverage

7. Added M4 CI workflow gate:
   - typecheck + targeted M1–M4 contract/community/chamber test matrix

## Artifacts

- `frontend-next/src/ui-system/anu/communityManifest.ts`
- `frontend-next/src/app/api/sdk/community-commons-metadata/route.ts`
- `frontend-next/src/ui-system/shell/shellMetadata.ts`
- `frontend-next/src/ui-system/anu/surfacePrimitives.tsx`
- `frontend-next/src/app/(app)/community/page.tsx`
- `frontend-next/src/test/communityManifest.test.ts`
- `frontend-next/src/test/communityCommonsMetadataApiRoute.test.ts`
- `frontend-next/src/test/shellMetadataApiRoute.test.ts`
- `frontend-next/src/test/anuSurfacePrimitives.test.tsx`
- `.github/workflows/m4-community-rollout-gates.yml`
- `docs/program/M4_QUEUE.md`

## Validation commands

```bash
cd frontend-next
npm run typecheck
npx vitest run src/test/anuUiLab.test.tsx src/test/anuSurfacePrimitives.test.tsx src/test/primitiveManifest.test.ts src/test/chamberManifest.test.ts src/test/communityManifest.test.ts src/test/realmRegistryShellMetadata.test.ts src/test/shellMetadataApiRoute.test.ts src/test/shellPrimitivesApiRoute.test.ts src/test/chamberMetadataApiRoute.test.ts src/test/communityCommonsMetadataApiRoute.test.ts src/test/communityPage.test.tsx src/test/communityComposerModal.test.tsx src/test/profilePage.test.tsx src/test/teamsView.test.tsx src/test/microcosmDetailPage.test.tsx src/test/joinMicrocosmPage.test.tsx
npm run build
```

## Results summary

- TypeScript typecheck: PASS
- Vitest suite: PASS (16 files, 28 tests)
- Next build: PASS
- M4 route verification in build output includes:
  - `/api/sdk/community-commons-metadata`
  - `/api/sdk/chamber-metadata`
  - `/api/sdk/shell-metadata`
  - `/api/sdk/shell-primitives`
  - community routes (`/community`, `/community/microcosms/[id]`, `/community/microcosms/join`)
