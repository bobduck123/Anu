# Presence Studio V2 Phase D Public Renderer Report

Date: 2026-06-03

## Executive Verdict

Phase D is complete locally.

Published, feature-flagged Studio V2 rooms now render through a dedicated public V2 renderer when `createPublicRenderPayload` provides a sanitized `studioV2Room`. Legacy public rooms continue through the existing DNA/legacy path when `studioV2Room` is absent.

Hosted rollout is not claimed. Phase E preview/publish/hosted smoke can proceed after this local public-render dispatch pass.

## Dispatch Seam Used

The dispatch seam is `components/portfolio/PortfolioRenderer.tsx`.

Behavior:

- If `studioV2Room` is present, render `PresenceStudioV2PublicRoom`.
- Otherwise preserve existing rendering:
  - default public route uses `PresenceDnaRenderer`
  - legacy opt-in still uses the existing legacy renderer branches

Studio V2 was not added to DNA inference.

## Route Prop Flow

Modified:

- `app/(public)/p/[slug]/page.tsx`

The public page already called `createPublicRenderPayload(node)`. This pass now passes:

- `publicPayload.node`
- `publicPayload.renderModel`
- `publicPayload.studioV2Room`

into `PortfolioRenderer`.

No raw editable config is passed into the public renderer.

Alias behavior:

- `/presence/[slug]` re-exports `/p/[slug]`, so it receives the same V2 dispatch path.
- `/room/[id]/key` redirects to `/presence/[slug]`, so it continues to land on the same public route.
- `/p/[slug]/works/[workId]` remains unmodified in this pass and keeps its existing work-detail behavior.

## Public Renderer Behavior

Added:

- `components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx`
- `components/presence-studio-v2/presence-studio-v2-public.css`

The component accepts only:

- `StudioV2PublicRoom`

It renders:

- room title
- tagline
- world label/surface/verb
- chambers
- public objects
- safe object images and links
- CTA
- moodboard references
- demo traces only when present in the sanitized payload

It does not render:

- owner editor controls
- floating toolbar
- side panels
- editor badges
- lock/pin labels
- hidden public objects
- raw nested config sections
- localStorage state
- owner API paths

All public styles are scoped under:

- `.presence-studio-v2-public`

The owner/editor stylesheet remains scoped under:

- `.presence-studio-v2`

## Small Phase D Fix

Replaced the moodboard `Date.now()`-only ID with a randomized `makePanelId("mood")` helper in:

- `components/presence-studio-v2/PresenceStudioV2Panels.tsx`

This mirrors the object ID approach more closely without changing editor architecture.

## Payload Hygiene

Updated:

- `lib/presence/render/publicPayload.ts`
- `lib/presence/render/publicPayload.test.ts`

Added restricted scanner coverage for V2/editor terms including:

- `draft`
- `auth`
- `session`
- `token`
- `locked`
- `pinned`
- `hiddenPublic`
- `hiddenMobile`
- `localStorage`
- `WILD TRANSFORM SUSPENDED`
- `v2-toolbar`
- `v2-side-panel`
- `v2-float`
- owner API paths
- private media terms
- TemplateKit terms

The Playwright legacy hygiene spec intentionally avoids broad content terms such as `owner` and `draft` because dev HTML and legitimate fixture copy can contain them as ordinary words. Unit payload scanners cover those as structural keys.

## Browser Smoke

Added:

- `tests/e2e/presence-studio-v2-public-render.spec.ts`
- `tests/e2e/mock-presence-api.mjs` V2 public room fixture
- local Playwright env flags in `playwright.config.ts`:
  - `NEXT_PUBLIC_PRESENCE_STUDIO_V2=1`
  - `NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS=101,202`

The mock V2 public room uses a published nested config with `studio_v2` data across the existing config sections. The browser test verifies:

- `/p/v2-public-room` renders `.presence-studio-v2-public`
- title, chamber, object, CTA, moodboard, and disclosed demo traces are visible
- hidden public object does not render
- mobile-muted object remains visible on desktop and is hidden on narrow public viewports
- editor toolbar/panels/badges do not render
- restricted internal/editor terms are absent from HTML
- `/presence/v2-public-room` alias renders the same public V2 route
- `/p/test-presence-room` legacy route does not render V2 public renderer

## QA Results

Passed:

```powershell
npm.cmd run typecheck
npm.cmd run build
node --experimental-strip-types --test lib\presence\studio-v2\studioV2Adapters.test.ts
node --experimental-strip-types --test lib\presence\render\publicPayload.test.ts
npx playwright test presence-studio-v2-public-render.spec.ts --project=chromium
npx playwright test presence-public-payload-hygiene.spec.ts --project=chromium
node --experimental-strip-types --test lib\presence\render\resolver.test.ts
```

Notes:

- The required Node test commands emitted the existing `MODULE_TYPELESS_PACKAGE_JSON` warning. Tests passed.
- `npm.cmd run build` emitted the existing Turbopack workspace-root warning about multiple lockfiles. Build passed.
- Direct Node execution of `lib\presence\studio-room\studioRoomPublicRender.test.ts` is blocked by an existing extensionless import in that test path. The production build and Playwright public route tests pass.
- The first Playwright invocation using a backslash path did not match tests; rerun with `presence-studio-v2-public-render.spec.ts` passed.

## Files Changed

- `app/(public)/p/[slug]/page.tsx`
- `components/portfolio/PortfolioRenderer.tsx`
- `components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx`
- `components/presence-studio-v2/presence-studio-v2-public.css`
- `components/presence-studio-v2/PresenceStudioV2Panels.tsx`
- `lib/presence/render/publicPayload.ts`
- `lib/presence/render/publicPayload.test.ts`
- `playwright.config.ts`
- `tests/e2e/mock-presence-api.mjs`
- `tests/e2e/presence-public-payload-hygiene.spec.ts`
- `tests/e2e/presence-studio-v2-public-render.spec.ts`

## Remaining Risks

- Hosted smoke has not been run.
- V2 work-detail route behavior (`/p/[slug]/works/[workId]`) remains on the existing work-detail path.
- V2 public renderer is intentionally simpler than the owner/editor visual room; further visual refinement should stay public-only and avoid editor controls.
- Phase C non-blockers remain unless separately addressed:
  - CTA/title/tagline editing in the V2 UI is still limited.
  - Pointer drag/resize/rotate browser coverage is not part of this pass.
  - User-facing mobile recovery control is not part of this pass.

## Phase E Readiness

Phase E can proceed to preview/publish and hosted smoke preparation.

Do not enable production rollout broadly yet. Keep V2 public rendering behind the existing feature flag and pilot ID gate until hosted lifecycle smoke passes.

## Phase D.5 Addendum

Phase D.5 fixed the owner draft preview bridge after Kimi's Phase D audit.

Owner draft preview now constructs a sanitized `studioV2Room` through `studioV2PublicRoomFromPresenceNode(...)` and passes it to `PortfolioRenderer`. When V2 is active, the node passed alongside it is scrubbed with `editable_config: null`; legacy draft preview still receives the existing draft node when V2 is absent.

Added report:

- `PRESENCE_STUDIO_V2_PHASE_D5_PREVIEW_BRIDGE_REPORT.md`

Added browser coverage:

- `tests/e2e/presence-studio-v2-draft-preview.spec.ts`

Phase E hosted smoke can proceed, but production readiness is still not claimed until hosted lifecycle smoke passes.
