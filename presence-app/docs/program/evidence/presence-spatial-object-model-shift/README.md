# Presence spatial object-model Gate 3 evidence

This folder records a bounded internal architecture proof completed on 2026-08-17. It does not mark Gate 4 accepted and does not claim backend persistence, self-service editing, publishing, hosting or launch readiness.

## Evidence index

- [Execution plan](EXEC_PLAN.md)
- [QA report](SPATIAL_OBJECT_MODEL_QA_2026-08-17.md)
- [Payload report](PAYLOAD_REPORT.md)
- [Final verification and independent review](FINAL_VERIFICATION_2026-08-17.md)
- [Draco runtime support note](DRACO_RUNTIME_SUPPORT_2026-08-17.md)
- [Draco runtime gate review](DRACO_RUNTIME_GATE_REVIEW_2026-08-17.md)
- [Spatial authoring baseline evidence](SPATIAL_AUTHORING_BASELINE_2026-08-17.md)
- [Spatial authoring UX hardening evidence](SPATIAL_AUTHORING_UX_HARDENING_2026-08-17.md)
- [Component quality round 1 evidence](COMPONENT_QUALITY_ROUND_1_2026-08-17.md)
- [Component quality round 1 WebGL visual review](WEBGL_VISUAL_REVIEW_COMPONENT_QUALITY_ROUND_1_2026-08-17.md)
- [Candidate asset options palette evidence](CANDIDATE_ASSET_OPTIONS_PALETTE_2026-08-17.md)
- [Room kit option alias layer evidence](ROOM_KIT_OPTION_ALIAS_LAYER_2026-08-17.md)
- [P0 option primitives evidence](P0_OPTION_PRIMITIVES_2026-08-17.md)
- [Option alias exposure and language evidence](OPTION_ALIAS_EXPOSURE_AND_LANGUAGE_2026-08-17.md)
- [Mobstar saved-layout envelope](saved-layouts/mobstar-spatial-draft-v1.json)
- [BBB projection-wall saved-layout envelope](saved-layouts/bbb-projection-wall-draft-v1.json)
- [Mobstar saved Three.js preview](screenshots/01-mobstar-three-arranger-saved-preview.png)
- [BBB projection-wall Three.js proof](screenshots/02-bbb-reusable-projection-wall-three.png)
- [Mobstar 390 px semantic fallback](screenshots/03-mobstar-mobile-semantic-fallback-390.png)
- [Draco manual browser QA screenshot](screenshots/draco-manual-browser-qa.png)
- [Authoring UX hardening inspector screenshot](screenshots/04-authoring-ux-hardening-inspector.png)
- [Component quality round 1 desktop fallback screenshot](screenshots/05-component-quality-round-1-gate4-desktop.png)
- [Component quality round 1 mobile fallback screenshot](screenshots/06-component-quality-round-1-gate4-mobile.png)
- [Component quality round 1 WebGL entry view](screenshots/07-webgl-component-quality-round-1-desktop-entry.png)
- [Component quality round 1 WebGL rack/display area](screenshots/08-webgl-component-quality-round-1-display-area.png)
- [Component quality round 1 WebGL media surface](screenshots/09-webgl-component-quality-round-1-media-surface.png)
- [Component quality round 1 WebGL selected object](screenshots/10-webgl-component-quality-round-1-selected-object.png)
- [Component quality round 1 mobile fallback 390 px](screenshots/11-component-quality-round-1-mobile-fallback-390.png)
- [Candidate options palette screenshot](screenshots/12-candidate-options-palette.png)
- [Room kit option alias layer screenshot](screenshots/13-room-kit-option-alias-layer.png)
- [P0 option primitives screenshot](screenshots/14-p0-option-primitives.png)
- [Option alias exposure and language screenshot](screenshots/15-option-alias-exposure-language.png)

## Technical documents

- [Architecture decision record](../../presence-spatial-object-model/SPATIAL_OBJECT_MODEL_SHIFT_ADR_2026-08-17.md)
- [Schema and contract](../../presence-spatial-object-model/SPATIAL_OBJECT_MODEL_SCHEMA_2026-08-17.md)
- [Mobstar rebuild notes](../../presence-spatial-object-model/MOBSTAR_OBJECT_MODEL_REBUILD_NOTES_2026-08-17.md)

## Verified result

- 94 focused unit tests passed.
- 9 focused Chromium E2E tests passed with zero retries.
- Typecheck passed.
- Production build passed.
- Three.js is lazy and isolated to the production-disabled internal route; measured chunk size is 546,602 bytes uncompressed.
- Public BBB behaviour remained invariant in the focused browser proof.
- Saved JSON examples are deterministic outputs of `scripts/generate-spatial-layout-evidence.ts` with a fixed evidence timestamp.
