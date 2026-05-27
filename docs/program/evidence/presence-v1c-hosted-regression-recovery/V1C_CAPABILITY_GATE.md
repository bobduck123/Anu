# V1C Capability Gate

Private draft media is an optional capability, not a prerequisite for opening
the editor.

## Activation Requirements

Protected uploads become active only when:

1. `presence_media_asset` exists.
2. Remote storage credentials and `PRESENCE_MEDIA_DRAFT_BUCKET` are
   configured, or local protected test storage is explicitly enabled.
3. For remote storage, `PRESENCE_MEDIA_PRIVATE_DRAFT_VERIFIED=true` has been
   set after deployment checks.
4. Each protected upload passes its runtime check that the newly written
   draft object is not anonymously readable.

## Fallback

If any prerequisite is absent, the owner can continue using V1B image upload
and receives this copy in Images:

> Private draft media is not enabled on this environment. Use only public-safe images.

No missing optional migration or bucket configuration should return a server
error from normal editor loading.

## Failure Closed

If a draft already contains a protected media reference but the lifecycle
table has become unavailable, publication is blocked rather than leaking or
losing the protected image.

