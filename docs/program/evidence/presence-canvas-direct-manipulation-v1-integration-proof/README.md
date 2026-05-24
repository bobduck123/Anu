# Presence Canvas Direct Manipulation v1 Integration Proof

Date: 2026-05-24  
Scope: local integration into the canonical Presence Studio editor route

## Summary

Canvas Mode is now an integrated draft editor for the GGM pilot room, not a shortcut overlay over a preview. The canonical `/studio/[id]/editor` route opens to a simplified Canvas experience with typed selectable elements, in-place copy editing, visible style and mood controls, existing-image replacement, alt text repair, constrained work-wall ordering, contextual needs-attention chips, mobile bottom-sheet controls, private full preview, and explicit open-to-visitors publishing.

The existing nested editable contract and owner API remain authoritative. Canvas changes persist through the existing draft save path; public and RoomKey behavior remain published-only, as covered by the backend regression suite.

## Implementation Strategy

Kimi was treated as a quarantined interaction reference only. Its direct-manipulation intent was reimplemented inside the existing Canvas tab using a deterministic typed registry against `PresenceEditableConfig`, then renderer-visible GGM mappings were added for enabled text, palette, and motion presets. No parallel Canvas route or alternate state lifecycle was created.

## Kimi Review

Reviewed reference candidates included `CanvasShell.tsx`, `CanvasRenderer.tsx`, `CanvasSelectionContext.tsx`, selection/toolbar/editor/inspector/picker/reorder/mood/readiness/pilot components, its candidate route, and its E2E proof material under `canvas-v1-delivery/`.

Integrated concepts:

- direct visible selection with a human inspector and mini-toolbar;
- in-canvas text editing and saved-to-draft feedback;
- image choice and alt-text repair;
- constrained work-wall reorder;
- mood/motion presets, readiness chips, mobile inspector, and pilot copy.

Rejected or replaced:

- DOM scanning and `MutationObserver` discovery;
- fictional hooks, flattened paths, and the separate `/canvas` test route;
- stub controls that did not update a renderer-visible output;
- all `editor-delivery` backend snapshots, migrations, token preview storage, flattened models, and public preview ideas.

## Files Changed

- `presence-app/components/studio/editor/PresenceCanvasMode.tsx`
- `presence-app/components/studio/editor/PresenceStudioEditorApp.tsx`
- `presence-app/components/studio/editor/PublishConfirmDialog.tsx`
- `presence-app/lib/editor/canvasModel.ts`
- `presence-app/lib/editor/canvasModel.test.ts`
- `presence-app/lib/editor/assetValidator.ts`
- `presence-app/lib/editor/assetValidator.test.ts`
- `presence-app/lib/editor/canonicalAssets.ts`
- `presence-app/lib/presence/ggm/editable.ts`
- `presence-app/components/presence/ggm/GgmFaithfulRoom.tsx`
- `presence-app/components/presence/ggm/GgmStudioScene.tsx`
- `presence-app/components/presence/ggm/GgmCallingCard.tsx`
- `presence-app/components/presence/ggm/ggm.module.css`
- `presence-app/tests/e2e/presence-canvas-direct-manipulation.spec.ts`
- `presence-app/tests/e2e/presence-studio-editor.spec.ts`
- `docs/program/evidence/presence-canvas-direct-manipulation-v1-integration-proof/*`

## Canvas Maturity

Before this pass, Canvas was primarily a draft render with hover shortcuts and a text drawer; normal work, imagery, readiness, mobile inspection, and publish confidence still led the owner into technical tabs.

After this pass, Canvas is a real v1 editor for the controlled GGM pilot surface. A normal owner can complete the tested content, style, mood, image, accessibility, work-order, preview, and intentional publish flow without entering Advanced controls.

## Status

