# Presence Ecosystem Media Handling

## Alpha Position

Presence alpha does not ship native upload. Media is handled through public hosted image URLs.

This removes upload/storage as a pilot blocker while keeping the public portfolio pages visually usable. Native upload can be added later through the platform's chosen storage provider.

## Recommended Workflow

Use a public HTTPS image URL from one of:

- Supabase Storage public bucket
- Cloudinary
- Imgix
- a trusted website/CDN
- a temporary pilot-safe asset host

Paste that URL into profile image, cover image, landing background, work image, thumbnail, or collection cover fields.

## Validation Rules

Client and server validation align on the alpha baseline:

- allow `http` and `https`
- reject `localhost`
- reject `127.0.0.1`
- reject `0.0.0.0`
- reject `.local`
- reject `.internal`
- reject malformed URLs

Server validation remains authoritative.

## Frontend Behaviour

`PresenceMediaUrlInput` provides:

- controlled URL field
- live preview when the URL is valid
- broken image fallback
- status pill for optional, valid, or invalid states
- helper copy explaining hosted-image alpha workflow

It is used in the control editor and owner Presence profile editor for profile/cover/landing media fields.

## Deferred

- native upload
- image transformations
- private media
- asset moderation workflow
- storage provider selection
- signed URL lifecycle
