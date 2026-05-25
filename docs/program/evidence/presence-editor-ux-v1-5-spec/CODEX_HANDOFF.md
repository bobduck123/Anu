# Codex Implementation Handoff — Presence Studio Editor UX V1.5

Paste this prompt to Codex verbatim. The spec files referenced are
in `docs/program/evidence/presence-editor-ux-v1-5-spec/`.

## Scope statement

This pass is **UX V1.5** — clarity, calmness, beauty, confidence.
NOT a feature pass.

It must not break the cleared hosted lifecycle: auth, draft save,
private preview, publish, RoomKey published-only, cleanup. Codex
verifies each of those still works after the pass with the existing
Playwright suite.

It must not change:
- backend schema,
- the resolver / widget / option-pack / typography registries (V2
  foundation),
- the public renderer's output for any room,
- the asset validator,
- the auth model,
- the RoomKey route.

## P0 — UX V1.5 required for next operator-led pilot

### P0-1. Simplified editor shell

- File: `components/studio/editor/PresenceStudioEditorApp.tsx`.
- Replace the 12-tab navigation with **5 modes**: Build · Look ·
  Images · Preview · Advanced.
- Build is the default and renders the existing `PresenceCanvasMode`
  (already in repo).
- Look opens a new `LookPanel` (see P0-3).
- Images opens a new `MediaDrawer` (see P0-6).
- Preview opens the existing `PresenceDraftPreviewPage` full-screen
  surface, but with the chrome simplified per `DRAFT_LIVE_CONFIDENCE.md`.
- Advanced becomes a `[···]` overflow that opens an `AdvancedDrawer`
  containing today's 11 tabs + Staff section.
- Layout is left scene rail + central canvas + right inspector +
  bottom mode strip per `INFORMATION_ARCHITECTURE.md`.

### P0-2. New top bar + status strip

- File: new `components/studio/editor/EditorTopBar.tsx` + 
  `components/studio/editor/EditorStatusStrip.tsx`.
- Top bar shows: back arrow, room name, primary action (contextual,
  see `COPY_PACK.md` > Editor header).
- Status strip below the top bar, hairline rule, ONE plain-language
  sentence per state (see `COPY_PACK.md` > Draft/live note).
- Remove the metric row (Renderer / Draft / Published / Last saved)
  from the visible chrome. Move to Advanced > Staff.
- Save state is a small text indicator inside the top bar, not a
  pill.

### P0-3. Look panel (mood + fonts + colours + motion)

- File: new `components/studio/editor/canvas/LookPanel.tsx`.
- Three sections, paper-toned drawer style:
  1. **Mood** — 3 thumbnails (`OPTION_PACKS.filter(p => p.pilotSafe
     && p.publicRendererSupport)`). Click applies via
     `optionPackToConfigPatch` → `mutate()`. Show "Currently
     applied" tick when palette matches.
  2. **Fonts** — 6 font-pack cards from `fontPacksForPilot()`. Each
     shows heading sample + body sample in the pack's families.
     Apply via existing typography mutation.
  3. **Movement** — 4 intensity presets (Still / Gentle / Living /
     Immersive). Immersive shows a one-time confirmation per
     `COPY_PACK.md` > Advanced controls warning.
- Below: **Make your own mood** expandable section with the per-token
  colour pickers (Look > Colours), behind a chevron.
- Below that: **Pick a specific font** expandable section with the
  custom font selectors.
- Below that: **Fine-tune movement** expandable section with the
  per-token motion sliders.
- All disabled / coming-soon controls go in a separate
  `<details><summary>Coming soon</summary>` collapsible section at
  the bottom — visible but not interleaved with live options.

### P0-4. Inline readiness chips

- File: revise `lib/editor/readiness.ts` to emit `canvasAnchor: string`
  per issue (the `data-canvas-id` of the element the issue refers
  to).
- New: `components/studio/editor/canvas/ReadinessChips.tsx` — for
  every critical issue with a `canvasAnchor`, render a small amber
  chip positioned at the top-right of the affected element on the
  canvas. Copy from `COPY_PACK.md` > Readiness chip.
- Remove the readiness ring + percentage + 3 count pills from the
  visible chrome.
- The publish dialog still surfaces "N things to look at" in
  aggregate (use `COPY_PACK.md` > Publish blocked).

### P0-5. New publish flow

- File: revise `components/studio/editor/PublishConfirmDialog.tsx`.
- Replace current dialog with the simpler version per
  `DRAFT_LIVE_CONFIDENCE.md` > Publish confirmation dialog.
- Remove version pills.
- Rewrite all copy per `COPY_PACK.md` > Open to visitors
  confirmation / Publish blocked.
- After publish, show the green success toast per `COPY_PACK.md`
  > Publish success at top-centre, auto-dismiss 4s, link to live
  room.

### P0-6. Media drawer

