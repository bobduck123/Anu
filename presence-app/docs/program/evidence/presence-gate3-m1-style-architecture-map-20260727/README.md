# Gate 3 M1 Evidence - Style Architecture Map

Date: 2026-07-28
Project: Presence
Gate: Gate 3 - V3.2 Design-System Architecture
Status: Complete - docs-only Explorer map

## Summary

Gate 3 M1 mapped the current Presence style/rendering architecture without runtime changes.

The current system already has the beginnings of a style registry in `lib/presence/studio-v3/p1Catalog.ts`, but style behaviour is still split across V3 model unions, V3 Studio UI literals, V2 public style presets, V2 layout definitions, public renderer branches, CSS, e2e fixtures, and backend private-metadata validation.

The smallest safe registry seam for Gate 3 is:

1. keep style selection private in V3 overlay metadata;
2. introduce a shared frontend style catalog consumed by V3 Studio and the V3 compiler;
3. keep the public renderer and public projection unchanged until public-route invariance is proven with focused tests.

Do not make the public renderer depend on the new registry in M2.

## Files Inspected

| Area | Files |
|---|---|
| Gate/canon docs | `.agent/PRESENCE_CANON.md`, `.agent/PRESENCE_V34_GATED_PLAN.md`, `.agent/PRESENCE_GATE_TRACKER.md`, `.agent/PRESENCE_GATE_3_EXECPLAN.md`, `.agent/PRESENCE_GATE_3_M1_STYLE_ARCHITECTURE_MAP_WORK_ORDER.md`, `.agent/DESIGN_SYSTEM_PIPELINE.md`, `.agent/LAUNCH_QUALITY_BAR.md`, `.agent/NO_MERGE_REVIEW.md`, `.agent/TASK_SIZING.md` |
| Gate 2 acceptance evidence | `docs/program/evidence/presence-gate2-acceptance-review-20260727/README.md`, `docs/program/evidence/presence-gate2-auth-mock-hardening-20260727/README.md` |
| V3 model/catalog/compiler | `lib/presence/studio-v3/model.ts`, `lib/presence/studio-v3/p1Catalog.ts`, `lib/presence/studio-v3/compiler.ts`, `lib/presence/studio-v3/p1State.ts`, `lib/presence/studio-v3/editing.ts`, `lib/presence/studio-v3/feature.ts` |
| V3 Studio UI/CSS | `components/presence-studio-v3/PresenceStudioV3Shell.tsx`, `components/presence-studio-v3/StudioV3LookControls.tsx`, `components/presence-studio-v3/presence-studio-v3.css` |
| V2 renderer/layout/presets | `lib/presence/studio-v2/model.ts`, `lib/presence/studio-v2/layouts.ts`, `lib/presence/studio-v2/adapters.ts`, `lib/presence/studio-v2/publicProjection.ts`, `components/presence-studio-v2/worlds.ts`, `components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx`, `components/presence-studio-v2/BbbVisionCanvasGallery.tsx`, `components/presence-studio-v2/presence-studio-v2-public.css` |
| Public route/payload | `app/(public)/p/[slug]/page.tsx`, `components/portfolio/PortfolioRenderer.tsx`, `lib/presence/render/publicPayload.ts` |
| Backend validation | `C:/Dev/Flora_fauna/flora-fauna/backend/app/services/presence_studio_v3_state.py`, focused backend tests under `C:/Dev/Flora_fauna/flora-fauna/backend/tests/` |
| E2E/mock evidence | `tests/e2e/mock-presence-api.mjs`, `tests/e2e/presence-studio-v2-public-style-presets.spec.ts`, `tests/e2e/presence-studio-v3-public-invariance.spec.ts`, `tests/e2e/presence-studio-v3-mobile-accessibility.spec.ts`, `tests/e2e/presence-studio-v3-bbb-prototype.spec.ts` |
| Prior/prototype evidence | `docs/program/PRESENCE_V3_BBBVISION_CANVAS_ENGINE_AUDIT.md`, `docs/program/evidence/presence-studio-v2-public-style-presets-20260724/`, legacy Presence reference docs under `legacy presence docs/` |

## Style Architecture Map

### V3 Studio Style Surfaces

