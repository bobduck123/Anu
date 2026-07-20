# RoomKey 404 Fix

## Restored Route

Frontend route:

- `/room/[id]/key`

Backend read endpoint:

- `/api/presence/rooms/<room_id>/key-entry`

## Security Posture

This is a published-only direct entry alias. It resolves a minimal public
card, then redirects into the canonical `/presence/[slug]` renderer. It:

- loads only a publicly available room,
- uses the existing published public-room renderer for visual output,
- provides no physical RoomKey record or public token,
- does not create token attribution for a numeric room link,
- does not expose editor inventory, draft images, signed draft reads or owner
  metadata.

The original token-backed `/r/[token]` RoomKey path remains unchanged.
