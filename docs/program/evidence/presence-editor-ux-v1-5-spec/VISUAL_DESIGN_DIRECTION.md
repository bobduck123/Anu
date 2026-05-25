# Visual Design Direction — Presence Studio Editor V1.5

## North-star sentence

> The editor should look like the room it edits.

The published GGM room is paper-warm, ink type, hairline rules,
quiet atmosphere. Today's editor is dark-mode designer-app
(#0d0e10 + amber neon). UX V1.5 brings the editor into the same
aesthetic family — not identical, but adjacent.

## Visual tone

- **Material**: paper, not chrome. Surfaces feel like card stock.
- **Type**: editorial sans for chrome (Inter Tight), serif for the
  room name (Instrument Serif optional). Mono only for diagnostic
  numbers.
- **Restraint**: nothing in the editor competes with the artwork.
- **Confidence**: small text, large negative space, hairline
  separators.
- **Warmth**: muted amber for "draft world", soft green for "live
  world". Never pure red, never neon.

## Colour palette (editor chrome)

| Token | Hex | Use |
|---|---|---|
| `--edit-bg` | `#fbfaf6` | Editor page background |
| `--edit-surface` | `#ffffff` | Cards, drawers, inspector |
| `--edit-surface-tint` | `#f4f1ea` | Status strips, hover states |
| `--edit-ink` | `#1a1814` | Primary text |
| `--edit-ink-soft` | `#5a554d` | Secondary text |
| `--edit-line` | `#e3ddd0` | Hairline rules |
| `--edit-draft` | `#a06c2c` | Draft-world accent (warm amber, not neon) |
| `--edit-draft-soft` | `#fbeed7` | Draft-world fill |
| `--edit-live` | `#3d6354` | Live-world accent (forest green muted) |
| `--edit-live-soft` | `#e3ede8` | Live-world fill |
| `--edit-attention` | `#b04f3c` | Errors only (one rust tone, not red) |

These mirror the GGM paper palette so the visual transition between
editor → preview → published room is calm, not jarring.

## Spacing scale

| Token | Px | Use |
|---|---|---|
| 4xs | 2 | Hairline internal |
| 3xs | 4 | Tight inside chips |
| 2xs | 8 | Inside small buttons |
| xs | 12 | Inside cards |
| sm | 16 | Between rows |
| md | 24 | Section padding |
| lg | 36 | Between major regions |
| xl | 56 | Top-bar / mode strip vertical rhythm |

8-unit baseline grid throughout.

## Inspector style

```
┌─────────────────────────────────────┐
│  Hero title                         │ ← label, small caps, ink-soft
│  ─────────────────────────────────  │
│  Size                               │ ← row label
│  [ Small  Medium  Large  Feature ]  │ ← segmented control
│                                     │
│  Weight                             │
│  [ Light  Regular  Bold ]           │
│                                     │
│  Colour                             │
│  ● ○ ○ ○   [ + ]                    │ ← swatches + custom
│                                     │
│  Reset                              │ ← link, ink-soft
└─────────────────────────────────────┘
```

- Paper background.
- 1px hairline separators between rows.
- Segmented controls (not pill chip sets) for ordered options.
- Swatches for colour, font, layout — visual, not text-named.
- Inline help text below complex controls, never as a tooltip on
  hover.

## Canvas frame

The canvas surface inside the editor draws:

- 1px hairline border in `--edit-line` around the visible scene.
- Tiny registration ticks (8px) at the four corners.
- When an element is selected: amber dashed outline + handle dots.
- When the mouse hovers a hoverable element: very faint amber tint
  (no border) until selection.
- Cursor: default. No custom cursor in editor chrome.

## Selected element treatment

```
   ●─────────────────────────────────●
   ┊                                 ┊
   ┊   Willow of Port Arthur          ┊
   ┊                                 ┊
   ●─────────────────────────────────●
```

- 1px amber (`--edit-draft`) dashed border, 4px inset.
- 6px solid dots at top-left and bottom-right (handles; visual P0;
  functional drag P1).
- The mini-toolbar floats 8px above the selection, with a 4px
  triangle tail pointing down to the element.

## Drawer design

Drawers slide in from the right (or bottom on mobile) over a 30%
opacity ink veil that dismisses on click.

- Width 40vw, max 520px on desktop.
- 1px left border.
- Header row: label + close button (X).
- Content scrolls; footer (when present) sticks.
- Drawer has a subtle paper-warm tint so it's distinct from the
  inspector.

## Button hierarchy

| Tier | Use | Example |
|---|---|---|
| Primary green | `Open room to visitors` | Filled `--edit-live` background, ink-light text |
| Primary amber | `Save your changes`, `Preview your draft` | Filled `--edit-draft`, ink text |
| Secondary | `Replace image`, `Apply mood` | Outlined ink, paper fill |
| Tertiary | `Reset`, `Discard draft` | Underlined ink-soft text only |
| Destructive | `Remove image` | Outlined `--edit-attention`, only inside detail panels |

Buttons use round-corner radius `6px` (not pill, not square). Padding
12px horizontal / 8px vertical for small; 16px / 10px for primary.

## Status banners

Hairline horizontal strip between top bar and canvas. NOT a card.

Variants:
- Live world: paper background, `Visitors see:` prefix, green dot.
- Draft world: paper-warm background, `You have N changes` prefix,
  amber dot.
- Working: paper background with a small spinner, "Opening your
  room…".
- Failure: ink-soft text, rust dot, never red.

## Readiness chips

Float above the canvas element they refer to. 6px paper-warm fill,
1px draft-amber border, 4px radius. Click → opens inspector. No
icons except an asterisk `✱`.

```
   ┌──────────────────────────┐
   │  ✱ Pick a cover image    │
   └──────────────────────────┘
```

Animate in (200ms fade + slide-down 4px) on appear. Dissolve out
when resolved.

## Empty states

Every empty region carries one calm sentence + one obvious action.

- No selection: `Click anything to start editing. Or pick a mood.`
  + 3 mood swatches.
- No images attached: `No images yet. Bring in your live room
  artworks, or upload your own.` + Sync button.
- No history: `Your edit history starts here.`

No empty illustrations. No mascot. No "Hello! 👋".

## Motion (in the editor)

- Drawer slide-in: 240ms cubic-bezier(0.2, 0.85, 0.3, 1).
- Status strip update: cross-fade 200ms.
- Selection outline appear: 120ms ease-out.
- Saved chip fade-in/out: 1.4s total.
- Mood preset apply: 220ms canvas cross-fade.
- Nothing else animates. The published room has its own motion
  language (WebGL liquid morph); the editor chrome stays still.

Respects `prefers-reduced-motion` — all transitions reduce to
instant cuts.

## Mobile treatment

- Top bar reduces to `[ ← ]  Room name  [ Open room ]`. Save state
  collapses into the room name area.
- Mode strip pins to the bottom edge.
- Scene rail collapses to bottom dots inside the mode strip area
  (only visible in Build mode).
- Inspectors become bottom sheets (drag-handle, 50vh default).
- No hover affordances. Tap-to-select; long-press for handles
  (P1).

## Typography (editor chrome)

| Element | Family | Size | Weight |
|---|---|---|---|
| Room name (top bar) | Instrument Serif (or current room heading family) | 18px | 400 |
| Section labels | Inter Tight | 11px | 600 uppercase 0.16em tracking |
| Body / inputs | Inter | 14px | 400 |
| Helper text | Inter | 12px | 400 ink-soft |
| Primary buttons | Inter | 14px | 600 |
| Status strip | Inter | 13px | 400 |
| Hex / version / staff diagnostics | IBM Plex Mono | 12px | 400 |

## What this design direction is NOT

- Not a designer-tool aesthetic (no neon, no dark mode by default).
- Not "fun" — no rainbow gradients, emoji, mascot.
- Not Tailwind admin-template (avoid the standard SaaS-dark look).
- Not Figma copy (avoid floating toolbars with shadows, avoid
  pixel-tight inspectors).
- Not Notion (avoid block-add menus and full-bleed editor
  surfaces).

It is **Square* paper-quiet meets *Cargo* editorial restraint, with
*Procreate*-quality selection feedback. The closest external
reference: Cargo's "edit" mode for portfolio sites, but warmer.
