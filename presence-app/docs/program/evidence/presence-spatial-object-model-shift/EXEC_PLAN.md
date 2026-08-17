# ExecPlan: Presence Spatial Object Model Shift — Gate 3 Foundation

## Gate

V3.4 Gate 3 — V3.2 Design-System Architecture. The work-order stages called Gates 0–6 are milestones inside this single Presence gate; they do not change the status of Gate 4 or any later gate.

## Objective

Create a default-off internal proof that a Presence room can be represented, arranged, validated, saved, reloaded, and rendered from lightweight versioned component references. Mobstar is the first data fixture; BBB media is the first reusable projection-wall fixture. A minimal Three.js path must render the structured data, with semantic mobile/reduced-motion/WebGL-failure fallbacks.

## Why now

The standalone Mobstar prototype and BBB gallery provide useful art-direction and interaction evidence, but each remains specialist implementation. A shared spatial contract converts that evidence into reusable Presence delivery capability without changing the protected public renderer.

## Current state

- Public dispatch is `app/(public)/p/[slug]/page.tsx` → `lib/presence/render/publicPayload.ts` → `components/portfolio/PortfolioRenderer.tsx`; it is protected and remains unchanged.
- Studio V3 arrangement is intentionally zone-based and remains unchanged.
- The live application has no Three.js dependency; the approved work order authorises the minimal `three` package for this internal path only.
- `components/presence-studio-v2/BbbVisionCanvasGallery.tsx` remains the protected public BBB implementation.
- The Mobstar standalone Three.js prototype under `C:/Dev/.agent/reference-program/` is frozen reference evidence and is not an import source.
- The 2026-08-16 World Manifest RFC did not itself authorise runtime work. The human-approved 2026-08-17 spatial-object-model spec explicitly authorises this bounded internal Gate 3 slice; it does not approve Mobstar creative work, primitive admission, public registration, or publishing.

## Non-goals

- Production/public route integration, server persistence, publish, auth, tenant or payment changes.
- A polished client editor, arbitrary uploads, multiplayer, avatars, physics, checkout, or asset marketplace.
- Porting candidate-specific Mobstar assets, cameras, materials, GSAP, post-processing, or hardcoded scene logic.
- Refactoring the existing BBB public renderer.
- Treating placeholder geometry as visual or Gate 4 acceptance.

## Scope

### In scope

- Spatial entities, component registry/asset API, material presets, placement and capacity rules.
- Versioned component references, shared cache contract, strict validation, deterministic compile plan, browser-local draft generations.
- Primitive Three.js renderer plus semantic fallback.
- Operator controls for add, move, rotate, assign, save, reload, preview, reset/revert, import/export.
- Data-only Mobstar room and BBB projection-wall fixtures.
- Unit/E2E tests, responsive/reduced-motion/failure QA, payload evidence, screenshots and dated documentation.

### Out of scope

- Any protected public-dispatch edit or public asset exposure.
- Raw downloaded GLTF/GLB runtime delivery or per-client model generation.
- Visual library admission, production hosting, public claims, real commerce or event systems.

## Risks and blast radius

Risk: high architecture change, contained to a medium runtime blast radius by a default-off, non-production internal route.

- Three.js can increase bundles or leak into public chunks: use a client-only dynamic import and inspect build output.
- Parallel Presence models can drift: keep this internal v1 independent and document later promotion seams.
- Browser storage can imply persistence: label it local-only and make generation/revert behavior explicit.
- Candidate assets can leak: use procedural geometry and public-safe placeholder media only.
- Mobstar can remain covertly hardcoded: require generic registry resolution and exercise the same primitives with BBB.
- WebGL/mobile failure can hide content: semantic Piece/Action parity is mandatory.

## Milestones

### Milestone 1 — Contract and plan

Acceptance criteria:

- Required entities, component metadata, material slots, budgets and placement rules are explicit.
- Public/publish/auth boundaries and rollback path are recorded.

Evidence:

- Approved quick-dev spec and this ExecPlan.
- Architecture, renderer and arranger review summaries.

### Milestone 2 — Model, registry and fixtures

Acceptance criteria:

- Strictly validated layouts reference cached `componentId@version` components.
- Mobstar and BBB are serialisable data fixtures with no renderer branches keyed to their names.
- Layout JSON is at most 100 KB; eager compressed runtime asset budget targets at most 3 MB.

