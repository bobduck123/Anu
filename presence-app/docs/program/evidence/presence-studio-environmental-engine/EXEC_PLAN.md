# ExecPlan: Presence Studio environmental engine

## Objective

Deliver a private, local Studio V2 vertical slice in which the existing room canvas, selected chamber, selected object, and preview share a deterministic environmental treatment. The room must gain spatial depth and contextual focus without introducing a second editor, a new persistence contract, production data changes, or a public GGM claim.

## Why now

The Studio cockpit baseline proves editing and projection but still reads as a flat configuration surface. A bounded environmental layer makes the working proof more legible as a Presence room while preserving the actual editing contract needed for the first migration/proof loop.

## Current state

- Baseline branch point: `d217811aa072187be0b287ec2dd6c68cae53ea73` (`v2 editor stabilisation`).
- Studio V2 already has one canonical eligible-room editor, a local Room 11-shaped private fixture, a public renderer projection, Style DNA fields, mobile controls, and deterministic Playwright proof.
- The repository has no installed Three.js, GSAP, or React Three dependency. Existing world components already use deliberate CSS/DOM spatial techniques where appropriate.
- The environmental engine is scoped to presentation and focus derivation from the existing V2 state. It does not write or reinterpret persisted data.

## Non-goals

- No production backend, auth, control-plane, tenant, public/private, status, or persistence changes.
- No GGM provisioning, publishing, or public proof claim.
- No new rendering dependency, WebGL scene, raw CodePen import, physics loop, asset pipeline, or global design-system rewrite.
- No replacement of the existing V2 editor, renderer, or local fixture.

## Scope

### In scope

- A deterministic DOM environment model based on existing world/skin, active chamber, selected object, texture, and motion fields.
- Three decorative depth planes and CSS camera/focus states for editor and preview parity.
- Chamber/object emphasis, a mobile contextual inspector treatment, and reduced-motion/no-WebGL-safe behaviour.
- Focused E2E coverage, captured local evidence, source-reference inventory, and canon/proof updates.

### Out of scope

- Real-time WebGL, imported CodePen implementations, asset uploads, content-model changes, save API changes, hosted owner proof, and any public launch action.

## Risks and blast radius

**Blast radius: medium.** The slice touches shared Studio V2 editor and renderer presentation, but is additive and derives only from existing state. It is protected by editor/preview/mobile/reduced-motion tests.

Key risks:

- Decorative planes could obscure editor controls or public content.
- Focus styling could create an inaccessible interaction dependency.
- A prototype source could import excessive code or unsuitable pointer-only behaviour.

Mitigations:

- Mark planes decorative (`aria-hidden`), retain native chamber/object controls, and make all core editing DOM-based.
- Use CSS transitions only; no animation frame loop or WebGL requirement.
- Keep the layer to three DOM elements and reject raw external demo code/dependencies.

## Milestones

### Milestone 1 — Reference and architecture map

Acceptance criteria:

- Brand handoff and local prototype inventory are reviewed.
- Reusable repo spatial primitives are identified.
- The implementation choice and rejected alternatives are documented.

Evidence:

- `reference_inventory.md`.

### Milestone 2 — Environmental implementation slice

Acceptance criteria:

- Editor and preview derive the same environment from existing state.
- Room, chamber, and object focus change deterministically.
- Style DNA changes visibly affect the environment without changing persistence semantics.
- Mobile, reduced-motion, and no-WebGL paths preserve the core edit/preview workflow.

Evidence:

- `lib/presence/studio-v2/environment.ts` and targeted Playwright suite.

### Milestone 3 — QA and private proof capture

Acceptance criteria:

- Typecheck, focused and related regression tests, and production build pass.
- Local screenshots/frame sequence cover overview, chamber, object, Style DNA, preview, mobile, reduced motion, and fallback.
- The local/private limitation is explicit in canon, migration, and proof records.

Evidence:

- Screenshot pack, capture manifest, and final evidence README.

## Files likely involved

- `components/presence-studio-v2/PresenceStudioV2Room.tsx`
- `components/presence-studio-v2/PresenceStudioV2Editor.tsx`
- `components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx`
- `components/presence-studio-v2/PresenceStudioV2EnvironmentLayer.tsx`
- `components/presence-studio-v2/presence-studio-v2.css`
- `components/presence-studio-v2/presence-studio-v2-public.css`
- `lib/presence/studio-v2/environment.ts`
- `tests/e2e/presence-studio-v2-environmental-engine.spec.ts`
- `docs/program/evidence/presence-studio-environmental-engine/`
- `.agent/PRESENCE_CANON.md`, `.agent/PRESENCE_MIGRATION.md`, `.agent/PROOF_LIBRARY.md`

## Tests and validation

Commands:

```bash
npm run typecheck
npm run test:e2e -- <focused Studio V2 suites>
npm run build
```

There is no confirmed lint script and no named npm unit-test script.

Manual QA:

- Inspect local editor room/chamber/object focus and private preview.
- Inspect Style DNA responsiveness, mobile contextual controls, reduced motion, and no-WebGL-safe DOM path.

Screenshots:

- Capture a private local frame sequence only. Do not show GGM as public or system-native proof.

## Rollback plan

Revert the environmental-engine commit only. The layer is additive and has no data migration, backend change, dependency addition, or persisted schema change.

## Human decisions required

- None for this bounded private/local proof. Any WebGL adoption, asset ingestion, real owner session, or public GGM use needs a new work order.

## Progress log

```text
2026-07-20 — Baseline verified at d217811; no duplicate empty baseline commit created because the requested cockpit baseline was already cleanly committed.
2026-07-20 — Created feat/presence-studio-environmental-engine from the baseline.
2026-07-20 — Reviewed the Presence handoff, local prototype inventory, and existing DOM spatial primitives. Chose a three-plane deterministic DOM layer rather than importing WebGL/GSAP prototype code or dependencies.
2026-07-20 — Implemented the editor/preview environmental slice and passed the dedicated three-test Playwright suite plus typecheck.
2026-07-20 — Captured the private local frame sequence (room, chamber, object, Style DNA, preview, mobile, reduced motion/no-WebGL).
2026-07-20 — Passed `npm run typecheck`, the eight related Chromium specs (18 tests), and `npm run build`.
```

## Final review checklist

- [x] Acceptance criteria met.
- [x] Tests run.
- [x] Manual QA completed.
- [x] Screenshots captured.
- [x] Proof/library updated.
- [x] No unrelated scope.
- [x] No high-risk boundaries changed without approval.
