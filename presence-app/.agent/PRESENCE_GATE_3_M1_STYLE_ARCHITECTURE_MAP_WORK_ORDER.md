# Work Order: Gate 3 M1 - Style Architecture Map

Date: 2026-07-28
Gate: Gate 3 - V3.2 design-system architecture
Target app: `C:\Dev\Flora_fauna\presence-app`
Backend boundary: `C:\Dev\Flora_fauna\flora-fauna\backend`
Status: Complete - evidence recorded in `docs/program/evidence/presence-gate3-m1-style-architecture-map-20260727/`

## Task

Produce the first Gate 3 Builder slice: a complete architecture map of the current Presence style system and a proposed registry contract for Looks, Room Styles, Piece Treatments, Atmosphere Modules, Motion Behaviours, compatibility tiers, and owner controls.

This is an architecture/evidence slice. Do not implement runtime visual changes in M1.

## Confirmed Human Inputs

Confirmed by the Gate 3 M1 work order:

1. BBBVision is the first flagship style source.
2. Room `1` / contract-room base is the second simple control style source.
3. Third prototype style must be selected from the strongest existing prototype/prior Presence style discovered during M1. M1 recommends `christina-liquid-gallery`; `zine-archive` remains the first alternate scaffold candidate.
4. Initial style selection remains private V3 overlay metadata only.
5. Style changes remain local/private until later publish-readiness gates.

## Inputs To Read

Required Presence docs:

- `.agent/PRESENCE_CANON.md`
- `.agent/PRESENCE_V34_GATED_PLAN.md`
- `.agent/PRESENCE_GATE_TRACKER.md`
- `.agent/LAUNCH_QUALITY_BAR.md`
- `.agent/SUBAGENT_ROUTING.md`
- `.agent/TASK_SIZING.md`
- `.agent/NO_MERGE_REVIEW.md`
- `.agent/PLANS.md`
- `.agent/DESIGN_SYSTEM_PIPELINE.md`
- `.agent/SECURITY_AND_PRIVACY.md`

Required Gate context:

- `.agent/PRESENCE_GATE_2_EXECPLAN.md`
- `docs/program/evidence/presence-gate2-acceptance-review-20260727/README.md`
- `docs/program/evidence/presence-gate2-auth-mock-hardening-20260727/README.md`
- `.agent/PRESENCE_GATE_3_EXECPLAN.md`

Required frontend files:

- `lib/presence/studio-v3/model.ts`
- `lib/presence/studio-v3/p1Catalog.ts`
- `lib/presence/studio-v3/compiler.ts`
- `lib/presence/studio-v3/p1State.ts`
- `lib/presence/studio-v3/editing.ts`
- `lib/presence/studio-v3/feature.ts`
- `lib/api/studioV3.ts`
- `components/presence-studio-v3/PresenceStudioV3Shell.tsx`
- `components/presence-studio-v3/StudioV3LookControls.tsx`
- `lib/presence/studio-v2/model.ts`
- `lib/presence/studio-v2/layouts.ts`
- `lib/presence/studio-v2/adapters.ts`
- `lib/presence/studio-v2/publicProjection.ts`
- `components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx`
- `components/presence-studio-v2/BbbVisionCanvasGallery.tsx`
- `components/presence-studio-v2/worlds.ts`
- `components/presence-studio-v2/presence-studio-v2-public.css`
- `app/(public)/p/[slug]/page.tsx`
- `lib/presence/render/publicPayload.ts`
- `components/portfolio/PortfolioRenderer.tsx`

Required backend file:

- `C:\Dev\Flora_fauna\flora-fauna\backend\app\services\presence_studio_v3_state.py`

## In Scope

- Map all current style ids, look ids, room style ids, public style presets, V2 layouts, V3 layers, atmosphere ids, piece treatment ids, journey/motion ids, and backend validator tokens.
- Identify which values are hard-coded, which are already registry-like, which are duplicated in UI literals, and which are public renderer branches.
- Map current public/private boundaries.
- Map how V3 private state can represent style selection today without new backend metadata categories.
- Recommend the typed registry contract for M2.
- Recommend exact candidate style definitions for M4.
- Create evidence under `docs/program/evidence/presence-gate3-m1-style-architecture-map-20260727/`.
- Update `.agent/PRESENCE_GATE_TRACKER.md` with M1 status when complete.

## Out Of Scope

- No visual redesign.
- No public publish or public route enablement.
- No new public renderer behaviour.
- No backend schema changes unless a blocker is found and documented.
- No change to auth, tenant isolation, payments, donor/member data, production data, or legal claims.
- No 10/10 style-library buildout.
- No broad refactor of V2 renderer code.

## Acceptance Criteria

- Evidence README lists every inspected file and the key style responsibilities found in each.
- Architecture map distinguishes:
  - V3 design tokens/catalogs
  - V3 private metadata
  - V2 public renderer presets
  - V2 layouts/zones
  - backend validators
  - public payload projection
  - CSS-only style behaviour
- Proposed registry contract covers:
  - Looks
  - Room Styles
  - Piece Treatments
  - Atmosphere Modules
  - Motion Behaviours
  - compatibility tiers
  - generated owner controls
  - public projection bridges
  - mobile and reduced-motion contracts
- Candidate style recommendation is explicit:
  - BBBVision threshold/gallery as flagship
  - Gallery P2 / room `1` as simple control
  - `christina-liquid-gallery` as recommended third style
- The report identifies exactly where current UI options are duplicated and how M2 should remove or contain duplication.
- The report confirms no public route or publishing behaviour changed.

## Commands And Tests

For docs-only M1:

- use `rg`, `Select-String`, and file reads as needed
- no build required if no runtime files change

If any runtime code changes unexpectedly become necessary:

- stop and split a new work order, or
- run `cmd /c npm run typecheck`
- run `cmd /c npm run build`
- run focused tests relevant to touched files

## Manual QA

For docs-only M1:

- no browser screenshots required
- manually verify the map against all required files

For any later runtime UI changes:

- capture desktop and 390px mobile screenshots
- include reduced-motion evidence when motion behaviour changes
- prove public BBBVision routes remain unavailable unless explicitly scoped later

## Evidence Output

Create:

- `docs/program/evidence/presence-gate3-m1-style-architecture-map-20260727/README.md`

Recommended sections:

- Summary
- Files inspected
- Current architecture map
- Hard-coded values and duplication
- Registry contract recommendation
- Candidate styles
- Public/private safety
- Risks
- Next Builder slice

## Stop Conditions

Stop and ask before proceeding if:

- the human does not confirm the five Gate 3 decisions
- implementation appears to require backend private-state category changes
- any public route or publish behaviour would change
- runtime code changes become larger than registry scaffolding
- private BBBVision material would be exposed publicly

## Completion Format

Use the repository completion format:

```text
Summary:
Files changed:
Commands/tests run:
Manual QA performed:
Screenshots/links if visual:
Risks:
Rollback notes:
Remaining work:
Recommended next task:
```
