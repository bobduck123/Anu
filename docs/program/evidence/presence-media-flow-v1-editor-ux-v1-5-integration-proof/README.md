# Presence Editor UX V1.5 and Media Flow V1A Integration Proof

## Summary

Presence Studio now presents the existing Canvas Builder through a calmer owner-facing shell with five modes: Build, Look, Images, Preview, and Advanced. The normal path keeps Canvas as the default, makes Draft room versus Live room explicit, and provides one clear route to preview and open a saved room to visitors.

Media Flow V1A is integrated through an Images mode and the same drawer opened from a selected Canvas image. It uses the existing draft-safe image replacement and alt-text mutations. It does not claim device upload, crop, or focal point support.

## Upstream Material Reviewed

- Claude Editor UX V1.5 pack under `docs/program/evidence/presence-editor-ux-v1-5-spec/`, including the interaction architecture, copy pack, media flow, hide/show policy, and handoff.
- Kimi Media Flow V1 candidate under `C:/Dev/docs/program/evidence/presence-media-flow-v1-kimi-candidate/` and `C:/Dev/_bmad-output/implementation-artifacts/media-flow-v1-kimi-candidate/`.

Kimi was treated as reference only. Its candidate upload simulations and proposed API handlers were not imported into production.

## What Changed

- Added an owner-facing Studio top bar and always-visible Draft/Live status strip.
- Added Build, Look, Images, and Preview as normal-owner modes; Advanced remains accessible but demoted.
- Added a Look panel using existing wired font, mood, palette, option-pack, and safe motion controls.
- Added a Media drawer for room/live image choice and alt-text editing, shared by Images mode and selected Canvas images.
- Removed raw image-link entry from the primary selected-image Canvas workflow.
- Changed contextual image/readiness wording and publish/preview copy to owner-facing language.
- Kept existing draft save, private preview, explicit publish, public rendering, and RoomKey behavior intact.

## Files Changed

Source:

- `presence-app/components/studio/editor/EditorTopBar.tsx`
- `presence-app/components/studio/editor/EditorStatusStrip.tsx`
- `presence-app/components/studio/editor/PresenceStudioEditorApp.tsx`
- `presence-app/components/studio/editor/PresenceCanvasMode.tsx`
- `presence-app/components/studio/editor/PresenceDraftPreviewPage.tsx`
- `presence-app/components/studio/editor/PublishConfirmDialog.tsx`
- `presence-app/components/studio/editor/canvas/LookPanel.tsx`
- `presence-app/components/studio/editor/canvas/MediaDrawer.tsx`
- `presence-app/components/studio/editor/canvas/FontPicker.tsx`
- `presence-app/components/studio/editor/canvas/PalettePicker.tsx`
- `presence-app/components/studio/editor/canvas/OptionPackPicker.tsx`

Tests:

- `presence-app/tests/e2e/presence-editor-ux-v1-5-media-flow.spec.ts`
- Updated existing Canvas, preview/publish, auth, and Studio tests for the revised owner-facing copy and Media drawer.

## Media Flow V1A Support

- Choose a currently supported room or live-room image for the cover or a selected work.
- Edit image alt text through the Images mode or selected-image drawer.
- Persist all choices through the existing draft-only save path.
- Preview privately and publish only through explicit confirmation.

There is no safe draft-room upload endpoint in the Canvas editor contract. An older node-level uploader exists, but using it here would bypass the proven editor draft lifecycle. Upload is therefore accurately presented as coming next.

## Lifecycle Regression Result

Local tests prove:

- save updates the draft,
- public output does not change before publish,
- private preview shows the draft,
- publish requires confirmation,
- public output changes after publish,
- RoomKey reflects the published room,
- standard owner auth and sign-out protections still pass.

## Pilot Readiness

This pass is suitable for post-deployment hosted smoke and then one guided friendly pilot. Media V1A remains managed: an operator must prepare new images until a secure draft-scoped upload flow is implemented and verified.

## Remaining Limitations

See `KNOWN_LIMITATIONS.md`. Hosted verification of the new shell and Media drawer has not been run in this pass.

