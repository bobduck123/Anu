# Codex Implementation Handoff — Presence Canvas Builder v2

This is the prompt to give Codex. Paste it verbatim.

## What Claude already built

- `lib/presence/render/model.ts` — `PresenceRenderModel` types (palette, typography, motion, scenes, widgets, works, hero, room-key, element styles, provenance summary).
- `lib/presence/render/resolver.ts` — `resolveRenderModel(node, "published" | "draft")`. GGM-aware + generic fallback. 6 parity tests pass.
- `lib/presence/widgets/registry.ts` — 17 widget definitions with category, support state, pilot visibility, inspector capabilities, allowed scenes.
- `lib/presence/option-packs/registry.ts` — option pack schema + 4 packs (Paper Gallery, Ink Room, Warm Archive, Liquid Signal). 3 pilot-safe.
- `lib/presence/typography/registry.ts` — 12 fonts (4 system, 8 Google) + 6 font packs. License-safe.

`npm run typecheck` ✓ `npm run build` ✓ `node --test lib/presence/render/resolver.test.ts` ✓ 6/6.

## What Codex must do next

### P0 — Wiring pass (without this, the foundation is unused)

1. **Wire the public renderer to the resolver.**
   - In `components/portfolio/PortfolioRenderer.tsx`: call `resolveRenderModel(node, "published")` once at the top of the dispatch.
   - When the resolved `model.identity.rendererKey === "ggm-faithful-room-v1"`, render `<GgmFaithfulRoom node={node} model={model} />`. Otherwise fall back to the existing DNA renderer chain.
   - Update `GgmFaithfulRoom` to accept the optional `model: PresenceRenderModel` prop. When provided, prefer it over calling `buildGgmEditableModel(node)`. When absent (older callers), keep current behaviour.
   - Then update `GgmStage` + scene components to read fields off `model` instead of off the GGM-specific `GgmEditableModel`. The two shapes should converge.
   - **Delete** `lib/presence/ggm/editable.ts` after `GgmFaithfulRoom` reads only the resolver model. Tests should still pass.

2. **Wire the Canvas to the resolver.**
   - In `components/studio/editor/PresenceCanvasMode.tsx`: replace `buildCanvasRegistry(config, node)` with `resolveRenderModel({ ...node, editable_config: { ...config, status: "draft" as const } }, "draft")`.
   - Re-derive the canvas selection registry FROM `model.scenes[i].widgets` — each widget instance becomes a selectable entry with `canvasId = widget.id`, `kind` mapped from `widget.type`, and `controls` derived from `widget.config` + `WIDGET_DEFINITIONS[widget.type].inspector`.
   - Render each widget by switching on `widget.type` and dispatching to the GGM scene-component children. The Canvas no longer renders an ad-hoc `PortfolioRenderer` wrapper — it renders the same widget chain that the public renderer renders. (Acceptable interim: keep using `PortfolioRenderer` for the canvas preview surface, but always pass the resolver model through it.)
   - **Delete or shrink** `lib/editor/canvasModel.ts` after Canvas reads only the resolver model. The mood preset application + reorder helpers can move to `lib/editor/canvasMutations.ts`.

3. **Remove the heavy-motion silent cap.**
   - `GgmMotionContext.tsx` lines ~160-170 silently clamps owner motion settings when `heavyMotion === false`. This makes Canvas preview disagree with public output.
   - Replace with: when `heavyMotion === false`, the resolver returns motion tokens clamped to safe values, AND the Canvas inspector surfaces the cap visibly ("Heavy motion is off — preview shows the safe ceiling.").
   - Owner-toggleable in the Motion inspector for advanced packs only.

### P0 — Canvas widget drawer

