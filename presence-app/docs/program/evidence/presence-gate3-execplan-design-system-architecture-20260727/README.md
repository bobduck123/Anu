# Gate 3 ExecPlan Evidence - V3.2 Design-System Architecture

Date: 2026-07-28
Target app: `C:\Dev\Flora_fauna\presence-app`
Status: ExecPlan drafted; no runtime implementation

## Summary

Gate 3 has been planned as a V3.2 design-system architecture gate. The work should formalise typed registries for Looks, Room Styles, Piece Treatments, Atmosphere Modules, Motion Behaviours, compatibility tiers, and owner controls before Gate 4 expands the style library.

This evidence packet supports:

- `.agent/PRESENCE_GATE_3_EXECPLAN.md`
- `.agent/PRESENCE_GATE_3_M1_STYLE_ARCHITECTURE_MAP_WORK_ORDER.md`
- `.agent/PRESENCE_GATE_TRACKER.md`

No runtime files were changed for this planning slice.

## Files Inspected

Required operating docs:

- `C:\Dev\AGENTS.md`
- `.agent/PRESENCE_CANON.md`
- `.agent/PRESENCE_V34_GATED_PLAN.md`
- `.agent/PRESENCE_GATE_TRACKER.md`
- `.agent/LAUNCH_QUALITY_BAR.md`
- `.agent/SUBAGENT_ROUTING.md`
- `.agent/TASK_SIZING.md`
- `.agent/NO_MERGE_REVIEW.md`
- `.agent/PLANS.md`
- `.agent/DESIGN_SYSTEM_PIPELINE.md`
- `.agent/PROOF_LIBRARY.md`
- `.agent/REVENUE_PIPELINE.md`
- `.agent/SECURITY_AND_PRIVACY.md`
- `.agent/DAILY_OPERATOR.md`

Gate context:

- `.agent/PRESENCE_GATE_2_EXECPLAN.md`
- `docs/program/evidence/presence-gate2-acceptance-review-20260727/README.md`
- `docs/program/evidence/presence-gate2-auth-mock-hardening-20260727/README.md`
- prior V2/V3 BBBVision and public-style evidence reports

Frontend style/runtime files:

- `components/presence-studio-v3/PresenceStudioV3Shell.tsx`
- `components/presence-studio-v3/StudioV3LookControls.tsx`
- `components/presence-studio-v3/presence-studio-v3.css`
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
- `lib/presence/studio-v2/publicProjection.ts`
- `components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx`
- `components/presence-studio-v2/BbbVisionCanvasGallery.tsx`
- `components/presence-studio-v2/worlds.ts`
- `components/presence-studio-v2/presence-studio-v2-public.css`
- `app/(public)/p/[slug]/page.tsx`
- `app/(public)/presence/[slug]/page.tsx`
- `lib/presence/render/publicPayload.ts`
- `components/portfolio/PortfolioRenderer.tsx`

Backend boundary inspected:

- `C:\Dev\Flora_fauna\flora-fauna\backend\app\services\presence_studio_v3_state.py`

## Current Architecture Map

### V3 Model Tokens

`lib/presence/studio-v3/model.ts` defines the current V3 token unions:

- Looks: `soft-editorial`, `nocturnal-gallery`, `zine-archive`
- Room Styles: `threshold-portal`, `gallery-wall`, `film-strip-selected-works`
- Atmosphere: `paper-light`, `nocturnal-depth`, `ledger-scan`
- Piece Treatments: `quiet-framed`, `luminous-depth`, `captioned-ledger`
- Journeys: `editorial-browse`, `threshold-reveal`, `archive-index`
- Layers: `presence-look`, `room-style`, `collection-presentation`, `piece-treatment`, `motion-atmosphere`, `navigation-journey`

This is a partial registry seam, but it does not yet carry full design-system metadata, compatibility tiers, mobile contracts, reduced-motion contracts, or public projection rules.

### V3 P1 Catalog

`lib/presence/studio-v3/p1Catalog.ts` currently maps the three Looks and three Room Styles to V2 bridge values.

Current Look mappings:

- `soft-editorial`: `gallery-p2`, `gallery`, `gallery-wall`, `paper-light`, `quiet-framed`, `editorial-browse`
- `nocturnal-gallery`: `bbbvision-threshold-gallery`, `gallery`, `threshold-portal`, `nocturnal-depth`, `luminous-depth`, `threshold-reveal`
- `zine-archive`: `gallery-p2`, `archive`, `film-strip-selected-works`, `ledger-scan`, `captioned-ledger`, `archive-index`

Current Room Style mappings:

- `threshold-portal`: V2 layout `portal-threshold`
- `gallery-wall`: V2 layout `gallery-wall`
- `film-strip-selected-works`: V2 layout `film-strip-selected-works`

