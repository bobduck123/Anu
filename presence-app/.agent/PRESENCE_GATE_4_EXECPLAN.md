# Presence Gate 4 ExecPlan - V3.2 Creative Library Buildout

Date: 2026-07-30
Status: M3A staged - Atelier frontend/private catalog metadata only
Target app: `C:\Dev\Flora_fauna\presence-app`
Reference source: `C:\Dev\presence-reference`
Evidence: `docs/program/evidence/presence-gate4-execplan-creative-library-20260730/`

## Gate

Gate 4 covers the V3.2 creative library buildout after Gate 1, Gate 2, and Gate 3 acceptance.

Gate 4 does not create public launch readiness. Public execution launch still requires V3.4 hosted proof and human Gate 9 approval.

## Objective

Build the first serious Presence V3 style library:

- 10 Looks
- 10 Room Styles
- at least 3 Piece Treatments
- at least 3 Atmosphere Modules
- at least 3 Motion Behaviours
- 10 flagship Look/Room Style pairings
- 30 supported Look/Room Style pairings
- explicit unsupported/blocked pairings
- one bbbvision-inspired Look/Room Style included as a flagship specimen

## Current State

Gate 3 left `presence-app` with a typed catalog architecture, not a finished creative library.

Current app catalog baseline after M3A staging:

- Looks: 4 of 10 represented in broad catalog; active P1 hydration remains the accepted Gate 3 set of 3
- Room Styles: 4 of 10 represented in broad catalog; active P1 structural catalog remains the accepted Gate 3 set of 3
- Piece Treatments: 6 represented in broad catalog; Atelier treatments are metadata/fallback-only
- Atmospheres: 5 represented in broad catalog; Atelier atmospheres are metadata/fallback-only
- Motion Behaviours: 3 of at least 3
- Flagship pairings: 2 of 10
- Supported pairings: 3 of 30
- Experimental pairings: 4
- Blocked pairings: 1 Atelier staging row

Current reference baseline in `C:\Dev\presence-reference`:

| Slot | Reference | Look | Room Style | Packet state | Gate 4 posture |
|---|---|---|---|---|---|
| 01 | `01-bbb-vision` | Gilded Nocturne | Infinite Field | Manifest/GAPS present; no local screenshots folder in reference packet; permission granted; strong gaps around reduced motion, performance, metadata, and visitor action | Keep as required bbbvision-inspired flagship candidate, but do not import as selectable runtime style until gaps are resolved or explicitly documented as deferred |
| 02 | `02-ggm-memory-colours` | Memory Colours | Serendipity Pathway | Manifest/GAPS present; no local screenshots folder in reference packet; internal benchmark only; not public-showable | Use as internal design-system archetype; fixture or exclude real/person-specific details before any public proof |
| 03 | `03-atelier` | Brass Inlay | Refractive Threshold | Manifest/GAPS/screens present; fixture-only; public safety tier A; strongest complete import candidate | Recommended first Gate 4 implementation candidate after M1/M2 |
| 04 | `04-soundings` | Sounding Line | Water Column | Manifest/GAPS/screens present; fixture-only; includes audio and access-state concepts; no public route recommended because refusal fixtures need stronger handling | Use for schema pressure and later import only after audio/access-state posture is decided |
| 05 | `05-meridian` | TBD | TBD | Build folder exists, but manifest/GAPS/evidence packet is incomplete | Do not count toward Gate 4 until its reference packet is complete |
| 06-10 | TBD | TBD | TBD | Not present | Human/product input required |

## Non-Goals

- Do not publish BBBVision or any reference.
- Do not create or expose public routes for BBBVision, GGM, Soundings, or unfinished references.
- Do not add publish, public sync, hosted deployment, or production-data writes.
- Do not change auth, tenant isolation, payments, tax/deductibility logic, donor/member data, or client/stakeholder communication.
- Do not apply or pop the parked stash from 2026-07-30 as part of Gate 4.
- Do not start Gate 5/Fable.
- Do not make the reference programme modify `presence-app`; Gate 4 imports must be deliberate Codex implementation slices with evidence.

## Human Decisions Needed

1. Confirm whether Gate 4 should proceed before pushing/opening review for commit `3d2097e`.
2. Confirm whether `05-meridian` is the intended fifth reference and whether it should be completed before any app import beyond Atelier.
3. Choose or approve reference directions for slots 06-10.
4. Decide whether GGM can be converted into fixture-safe metadata for internal Gate 4 registry use, or must remain out of runtime catalog entries.
5. Decide the Soundings audio/access-state posture before any runtime import.
6. Decide how strict the 30 supported pairings target should be before all 10 references exist.