| Surface | Current implementation | Finding |
|---|---|---|
| Visual labels | `StudioV3LookControls.tsx` hard-codes Look names, Room Style names, descriptions, colors, chips, and facet labels. | Owner-facing language is duplicated outside the catalog. M2 should move labels/descriptions into a shared catalog while preserving the same ids. |
| Look primitives | `model.ts` defines `StudioV3LookId`, `StudioV3LookValues`, and facet token unions. `p1Catalog.ts` defines `soft-editorial`, `nocturnal-gallery`, and `zine-archive`. | This is the closest existing registry seam, but it is incomplete because UI literals and backend validators separately mirror the same tokens. |
| Room/zone/size controls | V3 rooms compile to V2 registered layouts from `lib/presence/studio-v2/layouts.ts`. Zone ids, allowed sizes, allowed treatments, max item counts, and mobile behaviour live in V2 layout definitions. | Room Style registry must not replace V2 layouts in M2. It should point to V2 layout ids as an explicit bridge. |
| Private overlay metadata | `p1State.ts` projects private categories: `named_looks`, `layer_values`, `restore`, `placements`, `object_edits`, `savepoints`, `compatibility`, and locks. Backend mirrors this in `presence_studio_v3_state.py`. | Existing private metadata is sufficient for M2 style selection. Do not add a new metadata category unless later runtime work proves it is necessary. |
| Preview state compilation | `PresenceStudioV3Shell.tsx` hydrates V2 config into a V3 document, restores private metadata, compiles through `compileStudioV3Document`, then passes `compiled.publicRoom` into `PresenceStudioV2PublicRoom`. | The V3 compiler is the safe bridge to consume catalog definitions. Public projection should not change in M2. |
| BBBVision-specific behaviour | `feature.ts` gates V3 local pilot to BBBVision. `compiler.ts` defaults slug `bbbvision` to `nocturnal-gallery`. `PresenceStudioV2PublicRoom.tsx` branches to `BbbVisionThresholdGalleryPublicRoom`; `BbbVisionCanvasGallery.tsx` implements canvas behaviour. CSS contains `.style-bbbvision-threshold-gallery` branches. | BBBVision is not a single style token today. It is a bundle of Look, Room Style, public preset, canvas behaviour, CSS, feature gate, tests, and evidence. |
| Room `1` control behaviour | Gate 2 uses room `1` as the simple/public-invariance control. `feature.ts` does not enable V3 by default for room `1`; `soft-editorial` maps to `gallery-p2` and `gallery-wall`. | Treat room `1` as a control style pair and invariance target, not as a V3 pilot route in M2. |
| Safe registry candidates | `p1Catalog.ts` and `model.ts` can become the canonical frontend catalog source; Studio controls and compiler can consume that catalog. | Safe if public renderer and backend category shape remain unchanged. |

### Renderer And Compiler Path

1. Stored Presence config or draft/published payload is adapted into V2 state by `studioV2FromPresenceConfig`.
2. V3 Studio hydrates that V2 state through `hydrateStudioV3Document`.
3. Private V3 metadata is restored through `restoreStudioV3Metadata`.
4. Owner edits update the V3 document and private metadata categories.
5. `compileStudioV3Document` calls `compileStudioV3ToStudioV2`, then `presenceConfigFromStudioV2State`, then `publicRoomFromStudioV2State`.
6. V3 preview renders by passing the compiled V2 public-room shape into `PresenceStudioV2PublicRoom`.
7. Public routes use published public payloads through `createPublicRenderPayload` and `studioV2PublicRoomFromPresenceNode`; they do not read V3 private overlay metadata.

Room and placement metadata is consumed in the V3 compiler. Room Style ids resolve to V2 layout ids. Placement zones, sizes, treatment validity, capacity, and mobile behaviour still come from V2 registered layouts.

Work/Piece treatments exist in two layers:

- V2 placement treatment: `quiet`, `framed`, `captioned`, `signal`;
- V3 experience Piece Treatment: `quiet-framed`, `luminous-depth`, `captioned-ledger`.

Collection and curation metadata is private in V3 placements through `collectionSourceRef`, then projected into V2 objects for preview when placements are public-safe.

Preview differs from public route rendering because V3 preview can pass an editor bridge or in-memory visual preview flags. The public route does not carry private V3 overlays and should stay unchanged in M2.

### Existing Style, Catalog, And Preset Sources

