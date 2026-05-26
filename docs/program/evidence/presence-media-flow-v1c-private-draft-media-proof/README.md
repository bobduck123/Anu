# Presence Media Flow V1C - Private Draft Media Proof

Date: 2026-05-26

## Summary

Media Flow V1C adds an enforceable protected-draft pathway without weakening the
existing V1B operator workflow. When protected storage is enabled, an uploaded
original is recorded as private draft media, delivered to the owner/preview
through a short-lived read URL, and copied into a visitor-readable published
path only during explicit `Open room to visitors`.

When protected storage is not configured, the existing V1B public-unlisted
behavior remains available and the editor does not claim that an upload is
private.

## Implemented

- Additive `presence_media_asset` lifecycle record and migration.
- Protected draft storage mode for a private Supabase bucket, plus a local
  private-store test implementation outside the public upload directory.
- Anonymous-read verification of newly stored Supabase draft objects; a bucket
  that is publicly readable is rejected rather than labelled private.
- Short-lived signed draft image delivery for protected owner/preview renders.
- Draft persistence stores protected media references without persisting
  signed preview URLs.
- Publish promotion: only selected protected draft media is copied to a public
  published path and substituted into the live room at publish time.
- Owner-only delete and orphan cleanup endpoints for protected unused media.
- Media drawer carries the uploaded media reference when placing an image and
  only uses private-language when the API confirms `private_draft`.
- Public payload hygiene extends to storage delivery field names.

## Files Changed

- `flora-fauna/backend/app/models.py`
- `flora-fauna/backend/migrations/versions/20260526_presence_media_flow_v1c_private_draft.sql`
- `flora-fauna/backend/app/services/presence_media_storage.py`
- `flora-fauna/backend/app/services/presence_editor_config.py`
- `flora-fauna/backend/app/api/presence_graph.py`
- `flora-fauna/backend/tests/test_presence_studio_editor_foundation.py`
- `presence-app/components/studio/editor/PresenceStudioEditorApp.tsx`
- `presence-app/components/studio/editor/canvas/MediaDrawer.tsx`
- `presence-app/lib/api/types.ts`
- `presence-app/lib/editor/canvasModel.ts`
- `presence-app/lib/editor/canvasModel.test.ts`
- `presence-app/lib/presence/render/publicPayload.ts`
- `presence-app/lib/presence/render/publicPayload.test.ts`
- `presence-app/tests/e2e/mock-presence-api.mjs`
- `presence-app/tests/e2e/presence-public-payload-hygiene.spec.ts`
- `presence-app/tests/e2e/presence-media-flow-v1c-private-draft.spec.ts`
- This evidence folder.

## Storage And Publish Path

Protected mode requires the new migration and a private draft bucket configured
by `PRESENCE_MEDIA_DRAFT_BUCKET`. Draft originals remain protected. The
existing `PRESENCE_MEDIA_BUCKET` is used only for visitor-readable copies
created during publish. The backend probes a protected upload anonymously and
fails the upload if the object can be read publicly.

Compatibility mode is retained where the deployment has not configured
protected storage. It remains appropriate only for non-sensitive operator-led
uploads.

## Verification

Local implementation proof covers:

- protected upload access and signed delivery;
- draft/public boundary before publish;
- public promotion only on publish;
- orphan cleanup;
- rejection of a falsely public Supabase draft bucket;
- Canvas media-reference persistence;
- public payload hygiene;
- auth/sign-out, preview/publish and RoomKey regression.

Hosted V1C verification is **NOT RUN**. The current hosted V1B baseline remains
cleared for operator-led pilots with non-sensitive uploads until the migration,
private bucket policy and deployment smoke are completed.

## Deferred

- Focal point is not active because the current public GGM image view does not
  consume focal metadata end to end.
- Crop is not implemented.
- Compression, WebP derivatives and EXIF/GPS stripping are not implemented.
- Orphan cleanup is an authenticated endpoint; scheduling/retention operations
  still require an operator pass.

## Recommendation

Protected media capability is implemented and locally proven, but hosted
privacy is not proven until configuration and re-smoke. Preserve the existing
non-sensitive-upload posture on current hosting; after hosted protected-mode
verification, the expanded operator pilot posture can be reassessed.
