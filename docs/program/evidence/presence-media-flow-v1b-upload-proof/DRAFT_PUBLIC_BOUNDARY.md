# Draft And Public Boundary

## Implemented Boundary

- Upload creates a media item in the owner draft inventory.
- `Use this image` updates only the nested draft image role.
- The authenticated draft preview resolves the selected uploaded image.
- Public serialisation excludes unused upload inventory.
- Public render remains on the published room until explicit confirmation and publish.
- RoomKey continues to render published values only.

## Automated Proof

`tests/e2e/presence-media-flow-v1b-upload.spec.ts`:

1. uploads a PNG in Images mode,
2. provides alt text,
3. places it as the cover image in the draft,
4. asserts the public room does not contain the uploaded marker,
5. asserts private preview renders the uploaded image,
6. publishes through the confirmation dialog,
7. asserts public room renders the uploaded image,
8. asserts RoomKey renders the published result without private/internal labels.

The backend integration test independently asserts public JSON excludes the uploaded URL before publish and excludes draft inventory after publish while retaining the visible selected image.

## Storage Caveat

The current Supabase bucket exposes bytes by public URL if that random URL is obtained. The application prevents discovery through public room payloads before publication, but this is not storage-layer privacy.
