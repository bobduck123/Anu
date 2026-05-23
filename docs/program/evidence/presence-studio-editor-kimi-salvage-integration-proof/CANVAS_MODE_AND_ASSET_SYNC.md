# Canvas Mode + Canonical Asset Sync

Date: 2026-05-24
Pass: addresses the two issues raised against the live editor —
(a) the editor reports "0 visible works" while the live room renders
8 canonical artworks; (b) the editor feels like a CRM, not a canvas
the owner can paint on.

## Issue 1 — Editor reported zero assets while the live room had art

### Root cause

The live `/p/ggm-christina-goddard` room renders 8 canonical GGM
artworks because the `GgmFaithfulRoom` renderer falls back to the
hard-coded `GGM_WORKS` array in `lib/presence/ggm/source.ts` when the
backend `node.works` is empty.

The editor reads `editable_config.asset_config.artworks` exclusively
to know "how many works are in this room". Because nothing has ever
seeded those artworks into the editable config, the editor's
readiness panel correctly reports "Primary artwork or hero image is
missing" and "Work Wall is empty" — even though both are visible to
visitors. The owner sees an editor that contradicts the live room.

### Fix

Added `lib/editor/canonicalAssets.ts`:

- `getCanonicalAssetBundle(node)` — returns the canonical asset set
  the renderer would draw. For the GGM renderer it returns the 8
  `GGM_WORKS` artworks + the Willow of Port Arthur hero. For any
  other room it returns the published `node.works` if non-empty.
- `isAssetConfigEmpty(config)` — true when both `hero_image.url` and
  `asset_config.artworks` are empty.
- `applyCanonicalBundle(config, bundle)` — merges the canonical
  artworks into `asset_config.artworks` AND `content_config.works`
  (the readiness panel and renderer both read this mirror) AND seeds
  the Work Wall scene's `artwork_order` if missing.

Wired into `PresenceStudioEditorApp.tsx`:

- After config loads, if `isAssetConfigEmpty(config)` AND a canonical
  bundle exists, a banner appears in the editor header:

  > Your live room is rendering 8 canonical GGM artworks that aren't
  > yet in your editable config. Sync them now so the editor reflects
  > what visitors see — then you can edit, reorder, or replace them.
  > **[Sync from live room]**

- The banner is amber, not red — this isn't an error, it's a
  one-click action.
- The same banner is mirrored in the Canvas mode's right rail so the
  owner sees it whichever entry point they used.
- After sync, the editor sees the 8 artworks, the readiness panel
  drops the "missing" warnings, the Work Wall tab shows the works
  inline-editable, and a draft save persists them through the
  existing `patchPresenceEditorDraft` → backend pipeline.
- After publish, the public renderer will render those works from
  the editable config (preferred) rather than the canonical fallback
  — meaning the owner's edits (rename, reorder, remove) will be
  reflected publicly. Renderer fallback to canonicals remains as a
  safety net.

### Scope of the fix

- GGM renderer: full coverage. All 8 artworks, hero, work-wall
  artwork order, content_config.works mirror, all seeded.
- Non-GGM rooms whose backend exposes `node.works`: same path is
  used to import them. Owners of a backend-seeded room can sync the
  public works into their editable config without manual entry.
- Rooms with neither canonical art nor `node.works` (greenfield
  rooms): no banner is shown — the existing "create your first work"
  flow remains the right path.

### What this does not fix

- This is a sync action, not a two-way binding. If the underlying
  canonical changes (e.g. a future GGM artwork is added), the owner
  must re-sync. We'll add a "live source updated" notice in a future
  pass when there's a need.
- This does not yet replace the renderer's canonical fallback. We
  could remove the renderer fallback now that the editor can seed —
  but leaving it in place is safer (any room whose owner has never
  saved still renders correctly).

## Issue 2 — Editor felt like a CRM, not a canvas

### Root cause

The editor presents 11 tabs of form controls in a dark dashboard
shell. Even with the recent improvements (readiness panel, diff
panel, full-screen preview), the entry point is still a form-driven
backend-shaped tool. The owner doesn't see their room as they edit;
they see a tree of config fields.

### Fix

Added `components/studio/editor/PresenceCanvasMode.tsx`:

A new tab placed FIRST in the tab list and made the **default
active tab** when the editor opens. The canvas mode is composed of
two columns:

**Left column** — a live preview of the owner's draft room rendered
through `PortfolioRenderer` exactly as the public route would render
it (with `status: "published"` substituted so the renderer doesn't
short-circuit on the draft status flag). Click-to-edit affordances
are overlaid on the things the owner can change:

- Hero title (bottom-center on the artwork) → "Edit room title"
- Hero caption → "Edit caption"
- Cover image → "Replace cover"
- Bottom dock with three jump-links: "Edit work wall", "Edit
  studio", "Edit calling card" (each opens the corresponding deep
  editor tab).

