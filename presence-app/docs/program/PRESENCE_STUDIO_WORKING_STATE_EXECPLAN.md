# ExecPlan: Presence Studio Working State

## Objective

Consolidate the existing Studio V2 cockpit as the canonical owner-editor experience, make draft saving truthful and low-anxiety, prevent accidental publication of the private GGM proof, and capture local fixture evidence without changing auth, backend ownership, visibility, or production data.

## Why now

GGM is now backend- and public-frontend-contained. The remaining proof value is a truthful private owner workflow, not another public mock or editor rewrite.

## Current state

### Route and component map

| Surface | Current implementation | Decision |
|---|---|---|
| `/studio` | owner workspace and node list | Owner entry point; retained |
| `/studio/[id]/editor` | `PresenceStudioV2Editor` when V2 schema + pilot feature gate are eligible; `PresenceStudioEditorApp` otherwise | Canonical editor route |
| `/studio/[id]/editor/preview` | `PresenceDraftPreviewPage` with shared V2 public projection when V2 is eligible | Canonical private preview route |
| `/studio/[id]/studio-room` | `StudioRoomOwnerEditorShell` template-kit workflow | Retained as a separate internal/template workflow; not an owner-editor alternative |
| `/presence-chooser` | public onboarding direction chooser | Not an owner editor |

### Existing contracts

- V2 draft reads and writes use `/api/presence/owner/rooms/[id]/editor` and `/draft` through the existing owner API client.
- V2 draft preview projects through the same sanitized V2 public-renderer adapter used by public rendering; it is not a visual approximation.
- V2 feature gating requires both an explicit feature flag and an eligible V2 room/pilot. No global routing change is planned.
- V2 media supports persisted URL references and an asset registry. It does not yet provide durable upload/crop tooling; browser blob URLs are not introduced.
- History endpoint support exists in the legacy editor contract. V2's Archive surface is honestly read-only and must stay that way until a scoped history integration exists.

### Hosted discrepancy reconciled

The earlier hosted audit observed the legacy editor because the V2 flag was missing from the client build. The same report records a later post-environment correction with the V2 root present. This task does not change Vercel configuration or claim current hosted owner authentication; source and local fixture evidence remain the authority for this pass.

## Non-goals

- No Supabase password, user, owner-role, grant, scope, tenancy, or control-plane change.
- No production backend mutation, GGM publish, visibility change, or deployment.
- No new media service, upload provider, persistence architecture, or history backend.
- No deletion of GGM source/reference assets.
- No replacement of the public renderer or parallel editor shell.

## Risks and blast radius

Medium/high: owner-editor UX and draft persistence. Public/private and publish boundaries are protected by retaining existing backend endpoints and adding only client-side private-proof safeguards. Every change needs local lifecycle, preview hygiene, mobile, and public-containment regression evidence.

## Milestones

### Milestone 1 - Source preservation and audit

Acceptance criteria:
- Containment source is committed and pushed separately.
- Canonical route/editor/preview decision and legacy roles are recorded.
- Existing draft, renderer, media, history, feature-gate, and mobile contracts are mapped.

Evidence:
- `fix/ggm-public-containment` commit `236c5cc5533424b78fc5db77330b812f58e9128d`.
- This ExecPlan.

### Milestone 2 - Minimum coherent Studio working state

Acceptance criteria:
- V2 remains the canonical cockpit for eligible rooms.
- Save state is explicit; safe debounced autosave never publishes.
- Private proof rooms cannot present share/publish controls as available actions.
- Owner preview remains the shared sanitized renderer path.
- Mobile controls remain reachable without hover.

Evidence:
- Focused local owner-lifecycle fixture test including edit, autosave/save, reload, preview, restoration, and no publish request.
- Existing V2 renderer and containment regression tests.

### Milestone 3 - Proof and handoff

Acceptance criteria:
- GGM proof is classified as local-fixture evidence, not hosted owner-auth evidence.
- Canon, migration/proof, containment, and Studio evidence distinguish completed behavior from deferred hosted login, durable media, history, and publish work.

Evidence:
- `docs/program/evidence/presence-studio-working-state/README.md`.
- Typecheck, focused tests, targeted browser tests, and production build.

## Files likely involved

- `components/presence-studio-v2/PresenceStudioV2Editor.tsx`
- `components/studio/editor/PresenceDraftPreviewPage.tsx`
- Existing V2 local lifecycle tests and mock API fixture only where required
- `.agent/PRESENCE_CANON.md`, `.agent/PRESENCE_MIGRATION.md`, `.agent/PROOF_LIBRARY.md`, `.agent/GGM_VISIBILITY_CONTAINMENT_PLAN.md`
- `docs/program/evidence/presence-studio-working-state/`

## Validation

```bash
npm run typecheck
npm run test:e2e -- <targeted specs> --project=chromium
npm run build
```

No confirmed lint or named unit-test npm script exists.

## Rollback

Revert this Studio branch only. The containment branch remains separately preserved and deployed. No backend state is changed by this implementation; local fixture state is reset by the existing mock API.

## Human decisions required

- Hosted owner credential restoration and hosted owner workflow proof remain intentionally deferred.
- Durable owner-upload/crop persistence, history integration, and a publish workflow for non-private pilot rooms require separate work orders.

## Progress log

2026-07-20 - Containment source committed and pushed separately. Current Studio audit identified V2 as the canonical eligible-room cockpit; legacy editor is compatibility only and Studio Room is a separate template workflow.

2026-07-20 - Implemented the minimum coherent V2 working state: debounced autosave for ordinary draft edits, explicit save for canvas transforms, and a GGM private-proof guard that removes share/publish affordances in both editor and preview. The targeted sequential Chromium suite passed 11/11 with `npm run typecheck`; evidence is local-fixture only and hosted owner proof remains deferred.
