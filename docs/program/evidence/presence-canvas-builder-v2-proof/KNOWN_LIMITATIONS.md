# Known Limitations — Canvas Builder v2 (this pass)

## What is genuinely unfinished

1. **Public renderer still reads `lib/presence/ggm/editable.ts`** — not the new resolver. Codex must wire `PortfolioRenderer` + `GgmFaithfulRoom` to consume `resolveRenderModel(node, "published")`. Until that wires, the parity guarantee is type-level only; runtime values still flow through the old adapter.
2. **Canvas still reads `lib/editor/canvasModel.ts`** — not the new resolver. Codex must replace `buildCanvasRegistry` with widget instances from `resolveRenderModel`.
3. **No widget library drawer in the UI** — the registry exists but the Canvas left-rail drawer that lists addable widgets is not built.
4. **No per-widget inspector** — selected widgets show the current mini-toolbar only; the full Content/Style/Layout/Motion/Actions inspector is not built.
5. **No font picker** — owners cannot select fonts from the curated registry yet.
6. **No per-token colour picker** — owners can only choose the 3 mood packs.
7. **No drag-reorder in the UI** — `@dnd-kit` isn't installed.
8. **No drag-add from library** — adding a widget is not yet a UI flow.
9. **Heavy-motion cap is invisible** — when heavy motion is off, public output silently downgrades from Canvas preview. The cap needs to be surfaced.
10. **Layout variants (stack, archive-drawer, magazine-spread, masonry, polaroid-wall, carousel)** — declared in the registry / packs but not wired in the GGM renderer. Pilot-hidden until wired.
11. **`invitation_style` switching** — declared in packs but renderer doesn't branch on it yet.
12. **`scene_config.scenes[id].background` treatment** — declared as a token but renderer doesn't branch on it.
13. **Focal-point editor** — token exists in spec, renderer + UI not built.
14. **Asset upload** — still URL-paste only. Editor honestly discloses this.
15. **No undo / redo / element reset** — must be added before paid pilots.
16. **No mobile bottom-sheet inspector** — selection inspector is desktop-only.
17. **No parity matrix test** — `lib/presence/render/parity.test.ts` is a stub. The full widget × token matrix must be authored.
18. **No hosted owner-auth evidence** — local typecheck/build/test only. The resolver + new registries have not been exercised against a real owner session on production.

## Why we shipped the foundation now anyway

The user's direct test correctly identified the detachment as the
P0 problem. Until the foundation (model + resolver + registry +
packs + fonts) exists, every UI improvement happens twice — once
for Canvas, once for public. Now the UI improvements only happen
once, against the shared resolver. The Codex wiring pass is
substantial but mechanical; it doesn't require more design.

## What this pass does NOT regress

- Public GGM Room continues to render via `GgmFaithfulRoom` reading
  `buildGgmEditableModel(node)`.
- Canvas continues to function via `buildCanvasRegistry(config, node)`.
- 11-tab advanced editor unchanged.
- Auth, draft/publish, RoomKey, World forming, non-GGM rooms — all
  unchanged.
- `npm run typecheck` ✓ `npm run build` ✓ no regressions.
