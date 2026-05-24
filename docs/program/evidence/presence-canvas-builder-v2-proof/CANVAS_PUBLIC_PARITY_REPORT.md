# Canvas / Public Parity Report

Date: 2026-05-24
Reviewer: Claude

## Verdict

The owner's direct test is correct: **Canvas and public Presence are
not consuming the same data.** They are two adapters reading the same
config through different field-resolution chains.

## Where the detachment lives (precise code paths)

| Symptom | Canvas reads | Public reads | Detachment |
|---|---|---|---|
| Title on artwork field | `getCanvasText("hero-title")` → `sceneText("artwork_field","title") || node.hero_title || node.display_name` (canvasModel.ts:295) | `text(artworkScene.title) || text(content.hero_title) || GGM_ARTIST.heroTitle` (editable.ts:84) | **Public falls back to a renderer constant** that Canvas never sees. Owner saves nothing for title → Canvas shows `node.display_name`, public visitors see `GGM_ARTIST.heroTitle`. |
| Biography | `contentText(["about","biography"]) || node.bio || node.short_bio` (canvasModel.ts:303) | `text(about.biography) || node.bio || GGM_ARTIST.aboutIntro` (editable.ts:101) | Same pattern — `GGM_ARTIST.aboutIntro` is invisible to Canvas. Owner sees "(empty)", visitors see Christina's canonical bio. |
| Calling card copy | `contentText(["contact","contact_copy"])` (canvasModel.ts:309) | `text(contact.contact_copy) || "Use the Presence enquiry form to begin a conversation."` (editable.ts:115) | Public has a hard-coded fallback string that Canvas can't surface or override. |
| Hero image | `getCanvasImage("hero-image")` reads `asset_config.hero_image.url` | `applyHeroImage(slides, assetConfig)` reads same field but then layers it over the canonical `GGM_HERO_SEQUENCE` (editable.ts:217-244) | Sequence ordering different — Canvas shows the hero URL; public shows the URL + 4 more canonical artworks the Canvas doesn't list. |
| Work wall | Canvas registers `work-image:<slug>`, `work-title:<slug>`, `work-caption:<slug>` per work in `asset_config.artworks` (canvasModel.ts:253-288) | `buildGgmWorks` falls back through `asset_config.artworks → content_config.works → node.works → GGM_WORKS` (editable.ts:151-166) | If the editable config has zero artworks, Canvas registry is empty (0 editable works) but public still renders 8 GGM_WORKS. The canonical-asset-sync banner exists for this but the inconsistency is the bug, not the fallback. |
| Practice statement | Canvas `contentText(["about","artist_statement"])` (canvasModel.ts:299) | Public `text(about.artist_statement) || GGM_ARTIST.statementQuote` (editable.ts:108) | Same canonical-fallback gap. |
| Roomkey provenance chip | Canvas does not expose this field (no `getCanvasText` case) | Public reads `text(roomkey.provenance_chip_text) || text(artworkScene.roomkey_provenance_text) || null` (editable.ts:132-137) | **Field rendered publicly is completely uneditable from Canvas.** Owner can't customise it through the canvas. |
| Per-element text styles | Canvas writes `style_dna.element_styles[id]` and reads them back via `getCanvasTextStyle` | Public reads them via `buildElementStyles(styleDna, works)` (editable.ts:320-340) | Same path — this actually works. But the IDs differ: Canvas registers `hero-title` / `hero-caption` / `main-statement`, while editable.ts hard-codes its own list of element IDs that includes per-work IDs Canvas may not emit. |
| Motion settings | Canvas applies via `applyCanvasMotion(draft, preset)` writing `motion_config.*` (canvasModel.ts:543) | Public reads `motion_config.*` via `buildMotion` (editable.ts:285-301) | Path agrees. But Canvas writes the underlying numeric tokens (liquid_intensity, distortion_scale) only when a preset is applied — there is no per-token Canvas control. |
| Heavy motion | Canvas `CANVAS_MOOD_PRESETS` ink/paper/warm all set `heavy_motion_enabled: false` (canvasModel.ts:78-180) | Public `buildMotion` reads `heavy_motion_enabled` then `GgmMotionContext.effective` caps motion further when false (GgmMotionContext.tsx:160-170) | **The cap means even when an owner sets liquidIntensity=0.95 via a custom mood, the public renderer silently clamps it to ≤0.58.** Canvas preview shows 0.95; visitors see 0.58. |
| Fonts | Canvas exposes no font picker — only the `fontMood` token (editorial/display/soft/mono) | Public reads `style_dna.typography.heading_stack` / `body_stack` literally | **Owner cannot change the actual font** through Canvas. The `fontMood` preset maps to CSS font-family stacks inside `textStyleCss`, but the room-level typography stack is uneditable. |
| Colour palette | Canvas applies via `CANVAS_MOOD_PRESETS.palette` (canvasModel.ts:84-92) | Public reads the same `style_dna.palette.*` fields | Path agrees — but Canvas has only 3 mood presets and no per-token picker. The owner cannot say "I want a darker accent" without applying a different mood. |
| Background per scene | Canvas has no control | Public reads `style_dna.background_treatment` but the renderer doesn't branch on it yet | Coming-soon control that already has a written field — visible to the owner in Style DNA tab but documented as coming-soon. |

