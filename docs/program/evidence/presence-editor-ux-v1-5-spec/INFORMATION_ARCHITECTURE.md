# Information Architecture — Presence Studio Editor V1.5

## Core principle

> **Presence Studio guides the owner through shaping a live-ready
> room. It never exposes the machinery of the room.**

Emotional tone: calm, confident, editorial. Not playful, not
clinical, not designer-aggressive.

Interaction model: select → see what changes → save → preview →
open to visitors. One concept per moment.

Visual hierarchy:
1. The room (the canvas).
2. The current intent (one primary action, one inspector).
3. The status (one quiet strip).
4. Everything else (Advanced drawer).

Owner confidence model: at every moment, the owner can answer:
"What am I editing? What do visitors see right now? When will my
changes go public?" without scanning the screen.

## Top-level modes (5)

We reduce the current 12-tab structure to **5 modes** plus a single
Advanced drawer.

| Mode | What it holds | Default | Visible to |
|---|---|---|---|
| **Build** | Canvas + selection inspector. Edit text + images + structure. | Yes | Owner |
| **Look** | Mood packs, palette, fonts, motion presets. | No | Owner |
| **Images** | Media library + per-image roles + alt text. | No | Owner |
| **Preview** | Full-screen draft preview + publish dialog. | No | Owner |
| **Advanced** | Drawer (not a mode) — versions, history, raw URLs, schema-visible controls. | Hidden | Operator + owner who clicks "Advanced" |

The current tabs map cleanly:

- Canvas → Build (default)
- Scenes / Work Wall / Practice / Calling Card → in-canvas selection, no separate tab
- Style DNA / Motion / Texture → Look
- Assets → Images
- Preview / Publish → Preview
- Overview / History / Rollback / RoomKey → Advanced drawer
- Operator-only diagnostics → Advanced > Staff section

## Editor shell

```
┌──────────────────────────────────────────────────────────────────┐
│  [← back]  Christina Kerkvliet Goddard            [Sign out]    │ ← Top bar
│  Live · opened 2 days ago    All changes saved    [Open room]   │
├──────────┬───────────────────────────────────────┬───────────────┤
│          │                                       │               │
│  01      │                                       │               │
│  Field   │                                       │   Inspector   │
│          │                                       │   (changes    │
│  02      │           Canvas                      │   with        │
│  Wall    │           (the live draft room        │   selection)  │
│          │           rendered as visitors        │               │
│  03      │           will see it)                │               │
│  Studio  │                                       │               │
│          │                                       │               │
│  04      │                                       │               │
│  Card    │                                       │               │
│          │                                       │               │
├──────────┴───────────────────────────────────────┴───────────────┤
│  Build   Look   Images   Preview     [···]                       │ ← Mode strip
└──────────────────────────────────────────────────────────────────┘
```

### Top bar (always visible)

- Back arrow to Studio dashboard.
- Room name (large, paper, serif if Look is set to a serif pack).
- Live status: `Live · opened 2 days ago` OR `Draft only — not yet
  open to visitors`.
- Save state: `All changes saved` OR `2 changes unsaved`.
- Primary action: contextual. Defaults to **Open room** when
  ready; reads **Preview your draft** when changes are unsaved;
  reads **Sign in** if session expired.
- Account: sign-out menu.

### Left scene rail

- 4 scenes in vertical list.
- Each scene: number + label.
- Active scene highlighted with paper-warm background, 1px ink rule
  on the left.
- Below: small `+ Add scene` (Advanced, hidden by default).

### Canvas (centre)

- The active scene rendered through `resolveRenderModel(node,
  "draft")`. Visitors will see exactly this once the room opens.
- Selection: 1px dashed amber outline around the selected widget +
  small handle dots at top-left / bottom-right.
- Hover affordance: very low amber tint until selection.
- No jump-buttons. No editor chrome floating on the artwork.

### Right inspector

Shape depends on selection:

- **No selection** → "Click anything to start editing. Or pick a
  mood." [3 mood swatches]
- **Text selected** → mini-toolbar: size / weight / colour /
  alignment / italic / font mood / reset.
- **Image selected** → Replace · Focal point · Alt text · Restore ·
  Remove.
- **Scene selected** → Layout (thumbnails) · Background · Hide.
- **Widget selected** → as above per widget category.

### Mode strip (bottom)

- 4 mode tabs: Build (selected by default), Look, Images, Preview.
- `[···]` opens **Advanced drawer** (Versions, History, Restore,
  Raw URLs, Staff diagnostics if applicable).

The mode strip becomes a bottom bar on mobile.

## Mobile arrangement

- Top bar collapses to just room name + Open room CTA.
- Scene rail collapses to bottom dots (`01 · 02 · 03 · 04`).
- Selection inspector becomes a bottom sheet (drag-handle, swipe to
  dismiss, 40vh default height, 90vh when expanded).
- Mode strip stays at the bottom edge; advanced drawer slides up.

## Advanced drawer

Opens via the `[···]` mode strip overflow. Slides up from the bottom.

Sections:
1. **Versions** — list with timestamps; Restore an earlier version.
2. **History of changes** — last 20 mutations with one-tap revert.
3. **Raw image URL** — for cases where the asset picker can't help.
4. **Font stack details** — pick a specific font; load custom font (P2).
5. **Motion fine-tuning** — per-token sliders (only when Look-mode
   defaults aren't enough).
6. **RoomKey copy** — provenance chip text, guest entry copy,
   invalid/revoked copy.
7. **Staff diagnostics** — version numbers, renderer key, schema
   version. Visible only when `?staff=1` URL param or the operator
   logs in.

## Status strip (between top bar and canvas)

A single hairline-rule strip that surfaces only when meaningful:

- `Visitors see: opened 2 days ago. You have 2 unsaved changes.`
- `Visitors see: opened 5 minutes ago. All changes saved.`
- `Not yet opened to visitors. Save & preview to see it as visitors will.`

The strip is paper-warm with ink type. No traffic-light icons.

## Diagnostics placement

Today's diagnostics surface inline in the header (Renderer / Draft /
Published / Last saved). UX V1.5 moves them to:

- The status strip carries plain-language timestamps.
- Version numbers and renderer keys live in Advanced > Staff.
- Operator console (separate route, future) carries the live raw
  state for support.

Visitors-facing terms only on the canvas surface.

## Staff / operator controls

When `?staff=1` is set in the URL (or the signed-in user has a
staff role, future), the editor surfaces:

- A small `Staff` chip in the top bar.
- A `Staff` section inside the Advanced drawer with:
  - Renderer key
  - Schema version
  - Draft / published version IDs
  - Full readiness JSON
  - "Reload from backend" / "Show cached"
- Heavy motion toggle.
- Unwired widget rows (with disabled state).

No staff information shows to owners.
