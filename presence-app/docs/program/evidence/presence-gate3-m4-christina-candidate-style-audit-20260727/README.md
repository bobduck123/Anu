# Gate 3 M4 Evidence - Christina Candidate Style Audit

Date: 2026-07-29
Project: Presence
Gate: Gate 3 - V3.2 Design-System Architecture
Status: Complete - candidate audit plus safe catalog metadata
Verdict: ACCEPT M4 WITH CHRISTINA METADATA-ONLY

## Summary

Gate 3 M4 audited `christina-liquid-gallery` as the third candidate style family from existing Presence proof.

Christina is real prior proof: it has a V2 public style preset ID, owner-facing V2 option text, a specialized public renderer branch, a large CSS style block, mock/hosted fixture history, and e2e regression coverage. It is not yet a V3-native style. The current implementation depends on hard-coded public renderer structure and CSS classes that have no equivalent V3 Look, Room Style, Piece Treatment, Atmosphere, or Motion primitive contract.

M4 therefore records Christina in the shared catalog as a `metadata-only` candidate with `public-proof` evidence, not as a supported or flagship V3 style. No public renderer, public route, publish/public sync, backend validator, auth, tenant, payment, deployment, hosted data, or production data code was changed.

## Files Changed

| File | Change |
|---|---|
| `lib/presence/studio-v3/styleCatalog.ts` | Added typed candidate-readiness metadata fields and classified `christina-liquid-gallery` as `metadata-only` with missing V3 primitive contracts. |
| `lib/presence/studio-v3/compiler.test.ts` | Added focused assertions that Gallery P2 and BBBVision remain supported/flagship, while Christina stays candidate-only and hidden from V3 Look exposure. |
| `docs/program/evidence/presence-gate3-m4-christina-candidate-style-audit-20260727/README.md` | Added this evidence packet. |
| `.agent/PRESENCE_GATE_3_M4_CHRISTINA_CANDIDATE_STYLE_AUDIT_WORK_ORDER.md` | Added the completed M4 work order record. |
| `.agent/PRESENCE_GATE_TRACKER.md` | Updated Gate 3 status and log for M4. |
| `.agent/PRESENCE_GATE_3_EXECPLAN.md` | Marked M4 complete and advanced the next task. |

The workspace had preexisting uncommitted changes before M4. This evidence describes only the M4-scoped changes above.

## Commands And Tests Run

| Command | Result |
|---|---|
| `cmd /c npm run typecheck` | PASS |
| `node --test lib\presence\studio-v3\compiler.test.ts lib\api\studioV3.test.ts` | PASS - 54/54. Node emitted existing module-type warnings for `.ts` ES module tests. |
| `node --test lib\presence\studio-v2\studioV2Adapters.test.ts` | PASS - 22/22. Node emitted the existing module-type warning for `.ts` ES module tests. |
| `cmd /c npm run build` | PASS |
| `git diff --check -- lib/presence/studio-v3/styleCatalog.ts lib/presence/studio-v3/compiler.test.ts docs/program/evidence/presence-gate3-m4-christina-candidate-style-audit-20260727/README.md .agent/PRESENCE_GATE_3_M4_CHRISTINA_CANDIDATE_STYLE_AUDIT_WORK_ORDER.md .agent/PRESENCE_GATE_TRACKER.md .agent/PRESENCE_GATE_3_EXECPLAN.md` | PASS |

No Playwright public-invariance proof was run for M4 because public renderer, public projection, public routes, and UI code were not edited. Existing public proof remains from Gate 3 M3 and Gate 2 acceptance.

## Files Inspected

- `.agent/PRESENCE_CANON.md`
- `.agent/PRESENCE_V34_GATED_PLAN.md`
- `.agent/PRESENCE_GATE_TRACKER.md`
- `.agent/PRESENCE_GATE_3_EXECPLAN.md`
- `.agent/PRESENCE_GATE_3_M2_SHARED_STYLE_CATALOG_WORK_ORDER.md`
- `.agent/PRESENCE_GATE_3_M3_OWNER_CONTROLS_FROM_REGISTRY_WORK_ORDER.md`
- `docs/program/evidence/presence-gate3-m1-style-architecture-map-20260727/README.md`
- `docs/program/evidence/presence-gate3-m2-shared-style-catalog-20260727/README.md`
- `docs/program/evidence/presence-gate3-m3-owner-controls-from-registry-20260727/README.md`
- `.agent/DESIGN_SYSTEM_PIPELINE.md`
- `.agent/LAUNCH_QUALITY_BAR.md`
- `.agent/NO_MERGE_REVIEW.md`
- `.agent/TASK_SIZING.md`
- `lib/presence/studio-v3/styleCatalog.ts`
- `lib/presence/studio-v3/compiler.test.ts`
- `components/presence-studio-v2/worlds.ts`
- `components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx`
- `components/presence-studio-v2/presence-studio-v2-public.css`
- `lib/presence/studio-v2/model.ts`
- `lib/presence/studio-v2/studioV2Adapters.test.ts`
- `tests/e2e/presence-studio-v2-public-style-presets.spec.ts`
- `tests/e2e/presence-studio-v2-bbbvision-pilot.spec.ts`
- `tests/e2e/mock-presence-api.mjs`
- `docs/program/PRESENCE_V3_BBBVISION_CANVAS_CONDITIONAL_REAUDIT.md`
- `docs/program/PRESENCE_V3_BBBVISION_CANVAS_ENGINE_AUDIT.md`
- `docs/program/presence-studio-v3/STUDIO_V3_PRODUCT_SPEC.md`
- `docs/program/presence-studio-v3/STUDIO_V3_CUSTOMISATION_MODEL.md`