- File: new `components/studio/editor/canvas/MediaDrawer.tsx`.
- Three source tabs: Your room · Live room · + Upload.
- Renders image cards from `node.editable_config.asset_config.artworks`
  (Your room), `getCanonicalAssetBundle(node)` (Live room), and a
  placeholder OR real upload (depends on backend support).
- Per-image detail panel: large preview + focal-point dot (drag
  writes `asset.focal_point: {x, y}`) + Image role dropdown (Cover,
  Work in the wall, Studio fragment, Portrait) + Alt text + Use this
  image / Restore previous / Remove.
- Copy per `COPY_PACK.md` > Image picker / Upload image /
  Crop/focal point helper / Alt text helper / Media failed state.
- Drawer slides from right on desktop, bottom on mobile.

### P0-7. Visual polish per VISUAL_DESIGN_DIRECTION.md

- Replace editor chrome dark mode with the paper palette
  (`--edit-bg`, `--edit-surface`, etc. from the visual direction
  doc).
- Hairline separators, no heavy borders.
- Editorial sans for chrome, serif room name optional.
- Selection outline: 1px amber dashed + 6px solid handle dots.
- Button hierarchy per the table in the visual direction doc.
- Status banners as hairline strips, not cards.
- Honour `prefers-reduced-motion` everywhere.

### P0-8. Copy replacement

- Apply every string from `COPY_PACK.md`.
- Replace all banned words (`config`, `schema`, `payload`, `asset`,
  `renderer`, `production`, `publish`, etc.) with the approved
  vocabulary.
- Audit every visible string against the COPY_PACK before merge.

### P0-9. Hide / show / staff gate

- Apply every classification from `HIDE_SHOW_STAFF_GATE.md`.
- The 11-tab CRM is reachable ONLY via Advanced drawer.
- Diagnostics + version pills + renderer key are staff-only
  (`?staff=1` URL param OR operator role).
- Heavy motion toggle is hidden; the Immersive preset is the
  only path to it.
- Custom cursor + parallax depth controls removed from V1.5.

### P0-10. Session warming + auth state copy

- File: revise `components/studio/StudioFallbacks.tsx` /
  `useOwnerNode.ts` error surfaces.
- Loading states use the copy from `COPY_PACK.md` > Session warming
  state.
- Auth failures use COPY_PACK > Owner access gate / Non-owner denial.
- Retry states use COPY_PACK > Try again state.
- No raw error strings; no `Network error: 401`.

## P1 — Polish for paid pilots

### P1-1. Mobile bottom-sheet inspector

- Selection on viewports ≤ 920px opens a bottom sheet with the
  inspector content. Drag-handle, swipe to dismiss.

### P1-2. History / Restore clarity

- Inside Advanced > Versions: each entry shows timestamp + one-line
  summary (e.g. "Updated calling card · 3 days ago"). Hover →
  preview the version in canvas. Apply → creates a new draft (not a
  publish).
- "Discard my draft changes" reachable from Advanced > Discard.

### P1-3. Guided first-session checklist

- For brand-new rooms (no draft, no live), show a small floating
  checklist in the top-right of the canvas:
  - ✱ Pick a cover image
  - ✱ Write your invitation
  - ✱ Save your changes
  - ✱ Preview your draft
  - ✱ Open room to visitors
- Each item ticks off as the owner completes it. Dismissable.

### P1-4. Layout thumbnails

- Per-scene Layout picker shows 4 thumbnails per scene type.
- Unwired layouts visible with "Coming soon" chip.
- Selected layout writes `scene_config.scenes[id].layout` and the
  renderer branches on it (renderer branch is V2 / future, but
  the editor wires it now).

### P1-5. Style panel polish

- Hover preview: hovering a mood thumbnail previews the canvas
  with that mood applied without persisting. Mouse-out reverts.
  Click commits.
- Same hover preview for font packs.

### P1-6. Option pack previews

- Each option pack thumbnail in the Look panel renders a tiny
  inline preview of the room with that pack applied (a small
  iframe or a static representative image).
- Reduces decision friction.

### P1-7. Element-level Reset

- Every selection's mini-toolbar gets a `Reset` button that
  restores that element to its mood-pack default.

### P1-8. Save-to-draft micro-flash

- Inline "Saved to draft ✓" feedback next to the element on each
  successful save (1.4s fade).

## P2 — Later (after first paid pilots)

- Real asset upload + crop / aspect-ratio cropper.
- Owner-authored custom moods (`Save this mood as…`).
- Session undo (Cmd-Z, 20-step ring buffer).
- Hover-preview moods across the entire canvas without committing.
- Visitors-mode toggle in Preview (hides editor chrome entirely).
- Template marketplace.
- Per-scene background image upload.

## New files to create

