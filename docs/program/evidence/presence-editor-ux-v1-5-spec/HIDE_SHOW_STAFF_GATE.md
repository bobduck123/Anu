# Hide / Show / Staff-Gate — Presence Studio Editor V1.5

For every existing editor surface, this table assigns a visibility
classification. Codex applies these decisions in the V1.5
implementation pass.

## Classification key

| Classification | Meaning |
|---|---|
| **Show to owner** | Visible in the default editor view. |
| **Hide behind More** | Visible only when the owner opens an Advanced drawer or "More …" toggle. |
| **Staff-only** | Visible only when `?staff=1` URL param OR the user has an operator role. |
| **Hide until later** | Removed from V1.5; will return in a later pass with redesign. |
| **Rename/simplify** | Visible, but renamed and simplified per the COPY_PACK. |
| **Keep but soften** | Visible, but de-emphasised (smaller, tertiary, or moved to status strip). |

## Classification table

| Surface | V1.5 classification | Notes |
|---|---|---|
| **Advanced editor (the 11 tabs)** | Hide behind More | Reachable via `[···]` overflow in mode strip. Opens drawer titled "Advanced controls". |
| **Diagnostics / debug panel** | Staff-only | Renderer key, schema version, raw JSON. Inside Advanced > Staff. |
| **Raw image URL input** | Hide behind More | Reachable inside the Upload tab of the media drawer, under "Paste a URL". |
| **Asset slot dropdown** | Hide until later | Replaced by Image role labels in the per-image detail panel. |
| **Font picker (quick)** | Show to owner | Look > Fonts. 5 packs visible. |
| **Font picker (specific font selector)** | Hide behind More | "Pick a specific font" inside Look > Fonts. |
| **Custom font upload** | Hide until later | P2. |
| **Font packs** | Show to owner | 5 pilot-safe packs. Advanced packs behind "Show advanced". |
| **Palette quick swatches** | Show to owner | 4 swatches per mood. |
| **Palette custom hex pickers** | Hide behind More | "Make your own mood". |
| **Option pack picker (pilot-safe)** | Show to owner | 2 packs visible (Paper Gallery, Ink Room). |
| **Option pack picker (advanced)** | Hide behind More | "Show advanced moods". |
| **Motion presets (Still / Gentle / Living)** | Show to owner | Look > Movement. |
| **Motion preset (Immersive)** | Hide behind More | Requires explicit "Try heavy motion" confirm. |
| **Motion per-token sliders** | Hide behind More | "Fine-tune movement". |
| **Heavy motion toggle** | Hide until later | Folded into Immersive preset only. |
| **Custom cursor toggle** | Hide until later | P1; not wired. |
| **Parallax depth slider** | Hide until later | P1; not wired. |
| **Gallery layout (wall) — gallery-wall** | Show to owner | Live. |
| **Gallery layout (wall) — stack, film-strip, archive-drawer, etc.** | Show to owner with "Coming soon" chip | Visible in the layout thumbnail picker, disabled. |
| **Widget library drawer (pilot-safe widgets)** | Hide until later | Codex V2 P0 — but V1.5 ships without it; UX V1.5 focuses on direct-on-canvas editing of the widgets already present. |
| **Widget library drawer (advanced widgets)** | Staff-only | When library lands. |
| **Media library (Your room + Live room tabs)** | Show to owner | Default in Images mode. |
| **Media library (Upload tab)** | Show to owner | Honest "Coming soon" placeholder when backend uploader is missing. |
| **Crop / focal point editor** | Show to owner | Inside per-image detail panel. P0 since the focal-point dot is simple. |
| **Crop (aspect-ratio cropper)** | Hide until later | P1. |
| **Readiness score (percentage gauge)** | Hide until later | Replaced by inline chips. |
| **Readiness chips (inline on canvas)** | Show to owner | Per-element, contextual. |
| **Readiness improvement tips list** | Hide until later | Folded into chip copy. |
| **Draft / live comparison panel (full JSON diff)** | Staff-only | Owners get a one-line summary in the publish dialog ("4 changes since last opened"). |
| **Publish confirmation dialog** | Show to owner | Rewritten per COPY_PACK. |
| **Version history (raw)** | Staff-only | Advanced > Versions for owners shows timestamps and one-line summaries; raw versions are staff. |
| **Restore an earlier version** | Hide behind More | Advanced > Restore. |
| **Rollback (raw)** | Staff-only | Owners see "Restore an earlier version". |
| **RoomKey copy controls** | Hide behind More | Advanced > RoomKey. Most pilots won't touch this. |
| **Public link / QR controls** | Hide behind More | Advanced > Sharing. |
| **Mobile preview toggle** | Show to owner | Inside Preview mode. |
| **Mobile editing** | Show to owner | Bottom-sheet inspector. P0 surface; P1 polish for drag-reorder. |
| **Sign-out** | Show to owner | Top-right menu. |
| **Studio dashboard back-arrow** | Show to owner | Top-left of top bar. |
| **Save Draft button (header)** | Rename/simplify | Contextual primary action — only when needed, label varies. |
| **Preview panel button (header)** | Hide until later | Replaced by the Preview mode tab. |
| **Full preview button (header)** | Rename/simplify | Single Preview action. |
| **Open room button (header)** | Show to owner | Contextual primary action. |
| **Public Room link (header)** | Keep but soften | Becomes `[ View live room ↗ ]` in the success toast + Advanced > Sharing. |
| **Unsaved changes chip (header)** | Rename/simplify | Becomes "Unsaved" inline in top bar. |
| **Readiness 47% chip (header)** | Hide until later | Replaced by inline chips. |
| **Desktop/Mobile toggle (header)** | Hide until later | Replaced by toggle inside Preview mode. |
| **Pilot mode banner ("Emad is your co-pilot")** | Keep but soften | Single line in the status strip when `?pilot=1`. |
| **Renderer status metric** | Staff-only | Advanced > Staff. |
| **Draft / Published / Last saved metrics** | Rename/simplify | Replaced by the status strip's plain-language line. |
| **History/Rollback tab** | Hide behind More | Advanced > Versions. |
| **Overview tab** | Hide until later | The Build mode is the new Overview. |
| **Calling Card tab** | Hide until later | Reachable via canvas selection of the calling card. |
| **Style DNA tab** | Rename/simplify | Becomes Look mode. |
| **Motion / Texture tab** | Rename/simplify | Folded into Look > Movement. |
| **Assets tab** | Rename/simplify | Becomes Images mode + media drawer. |
| **RoomKey tab** | Hide behind More | Advanced > RoomKey. |
| **History / Rollback tab** | Hide behind More | Advanced > Versions. |
| **Scenes tab** | Hide until later | Scene navigation lives in the left scene rail in Build mode. |
| **Work Wall tab** | Hide until later | Reachable via canvas selection of the wall scene. |
| **Practice / About tab** | Hide until later | Reachable via canvas selection of the studio scene. |

## What this leaves visible

**To owners by default:**

1. Top bar — back, room name, live status, save state, primary action.
2. Status strip — one plain-language sentence.
3. Scene rail (left) — 4 scenes.
4. Canvas — the room.
5. Inspector (right) — contextual to selection.
6. Mode strip — Build · Look · Images · Preview.
7. `[···]` Advanced — drawer access.

**To operators (and staff-flagged sessions):**

All of the above plus:
- Staff section in Advanced drawer.
- Raw JSON visibility.
- Heavy motion toggle.
- Direct asset attach.
- Bulk canonical import.
- Renderer key + version IDs.

## What this hides forever (until next major redesign)

- "v1 / v2" version pills in the main editor.
- "Critical / Recommended / Polish" readiness count language.
- "Renderer key" in the main editor.
- "Schema version" anywhere except staff section.
- "Asset / slot" vocabulary.
- "Publish" as a verb (use "Open room to visitors").

## Why this much hiding

Pilots are operator-led. The owner is being shown the editor by
their Presence operator (Emad / team). Every control that needs
explanation is a control that's wasting the operator's time.
Hiding by default isn't disrespect for the owner — it's respect for
their attention. They'll discover Advanced when they need it; until
they need it, the editor is calm.
