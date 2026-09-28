# Presence Gate 3 ExecPlan - V3.2 Design-System Architecture

Date: 2026-07-29
Status: Gate 3 M6 accepted on 2026-07-30; reviewability packet staged; Gate 4 not started
Target app: `C:\Dev\Flora_fauna\presence-app`
Backend boundary: `C:\Dev\Flora_fauna\flora-fauna\backend`
Evidence: `docs/program/evidence/presence-gate3-execplan-design-system-architecture-20260727/`, `docs/program/evidence/presence-gate3-m1-style-architecture-map-20260727/`, `docs/program/evidence/presence-gate3-m2-shared-style-catalog-20260727/`, `docs/program/evidence/presence-gate3-m3-owner-controls-from-registry-20260727/`, `docs/program/evidence/presence-gate3-m4-christina-candidate-style-audit-20260727/`, `docs/program/evidence/presence-gate3-m4b-bbbvision-flagship-primitive-audit-20260729/`, `docs/program/evidence/presence-gate3-m5-style-compatibility-guardrails-20260727/`

## Gate

Gate 3 covers V3.2 design-system architecture only.

Gate 2 has proven local/dev BBBVision owner capability with private overlays, persistence/rebase, collection curation, and public-route invariance. Gate 3 must turn the current style experiments into explicit, testable design-system contracts before any broader creative-library buildout.

## Objective

Create the architecture for Presence V3 design-system primitives:

- Looks
- Room Styles
- Piece Treatments
- Atmosphere Modules
- Motion Behaviours
- compatibility tiers between the above
- owner-facing controls generated from those definitions where practical
- private metadata boundaries for style selection before any public publishing path exists

The first implementation after this ExecPlan should be a narrow architecture map / registry contract slice, not a visual rebuild.

## Why Now

Gate 2 proved that owner-private V3 metadata can safely shape BBBVision locally without mutating canonical Works, Collections, drafts, or public routes.

The current style layer is useful but split across V3 P1 catalogs, V2 public style presets, V2 layouts, special renderer branches, CSS, and backend private-state validation. If Gate 4 starts adding 10 Looks and 10 Room Styles on top of that split model, the blast radius becomes hard to reason about and public renderer regressions become likely.

Gate 3 should produce a design-system registry seam first.

## Current State

### Confirmed Targets

Frontend:

- `components/presence-studio-v3/PresenceStudioV3Shell.tsx`
- `components/presence-studio-v3/StudioV3LookControls.tsx`
- `lib/presence/studio-v3/model.ts`
- `lib/presence/studio-v3/p1Catalog.ts`
- `lib/presence/studio-v3/compiler.ts`
- `lib/presence/studio-v3/p1State.ts`
- `lib/presence/studio-v3/editing.ts`
- `lib/presence/studio-v3/feature.ts`
- `lib/api/studioV3.ts`
- `lib/presence/studio-v2/model.ts`
- `lib/presence/studio-v2/layouts.ts`
- `lib/presence/studio-v2/adapters.ts`
- `components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx`
- `components/presence-studio-v2/BbbVisionCanvasGallery.tsx`
- `components/presence-studio-v2/worlds.ts`
- `components/presence-studio-v2/presence-studio-v2-public.css`
- `app/(public)/p/[slug]/page.tsx`
- `lib/presence/render/publicPayload.ts`
- `components/portfolio/PortfolioRenderer.tsx`

Backend:

- `C:\Dev\Flora_fauna\flora-fauna\backend\app\services\presence_studio_v3_state.py`
- related backend tests for V3 private-state metadata validation

### Existing Style Model

V3 currently has a partial design-system seam:

- `StudioV3LookId`: `soft-editorial`, `nocturnal-gallery`, `zine-archive`
- `StudioV3RoomStyleId`: `threshold-portal`, `gallery-wall`, `film-strip-selected-works`
- `StudioV3Atmosphere`: `paper-light`, `nocturnal-depth`, `ledger-scan`
- `StudioV3PieceTreatment`: `quiet-framed`, `luminous-depth`, `captioned-ledger`
- `StudioV3Journey`: `editorial-browse`, `threshold-reveal`, `archive-index`
- V3 layers: `presence-look`, `room-style`, `collection-presentation`, `piece-treatment`, `motion-atmosphere`, `navigation-journey`

The P1 catalog maps Looks and Room Styles to V2 public concepts:

- `soft-editorial` maps to public preset `gallery-p2`, room style `gallery-wall`, atmosphere `paper-light`, piece treatment `quiet-framed`, journey `editorial-browse`.
- `nocturnal-gallery` maps to public preset `bbbvision-threshold-gallery`, room style `threshold-portal`, atmosphere `nocturnal-depth`, piece treatment `luminous-depth`, journey `threshold-reveal`.
- `zine-archive` maps to public preset `gallery-p2`, room style `film-strip-selected-works`, atmosphere `ledger-scan`, piece treatment `captioned-ledger`, journey `archive-index`.

V2 currently has public style presets:

- `gallery-p2`
- `christina-liquid-gallery`
- `bbbvision-threshold-gallery`

V2 currently has registered layouts:

- `gallery-wall`
- `portal-threshold`
- `film-strip-selected-works`

### Existing Public Renderer Boundaries

The public route uses:

- `createPublicRenderPayload(node)`
- `studioV2PublicRoomFromPresenceNode(node)`
- `PortfolioRenderer`
- `PresenceStudioV2PublicRoom`

Public style rendering is still mostly V2-based. `PresenceStudioV2PublicRoom` has special branches for:

- Christina-style gallery when `worldId === "gallery"` and `publicStylePreset === "christina-liquid-gallery"`
- BBBVision threshold/gallery when `worldId === "gallery"` and `publicStylePreset === "bbbvision-threshold-gallery"`
- generic V2 room for other combinations

This is a reasonable compatibility bridge, but not yet a complete V3 design-system registry.

### Existing Private Metadata Boundary

Gate 2 private state saves only through:

- `GET /api/presence/owner/rooms/:roomId/editor/v3/state`
- `PUT /api/presence/owner/rooms/:roomId/editor/v3/state`
- `PUT /api/presence/owner/rooms/:roomId/editor/v3/state/rebase`
- `DELETE /api/presence/owner/rooms/:roomId/editor/v3/state`

Backend categories include:

- `owner_mode`
- `named_looks`
- `layer_locks`
- `layer_values`
- `object_edits`
- `savepoints`
- `placements`
- `restore`
- `compatibility`

The backend validates token values, source refs, zones, room ids, composition layouts, and safe metadata. It does not publish private state.

Gate 3 should initially keep style selection inside existing private metadata categories, especially `layer_values`, `named_looks`, `restore.roomStyles`, and `compatibility`. Adding a new backend metadata category should be treated as a separate implementation decision, not assumed.

## Non-Goals

- Do not publish BBBVision.
- Do not make `/p/bbbvision`, `/presence/bbbvision`, or `/api/presence/public/bbbvision` public.
- Do not add a public sync or publish button.
- Do not change auth, tenant isolation, payments, tax/deductibility logic, donor/member data, or production data.
- Do not redesign BBBVision, Christina, or legacy Presence proof from scratch.
- Do not build the 10/10 creative library in Gate 3. Gate 4 owns library expansion.
- Do not add unsafe persistence or broad schema changes before the registry contract is proven.

## Confirmed Human Decisions

1. BBBVision threshold/gallery is the first flagship migrated style pair.
2. Room `1` / contract room base is the simple/control style pair.
3. The third style must be selected from the strongest existing prototype/prior Presence style discovered during M1 mapping. M1 recommends `christina-liquid-gallery`; `zine-archive` remains the first alternate scaffold candidate.
4. Gate 3 style selection should initially live only in private V3 overlay metadata.
5. Style changes must remain local/private until later publish readiness gates. No public sync, public route change, or hosted launch proof belongs in Gate 3 M1.

## Recommended Candidate Styles

### Candidate 1 - BBBVision Threshold/Gallery

Recommended source:

- current `nocturnal-gallery` Look
- current `threshold-portal` Room Style
- V2 public preset `bbbvision-threshold-gallery`
- `BbbVisionThresholdGalleryPublicRoom`
- `BbbVisionCanvasGallery`

Why:

- highest proof value
- already data-driven from Works
- has local/private Gate 2 evidence
- represents the flagship Presence feel
- exercises motion, threshold entry, gallery transition, reduced-motion behaviour, and mobile concerns

Architecture use:

- split the current one-off public preset/branch into registered Look, Room Style, Piece Treatment, Atmosphere, and Motion definitions
- preserve the current visual proof before exposing it as a reusable style

