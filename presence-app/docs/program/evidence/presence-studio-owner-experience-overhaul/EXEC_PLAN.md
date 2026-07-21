# ExecPlan: Presence Studio owner experience overhaul

## Objective

Create a client-facing owner experience over the proven Studio V2 engine so a non-technical owner can understand their Presence, choose a room, arrange pieces, change its look and feel, preview as a visitor, and review publication safely.

The implementation must preserve the existing Studio V2 layout-composition and environmental behavior, owner/private boundaries, preview renderer, publish endpoint behavior, and BBB public output.

## Why now

BBB Vision has proven the environmental layer, arrangement contract, hosted owner draft lifecycle, publish readiness, and controlled publish execution. The next launch blocker is comprehension: the current Studio reads as an internal renderer cockpit rather than a digital showroom/home builder.

## Current state

- Starting branch: `feat/presence-studio-bbbvision-v2-eligibility`
- Work-order starting commit: `e0ce05cde742ad8cd185a865b157c9a138840a9e`
- Implementation baseline: `3b7e113609b6726c3030467d259afb5e0c40ac35` (`record bbbvision live handoff audit`), which committed the pre-existing live-handoff proof before implementation began.
- Task branch: `feat/presence-studio-owner-experience-overhaul`
- BBB publish execution evidence: `docs/program/evidence/presence-studio-bbbvision-publish-execution/`
- Owner home: `app/(studio)/studio/[id]/page.tsx`
- Studio V2 route gate: `app/(studio)/studio/[id]/editor/page.tsx`
- Studio V2 editor: `components/presence-studio-v2/PresenceStudioV2Editor.tsx`
- Studio V2 scoped styles: `components/presence-studio-v2/presence-studio-v2.css`
- Visitor preview: `components/studio/editor/PresenceDraftPreviewPage.tsx`
- Publish confirmation: `components/studio/editor/PublishConfirmDialog.tsx`
- Existing focused Playwright coverage lives under `tests/e2e/presence-studio-v2-*.spec.ts`.
- The starting worktree contained pre-existing untracked live-handoff evidence and a test. A concurrent proof-closing process committed them as `3b7e113`; this task preserves that commit and does not modify its files.

## Non-goals

- No new public renderer or public route behavior.
- No WebGL, GSAP, Three.js, or heavy effects.
- No backend, auth, owner binding, tenant/control-plane, persistence-contract, deployment, or production-data changes.
- No automatic publish and no hosted/public mutation.
- No core type rename solely to match client language.
- No broad Studio navigation or design-system rewrite outside the owner flow.

## Scope

### In scope

- A clearer owner Home with live status/link, unpublished-change framing, dates when available, and safe primary actions.
- A guided owner rail: Home, Rooms, Arrange, Style, Preview, Publish.
- Plain-language translations while retaining internal code names.
- A Rooms overview using the existing room/chamber state.
- Arrange as the central existing composition workspace, with clearer area guidance and piece language.
- An inline Look & Feel workspace over existing skin/environment controls.
- A Visitor Preview step and clearer owner-only preview chrome.
- A Publish Review step/checklist that routes to the existing human-confirmed publish flow.
- Mobile-responsive controls and focused Playwright coverage.
- Before/after screenshots and evidence documents.

### Out of scope

- Publishing BBB or any other Presence.
- Changing the BBB published payload or public renderer.
- New room/object schemas, layout definitions, style fields, or APIs.
- Removing existing advanced controls; they may be placed behind an advanced affordance.

## Risks and blast radius

Risk: medium, with high-risk boundaries adjacent but explicitly excluded.

Affected systems:

- owner dashboard and Studio V2 client UI;
- owner-only draft preview chrome;
- publish confirmation copy/checklist;
- scoped Studio V2 CSS;
- Playwright owner-flow tests.

Protected systems:

- owner authorization and route gates;
- editor API calls and persistence conversion;
- preview/public renderers;
- publish endpoint behavior;
- public routes and production state.

## Milestones

### Milestone 1 — Research and baseline

Acceptance criteria:

- Required operating docs and repository AGENTS.md read.
- Starting branch/commit and dirty-worktree baseline recorded.
- BBB proof chain confirmed.
- Current owner flow, language, tests, and relevant UX references audited.
- Before screenshot retained from existing BBB evidence where safe.