Evidence:

- Focused unit tests and exported fixture JSON.

### Milestone 3 — Renderer and arranger

Acceptance criteria:

- Three.js renders shell, floor, walls, rack/table/plinth/projection surface and hosted Pieces from compiled data.
- BBB media is assigned to the reusable projection-wall primitive.
- Operator can add/move/rotate/assign/save/reload/preview/reset/revert/import/export.
- Mobile, reduced-motion and WebGL-failure lanes retain semantic Pieces and Actions.

Evidence:

- Targeted Playwright checks and desktop/mobile screenshots.

### Milestone 4 — QA and proof capture

Acceptance criteria:

- Typecheck, unit tests, targeted E2E and production build pass.
- Public behavior and zero-write invariance are verified.
- Dated ADR, schema, Mobstar notes and QA report state limitations honestly.
- Independent QA review finds no critical acceptance gap.

Evidence:

- Command logs, payload report, screenshots, QA matrix, gate/proof updates.

## Files likely involved

- `lib/presence/spatial/**`
- `components/presence-spatial/**`
- `app/internal/spatial-object-model/**`
- `tests/e2e/presence-spatial-object-model.spec.ts`
- `docs/program/presence-spatial-object-model/**`
- `docs/program/evidence/presence-spatial-object-model-shift/**`
- `package.json`, `package-lock.json`, and local Playwright configuration where necessary.
- Root `.agent/PRESENCE_CANON.md`, `.agent/PRESENCE_GATE_TRACKER.md`, `.agent/PROOF_LIBRARY.md` for honest status only.

## Tests and validation

Commands:

```bash
npx.cmd tsx --test lib/presence/spatial/*.test.ts
npm run typecheck
npx playwright test tests/e2e/presence-spatial-object-model.spec.ts --project=chromium
npm run build
```

Manual QA:

- Desktop and 390 px arranger/preview.
- Keyboard, reduced-motion, missing-media and forced WebGL-failure behavior.
- Garment inspection with rack still visible; BBB media on a wall surface.
- Save/reload/revert/import round trip and zero network mutations.
- Production/default-off route behavior and protected public route smoke checks.

Screenshots:

- Mobstar Three.js preview desktop and mobile fallback.
- BBB projection-wall proof.
- Arranger after saved reload.

## Rollback plan

- Remove the added route (`app/internal/spatial-object-model/`), runtime/editor (`components/presence-spatial/`), contract/tests (`lib/presence/spatial/`), evidence generator, focused E2E file, and both spatial documentation/evidence folders.
- Revert only this task's hunks in `package.json`, `package-lock.json`, `playwright.config.ts`, and `tests/e2e/global-setup.ts`; remove `three`, `@types/three`, pinned `tsx`, and the spatial scripts if still unused elsewhere.
- Revert only the dated spatial-foundation append blocks in the root canon, tracker and proof library, plus approved-spec completion marks.
- Optionally clear only the encoded active/`:previous` draft keys for room IDs `mobstar-internal-arranger-room`, `mobstar-internal-proof-room`, and `bbb-projection-wall-proof`.

No public dispatcher, backend schema, production data, auth, tenant, publish, or protected public-renderer rollback is required.

## Human decisions required

- Already authorised: minimal Three.js dependency and this internal Gate 3 implementation.
- Still required before any later action: public registration, backend persistence, candidate asset ingestion, component admission, Gate 4 acceptance, hosted deployment or production publishing.

## Progress log

```text
2026-08-17 12:58 +10:00 - Approved spec locked; baseline 2d35848516f09d50cc4d8c06f38f2311d9d8e860; implementation started.
2026-08-17 - Architecture, renderer, arranger and initial QA subagent lanes completed; adversarial review recorded 42 patch findings.
2026-08-17 - All 42 patch findings implemented. Final verification: 94/94 spatial tests, typecheck, 9/9 Chromium E2E at zero retries, production build, real HTTP route-gate checks, payload/chunk inspection and independent read-only gate review.
```

## Final review checklist

- [x] Acceptance criteria met.
- [x] Gate 3 foundation evidence complete; no Gate 4 acceptance claimed.
- [x] Tests run.
- [x] Manual QA completed.
- [x] Screenshots captured.
- [x] Proof/library/tracker updated.
- [x] No unrelated scope.
- [x] No high-risk boundary changed without approval.
