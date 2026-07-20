# Presence Studio V2 - Studio Recovery S1 Report

Date: 2026-06-04

## Verdict

S1 is locally implemented and safe to deploy for review. The production Studio V2 editor now has the prototype-grade information architecture needed for a serious room-arrangement cockpit: top chrome, left outline/assets rail, center stage, persistent right inspector, surface tabs, and chamber navigation.

S2 direct manipulation is still intentionally not implemented.

## Prototype Features Recovered

- Three-pane cockpit layout:
  - left outline/assets rail
  - center room stage
  - persistent right inspector
- Top chrome:
  - Presence Studio brand glyph
  - breadcrumb
  - save status
  - Share, Preview, Publish actions
  - preserved Save Draft control
- Surface tabs:
  - Threshold
  - Chamber
  - Studio Archive
- Chamber navigation tabs with scroll-to-chamber behavior.
- Left outline tree:
  - chamber expand/collapse
  - object list
  - object type glyphs
  - active object state
  - click-to-select and scroll-to-object
- Derived assets rail using existing image object URLs only.
- Persistent inspector:
  - room-level title/tagline/world/CTA fields when no object is selected
  - object Content / Style / Motion tabs when an object is selected
  - existing object fields remain wired to the real V2 state
  - transform numeric controls persist, while direct handles remain clearly S2
- Stage atmosphere:
  - scoped cockpit material layer
  - radial lighting
  - subtle grid/grain atmosphere
  - stronger selected/editable space composition
- Responsive collapse:
  - narrow viewport stacks stage, outline, and inspector.

## Files Changed

- `components/presence-studio-v2/PresenceStudioV2Editor.tsx`
- `components/presence-studio-v2/PresenceStudioV2Room.tsx`
- `components/presence-studio-v2/presence-studio-v2.css`
- `tests/e2e/presence-studio-v2-studio-recovery-s1-capture.spec.ts`
- `PRESENCE_STUDIO_V2_STUDIO_RECOVERY_S1_REPORT.md`
- `PRESENCE_STUDIO_V2_LOCAL_QA.md`
- `PRESENCE_STUDIO_V2_PROTOTYPE_SUPERIORITY_AUDIT.md`

Pre-existing P1 changes in the working tree were preserved, including hosted lifecycle selector updates, public CSS consolidation, gallery museum-frame treatment, and world-specific public grids.

## Test IDs Added

- `presence-studio-v2-top-chrome`
- `presence-studio-v2-breadcrumb`
- `presence-studio-v2-preview-action`
- `presence-studio-v2-share-action`
- `presence-studio-v2-publish-action`
- `presence-studio-v2-save-status`
- `presence-studio-v2-tab-threshold`
- `presence-studio-v2-tab-chamber`
- `presence-studio-v2-tab-archive`
- `presence-studio-v2-chamber-tabs`
- `presence-studio-v2-chamber-tab`
- `presence-studio-v2-outline`
- `presence-studio-v2-outline-chamber`
- `presence-studio-v2-outline-object`
- `presence-studio-v2-assets`
- `presence-studio-v2-asset`
- `presence-studio-v2-inspector`
- `presence-studio-v2-inspector-tab-content`
- `presence-studio-v2-inspector-tab-style`
- `presence-studio-v2-inspector-tab-motion`
- `presence-studio-v2-field-title`
- `presence-studio-v2-field-meta`
- `presence-studio-v2-field-detail`
- `presence-studio-v2-field-link`
- `presence-studio-v2-field-image`
- `presence-studio-v2-transform-x`
- `presence-studio-v2-transform-y`
- `presence-studio-v2-transform-scale`
- `presence-studio-v2-transform-rotation`

