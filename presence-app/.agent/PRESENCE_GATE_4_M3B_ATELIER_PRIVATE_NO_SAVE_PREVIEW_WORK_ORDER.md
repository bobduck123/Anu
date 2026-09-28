# Presence Gate 4 M3B Work Order - Atelier Private No-Save Preview Adapter

Date: 2026-07-31
Status: Planned - docs/work-order only
Target app: `C:\Dev\Flora_fauna\presence-app`
Reference source: `C:\Dev\presence-reference\03-atelier`
Evidence plan: `docs/program/evidence/presence-gate4-m3b-private-no-save-preview-plan-20260731/`

## Objective

Implement the smallest safe private preview slice that visually proves the Atelier pairing `brass-inlay` x `refractive-threshold` inside the owner/private Studio V3 surface without enabling save/reload persistence for new Atelier IDs and without changing public output.

M3B is not Gate 4 acceptance. It is not public renderer support, backend validator support, public projection support, or 10/10 library completion.

## Current State

M3A added broad frontend/private catalog metadata for:

- Look: `brass-inlay`
- Room Style: `refractive-threshold`
- Piece Treatments: `onion-inspection`, `scribe-reveal`, `measured-plate`
- Atmospheres: `drawing-sheet`, `material-sampler`

M3A deliberately kept active hydrated P1 state limited to the accepted Gate 3 set and blocked the Atelier pairing from owner selection. Backend private-state validators still reject new Atelier IDs until separately extended. Public renderer, public routes, public projection, publish, and deployment are unchanged.

## Decision

M3B should build a separate transient owner-private preview, not a selectable Look/Room Style path.

The preview should live in `components/presence-studio-v3` and be launched from the Look controls as an explicit "Preview Atelier reference" action or panel. When active, it should render inside the existing owner/private Studio preview canvas area as a temporary overlay or alternate canvas view owned by `PresenceStudioV3Shell.tsx`.

It must not use the normal selectable Look/Room Style controls, and it must not call the save/private-state mutation paths. The active owner document remains on its previous supported Gate 3 Look and Room Style.

## Smallest Safe Slice

Build a flat private preview adapter that uses Atelier metadata and a simple CSS/SVG/HTML rendering:

- drawing-sheet atmosphere approximation: warm paper, rule grid, construction arcs, light dither texture
- six refractive threshold bodies: translucent glass-like shapes with brass outlines and readable labels
- one transient material-sample toggle or swatch only if it is CSS-variable-only and resets on close
- static or minimal focus state for click/focus proof
- reduced-motion default that keeps the same legible composition with no hidden content
- mobile layout at 390px with no horizontal overflow

This is enough for M3B because the first proof must show the actual Atelier pairing idea: six glass bodies over a drawing sheet. A single static swatch is too weak, and the full reference import is too risky for the first adapter slice.

If time pressure requires a smaller implementation, keep the drawing-sheet plus six bodies and defer material sampler interaction. Do not drop the six bodies.

## Metadata Use Without Persistence

The adapter may read M3A catalog metadata through pure helpers such as:

- `getPresenceLookDefinition("brass-inlay")`
- `getPresenceRoomStyleDefinition("refractive-threshold")`
- `getPresencePieceTreatmentDefinition(...)`
- `getPresenceAtmosphereDefinition(...)`

The adapter must hold any preview state only in component-local transient state, for example `atelierPreviewOpen`, `atelierFocusedBodyId`, or `atelierMaterialSampleId`.

The adapter must not write Atelier IDs into:

- active P1 Look/Room Style state
- `document.looks`
- `activeLookId`
- room `styleId`
- layer overrides
- named Looks
- savepoints
- private-state restore payloads
- backend save envelopes
- public metadata projection
- compiler V2 public-shaped output
- local storage or session storage

Opening, changing, and closing the preview must leave the owner document dirty state and save payload unchanged unless the owner had unrelated unsaved edits before opening it.

## UI Contract

Required UI language and behavior:

- The action label must use "preview" language, not "apply", "select", "save", "publish", or "enable".
- The preview surface must carry a visible boundary badge such as `Private no-save preview`.
- The supporting copy must say that it does not change the active Look, does not save, does not publish, and does not change visitor/public routes.
- The normal Save as Look / private save affordances must not save Atelier IDs while the preview is active.
- Closing the preview must restore the previous private Studio preview.
- Material sampler controls, if included, must be labelled as transient and reset-on-close.

