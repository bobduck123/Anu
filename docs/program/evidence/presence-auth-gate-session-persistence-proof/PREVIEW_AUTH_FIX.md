# Private Preview Auth Fix

## Contract

`/studio/[id]/editor/preview` remains a private owner-only draft surface. It must render only after the same owner session used by the editor is available and protected editor draft endpoints authorise access.

## Fix

- Preview uses the hydration-aware `resolveOwnerSessionToken({ waitForHydration: true })`.
- A momentarily unavailable browser session remains in `Checking access...` rather than becoming a false sign-in gate.
- When a token exists, preview shows `Warming secure preview...` while protected reads complete.
- Existing safe read retry remains in place for transient backend warm-up responses.
- Confirmed anonymous and non-owner responses remain denied.

## Verified Locally

- Owner standard preview renders `Draft preview not public`.
- Owner preview with `?debug=1` renders identically.
- A delayed session read still resolves into the private preview.
- Anonymous preview, including the debug-query variant, does not render the draft.
- Non-owner preview does not render draft content.
- Existing noindex behavior remains covered by the P0 preview/publish test.