| Area | Status | Proof |
| --- | --- | --- |
| P0 typed selection and overlay | Integrated | Stable `canvasId` registry; title/image/work selection in E2E |
| P0 inline visible copy editing | Integrated | Core fixed copy plus work titles/captions mapped to nested draft paths |
| P0 mini-toolbar and inspector | Integrated | Desktop inspector and contextual toolbar screenshots |
| P0 images and alt text | Integrated with existing images | Picker, safe advanced link, alt-text chip resolution |
| P0 work-wall order | Integrated | Drag surface plus arrow fallback; nested reorder unit and E2E |
| P0 readiness chips | Integrated for relevant surfaces | Missing alt/empty wall/title/CTA/unsafe image targeting; motion notice in inspector |
| P0 mood/style/motion | Integrated for GGM | Safe tokens and GGM published renderer mapping; entrance copy preserves contrast; non-GGM disabled honestly |
| P0 mobile controls | Integrated | Touch-sized bottom sheet and move-button fallback screenshot |
| P0 pilot mode | Integrated | Canvas default; Advanced controls demoted |
| P1 device upload/crop/focal point | Deferred | No draft-scoped endpoint; no fake feature |
| P2 broad non-GGM renderer controls | Deferred | Renderer-specific mappings required |

## Pilot Owner Flow Proof

The Playwright flow in `presence-canvas-direct-manipulation.spec.ts` proves that an authenticated owner can:

1. open Studio with Canvas as the default and Advanced controls demoted;
2. select the visible room title and edit it in place;
3. apply visible text size/colour and mood changes, with entrance text protected from low-contrast colour choices;
4. select a cover image, choose an existing room image, and edit alt text;
5. surface and resolve a needs-attention chip for missing alt text;
6. reorder the work wall through the safe move controls;
7. use the mobile bottom-sheet inspector;
8. open private full preview and see the draft title;
9. observe that the public room does not show the draft title before publishing;
10. confirm Open room to visitors and then see the published title on the public room.

This flow never opens Advanced controls.

## Tests Run

| Command | Result |
| --- | --- |
| `npm.cmd run typecheck` from `presence-app` | Passed |
| `npm.cmd run build` from `presence-app` | Passed; existing Next multiple-lockfile root warning retained |
| `node --test --experimental-strip-types lib\api\editor.test.ts lib\api\presenceGraph.test.ts lib\editor\assetValidator.test.ts lib\editor\diffEngine.test.ts lib\editor\canvasModel.test.ts` | Passed, 15 tests; existing Node module-type warnings retained |
| `npx.cmd playwright test tests/e2e/presence-canvas-direct-manipulation.spec.ts tests/e2e/presence-studio-editor.spec.ts --workers=1` | Passed, 2 tests; screenshots generated |
| `python -m pytest tests\test_presence_studio_editor_foundation.py tests\test_presence_graph_integration_proof.py tests\test_presence_pass_paths.py -q -p no:cacheprovider` from backend | Passed, 12 tests; existing SQLAlchemy legacy warnings retained |
| `git diff --check` | Passed |

## Screenshots

Fourteen local screenshots were captured by the passing Playwright flow. See [SCREENSHOTS.md](./SCREENSHOTS.md), including Canvas default, selected title/toolbar, inline edit, saved feedback, image picker, alt-text editor, mood/style result, reorder before/after, readiness repair, mobile inspector, private preview, and publish confirmation.

## Limitations

See [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md). The material limitations for pilots are: no draft-scoped device upload, crop, or focal point controls; mobile ordering uses robust move buttons rather than relying on touch dragging; style/mood controls are enabled only for the wired GGM renderer; and hosted production proof was not run in this local integration pass.

## Pilot Readiness Judgement

Ready for a controlled, operator-assisted friendly pilot on the wired GGM room after hosted smoke verification and preparation of the owner image set. Not ready for paid self-serve pilots or broad public rollout because owners cannot yet upload/crop/focus new imagery from Canvas and non-GGM renderer coverage is incomplete.

## Next Pass

Build a draft-scoped upload pipeline with image processing, crop/focal controls, and stable asset hosting; execute hosted owner/public/RoomKey proof; then extend the typed Canvas renderer adapter to the next paid-pilot room type.