4. **Build `components/studio/editor/canvas/WidgetLibraryDrawer.tsx`.**
   - Left rail in the Canvas, collapsible.
   - Lists widgets from `listWidgetsForPilot()` grouped by `category`.
   - Each widget item: thumbnail (use a Lucide icon as placeholder), label, `hint`, and a small chip:
     - `live` widgets → no chip
     - `coming-soon` widgets → "Coming soon" chip, click disabled
     - `advanced` widgets → require "Show advanced" toggle
   - Clicking a live widget inserts it into the currently-selected scene at the end of that scene's widget list. Uses a new `addWidgetToScene(config, sceneId, type)` mutation in `lib/editor/canvasMutations.ts`.
   - Drag-into-canvas (via `@dnd-kit/core`) is P0 for the work-wall and calling-card scenes; P1 for everything else.

### P0 — Per-widget inspector

5. **Build `components/studio/editor/canvas/WidgetInspector.tsx`.**
   - Right rail, replaces the current "right card" content when a widget is selected.
   - Tabs: Content / Style / Layout / Motion / Actions — show only the tabs that `WIDGET_DEFINITIONS[widget.type].inspector` enables.
   - **Content tab**: text inputs / asset pickers for each `widget.config` field.
   - **Style tab**: text-size / text-weight / colour-token / alignment / font-mood per-element override + font picker (curated families from `lib/presence/typography/registry.ts`).
   - **Layout tab**: scene layout token picker (for scene-level selections) + widget-specific layout (e.g. work-wall: gallery-wall / stack / film-strip / archive-drawer).
   - **Motion tab**: intensity preset (Still / Gentle / Living / Immersive (advanced)) + the cap warning if heavy-motion-off.
   - **Actions tab**: invitation style picker for invitation widgets; destination / label.
   - Every change flows through the existing `mutate()` pipeline and shows a "Saved to draft ✓" micro-flash.

### P0 — Font picker

6. **Build `components/studio/editor/canvas/FontPicker.tsx`.**
   - Two surfaces:
     - Quick: 6 font-pack thumbnails from `fontPacksForPilot()`. Click applies pack tokens to `style_dna.typography.heading_stack / body_stack / font_pack_id`.
     - Custom: dropdown of fonts from `fontsForPilot()` for heading and body separately. Live preview line.
   - Add a `<FontLoader>` server component that reads `fontLoaderHref(headingFontId, bodyFontId)` and injects a `<link rel="stylesheet">` when needed. Render it inside `GgmFaithfulRoom` (and any other room renderer that consumes the typography tokens).

### P0 — Per-token colour picker

7. **Build `components/studio/editor/canvas/PalettePicker.tsx`.**
   - 8 colour tokens (bg / paper / paper-warm / ink / muted / line / stage / accent).
   - Each token: swatch + hex input.
   - Live preview through the resolver — Canvas reflects immediately.
   - "Reset to pack default" reverts to the active `OptionPack.palette[token]`.

### P0 — Option pack picker

8. **Build `components/studio/editor/canvas/OptionPackPicker.tsx`.**
   - Lists `optionPacksForPilot()` as swatch + label + description cards.
   - Apply button calls `optionPackToConfigPatch(pack)` and merges into the draft config.
   - Advanced section under "Show advanced packs" toggle lists `allOptionPacks().filter(p => p.advancedOnly)`.

### P0 — Drag-reorder via dnd-kit

9. **Add `@dnd-kit/core` + `@dnd-kit/sortable` to `package.json`**.
10. **Wire drag-reorder for**:
    - Work wall: `model.scenes.find(s => s.id === "wall").widgets.find(w => w.type === "work-wall").config.works` — reorder writes to `scene_config.scenes[wall].artwork_order` + mirror `content_config.works`.
    - Calling-card lines: `widget.config.externalLinks` reorder writes back to `content_config.contact.external_links`.
    - Studio fragments: `widget.config.fragments` reorder writes to `content_config.about.strands`.
    - Keyboard reorder via Space/Arrows/Space — accessible from the inspector.

### P1 — Parity tests

