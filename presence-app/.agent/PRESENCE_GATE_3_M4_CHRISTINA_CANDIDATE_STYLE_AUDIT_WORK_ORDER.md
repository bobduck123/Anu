# Work Order: Gate 3 M4 - Candidate Style Definitions / Christina Primitive Audit

Date: 2026-07-29
Gate: Gate 3 - V3.2 design-system architecture
Target app: `C:\Dev\Flora_fauna\presence-app`
Status: Complete - evidence recorded in `docs/program/evidence/presence-gate3-m4-christina-candidate-style-audit-20260727/`

## Task

Audit `christina-liquid-gallery` as the third candidate style and record the smallest safe catalog metadata needed to prevent accidental V3 promotion.

## Confirmed Human Decision

Proceed with Gate 3 M4:

- treat Christina as the third candidate from existing/prior Presence proof;
- do not invent a new style;
- keep Christina not fully supported until V3 primitives and reduced-motion proof exist;
- do not wire Christina into public rendering through the catalog;
- keep style changes private/local only;
- do not change public routes, publish/public sync, backend validators, hosted data, auth, tenant, payment, or deployment config.

## Scope Completed

- Audited Christina across V2 owner options, public renderer branch, CSS, fixtures, and e2e coverage.
- Added typed public-preset candidate readiness metadata to the shared V3 style catalog.
- Classified:
  - `gallery-p2` as `supported` / `v3-proof`;
  - `bbbvision-threshold-gallery` as `flagship` / `v3-proof`;
  - `christina-liquid-gallery` as `metadata-only` / `public-proof`.
- Recorded Christina's implied closest existing pair as `soft-editorial` + `film-strip-selected-works`, tier `experimental`, fallback `gallery-wall`.
- Added focused unit assertions that Christina has no V3 represented Look or Room Style and remains hidden from V3 Look exposure.
- Updated evidence, tracker, and ExecPlan.

## Out Of Scope Preserved

- No public renderer change.
- No public route change.
- No public projection change.
- No publish or public sync.
- No backend schema or validator change.
- No private metadata category change.
- No new V3 Look ID.
- No new V3 Room Style ID.
- No hosted/prod data.
- No auth, tenant, payment, donor/member, or deployment config change.

## Evidence

`docs/program/evidence/presence-gate3-m4-christina-candidate-style-audit-20260727/README.md`

## Commands

```text
cmd /c npm run typecheck
node --test lib\presence\studio-v3\compiler.test.ts lib\api\studioV3.test.ts
node --test lib\presence\studio-v2\studioV2Adapters.test.ts
cmd /c npm run build
git diff --check -- lib/presence/studio-v3/styleCatalog.ts lib/presence/studio-v3/compiler.test.ts docs/program/evidence/presence-gate3-m4-christina-candidate-style-audit-20260727/README.md .agent/PRESENCE_GATE_3_M4_CHRISTINA_CANDIDATE_STYLE_AUDIT_WORK_ORDER.md .agent/PRESENCE_GATE_TRACKER.md .agent/PRESENCE_GATE_3_EXECPLAN.md
```

## Review Verdict

ACCEPT M4 WITH CHRISTINA METADATA-ONLY.

Christina has enough prior public proof to remain the third candidate, but not enough V3 primitive, compatibility, reduced-motion, or performance proof to become supported.

## Recommended Next Task

Gate 3 M5 - Compatibility guardrails for supported, experimental, blocked, and metadata-only candidate status.
