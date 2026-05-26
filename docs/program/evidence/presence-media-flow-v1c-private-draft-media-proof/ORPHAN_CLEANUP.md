# Orphan Cleanup

## Implemented

- `PresenceMediaAsset` statuses distinguish draft upload, attached draft,
  published, orphaned and deleted records.
- Publishing a draft marks protected uploads that are not selected for the live
  room as orphaned.
- Owner-only cleanup endpoint:
  `POST /api/presence/owner/rooms/<room_id>/assets/cleanup`.
- Owner-only individual safe delete endpoint:
  `DELETE /api/presence/owner/rooms/<room_id>/assets/<media_id>`.
- Delete refuses a currently live published image and refuses an image still
  selected in the current draft.
- Local protected cleanup is verified in backend integration tests.

## Deferred Operations

- A scheduled retention job invoking cleanup automatically.
- An owner-facing delete/remove button in the Media drawer.
- Version-aware deletion of superseded public copies.
- Public derivative garbage collection after rollback/version retention policy
  is agreed.