| Source | Current ids / behaviour | Notes |
|---|---|---|
| V3 Looks | `soft-editorial`, `nocturnal-gallery`, `zine-archive` | Current P1 catalog with V2 bridge values and experience facets. |
| V3 Room Styles | `gallery-wall`, `threshold-portal`, `film-strip-selected-works` | Stored in `p1Catalog.ts`; each maps to a V2 layout id. |
| V3 Piece Treatments | `quiet-framed`, `luminous-depth`, `captioned-ledger` | Experience-level tokens on `StudioV3LookValues`; not the same as V2 placement treatments. |
| V3 Atmospheres | `paper-light`, `nocturnal-depth`, `ledger-scan` | Used as experience data/classes in preview paths. |
| V3 Motion | `still`, `gentle`, `living` | Stored as `motionIntensity`; UI text notes reduced-motion but contract is not metadata-driven. |
| V2 public presets | `gallery-p2`, `christina-liquid-gallery`, `bbbvision-threshold-gallery` | Public renderer has special branches for Christina and BBBVision. |
| V2 layouts | `gallery-wall`, `portal-threshold`, `film-strip-selected-works` | Zone/size/treatment/mobile constraints live here. |
| CSS style classes | `.style-christina-liquid-gallery`, `.style-bbbvision-threshold-gallery`, `.experience-*`, V3 `.look-*` and `.room-style-*` classes | Style behaviour is partly encoded in CSS selectors, not data definitions. |
| Backend assumptions | V3 metadata validators mirror frontend token lists and layout compatibility. | Backend is a validation mirror, not the safest first registry owner. |
| Mock/e2e fixtures | Mock BBBVision room `29`, room `1` control, V2 public preset tests, V3 public invariance tests, V3 mobile/a11y tests | Current proof suite can test invariance but should be expanded when registry code is introduced. |

## Hard-Coded Vs Data-Driven Table

| Surface | Data-driven today | Hard-coded today | M2 posture |
|---|---|---|---|
| V3 Look values | `p1Catalog.ts` has Look definitions. | UI option labels, descriptions, dimensions, recommended room styles, visual swatches. | Move owner-facing metadata into shared catalog and generate controls from it. |
| V3 Room Styles | Room Style definitions map to V2 layout ids. | UI cards and CSS mini-preview classes are hard-coded separately. | Catalog should expose label, description, V2 layout bridge, zone contract summary, and compatibility status. |
| Piece Treatments | V3 token union and Look value field exist. | Option labels and V2 placement treatment relationship are implicit. | Catalog should distinguish global Piece Treatment from per-object V2 treatment. |
| Atmosphere | V3 token union and CSS experience classes exist. | CSS selectors own most behaviour. | Catalog should record token, CSS support status, reduced-motion requirement, and fallback. |
| Motion | `motionIntensity` is carried through V2/V3 skin values. | Behaviour is split across CSS and BBB canvas JS. | Catalog should define intensity, reduced-motion fallback, and performance budget. |
| Compatibility | `STUDIO_V3_LOOK_ROOM_STYLE_COMPATIBILITY` exists as all-supported rows. | No real tiering, no reasons, no style-pair suitability. | Add typed compatibility tiers in the catalog before exposing owner UX. |
| Public rendering | V2 public-room shape is data-driven. | Christina and BBBVision are explicit renderer branches. | Leave branches unchanged until public invariance proof passes. |
| Backend validation | Validators are explicit and strict. | Token lists are duplicated from frontend. | Keep backend unchanged in M2 unless new persisted tokens are added. |

## BBBVision Style Dependencies

BBBVision threshold/gallery currently depends on all of these pieces:

- V3 Look: `nocturnal-gallery`;
- V3 Room Style: `threshold-portal`;
- V2 public preset: `bbbvision-threshold-gallery`;
- V2 layout bridge: `portal-threshold`;
- public renderer branch: `BbbVisionThresholdGalleryPublicRoom`;
- canvas engine: `BbbVisionCanvasGallery`;
- CSS branch: `.style-bbbvision-threshold-gallery`;
- V3 pilot gate: slug `bbbvision` / room `29` in local/dev feature gating;
- compiler special case: slug or preset defaults to `nocturnal-gallery`;
- tests/evidence: Gate 2 private owner proofs, V3 public invariance tests, BBB canvas audit evidence.

This is the strongest flagship proof, but it must not become the registry shape by itself. The M2 catalog should capture BBBVision as a style pair definition with explicit component dependencies and renderer support status, not as a set of implicit branches.

## Room `1` Control Style Dependencies

Room `1` is the simple/control pair for Gate 3. Current dependencies:

- baseline Look: `soft-editorial`;
- baseline Room Style: `gallery-wall`;
- V2 public preset: `gallery-p2`;
- V2 layout: `gallery-wall`;
- generic public renderer path in `PresenceStudioV2PublicRoom`;
- public-invariance and isolation role from Gate 2 evidence.

Room `1` is not currently part of the V3 local BBBVision feature gate. That is useful. M2 should keep room `1` as the control and use it for public-route invariance checks rather than enabling new V3 behaviour there.