11. **Build `lib/presence/render/parity.test.ts`** that, for every supported widget type:
    - Sets a representative draft value.
    - Asserts the resolver returns the same value with `provenance: "authored"`.
    - Asserts the rendered DOM (via `@testing-library/react`) contains the value.
    - Asserts a published config round-trip (draft → publish → public render) reflects the value.
12. **Build a Playwright e2e** `tests/e2e/canvas-builder-parity.spec.ts` that exercises the full lifecycle: select widget → edit → save → preview → publish → public reflects.

### P1 — Polish

13. Add an "Add scene" affordance behind the advanced toggle (scene `hidden` / `duplicate` / `reorder`).
14. Add image focal-point editor (drag dot over preview, writes `asset.focal_point`).
15. Session undo (Cmd-Z, 20-step ring buffer).
16. Pilot feature flag (`?pilot=1`) that hides the 11-tab advanced editor entirely.

## Hard safety rules

- **Do not** mutate live `editable_config` directly. Every change is a draft mutation; publish goes through the existing `PublishConfirmDialog` only.
- **Do not** add a public draft preview endpoint.
- **Do not** expose draft config through any non-authenticated route.
- **Do not** introduce `config_json` flat schema. The nested `PresenceEditableConfig` stays.
- **Do not** show widgets to pilots whose `pilotVisibility !== "pilot"`.
- **Do not** ship widgets whose `support !== "live"` to public renderer.
- **Do not** bundle font binaries. System and Google CDN only.
- **Do not** allow freeform absolute-position widgets — only constrained reorder within a scene.
- **Do not** weaken the asset validator (`lib/editor/assetValidator.ts` rules stand).

## What not to touch

- `lib/presence/render/model.ts` — extend only with new tokens / widget types.
- `lib/presence/render/resolver.ts` — extend with new renderer-key dispatches; do not change the public contract.
- `lib/presence/widgets/registry.ts` — add new widgets but do not change existing widget IDs.
- The Kimi bundle remains rejected.
- The public route assertion (`status === "published"` server-side check) must stay.

## Evidence required

Create `docs/program/evidence/presence-canvas-builder-v2-wired-proof/`:

- `README.md`
- `WIRING_COMPLETE_REPORT.md` — proof PortfolioRenderer + Canvas both call the resolver.
- `PARITY_MATRIX.md` — every widget × every token × Canvas/preview/public column with ✓/✗.
- `screenshots/` — Canvas + widget drawer + inspector + font picker + palette picker + option pack picker + drag-reorder before/after + mobile bottom sheet + reduced motion.
- Hosted owner-auth proof of the full lifecycle:
  - login → editor → Canvas → add widget → edit text → change font → change palette → drag-reorder work → preview → publish → public room reflects all changes.
- `KNOWN_LIMITATIONS.md`.

## Tests required

- `npm run typecheck`
- `npm run build`
- `node --test --experimental-strip-types lib/presence/render/*.test.ts`
- `node --test --experimental-strip-types lib/presence/widgets/*.test.ts` (add tests for registry consistency)
- `npx playwright test tests/e2e/canvas-builder-parity.spec.ts`
- `npx playwright test tests/e2e/presence-studio-editor.spec.ts` (no regression)
- `npx playwright test tests/e2e/first-pilot-ggm.spec.ts` (hosted)

## Do not claim

- "Ready for paid pilots" — that's the operator's call after they see hosted evidence.
- "Hosted verified" without real owner screenshots + curl outputs.
- "Drag works on mobile" without a Playwright touch-event test.
- "Parity guaranteed" without the matrix in `PARITY_MATRIX.md` showing ✓ for every widget × token combination.

## Final report format

Codex must return:

1. What was wired (file diffs summarised).
2. What was added.
3. What was removed/retired.
4. Tests run + results.
5. Hosted evidence captured.
6. Parity matrix completion (% complete).
7. Pilot-readiness verdict (Canvas-only path can a non-technical owner complete in ≤30 min without Emad touching the keyboard).
8. Remaining gaps with severity.
9. Known limitations.
10. Recommendation: friendly pilot ready Y/N.
