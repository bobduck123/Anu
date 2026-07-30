# Gate 3 M4B Evidence - BBBVision Flagship Primitive Audit

Date: 2026-07-29
Project: Presence
Gate: Gate 3 - V3.2 Design-System Architecture
Status: Complete - docs-only audit
Verdict: ACCEPT M4B

## Summary

Gate 3 M4B audits BBBVision as the primary flagship Gate 3 style bundle.

BBBVision is represented in the V3 style catalog as a real Look plus Room Style pair: `nocturnal-gallery` + `threshold-portal`, bridged to V2 public preset `bbbvision-threshold-gallery` and V2 layout `portal-threshold`. It also has V3 Piece Treatment, Atmosphere, Motion, compatibility, mobile, reduced-motion, performance, and owner-control metadata.

The audit finding is: BBBVision clears Gate 3 as the first flagship architecture candidate, but not because the public renderer is registry-native. Its strongest threshold/gallery behaviour still lives in a specialized V2 public renderer branch, `BbbVisionCanvasGallery`, and BBBVision CSS. That bridge is acceptable for Gate 3 if it remains explicit, private/local for style selection, and protected by public invariance proof before any later adapter work.

No public renderer, public route, public projection, backend validator, publish/public sync, hosted/prod data, auth, tenant, payment, or deployment config was changed.

## Files Inspected

| Area | Files |
|---|---|
| Required gate docs | `.agent/PRESENCE_CANON.md`, `.agent/PRESENCE_V34_GATED_PLAN.md`, `.agent/PRESENCE_GATE_TRACKER.md`, `.agent/PRESENCE_GATE_3_EXECPLAN.md`, `.agent/PRESENCE_GATE_3_M2_SHARED_STYLE_CATALOG_WORK_ORDER.md`, `.agent/PRESENCE_GATE_3_M3_OWNER_CONTROLS_FROM_REGISTRY_WORK_ORDER.md`, `.agent/PRESENCE_GATE_3_M4_CHRISTINA_CANDIDATE_STYLE_AUDIT_WORK_ORDER.md`, `.agent/DESIGN_SYSTEM_PIPELINE.md`, `.agent/LAUNCH_QUALITY_BAR.md`, `.agent/NO_MERGE_REVIEW.md`, `.agent/TASK_SIZING.md` |
| Prior Gate 3 evidence | `docs/program/evidence/presence-gate3-m1-style-architecture-map-20260727/README.md`, `docs/program/evidence/presence-gate3-m2-shared-style-catalog-20260727/README.md`, `docs/program/evidence/presence-gate3-m3-owner-controls-from-registry-20260727/README.md`, `docs/program/evidence/presence-gate3-m4-christina-candidate-style-audit-20260727/README.md`, `docs/program/evidence/presence-gate3-m5-style-compatibility-guardrails-20260727/README.md` |
| V3 catalog/compiler/UI | `lib/presence/studio-v3/styleCatalog.ts`, `lib/presence/studio-v3/compiler.ts`, `lib/presence/studio-v3/p1Catalog.ts`, `lib/presence/studio-v3/p1State.ts`, `components/presence-studio-v3/StudioV3LookControls.tsx`, `components/presence-studio-v3/presence-studio-v3.css` |
| V2/public renderer | `components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx`, `components/presence-studio-v2/BbbVisionCanvasGallery.tsx`, `components/presence-studio-v2/presence-studio-v2-public.css`, `components/presence-studio-v2/worlds.ts`, `lib/presence/studio-v2/model.ts`, `lib/presence/studio-v2/layouts.ts`, `lib/presence/studio-v2/studioV2Adapters.test.ts` |
| Fixtures/seeds | `tests/e2e/mock-presence-api.mjs`, `C:/Dev/Flora_fauna/flora-fauna/backend/scripts/seed_presence_gate2_bbbvision_local.py`, `C:/Dev/Flora_fauna/flora-fauna/backend/tests/test_presence_gate2_bbbvision_local_seed.py` |
| Tests/proof | `lib/presence/studio-v3/compiler.test.ts`, `lib/presence/render/publicPayload.test.ts`, `tests/e2e/presence-studio-v3-bbb-prototype.spec.ts`, `tests/e2e/presence-studio-v3-public-invariance.spec.ts`, `tests/e2e/presence-studio-v3-mobile-accessibility.spec.ts`, `tests/e2e/presence-studio-v2-bbbvision-canvas-gallery.spec.ts`, `tests/e2e/presence-studio-v2-bbbvision-parity.spec.ts`, `tests/e2e/presence-studio-v2-bbbvision-gallery-parity.spec.ts`, Gate 2 BBBVision real-backend specs |
| Prior BBBVision audits | `docs/program/PRESENCE_V3_BBBVISION_CANVAS_ENGINE_AUDIT.md`, `docs/program/PRESENCE_V3_BBBVISION_CANVAS_CONDITIONAL_REAUDIT.md` |
| Backend validation | `C:/Dev/Flora_fauna/flora-fauna/backend/app/services/presence_studio_v3_state.py` |

