# Known Limitations

- The patched recovery has local automated proof only; hosted re-smoke is
  required after deployment.
- V1C private draft storage is not claimed as active on hosted until migration,
  bucket privacy and publish promotion are verified.
- V1B fallback uploads remain appropriate only for public-safe,
  non-sensitive images.
- Protected remote upload still depends on backend-mediated upload and a
  runtime anonymous-read privacy check.
- EXIF/GPS stripping, display compression and thumbnails remain unimplemented.
- Focal point and crop controls remain unavailable.
- Orphan cleanup has an authenticated path but no scheduled job.
- The new `/room/[id]/key` path is a direct published entry alias, not evidence
  of a scanned physical RoomKey.
- SQLAlchemy legacy query warnings remain as maintenance debt outside this
  regression recovery.

