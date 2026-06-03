# Presence Studio V2 Local QA

Date: 2026-06-03

## Scope

Local QA for the Studio V2 integration slice, including Phase A adapter hardening:

- integration audit
- adapter/model/sanitizer scaffold
- feature flag helper
- optional sanitized V2 public payload projection
- adapter hardening (production guard, moodboard lift, world mapping, type safety, test expansion)

This QA does not certify the full V2 editor UI, because that UI has not yet been mounted into the real owner Studio route.

## Commands Run

```powershell
npm.cmd run typecheck
npm.cmd run build
node --experimental-strip-types --test lib\presence\studio-v2\studioV2Adapters.test.ts
node --experimental-strip-types --test lib\presence\render\publicPayload.test.ts
```

## Results

- TypeScript: passed.
- Production build: passed.
- Studio V2 adapter tests: 13 passed (was 5).
- Public payload tests: 3 passed.

## Verified

- Studio V2 state maps into the existing nested editable config areas.
- Existing nested config keys are preserved when V2 config is written.
- V2 config round-trips back into runtime state.
- Locked/pinned owner edit state persists in owner config.
- Hidden public objects are removed from public projection.
- Mobile transform suspension affects public projection.
- Public V2 projection has no restricted payload keys.
- V2 public projection is only added when the feature flag and pilot eligibility allow it.
- Existing public payload hygiene test still passes.
- Production build still compiles all current routes.
- **Production empty-pilot guard blocks all rooms when pilot list is empty in production.**
- **Sanitizer recursively strips restricted keys at all nesting depths.**
- **`safePublicUrl` rejects file://, javascript:, localhost, private IPs, control-plane paths.**
- **`normalizeTransform` clamps x/y, scale, rotation, zIndex to safe boundaries.**
- **Malformed stored config (missing objectState, garbage sections, wrong types) recovers safely.**
- **Legacy moodboard references lift from content_config and asset_config sources.**
- **Explicit room_type mapping takes precedence over substring heuristic.**

## Warnings

Direct Node TypeScript test execution emitted:

```txt
MODULE_TYPELESS_PACKAGE_JSON
```

This is caused by running `.ts` test files directly with Node's built-in type stripping. It does not affect the Next production build.

The build emitted the existing Turbopack workspace-root warning because multiple lockfiles exist:

```txt
Next.js inferred your workspace root ... Detected additional lockfiles
```

This warning existed at build time and is not caused by the Studio V2 adapter slice.

## Phase B Verification (2026-05-31)

Commands run:

```powershell
npm.cmd run typecheck
npm.cmd run build
node --experimental-strip-types --test lib\presence\studio-v2\studioV2Adapters.test.ts
node --experimental-strip-types --test lib\presence\render\publicPayload.test.ts
```

Results:

- TypeScript: passed.
- Production build: passed.
- Studio V2 adapter tests: 14 passed (was 13, +1 mount evidence test).
- Public payload tests: 3 passed.

Verified:

- Feature flag branch added to `app/(studio)/studio/[id]/editor/page.tsx`.
- `shouldUsePresenceStudioV2` gates V2 editor mount; non-V2 rooms fall through to legacy editor unchanged.
- `PresenceStudioV2Editor` loads real draft via `getPresenceEditor` + `studioV2FromPresenceConfig`.
- Title edit mutates local React state and marks dirty.
- Save converts via `presenceConfigFromStudioV2State` and calls `patchPresenceEditorDraft` / `createPresenceEditorDraft`.
- Save refreshes base state from backend response; dirty state clears.
- Round-trip test proves updated title persists through adapter serialization and deserialization.
- No `localStorage` usage in V2 editor component.
- No TemplateKit API usage in V2 editor component.
- Scoped CSS root `.presence-studio-v2` created; no style collisions.
- Stable test IDs added for future Playwright coverage.

## Phase C Verification (2026-05-31)

Commands run:

```powershell
npm.cmd run typecheck
npm.cmd run build
node --experimental-strip-types --test lib\presence\studio-v2\studioV2Adapters.test.ts
node --experimental-strip-types --test lib\presence\render\publicPayload.test.ts
```

Results:

