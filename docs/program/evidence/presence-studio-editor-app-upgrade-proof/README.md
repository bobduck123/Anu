# Presence Studio Editor App Upgrade Proof

Date: 2026-05-23

## Summary

This pass builds the owner-facing Presence Studio editor surface for the editable configuration foundation. It adds `/studio/[roomId]/editor` as an authenticated owner route in `presence-app`, typed frontend API helpers for the owner-only editor endpoints, a premium multi-tab editor cockpit, draft save/preview/publish/rollback flows, asset attachment/select behaviour, validation/readiness checks, and public GGM renderer consumption of the active published `node.editable_config`.

This is the app/editor foundation, not the final full visual authoring suite. It does not claim the Studio editor is complete.

## Implemented

- Added `/studio/[roomId]/editor` route using the existing Studio owner session pattern.
- Added typed editor API client helpers for:
  - `GET /api/presence/owner/rooms/<room_id>/editor`
  - `GET /api/presence/owner/rooms/<room_id>/editor/draft`
  - `POST /api/presence/owner/rooms/<room_id>/editor/draft`
  - `PATCH /api/presence/owner/rooms/<room_id>/editor/draft`
  - `POST /api/presence/owner/rooms/<room_id>/editor/preview`
  - `POST /api/presence/owner/rooms/<room_id>/editor/publish`
  - `POST /api/presence/owner/rooms/<room_id>/editor/rollback`
  - `GET /api/presence/owner/rooms/<room_id>/editor/history`
  - `GET /api/presence/owner/rooms/<room_id>/assets`
  - `POST /api/presence/owner/rooms/<room_id>/assets/attach`
- Added editor tabs:
  - Overview
  - Scenes
  - Work Wall
  - Practice / About
  - Calling Card
  - Style DNA
  - Motion / Texture
  - RoomKey
  - Assets
  - Preview / Publish
  - History / Rollback
- Added shell indicators:
  - room title
  - renderer key
  - draft status
  - published status
  - unsaved changes
  - last saved timestamp
  - preview/publish/public room actions
  - validation badge
  - desktop/mobile preview toggle
- Added draft create/save from suggested, published, or existing draft config.
- Added explicit preview and publish actions.
- Added history reload and rollback action.
- Added frontend validation for missing content/assets, unsafe asset URLs, external link posture, enquiry posture, heavy motion, unpublished changes, and draft/public mismatch.
- Added editor mock API and Playwright smoke coverage with screenshots.

## Files Changed

Frontend app/editor:

- `presence-app/app/(studio)/studio/[id]/editor/page.tsx`
- `presence-app/components/studio/editor/PresenceStudioEditorApp.tsx`
- `presence-app/components/studio/StudioShell.tsx`
- `presence-app/lib/api/editor.ts`
- `presence-app/lib/api/editor.test.ts`
- `presence-app/lib/api/types.ts`

Public GGM renderer / RoomKey consumption:

- `presence-app/lib/presence/ggm/editable.ts`
- `presence-app/lib/presence/ggm/activate.ts`
- `presence-app/components/presence/ggm/GgmFaithfulRoom.tsx`
- `presence-app/components/presence/ggm/GgmMotionContext.tsx`
- `presence-app/components/presence/ggm/GgmCallingCard.tsx`
- `presence-app/components/presence/ggm/GgmStage.tsx`
- `presence-app/components/presence/graph/RoomKeyEntry.tsx`

Testing/evidence:

- `presence-app/tests/e2e/mock-presence-api.mjs`
- `presence-app/tests/e2e/presence-studio-editor.spec.ts`
- `docs/program/evidence/presence-studio-editor-app-upgrade-proof/README.md`
- `docs/program/evidence/presence-studio-editor-app-upgrade-proof/results.json`
- `docs/program/evidence/presence-studio-editor-app-upgrade-proof/SCREENSHOTS.md`
- `docs/program/evidence/presence-studio-editor-app-upgrade-proof/KNOWN_LIMITATIONS.md`
- `docs/program/evidence/presence-studio-editor-app-upgrade-proof/screenshots/studio-editor-overview.png`
- `docs/program/evidence/presence-studio-editor-app-upgrade-proof/screenshots/studio-editor-scenes.png`
- `docs/program/evidence/presence-studio-editor-app-upgrade-proof/screenshots/studio-editor-preview.png`

Backend foundation files from the preceding foundation pass remain in the same worktree and were regression-tested in this pass.

## Public Renderer Changes

The GGM faithful renderer now resolves a public published editable model from `node.editable_config`:

- `renderer_key` can activate the GGM renderer from `node.editable_config.renderer_key`.
- GGM scenes prefer editable scene/content/asset settings.
- GGM works prefer editable asset/content work lists and ordering.
- Style tokens are mapped into GGM CSS variables.
- Motion tokens seed the GGM motion provider.
- Calling Card content and contact posture can be driven by editable config.
- RoomKey payload attaches the top-level published `editable_config` to the room object before GGM rendering.

The renderer explicitly ignores non-published config statuses.

## Security Checks

- Editor route uses the existing authenticated Studio owner-node gate.
- Editor API helpers only call `/api/presence/owner/...` endpoints with bearer auth.
- No public draft endpoint was introduced.
- Public GGM renderer only reads `node.editable_config` when `status === "published"`.
- RoomKey public route receives only backend-provided published config.
- Frontend asset validation warns/rejects `file:`, unsafe `data:`, localhost/internal hosts, Windows/local paths, script-like URLs, and path traversal.
- The editor does not hard-code owner emails and does not expose `platform_admin`, `internal_lifetime_free`, auth subjects, raw tokens, or audit metadata.

## Test Commands Run

- `cmd /c npm run typecheck`
- `cmd /c npm run build`
- `node --test --experimental-strip-types lib\api\editor.test.ts lib\api\presenceGraph.test.ts`
- `npx playwright test tests/e2e/presence-studio-editor.spec.ts`
- `python -m pytest tests\test_presence_studio_editor_foundation.py tests\test_presence_pass_paths.py -q`

## Results

- Frontend typecheck: pass
- Frontend production build: pass
- API client tests: 4 passed
- Presence Studio editor Playwright smoke: 1 passed
- Backend editor/RoomKey regression subset: 9 passed

Warnings observed:

- Next build warns that Turbopack inferred the parent workspace lockfile as root because multiple lockfiles exist.
- Node test warns package type is not set and reparses TS tests as ES modules.
- Backend pytest emits existing SQLAlchemy `Query.get()` legacy warnings and a pytest cache permission warning.

## Screenshots

See `SCREENSHOTS.md`.

## Hosted Readiness

The migration `backend/migrations/versions/20260523_presence_editable_config.sql` exists locally. Hosted infrastructure still needs deployment verification for that migration before the editor can persist drafts in hosted environments. The frontend surfaces this as a migration readiness note in the editor state panel.

## Next Recommended Pass

- Add a full-screen authenticated draft renderer preview route that uses the preview token without introducing a public draft endpoint.
- Add inline visual diff between draft and published config.
- Add richer asset upload pipeline integration beyond attaching existing safe public assets.
- Add field-level validation from a shared JSON schema generated from the backend validator.
- Expand browser regression to hosted GGM with real owner auth once the migration is applied.
