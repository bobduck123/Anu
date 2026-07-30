# Gate 4 M2 Evidence - Catalog Schema Gap Decision

Date: 2026-07-30
Gate: Gate 4 - V3.2 creative library buildout
Milestone: M2 - Catalog Schema Gap Decision
Status: Complete - docs/schema decision only

## Summary

Gate 4 M2 compared the accepted Gate 3 V3 catalog and model against the `03-atelier` and `04-soundings` reference manifests.

Decision:

- Atelier-first is approved as the next recommended implementation slice.
- The next slice must be a narrow frontend/private catalog import only.
- No runtime catalog code was edited in M2.
- No backend validator change is required for the smallest safe M3 slice if M3 does not save new style IDs through the owner-private backend state endpoint.
- Backend validator changes are required before any persisted private state can contain new Look, Room Style, Piece Treatment, Atmosphere, or Motion IDs.
- Soundings remains deferred until audio, access-state, reduced-audio, institutional-refusal, and public-route posture are decided.
- `05-meridian` and slots `06`-`10` remain excluded from runtime counting.

## Inputs Reviewed

- `C:\Dev\Flora_fauna\presence-app\.agent\PRESENCE_GATE_4_EXECPLAN.md`
- `C:\Dev\Flora_fauna\presence-app\.agent\PRESENCE_GATE_4_M1_REFERENCE_BASELINE_WORK_ORDER.md`
- `C:\Dev\Flora_fauna\presence-app\docs\program\evidence\presence-gate4-m1-reference-baseline-20260730\README.md`
- `C:\Dev\Flora_fauna\presence-app\.agent\PRESENCE_GATE_TRACKER.md`
- `C:\Dev\Flora_fauna\presence-app\lib\presence\studio-v3\styleCatalog.ts`
- `C:\Dev\Flora_fauna\presence-app\lib\presence\studio-v3\model.ts`
- `C:\Dev\Flora_fauna\presence-app\lib\presence\studio-v2\model.ts`
- `C:\Dev\Flora_fauna\presence-app\lib\presence\studio-v2\layouts.ts`
- `C:\Dev\Flora_fauna\flora-fauna\backend\app\services\presence_studio_v3_state.py`
- `C:\Dev\presence-reference\03-atelier\presence.manifest.json`
- `C:\Dev\presence-reference\04-soundings\presence.manifest.json`
- `C:\Dev\.agent\reference-program\REQUIREMENTS_REGISTER.md`

## Current Type Surface

Current frontend V3 unions in `model.ts`:

| Type | Current values | Gap for Atelier |
|---|---|---|
| `StudioV3LookId` | `soft-editorial`, `nocturnal-gallery`, `zine-archive` | Blocks `brass-inlay`. |
| `StudioV3RoomStyleId` | `threshold-portal`, `gallery-wall`, `film-strip-selected-works` | Blocks `refractive-threshold`. |
| `StudioV3PieceTreatment` | `quiet-framed`, `luminous-depth`, `captioned-ledger` | Blocks `onion-inspection`, `scribe-reveal`, `measured-plate`. |
| `StudioV3Atmosphere` | `paper-light`, `nocturnal-depth`, `ledger-scan` | Blocks `drawing-sheet`, `material-sampler`. |
| `StudioV3Journey` | `editorial-browse`, `threshold-reveal`, `archive-index` | Blocks an Atelier-specific practice journey if one is needed. |
| `StudioV2MotionIntensity` via `StudioV3LookValues.motionIntensity` | `still`, `gentle`, `living` | Cannot represent `seventy-five`, `glass-drift`, or `approach` as named behaviours. |
| `StudioV2PublicStylePreset` via `StudioV3LookValues.publicStylePreset` | `gallery-p2`, `christina-liquid-gallery`, `bbbvision-threshold-gallery` | No Atelier public preset exists. M3 must not invent public renderer support. |
| `PresenceStudioV2LayoutId` | `gallery-wall`, `portal-threshold`, `film-strip-selected-works` | No V2 layout can truthfully render Refractive Threshold. |
| `StudioV2PlacementTreatment` | `quiet`, `framed`, `captioned`, `signal` | Too coarse for Onion Inspection, Scribe Reveal, and Measured Plate. |

Current backend private-state allowlists in `presence_studio_v3_state.py` mirror the same narrow Gate 3 IDs. The backend validates `roomStyleId`, `baseLookId`, `pieceTreatment`, `atmosphere`, `motionIntensity`, `publicStylePreset`, composition layouts, composition zones, and object-edit treatments against explicit sets.

## Definition Field Assessment

### `PresenceLookDefinition`

Can represent Atelier partially:

- Look name, summary, owner fit, typography, palette/light, material language, image treatment, density, motion tone, atmosphere defaults, locked elements, safe controls, mobile behavior, reduced-motion behavior, performance expectation, intended wow moment.
- Evidence status and renderer support posture can say the import is not public-renderer-ready.

Cannot represent Atelier honestly:

- Typed non-color tokens such as rule pitch, dither coarseness, grain, drift, frame offsets, refraction IOR, dispersion, thickness, Fresnel values, or material sample token bundles.
- Parameter bounds as machine-readable constraints.
- Renderer consumers for tokens, such as shader, canvas rasterizer, CSS custom property, and re-rasterization triggers.
- The single-accent rule as an enforceable semantic rule rather than prose.
- Degradation order `full -> lean -> flat`.
- Fixture-only status and permission posture as first-class registry fields.
- The fact that changing material samples must re-derive already-rasterized plates.

M2 decision: Use current fields for owner-facing/prose catalog metadata in M3, but keep typed token contracts evidence-only until a later schema extension.

### `PresenceRoomStyleDefinition`

Can represent Atelier partially:

- Room Style name, spatial model, navigation model, encounter pattern, supported content type prose, zones, default treatments, compatible looks, mobile/reduced-motion/performance/wow, evidence status.

Cannot represent Atelier honestly:

- A 3D refractive scene whose bodies are the controls.
- Screen-reader-only navigation as a semantic mirror.
- Preview mode: this style is not truthfully cardable at thumbnail scale.
- Required content shape and exact six-destination contract.
- Multi-layer morph timing and content resolving at 75 percent.
- Module contract, shared primitive dependency, and box measurement rules.
- V2 layout mapping; no current V2 layout can render the reference.

M2 decision: M3 may add `refractive-threshold` as private-preview-only metadata, but must not claim public renderer support.

### `PresencePieceTreatmentDefinition`

Can represent Atelier partially:

- Labels, descriptions, broad allowed source types, prose visual rules, mobile/reduced-motion/performance/wow, preview swatches.

Cannot represent Atelier honestly:

- Onion Inspection host contract over arbitrary child layers.
- Scribe Reveal over `[data-reveal]` blocks with directional offsets.
- Measured Plate as generated content from kind plus seed.
- Per-treatment host contract and output modality.
- The difference between applying to a Piece and applying to arbitrary module content.

M2 decision: M3 may add treatment metadata only, with `quiet-framed` as fallback, but treatment behavior remains evidence-only unless a later private-preview adapter is explicitly scoped.

### `PresenceAtmosphereDefinition`

Can represent Atelier partially:

- Drawing Sheet and Material Sampler names, descriptions, environment token prose, contrast notes, fallback atmosphere, mobile/reduced-motion/performance/wow, preview colors.

Cannot represent Atelier honestly:

- Shader and canvas consumers.
- Custom property token packs.
- Material sample token bundles.
- Re-rasterization requirements.
- Distinction between atmosphere module and owner-control module.
- Perf cost as structured data.

M2 decision: M3 may add atmosphere metadata, but actual shader/material-sampler behavior remains out of scope.

### `PresenceMotionBehaviourDefinition`

Can represent Atelier poorly:

- Current model can collapse Atelier motion to `living`.
- Current fields can describe event triggers and reduced-motion behavior in prose.

Cannot represent Atelier honestly:

- Named motion behaviour IDs for `seventy-five`, `glass-drift`, and `approach`.
- Multiple behaviours on one Look.
- Per-behaviour parameter bounds.
- Exact hierarchy and fallback contracts as machine-readable rules.
- Motion engine beyond `none`, `css`, and `canvas`; Atelier uses WebGL, canvas, CSS, and geometry/raster updates.

M2 decision: A truthful Atelier import needs a new V3 motion-behaviour ID surface separate from V2 `motionIntensity`, but M3 may defer executable motion and keep `StudioV3LookValues.motionIntensity` as `living` for V2 bridge compatibility.

## Atelier Mapping Decision

### Safe To Map In M3