- TypeScript: passed.
- Production build: passed.
- Studio V2 adapter tests: 14 passed.
- Public payload tests: 3 passed.

Verified:

- Full V2 cockpit renders with toolbar, room stage, and panels.
- `PresenceStudioV2Room` renders chambers and objects with world-specific backgrounds.
- Object selection works (click object → selected state; click background → deselect).
- Floating toolbar appears on selection with Edit/Duplicate/Visibility/Delete.
- Wild Mode adds Layer/Pin/Lock to floating toolbar.
- Object Editor panel opens on Edit with title, type, meta, detail, link, image, visibility, transform, lock/pin.
- Transform buttons adjust X/Y/rotation/scale/ZIndex in wild mode.
- Add Object panel with type grid and form creates new objects.
- Duplicate creates copy with offset transform and selects it.
- Delete removes object from state.
- Skin Lab panel with 10 controls updates `StudioV2Skin` live.
- World Switcher overlay changes `worldId`.
- Moodboard panel adds/removes references with type and color.
- Desktop/Mobile viewport toggle narrows room stage.
- Social traces render entries/seeds/guestbook strip.
- Editor badges show Locked/Pinned/Hidden/Wild transform suspended.
- Save Draft persists all changes through owner editor draft API.
- No `localStorage` usage in any V2 component.
- No TemplateKit API usage in any V2 component.
- All CSS scoped under `.presence-studio-v2`.

## Not Yet Verified

- Pointer-based drag/resize/rotate (button controls only).
- Auto-save debounce.
- Preview button wired.
- Publish button wired.
- Browser console cleanliness under full interaction load.
- Hosted smoke.

## Phase D Verification (2026-06-03)

Commands run:

```powershell
npm.cmd run typecheck
npm.cmd run build
node --experimental-strip-types --test lib\presence\studio-v2\studioV2Adapters.test.ts
node --experimental-strip-types --test lib\presence\render\publicPayload.test.ts
node --experimental-strip-types --test lib\presence\render\resolver.test.ts
npx playwright test presence-studio-v2-public-render.spec.ts --project=chromium
npx playwright test presence-public-payload-hygiene.spec.ts --project=chromium
```

Results:

- TypeScript: passed.
- Production build: passed.
- Studio V2 adapter tests: 14 passed.
- Public payload tests: 5 passed.
- Render resolver tests: 8 passed.
- V2 public renderer Playwright smoke: 2 passed.
- Existing public payload hygiene Playwright smoke: 2 passed.

Verified:

- `/p/[slug]` passes sanitized `studioV2Room` into `PortfolioRenderer`.
- `/presence/[slug]` inherits the same dispatch through its route re-export.
- `PortfolioRenderer` renders `PresenceStudioV2PublicRoom` only when sanitized `studioV2Room` exists.
- Legacy public rooms keep the existing DNA/legacy rendering path when `studioV2Room` is absent.
- Public V2 renderer accepts only `StudioV2PublicRoom`, not raw editable config.
- Public V2 renderer displays title, tagline, world surface, chambers, public objects, CTA, moodboard references, and disclosed demo traces.
- Hidden public objects do not render.
- Editor controls, side panels, floating toolbar, and editor badges do not render.
- Restricted internal config names and editor/private terms are absent from V2 public HTML.
- Existing `/room/[id]/key` redirect/hygiene path still passes.

Warnings:

- Direct Node TypeScript test execution still emits `MODULE_TYPELESS_PACKAGE_JSON`.
- Build and Playwright web server still emit the existing Turbopack workspace-root warning due to multiple lockfiles.
- Direct Node execution of `lib\presence\studio-room\studioRoomPublicRender.test.ts` remains blocked by an existing extensionless import path; this is not new to Phase D.
- Browser plugin in-app automation was not available because the Node REPL callable was not exposed; CLI Playwright was used for browser verification.

Still not verified:

- Hosted smoke.
- V2-specific work detail behavior under `/p/[slug]/works/[workId]`; this route remains on the existing work-detail implementation.
- Full owner preview/publish lifecycle for a hosted V2 room.

## Phase D.5 Verification (2026-06-03)

Commands run:

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

Results:

- TypeScript: passed.
- Production build: passed.
- Studio V2 adapter tests: 14 passed.
- Public payload tests: 5 passed.
- Render resolver tests: 8 passed.
- V2 anonymous public render Playwright smoke: 3 passed.
- V2 owner draft preview Playwright smoke: 2 passed.
- Existing public payload hygiene Playwright smoke: 2 passed.

Verified:

- Owner draft preview route `/studio/101/editor/preview` remains owner-gated and noindex.
- V2 owner draft preview constructs a sanitized `StudioV2PublicRoom` through the shared adapter/projection helper.
- `PortfolioRenderer` receives `studioV2Room` for V2 preview and a scrubbed node with `editable_config: null`.
- Legacy owner draft preview keeps the existing renderer path when `studioV2Room` is absent.
- V2 draft preview renders `.presence-studio-v2-public`.
- V2 draft preview does not render editor toolbar, side panel, floating object tools, or object state badges.
- V2 draft preview HTML does not contain nested config names or editor-only lock/pin/hidden state strings.
- Public V2 mobile viewport hides `mobileVisible === false` objects.
- Anonymous public V2 route and `/presence/[slug]` alias remain clean.
- V2 public and draft-preview browser specs collect console errors and page errors and assert none occurred.
- Existing public payload hygiene paths still pass.

Warnings:

- Direct Node TypeScript test execution still emits `MODULE_TYPELESS_PACKAGE_JSON`.
- Build and Playwright web server still emit the existing Turbopack workspace-root warning due to multiple lockfiles.

Still not verified:

- Hosted smoke.
- Production/preview deployment behavior.
- V2 work-detail routes under `/p/[slug]/works/[workId]`.

## Phase E Local Preflight (2026-06-03)

Commands run:

```powershell
npm.cmd run typecheck
npm.cmd run build
node --experimental-strip-types --test lib\presence\studio-v2\studioV2Adapters.test.ts
node --experimental-strip-types --test lib\presence\render\publicPayload.test.ts
node --experimental-strip-types --test lib\presence\render\resolver.test.ts
node --experimental-strip-types --test lib\editor\readiness.test.ts
npx.cmd playwright test presence-studio-v2-public-render.spec.ts --project=chromium
npx.cmd playwright test presence-studio-v2-draft-preview.spec.ts --project=chromium --workers=1
npx.cmd playwright test presence-public-payload-hygiene.spec.ts --project=chromium
npx.cmd playwright test presence-studio-v2-hosted-lifecycle.spec.ts --project=chromium --workers=1
```

Results:

- TypeScript: passed.
- Production build: passed.
- Studio V2 adapter tests: 14 passed.
- Public payload tests: 5 passed.
- Render resolver tests: 8 passed.
- Editor readiness tests: 5 passed.
- V2 anonymous public render Playwright smoke: 3 passed.
- V2 owner draft preview Playwright smoke: 2 passed.
- Existing public payload hygiene Playwright smoke: 2 passed.
- Hosted V2 lifecycle Playwright smoke: 1 skipped because hosted env was not configured.

Additional verification:

- Added hosted lifecycle smoke spec at `tests/e2e/presence-studio-v2-hosted-lifecycle.spec.ts`.
- Added Studio V2 publish-readiness branch so valid V2 drafts are not blocked by legacy GGM readiness requirements.
- Added readiness regression: a valid V2 draft is not blocked by missing legacy `artwork_field`, primary image, primary CTA, or enquiry routing.
- Confirmed hosted V2 feature gating conventions and rollback path.
- Confirmed no hosted smoke env keys or V2 pilot room ID are configured in repo env files.

Warnings:

- Direct Node TypeScript test execution still emits `MODULE_TYPELESS_PACKAGE_JSON`.
- Build and Playwright web server still emit the existing Turbopack workspace-root warning due to multiple lockfiles.
- Running V2 public and draft-preview Playwright specs in parallel can hit the known mock API port/global-state contention; sequential runs pass.

Still not verified:

- Hosted V2 editor lifecycle.
- Hosted owner preview lifecycle.
- Hosted real publish.
- Hosted anonymous public V2 render after publish.
- Hosted cleanup/restoration.

Phase E hosted smoke remains blocked until the required hosted env variables and pilot room ID are supplied.