### Candidate 2 - Simple Control / Gallery P2

Recommended source:

- room `1` / contract-room base control
- current `soft-editorial` Look
- current `gallery-wall` Room Style
- V2 public preset `gallery-p2`

Why:

- gives a stable low-motion control
- protects public invariance checks
- forces the registry to represent boring cases, not only flagship cases
- useful for local comparisons and fallback behaviour

Architecture use:

- define a supported baseline Look and Room Style
- prove style selection can be represented without special renderer branches

### Candidate 3 - Christina Liquid Gallery

Recommended source:

- V2 public preset `christina-liquid-gallery`
- existing public renderer branch and previous S6A style-preset evidence

Why:

- already exists as a public style preset
- gives a third visual family with stronger proof than `zine-archive`
- avoids treating BBBVision as the only expressive path
- exercises the bridge from existing Presence work into V3 registry definitions

Architecture use:

- create a registry definition that maps existing Christina public-preset behaviour into V3 terms
- identify gaps where V3 Piece Treatment, Atmosphere, or Motion primitives do not yet model the current renderer behaviour

Alternate:

- `zine-archive` can remain a V3 scaffold candidate, but should not be treated as the third proof style until it has comparable renderer and evidence support.

## Proposed Architecture

### Registry Layers

Gate 3 should introduce or formalise typed registries for:

- Look definitions
- Room Style definitions
- Piece Treatment definitions
- Atmosphere definitions
- Motion Behaviour definitions
- compatibility definitions
- generated owner controls

The registry may initially live in frontend code and mirror existing backend validators. Backend schema changes should only follow once the metadata category contract is proven.

### Minimum Look Definition Fields

Each Look should declare:

- stable `id`
- display `label`
- internal `description`
- source proof references
- supported owner/use-case fit
- public style preset bridge, if any
- default Room Style
- compatible Room Styles with compatibility tier
- default Piece Treatment
- compatible Piece Treatments with compatibility tier
- default Atmosphere
- compatible Atmospheres with compatibility tier
- default Motion Behaviour
- compatible Motion Behaviours with compatibility tier
- palette tokens
- typography tokens
- material/texture language
- density defaults
- lockable layers
- owner-visible controls
- mobile contract
- reduced-motion contract
- public projection contract
- known limits

### Minimum Room Style Definition Fields

Each Room Style should declare:

- stable `id`
- display `label`
- internal `description`
- V2 composition layout bridge, if any
- required zones
- optional zones
- allowed object source types per zone
- allowed object treatments per zone
- capacity rules
- collection presentation defaults
- navigation/journey fit
- compatible Looks with compatibility tier
- mobile behaviour
- reduced-motion behaviour
- public projection contract
- known limits

### Minimum Piece Treatment Definition Fields

Each Piece Treatment should declare:

- stable `id`
- display `label`
- allowed source types
- allowed zones or zone kinds
- visual rules
- caption/copy rules
- media constraints
- fallback treatment
- compatible Looks and Room Styles with tier
- mobile handling
- reduced-motion handling
- public projection contract

### Minimum Atmosphere Definition Fields

Each Atmosphere should declare:

- stable `id`
- display `label`
- environmental tokens
- texture/material rules
- contrast/accessibility notes
- compatible Looks and Room Styles with tier
- motion dependency, if any
- reduced-motion fallback
- public projection contract

### Minimum Motion Behaviour Definition Fields

Each Motion Behaviour should declare:

- stable `id`
- display `label`
- motion intensity
- event triggers
- transition durations
- animation surfaces
- reduced-motion fallback
- mobile/touch handling
- performance limits
- compatible Looks, Room Styles, Piece Treatments, and Atmospheres with tier
- public projection contract

### Compatibility Tiers

Use explicit tiers rather than a flat compatibility matrix:

- `flagship`: preferred combination for high-quality proof
- `supported`: allowed and expected to render well
- `experimental`: visible only in internal/dev surfaces unless explicitly enabled
- `blocked`: not selectable; must explain why and provide a fallback when possible

Compatibility definitions should include:

- source id
- target kind
- target id
- tier
- reason
- fallback id, if applicable
- evidence status

### Owner Control Generation

Owner controls should be generated from registry metadata where practical. Controls should declare:

- control id
- label
- target layer
- target field
- input type
- allowed values
- default
- visibility rule
- lock rule
- compatibility impact
- preview-only or persisted-private status

