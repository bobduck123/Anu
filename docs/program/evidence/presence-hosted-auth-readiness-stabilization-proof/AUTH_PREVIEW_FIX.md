# Authenticated Draft Preview Fix

## Symptom

Hosted owner access worked at `/studio/11/editor`, but the same owner was shown the access gate at `/studio/11/editor/preview`.

## Failure Path

Preview could be gated by its owner-node hydration read before its protected editor draft/overview read established that the session may view the private draft. A transient failure or stale denial on that separate read produced the same visible outcome as a genuine non-owner denial.

## Repair

- Added one owner-session token resolver shared by editor and preview.
- Made the protected editor preview/overview response the authorisation-bearing source for rendering the private draft.
- Kept node enrichment optional once authorised preview data is available.
- Applied bounded recovery only to safe owner reads and preview ensure/read.
- Preserved anonymous and non-owner denial without exposing draft content.

## Verified Locally

- Authenticated preview renders the draft marker and private preview label.
- Preview includes `noindex`.
- A mocked owner-node failure plus transient editor/preview warm-up response still results in the authorised draft preview.
- Anonymous and non-owner preview states remain gated without the draft marker.

## Security Position

This change does not introduce a public preview URL or token mechanism. It uses the existing bearer owner session and existing protected editor routes.