The compatibility matrix is currently broad and flat. Gate 3 should replace or augment it with explicit tiers.

### V3 Editor Controls

`StudioV3LookControls.tsx` has hard-coded Look and Room Style option literals. It also has hard-coded facet groups for background/atmosphere, image treatment, typography/CTA style, and motion intensity.

Gate 3 should move these option definitions toward generated controls from registry metadata.

### V3 Compiler Bridge

`lib/presence/studio-v3/compiler.ts` hydrates V3 documents from V2 state and compiles V3 documents back into a constrained V2-shaped config for private preview.

Important behaviour:

- BBBVision pilot slug/preset hydrates into `nocturnal-gallery` for private V3 editing.
- Room Style maps to V2 composition layout.
- Look maps to `publicStylePreset`, `worldId`, `skin`, and V3-authored `experience*` fields.
- Illegal public/canonical diffs are blocked by the V3 owned-config diff rules.

This is the current public-projection bridge and must remain stable during Gate 3.

### V3 Private State

`lib/presence/studio-v3/p1State.ts` and backend validation support private metadata categories:

- `owner_mode`
- `named_looks`
- `layer_locks`
- `layer_values`
- `object_edits`
- `savepoints`
- `placements`
- `restore`
- `compatibility`

This is enough to store initial style selection privately without adding a new backend category.

### V2 Public Renderer

`PresenceStudioV2PublicRoom.tsx` is still the visitor renderer for Studio V2/V3 bridge output.

Special style branches:

- `christina-liquid-gallery`
- `bbbvision-threshold-gallery`

Generic V2 rendering covers the rest.

`BbbVisionCanvasGallery.tsx` is data-driven from Works and contains the BBBVision canvas/gallery interaction. It is a strong source for the first flagship style definition.

### Backend Validation

`presence_studio_v3_state.py` mirrors V3 metadata token validation and protects private-state storage:

- exact allowed metadata categories
- exact allowed layer ids and style ids
- source-ref validation
- zone and layout validation
- base identity/fingerprint/revision locking
- no unsafe URLs, scripts, secrets, or copied content payloads

Any new metadata category or token shape has backend blast radius and needs its own implementation slice.

## Candidate Styles

### Recommended Candidate 1

BBBVision threshold/gallery:

- Look source: `nocturnal-gallery`
- Room Style source: `threshold-portal`
- V2 public preset bridge: `bbbvision-threshold-gallery`
- Renderer source: BBBVision public branch and `BbbVisionCanvasGallery`
- Role: flagship

### Recommended Candidate 2

Simple Gallery P2 control:

- Look source: `soft-editorial`
- Room Style source: `gallery-wall`
- V2 public preset bridge: `gallery-p2`
- Control target: room `1` / contract-room base
- Role: stable baseline and public-invariance control

### Recommended Candidate 3

Christina Liquid Gallery:

- V2 public preset bridge: `christina-liquid-gallery`
- Renderer source: Christina public branch
- Evidence source: existing public style-preset work
- Role: third proven style family

Alternate:

- `zine-archive` remains a useful V3 scaffold candidate, but is less proven as a public style source than Christina.

## Registry Contract Recommendation

Gate 3 M2 should introduce typed frontend registries for:

- `PresenceLookDefinition`
- `PresenceRoomStyleDefinition`
- `PresencePieceTreatmentDefinition`
- `PresenceAtmosphereDefinition`
- `PresenceMotionBehaviourDefinition`
- `PresenceCompatibilityRule`
- `PresenceOwnerControlDefinition`

Each registry entry should include:

- stable id
- display label
- internal description
- source/evidence references
- V2 bridge values, if any
- compatibility rules
- owner controls
- public projection contract
- mobile contract
- reduced-motion contract
- known limits

Compatibility tiers should be:

- `flagship`
- `supported`
- `experimental`
- `blocked`

## Public And Private Safety

Gate 3 should keep style selection private:

- store current selections through existing private metadata categories
- do not publish or sync to public routes
- do not make BBBVision public
- do not add public launch copy
- do not expose private BBBVision proof material

Public projection should remain unchanged until a later explicit gate.

## Risks

- Style behaviour is currently split across V3 catalogs, V3 UI literals, V3 compiler mapping, V2 layouts, V2 style presets, V2 CSS, and backend validation.
- BBBVision is both the flagship style and a special renderer branch. The registry should model it without forcing all styles into BBBVision assumptions.
- Christina exists as a V2 public preset but does not yet have V3 primitive definitions.
- Backend validation is strict, so new metadata shape requires coordinated backend work.
- Any public renderer change needs screenshots and invariance proof.

## Next Builder Slice

Run:

- `.agent/PRESENCE_GATE_3_M1_STYLE_ARCHITECTURE_MAP_WORK_ORDER.md`

Only after the human confirms the five Gate 3 decisions listed in the ExecPlan.
