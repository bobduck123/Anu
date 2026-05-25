# Presence Canvas Builder V2: P0 Preview and Publish Fix

Date: 2026-05-25

Scope: targeted blocker repair for the existing Canvas Builder V2 lifecycle

## Summary

This pass fixes the two hosted blocker paths reported for the controlled GGM pilot:

1. Full draft preview now authenticates through the protected editor preview lifecycle and renders for an authorized owner even when optional legacy node hydration fails.
2. Open-to-visitors now has one clear normal-Canvas trigger, no first-publication deadlock, explicit confirmation, retained success feedback, and a visible explanation when actual safety issues block publication.

This is not a customization or widget expansion pass. Draft/public and RoomKey boundaries remain intact.

## Root Causes Found

### Owner preview gate

`PresenceDraftPreviewPage` used `useOwnerNode()` as an initial gate. That separate generic node fetch could fail or hydrate differently from the protected editor endpoints, causing a valid owner to see the access gate before the authenticated draft-preview response was used.

Fix: preview now obtains the owner session, calls the owner-only editor preview and overview endpoints as the authorization source, and treats the generic node response as optional render enrichment. A safe draft-render node is formed only after the owner editor endpoints succeed.

### Publish blocked or non-responsive

Three issues combined:

- Readiness treated the absence of an earlier published editable Canvas version as a critical issue, making the first intended opening impossible.
- Canvas displayed a second always-enabled `Open to visitors` control separate from the header lifecycle action.
- Successful publish reloaded the parent route behind a loading state, unmounting the editor before its success message could remain visible.

Fix: first opening is guidance rather than a blocker; genuine unsafe readiness items still block. The duplicate Canvas trigger was removed. The canonical header action exposes blocking reasons, opens an accessible confirmation dialog, sends the publish request, and preserves its success feedback during background node refresh.

## Files Changed In This P0 Pass

- `presence-app/app/(studio)/studio/[id]/editor/page.tsx`
- `presence-app/components/studio/editor/PresenceDraftPreviewPage.tsx`
- `presence-app/components/studio/editor/PresenceStudioEditorApp.tsx`
- `presence-app/components/studio/editor/PresenceCanvasMode.tsx`
- `presence-app/components/studio/editor/PublishConfirmDialog.tsx`
- `presence-app/lib/editor/readiness.ts`
- `presence-app/lib/editor/readiness.test.ts`
- `presence-app/tests/e2e/mock-presence-api.mjs`
- `presence-app/tests/e2e/canvas-builder-preview-publish-p0.spec.ts`
- `presence-app/tests/e2e/canvas-builder-parity.spec.ts`
- `presence-app/tests/e2e/presence-canvas-direct-manipulation.spec.ts`
- `docs/program/evidence/presence-canvas-builder-v2-p0-preview-publish-fix/*`

## Before And After

| Path | Before hosted finding | After local verified repair |
| --- | --- | --- |
| Owner full preview | Owner saw access gate | Owner renders private draft preview, including when node hydration is rejected after editor authorization |
| Anonymous preview | Access gated | Still gated; draft marker is absent |
| Non-owner preview | Required verification | Protected editor endpoint denial shown without draft marker |
| Initial publish | Could be disabled because no prior published Canvas version existed | Valid saved first draft can open intentionally |
| Canvas publish action | Duplicate action could be intercepted or disconnected | Normal Canvas exposes only the primary header path |
| Confirmation | Not reached in hosted smoke | Accessible explicit dialog proven by pointer click |
| Publish success | No visible success observed | Success notice remains visible after request succeeds |
| Boundary | Draft stayed private because publish failed | Draft is absent publicly before confirmation and present publicly/through RoomKey after publication in local proof |

## Local Tests Run

| Test | Result |
| --- | --- |
| `npm.cmd run typecheck` | Passed |
| Focused TypeScript contract suite including `lib/editor/readiness.test.ts` | Passed, 33/33 |
| `npm.cmd run build` | Passed |
| Backend editor, graph, and RoomKey/public boundary suite | Passed, 12/12 |
| Playwright Canvas, P0 preview/publish, Studio, RoomKey, and public-route suite | Passed, 17/17 |
| `git diff --check` | Passed |

Non-blocking diagnostics: Next reports the existing multiple-lockfile workspace-root warning during build/browser startup; backend tests report existing SQLAlchemy legacy API warnings.

## Hosted Verification

Hosted verification after this source repair was **NOT RUN**. A usable hosted owner login/session was not available from the local verification context. No live room copy was changed by this pass.

The required hosted rerun is specified in [HOSTED_SMOKE_STEPS.md](./HOSTED_SMOKE_STEPS.md).

## Pilot Recommendation

The two blockers have targeted local automated proof and the lifecycle/security regression set is green. This is sufficient to deploy for re-smoke, not sufficient to claim a live pilot has passed. One friendly guided pilot may proceed only after hosted re-smoke confirms owner preview and intentional publish on room 11, followed by copy restoration.