Do not duplicate Look and Room Style option literals in the UI once a registry exists.

### Persistence Contract

Gate 3 should keep initial style selection private. Recommended initial path:

- selected Look: private `layer_values` and/or `named_looks`
- selected Room Style: private `layer_values`, `restore.roomStyles`, and active document room style
- compatibility: private `compatibility` rows
- saved snapshots: private `savepoints`

Do not write selected styles to public payloads in Gate 3.

If implementation later requires a new top-level category such as `style_selection`, stop and create a backend-aware work order because the Python validator mirrors the frontend token model.

### Public Projection Contract

No public projection should change in Gate 3 unless a work order explicitly says so and requires before/after evidence.

When public projection is eventually enabled, each registry entry must define:

- V2 bridge values, if any
- public renderer support status
- fallback renderer
- visitor-visible data attributes or props
- privacy restrictions
- snapshot evidence requirement

## Milestones

### M1 - Style Architecture Map

Deliver a docs/evidence map of every current style source, token, renderer branch, backend validator token, and public/private boundary.

Status: Complete. Evidence: `docs/program/evidence/presence-gate3-m1-style-architecture-map-20260727/`.

Output:

- evidence README
- no runtime changes unless a harmless type export is needed
- recommended registry shape confirmed or revised

### M2 - Typed Registry Contract

Introduce typed registry definitions for Looks, Room Styles, Piece Treatments, Atmosphere, Motion, and Compatibility.

Status: Complete. Evidence: `docs/program/evidence/presence-gate3-m2-shared-style-catalog-20260727/`.

Rules:

- preserve current ids where possible
- keep V2 bridges explicit
- keep public projection unchanged
- add focused tests for registry completeness and compatibility tier coverage

### M3 - Owner Controls From Registry

Status: Complete. Evidence: `docs/program/evidence/presence-gate3-m3-owner-controls-from-registry-20260727/`.

Wire the V3 Look/Room Style controls to registry metadata.

Rules:

- catalog-backed tier, fallback, warning, safe controls, locked elements, wow, mobile, reduced-motion, and performance copy is visible in existing owner controls
- private-state persistence unchanged
- focused BBBVision private preview/public-invariance proof passed
- room `1` control pair remains `soft-editorial` + `gallery-wall`

### M4 - Candidate Style Definitions

Register the three candidate style families:

- BBBVision threshold/gallery
- simple Gallery P2 control
- Christina Liquid Gallery

Status: Complete. Evidence: `docs/program/evidence/presence-gate3-m4-christina-candidate-style-audit-20260727/`.

Rules:

- no redesign
- capture current visual intent as definitions
- compatibility tiers must be explicit

M4 result:

- `gallery-p2` is `supported` with `v3-proof`;
- `bbbvision-threshold-gallery` is `flagship` with `v3-proof`;
- `christina-liquid-gallery` is `metadata-only` with `public-proof`;
- Christina has no represented V3 Look ID or Room Style ID;
- Christina's nearest implied pair is experimental `soft-editorial` + `film-strip-selected-works`, with fallback to `gallery-wall`;
- no public renderer, public projection, public routes, backend validators, publish/public sync, hosted/prod data, auth, tenant, payment, or deployment config changed.

### M4B - BBBVision Flagship Primitive Audit

Audit BBBVision as the first flagship style bundle before Gate 3 acceptance.

Status: Complete after M5 at human request. Evidence: `docs/program/evidence/presence-gate3-m4b-bbbvision-flagship-primitive-audit-20260729/`.

Rules:

- do not treat BBBVision as cleared merely because Gate 2 proof or catalog entries exist;
- audit Look, Room Style, Piece Treatment, Atmosphere, Motion, compatibility, mobile, reduced-motion, performance, owner controls, public/private safety, and future library readiness;
- do not change public renderer behaviour;
- do not publish or public-sync style selections;
- do not start Gate 4.

M4B result:

- BBBVision is a real Gate 3 flagship architecture candidate represented by `nocturnal-gallery` + `threshold-portal`;
- `bbbvision-threshold-gallery` remains `supportStatus: "flagship"` with `v3-proof`;
- `luminous-depth`, `nocturnal-depth`, and `threshold-reveal` are sufficient Gate 3 primitive contracts for the current flagship candidate;
- BBBVision motion is cataloged through `gentle`/`living` behaviour contracts, but the actual threshold/gallery state machine and canvas response remain specialized-V2-branch/canvas/CSS-backed;
- public renderer adapter work remains later and must not be inferred from M4B;
- M4B made docs-only changes and no runtime/public/backend code changed.