- `components/studio/editor/EditorTopBar.tsx`
- `components/studio/editor/EditorStatusStrip.tsx`
- `components/studio/editor/EditorModeStrip.tsx`
- `components/studio/editor/AdvancedDrawer.tsx`
- `components/studio/editor/canvas/LookPanel.tsx`
- `components/studio/editor/canvas/MediaDrawer.tsx`
- `components/studio/editor/canvas/ReadinessChips.tsx`
- `components/studio/editor/canvas/FocalPointEditor.tsx` (P0-6)
- `components/studio/editor/canvas/ImageDetailPanel.tsx`
- `lib/editor/visualTokens.ts` (CSS custom-prop registry for the new
  paper editor chrome)

## Existing files to revise

- `components/studio/editor/PresenceStudioEditorApp.tsx`
  (rewrite shell, 5-mode IA, mount new components, copy pass).
- `components/studio/editor/PresenceCanvasMode.tsx`
  (clean up, surface inline readiness chips, paper-tone editor chrome).
- `components/studio/editor/PresenceDraftPreviewPage.tsx`
  (chrome simplification per DRAFT_LIVE_CONFIDENCE.md).
- `components/studio/editor/PublishConfirmDialog.tsx`
  (rewrite per COPY_PACK).
- `components/studio/editor/ReadinessPanel.tsx`
  (likely deleted; chips replace it).
- `components/studio/editor/BeforeAfterComparison.tsx`
  (move to Advanced drawer; simplify to a one-line summary in the
  publish dialog body).
- `lib/editor/readiness.ts`
  (add `canvasAnchor` per issue; refactor categories into the
  chip language).
- `lib/api/types.ts`
  (extend `PresenceEditableConfig.asset_config.{slot}` to include
  `focal_point: { x: number; y: number } | null` — backend-safe
  optional field).

## Tests required

- `npm run typecheck` clean.
- `npm run build` clean.
- Existing `tests/e2e/presence-studio-editor.spec.ts` still passes.
- Existing `tests/e2e/first-pilot-ggm.spec.ts` (hosted) still
  passes — UX V1.5 must not regress lifecycle.
- New `tests/e2e/editor-ux-v1-5.spec.ts`:
  - editor opens to Build mode by default
  - top bar shows room name + status + primary action
  - mode strip has exactly 5 modes (Build · Look · Images · Preview
    · `[···]`)
  - clicking title enters in-place edit
  - clicking cover image opens MediaDrawer
  - Look panel mood click updates palette
  - Look panel font pack click updates typography
  - Preview surface renders the draft full-screen with amber chip
  - Publish dialog uses COPY_PACK strings
  - No version pills visible in non-staff mode
  - Diagnostics hidden in non-staff mode

## Evidence required

Create `docs/program/evidence/presence-editor-ux-v1-5-proof/`:

- `README.md`
- `BEFORE_AFTER.md` — screenshots side-by-side: old editor vs V1.5
  for the 8 most-touched surfaces (header, mode strip, inspector,
  preview surface, publish dialog, media drawer, look panel,
  readiness chips).
- `COPY_AUDIT.md` — every visible string in the editor with the
  COPY_PACK source citation.
- `screenshots/` — desktop + mobile of each new surface.
- Pilot test script result (see `PILOT_TEST_SCRIPT.md`).
- `KNOWN_LIMITATIONS.md`.

## Hard safety rules

- **Do not** break the cleared hosted lifecycle.
- **Do not** weaken auth (the new top bar still uses `useOwnerNode`
  unchanged).
- **Do not** add a public draft preview endpoint.
- **Do not** change the asset validator.
- **Do not** ship widgets in P0 (V2 P0 is widget wiring; UX V1.5 is
  visual + IA + copy + media drawer + look panel only).
- **Do not** introduce raw CSS controls as primary UX.
- **Do not** mutate live published config directly.
- **Do not** expose schema field names to owners.

## What not to touch

- `lib/presence/render/*` — V2 foundation, untouched.
- `lib/presence/widgets/registry.ts` — V2 foundation, untouched.
- `lib/presence/option-packs/registry.ts` — V2 foundation, read only.
- `lib/presence/typography/registry.ts` — V2 foundation, read only.
- `components/presence/ggm/*` — public renderer, untouched.
- `app/(public)/*` — public routes, untouched.
- `app/(public)/r/[token]/page.tsx` — RoomKey, untouched.
- Backend `api/presence/*` — no schema changes.
- Kimi bundle remains rejected.

## Do not claim

- "Ready for paid pilots" — that's the operator's call after the
  pilot test.
- "Hosted verified" without re-running the cleared hosted lifecycle
  smoke and presenting the result.
- "Direct manipulation complete" — UX V1.5 raises the editor from
  Level 2.5 to Level 3.5; Level 4 needs widget drag + drag-add
  which are V2 P0 (separate pass).

## Final report format

Codex returns:

1. What changed (file diffs summarised).
2. What was added.
3. What was removed/retired.
4. Copy audit — % of editor strings sourced from COPY_PACK.
5. Tests run + results.
6. Hosted lifecycle still passing? Y/N.
7. Pilot test script run? Result?
8. Before/after screenshot pairs.
9. Known limitations.
10. Recommendation: V1.5 ships? Y/N. If N, exactly what blocks.