## Files Changed

| File | Change |
|---|---|
| `docs/program/evidence/presence-gate3-m4b-bbbvision-flagship-primitive-audit-20260729/README.md` | Added this audit evidence packet. |
| `.agent/PRESENCE_GATE_3_M4B_BBBVISION_FLAGSHIP_PRIMITIVE_AUDIT_WORK_ORDER.md` | Added the completed M4B work-order record. |
| `.agent/PRESENCE_GATE_TRACKER.md` | Updated Gate 3 status/log to record M4B and resume M6 as the next action. |
| `.agent/PRESENCE_GATE_3_EXECPLAN.md` | Added M4B evidence/milestone/result and final checklist item. |

This was docs-only. No runtime, catalog, renderer, backend, route, publish, auth, tenant, payment, hosted, or deployment code was changed.

## Commands And Tests Run

| Command | Result |
|---|---|
| `git diff --check -- docs/program/evidence/presence-gate3-m4b-bbbvision-flagship-primitive-audit-20260729/README.md .agent/PRESENCE_GATE_3_M4B_BBBVISION_FLAGSHIP_PRIMITIVE_AUDIT_WORK_ORDER.md .agent/PRESENCE_GATE_TRACKER.md .agent/PRESENCE_GATE_3_EXECPLAN.md` | PASS |

No typecheck/build/runtime tests were required because M4B changed docs only.

## BBBVision Current Implementation Map

