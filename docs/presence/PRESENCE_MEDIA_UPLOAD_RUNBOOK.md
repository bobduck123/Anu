# Presence Media Upload Runbook

Scope: direct image upload for the Presence standalone frontend using the ANU-native backend module.

## Architecture

- `presence-app` never receives a service-role key.
- Studio sends authenticated multipart uploads to the ANU backend:
  - `POST /api/presence/owner/nodes/<node_id>/media`
  - `POST /api/presence/owner/nodes/<node_id>/media/clear`
- The backend validates the Supabase bearer token, resolves the ANU local user, checks node ownership, then writes media.
- Draft and private Presences stay hidden publicly even when media exists.

## Route Contract

The standalone Presence frontend expects this exact ANU backend route:

- `OPTIONS /api/presence/owner/nodes/<node_id>/media`
- `POST /api/presence/owner/nodes/<node_id>/media`

Required behavior:

- `OPTIONS` returns `200` or `204`
- `Access-Control-Allow-Origin` reflects `https://presence-gilt.vercel.app`
- `Access-Control-Allow-Methods` includes `POST, OPTIONS`
- `Access-Control-Allow-Headers` includes `Authorization, Content-Type`
- `OPTIONS` does not require auth
- `POST` still requires valid owner auth and owner-scoped access

If production returns `404` on either `OPTIONS` or `POST`, the deployed ANU backend does not contain the media route. That is a deployment mismatch, not a storage-bucket failure.

## Media Slots

Supported slots:

- `profile_image` -> `PresenceNode.profile_image_url`
- `cover_image` -> `PresenceNode.cover_image_url`
- `landing_background` -> `PresenceNode.landing_background_url`
- `work_image` -> `PresenceWork.image_url` and `PresenceWork.thumbnail_url`
- `collection_cover` -> `PresenceCollection.cover_image_url`

Owner-scoped path format:

```text
presence/{owner_user_id}/{node_id}/profile/{uuid}.jpg
presence/{owner_user_id}/{node_id}/cover/{uuid}.png
presence/{owner_user_id}/{node_id}/landing/{uuid}.webp
presence/{owner_user_id}/{node_id}/works/{work_id}/{uuid}.jpg
presence/{owner_user_id}/{node_id}/collections/{collection_id}/{uuid}.webp
```

## Validation

Allowed MIME types:

- `image/jpeg`
- `image/png`
- `image/webp`

Rejected:

- SVG
- HTML
- scripts
- unknown MIME types
- empty files
- files larger than 8 MB

The backend checks both the MIME type and file signature.

## Supabase Storage Setup

Recommended production storage:

- Bucket name: `presence-media`
- Bucket visibility: public read is simplest for launch v1 public pages.
- Write access: backend only.

Required backend env:

```text
PRESENCE_MEDIA_STORAGE_BACKEND=supabase
PRESENCE_MEDIA_BUCKET=presence-media
SUPABASE_URL=<ANU Supabase URL>
SUPABASE_SERVICE_ROLE_KEY=<backend-only service role key>
PRESENCE_PUBLIC_ORIGIN=https://presence-gilt.vercel.app
```

Do not set `SUPABASE_SERVICE_ROLE_KEY` in `presence-app` or any `NEXT_PUBLIC_*` variable.

If `PRESENCE_MEDIA_STORAGE_BACKEND` is unset in tests, the backend skips remote storage. If Supabase storage env is not configured in local development, the backend falls back to local `/media/uploads/...` URLs.

## RLS Notes

This pass uses backend-owned uploads, so client-side Supabase Storage RLS policies are not required for upload. If a future pass moves upload directly to Supabase Storage from the browser, add RLS policies that bind writes to the authenticated user and Presence ownership. Do not rely on client-submitted owner IDs.

## Deployment Checklist

1. Apply Presence migrations.
2. Configure backend env for ANU Supabase JWT validation.
3. Configure backend `PRESENCE_PUBLIC_ORIGIN=https://presence-gilt.vercel.app`.
4. Create `presence-media` Supabase Storage bucket.
5. Set backend-only `SUPABASE_SERVICE_ROLE_KEY`.
6. Set `PRESENCE_MEDIA_STORAGE_BACKEND=supabase`.
7. Redeploy backend.
8. Redeploy `presence-app`.
9. In Studio, upload profile, cover, work, and collection images.
10. Confirm draft public slug remains 404.
11. Publish only when intended, then confirm public page renders uploaded images.
