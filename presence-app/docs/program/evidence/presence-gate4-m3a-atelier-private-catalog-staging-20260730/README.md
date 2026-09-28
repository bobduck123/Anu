# Presence Gate 4 M3A - Atelier Private Catalog Staging

Date: 2026-07-30
App: `C:\Dev\Flora_fauna\presence-app`
Reference: `C:\Dev\presence-reference\03-atelier\presence.manifest.json`
Status: Implementation staged for review

## Scope

Gate 4 M3A adds Atelier as frontend/private catalog metadata only.

Imported reference metadata:

- Look: `brass-inlay` / Brass Inlay.
- Room Style: `refractive-threshold` / Refractive Threshold.
- Piece Treatments: `onion-inspection`, `scribe-reveal`, `measured-plate`.
- Atmospheres: `drawing-sheet`, `material-sampler`.
- Motion posture: Atelier named behaviours `seventy-five`, `glass-drift`, and `approach` remain evidence-only; the executable V3 value stays the existing `living` V2 bridge.

## Implementation Summary

Runtime files changed:

- `lib/presence/studio-v3/model.ts`
- `lib/presence/studio-v3/styleCatalog.ts`
- `lib/presence/studio-v3/p1Catalog.ts`
- `lib/presence/studio-v3/p1State.ts`
- `lib/presence/studio-v3/compiler.ts`
- `lib/presence/studio-v3/compiler.test.ts`
- `components/presence-studio-v3/StudioV3LookControls.tsx`

The broad catalog can now describe Atelier, but the active P1 catalog used by hydration/compiler entry state remains the accepted Gate 3 set:

- `soft-editorial`
- `nocturnal-gallery`
- `zine-archive`

The `brass-inlay` + `refractive-threshold` compatibility row is blocked with fallback `gallery-wall` because public renderer adapter proof and backend persistence are deferred.

## Public Posture

M3A does not add:

- Atelier public preset.
- Public route.
- Public renderer branch.
- Public payload projection change.
- Publish or public sync behaviour.

`brass-inlay` uses the existing `gallery-p2` preset as a safe fallback value and marks renderer support as `private-preview-only`. This is not a claim that Gallery P2 renders Refractive Threshold honestly.

## Persistence Posture

M3A does not wire new Atelier IDs into backend save/reload paths.

Backend validator changes remain deferred and are required before saved private state can carry:

- `baseLookId: "brass-inlay"`
- `roomStyleId` or `styleId: "refractive-threshold"`
- `pieceTreatment: "onion-inspection"`, `"scribe-reveal"`, or `"measured-plate"`
- `atmosphere: "drawing-sheet"` or `"material-sampler"`
- any new V3 motion behaviour IDs
- Refractive Threshold composition layouts or zones

## Guardrails Proven By Tests

Focused compiler/catalog tests assert:

- Existing Gate 3 P1 styles remain the only hydrated active Looks.
- Existing Gate 3 style selections continue to compile.
- Atelier metadata exists in the broad catalog.
- Atelier does not create a public preset candidate.
- Atelier named motion behaviours are not added to executable motion IDs.
- `brass-inlay` + `refractive-threshold` is not selectable even with internal-review guardrails.
- Missing or cross-pairings involving `brass-inlay` or `refractive-threshold` fail closed as blocked.
- Attempting to apply `brass-inlay` to a hydrated P1 document is rejected as unavailable.
- Atelier-only Piece Treatment and Atmosphere IDs are rejected from private metadata envelopes.
- Owner facet controls use the active/persistable Gate 3 Piece Treatment and Atmosphere lists, not the broad M3A metadata arrays.

## Exclusions

Not counted in M3A:

- `05-meridian`
- slots `06` through `10`
- Soundings runtime import
- GGM runtime import or fixture conversion
- 10 Looks / 10 Room Styles acceptance
- Gate 4 acceptance

## Risks

- Broad catalog metadata now includes Atelier IDs while backend validators remain Gate 3-only by design.
- Owner facet controls intentionally exclude Atelier-only Piece Treatment and Atmosphere IDs until a later approved private-preview or persistence slice.
- Refractive Threshold is not visually represented by the current V2 layout fallback.
- Any later owner-selectable Atelier preview needs an approved backend/private-state validator slice or a no-save preview mode.

## Commands

Completed in this task:

- `cmd /c npm run typecheck` - passed.
- `cmd /c node --test lib\presence\studio-v3\compiler.test.ts` - passed 58/58.
- `git diff --check` - passed before staging.
- `git diff --cached --check` - passed after staging.

## Decision

M3A is reviewable as an initial frontend/private catalog staging pass only. It does not make Atelier public, persistent, complete, or Gate 4-accepted.
