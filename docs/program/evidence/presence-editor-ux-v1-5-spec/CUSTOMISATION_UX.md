# Customisation UX — Presence Studio Editor V1.5

Customisation must feel expressive, not overwhelming. Two surfaces
per category: a **Quick** layer (visual, named, immediate) and a
**Custom** layer (specific values, gently progressive).

The Quick layer is what owners touch first. The Custom layer is one
click away under "Make your own ___".

## Eight categories

| # | Category | Owner-facing label | Where it lives |
|---|---|---|---|
| 1 | Fonts | Pick a font | Look > Fonts |
| 2 | Colours | Adjust colours | Look > Colours |
| 3 | Background | Choose a background | Look > Background |
| 4 | Mood | Pick a mood | Look > Mood (top of panel) |
| 5 | Gallery style | Pick a gallery style | Build (per-scene inspector when wall scene selected) |
| 6 | Image treatment | Image style | Build (per-image inspector) |
| 7 | Invitations | Invitation style | Build (per-invitation inspector) |
| 8 | Motion | Movement | Look > Movement |

## 1. Fonts

**Owner-facing label:** `Pick a font`.

### Quick layer

6 font-pack thumbnails. Each shows the heading + body family with a
short sentence in that pair:

```
┌─────────────────────────────┐
│  Editorial Gallery          │
│  ─────────────────────────  │
│  Bridle Road, 2005          │  ← heading sample
│  Watercolour on paper.      │  ← body sample
└─────────────────────────────┘
```

Click → applies. Currently applied pack carries a tick.

Pilot-safe packs (5):
- **Editorial Gallery** — Inter Tight + Inter
- **Soft Studio** — Instrument Serif + Inter
- **Luxury Serif** — Playfair Display + Georgia
- **Mono Archive** — IBM Plex Mono + IBM Plex Mono
- **Brutalist Poster** — Space Grotesk + Inter

Behind "More fonts" toggle:
- **Handwritten Notes** — Caveat + Georgia (advanced; load weight
  warning)

### Custom layer (under "Pick a specific font")

Two dropdowns: Heading family / Body family. Each lists the curated
12 families with a one-line sample. Selecting either updates the
canvas immediately.

### What to hide

- Raw font-family CSS strings.
- Custom font upload (P2; staff-only until P2).
- Font weight / style sliders (each pack curates these).

### Reset

Every per-element text style override carries a `Reset` button that
restores the room font for that element.

### Performance guardrail

- Only Google CDN fonts in pilot.
- `<FontLoader>` fetches only the families currently in use; never
  the full registry.
- Custom uploaded fonts (P2) are pre-validated for license + max
  file size + max weights.

## 2. Colours

**Owner-facing label:** `Adjust colours`.

### Quick layer

The mood pack's palette is shown as 4 swatches in a row: paper / ink
/ accent / line. Click any swatch to open a small popover with:

- 6 curated alternates for that role.
- "Match the mood" reset link.

### Custom layer (under "Make your own mood")

The 8 palette tokens as labeled swatches with hex inputs alongside.
Live preview through the resolver.

Labels owners see (not schema names):

- Page background
- Paper cards
- Warm paper
- Ink / text
- Muted text
- Hairlines
- Hero stage
- Accent

### What to hide

- The token IDs (`bg`, `paper_warm`, `line`).
- Opacity / alpha picker (not needed in V1.5; mood packs handle).
- Multi-theme / dark-mode-toggle (P2).

### Reset

"Reset to mood default" button restores the pack's palette.

## 3. Background

**Owner-facing label:** `Choose a background`.

### Quick layer

Per scene, 4 thumbnail backgrounds:

- Paper
- Paper warm
- Stage (dark for hero)
- Custom colour

### Custom layer

If "Custom colour" → colour picker. Future (P1): texture overlay
slider; image background.

### What to hide

- Treatment IDs.
- Texture intensity until P1.

## 4. Mood

**Owner-facing label:** `Pick a mood`.

