# Spatial Authoring Baseline QA

## Automated checks

- `npm.cmd run test:spatial` - PASS, 109/109 after the adversarial-review regressions.
- `npm.cmd run typecheck` - PASS.
- `npx.cmd playwright test tests/e2e/presence-spatial-object-model.spec.ts --project=chromium --retries=0` - PASS, 12/12 with a clean process exit.
- Focused authoring scenario - PASS with zero retries and a clean process exit.
- `npm.cmd run build` - PASS; 29 static pages generated and the internal route remained dynamic.

Existing warnings: Next infers the workspace root from multiple lockfiles; Playwright's web server reports the existing `NO_COLOR` / `FORCE_COLOR` warning.

## Manual review

- Inspected blank desktop operator state and actual Three canvas.
- Inspected the materially assembled seven-object room after saved-data reload.
- Confirmed saved/current selector used the saved fingerprint.
- Inspected compact semantic fallback and assigned HTTPS link.
- Confirmed visible 100 KB layout, 3 MB eager-runtime and 12 MB total-runtime meters.
- Confirmed no raw model files or candidate asset paths were added to the room.

## Acceptance matrix

| Requirement | Result |
|---|---|
| Reusable add/move/rotate | PASS |
| Duplicate/delete | PASS |
| Rendered material/skin/media/action overrides | PASS |
| Browser-local save/reload JSON | PASS |
| Generic Three component-reference render | PASS |
| Semantic Piece/Action fallback | PASS |
| 100 KB / 3 MB / 12 MB budget visibility | PASS |
| Public/backend/publish invariance | PASS by scope and existing route scenario |
| Component admission | NOT REQUESTED; all candidates remain not-evaluated |

## Honest gate statement

The bounded internal Spatial Authoring Baseline is ready for human review: the final build and full browser suite are green, every blocking finding from two adversarial reviews was corrected and regression-tested, and a third independent acceptance re-review returned PASS. This does not accept Gate 4 visual quality and does not establish public publishing, backend persistence or client self-service.
