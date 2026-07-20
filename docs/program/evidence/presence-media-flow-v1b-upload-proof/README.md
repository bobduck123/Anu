# Presence Media Flow V1B Upload Proof

Date: 2026-05-25

## Summary

Presence Editor UX V1.5 now supports uploading a JPG, PNG, or WEBP image from the Images drawer into the owner's Draft room, adding alt text, assigning it to a visible image role, privately previewing that draft assignment, and opening the updated room to visitors intentionally.

The implementation preserves the established editor lifecycle: an upload is recorded in draft inventory only, unused uploaded inventory is removed from visitor-facing payloads, and a selected uploaded image becomes public room content only after explicit publish.

## Storage And Backend Path

The repository already contains a backend-owned Supabase Storage media service and an 8 MB validated multipart upload path for legacy Presence media. V1B adds the nested-editor endpoint:

`POST /api/presence/owner/rooms/<room_id>/assets/upload`

The endpoint requires owner authentication and room access, validates role and alt-text metadata before storage, validates image bytes and filename/MIME consistency, stores a UUID-named room image, and appends a safe media record to the draft.

Production Supabase configuration currently serves images from a public-read bucket. Therefore uploaded draft bytes are **public-unlisted by random URL**, not storage-private. The public room payload does not reveal unused uploaded URLs, but private storage or signed delivery remains required before public self-serve.

## What Upload Supports

- Upload from device in Images mode and the selected-image drawer.
- JPG, PNG, and WEBP images up to 8 MB.
- Client-side early validation plus server-side authoritative validation.
- Cover/work role assignment through the current Canvas image targets.
- Alt text supplied during upload and editable after selection.
- Draft-only inventory and explicit `Use this image` placement.
- Private preview and publish boundary proof through browser automation.

## Deferred

- Crop.
- Focal point/object-position control.
- Image dimensions and processing pipeline.
- EXIF/GPS removal.
- Direct-to-storage signed uploads and storage-private draft objects.
- Orphan cleanup/job processing for uploaded images never used.

## Files Changed

- `flora-fauna/backend/app/api/presence_graph.py`
- `flora-fauna/backend/app/services/presence_editor_config.py`
- `flora-fauna/backend/app/services/presence_media_storage.py`
- `flora-fauna/backend/tests/test_presence_cors.py`
- `flora-fauna/backend/tests/test_presence_studio_editor_foundation.py`
- `presence-app/components/studio/editor/PresenceCanvasMode.tsx`
- `presence-app/components/studio/editor/PresenceStudioEditorApp.tsx`
- `presence-app/components/studio/editor/canvas/MediaDrawer.tsx`
- `presence-app/lib/api/editor.ts`
- `presence-app/lib/api/editor.test.ts`
- `presence-app/lib/api/types.ts`
- `presence-app/lib/editor/mediaValidation.ts`
- `presence-app/lib/editor/mediaValidation.test.ts`
- `presence-app/tests/e2e/mock-presence-api.mjs`
- `presence-app/tests/e2e/presence-editor-ux-v1-5-media-flow.spec.ts`
- `presence-app/tests/e2e/presence-media-flow-v1b-upload.spec.ts`

## Tests

- `npm.cmd run typecheck`: passed.
- `npm.cmd run build`: passed.
- Relevant frontend Node tests including upload policy/editor API/resolver/readiness: 41 passed.
- Backend editor/public/RoomKey/CORS/node regression suite: 109 passed with existing SQLAlchemy deprecation warnings.
- Local Playwright editor/auth/Canvas/RoomKey/V1A/V1B suite: 27 passed.
- `git diff --check`: passed.

An exploratory broad Node invocation included older test files documented to run with `tsx`; five fail under raw `node --test` because of existing extensionless import resolution. It does not include a V1B regression.

## Hosted Status

The V1A hosted operator smoke result is recorded in `../presence-media-flow-v1-editor-ux-v1-5-integration-proof/HOSTED_MANUAL_SMOKE_PROOF.md`.

V1B upload has local automated proof only. Hosted upload and cleanup must be run after deployment before expanding pilot use of device upload.

## Pilot Readiness

The existing V1A baseline remains cleared for multiple operator-led pilots. V1B upload is suitable for the same operator-led posture after a hosted upload/publish/cleanup smoke, with the public-unlisted draft storage limitation accepted and explained to operators. It is not ready for paid or self-serve release.