Each affordance is invisible at rest and only glows on hover/focus
(dashed amber border + 15% amber fill) so the canvas reads as the
room first, the editor second.

**Right column** — a quiet rail with three cards:

1. **Live-room sync banner** (when applicable) — same canonical asset
   sync described above.
2. **Pick a mood** — visual swatches for the three Room DNA presets
   (Paper Gallery, Ink Room, Liquid Signal). Clicking a swatch
   immediately applies the preset palette + motion tokens through
   `applyRoomDnaPreset(draft, preset)` and the canvas updates in
   place. No form, no typography stack selector at first contact.
3. **Words on the canvas** — six inline rows (About title,
   Statement, Biography, Process notes, Calling card copy,
   Invitation) showing the current value or a placeholder. Clicking
   any row opens a focused edit drawer with a labelled textarea (or
   single-line input) and Save/Cancel. Save flows through the same
   `mutate()` pipeline as the rest of the editor — the readiness
   panel updates, the dirty flag turns on, the diff panel sees the
   change, the publish dialog gates correctly.
4. **Save & open** — three buttons: Save draft / Open room to
   visitors / Open advanced controls (drops the user into the 11-tab
   editor for power users).

Cover image replacement opens the same edit drawer with an honest
copy block:

> Paste a public https image URL. Upload from disk is coming next
> pass — for now, host your image on a public URL (Cloudinary,
> Supabase storage, your own website) and paste it here.

### What the canvas mode does NOT do (yet)

- It does not drag-drop / drag-reorder works on the Work Wall scene.
  The dock provides a jump-link to the deep Work Wall tab for that.
- It does not let the owner click directly on a work title in the
  Scene-2 wall to rename it. Scene 02 still routes to the deep tab.
  (The hero scene's title is editable inline.)
- It does not implement upload. The honest URL-paste flow remains;
  this is documented in `KNOWN_LIMITATIONS.md`.
- It does not change the publish flow. Same readiness gating, same
  comparison panel, same confirmation dialog.

### How it changes the first impression

| Before | After |
|---|---|
| Editor opens to "Overview" tab — text-heavy preamble + status metrics + the 11-tab nav | Editor opens to "Canvas" tab — live room preview filling the left column, mood swatches + words rail on the right |
| Owner has to learn 11 sections before they can change anything | Owner can click the title and rename it in 5 seconds |
| Style DNA = 9 hex inputs + 2 typography selects + 6 disabled controls | Mood = 3 swatches at first contact; the full grid is one click away ("Open advanced controls") |
| Asset edits = navigate to Assets tab → URL form → attach | Cover image = click the cover in the canvas → paste URL |
| Calling card copy = navigate to Calling Card tab → text field | Calling card copy = click the row in the right rail → drawer |

The 11-tab editor remains intact, addressable by URL hash and by the
"Open advanced controls" button. Power users lose nothing; new users
no longer have to start there.

## Files changed in this pass

- **Added**:
  - `presence-app/lib/editor/canonicalAssets.ts`
  - `presence-app/components/studio/editor/PresenceCanvasMode.tsx`
- **Edited**:
  - `presence-app/components/studio/editor/PresenceStudioEditorApp.tsx`
    (added `canvas` tab id, made it the default, wired the canonical
    sync banner + handler, mounted the canvas tab).

## Tests run

- `npm run typecheck` — clean
- `npm run build` — clean (50 routes; no GGM regression)

## Hosted verification still required

- Owner opens `/studio/[ggm_id]/editor` on hosted and lands on the
  Canvas tab.
- Canvas shows the live draft room.
- Banner appears: "8 canonical artworks aren't yet in your editable
  config".
- Clicking "Sync from live room" populates the artworks and the
  Work Wall tab reflects them.
- Clicking the hero title in the canvas opens the edit drawer.
- Editing → save draft → preview → publish → public room reflects
  the edit.
- Mood swatch click updates the canvas immediately.
- Non-GGM rooms still load without canvas-mode contamination (the
  canvas just renders whichever renderer the node's renderer_key
  resolves to via `PortfolioRenderer`).

## Honest residual gaps

- Direct in-canvas drag-reorder of works.
- In-canvas swap of an individual work image without going through
  the URL drawer.
- Real image upload (honest URL-paste remains the only path).
- Live-source-changed notice when canonical assets are updated in
  source code.
- Canvas mode does not yet show readiness inline; the right rail
  shows the "Save & open" actions but not the issue list. A future
  pass should surface the top critical issue inline on the canvas
  (e.g. a small amber chip next to the affected element).

## Recommended next pass

- Add a small "fix this" chip next to canvas elements that have a
  critical readiness issue (e.g. "Missing alt text" chip next to the
  hero image affordance).
- Add drag-reorder for the work wall when the user is on the canvas.
- Promote the canvas-mode pattern into the proposed
  `lib/presence/custom-dna/` shared kit so the next custom-Presence
  pilot inherits it.