| Reference field | M3 mapping |
|---|---|
| Look name | Add `brass-inlay` as an internal/private catalog Look ID. |
| Room Style name | Add `refractive-threshold` as an internal/private catalog Room Style ID. |
| Look prose metadata | Map into `PresenceLookDefinition` prose fields. |
| Room Style prose metadata | Map into `PresenceRoomStyleDefinition` prose fields. |
| Piece Treatments | Add metadata entries for `onion-inspection`, `scribe-reveal`, `measured-plate`, fallbacking to safe existing treatment behavior. |
| Atmospheres | Add metadata entries for `drawing-sheet`, `material-sampler`, fallbacking to a safe existing surface. |
| Motion | Record `seventy-five`, `glass-drift`, `approach` as evidence-only or metadata-only until a V3 motion ID type exists; use `living` only as the V2 bridge value. |
| Compatibility | Add one internal/review-only pairing: `brass-inlay` + `refractive-threshold`. It may be a reference flagship, but not public launch-grade until renderer proof exists. |
| Public projection | Use `private-preview-only` or `metadata-only`; do not add an Atelier public preset. |
| Evidence | Link to `03-atelier` manifest and screenshots. |

### Must Remain Evidence-Only Or Deferred

- WebGL refraction, cube camera, shader/canvas material behavior.
- Material sampler token bundles and parameter bounds.
- Generated measured-plate Work source model.
- Enquiry transport and owner signal.
- Six-body 3D navigation and screen-reader semantic mirror.
- Module contract validator as shared app tooling.
- Animated capture/inspection harness.
- Backend persistence of new IDs.
- Public renderer support.

## Soundings Deferral Decision

Soundings must remain deferred for runtime import because it introduces unresolved product and schema commitments that are larger than M3:

- REQ-041: audio as a declared Presence dimension, including consent invariant and reduced-audio posture.
- REQ-045: access tier as first-class content state, including open, embargoed, withheld, reason, date, and derivative.
- REQ-048: fixture institutional refusal statements cannot be routed publicly without stronger handling.
- REQ-046: primary axis is depth in metres, not page order.
- REQ-047: treatments may output audio and need modality/collision rules.
- REQ-043: palette entries need semantic roles; Soundings relies on present/withheld accent semantics.
- REQ-036: generated time-based media needs duration, transport, and gesture requirements.
- The manifest contains a valid safety tier A media posture, but that does not resolve institutional-statement credibility risk.

M2 decision: Soundings remains schema pressure and evidence only. Do not import it in M3.

## Backend Validator Decision

Backend validator change is not required for the smallest safe M3 slice if M3 is explicitly limited to frontend/private catalog metadata and does not persist new IDs through `PUT /api/presence/owner/rooms/<id>/editor/v3/state`.

Backend validator change is required before any of the following:

- Saving `baseLookId: "brass-inlay"`.
- Saving `roomStyleId` or `styleId: "refractive-threshold"`.
- Saving `pieceTreatment: "onion-inspection"`, `scribe-reveal`, or `measured-plate`.
- Saving `atmosphere: "drawing-sheet"` or `material-sampler`.
- Saving any new V3 motion behaviour ID.
- Saving composition layouts/zones for Refractive Threshold.

The backend currently hard-codes the Gate 3 IDs and exact known metadata categories. Changing those allowlists is not part of M2 or the smallest M3 slice.

## Smallest Safe M3 Slice

Recommended next slice: Gate 4 M3A - Atelier private catalog metadata import.

Scope:

1. Add TypeScript-only frontend IDs for Atelier Look, Room Style, Piece Treatments, Atmospheres, and a V3 motion-behaviour metadata surface if needed.
2. Add `brass-inlay` and `refractive-threshold` definitions to the frontend catalog as internal/private-preview-only metadata.
3. Add one `brass-inlay` + `refractive-threshold` compatibility entry as internal/review-only, with explicit warning that public renderer proof and backend persistence are not complete.
4. Link the definitions to the `03-atelier` evidence packet.
5. Keep public projection on an existing safe fallback or mark it metadata-only/private-preview-only. Do not add an Atelier public preset or public route.
6. Disable or avoid save/reload proof for new IDs unless a separate backend-validator task is approved.
7. Run typecheck/build and focused catalog/helper tests.

Out of scope for M3A:

- Runtime renderer adapter for Atelier.
- WebGL/shader/canvas implementation.
- Public renderer/public route exposure.
- Backend private-state validator changes.
- Publish/public sync.
- Soundings import.
- GGM fixture conversion.
- `05-meridian` or slots `06`-`10`.

## Stop/Go Recommendation

Go to M3A as a small frontend/private catalog metadata implementation slice, subject to explicit approval to edit runtime catalog code.

Do not proceed to M3 if the expected proof requires backend persistence, public rendering, or Soundings behavior. Those require separate work orders.

## Validation

- `git diff --check` required.
- `git diff --cached --check` required after staging.

## Rollback

Remove this evidence folder and restore the Gate 4 M2 progress entries in:

- `.agent/PRESENCE_GATE_4_EXECPLAN.md`
- `.agent/PRESENCE_GATE_TRACKER.md`

No stash recovery is needed because the parked stash was not touched.
