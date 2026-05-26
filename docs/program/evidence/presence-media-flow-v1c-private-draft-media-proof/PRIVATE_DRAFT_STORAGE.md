# Private Draft Storage

## Behavior

- Upload remains owner-authenticated and room-scoped.
- A protected upload creates a `PresenceMediaAsset` record with
  `visibility=private_draft`.
- The persisted nested draft stores the media reference, role and alt text, but
  strips temporary read URLs and their expiry metadata.
- Owner editor and authenticated preview responses hydrate protected references
  with a short-lived read URL.
- Local proof stores protected bytes outside `/media/uploads` and serves them
  only through a signed, expiry-checked media read route.
- Supabase mode stores the original in the configured draft bucket and requests
  a short-lived signed read URL from storage.

## Honest Compatibility Mode

If `PRESENCE_MEDIA_DRAFT_BUCKET` is not configured, upload continues through
the V1B public-unlisted path. The UI receives `public_unlisted` and shows the
non-sensitive upload warning rather than asserting privacy.

## Access Proof

Backend integration coverage asserts:

- unsigned access to a protected local draft image is denied;
- a valid short-lived signed URL reads the private test image;
- no protected URL or media ID is present in the anonymous public room before
  publish;
- the stored draft does not persist signed delivery URLs.
