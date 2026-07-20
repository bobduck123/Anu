# Studio V2 Layout Composition - Private Local Slice

## Status

This is a private local fixture proof built from environmental checkpoint `d656add`. It adds a guarded room-arrangement contract, not arbitrary page-building and not a hosted migration claim.

Final local proof verdict: `LAYOUT COMPOSITION SLICE COMPLETE`.

## What Owners Can Do

- Choose Gallery Wall or Portal Threshold for the active chamber.
- See typed layout zones inside the editor room.
- Select an existing object and choose a compatible zone, size, treatment, or zone order using touch-safe controls.
- Use the selected object's Arrange handle for direct pointer placement into registered valid zones.
- Preview the same resolved composition through the existing private renderer.

## Guardrails

- Missing or invalid placement data becomes a stable default based on chamber object order.
- Compatibility, maximum-zone capacity, and visibility remain authoritative.
- Hidden-from-public objects are removed before composition reaches the public projection.
- Valid drop zones advertise only when the selected object can legally move there.
- Invalid pointer drops use the same typed placement validator as the controlled selector.
- Hidden-on-mobile remains authoritative in mobile public-style/private preview output; placement data cannot force a mobile-hidden object back into mobile output.

## Architecture

- `layouts.ts` is the typed registry and normalizer.
- Chamber composition is persisted inside the existing `scene_config.studio_v2.chambers[]` draft shape.
- No backend, schema, dependency, WebGL, GSAP, publication, or public route change is included.

## Validation

Local servers were started manually for Playwright with the mock API on `127.0.0.1:5105` and Next dev on `127.0.0.1:3100` using `next dev --webpack`. The Playwright commands below set `PRESENCE_HOSTED_SMOKE=1` only to prevent duplicate webServer startup; the base URL remained local.

```bash
npm.cmd run test:e2e -- tests/e2e/presence-studio-v2-layout-composition.spec.ts --project=chromium --retries=0 --workers=1
```

Result: PASS, 5 passed.

```bash
npm.cmd run test:e2e -- tests/e2e/presence-studio-v2-layout-composition-capture.spec.ts --project=chromium --retries=0 --workers=1
```

Result: PASS, 1 passed.

```bash
npm.cmd run test:e2e -- tests/e2e/presence-studio-v2-environmental-engine.spec.ts tests/e2e/presence-studio-v2-ggm-private-proof.spec.ts tests/e2e/ggm-public-containment.spec.ts tests/e2e/presence-studio-v2-public-render.spec.ts tests/e2e/presence-studio-v2-inspector-usability.spec.ts --project=chromium --retries=0 --workers=1
```

Result: PASS, 15 passed.

```bash
npm.cmd run typecheck
```

Result: PASS.

```bash
npm.cmd run build
```

Result: PASS. The build still reports the pre-existing Next.js multiple-lockfile workspace-root warning.

There is no confirmed lint script and no named npm unit-test script in `package.json`.

## Evidence Index

Private local frames:

1. `screenshots/01-layout-selection-and-zones.png` - layout picker and registered zones.
2. `screenshots/02-zone-size-treatment-controls.png` - selected object placement controls.
3. `screenshots/03-valid-drag-arrange.png` - valid Arrange handle placement.
4. `screenshots/04-invalid-placement-guardrail.png` - invalid drop guardrail.
5. `screenshots/05-portal-threshold-layout.png` - alternate layout selection.
6. `screenshots/06-private-preview-parity.png` - private preview projection without editor instrumentation.
7. `screenshots/07-mobile-placement-controls.png` - mobile editor placement controls.
8. `screenshots/08-reduced-motion-dom-fallback.png` - reduced-motion DOM fallback.
9. `screenshots/09-reorder-before-controls.png` - reorder controls before local save/reload proof.
10. `screenshots/10-reorder-after-save-reload.png` - reordered composition after local draft save/reload.
11. `screenshots/11-hidden-mobile-editor-manageable.png` - mobile-hidden object still manageable in Studio.
12. `screenshots/12-hidden-mobile-private-preview.png` - mobile private preview respects hidden-on-mobile.

These are local fixture evidence only. They are not GGM public proof, hosted owner proof, system-native migration proof, or launch proof.

## Known Limits

- Save/reload persistence is proved against the local mock fixture only.
- No hosted owner-bound Studio claim is made.
- No backend schema, auth, tenant, control-plane, public route, deployment, or production data behavior changed.
- No public GGM claim is made.
- Direct bundled asset URLs remain a separate containment limitation outside this layout-composition slice.

## No-Merge Review

See `NO_MERGE_REVIEW.md`. Local review result: `VERDICT: MERGE` for this proof branch, subject to normal human PR/merge control.
