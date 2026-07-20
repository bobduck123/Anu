# Presence Studio V2 - Studio Recovery S2 Report

Date: 2026-06-05

Branch: `feature/presence-ecosystem-alpha`

Scope: Direct manipulation and object handles for the production Studio V2 editor. No backend contract, auth, preview, publish, public payload, or feature-gating changes were made.

## Summary

Studio Recovery S2 is implemented locally.

Objects in the V2 editor now feel tangible in the canvas:

- selected objects render an editor-only selection frame
- the frame includes a title/type label, corner resize handles, and a rotate handle
- Wild Mode supports pointer drag-to-move
- Wild Mode supports scale via corner handles
- Wild Mode supports rotation via rotate handle
- Motion inspector inputs stay synced with canvas manipulation
- transform changes persist through the existing draft save API and reload path
- Guided Mode and locked objects visibly disable manipulation
- public renderer and owner preview remain free of editor handles/chrome

## Files Changed

Product code:

- `components/presence-studio-v2/PresenceStudioV2Editor.tsx`
- `components/presence-studio-v2/PresenceStudioV2Room.tsx`
- `components/presence-studio-v2/presence-studio-v2.css`

Tests/evidence:

- `tests/e2e/presence-studio-v2-direct-manipulation.spec.ts`
- `tests/e2e/presence-studio-v2-studio-recovery-s2-capture.spec.ts`
- `docs/program/evidence/presence-studio-v2-studio-recovery-s2/`

Reports:

- `PRESENCE_STUDIO_V2_STUDIO_RECOVERY_S2_REPORT.md`
- `PRESENCE_STUDIO_V2_LOCAL_QA.md`
- `PRESENCE_STUDIO_V2_PROTOTYPE_SUPERIORITY_AUDIT.md`

## Interaction Rules

- Guided Mode: selection frame remains visible, but handles are disabled and drag does not update transforms.
- Wild Mode: unlocked selected objects can be dragged, scaled, and rotated with pointer input.
- Locked objects: frame remains visible, lock state is legible, handles are disabled, Motion inputs are disabled.
- Drag source: object body or selection frame starts drag only in Wild Mode.
- Resize source: corner handles update `transform.scale` only in Wild Mode.
- Rotate source: rotate handle updates `transform.rotation` only in Wild Mode.
- Bounds: object x/y values are clamped to sane stage bounds to avoid impossible far-off positions.
- Scale: clamped to `0.45` through `2.5`.
- Rotation: clamped to `-360` through `360`.
- Keyboard: Escape deselects. Arrow keys nudge selected, unlocked objects only in Wild Mode; Shift+Arrow nudges by 10px.

## Test IDs Added

- `presence-studio-v2-selection-frame`
- `presence-studio-v2-selection-label`
- `presence-studio-v2-resize-handle`
- `presence-studio-v2-rotate-handle`
- `presence-studio-v2-draggable-object`
- `presence-studio-v2-drag-readout`
- `presence-studio-v2-transform-z`

Existing S1 test IDs were preserved.

## Persistence Result

No adapter changes were required. The existing Studio V2 transform model already round-trips:

- `x`
- `y`
- `scale`
- `rotation`
- `zIndex`
- locked state
- mobile visibility

The new Playwright direct manipulation test verifies drag, scale, rotation, save, reload, and persisted Motion inspector values through the existing owner draft API mock path.

## QA Results

Passed:

```powershell
npm.cmd run typecheck
npm.cmd run build
node --experimental-strip-types --test lib\presence\studio-v2\feature.test.ts
node --experimental-strip-types --test lib\presence\studio-v2\studioV2Adapters.test.ts
node --experimental-strip-types --test lib\presence\render\publicPayload.test.ts
node --experimental-strip-types --test lib\presence\render\resolver.test.ts
node --experimental-strip-types --test lib\editor\readiness.test.ts
npx.cmd playwright test presence-studio-v2-public-render.spec.ts --project=chromium
npx.cmd playwright test presence-studio-v2-draft-preview.spec.ts --project=chromium --workers=1
npx.cmd playwright test presence-public-payload-hygiene.spec.ts --project=chromium
npx.cmd playwright test presence-studio-v2-direct-manipulation.spec.ts --project=chromium --workers=1
```

Results:

- Typecheck: passed.
- Build: passed.
- Feature tests: 8 passed.
- Studio V2 adapter tests: 14 passed.
- Public payload tests: 5 passed.
- Render resolver tests: 8 passed.
- Editor readiness tests: 5 passed.
- Public V2 render Playwright: 3 passed.
- Draft preview Playwright: 2 passed.
- Public payload hygiene Playwright: 2 passed.
- S2 direct manipulation Playwright: 2 passed.

Known warnings:

- Node TypeScript tests still emit `MODULE_TYPELESS_PACKAGE_JSON`.
- Build/Playwright web server still emits the existing Turbopack workspace-root warning.

## Evidence

Evidence screenshots:

```txt
docs/program/evidence/presence-studio-v2-studio-recovery-s2/
```

Files captured:

- `01-selected-object-frame.png`
- `02-wild-drag-readout.png`
- `03-resized-object-scale-handle.png`
- `04-rotated-object-handle.png`
- `05-motion-tab-synced.png`
- `06-guided-mode-disabled-handles.png`
- `07-locked-object-disabled-handles.png`
- `08-mobile-narrow-editor-safety.png`

The gated capture spec body passed and wrote screenshots, but the shell command hit the local timeout during Playwright teardown. The evidence files are present; this was not an interaction failure.

## Payload And Public Safety

Payload hygiene tests passed after S2.

S2 handles are editor-only because they are rendered only in `PresenceStudioV2Room`, not in `PresenceStudioV2PublicRoom`. Owner preview continues to render through the sanitized public V2 renderer and does not receive selection handles or direct-manipulation chrome.

No internal config names, editor state, locked/pinned fields, hidden flags, TemplateKit paths, or localStorage state were added to public render output.

## Known Limitations

- No real asset upload.
- No undo/redo.
- No grouping.
- No chamber CRUD.
- No collaboration cursors.
- No hosted S2 smoke yet because S2 has not been deployed in this pass.
- Public self-serve onboarding remains out of scope.

## Readiness

- Safe for Kimi audit: yes.
- Safe to deploy after audit: yes, pending normal review and hosted smoke after deployment.
- Controlled operator-led pilot: remains ready for Room 11 with operator support after S2 deployment and hosted verification.
- Public self-serve onboarding: not ready.