Existing P1 test IDs such as `studio-v2-object-title`, `studio-v2-open-add`, `studio-v2-open-skin`, and Skin Lab test IDs were preserved.

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
```

Hosted lifecycle spec:

```powershell
npx.cmd playwright test tests/e2e/presence-studio-v2-hosted-lifecycle.spec.ts --project=chromium --workers=1
```

Result: 1 skipped because `PRESENCE_HOSTED_SMOKE` was not set. Hosted smoke was not run against the live deployment because this S1 local patch has not been deployed and a real hosted mutation would not validate the changed local editor.

Capture:

```powershell
PRESENCE_STUDIO_RECOVERY_S1_CAPTURE=1 npx.cmd playwright test tests/e2e/presence-studio-v2-studio-recovery-s1-capture.spec.ts --project=chromium --workers=1
```

The capture test body passed and wrote screenshots. The wrapper command timed out during Playwright web-server teardown after the passing test body, matching earlier visual-capture teardown behavior.

Known warnings:

- Direct Node TypeScript test execution still emits `MODULE_TYPELESS_PACKAGE_JSON`.
- Next build/Playwright still emit the existing Turbopack workspace-root warning due to multiple lockfiles.
- A first parallel Playwright attempt hit `EADDRINUSE`; the affected browser specs passed when rerun sequentially.

## Evidence

Screenshots:

```txt
docs/program/evidence/presence-studio-v2-studio-recovery-s1/01-full-three-pane-studio-cockpit.png
docs/program/evidence/presence-studio-v2-studio-recovery-s1/02-left-outline-assets-rail.png
docs/program/evidence/presence-studio-v2-studio-recovery-s1/03-right-inspector-content-tab.png
docs/program/evidence/presence-studio-v2-studio-recovery-s1/04-right-inspector-style-tab.png
docs/program/evidence/presence-studio-v2-studio-recovery-s1/05-right-inspector-motion-tab.png
docs/program/evidence/presence-studio-v2-studio-recovery-s1/06-threshold-tab.png
docs/program/evidence/presence-studio-v2-studio-recovery-s1/07-chamber-tab-selected-object-state.png
docs/program/evidence/presence-studio-v2-studio-recovery-s1/08-studio-archive-tab.png
docs/program/evidence/presence-studio-v2-studio-recovery-s1/09-mobile-narrow-editor-state.png
```

## S2 Remaining Work

- Direct drag-to-move on the stage.
- Resize handles.
- Rotation handles.
- More precise layer/order controls.
- Object grouping.
- Real upload/asset assignment workflow.
- Undo/redo.

## Safety Notes

- No backend contracts changed.
- No adapter logic changed.
- No auth, routing, preview, publish, public payload, or feature-gating logic changed.
- No TemplateKit endpoints added or used.
- No localStorage production truth added.
- Public renderer and payload sanitisation remain covered by tests.
- Legacy rooms remain on the legacy renderer path when Studio V2 payload is absent.

## Recommendation

Safe to deploy to a preview/staging environment for hosted visual smoke and selector verification. Do not claim hosted S1 readiness until the deployed build is smoked against Room 11.

---

## Hosted S1 Smoke - 2026-06-05

Studio Recovery S1 was deployed to production and verified against hosted Room 11 / `ggm-christina-goddard`.

Deployment:

```txt
Production URL: https://your-presence.vercel.app
Deployment URL: https://presence-8ynedjq8j-emadhatu-2110s-projects.vercel.app
Deployment ID: dpl_EEh5vdTqXMis3nTy8wmP6LYdwNqC
Commit at deploy: f81fca829742939ad24865521d5c2d52f3a4bdfb
```

Result:

- Hosted editor `/studio/11/editor` renders `presence-studio-v2-root`.
- S1 cockpit, top chrome, left outline, persistent inspector, surface tabs, and chamber tabs render on hosted.
- Owner preview renders the sanitized V2 public renderer.
- Public `/p/ggm-christina-goddard` and `/presence/ggm-christina-goddard` render V2.
- Legacy Room 1 remains legacy with no V2 root.
- Full hosted lifecycle smoke passed after selector/spec stabilization.
- Hosted payload hygiene scan reported `0` violations.
- Smoke cleanup/restoration completed; no smoke marker remained public.

Evidence:

```txt
PRESENCE_STUDIO_V2_STUDIO_RECOVERY_S1_HOSTED_SMOKE.md
docs/program/evidence/presence-studio-v2-studio-recovery-s1-hosted/
```

Notes:

- Deployment was made from a dirty local working tree; commit/push should follow before treating this as a durable release baseline.
- The hosted lifecycle mutation path was narrowed to stable S1-critical coverage. Skin Lab and Moodboard remain covered locally and should get a separate non-destructive hosted UI smoke later.
- S2 direct manipulation remains out of scope and still required before public self-serve onboarding.

Hosted verdict: S1 is ready for controlled Room 11 operator-led pilot use.