| Token / behaviour | Current source | Classification | Finding |
|---|---|---|---|
| `nocturnal-gallery` | `styleCatalog.ts` Look definition; `p1Catalog.ts` wrapper | Catalog-backed | Real V3 Look ID with typography, palette/light, material, image treatment, density, motion tone, atmosphere, safe controls, mobile, reduced-motion, performance, and wow metadata. |
| `threshold-portal` | `styleCatalog.ts` Room Style definition; `p1Catalog.ts` wrapper | Catalog-backed | Real V3 Room Style ID bridged to V2 layout `portal-threshold`. |
| `bbbvision-threshold-gallery` | `styleCatalog.ts`, V2 model/worlds/public renderer | Catalog-backed and V2-backed | Catalog records it as `flagship`; V2 public renderer still owns specialized behaviour. |
| `portal-threshold` | `lib/presence/studio-v2/layouts.ts`; backend validator layout map | V2/compiler-backed | Required zones and mobile zone behaviour are V2 layout data, not BBBVision-only code. |
| `luminous-depth` | `styleCatalog.ts`; V3 skin `experiencePieceTreatment` | Catalog-backed | Sufficient as a Gate 3 piece-treatment contract for focused images; actual public BBBVision image effects still depend on V2/CSS/canvas branch. |
| `nocturnal-depth` | `styleCatalog.ts`; V3 skin `experienceAtmosphere`; CSS experience class | Catalog-backed plus CSS-backed | Sufficient as an atmosphere token; full dark field comes from BBBVision renderer/CSS. |
| `living` | V2/V3 motion union and facet controls | Catalog/UI-backed | Available as a motion behaviour and mobile/reduced-motion-tested in V3 owner controls, but BBBVision Look default currently uses `gentle`, not `living`. |
| `threshold-reveal` | `styleCatalog.ts`; V3 skin `experienceJourney` | Catalog/compiler-backed | Journey token exists and compiles as V2 skin metadata. |
| `gallery` | `worldId` in Look/public preset; V2 renderer branch condition | Compiler/public-renderer-backed | Required for the specialized public branch. |
| `main-wall` | V2 `gallery-wall` layout and Gate 2 private placement proof | V2/private-overlay-backed | Used in owner placement proofs; not part of the `threshold-portal` required zone list. |
| Canvas/threshold engine | `BbbVisionCanvasGallery.tsx`, `BbbVisionThresholdGalleryPublicRoom` | Hard-coded/bespoke V2 branch | Strong flagship behaviour, but not decomposed into reusable registry modules yet. |
| CSS branch | `.style-bbbvision-threshold-gallery` selectors | CSS-only behaviour | Owns key atmosphere, layout, mobile, focus, loader, and reduced-motion rules. |
| Private overlay behaviour | V3 compiler, `p1State.ts`, owner private-state API | Compiler/private-backed | Private edits can shape BBBVision local preview without public sync. |
| Public route behaviour | public payload/projection and V2 renderer | Public-renderer-backed | Public route does not read V3 private style metadata. |

## BBBVision Design-System Mapping

### Look

| Field | BBBVision value |
|---|---|
| ID | `nocturnal-gallery` |
| Owner-facing name | Nocturnal Gallery |
| Visual thesis | Near-black threshold with concentrated gold signal, image depth, and cinematic focus. |
| Typography direction | Low, cinematic hierarchy with signal accents. |
| Palette/light | Black field, gold signal, restrained depth. |
| Material language | Threshold darkness, luminous edges, canvas atmosphere. |
| Image treatment | Luminous depth around selected works. |
| Density | Focused. |
| Motion tone | Gentle ambient motion with reduced-motion fallback. |
| Atmosphere defaults | `nocturnal-depth`. |
| Locked elements | None at V3 Look level. BBBVision renderer chrome remains effectively protected by specialized renderer behaviour. |
| Safe owner controls | Background, accent color, texture, piece treatment, motion intensity. |
| Intended wow moment | Visitor crosses a threshold into the work field. |

### Room Style

| Field | BBBVision value |
|---|---|
| ID | `threshold-portal` |
| Spatial model | Arrival threshold with one dominant work and onward path. |
| Navigation model | Entry first, then directed progression. |
| Content encounter pattern | Dominant work, statement, signal, exit. |
| Supported content types | Image, writing, CTA. |
| Required zones | `threshold-image`, `threshold-statement`, `threshold-exit`. |
| Optional zones | `threshold-signal`. |
| Default Piece Treatments | `luminous-depth`, `quiet-framed`. |
| Compatible Looks | `nocturnal-gallery`, `soft-editorial`, `zine-archive`. |
| Intended wow moment | The first object feels like an arrival gate. |

### Piece Treatments

`luminous-depth` is sufficient for Gate 3 as a registered treatment for focused images:

- images: supported through `allowedSourceTypes: ["image"]`;
- captions: catalog says captions must stay minimal so the work leads;
- threshold objects: V2 `portal-threshold` zones allow `framed`, `quiet`, `captioned`, and `signal` placement treatments, while V3 `luminous-depth` remains an experience-level treatment;
- mobile fallback: reduce glow and preserve edge clarity;
- reduced motion: depth remains as static contrast.