## Christina Current Implementation Finding

`christina-liquid-gallery` currently exists in V2/public style infrastructure:

- `components/presence-studio-v2/worlds.ts` exposes an owner-facing V2 style option labelled `Christina / Liquid Gallery`.
- `lib/presence/studio-v2/model.ts` includes `christina-liquid-gallery` in the public style preset union and options.
- `components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx` branches when `worldId === "gallery"` and `publicStylePreset === "christina-liquid-gallery"`.
- `ChristinaLiquidGalleryPublicRoom` derives `liquidWorks` from chamber objects with image sources, keeps selected-work state with prev/next/dots, renders the selected image stage, practice pathway, references, CTA, and artwork focus overlay.
- `components/presence-studio-v2/presence-studio-v2-public.css` owns the `style-christina-liquid-gallery` selectors, liquid field/dither, image stage, sequence controls, pathway, practice, references, focus styling, and mobile layout.
- `tests/e2e/presence-studio-v2-public-style-presets.spec.ts` proves V2 switching, draft persistence, owner preview, publish, public route, mobile, and switch-back behavior for Christina in the mock harness.
- `tests/e2e/mock-presence-api.mjs` contains GGM/Christina editable fixture metadata with liquid slideshow, atmospheric liquid bloom, ripple, liquid intensity, liquid crossfade, RoomKey copy, and `ggm-christina-goddard` slug history.

This is enough to treat Christina as prior Presence proof. It is not enough to treat Christina as a V3-native style.

## Christina Design-System Mapping

Closest existing V3 mapping:

| Dimension | Current Christina source | Closest existing V3 primitive | Finding |
|---|---|---|---|
| Look | Light art-site/watercolour surface with minimal chrome | `soft-editorial` | Closest fit, but lacks liquid material language. |
| Room Style | Selected-work sequence with pathway and practice regions | `film-strip-selected-works` | Closest structural match, but not wired to Christina's public branch. |
| Piece Treatment | Contained watercolour image stage plus focus overlay | No exact primitive; closest is `quiet-framed` | Needs a liquid/image-stage treatment contract. |
| Atmosphere | Liquid field, dither, soft paper/rust/blue surface | No exact primitive; closest is `paper-light` | Needs a liquid atmosphere token before support. |
| Motion | Prev/next/dot sequence, hover transforms, smooth scroll, liquid language | No exact primitive; closest is `gentle` | Needs a liquid motion contract and reduced-motion proof. |

M4 records an implied experimental pair of `soft-editorial` + `film-strip-selected-works`, with fallback to `gallery-wall`. This is metadata for future migration planning only, not an exposed selectable V3 style pair.

## Candidate Readiness Classification

| Preset | M4 support status | Evidence status | V3 exposure |
|---|---|---|---|
| `gallery-p2` | `supported` | `v3-proof` | Existing simple/control pair: `soft-editorial` + `gallery-wall`. |
| `bbbvision-threshold-gallery` | `flagship` | `v3-proof` | Existing flagship pair: `nocturnal-gallery` + `threshold-portal`. |
| `christina-liquid-gallery` | `metadata-only` | `public-proof` | Not represented by a V3 Look ID or Room Style ID; hidden from V3 Look controls. |

Christina remains below `experimental` in active V3 support because it has public branch proof but not a private V3 primitive/preview proof.

## V3 Primitive Gap Finding

Christina cannot be safely promoted until these contracts exist:

- liquid gallery surface field and dither atmosphere;
- selected-work stage with prev/next/progress/dot controls;
- watercolour image-stage piece treatment with focus behavior;
- practice pathway and reference-strip content regions;
- reduced-motion behavior for field, dither, hover transforms, smooth scroll, and any future morphing;
- performance budget for large artwork images and paint-heavy CSS layers;
- private V3 preview adapter that can project V3 metadata into Christina-like behavior without making the public renderer registry-dependent;
- compatibility matrix posture for any supported or experimental future pair.