### M5 - Compatibility Guardrails

Harden compatibility behavior beyond the M3 readout.

Status: Complete. Evidence: `docs/program/evidence/presence-gate3-m5-style-compatibility-guardrails-20260727/`.

Rules:

- blocked combinations are not selectable
- experimental combinations remain internal/dev only
- supported/flagship status stays visible but not marketing copy
- no public renderer dependency until public invariance is proven for the adapter

M5 result:

- metadata-only candidates, including `christina-liquid-gallery`, cannot become selectable V3 style state;
- experimental Looks, Room Styles, and pairings require explicit internal-review opt-in;
- blocked pairings are guarded and tested without adding production blocked options;
- supported and flagship paths remain selectable;
- owner controls remain catalog-driven and preserve M3 compatibility copy;
- private metadata shape stayed stable while unsafe style values are rejected or downgraded;
- public renderer, public projection, public routes, backend validators, publish/public sync, hosted/prod data, auth, tenant, payment, and deployment config were not edited;
- focused public-invariance proof passed.

### M6 - Gate 3 Acceptance Review

Run focused code checks, browser proof, public invariance checks, mobile/reduced-motion checks, and update evidence.

Acceptance requires:

- no public BBBVision route exposure
- no publish path
- no production-data writes
- registry coverage for all candidate styles
- screenshots or recorded evidence for any visual change
- rollback notes for all runtime changes

## Files Likely Involved

Frontend registry/model:

- `lib/presence/studio-v3/model.ts`
- `lib/presence/studio-v3/p1Catalog.ts`
- possible new `lib/presence/studio-v3/designSystem.ts`
- possible new `lib/presence/studio-v3/designSystem.test.ts`

V3 editor:

- `components/presence-studio-v3/StudioV3LookControls.tsx`
- `components/presence-studio-v3/PresenceStudioV3Shell.tsx`
- `components/presence-studio-v3/presence-studio-v3.css`

Compiler/private state:

- `lib/presence/studio-v3/compiler.ts`
- `lib/presence/studio-v3/p1State.ts`
- `lib/presence/studio-v3/editing.ts`
- `lib/api/studioV3.ts`

V2 bridge:

- `lib/presence/studio-v2/model.ts`
- `lib/presence/studio-v2/layouts.ts`
- `lib/presence/studio-v2/adapters.ts`
- `components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx`
- `components/presence-studio-v2/worlds.ts`

Backend validation, only if metadata shape changes:

- `C:\Dev\Flora_fauna\flora-fauna\backend\app\services\presence_studio_v3_state.py`
- corresponding backend tests

Evidence:

- `docs/program/evidence/presence-gate3-*`
- `.agent/PRESENCE_GATE_TRACKER.md`

## Tests And Validation

For this ExecPlan:

- docs-only inspection
- no runtime tests required

For implementation slices:

- `cmd /c npm run typecheck`
- `cmd /c npm run build`
- focused TypeScript tests for registry and compiler invariance
- focused Playwright proof for BBBVision private preview
- focused public invariance checks for `/api/presence/public/bbbvision`, `/p/bbbvision`, and `/presence/bbbvision`
- mobile viewport proof at 390px when UI changes
- reduced-motion proof when motion behaviour changes
- backend pytest only if backend private-state validation changes

## Rollback

Docs-only rollback:

- remove this ExecPlan
- remove Gate 3 evidence README
- restore the Gate 3 tracker row/status log entry

Runtime rollback for later implementation:

- revert the single milestone diff
- preserve Gate 2 accepted state and evidence
- do not clear or mutate canonical owner content unless a specific recovery work order permits it

## Risks

- Current style logic is split between V3 P1 catalog, V2 public presets, CSS, special public renderer branches, and backend metadata validation.
- BBBVision is powerful but can distort the registry if treated as the only style model.
- `christina-liquid-gallery` exists as a public renderer branch but does not yet have equivalent V3 registry primitives.
- `zine-archive` exists in V3 P1 catalog but appears less proven as public style evidence.
- Backend validation mirrors frontend tokens, so any metadata shape change has cross-repo blast radius.
- Public projection changes can accidentally expose local/private BBBVision work.