## Milestones

### M1 - Reference Baseline Board

Status: Completed 2026-07-30 as docs/evidence baseline only.

Deliver a docs/evidence baseline of reference packets, missing slots, safety posture, candidate import order, and schema gaps.

Output:

- `PRESENCE_GATE_4_M1_REFERENCE_BASELINE_WORK_ORDER.md`
- evidence README under `docs/program/evidence/presence-gate4-execplan-creative-library-20260730/`
- evidence README under `docs/program/evidence/presence-gate4-m1-reference-baseline-20260730/`
- tracker update

Acceptance:

- No runtime code changed.
- Reference count, packet completeness, safety posture, and import order are explicit.
- Gate 4 cannot accidentally count incomplete references as accepted library primitives.

### M2 - Catalog Schema Gap Decision

Status: Completed 2026-07-30 as docs/schema decision only.

Compare reference manifests against the current Gate 3 style catalog.

Expected pressure points:

- current V3 union types only model 3 Look IDs and 3 Room Style IDs
- reference manifests need richer typed tokens than color/style presets
- some references need module contracts, axis semantics, access-state handling, and audio posture
- public renderer support is uneven and must remain explicit

Output:

- schema-gap evidence README
- implementation work order for the first safe catalog extension
- no backend validator change unless separately approved

Decision:

- Atelier-first is approved as the next recommended slice.
- Smallest safe M3 is a frontend/private catalog metadata import only.
- Backend validator changes are not required for M3 if M3 does not persist new IDs through owner-private state.
- Backend validator changes are required before saving new Atelier Look, Room Style, Piece Treatment, Atmosphere, Motion, layout, or composition-zone IDs.
- Soundings remains deferred until audio, access-state, reduced-audio, refusal, and public-route posture are decided.

### M3 - First Safe Reference Import

Recommended first candidate: `03-atelier` / Brass Inlay x Refractive Threshold.

Status: M3A staged 2026-07-30 as frontend/private catalog metadata only. Gate 4 is not accepted.

Reason:

- fixture-only
- public safety tier A
- complete manifest and screenshot packet
- no real person/client/media permission surface
- strong reduced-motion and mobile contracts

Output:

- typed catalog additions
- compatibility entries
- focused tests
- owner-control proof
- no public renderer route exposure unless explicitly scoped and proven

M3A output:

- `brass-inlay` Look metadata
- `refractive-threshold` Room Style metadata
- Atelier piece treatment metadata: `onion-inspection`, `scribe-reveal`, `measured-plate`
- Atelier atmosphere metadata: `drawing-sheet`, `material-sampler`
- blocked/private compatibility row for `brass-inlay` + `refractive-threshold`
- explicit V2 compiler fallback for unsupported M3A atmosphere/treatment facets
- focused catalog/compiler test coverage

M3A boundaries:

- no backend validator change
- no backend save/reload proof for new IDs
- no public preset, route, projection, renderer branch, publish, deploy, merge, push, or stash operation
- no `05-meridian` or slots `06` through `10` counting

### M4 - BBBVision Flagship Alignment

Reconcile existing Gate 3 `nocturnal-gallery` + `threshold-portal` with reference `Gilded Nocturne` + `Infinite Field`.

Output:

- one canonical bbbvision-inspired Gate 4 Look/Room Style posture
- clear mapping of what is reused, renamed, deferred, or blocked
- mobile, reduced-motion, metadata, performance, and visitor-action gaps tracked

### M5 - Library Expansion And Pairing Matrix

Add approved candidates toward 10 Looks and 10 Room Styles, then build the 10 flagship / 30 supported pairing matrix.

Rules:

- unsupported pairings must be blocked or hidden
- experimental pairings must remain internal/review-only
- no marketing/public claims from support tiers

### M6 - Gate 4 Acceptance Review

Run staged reviewability checks, typecheck/build, focused catalog/compiler tests, owner-control proof, public-invariance proof, mobile proof, and reduced-motion proof for any imported runtime styles.

## Tests And Validation

For this ExecPlan:

- docs-only inspection
- `git diff --check`

For runtime implementation slices:

- `cmd /c npm run typecheck`
- `cmd /c npm run build`
- focused catalog/compiler tests
- focused public payload/V2 adapter tests
- focused Playwright owner-control proof
- focused Playwright public-invariance proof
- mobile viewport proof at 390px when UI changes
- reduced-motion proof when visual/motion behaviour changes
- backend pytest only if backend validator or private-state shape changes

## Rollback

Docs-only rollback:

- remove this ExecPlan
- remove the Gate 4 M1 work order
- remove the Gate 4 evidence README
- restore the Gate 4 tracker row/status log

Runtime rollback for later implementation:

- revert the single milestone diff
- preserve Gate 1/Gate 2/Gate 3 accepted state
- do not pop or apply the parked stash unless that is the explicit task

## Risks

- The reference programme has fewer than 10 complete references today.
- Gate 4 can become misleading if incomplete references are counted as library coverage.
- BBBVision has strong proof but still has reduced-motion, metadata, mobile, performance, and visitor-action gaps in the reference packet.
- GGM is not public-showable and contains real-person context that must not become public proof.
- Soundings introduces audio/access-state/refusal concepts that exceed the current V3 catalog shape.
- Current app catalog types are intentionally narrow after Gate 3; expanding them will touch shared compiler/private-state paths.

## Progress Log

```text
2026-07-30 - Gate 4 started after human approval as planning/reference baseline only. Gate 1, Gate 2, and Gate 3 are accepted in commit 3d2097e. Repo was clean before Gate 4 edits. Reference source confirmed at C:\Dev\presence-reference with complete manifests for slots 01-04, incomplete slot 05, and no slots 06-10 yet. No runtime code, public route, publish path, backend validator, auth, tenant, payment, production data, deploy, merge, or stash apply was performed.
2026-07-30 - Gate 4 M1 Reference Baseline Board completed as docs/evidence only. Slots 01-04 have manifests and GAPS; slots 03-04 have screenshot packets; slot 05 has no manifest/GAPS and is not counted; slots 06-10 are missing. Atelier is the likely first runtime import candidate after M2 schema decision. GGM remains internal/non-public unless fixture-safe conversion is approved. Soundings remains blocked/deferred for public route posture until audio, access-state, reduced-audio, and refusal handling are decided. No runtime code, public renderer, publish path, backend validator, auth, tenant, payment, deploy, merge, or stash operation was performed.
2026-07-30 - Gate 4 M2 Catalog Schema Gap Decision completed as docs/schema evidence only. Current frontend and backend type/validator surfaces block new Atelier IDs unless implementation explicitly extends them. Atelier-first is approved as the next recommended M3A slice, limited to frontend/private catalog metadata with no backend persistence of new IDs. Backend validator changes are not required for that smallest slice, but are required before any saved private state can carry new Atelier IDs. Soundings remains deferred until audio, access-state, reduced-audio, institutional-refusal, and public-route posture are decided. Slot 05 and slots 06-10 remain excluded from runtime counting. No runtime code, backend validator, public renderer, publish path, deploy, merge, push, or stash operation was performed.
2026-07-30 - Gate 4 M3A Atelier frontend/private catalog staging completed. Added broad V3 catalog metadata for Brass Inlay, Refractive Threshold, three Atelier piece treatments, and two Atelier atmospheres; kept active P1 hydration/compiler catalog on the accepted Gate 3 style set; marked the Atelier pairing blocked/private until public adapter and backend persistence are separately approved; added compiler V2 facet fallbacks so unsupported Atelier atmosphere/treatment IDs do not leak into V2 public-shaped state. `cmd /c npm run typecheck` passed and focused compiler/catalog tests passed 58/58. No backend validator, public renderer, public route, public projection, publish, deploy, merge, push, auth, tenant, payment, production data, stash apply/pop, Soundings import, GGM conversion, `05-meridian`, slots 06-10, or Gate 5 work was performed.
```

## Final Review Checklist

- [x] M1 reference baseline board completed.
- [x] M2 schema-gap decision completed.
- [x] First safe runtime import approved as M3A frontend/private catalog metadata only.
- [x] M3A Atelier frontend/private catalog metadata staged with no backend/public route change.
- [ ] 10 Looks represented.
- [ ] 10 Room Styles represented.
- [ ] 10 flagship pairings represented.
- [ ] 30 supported pairings represented.
- [ ] unsupported pairings blocked/hidden.
- [ ] mobile proof captured for runtime visual changes.
- [ ] reduced-motion proof captured for runtime visual changes.
- [ ] public-invariance proof passed.
- [ ] no public launch, publish, deploy, auth, tenant, payment, or production-data change included.