## Resulting confusion (the user's lived experience)

1. Open editor. Canvas reports "0 visible works" / "biography missing". Public room renders 8 artworks + a 4-paragraph biography.
2. Click an "Edit biography" affordance. Type. Save. Open public room. **Bio reflects.** ✓ (one of the few fields that survives.)
3. Click "Add an artwork". Open Assets tab. No upload. Paste URL. Some URLs blocked by validator. Eventually attach. Save. Open Canvas — work shows. Open public room — work still shows alongside the 8 canonical works. **Now there are 9.** Canvas doesn't surface the canonical 8 — owner can't reorder or remove them.
4. Change Mood to "Liquid Signal" in the v3 Canvas. Mood applies. Liquid is supposed to be intense. Open public room — **liquid is gentle**, because the heavy-motion cap silently downgrades.
5. Try to change the actual font face. **No control exists.**
6. Try to customise the calling-card copy without using a deep tab. The current Canvas can do this via the inline drawer; but Roomkey chip text is uneditable from Canvas.

This is the detachment.

## Why a "shared resolver" fixes it

Both Canvas and public renderer call `resolveRenderModel(node, mode)`
where `mode` is `"published"` (public) or `"draft"` (Canvas, drafting
against `node.editable_config` which carries `status: "draft"`).

The resolver returns a `PresenceRenderModel`:

- One source of truth for every field.
- Every field carries `provenance: "authored" | "node" | "canonical"`
  so Canvas can render a small badge ("Room default") next to values
  the owner hasn't authored — eliminating the "I see one thing,
  visitors see another" surprise.
- The resolver decides fallback order — no more divergent chains
  between the two adapters.
- The resolver returns a flat list of `WidgetInstance`s per scene —
  the renderer renders the widgets, the Canvas inspects them.
  Whatever the widget says appears the same way in both surfaces.

## What the resolver currently does (this pass)

`lib/presence/render/resolver.ts` ships with:

- `resolveRenderModel(node, "published" | "draft")` returning a full
  `PresenceRenderModel`.
- GGM-aware adapter that reads the existing editable_config shape and
  emits 4 scenes × widget instances with provenance flags.
- Generic fallback for non-GGM renderers.

6 parity tests pass (`lib/presence/render/resolver.test.ts`):
- empty node → canonical fallback model with `empty: true`
- draft mode picks up status: "draft" config
- published mode rejects draft config
- authored palette overrides node fallback with `provenance: "authored"`
- widget provenance correctly distinguishes authored vs canonical
- non-GGM renderer falls through to generic model without throwing

## What is NOT yet done

The resolver exists but the public renderer and Canvas still call
their separate adapters. The Codex handoff (see CODEX_HANDOFF.md)
specifies the exact wiring pass:

- `PortfolioRenderer` → call `resolveRenderModel(node, "published")`
  and render widgets from `model.scenes[i].widgets`.
- `PresenceCanvasMode` → call `resolveRenderModel({ ...node, editable_config: draftConfig }, "draft")`
  and present widget instances + the new widget library drawer +
  per-widget inspector.

Until those wiring changes land, the resolver is a contract test, not
a runtime guarantee.
