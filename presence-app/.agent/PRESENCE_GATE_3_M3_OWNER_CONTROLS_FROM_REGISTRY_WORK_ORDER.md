# Work Order: Gate 3 M3 - Owner Controls From Registry

Date: 2026-07-28
Gate: Gate 3 - V3.2 design-system architecture
Target app: `C:\Dev\Flora_fauna\presence-app`
Status: Complete - evidence recorded in `docs/program/evidence/presence-gate3-m3-owner-controls-from-registry-20260727/`

## Task

Surface the Gate 3 M2 shared style catalog through existing V3 owner controls.

## Confirmed Human Decision

Proceed with Gate 3 M3:

- show catalog-backed Look and Room Style metadata in the existing V3 owner controls;
- show compatibility tier messaging plus warning/fallback copy;
- keep style selection private V3 metadata only;
- do not create new styles;
- do not build the full 10 Looks / 10 Room Styles library;
- do not change public renderer behavior;
- do not make the public renderer depend on the catalog;
- do not publish or public-sync style selections.

## Scope Completed

- Added catalog-owned owner copy helpers for compatibility tier labels, tier summaries, warning, and fallback copy.
- Added a compact catalog summary to `StudioV3LookControls`.
- Surfaced selected Look, selected or previewed Room Style, tier, reason, fallback/warning, safe controls, locked elements, intended wow, mobile, reduced-motion, performance, and private/public boundary copy.
- Added focused unit and source-level tests for M3 owner-control catalog wiring.
- Added browser assertions to the existing V3 visual-controls proof.
- Reran typecheck, build, focused unit/API tests, public payload/V2 adapter tests, owner-control browser proof, and public-invariance browser proof.
- Updated evidence, tracker, and ExecPlan.

## Out Of Scope Preserved

- No public renderer dependency.
- No public route changes.
- No publish or public sync.
- No backend schema or validator change.
- No private metadata category change.
- No new style IDs.
- No Christina visual migration.
- No hosted/prod data.
- No auth, tenant, payment, donor/member, or deployment config change.

## Evidence

`docs/program/evidence/presence-gate3-m3-owner-controls-from-registry-20260727/README.md`

## Commands

```text
cmd /c npm run typecheck
node --test lib\presence\studio-v3\compiler.test.ts lib\api\studioV3.test.ts
node --test lib\presence\render\publicPayload.test.ts lib\presence\studio-v2\studioV2Adapters.test.ts
npx playwright test tests/e2e/presence-studio-v3-bbb-prototype.spec.ts --project=chromium --grep "visual Look, Room Style"
npx playwright test tests/e2e/presence-studio-v3-public-invariance.spec.ts --project=chromium
cmd /c npm run build
```

## Review Verdict

ACCEPT M3.

Non-blocking note: two early owner-control browser attempts failed because assertions expected flagship/experimental labels for currently supported pairings. The test was corrected to match the catalog tiers, then passed.

## Recommended Next Task

Gate 3 M4 - Candidate Style Definitions / Christina primitive audit.