Gap: V2 placement treatments and V3 Piece Treatments are still separate concepts. The BBBVision focus rectangle, strip burst, canvas thumbnails, and overlay are not generated from `luminous-depth`; they live in the BBBVision V2 branch and canvas component.

### Atmosphere

`nocturnal-depth` is sufficient for Gate 3 as a registered atmosphere:

- lighting/materiality: black field, gold signal, depth;
- ambient depth: represented as catalog token and CSS experience class;
- idle state: supported by BBBVision canvas/loader/CSS rather than atmosphere metadata alone;
- screenshot recognisability: strong in prior BBBVision canvas evidence;
- performance budget: catalog requires bounded canvas/CSS effects;
- reduced-motion fallback: static contrast and focus.

Gap: the atmosphere token does not itself own the public dark field. The branch-specific CSS and canvas still do.

### Motion

BBBVision's registered Look value currently uses `gentle`; `living` exists as the strongest motion behaviour in the catalog and V3 owner controls, but should not be treated as the BBBVision default.

Current motion coverage:

- threshold transition: V2 branch state machine and CSS animations;
- object response: canvas hover/focus rectangle, click/touch/keyboard focus, and focus overlay;
- preview changes: V3 compiler applies Look/facet values into V2 skin and private preview classes;
- owner edit feedback: V3 editor bridge activates Pieces and suppresses unsupported public chrome;
- mobile/touch: canvas supports touch drag and mobile DPR cap;
- reduced-motion equivalent: canvas bypasses focus burst and CSS disables BBBVision loader/focus animations.

Gap: motion is not yet a modular Motion Behaviour adapter. The `gentle`/`living` tokens do not independently instantiate the BBBVision canvas state machine.

## Gate 3 Minimum Pass Finding

| Requirement | Finding |
|---|---|
| Looks and Room Styles are not hard-coded one-offs | Pass for catalog representation: `nocturnal-gallery` and `threshold-portal` are real catalog IDs. Caveat: public BBBVision rendering is still a specialized branch. |
| Piece Treatments can be selected or associated through metadata | Pass for V3 metadata: `luminous-depth` is represented and owner controls expose treatment facets. Caveat: V2 placement treatment remains separate. |
| Atmosphere and Motion are modular or systematised | Partial pass: `nocturnal-depth`, `gentle`, and `living` are cataloged and compiled. Caveat: canvas behaviour is bespoke. |
| Unsupported combinations can be blocked, warned, or downgraded | Pass through M5 guardrail helpers and compatibility tiers. |
| Owner controls can be generated from capability metadata | Pass for existing Look/Room/facet controls and compact compatibility readout. |
| Public renderer can consume style definitions safely later | Not yet implemented. Current safe posture is explicit bridge first, adapter later after invariance proof. |
| Mobile and reduced-motion are part of the contract | Pass as catalog fields and existing proof; still needs M6 acceptance review across evidence. |
| At least 2-3 existing/prototype styles are migrated | Pass for Gate 3 candidates: BBBVision flagship, Gallery P2 control, Christina metadata-only candidate. |
| Adding an 11th Look/Room Style has a known process | Pass: add catalog entry, bridge values, compatibility row, guardrail status, owner-control exposure, tests, mobile/reduced-motion/performance evidence, backend-aware validator work if new persisted tokens are introduced. |

Verdict: BBBVision satisfies the Gate 3 architecture minimum as the flagship candidate, provided the specialized V2 renderer bridge remains explicit and is not mistaken for a completed public renderer adapter.

## Launch Quality Bar Finding

This is not Gate 4 or Gate 9 approval. Scores are for BBBVision as a Gate 3 architecture candidate.