## Progress Log

```text
2026-07-28 - Gate 3 ExecPlan drafted after inspecting local Presence V3/V2 style architecture, Gate 2 accepted evidence, public-route boundaries, and backend V3 private-state validation. First Builder work order created for M1 architecture mapping. No runtime code changed.
2026-07-28 - Gate 3 M1 style architecture map completed. M1 confirmed the safe first implementation seam is a shared V3 Studio/compiler style catalog plus existing private overlay metadata, with no public renderer dependency in M2. M1 recommends `christina-liquid-gallery` as the third migrated style candidate from existing Presence proof, with `zine-archive` retained as the first alternate scaffold candidate. No runtime code changed.
2026-07-28 - Gate 3 M2 shared style catalog completed. Existing Look, Room Style, Piece Treatment, Atmosphere, Motion, compatibility, and public preset candidate IDs are now represented in `lib/presence/studio-v3/styleCatalog.ts`; V3 Studio/compiler/private metadata parsing consume catalog helpers where safe; public renderer/projection stayed unchanged. Typecheck, build, focused unit tests, public payload tests, and focused Chromium public-invariance proof passed, with one Playwright retry recorded.
2026-07-28 - Gate 3 M3 owner controls from registry completed. Existing V3 Look controls now display catalog-backed selected Look/Room Style metadata, compatibility tier copy, fallback/warning copy, safe controls, locked elements, intended wow, mobile/reduced-motion/performance notes, and explicit owner-private/public-unchanged boundary copy. No new styles, metadata category, backend validator change, public renderer dependency, publish, or public sync was added. Typecheck, build, focused unit/API tests, public payload/V2 adapter tests, focused owner-control Chromium proof, and focused public-invariance Chromium proof passed.
2026-07-29 - Gate 3 M4 Christina candidate audit completed. Christina is confirmed as the third existing Presence candidate but classified as metadata-only/public-proof, not supported, until liquid atmosphere, piece treatment, motion, reduced-motion, performance, and private preview adapter contracts exist. Catalog metadata now records candidate readiness and missing contracts; focused tests assert Christina has no represented V3 Look or Room Style. Public renderer/projection/routes/backend validators were not edited.
2026-07-29 - Gate 3 M5 compatibility guardrails completed. Catalog helpers now enforce candidate and pairing status for flagship, supported, experimental, blocked, and metadata-only entries. Christina remains metadata-only/non-selectable, experimental requires explicit internal-review opt-in, blocked behavior is guarded and tested, supported/flagship paths still work, and public renderer/projection/routes/backend validators were not edited.
2026-07-29 - Gate 3 M4B BBBVision flagship primitive audit completed after M5 at human request before Gate 3 acceptance. BBBVision clears Gate 3 as the flagship architecture candidate, but only with the explicit specialized-V2 bridge caveat: `nocturnal-gallery` + `threshold-portal` is system-native catalog metadata, while the public threshold/gallery wow remains in the V2 renderer branch, `BbbVisionCanvasGallery`, and BBBVision CSS until later adapter proof.
2026-07-30 - Gate 3 M6 acceptance reviewability packet completed. Previously untracked Gate 3 catalog, work orders, tracker, ExecPlan, and evidence folders were staged for review; unrelated dirty Gate 1/Gate 2/auth/backend files remain unstaged and out of scope. Required typecheck, build, focused Node tests, public-invariance Chromium proof, and mobile visual-controls Chromium proof all passed. Public renderer adapter, public routes/projection, publish/public sync, hosted/prod data, auth, tenant, payment, and deployment config remain unchanged. Gate 4 has not started.
```

## Final Review Checklist

- [x] Human confirms the five Gate 3 decisions.
- [x] M1 style architecture map completed.
- [x] Registry contract reviewed before runtime wiring.
- [x] M2 typed shared catalog completed.
- [x] M3 owner controls consume registry metadata.
- [x] M4 Christina candidate audit completed.
- [x] M4B BBBVision flagship primitive audit completed.
- [x] M5 compatibility guardrails completed.
- [x] BBBVision remains private/local until explicit publish-readiness gate.
- [x] Room `1` remains the simple control.
- [x] Public routes remain unchanged.
- [x] Mobile and reduced-motion requirements are attached to every runtime visual change.
- [x] Evidence folder updated for M1, M2, M3, M4, M4B, M5, and M6 reviewability.
