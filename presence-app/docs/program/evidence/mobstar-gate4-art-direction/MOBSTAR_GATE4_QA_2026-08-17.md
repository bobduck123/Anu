# Mobstar Gate 4 QA

## Automated evidence

- `npm.cmd run test:spatial` - PASS, 101/101.
- `npm.cmd run typecheck` - PASS.
- Focused Chromium E2E - 11 scenarios each reported `ok`; the isolated runner hung during web-server teardown after completion and was stopped. This is recorded as a teardown limitation, not a clean process-exit claim.
- Genericity scan test - PASS; renderer/geometry/fallback modules contain no Mobstar ID, slug or fixture-kind branch.
- Public-route invariance scenario - PASS in the focused E2E run.

## Manual QA

- Desktop Three entry, rack, garment inspection, projection and archive states reviewed on the default-off internal route.
- Compact mobile lane reviewed with branded static campaign treatment plus complete semantic Piece/Action coverage.
- Missing-media behavior was exercised before candidate assets existed and remained honest/semantic.
- Media files return HTTP 200 and remain below declared byte caps.
- Gate 3 Mobstar and BBB fixtures were preserved.

## Result

Platform/data/payload QA: PASS.  
Creative Gate 4: RETURN TO HARDENING.  
Component admission: NOT EVALUATED / NOT ADMITTED.

## Risks and remaining work

- Desktop entry is still under-populated and darker than the pinned showroom.
- Garment media/inspection lacks a decisive outward presentation moment.
- Procedural materials lack the surface detail/contact quality required for admission.
- Screenshots are from an internal operator route, not a public visitor route.
- Candidate media currently live under `public/` for the local internal proof. No public route references them and nothing was deployed, but this is not an access boundary; move review-only media behind a gated asset response before any hosted candidate review.
- Physical-device, assistive-technology and multi-browser visual QA were not performed.
- Product-owner creative review remains required.

## Rollback

Remove `lib/presence/spatial/fixtures/mobstarGate4.ts`, `lighting.ts`, `interactionProfiles.ts`, Gate 4 tests/media/evidence, and revert only the Gate 4 additions in the listed spatial registry/model/compiler/renderer/arranger/fallback files. Do not revert the Gate 3 baseline commit `99c3618`, its saved layouts, BBB fixture, public-route evidence or local-storage proof. No database, deployment or production data rollback is required.
