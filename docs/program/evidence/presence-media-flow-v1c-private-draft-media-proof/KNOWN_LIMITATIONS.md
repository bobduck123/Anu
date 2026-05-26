# Known Limitations

- Hosted private draft storage has not been proven in this implementation
  session; the current hosted baseline remains V1B until deployment/config.
- Supabase storage promotion code is locally contract-tested through the local
  protected store and privacy-probe unit behavior, not live-storage smoked.
- Uploads still traverse the backend request rather than a direct signed upload
  flow; the existing 8 MB ceiling remains important on serverless hosting.
- Publish makes a public copy of the original, not compressed/display
  derivatives.
- EXIF/GPS stripping is not implemented.
- Focal point is not enabled because renderer parity is not implemented.
- Crop is not implemented.
- Cleanup has an authenticated endpoint but no scheduled recurring job.
- The Media drawer does not yet expose owner-facing delete controls.
- Public copy creation and database publish are not a single storage/database
  transaction; a failed commit after copy can leave an unlinked public object
  for later operator cleanup.
- Rollback/public derivative retention policy is not yet comprehensive.
- Paid controlled pilots and public self-serve remain uncleared.
