# ExecPlan: BBB Studio V2 eligibility gate

## Objective

Determine why hosted `/studio/29/editor` rendered the non-V2 Studio editor while `/studio/11/editor` rendered Studio V2, then make only the smallest safe editor-eligibility change if BBB already has V2-compatible owner data.

## Why now

BBB is the approved eventual publication candidate, but the previous generalisation proof stopped because the hosted owner editor did not render `presence-studio-v2-root`. Before any proof write/revert, BBB must enter the correct owner editor surface.

## Current state

- Reviewed/proof base: `85e9aaec441a40a330bc3692911d9658e73105c3`.
- Previous blocked evidence preserved on `feat/presence-studio-bbbvision-generalisation-proof` in local commit `0661621`.
- BBB target: room `29`, slug `bbbvision`, title `bbb.vision`.
- GGM comparison room: room `11`, slug `ggm-christina-goddard`.
- Hosted read-only comparison showed BBB owner reads succeed and editor overview contains V2-compatible published config, but owner-node selector fields are absent.

## Non-goals

- No hosted data mutation.
- No draft write/revert.
- No publish.
- No public route behaviour change.
- No backend, auth, owner binding, tenant, control-plane, persistence, deployment, WebGL, GSAP, or dependency changes.
- No BBB launch claim.
- No GGM publication claim.

## Scope

### In scope

- Editor-only Studio V2 eligibility for room `29 / bbbvision`.
- Private preview projection alignment for editor-eligible rooms.
- Focused tests proving editor routing and no draft write/publish.
- Evidence and no-merge review.

### Out of scope

- Shared public renderer eligibility.
- Hosted deployment.
- Production env/config changes.
- Migration writes.
- Public BBB proof.

## Risks and blast radius

Blast radius: medium.

Affected surfaces:

- `/studio/[id]/editor` editor shell selection.
- `/studio/[id]/editor/preview` private preview projection.
- Local e2e mock for room `29`.

Risk controls:

- Shared/public `shouldUsePresenceStudioV2` remains unchanged.
- Public route projection continues to use `studioV2PublicRoomFromPresenceNode`.
- Room `29 / bbbvision` is explicitly allowlisted only for editor/private-preview eligibility.
- Legacy fallback for unrelated rooms is tested.
- No hosted mutation was performed.

## Milestones

### Milestone 1 — Research / map

Acceptance criteria:

- Identify V2 vs non-V2 selector.
- Compare GGM and BBB owner payload shapes.
- Determine whether BBB needs frontend eligibility, migration, backend policy, or deploy/config work.

Evidence:

- `ELIGIBILITY_MATRIX.md`
- `route-status-comparison.md`

### Milestone 2 — Implementation slice

Acceptance criteria:

- BBB room `29` is eligible for Studio V2 editor through an explicit editor-only predicate.
- Public renderer eligibility remains unchanged.
- Private preview can project the editor-eligible V2 config.
- Legacy rooms still route to non-V2 editor.

Evidence:

- Code diff.
- Unit and e2e tests.

### Milestone 3 — Validation / review

Acceptance criteria:

- Typecheck passes.
- Build passes.
- Focused e2e passes or any harness limitation is documented.
- Secret scan passes.
- No-merge review completed.

Evidence:

- `VALIDATION_RECORD.md`
- `NO_MERGE_REVIEW.md`

## Files involved

- `app/(studio)/studio/[id]/editor/page.tsx`
- `components/studio/editor/PresenceDraftPreviewPage.tsx`
- `lib/presence/studio-v2/feature.ts`
- `lib/presence/studio-v2/publicProjection.ts`
- `lib/presence/studio-v2/feature.test.ts`
- `tests/e2e/mock-presence-api.mjs`
- `tests/e2e/presence-studio-v2-bbbvision-eligibility.spec.ts`
- `docs/program/evidence/presence-studio-bbbvision-v2-eligibility/*`

## Rollback plan

Revert the eventual commit. No hosted state, backend data, public route, deployment config, or production data is changed by this pass.

## Human decisions required

- Deploy/release remains a separate human-gated task.
- BBB draft write/revert proof remains a separate human-gated task.

## Progress log

2026-07-21 — Confirmed Path A: BBB has V2-compatible published editor data but fails page-level editor selection because owner-node eligibility fields are absent.
