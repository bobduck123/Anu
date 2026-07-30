# Work Order: Gate 3 M5 - Compatibility Guardrails for Style Candidate Status

Date: 2026-07-29
Gate: Gate 3 - V3.2 design-system architecture
Target app: `C:\Dev\Flora_fauna\presence-app`
Status: Complete - evidence recorded in `docs/program/evidence/presence-gate3-m5-style-compatibility-guardrails-20260727/`

## Task

Implement guardrails for `flagship`, `supported`, `experimental`, `blocked`, and `metadata-only` style candidate status so the Gate 3 catalog can grow without accidentally surfacing unsupported styles.

## Confirmed Human Decision

Proceed with Gate 3 M5:

- implement compatibility/status guardrails for supported, experimental, blocked, and metadata-only style candidates;
- keep metadata-only candidates, including `christina-liquid-gallery`, non-selectable in V3;
- do not promote Christina;
- do not change public renderer behaviour;
- do not make the public renderer depend on the catalog;
- do not publish or public-sync any style selection;
- keep style work private/local and architecture-focused.

## Scope Completed

- Added typed guardrail helpers to the shared V3 style catalog.
- Kept `flagship` and `supported` candidates selectable.
- Required explicit internal-review opt-in for `experimental` styles and pairings.
- Kept `blocked` and `metadata-only` candidates non-selectable.
- Confirmed `christina-liquid-gallery` remains metadata-only, non-selectable, and unrepresented by any V3 Look or Room Style.
- Routed existing owner Look/Room Style controls through guardrail helpers without adding a new selector surface.
- Rejected non-selectable public preset candidates in live layer overrides, restored private metadata, and browser-local named Look values.
- Added compiler fallback/warning behaviour for malformed in-memory active Looks that reference non-selectable candidates.
- Added focused tests for Christina metadata-only status, experimental opt-in, blocked fixture handling, supported/flagship paths, owner-control helper usage, private metadata rejection, compiler fallback, and public invariance.
- Updated evidence, tracker, and ExecPlan.

## Out Of Scope Preserved

- No Christina promotion.
- No new Looks or Room Styles.
- No public renderer change.
- No public route change.
- No public projection change.
- No publish or public sync.
- No backend schema or validator change.
- No private metadata category change.
- No hosted/prod data.
- No auth, tenant, payment, donor/member, or deployment config change.
- No media association.
- No deletion/archive.
- No server draft preview.
- No Fable work.

## Evidence

`docs/program/evidence/presence-gate3-m5-style-compatibility-guardrails-20260727/README.md`

## Commands

```text
cmd /c npm run typecheck
node --test lib\presence\studio-v3\compiler.test.ts lib\api\studioV3.test.ts
node --test lib\presence\render\publicPayload.test.ts lib\presence\studio-v2\studioV2Adapters.test.ts
npx playwright test tests/e2e/presence-studio-v3-bbb-prototype.spec.ts --project=chromium --grep "visual Look, Room Style"
npx playwright test tests/e2e/presence-studio-v3-public-invariance.spec.ts --project=chromium
cmd /c npm run build
git diff --check -- lib/presence/studio-v3/styleCatalog.ts components/presence-studio-v3/StudioV3LookControls.tsx lib/presence/studio-v3/p1State.ts lib/presence/studio-v3/compiler.ts lib/presence/studio-v3/editing.ts lib/presence/studio-v3/localState.ts lib/presence/studio-v3/compiler.test.ts docs/program/evidence/presence-gate3-m5-style-compatibility-guardrails-20260727/README.md .agent/PRESENCE_GATE_3_M5_STYLE_COMPATIBILITY_GUARDRAILS_WORK_ORDER.md .agent/PRESENCE_GATE_TRACKER.md .agent/PRESENCE_GATE_3_EXECPLAN.md
```

## Review Verdict

ACCEPT M5.

Metadata-only candidates cannot become selectable V3 styles through the normal catalog/control/private-state paths. Experimental status now requires explicit internal-review opt-in, blocked behavior is guarded and tested, and public renderer/projection files remain untouched.

## Recommended Next Task

Gate 3 M6 - Gate 3 acceptance review.
