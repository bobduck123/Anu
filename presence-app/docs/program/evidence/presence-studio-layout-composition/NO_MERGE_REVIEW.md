# No-Merge Review: Studio V2 layout composition proof gate

Verdict:

VERDICT: MERGE

Summary:

The blocker-clearing pass completes the local proof gate for Studio V2 layout composition. It preserves the bounded typed layout contract, adds real pointer proof, proves reorder and hidden-on-mobile behavior, and records private local fixture evidence only.

Blocking issues:

- None found in the reviewed local diff.

Non-blocking issues:

- `npm run build` still reports the pre-existing Next.js multiple-lockfile workspace-root warning. The build passes.
- Playwright validation used manually started local servers with `next dev --webpack` to avoid the local Turbopack root-resolution issue from the parent `C:\Dev\package-lock.json`. No config file was changed.

Evidence reviewed:

- `docs/program/evidence/presence-studio-layout-composition/screenshots/01-layout-selection-and-zones.png`
- `docs/program/evidence/presence-studio-layout-composition/screenshots/02-zone-size-treatment-controls.png`
- `docs/program/evidence/presence-studio-layout-composition/screenshots/03-valid-drag-arrange.png`
- `docs/program/evidence/presence-studio-layout-composition/screenshots/04-invalid-placement-guardrail.png`
- `docs/program/evidence/presence-studio-layout-composition/screenshots/05-portal-threshold-layout.png`
- `docs/program/evidence/presence-studio-layout-composition/screenshots/06-private-preview-parity.png`
- `docs/program/evidence/presence-studio-layout-composition/screenshots/07-mobile-placement-controls.png`
- `docs/program/evidence/presence-studio-layout-composition/screenshots/08-reduced-motion-dom-fallback.png`
- `docs/program/evidence/presence-studio-layout-composition/screenshots/09-reorder-before-controls.png`
- `docs/program/evidence/presence-studio-layout-composition/screenshots/10-reorder-after-save-reload.png`
- `docs/program/evidence/presence-studio-layout-composition/screenshots/11-hidden-mobile-editor-manageable.png`
- `docs/program/evidence/presence-studio-layout-composition/screenshots/12-hidden-mobile-private-preview.png`

Tests/build/typecheck:

- PASS: `npm.cmd run test:e2e -- tests/e2e/presence-studio-v2-layout-composition.spec.ts --project=chromium --retries=0 --workers=1` with local servers and `PRESENCE_HOSTED_SMOKE=1`; 5 passed.
- PASS: `npm.cmd run test:e2e -- tests/e2e/presence-studio-v2-layout-composition-capture.spec.ts --project=chromium --retries=0 --workers=1` with local servers and `PRESENCE_HOSTED_SMOKE=1`; 1 passed.
- PASS: `npm.cmd run test:e2e -- tests/e2e/presence-studio-v2-environmental-engine.spec.ts tests/e2e/presence-studio-v2-ggm-private-proof.spec.ts tests/e2e/ggm-public-containment.spec.ts tests/e2e/presence-studio-v2-public-render.spec.ts tests/e2e/presence-studio-v2-inspector-usability.spec.ts --project=chromium --retries=0 --workers=1` with local servers and `PRESENCE_HOSTED_SMOKE=1`; 15 passed.
- PASS: `npm.cmd run typecheck`.
- PASS: `npm.cmd run build`.
- No confirmed lint script exists.
- No named npm unit-test script exists.

Files changed:

- `components/presence-studio-v2/PresenceStudioV2Room.tsx`
- `components/presence-studio-v2/presence-studio-v2.css`
- `tests/e2e/presence-studio-v2-layout-composition.spec.ts`
- `tests/e2e/presence-studio-v2-layout-composition-capture.spec.ts`
- `tests/e2e/presence-studio-v2-public-render.spec.ts`
- `docs/program/evidence/presence-studio-layout-composition/README.md`
- `docs/program/evidence/presence-studio-layout-composition/EXEC_PLAN.md`
- `docs/program/evidence/presence-studio-layout-composition/NO_MERGE_REVIEW.md`
- `docs/program/evidence/presence-studio-layout-composition/screenshots/*.png`

Unexpected changes:

- None expected outside the layout-composition proof scope.

Security/privacy risks:

- No credentials, tokens, account IDs, private URLs, draft payloads, screenshots with private values, or hosted identifiers were added.
- Evidence remains Class B private local fixture proof.

Auth/tenant/routing risks:

- No auth, tenant, control-plane, payment, public-route, deployment, or backend files changed.
- GGM containment tests remain green.

Data persistence risks:

- No backend schema or persistence architecture changed.
- Composition remains stored in the existing `scene_config.studio_v2.chambers[]` draft shape.
- Save/reload proof is local fixture persistence only, not hosted durability proof.

UX/mobile/accessibility:

- Direct Arrange handle now receives pointer events.
- Valid drop zones advertise only when the selected object can legally move there.
- Keyboard/touch-safe zone, size, treatment, move-up, and move-down controls remain.
- Hidden-on-mobile objects remain manageable in Studio and hidden in mobile private/public-style projection.

Launch/revenue impact:

- This creates private proof value for Studio V2 layout composition. It is not a public GGM claim, hosted owner-bound proof, or launch-readiness claim.

Rollback notes:

- Revert the dedicated proof-gate commit. Existing invalid/missing composition still normalizes to stable default placement.

Required fixes:

- None for this local proof gate.

Recommended follow-up:

- Run the next proof gate as hosted owner-bound Studio validation only after owner access and backend policy are restored. Do not use this local fixture proof as system-native migration evidence.
