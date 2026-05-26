# Storage Audit

## V1B Baseline Found

1. Production storage provider is backend-owned Supabase Storage. Tests and
   local development use the backend upload folder fallback.
2. V1B editor uploads wrote visitor-readable URLs in the configured
   `PRESENCE_MEDIA_BUCKET`; they were public-unlisted, not private.
3. Draft and published bytes were not physically separated in V1B.
4. There was no Canvas media lifecycle table. Uploaded picker metadata lived
   inside nested editable draft data.
5. The authenticated atomic upload endpoint already existed at
   `/api/presence/owner/rooms/<room_id>/assets/upload`; there was no direct
   signed browser upload intent/confirm pair.
6. V1B stored editor images under
   `presence/rooms/{roomId}/images/{uuid}.{ext}`.
7. V1B already validated supported MIME/signature/extension and file size, but
   had no preparation pipeline, private signing, derivatives, EXIF stripping,
   crop or focal point behavior.
8. Private/signed draft reads were not available.
9. Publish reused the same uploaded URL rather than promoting a public copy.
10. Frontend and backend are separate hosted domains; editor media writes use
    bearer owner authentication through the existing API client.

## V1C Storage Contract

- Draft key: `presence/draft/rooms/{roomId}/{uuid}.{ext}`.
- Published key: `presence/published/rooms/{roomId}/{mediaId}/display.{ext}`.
- Protected remote draft bucket: `PRESENCE_MEDIA_DRAFT_BUCKET`.
- Published/public bucket: existing `PRESENCE_MEDIA_BUCKET`.
- Local protected test root: `PRESENCE_MEDIA_PRIVATE_FOLDER`, enabled only by
  `PRESENCE_MEDIA_PRIVATE_DRAFT_ENABLED` with the local backend.
- Signed read lifetime: `PRESENCE_MEDIA_SIGNED_URL_TTL_SECONDS`, default 900.
- Orphan cleanup minimum age: `PRESENCE_MEDIA_ORPHAN_MIN_AGE_SECONDS`, default
  86400.

## Deployment Requirements By Name Only

- Apply `20260526_presence_media_flow_v1c_private_draft.sql`.
- Configure `SUPABASE_URL`.
- Configure backend-only `SUPABASE_SERVICE_ROLE_KEY`.
- Configure public `PRESENCE_MEDIA_BUCKET`.
- Create and configure private `PRESENCE_MEDIA_DRAFT_BUCKET`.
- Ensure the draft bucket permits backend service access and does **not**
  permit anonymous public object reads.

The upload service verifies a newly stored draft object cannot be read through
the anonymous public storage URL. If that verification fails, it rejects the
upload and does not label it private.

## Migration Rollback Posture

The migration is additive. For operational rollback, first remove
`PRESENCE_MEDIA_DRAFT_BUCKET` so new uploads return to the documented V1B
compatibility posture, retain `presence_media_asset` rows for audit/cleanup,
and roll back application code only after no live publish depends on promoted
records. Do not drop the table or private bucket as an emergency rollback:
doing so could orphan protected originals or remove cleanup evidence.
