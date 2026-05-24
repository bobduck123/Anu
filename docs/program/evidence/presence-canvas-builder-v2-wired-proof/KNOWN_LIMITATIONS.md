# Known Limitations

## Live Now

- GGM Canvas, authenticated draft preview, public room, and RoomKey route use the shared render-model contract for supported values.
- Gallery wall is the only exposed public-backed gallery layout.
- Live normal-owner blocks are displayed as room inventory: Hero, Statement, Work wall, Calling card, and Invitation where present.
- Fonts, palette tokens, Paper Gallery and Ink Room packs, visible copy editing, existing image/alt editing, readiness, and constrained work reorder are live for GGM.

## Disabled or Deferred

- Adding new blocks from the widget library is not enabled. The drawer is an honest inventory until a public placement contract is implemented.
- Alternate gallery layouts are hidden; no archive drawer, spread, carousel, polaroid wall, film strip, or masonry control is presented as working.
- Warm and Liquid option packs are hidden from pilot controls because their complete public layout/motion surface is not supported.
- Heavy/immersive motion is not a normal-owner control. A high draft value with heavy motion off is safely resolved to the visible comfortable ceiling before rendering.
- RoomKey copy is separated correctly by resolver mode, but no normal-owner Canvas RoomKey editor is exposed in this pass.

## Media Limits

- Device upload does not exist in this Canvas pass.
- Crop controls do not exist.
- Focal-point controls do not exist.
- Normal owners can choose existing room/attached/canonical images and edit alt text; advanced URL entry remains a secondary pilot path where already available.

## Interaction Limits

- Work-wall reorder is constrained; it does not provide freeform room layout.
- Touch users rely on the existing bottom-sheet inspector and move button fallback; full native touch drag fidelity has not been proven as complete.
- Calling-card line reorder and studio-fragment reorder were not added.

## Rendering Limits

- Visual parity work in this pass is GGM-specific. Generic rooms continue to resolve safely but do not have a new full Canvas parity proof.
- Canvas is a purposeful editing composition backed by the shared visible model, not a pixel-identical visitor-stage DOM. Full preview is the exact draft visitor render.
- Fixed GGM location/timeline and inspiration-rail chrome remain canonical renderer material and are not offered as editable Canvas controls.

## Proof Limits

- No hosted smoke run or real authenticated pilot account walkthrough was performed in this pass.
- Local Playwright proof uses the test fixture and local server.
- This is not ready evidence for paid self-serve pilots until hosted parity, first-user workflow, media onboarding, and the intentionally deferred controls are validated.
