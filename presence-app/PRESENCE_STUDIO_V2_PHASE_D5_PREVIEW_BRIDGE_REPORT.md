# Presence Studio V2 Phase D.5 Preview Bridge Report

Date: 2026-06-03

## Executive Verdict

Phase D.5 is complete locally.

Owner draft preview now renders V2 draft rooms through the same sanitized public V2 renderer used by anonymous public routes. Legacy draft preview remains unchanged when no sanitized V2 room is present.

Hosted smoke has not been run and is not claimed.

## Preview Flow Inspected

Route:

- `app/(studio)/studio/[id]/editor/preview/page.tsx`

Preview boundary:

- route metadata sets `robots: { index: false, follow: false }`
- client component requires an owner session token via `resolveOwnerSessionToken`
- protected owner calls load the draft:
  - `previewPresenceEditorDraft(roomId, accessToken)`
  - `getPresenceEditor(roomId, accessToken)`
  - `getNode(roomId, accessToken)` with fallback to `nodeFromEditorPreview(...)`

Renderer seam:

- `components/studio/editor/PresenceDraftPreviewPage.tsx`
- previously called `PortfolioRenderer node={previewNode} renderMode="draft"` only
- now constructs a sanitized `studioV2Room` and passes it as a parallel renderer prop

## Implementation

Added shared projection helper:

- `lib/presence/studio-v2/publicProjection.ts`

The helper:

- accepts a `PresenceNode` plus optional editable config
- checks V2 feature flag and pilot eligibility
- maps through `studioV2FromPresenceConfig`
- projects through `publicRoomFromStudioV2State`
- returns only `StudioV2PublicRoom`

Draft preview now:

- builds `previewNode` exactly as before for legacy support
- computes `studioV2Room` with `studioV2PublicRoomFromPresenceNode(...)`
- passes `studioV2Room` to `PortfolioRenderer`
- strips `editable_config` from the node passed to `PortfolioRenderer` when V2 is active
- preserves the full legacy `previewNode` only when `studioV2Room` is absent

Client feature flag note:

- anonymous public routes compute V2 projection on the server
- owner draft preview computes after client-side owner draft fetches
- the preview page passes an explicit `NEXT_PUBLIC_*` feature env into the projection helper so the client bundle respects the same feature flag and pilot ID gate

## Mobile Visibility Decision

Implemented Option A.

Public V2 objects with `mobileVisible === false` remain visible on desktop public viewports but are hidden under narrow public viewports via scoped CSS:

- `.presence-studio-v2-public .v2-public-object.is-mobile-muted`

Owner editor indicators remain editor-side behavior.

## Tests Added/Updated

Added:

- `tests/e2e/presence-studio-v2-draft-preview.spec.ts`

Updated:

- `tests/e2e/presence-studio-v2-public-render.spec.ts`
- `tests/e2e/mock-presence-api.mjs`
- `playwright.config.ts`

Coverage:

- V2 owner draft preview renders `.presence-studio-v2-public`
- legacy owner draft preview does not render V2 public renderer
- V2 preview hides public-hidden objects
- V2 preview has no editor toolbar, side panel, floating toolbar, or object badges
- V2 preview HTML has no restricted config names or editor-only state strings
- V2 public and draft-preview browser specs collect console errors and page errors and assert none occurred
- anonymous public V2 render remains real route coverage for `/p/v2-public-room` and `/presence/v2-public-room`
- public mobile viewport hides mobile-muted objects
- legacy public route remains on old path

## QA Results

Passed:

```powershell
npm.cmd run typecheck
npm.cmd run build
node --experimental-strip-types --test lib\presence\studio-v2\studioV2Adapters.test.ts
node --experimental-strip-types --test lib\presence\render\publicPayload.test.ts
node --experimental-strip-types --test lib\presence\render\resolver.test.ts
npx.cmd playwright test presence-studio-v2-public-render.spec.ts --project=chromium
npx.cmd playwright test presence-studio-v2-draft-preview.spec.ts --project=chromium
npx.cmd playwright test presence-public-payload-hygiene.spec.ts --project=chromium
```

Notes:

- Direct Node TypeScript tests still emit the existing `MODULE_TYPELESS_PACKAGE_JSON` warning.
- Next build and Playwright web server still emit the existing Turbopack workspace-root warning due to multiple lockfiles under `C:\Dev`.

## Files Changed

- `components/studio/editor/PresenceDraftPreviewPage.tsx`
- `components/presence-studio-v2/presence-studio-v2-public.css`
- `lib/presence/studio-v2/publicProjection.ts`
- `lib/presence/studio-v2/index.ts`
- `lib/presence/render/publicPayload.ts`
- `playwright.config.ts`
- `tests/e2e/mock-presence-api.mjs`
- `tests/e2e/presence-studio-v2-public-render.spec.ts`
- `tests/e2e/presence-studio-v2-draft-preview.spec.ts`
- `PRESENCE_STUDIO_V2_LOCAL_QA.md`
- `PRESENCE_STUDIO_V2_PHASE_D_PUBLIC_RENDERER_REPORT.md`

## Remaining Risks

- Hosted smoke has not been run.
- Owner preview still displays owner-only preview chrome, publish readiness, and draft controls around the public room; this is expected for owner preview and not part of the public renderer.
- V2 work-detail routes remain on existing work-detail behavior.
- Phase C non-blockers remain: no dedicated Playwright coverage for the full V2 editor UI, limited title/tagline/CTA editing in V2 UI, and no user-facing mobile recovery control.

## Phase E Readiness

Phase E hosted smoke can proceed locally from this point.

Do not claim production rollout until hosted lifecycle smoke passes with the feature flag enabled only for selected pilot rooms.
