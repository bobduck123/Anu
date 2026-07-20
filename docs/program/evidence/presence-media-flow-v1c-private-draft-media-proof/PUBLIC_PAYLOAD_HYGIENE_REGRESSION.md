# Public Payload Hygiene Regression

## Required Absences

Anonymous public output must not contain internal editor field names, draft
media identifiers, storage keys, signed preview data, auth values or operator
metadata.

The existing restricted public payload map now additionally removes:

- `draft_storage_key`
- `published_storage_key`
- `signed_url`
- `preview_expires_at`

## Local Verification

- Backend protected lifecycle test proves the public config excludes the signed
  private media route and media identifier before and after publish.
- Frontend public payload unit test covers storage-control field names.
- Playwright public payload check passed for public room routes in the local
  mock deployment.
- Playwright RoomKey regression passed in the selected suite.

## Hosted Verification Required

After deployment, source-scan:

- `/presence/[slug]`
- `/p/[slug]`
- `/p/[slug]/works/[id]`
- `/room/[id]/key`

for all existing forbidden fields plus private draft paths and signed preview
URLs, both before and after publishing a protected test upload.
