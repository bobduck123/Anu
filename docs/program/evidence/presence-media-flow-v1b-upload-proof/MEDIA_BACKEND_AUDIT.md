# Media Backend Audit

## Discovery Answers

| Question | Finding |
| --- | --- |
| Storage provider | Existing backend service writes to Supabase Storage in production and local `/media/uploads/...` in tests/development when remote storage is not configured. |
| Existing media model | Legacy Presence node/work/collection fields exist. There is no separate Canvas media-table model for draft inventory. |
| Existing upload endpoint | `/api/presence/owner/nodes/<id>/media` existed, but mutates legacy node/work media rather than nested editor drafts. |
| Current Canvas image persistence | Image references are nested inside editable draft sections and published through the existing draft/publish lifecycle. |
| Draft asset privacy | Editable draft metadata is owner-only. Production storage bucket is currently public read, so bytes are public-unlisted by UUID URL rather than private. |
| Publication approach | Uploaded inventory stays out of public payloads; when an owner selects the image into a visible role and publishes, the same stored URL is referenced publicly. |
| Focal point/crop | No end-to-end render model and public renderer field is proven for either control. |
| Hosting limits | Existing backend storage path enforces an 8 MB limit; V1B uses the established small-image server-mediated path. |
| Frontend/backend auth | Separate hosted frontend/backend; owner bearer authentication is sent through the editor API client, with CORS coverage added for multipart upload. |

## Chosen V1B Path

V1B reuses the current backend-only storage credentials and media byte validator, but introduces an editor-specific, owner-checked upload endpoint. It avoids the legacy media mutation path and records a safe uploaded item in the nested draft inventory.

Storage keys for the editor path use:

```text
presence/rooms/{room_id}/images/{uuid}.{jpg|png|webp}
```

This avoids publishing owner user identifiers in image URLs. The room ID is already a public room addressable identifier in this system.

## Why Not Signed Direct Upload Yet

There is no existing private draft bucket, upload-intent contract, or signed-draft delivery policy in this repository. Introducing those safely needs storage configuration, expiry policy, public promotion or delivery rules, and hosted testing. V1B keeps images small and server-validated using existing infrastructure; signed private upload is the next security upgrade.