## Compatibility Finding

The M4 catalog explicitly avoids adding a Christina Look ID or Room Style ID.

The nearest implied pair is:

- Look: `soft-editorial`
- Room Style: `film-strip-selected-works`
- Tier: `experimental`
- Fallback: `gallery-wall`

Reason: Christina behaves like a light editorial selected-works sequence, but its liquid surface, image-stage treatment, and motion contract are not system-native.

Focused tests assert:

- Christina has no `representedByLookId`;
- Christina has no `representedByRoomStyleId`;
- no catalog Look maps to `publicStylePreset: "christina-liquid-gallery"`;
- Christina is the metadata-only public preset candidate;
- Gallery P2 and BBBVision retain supported/flagship status.

## Mobile, Reduced-Motion, And Performance Finding

Mobile:

- Christina has a mobile CSS branch under `@media (max-width: 860px)`.
- The mobile branch collapses the hero to one column, adjusts nav, stage height, dots, caption, CTA, content spacing, work path, and practice grid.
- Existing e2e coverage captures a 390px mock public route screenshot.

Reduced motion:

- The V2 public CSS has global reduced-motion rules for `.presence-studio-v2-public`.
- BBBVision has additional specialized reduced-motion selectors.
- Christina has no Christina-specific reduced-motion selector block.
- M4 therefore requires a Christina-specific reduced-motion contract before support.

Performance:

- Christina currently uses large image stages, gradients, dither masks, fixed nav with mix-blend-mode, transitions, and focus overlays.
- No V3 primitive-level performance budget exists for those surfaces.
- Future support should prove large-image and paint-layer behavior on desktop and mobile before exposing it as a V3 style.

## Public And Private Safety Finding

M4 did not edit:

- `components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx`
- `components/presence-studio-v2/presence-studio-v2-public.css`
- `components/presence-studio-v2/worlds.ts`
- public route files
- public payload projection
- backend validators
- publish/public sync code
- hosted/prod data

The only runtime-facing change is typed frontend catalog metadata plus tests. Public route invariance does not need a new browser proof in M4 because public rendering and projection were not touched.

Style selection remains private-only for Gate 3. Christina is not wired into V3 owner controls as a selectable Look or supported Room Style.

## Catalog Metadata Finding

M4 adds candidate-readiness fields to public preset candidate definitions:

- `supportStatus`
- `candidateEvidenceStatus`
- `candidateKind`
- `impliedLookRoomStylePair`
- `primitiveRequirements`
- `missingContracts`
- `currentImplementationRefs`
- `publicRendererSpecifics`
- `compatibilityRecommendation`

These fields are documentation-grade typed metadata consumed by tests. They do not alter compiler projection, V3 private metadata shape, V2 public payloads, public rendering, or backend validation.

## Risks

- Christina's existing quality lives in a specialized V2 renderer branch and CSS block; flattening it into generic primitives could lose the strongest visual qualities.
- Treating the V2 public branch as a V3-supported style too early would bypass reduced-motion and performance proof.
- The nearest V3 mapping, `soft-editorial` + `film-strip-selected-works`, is conceptually useful but incomplete.
- Public Christina style preset behavior still exists in V2 owner/public flows; future Gate 3 work must not accidentally expose it through V3 controls.
- Backend validation still mirrors current V3 token assumptions, so adding Christina-native IDs later needs a backend-aware work order.

## Rollback Notes

Rollback is limited to M4 metadata/tests/docs:

- remove the candidate-readiness fields from `lib/presence/studio-v3/styleCatalog.ts`;
- remove the M4 assertions from `lib/presence/studio-v3/compiler.test.ts`;
- remove this evidence folder;
- restore the Gate 3 tracker and ExecPlan M4 entries.

No public, backend, hosted, auth, tenant, payment, or production data rollback is required.

## Remaining Work

- Define a Christina-compatible private V3 primitive contract before support.
- Prove a Christina-like private preview adapter without public renderer dependency.
- Add Christina-specific reduced-motion proof if a private preview adapter is built.
- Add mobile screenshots only when a runtime visual path changes.
- Keep `christina-liquid-gallery` hidden from V3 owner selection until the above proof exists.

## Recommended Next Task

Gate 3 M5 should harden compatibility guardrails around the shared catalog:

- prevent unsupported promotion of metadata-only candidates;
- make experimental/internal status enforceable in owner-facing flows;
- keep public renderer and public routes unchanged;
- add tests that public preset candidate metadata cannot become a selectable V3 Look without explicit represented IDs and compatibility coverage.
