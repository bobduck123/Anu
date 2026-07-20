# Presence V1C Hosted Regression Recovery

Date: 2026-05-27

## Summary

This recovery pass fixes the two hosted blockers reported after the Media Flow
V1C deployment attempt:

- The owner editor no longer treats optional V1C media infrastructure as
  mandatory. When the V1C migration or protected storage is unavailable, the
  editor loads in the proven V1B public-safe image posture.
- `/room/[id]/key` is restored as a published-only direct-room entry surface.
  It does not mint or imply a physical RoomKey token.

Hosted verification must be repeated after deployment of this patch. Until
then, V1C private mode is not claimed for the hosted environment.

## Root Causes

1. V1C added unconditional `presence_media_asset` queries on editor load and
   draft serialization. A hosted deployment without the additive migration
   fails `GET /api/presence/owner/rooms/<id>/editor` with a server error.
2. The frontend exposed `/r/[token]` but did not ship the requested
   `/room/[id]/key` route. The hosted 404 was therefore a missing route, not
   draft/publish leakage.

## Fixes

- Added capability detection for the optional media lifecycle table.
- Added owner-only capability diagnostics and honest fallback copy.
- Kept private uploads disabled unless media records, protected storage
  configuration, and deployment verification are all present.
- Preserved V1B upload behavior when V1C is inactive.
- Failed closed if an already-private draft reference is published while its
  supporting media records are unavailable.
- Added a published-only backend room entry endpoint and frontend
  `/room/[id]/key` route.
- Added regression tests for missing migration fallback, private-mode gating,
  Room entry restoration, and public HTML hygiene.

## Files Changed

- `flora-fauna/backend/app/api/presence_graph.py`
- `flora-fauna/backend/app/services/presence_editor_config.py`
- `flora-fauna/backend/app/services/presence_media_storage.py`
- `flora-fauna/backend/tests/test_presence_studio_editor_foundation.py`
- `presence-app/app/(public)/room/[id]/key/page.tsx`
- `presence-app/components/presence/graph/RoomKeyEntry.tsx`
- `presence-app/components/studio/editor/PresenceCanvasMode.tsx`
- `presence-app/components/studio/editor/PresenceStudioEditorApp.tsx`
- `presence-app/components/studio/editor/canvas/MediaDrawer.tsx`
- `presence-app/lib/api/presenceGraph.ts`
- `presence-app/lib/api/presenceGraph.test.ts`
- `presence-app/lib/api/types.ts`
- `presence-app/tests/e2e/mock-presence-api.mjs`
- `presence-app/tests/e2e/presence-media-flow-v1b-upload.spec.ts`
- `presence-app/tests/e2e/presence-pass-paths.spec.ts`
- `presence-app/tests/e2e/presence-public-payload-hygiene.spec.ts`

## Local Results

- Backend Presence/editor/public/RoomKey/CORS suite: 121 passed.
- Frontend TypeScript: passed.
- Frontend production build: passed; build lists `/room/[id]/key`.
- Frontend unit/contract suites: 35 passed.
- Targeted Playwright lifecycle/auth/public suites: 24 passed.
- `git diff --check`: passed; Git reports an existing line-ending conversion
  notice for the mock API file only.

## Pilot Recommendation

Redeploy and run the hosted smoke checklist in this folder. If it passes,
return to the previously cleared V1B posture for operator-led pilots using
non-sensitive uploads. Do not enable or claim V1C private draft media until
the hosted migration and protected bucket checks pass.