| Dimension | Score / 4 | Finding |
|---|---:|---|
| Threshold wow | 4 | The threshold/gallery state machine gives an immediate "entered somewhere" feeling. |
| Interaction wow | 4 | Canvas focus, strip burst, keyboard/touch navigation, and focus overlay are signature interactions. |
| Discovery wow | 3 | Gallery/practice flow and object focus reveal material, but richer visitor journeys belong to Gate 6. |
| Transformation wow | 3 | Owner Look/Room/facet changes visibly redirect private preview, but true public registry switching is deferred. |
| Atmosphere | 4 | Nocturnal black/gold field is memorable and specific. |
| Interaction | 4 | Strong for canvas and threshold; owner controls remain compact. |
| Mobile | 3 | Mobile proof exists and is usable; entry-level performance still needs caution. |
| Reduced motion | 3 | Reduced-motion paths exist and are tested; final M6 should verify evidence freshness. |

Average: 3.5. BBBVision meets the Gate 3 architecture-candidate bar, not public launch approval.

## Mobile / Reduced-Motion / Performance Finding

Current mobile proof:

- prior BBBVision canvas audits captured mobile gallery proof;
- `presence-studio-v2-bbbvision-canvas-gallery.spec.ts` covers 390px mobile gallery field;
- `presence-studio-v3-mobile-accessibility.spec.ts` covers V3 mobile bottom sheet, Test as visitor, BBBVision gallery focus, and reduced-motion visual controls;
- V2 CSS has a BBBVision mobile branch under `max-width: 900px`.

Current reduced-motion proof:

- `BbbVisionCanvasGallery.tsx` reads `prefers-reduced-motion`;
- wheel/touch movement is suppressed or reduced under reduced motion;
- focus strip-burst is bypassed;
- loader/focus CSS animations are disabled under `prefers-reduced-motion: reduce`;
- focused specs cover reduced-motion canvas focus and V3 reduced-motion controls.

Performance expectations:

- canvas uses a 16x16 field, deterministic thumbnail generation, DPR cap of 2 on mobile and 2.5 on desktop;
- image preload timeout is 2.2s;
- RAF pauses when the document is hidden;
- mobile glitch probability is lower than desktop;
- prior audit records entry-level mobile frame drops as possible with 256 shapes.

M4B gap:

- Gate 3 can keep BBBVision flagship with this evidence, but Gate 4 should consider adaptive shape count or a performance budget before broad style-library reuse.

## Compatibility / Fallback Finding

Confirmed:

- `nocturnal-gallery` + `threshold-portal` is `flagship`;
- `nocturnal-gallery` + `gallery-wall` is `supported` with fallback `threshold-portal`;
- `nocturnal-gallery` + `film-strip-selected-works` is `experimental` with fallback `threshold-portal`;
- `soft-editorial` + `gallery-wall` remains the room `1` control flagship pair;
- `zine-archive` + `film-strip-selected-works` remains internal-review experimental;
- no production blocked pairing exists yet.

Fallback:

- if BBBVision public preset candidate is unavailable or invalid, M5 compiler guardrails fall back to Soft Editorial/Gallery P2;
- if a non-flagship BBBVision pairing is chosen privately, compatibility copy points back to the flagship `threshold-portal` where applicable.

Owner controls:

- existing V3 Look controls show `Flagship pairing` and `Designed for the strongest version of this room.`;
- safe controls, locked elements, mobile behaviour, reduced-motion behaviour, performance expectation, and private/public boundary copy are displayed from catalog metadata.

## Owner-Control / Catalog Finding

Pass.

`StudioV3LookControls.tsx` consumes catalog definitions and M5 guardrail helpers. BBBVision appears as the `Nocturnal Gallery` Look and `Threshold Portal` Room Style, not as a hard-coded Christina-style one-off selector. The owner-control surface does not import or depend on the public renderer.

Owner-control limitation:

- owner copy can explain the flagship pair, but cannot yet explain every piece of the canvas engine as modular selectable parts. That belongs to Gate 4 or a later public adapter slice.

## Public / Private Safety Finding

Pass for M4B.

M4B changed docs only.

Current safety posture:

- Gate 3 style selection remains private/local in V3 overlay metadata;
- public renderer/projection does not import the V3 style catalog;
- public route does not read V3 private style metadata;
- no publish/public sync path was added in Gate 3;
- Gate 2 real-backend evidence remains the latest proof that real local BBBVision stayed unpublished/non-public;
- Gate 3 M5 public-invariance proof passed in the mock/public route harness.