Evidence:

- `UX_AUDIT.md`
- `CLIENT_LANGUAGE_MAP.md`
- this ExecPlan

### Milestone 2 — Owner comprehension shell

Acceptance criteria:

- Home is understandable within five seconds.
- Guided owner navigation exposes Home, Rooms, Arrange, Style, Preview, and Publish.
- Existing direct-editor behavior remains compatible with focused Studio tests.
- Client-facing copy avoids renderer/schema terminology in the primary flow.

Evidence:

- focused tests;
- desktop/mobile screenshots;
- reviewable diff.

### Milestone 3 — Core owner workspaces

Acceptance criteria:

- Rooms identifies the selected room and its purpose.
- Arrange retains drag, area controls, size/treatment controls, guardrails, and mobile fallback controls.
- Look & Feel groups existing controls into understandable categories.
- Visitor Preview explains saved/unpublished/private boundaries.
- Publish Review shows the required checklist and does not publish automatically.

Evidence:

- focused tests for each guided step;
- no network publish call during UX tests;
- selected-piece and Look & Feel screenshots.

### Milestone 4 — QA, evidence, and no-merge review

Acceptance criteria:

- Typecheck and build pass.
- Focused owner-flow and relevant Studio V2 containment/layout/environment tests pass or honest blockers are recorded.
- Desktop/mobile screenshots are captured.
- BBB public page regression proof shows no editor instrumentation and no intentional public output change.
- Separate reviewer returns a binary verdict and all blockers are fixed before commit.

Evidence:

- `README.md`
- `BEFORE_AFTER.md`
- `VALIDATION_RECORD.md`
- `NO_MERGE_REVIEW.md`
- screenshots

## Files likely involved

- `app/(studio)/studio/[id]/page.tsx`
- `components/presence-studio-v2/PresenceStudioV2Editor.tsx`
- `components/presence-studio-v2/PresenceStudioV2Panels.tsx`
- `components/presence-studio-v2/presence-studio-v2.css`
- `components/studio/editor/PresenceDraftPreviewPage.tsx`
- `components/studio/editor/PublishConfirmDialog.tsx`
- one focused Playwright spec under `tests/e2e/`
- this evidence directory

## Tests and validation

Commands:

```text
npm.cmd run typecheck
npm.cmd run build
npx playwright test <focused owner experience spec> --project=chromium
npx playwright test tests/e2e/presence-studio-v2-layout-composition.spec.ts --project=chromium
npx playwright test tests/e2e/presence-studio-v2-environmental-engine.spec.ts --project=chromium
npx playwright test <relevant private/public containment spec> --project=chromium
```

Manual QA:

- Home and each guided step at desktop width.
- Arrange selection, drag/fallback placement controls, and save semantics.
- Look & Feel existing controls.
- Visitor Preview desktop/mobile modes and absence of editor instrumentation.
- Publish Review checklist and explicit handoff to existing confirmation.
- Narrow mobile owner flow.
- BBB public route unchanged in local mocked regression coverage; no hosted mutation.

Screenshots:

- current Studio entry (existing approved evidence where available);
- new Home, guided shell, Rooms, Arrange, selected piece, Look & Feel, Visitor Preview, Publish Review, mobile Studio, and BBB public regression.

## Rollback plan

Revert only the files committed on this task branch. No backend or production rollback should be needed because this task does not publish, deploy, mutate hosted state, or change persistence/public renderer contracts.

## Human decisions required

- Human approval remains required before merge, deployment, or any publish action.
- No product decision currently blocks the scoped owner-flow implementation.

## Progress log

```text
2026-07-21 — Read required operating docs and repository AGENTS.md.
2026-07-21 — Confirmed BBB publish execution evidence at e0ce05c.
2026-07-21 — Created task branch; preserved pre-existing untracked live-handoff files.
2026-07-21 — Began read-only Studio and UX-reference exploration.
```

## Final review checklist

- [x] Acceptance criteria met.
- [x] Tests run.
- [x] Manual QA completed.
- [x] Screenshots captured.
- [x] Proof/evidence updated.
- [x] No unrelated scope.
- [x] No high-risk boundaries changed without approval.