## Existing Prototype And Prior Presence Style Candidates

| Rank | Candidate | Evidence | Strengths | Gaps / risks | Recommendation |
|---|---|---|---|---|---|
| 1 | `christina-liquid-gallery` | V2 public preset, public renderer branch, CSS, focused V2 public style preset e2e evidence, mobile evidence. | Different from BBBVision, already renderer-backed, reusable, avoids generic dashboard feel, strong bridge from prior Presence proof. | Not yet modeled as V3 Look/Room/Piece/Atmosphere primitives; reduced-motion contract needs explicit audit. | Recommended third migrated style candidate. |
| 2 | `zine-archive` / `film-strip-selected-works` | V3 P1 Look, V3 Room Style, registered V2 layout, V3 mobile/accessibility and prototype tests. | Presence-like, different from BBBVision, good archive/sequence semantics, already in V3 scaffold. | Currently maps to `gallery-p2`; no dedicated public preset/branch; prior zine proof is scattered across legacy/reference docs. | Keep as M4/M5 scaffold candidate, not the third migrated proof style for Gate 3. |
| 3 | Legacy zine/DJ/healing worlds | Legacy Presence docs and world-kit references. | Strong creative potential and non-CMS feel. | Not current renderer proof; migration source is less direct; higher interpretation risk. | Defer until Gate 4 creative library buildout. |

## Recommended Third Migrated Style Candidate

Recommend `christina-liquid-gallery`.

Reasoning:

- it is already an existing Presence public style preset, not an invented style;
- it has a concrete public renderer branch and CSS implementation;
- it is visually and interaction-wise distinct from BBBVision;
- it tests the registry's ability to map prior Presence proof into V3 terms;
- it is safer than choosing a purely scaffolded style because the current app already knows how to render it.

Use `zine-archive` as the first alternate and as a useful pressure test for Room Style and Piece Treatment contracts.

## Registry Seam Recommendation

| Option | Assessment | Sequence decision |
|---|---|---|
| 1. V3 private metadata only | Safest persistence posture. Existing categories can hold selected Look, Room Style, facet values, restore state, and compatibility rows. | Keep as the storage boundary in M2. Do not add public sync. |
| 2. V3 compiler layer | Safe bridge because preview already compiles V3 state into V2 public-room shape. | Let compiler consume the shared catalog after the catalog exists. |
| 3. Shared style catalog consumed by V3 Studio and compiler | Smallest useful implementation seam. It removes UI/compiler duplication while staying private. | Start here in M2. |
| 4. Public renderer adapter | Too risky for M2 because public renderer branches are the current safety boundary. | Defer until later Gate 3 after invariance proof. |
| 5. Backend validation layer | Strict mirror of frontend tokens and metadata shape. Useful for safety, high blast radius for shape changes. | Update only when persisted tokens/categories change, and do that as a separate reviewed slice. |

Recommended sequence:

1. M2: create a typed shared frontend catalog for existing ids only. Include Look, Room Style, Piece Treatment, Atmosphere, Motion, V2 bridge values, mobile contract, reduced-motion contract, and renderer support status.
2. M2: have V3 Studio and compiler read from the catalog while preserving the exact private metadata shape and public output.
3. M3: remove duplicated Studio option literals where safe and prove BBBVision private preview still works.
4. M4: register the three style families: BBBVision threshold/gallery, Gallery P2 control, Christina Liquid Gallery.
5. Later Gate 3: introduce public renderer adapter only after public-route invariance is proven before and after the adapter.

## Private Overlay Style-Selection Recommendation

Use existing private V3 metadata:

- `layer_values` for selected facet/token values;
- `named_looks` for saved private style snapshots;
- `restore.activeLookId` and `restore.roomStyles` for durable UI restore;
- `compatibility` for source/style suitability rows;
- `savepoints` for owner-private recovery.

Do not add a new public field, publish path, public route change, or hosted proof in M1/M2. Do not create a new `style_selection` metadata category unless later backend validation work requires it.

## Public/Private Safety Finding

Style selection can remain private-only for the next slice.

Current public route rendering reads published Presence payload through the public projection path and V2 public-room adapter. V3 private metadata is stored and loaded through owner-private endpoints and is not consumed by `/p/[slug]`, `/presence/[slug]`, or public API output.

Gate 3 public invariance should test:

- `/api/presence/public/bbbvision` remains unpublished/non-public while BBBVision is private;
- `/p/bbbvision` and `/presence/bbbvision` do not expose V3 shell text, private preview copy, `layer_values`, `object_edits`, `collectionSourceRef`, or media overlay internals;
- room `1` output stays unchanged after private BBBVision style metadata edits;
- product UI write ledger records only private-state save/rebase calls for Gate 3 style work.

Risky areas to avoid before later gates:

- `PresenceStudioV2PublicRoom.tsx` branch behaviour;
- `lib/presence/render/publicPayload.ts`;
- `lib/presence/studio-v2/publicProjection.ts`;
- public page routes;
- backend validator shape changes;
- feature gate changes;
- publish/public sync/config changes.

## Mobile And Reduced-Motion Finding

Current mobile and reduced-motion support exists, but it is not yet a style metadata contract.

| Area | Current behaviour | Gap for registry |
|---|---|---|
| V3 Studio controls | V3 CSS has mobile layout rules around 720px and a reduced-motion block for Studio chrome. | Catalog needs control density and mobile-preview hints so generated controls do not overflow. |
| V2 generic renderer | V2 layouts define zone-level `mobileBehaviour`; CSS has responsive generic rules. | Registry should surface mobile behaviour summary and fallback per Room Style. |
| BBBVision canvas | Canvas checks reduced motion, uses mobile DPR caps, touch handling, and mobile thresholds. | Catalog should record that BBBVision has a JS motion engine and requires canvas-specific reduced-motion proof. |
| BBBVision CSS | BBB CSS has multiple mobile and reduced-motion sections. | Registry should require evidence links for flagship style motion behaviour. |
| Christina CSS | Christina has a public renderer branch and mobile CSS. | Needs explicit reduced-motion audit before being marked fully supported as a V3 migrated style. |
| `zine-archive` scaffold | V3 tests exercise zine/archive, living motion, film strip, and mobile preview. | Needs dedicated renderer proof before flagship support. |

Each style metadata contract should include:

- supported viewports and minimum mobile breakpoint evidence;
- reduced-motion fallback;
- motion engine type: CSS-only, canvas, or none;
- interaction model: scroll, click, touch, keyboard;
- performance budget;
- renderer support status;
- screenshot/evidence requirement before public use.

## Implementation Risks

- Backend validators duplicate frontend token assumptions; changing persisted metadata shape has cross-repo blast radius.
- BBBVision combines style, layout, canvas motion, and pilot feature gating, so it can distort a generalized registry if copied literally.
- Christina is renderer-backed but not yet decomposed into V3 primitives.
- `zine-archive` is V3-native but not proven as a public style preset.
- V2 placement treatments and V3 Piece Treatments have similar names but different meanings.
- Public renderer adapter work could accidentally expose private BBBVision material if done before invariance testing.
- CSS owns meaningful style behaviour that TypeScript catalogs cannot enforce unless evidence requirements are included.

## Recommended Gate 3 M2 Builder Slice

Build only the typed shared frontend style catalog and wire it into V3 Studio/compiler without public renderer changes.

M2 should:

- create typed definitions for existing Look, Room Style, Piece Treatment, Atmosphere, Motion, and compatibility ids;
- keep ids and private metadata shape unchanged;
- make V2 bridge values explicit in the catalog;
- include mobile and reduced-motion contract fields;
- have the compiler consume catalog lookups instead of scattered helper literals where safe;
- have Studio controls read labels/descriptions/options from the catalog where safe;
- add focused tests for registry completeness, V3 compiler output parity, BBBVision public invariance, and room `1` isolation.

M2 should not:

- implement a public renderer adapter;
- add a style selector UI beyond existing controls;
- add new Looks or visual redesigns;
- add backend categories;
- publish or sync styles publicly.

## Commands And Tests Run

No build, typecheck, or browser tests were run because M1 changed docs only.

Verification performed:

- required docs and Gate 2 evidence read;
- V3/V2 compiler, renderer, CSS, and backend validation inspected;
- evidence README created;
- tracker and ExecPlan updated.

## Rollback Notes

Rollback is docs-only:

- remove `docs/program/evidence/presence-gate3-m1-style-architecture-map-20260727/README.md`;
- revert the Gate 3 row and status-log addition in `.agent/PRESENCE_GATE_TRACKER.md`;
- revert M1 status/progress edits in `.agent/PRESENCE_GATE_3_EXECPLAN.md`;
- revert optional status cleanup in `.agent/PRESENCE_GATE_3_M1_STYLE_ARCHITECTURE_MAP_WORK_ORDER.md`, if present.

## Remaining Work

Gate 3 M2 should implement the shared catalog contract and prove that existing private previews and public routes remain unchanged.
