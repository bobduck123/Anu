# Presence spatial object-model Gate 3 evidence

This folder records a bounded internal architecture proof completed on 2026-08-17. It does not mark Gate 4 accepted and does not claim backend persistence, self-service editing, publishing, hosting or launch readiness.

## Evidence index

- [Execution plan](EXEC_PLAN.md)
- [QA report](SPATIAL_OBJECT_MODEL_QA_2026-08-17.md)
- [Payload report](PAYLOAD_REPORT.md)
- [Final verification and independent review](FINAL_VERIFICATION_2026-08-17.md)
- [Mobstar saved-layout envelope](saved-layouts/mobstar-spatial-draft-v1.json)
- [BBB projection-wall saved-layout envelope](saved-layouts/bbb-projection-wall-draft-v1.json)
- [Mobstar saved Three.js preview](screenshots/01-mobstar-three-arranger-saved-preview.png)
- [BBB projection-wall Three.js proof](screenshots/02-bbb-reusable-projection-wall-three.png)
- [Mobstar 390 px semantic fallback](screenshots/03-mobstar-mobile-semantic-fallback-390.png)

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