## First Implementation Files

Expected runtime files for the later M3B implementation slice:

- `components/presence-studio-v3/PresenceStudioV3Shell.tsx`
- `components/presence-studio-v3/StudioV3LookControls.tsx`
- `components/presence-studio-v3/StudioV3AtelierPreview.tsx`
- `components/presence-studio-v3/presence-studio-v3.css`
- optional pure helper under `lib/presence/studio-v3/atelierPreview.ts`
- focused Playwright spec under `tests/e2e/`

Do not edit backend validators, public renderer files, public routes, public projection, auth, tenant, payment, publish, deploy, or production-data files.

## Deferred As Too Expensive Or Risky

Do not import these in M3B:

- WebGL threshold scene, cube camera, fragment shaders, or Three.js renderer
- full `threshold-refraction` / `blob-nav` module contract
- shared geometry primitive registry from `js/lib/layout.js`
- path interpolation and seven-outline glass morph
- 75 percent open gesture and full room takeover
- generated measured-plate Work source model
- Onion Inspection and Scribe Reveal behavior over arbitrary content hosts
- real material sampler token propagation into rasterized canvases
- enquiry widget, webhook, owner signal, visitor action, or qualification arithmetic
- module contract validator integration
- public renderer adapter
- backend private-state validator extension
- `05-meridian`, GGM conversion, Soundings import, or slots `06` through `10`

These are real Gate 4/Gate 6/Gate 7 problems, but including them in M3B would broaden the slice into public renderer, registry, content model, action, or persistence work.

## Tests And Evidence Required For Implementation

Minimum commands:

- `cmd /c npm run typecheck`
- `cmd /c npm run build`
- `cmd /c npx playwright test tests/e2e/presence-studio-v3-atelier-private-preview.spec.ts --project=chromium`
- `cmd /c npx playwright test tests/e2e/presence-studio-v3-public-invariance.spec.ts --project=chromium`
- `cmd /c npx playwright test tests/e2e/presence-studio-v3-mobile-accessibility.spec.ts --project=chromium --grep "mobile visual controls"`
- `git diff --check`
- `git diff --cached --check` before commit

Required browser proof:

- desktop owner/private preview screenshot with `Private no-save preview` visible
- mobile 390px screenshot with no horizontal overflow and legible body labels
- reduced-motion proof with all six bodies/content reachable and visible
- close/reload proof showing the active saved owner Look/Room Style did not become `brass-inlay` or `refractive-threshold`
- network/write-ledger proof showing opening and interacting with the preview did not send a private-state save payload carrying Atelier IDs
- public-invariance proof showing public output remains byte/text/visual invariant against the accepted baseline

## Public-Invariance Proof

The implementation must prove public output is unchanged by:

- keeping `brass-inlay` and `refractive-threshold` blocked from owner selection
- avoiding any public route, public projection, public renderer, public payload, publish, or deploy change
- rerunning the existing public-invariance Chromium spec
- inspecting staged file names for absence of public renderer/routes/projection/backend validator changes

## Acceptance Criteria

- Owner can open a private no-save Atelier preview from Studio V3 Look controls.
- Preview visibly approximates `brass-inlay` x `refractive-threshold` through a drawing sheet and six glass bodies.
- Atelier IDs never become active, persistable, saved, restored, projected, or public.
- No backend validator change.
- No public renderer, public route, public payload, or public projection change.
- No publish, deploy, merge, push, stash apply/pop, auth, tenant, payment, or production-data change.
- `05-meridian`, GGM, Soundings, and slots `06` through `10` remain excluded.
- Required tests and browser evidence pass.

## Rollback

Revert the M3B implementation commit. Because M3B must not alter backend validators, public output, routes, projection, publish, or persisted state shape, rollback should remove only the transient owner/private preview files and tests while preserving the M3A metadata baseline.

## Recommended Builder Prompt

Implement Gate 4 M3B from `presence-app/.agent/PRESENCE_GATE_4_M3B_ATELIER_PRIVATE_NO_SAVE_PREVIEW_WORK_ORDER.md`. Build only the private no-save Atelier preview adapter. Do not make Atelier IDs selectable, persistable, saved, restored, projected, or public. Do not edit backend validators, public renderer/routes/projection, auth, tenant/payment, publish, deploy, GGM, Soundings, `05-meridian`, slots `06`-`10`, or Gate 5. Run the required typecheck/build/Playwright/public-invariance checks and stage only scoped M3B files.
