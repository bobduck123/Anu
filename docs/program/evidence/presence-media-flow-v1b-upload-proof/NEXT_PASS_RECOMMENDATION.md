# Next Pass Recommendation

## Immediate Gate

Deploy V1B to the controlled hosted environment and run the upload/publish/restore smoke in `HOSTED_SMOKE_STEPS.md`. Treat any failure in auth, preview, publication boundary, RoomKey, or cleanup as a release blocker for enabling device upload in operator-led pilots.

## Media Flow V1C

1. Move draft uploads to a private bucket or equivalent private object policy.
2. Add an authenticated upload-intent and confirmation contract, with direct browser-to-storage transfer where hosting constraints require it.
3. Decide public publication delivery: promotion into a public key or controlled signed/render delivery.
4. Add stored-media lifecycle state and orphan cleanup.
5. Strip EXIF/GPS metadata and generate safe image derivatives.
6. Add image dimension extraction and renderer-safe focal point only after draft/preview/public parity tests exist.

## Release Recommendation

Continue operator-led pilots with non-sensitive media after hosted V1B smoke. Do not open self-serve device upload until private draft storage and image-processing safeguards are present.
