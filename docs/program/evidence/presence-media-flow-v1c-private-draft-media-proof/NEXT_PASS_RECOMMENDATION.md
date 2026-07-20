# Next Pass Recommendation

## Immediate Deployment Pass

1. Apply the new media asset migration.
2. Provision and policy-test a private Supabase draft bucket.
3. Deploy with `PRESENCE_MEDIA_DRAFT_BUCKET`.
4. Run the hosted V1C smoke and source scans.
5. Record hosted cleanup evidence.

## Media Pipeline V1C.1

- Replace backend-mediated uploads with owner-authenticated signed direct
  upload intent/confirm if serverless limits become material.
- Add queued orphan cleanup with retention logging.
- Add derivative processing and EXIF/GPS removal.
- Reconcile public-copy failure cleanup with publish transaction failure.

## Visual Preparation V1D

- Carry focal-point metadata through shared render resolution.
- Render identical focal behavior in Canvas, preview and public routes.
- Enable focal controls only after parity tests pass.
- Consider crop only once derivative generation is available.
