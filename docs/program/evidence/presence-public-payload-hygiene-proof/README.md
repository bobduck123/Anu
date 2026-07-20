# Presence Public Payload Hygiene Proof

Date: 2026-05-26

## Summary

Presence public room routes now resolve visible published values on the server and pass an allow-listed public display node plus the published render model into client rendering. The Next.js hydration payload no longer receives the nested editor envelope that exposed internal field names in anonymous page HTML.

This pass does not alter Studio editing, upload, preview, publishing, or the published-only RoomKey lifecycle. Local browser coverage proves the V1B upload, assign, preview, publish and RoomKey path still works while anonymous public HTML omits the restricted field names before and after publish.

## Root Cause

`/p/[slug]` and its `/presence/[slug]` alias fetched a published `PresenceNode` and passed the whole object to the client `PortfolioRenderer`. Although the backend payload was published-only, React Server Component hydration serialised nested editor field names including `editable_config`, `asset_config`, `content_config`, `style_dna`, and `motion_config` into public HTML.

## What Changed

- Added `createPublicRenderPayload()` to resolve published visuals before the server/client boundary.
- Added an allow-listed public display node mapper and recursive control-field removal for nested public display values.
- Passed the resolved published render model into public room rendering rather than hydrating the editor envelope.
- Applied the same safe transport to GGM public work-detail rendering.
- Normalised RoomKey rendering through the same published model after its published response is resolved.
- Added unit and Playwright source-hygiene regressions.
- Added source-hygiene checks to the existing Media Flow V1B upload-to-publish browser lifecycle.

## Files Changed

- `presence-app/lib/presence/render/publicPayload.ts`
- `presence-app/lib/presence/render/publicPayload.test.ts`
- `presence-app/app/(public)/p/[slug]/page.tsx`
- `presence-app/app/(public)/p/[slug]/works/[workId]/page.tsx`
- `presence-app/components/portfolio/PortfolioRenderer.tsx`
- `presence-app/components/presence/graph/RoomKeyEntry.tsx`
- `presence-app/tests/e2e/presence-public-payload-hygiene.spec.ts`
- `presence-app/tests/e2e/presence-media-flow-v1b-upload.spec.ts`

## Local Result

- Public rendering retains published title, hero image, alt text, palette, typography and motion through the resolved model.
- Raw HTML for `/p/test-presence-room` and `/presence/test-presence-room` contains none of the restricted terms.
- Upload, image assignment, draft preview, explicit publish, public-after-publish and RoomKey browser regression passes.
- Studio auth, preview/publish, Canvas parity and sign-out safety regressions pass.

## Hosted Status

The user supplied a successful hosted V1B lifecycle smoke before this P1 hardening pass. This payload mapping requires deployment followed by the narrow re-smoke in `HOSTED_SMOKE_STEPS.md`; hosted source hygiene has not been re-run against this local change.

## Recommendation

After deployment and hosted source re-smoke, the existing managed pilot posture remains appropriate. Private draft storage is not proven in this pass, so the product must remain limited to operator-led pilots using non-sensitive uploads.
