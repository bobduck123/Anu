# Editor API 500 Fix

## Behavior

The owner editor endpoint now returns a `media_capability` summary while
continuing to return normal editor data even when V1C infrastructure is not
ready.

When `presence_media_asset` does not exist:

- editor reads do not query it,
- V1B public-safe uploads remain available,
- private read/delete/cleanup operations do not crash,
- publishing an ordinary V1B draft remains supported,
- publishing an existing private draft reference fails closed with an honest
  error until private media setup is restored.

## Transaction Safety

The media-table availability check is cached per running application instance
and evaluated before draft mutations begin. This avoids disturbing an active
database transaction while probing optional infrastructure.

After applying the V1C migration to a running hosted deployment, restart or
redeploy the backend before attempting to enable protected uploads.

