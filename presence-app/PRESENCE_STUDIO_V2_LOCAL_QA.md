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
- V2 public renderer dispatch.
- Real V2 public route rendering.
- Browser console cleanliness under full interaction load.
- Hosted smoke.