Public adapter warning:

- Do not make `PresenceStudioV2PublicRoom` depend on the style catalog until a dedicated public adapter slice proves before/after invariance for `/api/presence/public/bbbvision`, `/p/bbbvision`, `/presence/bbbvision`, and room `1`.

## Hard-Coded Dependency List

BBBVision still relies on these non-registry dependencies:

- `PresenceStudioV2PublicRoom.tsx` branch: `worldId === "gallery"` and `publicStylePreset === "bbbvision-threshold-gallery"`;
- `BbbVisionThresholdGalleryPublicRoom` state machine for `threshold`, `gallery`, and `practice`;
- `BbbVisionCanvasGallery.tsx` for spherical canvas field, loader, thumbnails, glitch, focus rectangle, strip burst, and touch/pointer/keyboard handling;
- `.style-bbbvision-threshold-gallery` CSS branch for 100svh shell, threshold/gallery/practice layout, brand mark, field loader, mobile layout, focus overlay, and reduced-motion overrides;
- mock fixtures and local seed data for BBBVision room `29`, Works `2901`-`2904`, and Collections `291`/`292`;
- backend validator token mirrors for current V3 private metadata values;
- older audit note still identifies orphaned `.v2-bbb-star` CSS and `constellationStarStyle()` helper as cleanup candidates.

These are acceptable for Gate 3 only because the dependencies are mapped and fenced.

## System-Native Dependency List

BBBVision is system-native at these layers:

- V3 Look ID: `nocturnal-gallery`;
- V3 Room Style ID: `threshold-portal`;
- V3 Piece Treatment ID: `luminous-depth`;
- V3 Atmosphere ID: `nocturnal-depth`;
- V3 Journey ID: `threshold-reveal`;
- V3 public preset candidate: `bbbvision-threshold-gallery`, `supportStatus: "flagship"`;
- compatibility row: `nocturnal-gallery` + `threshold-portal` as `flagship`;
- compiler bridge from V3 Look values to V2 skin/public-room shape;
- owner controls generated from catalog definitions and guardrail helpers;
- private metadata categories already accepted by Gate 2;
- public/private invariance tests around V3 private edits.

## Remaining Risks

- BBBVision can distort the registry if future styles copy its bespoke canvas implementation instead of defining reusable primitives.
- `luminous-depth`, `nocturnal-depth`, and `gentle`/`living` are real metadata contracts, but not enough by themselves to recreate BBBVision without the V2 branch.
- No production blocked pairings exist yet; blocked behaviour is helper/source-tested.
- Backend validators still mirror current frontend tokens. New IDs require backend-aware work.
- Real-backend unpublished/404 proof was not rerun in M4B because no backend/public code changed.
- Gate 4 should not start until M6 accepts the full Gate 3 packet.

## Rollback Notes

Rollback is docs-only:

1. Remove this evidence folder.
2. Remove `.agent/PRESENCE_GATE_3_M4B_BBBVISION_FLAGSHIP_PRIMITIVE_AUDIT_WORK_ORDER.md`.
3. Revert the M4B status/log edits in `.agent/PRESENCE_GATE_TRACKER.md`.
4. Revert the M4B milestone/evidence/checklist edits in `.agent/PRESENCE_GATE_3_EXECPLAN.md`.

No runtime, backend, data, public route, hosted, or config rollback is required.

## Recommended Next Task

Gate 3 M6 - Gate 3 acceptance review.

M6 should explicitly verify:

- BBBVision remains private/local until later publish-readiness gates;
- room `1` remains the simple/control path;
- public routes remain unchanged;
- the public renderer still does not depend on the catalog;
- M1-M5 plus M4B evidence support Gate 3 acceptance;
- any future public renderer adapter is deferred to a separately scoped slice.
