# Presence Ecosystem Media Handling

## Launch v1 Position

Presence Studio supports direct image upload for the core public media slots:

- profile image
- cover image
- landing background image
- work image
- collection cover image

Hosted image URLs remain available only as an advanced fallback. The primary Studio flow should not require users to paste image links.

## Upload Architecture

- `presence-app` uploads files to ANU backend owner routes with the user's Supabase bearer token.
- The frontend never receives service-role keys.
- The backend resolves the local ANU user, checks ownership, validates the file, stores media, and writes the resulting URL to the correct Presence field.
- Draft and private Presences remain hidden publicly even when images are uploaded.

See `docs/presence/PRESENCE_MEDIA_UPLOAD_RUNBOOK.md` for storage setup.

## Validation Rules

Allowed:

- JPG
- PNG
- WEBP
- max 8 MB

Rejected:

- SVG
- HTML
- scripts
- unknown MIME types
- empty files
- oversized files

Server validation remains authoritative.

## Frontend Behaviour

`PresenceMediaSlot` provides:

- drag and drop
- select file button
- preview
- replace image
- remove image
- client-side type and size errors
- advanced hosted URL fallback
- draft/private visibility note

It is used in owner Studio for profile, cover, landing, work, and collection media fields.

## Deferred

- full media library / DAM
- image transformations
- private signed media lifecycle
- asset moderation workflow
- multi-image work galleries
