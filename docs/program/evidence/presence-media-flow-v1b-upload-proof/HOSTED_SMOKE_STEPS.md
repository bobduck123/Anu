# Hosted Smoke Steps

Run only after frontend and backend deployment containing V1B.

1. Sign in once as the owner in a fresh browser session.
2. Open `/studio/11/editor` and confirm Images mode opens normally.
3. Capture the current live cover/work image so it can be restored.
4. Upload a safe small JPG, PNG, or WEBP test image without embedded sensitive metadata.
5. Add alt text: `Hosted V1B upload proof image`.
6. Select `Use this image` for the cover or a controlled work slot and save the Draft room.
7. Open anonymous `/presence/ggm-christina-goddard`; confirm the test image is not visible before publish.
8. Open owner `/studio/11/editor/preview`; confirm the uploaded image and alt-text state appear in Draft preview.
9. Select `Open room to visitors`, confirm the dialog, and publish.
10. Open anonymous public room and confirm the uploaded image now appears.
11. Open `/room/11/key`; confirm it reflects only the published room and exposes no owner/internal data.
12. Restore the original image and alt text in the draft.
13. Publish the restoration.
14. Confirm the test image is no longer used publicly and record cleanup.

## Storage Risk Check

For this V1B implementation, do not use personal/private images: uploaded bytes are stored in an existing public-read bucket under a hard-to-guess URL before publish.
