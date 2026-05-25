# Presence Hosted Auth and Readiness Stabilization Proof

## Summary

This pass addresses the two hosted P0 blockers reported against Canvas Builder V2:

- an authenticated owner could load the Canvas editor but was gated from the private draft preview;
- publish was falsely blocked because readiness did not count the hero image already resolved and displayed by the GGM room model.

It also adds narrowly scoped recovery for transient hosted owner-read failures. Local contract, build, browser, and backend boundary tests pass. The updated deployment has not yet been re-smoked on Vercel, so this is not a hosted pilot sign-off.

## Root Causes Found

### Authenticated Preview Gate

The preview UI could fail through a separate owner-node hydration path before the protected editor preview response was allowed to establish the owner's private preview. A transient or stale node read could therefore show the owner-access gate to a valid editor session.

The editor and preview now use the same Supabase owner-session token resolver. Preview authorisation is based on the protected editor endpoints; a non-critical owner-node hydration failure no longer replaces an authorised preview with the denial screen.

### False Primary Artwork Blocker

Readiness assessed authored draft asset locations independently of the shared render resolver. For a GGM room using a valid inherited/canonical hero resolved into Canvas and eventual public rendering, the UI showed an image while publish readiness reported it missing.

Readiness now resolves the draft room through `resolveRenderModel(..., "draft")` and, for the GGM renderer, counts a valid visible resolved hero or work image. Unsafe authored asset URLs remain blocked.

### First-Request Hosted Behaviour

The precise hosted cold-start trigger cannot be proven locally. The client did, however, previously treat transient owner-read failures as terminal UI state.

Safe idempotent owner reads now retry bounded transient failures with backoff. Publish, draft save, and other mutations are not automatically retried.

## Files Changed

Application:

- `presence-app/components/studio/ownerSession.ts`
- `presence-app/components/studio/useOwnerNode.ts`
- `presence-app/components/studio/editor/PresenceDraftPreviewPage.tsx`
- `presence-app/components/studio/editor/PresenceStudioEditorApp.tsx`
- `presence-app/lib/api/client.ts`
- `presence-app/lib/api/editor.ts`
- `presence-app/lib/api/owner.ts`
- `presence-app/lib/editor/readiness.ts`

Tests:

- `presence-app/lib/api/client.test.ts`
- `presence-app/lib/editor/readiness.test.ts`
- `presence-app/tests/e2e/mock-presence-api.mjs`
- `presence-app/tests/e2e/canvas-builder-preview-publish-p0.spec.ts`

Evidence:

- this evidence directory and locally captured screenshots under `screenshots/`

## Auth Preview Fix

- Shared `resolveOwnerSessionToken()` supplies bearer owner-session handling to both editor and preview.
- Draft preview reads use the protected editor preview/overview path before optional node enrichment.
- Safe preview read recovery handles a transient warm-up response without converting it into a hard denial.
- Anonymous and non-owner responses remain denial states and do not render draft room content.
- Preview remains labelled private and `noindex`.

## Readiness Fix

- GGM media readiness now uses the same resolved draft room media that Canvas renders.
- A real visible publishable resolved hero/work image satisfies the primary image check.
- A generic room without authored/resolved imagery remains blocked.
- Existing unsafe asset validation still blocks unsafe image URLs.

## First-Request Handling

- Retries apply only to selected owner reads and the existing preview ensure/read operation.
- Retryable results are network errors, timeout-like responses, `408`, `429`, `502`, `503`, and `504`.
- One `401` recheck is permitted only when a local owner session token is already present.
- Confirmed `403` denial is never retried as owner access.
- Save and publish writes remain single-attempt with explicit user feedback.

## Local Tests

| Check | Result |
| --- | --- |
| `npm.cmd run typecheck` | Passed |
| Targeted Node contracts including auth retry, readiness, resolver, Canvas, asset safety, graph, widgets/options/typography | Passed, 38/38 |
| `npm.cmd run build` | Passed |
| Backend editor/graph/RoomKey/CORS tests | Passed, 25/25 |
| Playwright editor/parity/preview-publish/RoomKey regressions | Passed, 19/19 |
| `git diff --check` | Passed after evidence documentation |

Warnings observed: Next.js reports the existing multi-lockfile inferred workspace root warning; backend tests report existing SQLAlchemy legacy API warnings.

## Local Screenshots

The PNG evidence is produced by local Playwright fixtures and is not hosted proof:

- `screenshots/owner-editor-draft-saved.png`
- `screenshots/public-before-publish.png`
- `screenshots/owner-preview-renders-draft.png`
- `screenshots/anonymous-preview-denial.png`
- `screenshots/publish-confirmation-dialog.png`
- `screenshots/public-after-publish.png`
- `screenshots/roomkey-after-publish.png`
- `screenshots/hosted-runtime-diagnostics-local.png`

## Hosted Status

Hosted verification is **NOT RUN** for this change set. The repair must be deployed and re-smoked against `https://your-presence.vercel.app` with an owner session before a friendly pilot proceeds.

## Remaining Limitations

- The underlying Vercel/backend first-request cause remains unconfirmed until post-deployment diagnostics are observed.
- Retry reduces transient read poisoning; it does not repair persistent backend/session/cookie configuration failures.
- Hosted publish and cleanup must still be demonstrated on room `11` after deployment.

## Pilot Recommendation

The local blockers are repaired with passing lifecycle coverage. Hold the pilot until a deployed owner re-smoke proves private preview, explicit publish, public-only-after-publish, and cleanup on the hosted room.
