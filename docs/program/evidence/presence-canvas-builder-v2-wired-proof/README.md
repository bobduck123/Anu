# Presence Canvas Builder V2 Wired Proof

Date: 2026-05-24

## Summary

The GGM Presence editing lifecycle now resolves visible authored values through one shared render model:

- Canvas reads the owner draft through `resolveRenderModel(node, "draft")`.
- Full authenticated preview renders the same draft model.
- Public Presence renders `resolveRenderModel(node, "published")`.
- RoomKey GGM entry renders only a published model.

This removes the duplicated public GGM editable adapter that allowed Canvas and the visitor room to choose different text, imagery, palette, typography, works, or motion values.

## What Changed

- Audited and hardened Claude's resolver, typography, option-pack, and widget registry foundation.
- Retired `lib/presence/ggm/editable.ts` as a second public fallback chain.
- Wired public GGM entry, work-detail entry, draft preview, RoomKey, and Canvas to the shared model.
- Restored the GGM RoomKey guest entry/actions panel and accessible room heading after the RoomKey regression suite exposed missing visitor affordances.
- Moved the comfortable heavy-motion ceiling into the resolver so Canvas, preview, and public receive the same effective value.
- Added live Canvas controls for curated fonts, palette tokens, and two public-supported option packs.
- Added an honest gallery-style status panel: only Gallery wall is currently live.
- Added a widget library drawer that lists blocks already in the live room; adding new blocks remains unavailable until public placement support exists.
- Preserved existing direct text edit, image/alt edit, readiness, and constrained work reorder flows while switching their displayed values to resolver output.

## Files Changed

Core rendering and routes:

- `presence-app/lib/presence/render/model.ts`
- `presence-app/lib/presence/render/resolver.ts`
- `presence-app/components/portfolio/PortfolioRenderer.tsx`
- `presence-app/components/presence/PresenceDnaRenderer.tsx`
- `presence-app/components/presence/ggm/GgmFaithfulRoom.tsx`
- `presence-app/components/presence/ggm/GgmMotionContext.tsx`
- `presence-app/components/presence/graph/RoomKeyEntry.tsx`
- `presence-app/components/presence/graph/PresenceGraphActions.tsx`
- `presence-app/app/(public)/p/[slug]/works/[workId]/page.tsx`
- `presence-app/components/studio/editor/PresenceDraftPreviewPage.tsx`
- `presence-app/lib/presence/ggm/editable.ts` (removed)

Canvas and controlled options:

- `presence-app/components/studio/editor/PresenceCanvasMode.tsx`
- `presence-app/components/studio/editor/canvas/FontPicker.tsx`
- `presence-app/components/studio/editor/canvas/PalettePicker.tsx`
- `presence-app/components/studio/editor/canvas/OptionPackPicker.tsx`
- `presence-app/components/studio/editor/canvas/GalleryLayoutPicker.tsx`
- `presence-app/components/studio/editor/canvas/WidgetInspector.tsx`
- `presence-app/components/studio/editor/canvas/WidgetLibraryDrawer.tsx`
- `presence-app/lib/editor/canvasModel.ts`
- `presence-app/lib/editor/canvasMutations.ts`
- `presence-app/lib/presence/typography/registry.ts`
- `presence-app/lib/presence/option-packs/registry.ts`
- `presence-app/lib/presence/widgets/registry.ts`

Tests and proof:

- `presence-app/lib/presence/render/resolver.test.ts`
- `presence-app/lib/presence/typography/registry.test.ts`
- `presence-app/lib/presence/option-packs/registry.test.ts`
- `presence-app/lib/presence/widgets/registry.test.ts`
- `presence-app/lib/editor/canvasMutations.test.ts`
- `presence-app/tests/e2e/canvas-builder-parity.spec.ts`
- `presence-app/tests/e2e/presence-canvas-direct-manipulation.spec.ts`
- `docs/program/evidence/presence-canvas-builder-v2-wired-proof/`

## Resolver Wiring

`PortfolioRenderer` resolves a published model by default and passes it to `PresenceDnaRenderer` and the GGM room. The authenticated draft preview explicitly requests `renderMode="draft"`. Canvas creates a draft model from the current draft configuration and reads its visible text, imagery, work list, typography, palette, and motion settings. RoomKey explicitly resolves in published mode.

The resolver still provides known-safe GGM defaults where an older published room lacks authored fields. Those provenance values are available to Canvas for owner context; public components do not display internal provenance or draft data.

## Surface Status

| Surface | Status | Evidence |
| --- | --- | --- |
| Public GGM room | Wired to published render model | E2E publishes title and Ink Room background, then checks public route |
| Canvas | Wired to draft render model for supported visible values | E2E title/font/palette/pack workflow |
| Full preview | Wired to draft render mode and marked private | E2E preview assertion and screenshot |
| RoomKey | Wired to published render mode; guest actions retained | Browser RoomKey/pass-path regression plus backend tests |
| Font picker | Live | Curated safe IDs, loader test, E2E selected font |
| Palette picker | Live for exposed GGM palette tokens | E2E background update |
| Option packs | Live for Paper Gallery and Ink Room | Unit guard plus E2E Ink Room publish |
| Gallery layouts | Gallery wall only | Alternate options hidden |
| Widget library | Inventory foundation only | Live blocks listed; addition intentionally unavailable |
| Work reorder | Live, constrained | Existing direct manipulation E2E plus V2 screenshot |

## Pilot Owner Flow Proof

The combined Playwright runs prove an owner can enter Canvas by default, select and inline-edit the title, choose a font, apply colour and a mood pack, use existing image/alt editing and readiness flows, reorder the work wall, open full draft preview, confirm that the public room did not receive draft title text before publish, and intentionally open the room to visitors. The owner does not need to enter Advanced controls for this tested path.

## Tests Run

See `results.json`. Passed results include:

- `npm.cmd run typecheck`
- `npm.cmd run build`
- 31 focused frontend unit/contract tests
- 12 backend editor, graph, and pass-path tests
- 15 Playwright Studio, Canvas, RoomKey, graph-path, and public-route tests in Chromium

The build and Playwright server emit an existing Next workspace-root warning because multiple lockfiles exist. Backend tests emit existing SQLAlchemy legacy API warnings. Neither caused failures.

## Screenshots

See `SCREENSHOTS.md` and the generated `screenshots/` folder. The screenshots are from the passing V2 Playwright run on 2026-05-24.

## Remaining Limitations

See `KNOWN_LIMITATIONS.md`. In particular, Canvas uses a focused editing composition backed by the shared model; the authenticated full preview is the exact visitor presentation. Block insertion, alternate gallery layouts, upload/crop/focal controls, full non-GGM parity, and hosted pilot verification are not complete.

## Pilot Readiness Judgement

This is suitable for a controlled GGM friendly-pilot validation after hosted smoke testing and operator review. It is not yet evidence for paid self-serve pilots: the live customization surface is intentionally narrow, widget addition is not enabled, media upload tooling is absent, and only local mocked E2E proof has been run.

## Next Pass

Run the hosted smoke checklist against an authenticated pilot room and published public route; then implement one public-rendered widget insertion contract or one additional gallery layout end to end, with resolver, Canvas, preview, public rendering, mobile behavior, and proof in the same pass.