### Quick layer

Three large mood thumbnails at the top of the Look panel:

- Paper Gallery
- Ink Room
- Warm Archive (currently disabled — `Coming soon`)

Each card shows a 3-line preview: heading sample + image swatch +
body sample. Click → applies palette + typography + motion preset.

### Custom layer

`Save this mood as…` (P1, P2 for sharing). Allows the owner to name
their current customised palette/typography/motion combo for later
reuse.

### What to hide

- Advanced packs (Liquid Signal) — under "Show advanced moods".

## 5. Gallery style

**Owner-facing label:** `Pick a gallery style`.

Lives in the per-scene inspector when the Wall scene is selected.

### Quick layer

4 layout thumbnails:

- **Gallery wall** (current — varied tile sizes, year markers) —
  live
- **Stack** — large central tile, smaller below — Codex P1
- **Film strip** — horizontal scrolling row — Codex P1
- **Archive drawer** — flat catalogue — Codex P1

Unwired layouts show `Coming soon` chip and are disabled.

### Custom layer

Per-row controls (P1+):
- Columns (1-4)
- Spacing (tight / standard / open)
- Frame style (hairline / filled / polaroid / none)
- Caption style (overlay / below / hidden)

### What to hide

- Mobile layout override until P1.

## 6. Image treatment

Lives in the per-image inspector.

### Quick layer

3 frame styles:

- **Hairline** — 1px border (current default)
- **Filled** — paper card background (Codex P1)
- **None** — image floats on the surface (Codex P1)

### Custom layer

- Border radius (0 / soft / round) — P1
- Drop shadow (none / soft / lift) — P1
- Filter / treatment (none / warm / cool / monochrome) — P2

### What to hide

- Pixel-level border control.
- Image colour grading.

## 7. Invitations

**Owner-facing label:** `Invitation style`.

Lives in the per-invitation inspector.

### Quick layer

4 button styles:

- **Soft pill** (current)
- **Framed card** (Codex P0)
- **Underlined link** (Codex P0)
- **Floating tag** (Codex P0)

### Custom layer

- Size (small / medium / large) — P1
- Accent or ink colour — P1
- Icon picker — P2

### What to hide

- Hover-state customisation.
- Multi-action buttons.

## 8. Motion

**Owner-facing label:** `Movement`.

### Quick layer

4 intensity presets:

- **Still** — no movement; cuts between scenes
- **Gentle** — soft ripple, slow morph (default)
- **Living** — full liquid morph, full atmosphere
- **Immersive** — heavy motion + glass effect (advanced — owner
  confirms once before enabling)

### Custom layer

Per-token sliders (Liquid intensity / Distortion / Morph speed /
Dither / Film grain / Blur). All under "Fine-tune movement".

### What to hide

- Parallax depth (P1; not yet wired).
- Custom cursor toggle (P1; not yet wired).
- Heavy motion as a hidden toggle (it's part of Immersive, gated).

### Reduced motion

Always honoured automatically. Footnote in the Movement panel:
`Visitors who prefer less motion will see Still automatically. You
don't need to change anything for them.`

## What ALL categories share

- A single primary action: clicking applies. No "Save changes" step
  inside the panel — the page-level Save state handles that.
- A single quiet reset link per pack/category.
- "Coming soon" controls visible-but-disabled with a `Coming soon`
  chip — they show the roadmap honestly without polluting the live
  options.
- Inline preview through the resolver — change immediately reflects
  on the canvas.

## Acceptance criteria

An owner can, without operator help:

1. Apply a mood in ≤ 3 seconds.
2. Change the heading font in ≤ 6 seconds.
3. Change the accent colour in ≤ 8 seconds.
4. Switch the gallery style in ≤ 4 seconds.
5. Change motion intensity in ≤ 3 seconds.
6. Reset everything to mood default in ≤ 4 seconds.

If any of those exceed the targets in usability testing, the panel
hierarchy is wrong.
