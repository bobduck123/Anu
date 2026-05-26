# Hosted Smoke Steps

## Deployment Preconditions

1. Apply `20260526_presence_media_flow_v1c_private_draft.sql`.
2. Create a non-public Supabase draft media bucket.
3. Set `PRESENCE_MEDIA_DRAFT_BUCKET` on the backend deployment.
4. Retain the public published bucket in `PRESENCE_MEDIA_BUCKET`.
5. Deploy backend and frontend changes.
6. Confirm an upload reports protected draft behavior; if it reports
   public-unlisted behavior, stop and do not claim V1C.

## Controlled Smoke

1. Log in as the room owner.
2. Open Images mode.
3. Upload a harmless JPG, PNG or WEBP test image.
4. Confirm the editor labels the image as private until the room is opened.
5. Assign it to a cover or work slot and add alt text.
6. Confirm focal point is not presented as active.
7. Save the draft.
8. Open the anonymous public room and confirm the new image is absent.
9. Open private preview and confirm the new image is visible.
10. Inspect anonymous public source before publish for internal fields,
    `/media/private/`, `presence/draft/`, storage keys and signed URLs.
11. Open the room to visitors with confirmation.
12. Confirm the anonymous public room shows the promoted image.
13. Inspect public source after publish and confirm it contains only the
    published/public-safe image URL.
14. Open RoomKey and confirm it remains public/published-only and clean.
15. Restore the original image/copy and publish cleanup.
16. Upload an unused harmless image, publish without selecting it, then invoke
    operator cleanup after the retention window and confirm it is removed.

## Go/No-Go

Do not raise the posture above non-sensitive operator-led uploads until steps
1-15 pass on the hosted deployment with the protected policy active.
